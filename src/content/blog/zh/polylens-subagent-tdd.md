---
title: "一天搓一个 Polymarket 智能看板：subagent-driven TDD 的全链路实验"
date: 2026-04-21
tags: ["Claude Code", "AI", "Python", "Polymarket"]
lang: "zh"
translationSlug: "polylens-subagent-tdd"
excerpt: "从 brainstorm 到 85 tests 全绿，4 个 plan、36 task、45 commit 跑完。双 review 在第 3 个任务就抓到 Critical 原子性 bug。最后 Polymarket 在大陆被 DNS 投毒，改合成数据 demo 把整条链路验完。"
canvasRender: false
---

## 起因

朋友想看看 Polymarket 上顶级钱包都在玩什么。我先 GitHub 调研了一圈——有官方 CLI、有 polyterm TUI、有 polymarket-pnl 一键 P&L、有 polymarket-whales Telegram 告警。赛道早就卷了。

没赛道，就得想差异化。我用 `superpowers:brainstorming` 跟自己过了一轮：

- 别人都是一个 PnL 排序 → 我做 **5 个语义分层榜**（🐋 Whale / 💰 Profit / 🎯 Alpha / 🛡️ Steady / 🌟 Rookie）
- 别人都是给人看的看板 → 我做 **agent-first MCP server**，人看 Streamlit 是附属
- 别人都跑 VPS → 我做**本地单机**，DuckDB 一个文件，launchd 可选

定位明确之后，我想试一下一个工作流：`brainstorming → 多 plan 分解 → subagent-driven-development` 能不能真的把一个三层 Python 项目一次推完。

## 分解：4 个 plan 而不是 1 个 mega plan

spec 写完我没有立刻起一个巨型 plan。反了——按可独立交付切成 4 个顺序 plan：

- **Plan A**：ingest pipeline（种子池 + Data API + 小时快照）
- **Plan B**：analytics（PnL / ROI / 胜率 / Sharpe / MaxDD + 5 榜单）
- **Plan C1**：FastMCP server（5 个 agent 工具）
- **Plan C2**：Streamlit 看板（5 个页面）

每个 plan 独立 testable 可交付。Plan A 跑完有真数据进 DuckDB；Plan B 跑完 `poly rank` 能打印榜单；Plan C1 跑完 agent 能查；Plan C2 跑完浏览器能看。

**为什么不一个大 plan？** 因为中间会学到东西。Plan A 跑完发现的 DuckDB 事务行为、polars API 兼容问题、seed fixture 的数字错配——都会写进 Plan B 的 task 指导里，让后面的 subagent 少踩坑。如果一口气写 36 个 task 全跑，这些学习反馈不回来。

## 跑：每个 task 三段式

`superpowers:subagent-driven-development` 的节奏是固定的：

1. **Implementer subagent**：fresh context，接收完整 task 文本 + 上下文，TDD 写测试 + 实现 + commit
2. **Spec review subagent**：另一个 fresh context，独立读 commit diff，对照 spec 列缺失/多余
3. **Code quality review subagent**：再一个 fresh context，审代码质量（单一职责、错误处理、原子性、边界）

三段都 ✅ 才进下一个 task。Reviewer 发现问题就派 fix subagent 回去修，再 review，循环。

这套流程的主卖点不是加速，是**抓质量问题**。

## 被抓到的 2 个 Critical bug

**Bug #1 — Plan A Task 3（schema migrations）**：我原本写的是"按 `;` 分割执行 SQL"。implementer 照做，3 个测试全绿，自检 DONE。code quality reviewer 独立看了一眼：

> `migrations.py:27` — migration 记录插入不原子。DuckDB 默认 auto-commit，如果 SQL 文件包含 N 条语句，第 K 条执行失败，前 K-1 条已 committed，但 `schema_migrations` 里没有记录这个版本。下次 `apply_all` 重新执行整个文件，`CREATE TABLE IF NOT EXISTS` 不会报错，但如果有 `ALTER TABLE`、`INSERT` 或带副作用的语句，它们会重复执行。

