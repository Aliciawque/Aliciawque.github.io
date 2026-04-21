---
title: "Shipping a Polymarket wallet tool in a day: a subagent-driven TDD experiment"
date: 2026-04-21
tags: ["Claude Code", "AI", "Python", "Polymarket"]
lang: "en"
translationSlug: "polylens-subagent-tdd"
excerpt: "From brainstorm to 85 tests green, across 4 plans, 36 tasks, 45 commits. The double-review loop caught a Critical atomicity bug at Task 3. Polymarket turned out to be DNS-blocked from my network, so I pivoted to a synthetic dataset to validate the full stack offline."
canvasRender: false
---

## Why

A friend wanted to see what the top wallets on Polymarket are doing. I scanned GitHub first — there's an official CLI, a terminal TUI called polyterm, a one-liner P&L tool (polymarket-pnl), a Telegram bot (polymarket-whales). The space is crowded.

Crowded means you need a real angle. I ran `superpowers:brainstorming` against myself:

- Others ship one PnL leaderboard → I'd ship **5 semantic boards** (🐋 Whale / 💰 Profit / 🎯 Alpha / 🛡️ Steady / 🌟 Rookie)
- Others target humans-on-a-page → I'd target **agents first** via MCP, Streamlit secondary
- Others run on a VPS → I'd stay **fully local**, one DuckDB file, optional launchd

With the positioning locked, I wanted to test a specific workflow: `brainstorming → multi-plan decomposition → subagent-driven-development`. Could it actually ship a three-layer Python project end-to-end in one session?

## Decomposition: 4 plans, not one mega plan

After writing the spec I didn't immediately write a huge plan. I carved the work into four sequential, independently deliverable plans:

- **Plan A**: ingest pipeline (seed discovery + Data API + hourly snapshots)
- **Plan B**: analytics (PnL / ROI / win rate / Sharpe / MaxDD + 5 rankings)
- **Plan C1**: FastMCP server (5 agent tools)
- **Plan C2**: Streamlit dashboard (5 pages)

Each plan is independently testable. After A you have real rows in DuckDB. After B `poly rank` prints leaderboards. After C1 an agent can query them. After C2 a human can browse them.

**Why not one big plan?** Because things are learned in the middle. Plan A surfaced DuckDB transaction quirks, polars API compatibility issues, and fixture math mismatches. All of those went into Plan B's task guidance, so later subagents didn't re-stumble. If you front-load 36 tasks in one shot, that feedback never comes back.

## Execution: three-stage per task

`superpowers:subagent-driven-development` has a fixed rhythm:

1. **Implementer subagent**: fresh context, receives the full task text + surrounding context, writes tests first, implements, commits
2. **Spec review subagent**: another fresh context, independently reads the diff, lists missing / extra against the spec
3. **Code quality reviewer**: yet another fresh context, audits single-responsibility, error handling, atomicity, edge cases

All three must sign off before the next task. If a reviewer flags something, a fix subagent addresses it, and we re-review. Loop.

The pitch isn't speed. It's **catching quality problems**.

## Two Critical bugs the double-review caught

**Bug #1 — Plan A Task 3 (schema migrations)**: I'd written "split SQL on `;` and execute each statement". The implementer did, three tests green, self-reviewed DONE. Then the code quality reviewer looked at the same diff independently and wrote:

> `migrations.py:27` — migration record insert not atomic. DuckDB auto-commits by default. If a file has N statements and the Kth fails, the first K-1 are committed but `schema_migrations` never records the version. Next `apply_all` re-executes the whole file. `CREATE TABLE IF NOT EXISTS` is fine, but any `ALTER TABLE` / `INSERT` with side effects runs twice.

A ticking timebomb. Fixable with one `conn.begin()`. The implementer didn't catch it because he only ran the happy path.

**Bug #2 — Plan A Task 8 (fetch_wallet)**: `_upsert_positions` does `DELETE FROM positions WHERE wallet=?` then loops INSERTs. Auto-commit again. If any INSERT mid-loop throws, that wallet's positions are permanently wiped.

```python
# After the fix:
def fetch_wallet(conn, address):
    positions = list_positions(address)  # network calls stay out of the txn
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

Network calls must stay out of the transaction so you don't hold locks during HTTP. Both bugs were caught by the reviewer, not the implementer's self-review. **Double review earns its keep.**

## Outcome

All 4 plans ran to completion:

| Plan | tasks | commits | tests | coverage |
|---|---|---|---|---|
| A Ingest | 12 | 14 | 25 | 94% |
| B Analytics | 9 | 12 | 29 | 96% |
| C1 MCP | 8 | 9 | 22 | 97% |
| C2 Dashboard | 7 | 10 | 9 | UI skipped |
| **total** | **36** | **45** | **85** | — |

Caught and fixed 4 bugs total: 2 Critical atomicity, 1 spec violation (whale default threshold silently changed), 1 UX warning (Streamlit prompting for email on first run).

## Near-miss: Polymarket is DNS-blocked from my network

Once the code was green, I wanted real data. `curl data-api.polymarket.com` just reset:

```
$ nslookup data-api.polymarket.com
Address: 162.125.32.2   # that's Dropbox's IP
```

Classic DNS poisoning. Without a VPN, there's no reaching it. Instead of making "install a VPN" the next step, I wrote `scripts/seed_synthetic.py`: 500 wallets across 7 archetypes (whale / alpha / steady / gambler / loser / casual / rookie) with realistic distributions, 1.4k positions, 12k trades, 72k hourly snapshots.

`poly rank --limit 5` ran all 5 boards with real-looking output. The alpha formula checked out arithmetically: `5.37 × ln(35) × 1.0 = 19.10`, CLI displays 19.10 ✓. MCP tool `get_wallet` returned the top whale's profile: `$9k PnL, 65 trades, 66.7% win, Sharpe 0.58`. Streamlit served HTTP 200, health endpoint 200.

**When the upstream is unreachable, don't default to "go set up a VPN". See how much you can simulate locally.** This run validated analytics + MCP + dashboard end-to-end. The only layer it didn't exercise was HTTP itself — but that was already covered by respx mocks back in Task 4.

## By the numbers

- Total time: one afternoon plus an evening
- 45 git commits
- 85 pytest green
- 3 plans merged to master, 4 feature branches left for archaeology
- Two interfaces: `poly mcp` for agents, `poly serve` for humans

## When this flow fits, and when it doesn't

Not every project suits subagent-driven TDD. PolyLens is the ideal case: **heavy logic, thin UI**. The data / analytics / tool layers have testable fixtures; the UI layer deliberately skipped unit tests.

I've hit projects where it doesn't fit: iOS UI interactions on Soulbound, SwiftUI rendering lifecycle weirdness, Xcode's slow feedback loop. For those, I'm faster hands-on than any subagent. The flow isn't a silver bullet.

But for Python backends, CLI tools, analytics pipelines, MCP servers — this flow maxes out both automation and the quality gate. Solo-shipping a full stack in an afternoon, the cognitive load is mostly **making decisions**: split the plan, cut the scope, pick the stack, weigh fix-now vs defer on review findings. The implementation grind is fully outsourced to Claude.

Code lives at `~/.claude/projects/polylens/`, 85 tests green. Haven't pushed it to GitHub yet — maybe next week.
