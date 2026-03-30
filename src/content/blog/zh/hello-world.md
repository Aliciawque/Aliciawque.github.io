---
title: "用 Pretext 重新定义文字排版"
date: 2026-03-28
tags: ["Canvas", "Typography", "JavaScript"]
lang: "zh"
translationSlug: "pretext-text-layout"
excerpt: "当 DOM 测量成为瓶颈时，Pretext 用纯算术实现精确的多行文本布局。"
canvasRender: true
---

## 为什么需要 Pretext？

在 Web 开发中，文本测量一直是一个痛点。传统方式使用 `getBoundingClientRect` 或 `offsetHeight` 来测量文本高度，但这些操作会触发浏览器的 layout reflow —— 最昂贵的操作之一。

Pretext 提供了一个全新的思路：用纯 JavaScript 实现文本测量和布局，完全不触碰 DOM。

## 核心 API

```ts
const prepared = prepare('AGI 春天到了', '16px Inter')
const { height, lineCount } = layout(prepared, maxWidth, lineHeight)
```

`prepare()` 做一次性预处理，`layout()` 是纯算术运算，可以反复调用。

## 应用场景

- 虚拟列表的精确高度计算
- Canvas 上的文字渲染
- 文字动画的位置计算