这是定时炸弹。一行 `conn.begin()` 改动能救。implementer 自检没看出来，因为他只跑了 happy path。

**Bug #2 — Plan A Task 8（fetch_wallet）**：`_upsert_positions` 先 `DELETE FROM positions WHERE wallet=?`，再循环 INSERT。又是 auto-commit。如果中途任何一条 INSERT 抛异常，这个钱包所有 positions 被永久清空。

```python
# 修复后：
def fetch_wallet(conn, address):
    positions = list_positions(address)  # 网络调用在事务外
    trades = list_trades(address)
    conn.begin()
    try:
        _upsert_positions(conn, address, positions)
        _upsert_trades(conn, address, trades)
        conn.execute("UPDATE wallets SET last_sync_at=? WHERE address=?", [...])
        conn.commit()
    except Exception:
        conn.rollback()
        raise
```

网络调用一定在事务外，不持锁。两个 bug 都是 reviewer 捕获，不是 implementer 自检抓的——**双 review 不是过度流程**。

## 结果

4 plan 顺序执行完毕：

| Plan | tasks | commits | tests | coverage |
|---|---|---|---|---|
| A Ingest | 12 | 14 | 25 | 94% |
| B Analytics | 9 | 12 | 29 | 96% |
| C1 MCP | 8 | 9 | 22 | 97% |
| C2 Dashboard | 7 | 10 | 9 | UI 跳过 |
| **合计** | **36** | **45** | **85** | — |

抓到并修复 4 个 bug：2 Critical 原子性、1 Spec violation（whale 默认阈值被改）、1 UX warning（Streamlit 首跑 email 提示）。

## 差点翻车：Polymarket 在大陆被 DNS 污染

跑完想验真数据。curl data-api.polymarket.com 直接 connection reset：

```
$ nslookup data-api.polymarket.com
Address: 162.125.32.2  # 这是 Dropbox 的 IP
```

典型的 DNS 投毒。VPN 没开的话根本到不了。没赖给"装个梯子再说"，我做了个 `scripts/seed_synthetic.py`：500 个钱包按 7 种 archetype（whale / alpha / steady / gambler / loser / casual / rookie）生成realistic 分布，1.4k positions、12k trades、72k 小时快照。

跑完 `poly rank --limit 5` 5 个榜都有数，alpha 公式数学校验：`5.37 × ln(35) × 1.0 = 19.10`，CLI 显示 19.10 ✓。MCP 工具 `get_wallet` 返回 top whale：`$9k PnL, 65 trades, 66.7% win, Sharpe 0.58`。Streamlit HTTP 200，health endpoint 200。

**外部服务跑不了，别急着让用户装梯子。先看本地能模拟多少。** 这次验证覆盖了 analytics + MCP + Dashboard 三层，唯一没测的是 HTTP 层本身——而 HTTP 层早就在 Task 4 用 respx mock 过了。

## 一天几次数

- 总用时：一个下午 + 一个晚上
- 45 个 git commits
- 85 个 pytest 绿
- 3 个 plan 被 merge 到 master，4 个 feature branch 留作归档
- 两个界面：`poly mcp` 给 agent，`poly serve` 给人

## 回味：这套流程的边界

不是所有项目都适合 subagent-driven TDD。PolyLens 是"**纯逻辑 + 薄 UI**"的理想场景——数据层、分析层、工具层的测试都能用 fixture 独立覆盖，UI 层明确跳过单测。

不适合的场景我也遇到过：iOS app（Soulbound）的 UI 交互、SwiftUI 的 rendering lifecycle、Xcode 构建反馈慢——这些场景 subagent 不如我直接上手调。流程不是银弹。

但对于 Python 后端类、CLI 工具类、analytics pipeline 类、MCP server 类项目，这套流程把"自动化"和"质量门"都拉满了。一个人一个下午跑完端到端，心智负担主要是**做决策**：拆 plan、裁边界、选技术栈、权衡 review 发现的问题 fix-now vs defer。实现的苦活 Claude 全包了。

代码在本地 `~/.claude/projects/polylens/`，85 tests 全绿。还没推 GitHub——也许下周吧。
