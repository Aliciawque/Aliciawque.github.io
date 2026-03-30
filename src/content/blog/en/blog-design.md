---
title: "Building a Blog with Pretext"
date: 2026-03-30
tags: ["Astro", "Pretext", "Design"]
lang: "en"
translationSlug: "blog-design"
excerpt: "Designing a bilingual personal blog from scratch, with 6 Pretext-powered interactive effects including ASCII Hero, text wrapping, and virtual scroll."
canvasRender: true
---

## Why Pretext?

While building this blog, I kept thinking about how to make pages more engaging. In traditional web development, text layout is entirely controlled by the browser's CSS engine — developers have almost no control.

Pretext changes that. It lets me precisely control every line of text on Canvas, achieving layout effects that traditional DOM simply cannot.

## Six Interactive Effects

### 1. ASCII Hero Animation

The homepage title isn't ordinary HTML text — it's character particles drawn individually on Canvas. When the mouse approaches, characters scatter; when it leaves, they return to their positions.

### 2. Text Scramble

Navigation links trigger a character shuffle animation on hover — first becoming random symbols, then resolving back to the correct text character by character.

### 3. Canvas Text Wrapping

The Canvas area at the top of article pages demonstrates Pretext's `layoutNextLine` API — text flows around arbitrary shapes.

### 4. Virtual Scroll

The blog list page uses Pretext to pre-calculate the exact height of each card, achieving zero-layout-shift virtual scrolling.

### 5. Scroll Sparks

When scrolling the page, ASCII characters fly out from the page edges, adding visual energy.

### 6. Smart Containers

Project card widths automatically shrink to the tightest fit for their content.

## Tech Stack

- **Astro 5** — Static site generation, Islands architecture
- **React** — Interactive components (Pretext Islands)
- **Pretext** — Text measurement & Canvas layout
- **TypeScript** — Type safety
- **GitHub Pages** — Deployment

## Dual Theme Design

Light mode uses Anthropic-style warm cream tones, elegant and inviting. Dark mode switches to pure black with neon green accents — full terminal hacker vibes.
