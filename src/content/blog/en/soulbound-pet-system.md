---
title: "Raising ASCII Pets for AI Characters: Soulbound's Collection System"
date: 2026-04-04
tags: ["iOS", "SwiftUI", "Game Design", "ASCII Art"]
lang: "en"
translationSlug: "soulbound-pet-system"
excerpt: "64 ASCII pixel pets, deterministically bound to character cards via hash, with chat-driven stat growth, shard star upgrades, and four-stage evolution. Inspired by Claude Code Buddy, rendered with JetBrains Mono on iOS. How to design a nurturing system that costs zero LLM calls."
canvasRender: false
---

## The Inspiration

Claude Code has an easter egg called Buddy — an ASCII art creature living in your terminal. Every time you open it, your buddy is there, built from Unicode box-drawing characters, floating gently in scanlines and phosphor glow.

Seeing this, I thought: my AI character companion app needs something like this. Not just decoration — a full collection and nurturing system where each character card is bound to a pet, and chatting makes it grow.

## Deterministic Hashing: Same Card, Same Pet, Always

The core question: how do you assign pets to character cards?

Random? No. When you share a card with a friend, they import it and should see the same pet (just with XP starting at zero). So it needs to be deterministic — the same card ID must always produce the same result.

The solution is FNV-1a hash + Mulberry32 PRNG:

```
cardId (UUID)
  → FNV-1a("soulbound-pet-" + id)
  → Mulberry32 PRNG seed
  → roll 1: shiny? (2%)
  → roll 2: rarity (Common 50% / Rare 28% / Epic 15% / Legendary 5%)
  → roll 3: species (uniform within rarity pool)
  → roll 4-8: base attribute values (±15% variance)
```

These two algorithms together are under 30 lines of Swift, zero dependencies. Run the same UUID a million times — identical result every time.

## 64 Pets in ASCII Frames

Each pet has 3 animation frames, built from Unicode box-drawing characters and emoji. For example, Bubble Spirit:

```
Frame 1:       Frame 2:       Frame 3:
 ╭───╮          ╭───╮          ╭───╮
( ･ ･ )        ( ─ ─ )        ( ･ ･ )
 ╰─∪─╯          ╰─∪─╯          ╰─◡─╯
  ≋≋≋            ≋≋≋           ≋≋≋≋≋
 ○  ○            ○  ○         ○     ○
```

64 species across 4 rarities: 28 Common, 20 Rare, 12 Epic, 4 Legendary. From Bubble Spirit to Astral Whale, from Glitch Bunny to Neon Samurai.

Rendering uses JetBrains Mono bundled in the app (OFL free commercial use), registered via `UIAppFonts` in Info.plist. iOS auto-fallbacks missing glyphs to system fonts — no tofu boxes.

Triple `.shadow()` layers simulate terminal phosphor glow. Shiny pets get a fourth pink glow layer. Add an `easeInOut` float animation, and the ASCII characters feel alive.

## The Nurturing System: Chat → Stat Growth

Five attributes: Affinity, Vitality, Inspiration, Healing, Luck.

When a chat session ends (app enters background), the system analyzes conversation keywords:

- User says "thanks", "love", "happy" → Affinity +1~2
- User shares personal topics "secret", "trust" → Luck +1~2
- Varied conversation topics → Inspiration +1~2
- Long conversations → Vitality + Healing

This estimation is entirely rule-driven. No LLM calls. Zero cost. Rough but sufficient — the point is creating a feedback loop around "chatting with your character."

Stat caps are defined by each species' `baseMax`, and star upgrades raise the ceiling (★1 +10%, ★2 +22%, ★3 +35%).

## Evolution: Code-Generated Decorations

Four stages: Larval → Growth → Mature → Awakened.

64 pets × 4 stages × 3 frames = 768 hand-drawn ASCII frames? Impossible.

The solution is `PetEvolutionDecorator` — code that automatically wraps ASCII frames with decorations:

- **Larval**: raw frames, no modification
- **Growth**: sparkle ✦ above
- **Mature**: single-line border frame `┌✦───✦┐`
- **Awakened**: double-line halo `✦═══✦` + eye character upgrades (`･` → `◈`)

Same base frames, four visual tiers, zero additional art cost.

## Shard Star System

The pet pool is 64 species. Character cards can be created indefinitely. What about duplicates?

Generating an already-owned species → automatic shard conversion. Collect enough shards to star up:

| Rarity | Shards/dupe | Star-up cost |
|--------|-------------|-------------|
| Common | 3 | 5 |
| Rare | 5 | 8 |
| Epic | 8 | 12 |
| Legendary | 15 | 20 |

Max ★3, each star increases stat caps. This gives users two reasons to create more character cards: new pets, or starring up old ones.

## SwiftData Persistence

Pet identity (which pet) is determined by hash — no need to store it. Just recompute from card ID every time.

Pet growth data (XP, attributes, evolution stage, stars, shards) lives in a SwiftData `@Model PetData`. Queries use `speciesId` rather than `characterId`, because ownership is global — you own the "Bubble Spirit" species, not "Character A's Bubble Spirit."

A subtle bug: initially querying by `characterId` meant non-original characters couldn't find their pet. Switching to hash → speciesId lookup fixed it.

## Integration Points

Pets appear in 4 places:

1. **Chat view**: semi-transparent small pet at bottom-left, tappable for stat popover
2. **Home screen**: "My Pets" grid card showing "N/64 collected"
3. **Collection page**: grid browse + rarity filter + shard inventory
4. **Character import**: importing a card auto-generates its pet; first chat also triggers generation

New pets show a purple toast notification. Duplicates show "+N shards."

## Closing Thoughts

The entire system is 16 commits, 12 new files. The largest files are the pet registries (3 files, 800+ lines of ASCII frame data).

The core design principle is **zero LLM cost** — all computation (hashing, stat growth, keyword matching, evolution decoration) is purely local. A gamification feature shouldn't consume API quota.

Next step might be pet abilities affecting chat experience (high affinity → character responds more warmly?). But for now, let it float quietly at the bottom-left of the chat view, waiting for users to discover it, tap it, and nurture it.
