---
title: "Redefining Text Layout with Pretext"
date: 2026-03-28
tags: ["Canvas", "Typography", "JavaScript"]
lang: "en"
translationSlug: "pretext-text-layout"
excerpt: "When DOM measurements become the bottleneck, Pretext uses pure arithmetic for accurate multiline text layout."
canvasRender: true
---

## Why Pretext?

Text measurement has always been a pain point in web development. Traditional approaches use `getBoundingClientRect` or `offsetHeight` to measure text height, but these operations trigger browser layout reflow — one of the most expensive operations.

Pretext offers a fresh approach: pure JavaScript text measurement and layout, without ever touching the DOM.

## Core API

```ts
const prepared = prepare('AGI is here', '16px Inter')
const { height, lineCount } = layout(prepared, maxWidth, lineHeight)
```

`prepare()` does the one-time preprocessing, `layout()` is pure arithmetic that can be called repeatedly.

## Use Cases

- Accurate height calculation for virtual lists
- Text rendering on Canvas
- Position calculation for text animations
