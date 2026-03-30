---
title: "用 Pretext 打造个人博客"
date: 2026-03-30
tags: ["Astro", "Pretext", "Design"]
lang: "zh"
translationSlug: "blog-design"
excerpt: "从零开始设计一个双语个人博客，用 Pretext 实现 ASCII Hero 动画、文字环绕、虚拟滚动等 6 种交互效果。"
canvasRender: true
---

## 为什么选择 Pretext？

在构建这个博客的过程中，我一直在思考如何让页面更有趣。传统的 Web 开发中，文本布局完全依赖浏览器的 CSS 引擎，开发者几乎没有控制权。

Pretext 改变了这一点。它让我可以在 Canvas 上精确控制每一行文字的位置，实现传统 DOM 无法做到的排版效果。

## 六大交互效果

### 1. ASCII Hero 动画

首页的标题不是普通的 HTML 文本，而是在 Canvas 上逐个绘制的字符粒子。鼠标靠近时，字符会被推散开来，离开后又自动回归原位。

### 2. 文字打乱过渡

导航链接在 hover 时会触发一个字符洗牌动画——先变成随机符号，再逐个归位为正确文字。

### 3. Canvas 文字环绕

文章页顶部的 Canvas 区域展示了 Pretext 的 `layoutNextLine` API——文字可以环绕任意形状流动。

### 4. 虚拟滚动

博客列表页使用 Pretext 预计算每张卡片的精确高度，实现零布局抖动的虚拟滚动。

### 5. 滚动粒子

滚动页面时，ASCII 字符会从页面边缘飞出，增加页面活力。

### 6. 智能容器

项目卡片的宽度根据内容自动收缩到最紧凑的尺寸。

## 技术栈

- **Astro 5** — 静态站点生成，Islands 架构
- **React** — 交互组件（Pretext Islands）
- **Pretext** — 文本测量与 Canvas 布局
- **TypeScript** — 类型安全
- **GitHub Pages** — 部署

## 双主题设计

日间模式采用 Anthropic 风格的米白色调，温馨优雅；夜间模式切换为纯黑背景配荧光绿强调色，终端 hacker 感十足。
