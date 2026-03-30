# Alicia.dev

Personal blog built with [Astro](https://astro.build) and [Pretext](https://github.com/chenglou/pretext) — a pure JS text measurement & layout library.

**Live:** [aliciawque.github.io](https://aliciawque.github.io)

[中文版](#中文)

## Features

- **Dual Theme** — Warm cream (day) / black + neon green terminal (night)
- **Bilingual** — Full Chinese & English support with language detection
- **ASCII Hero** — Canvas particle animation powered by Pretext, responds to mouse interaction
- **Text Scramble** — Navigation links shuffle on hover
- **Canvas Text Wrapping** — Text flows around the Claude pixel mascot using Pretext's `layoutNextLine`
- **Scroll Sparks** — ASCII characters burst on scroll
- **Maple Mono NF CN** (day) / **Share Tech Mono** (night) typography

## Tech Stack

- Astro 5 (SSG + React Islands)
- @chenglou/pretext (Canvas text measurement & layout)
- React 19
- TypeScript
- GitHub Pages

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run test     # vitest
```

## Adding a Blog Post

Create matching files in `src/content/blog/zh/` and `src/content/blog/en/`:

```yaml
---
title: "Your Title"
date: 2026-03-30
tags: ["Tag1", "Tag2"]
lang: "zh"  # or "en"
translationSlug: "your-slug"  # same for both languages
excerpt: "Short description."
---
```

Push to `main` — GitHub Actions deploys automatically.

---

<a id="中文"></a>

## 中文

基于 [Astro](https://astro.build) 和 [Pretext](https://github.com/chenglou/pretext) 构建的个人博客。

**在线访问：** [aliciawque.github.io](https://aliciawque.github.io)

### 特色

- **双主题** — 日间米白温馨 / 夜间黑色+荧光绿终端风
- **双语** — 完整中英文支持，自动检测浏览器语言
- **ASCII Hero 动画** — Pretext 驱动的 Canvas 粒子动画，跟随鼠标交互
- **文字打乱过渡** — 导航链接 hover 时字符洗牌效果
- **Canvas 文字环绕** — 文字环绕像素小克，使用 Pretext 的 `layoutNextLine` API
- **滚动粒子** — 滚动时 ASCII 字符飞散
- **字体** — 日间 Maple Mono NF CN / 夜间英文 Share Tech Mono

### 发布新文章

在 `src/content/blog/zh/` 和 `src/content/blog/en/` 各创建 `.md` 文件，push 到 `main` 分支即自动部署。
