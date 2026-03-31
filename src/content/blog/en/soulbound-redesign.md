---
title: "Soulbound: Redesigning an iOS App Entirely with AI"
date: 2026-03-31
tags: ["iOS", "SwiftUI", "Design", "AI"]
lang: "en"
translationSlug: "soulbound-redesign"
excerpt: "The full story of redesigning an AI character companion app — from Morandi palettes to Soul Orb mascots, from browser mockups to migrating 89 files, all driven by Claude Code."
canvasRender: false
---

## From Connor Assistant to Soulbound

Connor Assistant is an iOS AI character companion app I built. Six modules — character chat, interactive campaigns, character creation, memory system, rebirth migration, identity cards. Feature-rich, but the UI was stuck in "it works" territory: system blue, gray cards, vertical lists, stock SF Symbols.

The redesign goal was simple: make it App Store worthy.

## Design Direction: Romantic Rationalism

After spending time on Xiaohongshu and Dribbble collecting references, I landed on two themes:

**Light — Morandi Palette**
Mist blue #6F8AA7 as primary, rose pink #D7B3BE as secondary, almond #E5CFC7 as accent. Low saturation, easy on the eyes, but never boring.

**Dark — Ink Black × Tiffany Blue**
Background #161823 is near-black with a subtle purple tint. Tiffany blue #81D8D0 cuts through the darkness. Layer hierarchy comes from value contrast between ink (#161823) and dark oak (#202F39), not from shadows.

After finalizing the palette, I had Claude generate live preview pages in a browser — two phone mockups side by side showing both themes. Much more intuitive than staring at hex values in a JSON file.

## The Soul Orb

Every app needs a soul. Soulbound's is a speech-bubble-shaped orb — round body, minimal smiley face, small tail at the bottom.

The light version is pearlescent white with subtle pink-blue-purple iridescence. The dark version is a charcoal sphere with glowing eyes and mouth.

It appears everywhere: beside the home logo, on loading screens (bouncing + "Infusing soul…"), as the AI chat avatar, and in empty states as a friendly prompt.

## Technical Implementation

The entire redesign was done in Claude Code using Subagent-Driven Development — each task dispatched to an independent agent that implements, self-reviews, and commits.

### Phase 1: Foundation

`Theme.swift` is the backbone. A single struct takes `ColorScheme` and returns every design token. Injected into every View via SwiftUI's `@Environment(\.theme)`.

```swift
@Environment(\.theme) private var theme
// theme.primary, theme.surface, theme.text, theme.cardRadius...
```

### Phase 2: Core Screens

The home screen went from a vertical button list to a 2×3 grid. Character and campaign selection pages took inspiration from Peacock — hero card on top, horizontal scroll rows below.

Chat backgrounds support user-uploaded images. The blend technique uses 15 gradient stops: the image fills the screen, covered by a theme-color gradient that fades from solid at the edges to nearly transparent in the center. No hard edges, no visible dividers, completely continuous transitions.

### Phase 3-4: Full Migration

63 view files, 1,337 replacements needed. `.blue` → `theme.primary`, `Color(.systemGray5)` → `theme.surface`, `.cornerRadius(16)` → `theme.cardRadius`.

This is exactly the kind of work agents excel at — 4 agents running in parallel, batched by complexity, 14-17 files each. Done in under 20 minutes.

### Phase 5: Polish

iOS 26 Liquid Glass effects on the navigation bar and home cards. Chat bubbles automatically reduce opacity when a custom background is active. Home cards have staggered appear animations, and the Soul Orb loading screen has sparkle particle effects.

## Final Numbers

- 20 commits
- 89 files changed
- +2,993 / -2,022 lines
- 12 new components
- About 3 hours from design to implementation

## Reflections

This redesign made me realize the real advantage of AI-assisted development isn't "writing code fast" — it's "not being afraid to change things." Migrating colors across 63 files used to be unthinkable. Now it's a prompt and 20 minutes of waiting.

The design itself was actually the most time-consuming part — browsing references, tuning colors, previewing mockups in the browser, confirming layouts. That requires human aesthetic judgment. AI just efficiently executes your decisions.
