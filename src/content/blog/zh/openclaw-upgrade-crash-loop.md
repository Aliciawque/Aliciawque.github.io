---
title: "OpenClaw 升级后的连环崩溃：从 sessionId 到空 plist 再到丢失 proxy 的排查全记录"
date: 2026-05-08
tags: ["OpenClaw", "调试", "launchd", "macOS"]
lang: "zh"
translationSlug: "openclaw-upgrade-crash-loop"
excerpt: "一次换模型操作引发的蝴蝶效应：chat.send 多传了 sessionId 被拒绝、gateway 进程缓存了旧版模块路径、launchd plist 被重写成空文件、install --force 丢掉了 proxy 配置导致健康检查循环重启。六个坑，一条因果链。"
canvasRender: false
---

## 起因：换个模型，整个 gateway 瘫了

OpenClaw 是我一直在用的本地 AI 助手网关，跑在 macOS 的 launchd 上当服务。今天给主 agent 换了个第三方面模型，想着重启一下让新配置生效。结果 gateway 就再也没正常起来过——发消息不回复，日志里全是 `send failed: GatewayClientRequestError`。

接下来两个小时，我踩了六个坑，一个比一个隐蔽。

## 坑 1：chat.send 多传了 sessionId

第一个报错很明确：`invalid chat.send params: at root: unexpected property 'sessionId'`。

翻到编译后的 TUI 文件，发现 OpenClaw 2026.5.7 版本在 `chat.send` 的调用里多塞了一个 `sessionId` 字段。服务端 API 不认这个参数，直接拒绝请求。

```javascript
// dist/tui-JpbpfkGx.js line 1779
await this.client.request("chat.send", {
  sessionKey: opts.sessionKey,
  ...opts.sessionId ? { sessionId: opts.sessionId } : {},  // ← 这行不该存在
  message: opts.message,
  // ...
});
```

修复方式很直接：删掉那一行。但 `plugin-runtime-deps` 里还有一套独立的编译产物，两处都要改。

## 坑 2：ERR_MODULE_NOT_FOUND — 进程缓存了旧版路径

删完 sessionId，重启窗口，新报错：`Cannot find module 'session-archive.runtime-Dn7_buop.js'`。

这个 hash 在磁盘上根本不存在——实际文件叫 `session-archive.runtime-BbaVoTST.js`。原因找到了：gateway 进程从 5 月 1 号就一直在跑，内存里缓存的是旧版模块路径。后来 OpenClaw 通过 brew 升到了 2026.5.7，dist 文件的 hash 全变了，但老进程还在用旧路径。

`launchctl kickstart -k` 重启进程就行。但这一步又引出了下一个坑。

## 坑 3：kickstart 后服务从 launchd 消失

kickstart 之后，gateway 确实重启了。但几分钟后又收到 SIGTERM 挂掉了，而且 `launchctl list` 里 `ai.openclaw.gateway` 直接消失了——不是崩溃，是服务被注销了。

查了一圈发现：我调试时手动在后台跑了一个 `node ... gateway --port 18789`，和 launchd 管理的实例抢同一个端口。两个进程互相打架，一个被 SIGTERM 杀掉。

杀掉手动进程，用 `launchctl bootout` + `bootstrap` 重新注册服务。

## 坑 4：plist 被重写成空文件

服务恢复后，gateway 每 5 分钟收到一次 SIGTERM 然后退出。每次退出后 launchd 都没有自动重启（虽然 KeepAlive=true）。

查到关键线索：plist 文件在 gateway 收到 SIGTERM 的同一秒被修改了——而且变成了 0 字节的空文件。

根因：旧的 plist 是手动写的，把所有环境变量（proxy、token）硬编码在里面。OpenClaw 新版改用 `service-env/` 目录下的 env 文件管理环境变量。当 OpenClaw 检测到 plist 格式不兼容时，`gateway restart` 命令会重写 plist——但因为格式差异太大，写出了空文件。

修复：`openclaw gateway install --force`，让 OpenClaw 自己生成标准格式的 plist。

## 坑 5：install --force 丢失了 proxy 配置

这步修好了 plist 问题，gateway 也能启动了。但它还是每 5 分钟崩一次。

这次我仔细看了 `install --force` 生成的 env 文件——**proxy 配置全没了**。HTTP_PROXY、HTTPS_PROXY、all_proxy，一个都没有。旧 plist 里硬编码的那些代理设置，在迁移到新的 env 文件格式时被完全丢弃。

我用的第三方面模型在国内需要翻墙才能访问。没有 proxy → 模型 API 不可达 → 调用失败 → 健康检查检测到异常 → 配置里 `commands.restart = true` 触发自动重启 → 重启后还是没有 proxy → 又崩。完美的死循环。

手动在 `~/.openclaw/service-env/ai.openclaw.gateway.env` 里加上 proxy 配置后，gateway 终于稳定了。

## 因果链

六个坑不是独立的，是一条因果链：

```
换模型 → 触发 gateway restart
  → restart 发现旧 plist 不兼容 → 写出空文件（坑 4）
  → 我用 install --force 修复 → proxy 丢失（坑 5）
  → 模型不可达 → 健康检查循环重启（坑 5 后果）
  → 调试时手动启动冲突（坑 3）
  → 老进程还有 sessionId bug（坑 1）和模块缓存（坑 2）
```

## 升级安全流程

总结这次经验，以后 OpenClaw 升级按这个流程操作：

```bash
# 1. 升级
brew upgrade openclaw

# 2. 停掉旧 gateway
launchctl bootout gui/$(id -u)/ai.openclaw.gateway

# 3. 重新生成 plist（关键！）
openclaw gateway install --force

# 4. 检查 env 文件，补回 proxy
vim ~/.openclaw/service-env/ai.openclaw.gateway.env
# 确保有 HTTP_PROXY / HTTPS_PROXY / all_proxy

# 5. 启动
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 6. 验证（等 5 分钟以上确认不循环重启）
openclaw health && sleep 300 && ps aux | grep openclaw
```

第三步和第四步之间那个手动补 proxy 的动作，是整个流程里最容易被遗忘的一步。`install --force` 不会帮你迁移旧配置里的代理设置——它甚至不知道你之前配过代理。

这套排查经验我已经整理成了一个 `/openclaw-troubleshoot` skill，下次再出问题可以直接按决策表走。
