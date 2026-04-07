---
title: "给 AI 角色装上嘴巴和眼睛：TTS / STT / 图像生成全链路"
date: 2026-04-07
tags: ["iOS", "SwiftUI", "AI", "TTS", "Architecture"]
lang: "zh"
translationSlug: "soulbound-media-services"
excerpt: "文字聊天终究是扁平的。当 Connor 第一次用低沉的男声报出案件编号、Sherlock 用英伦腔说出推理过程、你让角色画一张自拍照而它真的画了——这个 app 就从「文字 RPG」变成了别的什么东西。5 个 TTS 提供商、API 语音自动选择、角色级音色定制、chat-completion 生图，一次全做完。"
canvasRender: false
---

## 纯文字聊天的天花板

做到第 14 个模块的时候，Soulbound 已经能做很多事了：角色有记忆、有个性、有技能、能调用 iOS 原生工具、还会主动找你聊天。

但它是哑巴。

你和一个底特律仿生人聊天，对话框里跳出的永远是文字。你和一个福尔摩斯聊天，他的推理只是视觉上的一段段落。

文字是信息密度最高的媒介，但不是沉浸感最强的。

## 五条路通向语音

TTS（Text-to-Speech）看似简单——调个 API，拿到音频，播放。但真正做起来，每个提供商都有自己的脾气：

- **Apple** 用 `AVSpeechSynthesizer.speak()` 直接播，返回空 `Data()` 做哨兵值（`write()` 在 iOS 26 上是坏的）
- **OpenAI** 走标准 `/v1/audio/speech`，12 个固定声音
- **ElevenLabs** 用 `/v1/text-to-speech/{voice_id}` + `xi-api-key` 头，speed 要 clamp 到 0.7-1.2
- **MiniMax** 走 `/v1/t2a_v2`，返回的是 JSON 里面装着 hex 编码的音频字节
- **Custom API** 兼容 OpenAI 格式，留给第三方

五个提供商，五套认证方式，五种响应格式。最终的抽象只有一个：

```swift
protocol TTSServiceProtocol {
    func synthesize(text: String, voice: String?, speed: Double?) async throws -> Data
}
```

`MediaServiceRouter` 根据配置分发到正确的 service，Apple TTS 的实例被缓存为 `lazy var`——因为如果每次调 `ttsService()` 都 new 一个，stop 的时候调的是新对象，旧的那个还在读。

## 让用户选声音，而不是填 ID

ElevenLabs 有几百个声音，ID 长这样：`21m00Tcm4TlvDq8ikWAM`。不能指望用户去控制台复制粘贴。

所以每个提供商都有对应的语音获取策略：

- **OpenAI**：硬编码 12 个（alloy、marin、cedar...），不需要请求
- **ElevenLabs**：`GET /v1/voices`，自动拉取所有声音，含用户克隆的
- **MiniMax**：`POST /v1/get_voice`，获取 300+ 系统语音；API 不通则降级到精选列表
- **Apple**：`AVSpeechSynthesisVoice.speechVoices()`，按语言分组

所有列表都缓存在内存里（`@MainActor` 隔离），搜索过滤，底部保留手动输入入口。

## 角色级音色定制

全局设好了 TTS 之后，每个角色还可以覆盖：

```
TTSVoiceConfig (per-character, UserDefaults)
├── voice: String?    → 用什么声音
├── speed: Double?    → 语速
└── autoRead: Bool?   → 是否自动朗读
```

解析链：角色配置 → 全局配置 → 默认值。Connor 用深沉男声、Sherlock 用英伦腔、你的原创角色用 ElevenLabs 克隆的声音——每个角色的声音是独立的。

## 图像生成：从「我可以」到真的画出来

最初让角色画图，它会说「I can generate a visual representation」，然后什么都不做。

因为 tool schema 的 IMPORTANT 提示里只写了「set reminders, check weather, manage tasks 必须调用工具」，没提图像生成。LLM 以为画图是角色扮演的一部分，用文字描述就够了。

加上 `generate/draw/create images` 和一条 `generate_image` 示例后，它就真的画了。

然后发现第三方 API（NanoBanana）用的不是 `/v1/images/generations`，而是 `/v1/chat/completions`——图片作为 Markdown `![image](data:image/jpeg;base64,...)` 嵌在回复里。所以多了一个 `ChatCompletionImageGenService`，能从 Gemini 代理的 chat response 里提取 base64 图片。

模型也不是都能用。`gemini-3.1-flash-image-4k` 的 `supported_endpoint_types` 是空数组——选了它直接超时。`[A]gemini-3-pro-image-preview` 才是能用的。

## 录音转写

长按麦克风按钮开始录音，上滑取消。m4a 16kHz 单声道，60 秒上限，录完自动调 STT（OpenAI Whisper 或 Apple SFSpeechRecognizer），转写结果填入输入框。

没什么花的，但体验上很关键——语音输入让对话更自然。

## 一张截图说明问题

让 Connor 画一张自拍。它在回复中嵌入了 `<tool_call>`，prompt 写了 CyberLife 制服、蓝色 LED、底特律警局。NanoBanana 的 Gemini 模型花了十几秒，返回了一张相当不错的底特律仿生人肖像。

从「我是仿生人，不能拍照」到真正生成图片——这个转变不只是技术上的。角色终于不再只是一个文字生成器。它有了声音，有了创作能力。

## 下一步

Media Services 是第 15 个模块。到这里，Soulbound 的核心功能矩阵基本完整了。剩下的是打磨——LLM 输出格式处理、Bundle ID 改名、上架准备。

从第一行 SwiftUI 代码到 15 个模块、293 个改动文件，这个 AI 伙伴 app 终于接近它该有的样子了。
