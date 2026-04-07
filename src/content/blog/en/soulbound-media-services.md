---
title: "Giving AI Characters a Voice and Eyes: TTS, STT & Image Generation"
date: 2026-04-07
tags: ["iOS", "SwiftUI", "AI", "TTS", "Architecture"]
lang: "en"
translationSlug: "soulbound-media-services"
excerpt: "Text chat is flat. When Connor first spoke a case number in his deep voice, when Sherlock deduced in a British accent, when a character actually drew a selfie you asked for — the app stopped being a text RPG. Five TTS providers, automatic voice browsing, per-character voice customization, and chat-completion image generation, all in one sprint."
canvasRender: false
---

## The Ceiling of Text-Only Chat

By module 14, Soulbound could do a lot: characters had memories, personalities, skills, iOS native tool access, and proactive messaging.

But they were mute.

You'd chat with a Detroit android and get paragraphs. You'd talk to Sherlock Holmes and get text deductions. Information-dense, sure. Immersive? Not quite.

## Five Roads to Speech

TTS looks simple — call an API, get audio, play it. In practice, every provider has quirks:

- **Apple** uses `AVSpeechSynthesizer.speak()` with direct playback, returning empty `Data()` as a sentinel (`write()` is broken on iOS 26)
- **OpenAI** uses standard `/v1/audio/speech` with 12 fixed voices
- **ElevenLabs** uses `/v1/text-to-speech/{voice_id}` with `xi-api-key` header, speed clamped to 0.7–1.2
- **MiniMax** uses `/v1/t2a_v2`, returning hex-encoded audio bytes inside JSON
- **Custom API** follows OpenAI format for third-party services

Five providers, five auth schemes, five response formats. One abstraction:

```swift
protocol TTSServiceProtocol {
    func synthesize(text: String, voice: String?, speed: Double?) async throws -> Data
}
```

`MediaServiceRouter` dispatches to the correct service based on config. The Apple TTS instance is cached as a `lazy var` — creating a new one per call means `stop()` targets a fresh object while the old one keeps talking.

## Voice Browsing, Not ID Pasting

ElevenLabs has hundreds of voices with IDs like `21m00Tcm4TlvDq8ikWAM`. You can't expect users to copy-paste from a dashboard.

Each provider gets its own voice-fetching strategy:

- **OpenAI**: Hardcoded 12 voices (alloy, marin, cedar...) — no API call needed
- **ElevenLabs**: `GET /v1/voices` — auto-fetches all voices including user clones
- **MiniMax**: `POST /v1/get_voice` — fetches 300+ system voices; falls back to curated list if API fails
- **Apple**: `AVSpeechSynthesisVoice.speechVoices()` — grouped by language

All lists are cached in memory (`@MainActor` isolated), searchable, with a manual input fallback at the bottom.

## Per-Character Voice

After global TTS setup, each character can override:

```
TTSVoiceConfig (per-character, UserDefaults)
├── voice: String?    → which voice to use
├── speed: Double?    → speech rate
└── autoRead: Bool?   → auto-read AI replies
```

Resolution chain: character config → global config → default. Connor gets a deep voice, Sherlock gets a British accent, your OC gets a cloned ElevenLabs voice — each character sounds different.

## Image Generation: From "I Can" to Actually Drawing

Initially, asking a character to draw something got: "I can generate a visual representation based on my design schematics." Then nothing.

The tool schema's IMPORTANT instruction only listed "set reminders, check weather, manage tasks" as must-call scenarios. The LLM thought image generation was a roleplay thing — describing it in text was enough.

Adding `generate/draw/create images` to the must-call list and a `generate_image` example fixed it instantly.

Then the third-party API (NanoBanana) turned out to use `/v1/chat/completions` instead of `/v1/images/generations` — images come back as Markdown `![image](data:image/jpeg;base64,...)` embedded in the response. This needed a separate `ChatCompletionImageGenService` to extract base64 images from Gemini proxy responses.

Not all models work either. `gemini-3.1-flash-image-4k` has `supported_endpoint_types: []` — selecting it just times out. `[A]gemini-3-pro-image-preview` is the one that actually works.

## Push-to-Talk

Long-press the mic button to record. Slide up to cancel. M4A 16kHz mono, 60-second limit. When done, it auto-transcribes via STT (OpenAI Whisper or Apple SFSpeechRecognizer) and fills the input box.

Nothing fancy, but the UX impact is significant — voice input makes conversation feel natural.

## One Screenshot Says It All

Asked Connor to draw a selfie. He embedded a `<tool_call>` in his response — prompt described the CyberLife uniform, blue LED, Detroit precinct. NanoBanana's Gemini model took about fifteen seconds and returned a solid android portrait.

From "I am an android, I cannot be photographed" to actually generating the image — that shift isn't just technical. The character finally has a voice and creative agency. It's no longer just a text generator.

## What's Next

Media Services is module 15. At this point, Soulbound's core feature matrix is essentially complete. What's left is polish — LLM output formatting, bundle ID rename, App Store preparation.

From the first line of SwiftUI to 15 modules and 293 changed files, this AI companion app is finally approaching what it was always meant to be.
