# Personal Blog Design Spec

A personal blog for learning notes and project showcases, powered by Pretext for text measurement and Canvas rendering.

## Tech Stack

- **Framework**: Astro (static site generation)
- **Deployment**: GitHub Pages via GitHub Actions
- **Text Engine**: @chenglou/pretext (Canvas text measurement & layout)
- **Interactive Components**: React Islands (Astro `client:visible`)
- **Language**: TypeScript

## Internationalization

Full bilingual site (Chinese + English):
- URL structure: `/zh/blog/xxx`, `/en/blog/xxx`
- Root `/` detects browser language and redirects
- UI strings in `src/i18n/{zh,en}.json`
- Content in `src/content/{blog,projects}/{zh,en}/`
- Frontmatter `slug` field links translations together

## Theme System

Dual theme with `<html data-theme="light|dark">`, defaulting to `prefers-color-scheme`. User choice persisted in localStorage.

### Light Theme — Warm Cream

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#faf6f1` | Page background |
| `--surface` | `#ffffff` | Cards, containers |
| `--text` | `#1a1a1a` | Headings, body |
| `--text-secondary` | `#8b7e74` | Secondary text |
| `--text-muted` | `#b8a99a` | Labels, timestamps |
| `--border` | `#e8e0d8` | Borders, dividers |
| `--accent` | `#6b5c4d` | Links, emphasis |
| `--tag-bg` | `#f0ebe5` | Tag backgrounds |

### Dark Theme — Terminal Green

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0a0a` | Page background |
| `--surface` | `#111111` | Cards, containers |
| `--text` | `#eeeeee` | Headings |
| `--text-secondary` | `#888888` | Body text |
| `--text-muted` | `#555555` | Secondary info |
| `--border` | `#1a1a1a` | Borders |
| `--accent` | `#00ff88` | Neon green emphasis |
| `--tag-bg` | `#0a1a10` | Tag backgrounds |

### Typography

- **Light theme**: Maple Mono NF CN (all text)
- **Dark theme**: Share Tech Mono (English) + Maple Mono NF CN (Chinese)
- Font features: `+calt`, `+liga` (ligatures enabled)
- Web font loading: `@font-face` with local() fallback, woff2 format for deployment

### Border Radius

All elements use rounded corners:
- Cards, containers: `12px`
- Tags, buttons: `8px`
- Inputs, small elements: `6px`

## Pages

### 1. Home (`/[lang]/`)

- **ASCII Hero**: Full-width Canvas with animated text ↔ particle effect
- **Latest Posts**: 3-5 recent blog post cards
- **Featured Projects**: 2-3 project cards
- **Footer**: Copyright, social links

### 2. Blog List (`/[lang]/blog/`)

- Section header with post count
- Virtual-scrolled article cards (Pretext-powered height calculation)
- Tags for filtering
- Each card: title, excerpt, tags, date

### 3. Article Detail (`/[lang]/blog/[slug]`)

- Article header: title, date, tags, reading time
- Reading progress bar (top of page)
- Table of contents (TOC) sidebar
- Article body (Markdown rendered)
- Selected paragraphs rendered via Canvas (text wrapping demo)
- Giscus comments (optional, future)

### 4. Projects (`/[lang]/projects/`)

- Project cards with shrink-wrap sizing
- Each card: name, description, tech stack tags, link
- Cards use Pretext for optimal width calculation

### 5. About (`/[lang]/about`)

- Personal introduction
- Skills / tech stack
- Contact / social links

## Pretext Interactive Effects

All effects respect `prefers-reduced-motion: reduce` by disabling animations.

### 1. ASCII Hero Animation

- **Location**: Home page hero, full-width `<canvas>`
- **Behavior**: Site name text assembles from scattered ASCII characters on load. Mouse/touch proximity pushes characters into particles; they return when cursor moves away.
- **Pretext usage**: `prepareWithSegments()` + `layoutWithLines()` to calculate exact character positions as animation targets
- **Animation**: requestAnimationFrame loop, spring physics for particle movement

### 2. Text Scramble

- **Location**: Nav link hover, page titles entering viewport, language switch
- **Behavior**: Characters randomly shuffle then resolve to final text over 600ms
- **Pretext usage**: `prepare()` + `layout()` to pre-calculate final text width, keeping container stable during animation
- **Language switch**: "Blog" ↔ "博客" transitions through random characters

