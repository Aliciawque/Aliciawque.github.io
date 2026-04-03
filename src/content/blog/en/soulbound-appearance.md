---
title: "Giving Every Character Their Own Skin: Soulbound's Appearance System"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "UI"]
lang: "en"
translationSlug: "soulbound-appearance"
excerpt: "Same app, different characters, completely different visual vibes — bubble colors, font sizes, background styles, all independently customizable per character. Not theme switching — per-character visual identity. From the data model to the three-level override cascade to a two-hour isLoading bug, here's the full story."
canvasRender: false
---

## Why Build This

Soulbound is an AI character companion app. You can create multiple characters, each with their own personality, memories, and world info. But there was a problem: every character's chat interface looked identical.

Talking to a gentle character? Blue-pink bubbles. Talking to a cyberpunk character? Same blue-pink bubbles. No visual differentiation.

SillyTavern and RikkaHub solve this with global theme switching. But I wanted something better: **each character can have its own visual style**, without affecting others. Like dressing each character in different clothes.

## Three-Level Override Cascade

The design centers on a priority chain:

```
Per-character config  >  Global config  >  Theme defaults
```

`AppearanceConfig` is an all-Optional Codable struct. Each nil field means "use the parent default." `AppearanceManager.resolve()` merges by priority, outputting a fully non-Optional `ResolvedAppearance` ready for rendering.

```swift
func resolve(characterId: UUID?, theme: Theme) -> ResolvedAppearance {
    let global = globalConfig
    let perChar = characterId.flatMap { loadForCharacter($0) }
    
    return ResolvedAppearance(
        bubbleUserColor: colorFor(perChar?.bubbleUserColor, global.bubbleUserColor, default: theme.userBubble),
        // ... same pattern for every field
    )
}
```

This is CSS inheritance, but for SwiftUI: child overrides parent, parent overrides browser defaults.

## What's Customizable

Four dimensions covering every visual element of the chat interface:

**Bubbles**: User/AI bubble colors, opacity (50%-100%), corner radius (8-24pt).

**Theme colors**: Primary, secondary, accent. Overrides the Theme system without replacing it — Theme.swift stays untouched.

**Typography**: Size (12-24pt), font family (system/rounded/monospaced/serif).

**Background**: None/solid color/gradient/image. Solid and gradient use ColorPicker, image reuses the existing BackgroundManager.

## UI Design

Two entry points:

**Settings → Appearance** — Global config. Set once, all characters use these defaults.

**ChatView → ... menu → Chat Appearance** — Per-character overrides. Each section has a "Use Custom" toggle. Turn it off and the values fall back to global. A preview area shows the current settings in real-time.

Campaign mode has the same entry — a paintbrush button in the toolbar.

## A Bug That Hid for Two Hours

Implementation done, testing revealed: Chat mode appearance customization never applied. But campaign mode worked fine. Same `CharacterAppearanceView`, one saves, one doesn't.

Added logging. Every `saveConfig()` call printed `skipped (isLoading)`. `isLoading` never became `false`.

The cause was in `loadConfig()`:

```swift
private func loadConfig() {
    loadGlobalDefaults()
    
    // First time: no per-character config exists
    guard let config = manager.loadForCharacter(characterId) else { return }  // ← returns here
    
    // ... load per-character overrides ...
    
    DispatchQueue.main.async { isLoading = false }  // ← never reached
}
```

First time opening appearance settings, there's no saved per-character config. The `guard` takes the early return. `isLoading = false` is after the return — never executed. Every subsequent save is blocked by `guard !isLoading`.

One-line fix:

```swift
guard let config = manager.loadForCharacter(characterId) else {
    DispatchQueue.main.async { isLoading = false }  // ← add before return
    return
}
```

Campaign mode worked because it happened to have triggered a save earlier (initial campaign data), so the `guard` didn't take the early return path.

This kind of bug is insidious because it only triggers on **first use**. If you've saved once before, everything works. If you test "save" before testing "first open," you'll never find it.

## Technical Choices

**Storage**: UserDefaults, JSON-encoded. Not worth SwiftData for small, infrequent config data.

**Don't touch Theme**: Appearance customization is an overlay, not a replacement. Theme.swift keeps its dual-theme system (Light Morandi + Dark Tiffany-on-black) completely intact. Custom appearance overrides Theme defaults at render time.

**Auto-save**: Uses a `configFingerprint` (all fields concatenated as a string) + a single `onChange` listener. Cleaner than per-field `onChange`, and avoids Swift type-checker timeouts on 17+ chained onChange modifiers.

**ColorPicker P3 safety**: iOS ColorPicker returns P3 gamut Colors on wide-gamut displays. Direct `UIColor.getRed()` can return 0,0,0 for non-sRGB colors. Convert to sRGB before reading components.