### 3. Canvas Article Rendering

- **Location**: Article detail page, selected paragraphs (e.g., opening quote, demo sections)
- **Behavior**: Text rendered on Canvas, flowing around irregular shapes. Optional typewriter effect for progressive text reveal.
- **Pretext usage**: `prepareWithSegments()` + `layoutNextLine()` with varying widths per line for text wrapping around shapes
- **Fallback**: Regular DOM text for non-featured paragraphs

### 4. Virtual Scroll Article List

- **Location**: Blog list page
- **Behavior**: On page load, Pretext batch-calculates card heights. Only visible cards are rendered in DOM. Scrollbar is accurate, zero layout shift.
- **Pretext usage**: `prepare()` for each card's title + excerpt → `layout()` at container width → exact pixel height
- **Performance**: prepare() batch ~19ms for 500 texts, layout() ~0.09ms

### 5. Scroll Spark

- **Location**: All pages, triggered on scroll/wheel events
- **Behavior**: ASCII character particles emit from page edges on scroll. Direction matches scroll direction. Particles fade out over 1-2 seconds with random rotation.
- **Implementation**: scroll/wheel event listener → spawn DOM elements with CSS transform + opacity animation → auto-cleanup
- **Accessibility**: Hidden when `prefers-reduced-motion: reduce`

### 6. Shrink-wrap Containers

- **Location**: Project cards, tags, quote blocks
- **Behavior**: Container width automatically tightens to the widest line of its content, instead of filling available space. Multi-line text gets balanced line widths.
- **Pretext usage**: `walkLineRanges()` to find actual max line width → set container CSS width to calculated value
- **Balanced text**: Binary search via repeated `walkLineRanges()` calls to find a width where line count is "nice" and lines are roughly equal length

## Project Structure

```
src/
├── components/
│   ├── pretext/              # Pretext-powered React Islands
│   │   ├── AsciiHero.tsx
│   │   ├── TextScramble.tsx
│   │   ├── CanvasArticle.tsx
│   │   ├── VirtualList.tsx
│   │   ├── ScrollSpark.tsx
│   │   └── ShrinkWrap.tsx
│   ├── Nav.astro
│   ├── Footer.astro
│   ├── ThemeToggle.astro
│   ├── LanguageSwitch.astro
│   ├── ReadingProgress.astro
│   └── TOC.astro
├── content/
│   ├── blog/
│   │   ├── zh/               # Chinese posts (.md)
│   │   └── en/               # English posts (.md)
│   └── projects/
│       ├── zh/
│       └── en/
├── i18n/
│   ├── zh.json
│   └── en.json
├── layouts/
│   ├── BaseLayout.astro      # HTML shell, theme, fonts
│   └── ArticleLayout.astro   # Article page with TOC + progress
├── pages/
│   ├── index.astro           # Root redirect by browser lang
│   ├── zh/
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── projects/
│   │   │   └── index.astro
│   │   └── about.astro
│   └── en/
│       └── (mirrors zh/)
└── styles/
    └── global.css            # CSS variables, theme definitions, base styles
```

## Content Schema

Blog post frontmatter:
```yaml
---
title: "用 Pretext 重新定义文字排版"
slug: "pretext-text-layout"
date: 2026-03-28
tags: ["Canvas", "Typography"]
lang: "zh"
translationSlug: "pretext-text-layout"  # links zh ↔ en versions
excerpt: "当 DOM 测量成为瓶颈时..."
canvasRender: true  # opt-in Canvas rendering for featured paragraphs
---
```

Project frontmatter:
```yaml
---
title: "OpenClaw Souls"
slug: "openclaw-souls"
lang: "zh"
translationSlug: "openclaw-souls"
description: "Agent skill marketplace platform"
tech: ["Next.js", "TypeScript", "Tailwind"]
url: "https://github.com/..."
---
```

## Deployment

- GitHub Actions workflow: on push to `main`, run `astro build`, deploy to GitHub Pages
- Custom domain support via CNAME file in `public/`
- Font files (woff2) in `public/fonts/` for web delivery
