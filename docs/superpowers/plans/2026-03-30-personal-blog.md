# Personal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual personal blog with Pretext-powered text animations and Canvas rendering, dual light/dark themes, deployed to GitHub Pages.

**Architecture:** Astro SSG with React Islands for interactive Pretext components. Content managed via Astro Content Collections with zh/en subdirectories. Theme switching via CSS custom properties on `<html data-theme>`. Pretext handles all text measurement — ASCII hero animation, text scramble transitions, Canvas article rendering, virtual scroll height calculation, scroll spark particles, and shrink-wrap container sizing.

**Tech Stack:** Astro 5, React 19, TypeScript, @chenglou/pretext, Vitest

---

## File Structure

```
personal-blog/
├── astro.config.mjs              # Astro config with React integration
├── tsconfig.json
├── package.json
├── public/
│   ├── fonts/
│   │   ├── MapleMono-NF-CN-Regular.woff2
│   │   ├── MapleMono-NF-CN-Bold.woff2
│   │   ├── MapleMono-NF-CN-SemiBold.woff2
│   │   ├── MapleMono-NF-CN-Italic.woff2
│   │   └── ShareTechMono-Regular.woff2
│   └── img/
│       └── favicon.ico
├── src/
│   ├── components/
│   │   ├── pretext/
│   │   │   ├── AsciiHero.tsx
│   │   │   ├── TextScramble.tsx
│   │   │   ├── CanvasArticle.tsx
│   │   │   ├── VirtualList.tsx
│   │   │   ├── ScrollSpark.tsx
│   │   │   └── ShrinkWrap.tsx
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── ThemeToggle.astro
│   │   ├── LanguageSwitch.astro
│   │   ├── ReadingProgress.astro
│   │   └── TOC.astro
│   ├── content/
│   │   ├── blog/
│   │   │   ├── zh/
│   │   │   │   └── hello-world.md
│   │   │   └── en/
│   │   │       └── hello-world.md
│   │   └── projects/
│   │       ├── zh/
│   │       │   └── sample-project.md
│   │       └── en/
│   │           └── sample-project.md
│   ├── content.config.ts
│   ├── i18n/
│   │   ├── zh.json
│   │   ├── en.json
│   │   └── utils.ts
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── zh/
│   │   │   ├── index.astro
│   │   │   ├── about.astro
│   │   │   ├── blog/
│   │   │   │   ├── index.astro
│   │   │   │   └── [...slug].astro
│   │   │   └── projects/
│   │   │       └── index.astro
│   │   └── en/
│   │       ├── index.astro
│   │       ├── about.astro
│   │       ├── blog/
│   │       │   ├── index.astro
│   │       │   └── [...slug].astro
│   │       └── projects/
│   │           └── index.astro
│   └── styles/
│       └── global.css
├── tests/
│   ├── i18n.test.ts
│   └── pretext/
│       ├── scramble.test.ts
│       ├── virtual-list.test.ts
│       └── shrink-wrap.test.ts
└── .github/
    └── workflows/
        └── deploy.yml
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `personal-blog/package.json`
- Create: `personal-blog/astro.config.mjs`
- Create: `personal-blog/tsconfig.json`

- [ ] **Step 1: Create Astro project**

```bash
cd ~/.claude/projects
npm create astro@latest personal-blog -- --template minimal --no-install --no-git --typescript strict
cd personal-blog
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @astrojs/react react react-dom @chenglou/pretext
npm install -D vitest @types/react @types/react-dom
```

- [ ] **Step 3: Configure Astro with React integration**

Replace `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

export default defineConfig({
  site: 'https://your-username.github.io',
  integrations: [react()],
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
})
```

- [ ] **Step 4: Configure TypeScript**

Replace `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 5: Add test script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Verify project builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Initialize git and commit**

```bash
cd ~/.claude/projects/personal-blog
git init
echo "node_modules/\ndist/\n.astro/\n.superpowers/" > .gitignore
git add .
git commit -m "chore: scaffold Astro project with React and Pretext"
```

---

### Task 2: Font Setup

**Files:**
- Create: `public/fonts/` (woff2 files)
- Create: `src/styles/global.css`

- [ ] **Step 1: Convert TTF fonts to woff2**

```bash
cd ~/.claude/projects/personal-blog
mkdir -p public/fonts

# Install woff2 converter if needed
pip install fonttools brotli 2>/dev/null

# Convert Maple Mono variants
python3 -c "
from fontTools.ttLib import TTFont
import sys, os
fonts = [
    ('MapleMono-NF-CN-Regular', os.path.expanduser('~/Library/Fonts/MapleMono-NF-CN-Regular.ttf')),
    ('MapleMono-NF-CN-Bold', os.path.expanduser('~/Library/Fonts/MapleMono-NF-CN-Bold.ttf')),
    ('MapleMono-NF-CN-SemiBold', os.path.expanduser('~/Library/Fonts/MapleMono-NF-CN-SemiBold.ttf')),
    ('MapleMono-NF-CN-Italic', os.path.expanduser('~/Library/Fonts/MapleMono-NF-CN-Italic.ttf')),
    ('ShareTechMono-Regular', os.path.expanduser('~/Library/Fonts/ShareTechMono-Regular.ttf')),
]
for name, path in fonts:
    font = TTFont(path)
    font.flavor = 'woff2'
    font.save(f'public/fonts/{name}.woff2')
    print(f'Converted {name}')
"
```

- [ ] **Step 2: Create global.css with font-face declarations and theme variables**

Create `src/styles/global.css`:

```css
/* === Fonts === */
@font-face {
  font-family: 'Maple Mono';
  src: local('Maple Mono NF CN'),
       url('/fonts/MapleMono-NF-CN-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Maple Mono';
  src: local('Maple Mono NF CN'),
       url('/fonts/MapleMono-NF-CN-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Maple Mono';
  src: local('Maple Mono NF CN'),
       url('/fonts/MapleMono-NF-CN-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Maple Mono';
  src: local('Maple Mono NF CN'),
       url('/fonts/MapleMono-NF-CN-Italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'Share Tech Mono';
  src: local('Share Tech Mono'),
       url('/fonts/ShareTechMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* === Light Theme (default) === */
:root,
[data-theme="light"] {
  --bg: #faf6f1;
  --surface: #ffffff;
  --text: #1a1a1a;
  --text-secondary: #8b7e74;
  --text-muted: #b8a99a;
  --border: #e8e0d8;
  --accent: #6b5c4d;
  --tag-bg: #f0ebe5;
  --font-body: 'Maple Mono', ui-monospace, monospace;
  --font-en: 'Maple Mono', ui-monospace, monospace;
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 6px;
}

/* === Dark Theme === */
[data-theme="dark"] {
  --bg: #0a0a0a;
  --surface: #111111;
  --text: #eeeeee;
  --text-secondary: #888888;
  --text-muted: #555555;
  --border: #1a1a1a;
  --accent: #00ff88;
  --tag-bg: #0a1a10;
  --font-body: 'Maple Mono', ui-monospace, monospace;
  --font-en: 'Share Tech Mono', 'Maple Mono', ui-monospace, monospace;
}

/* === Base Styles === */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-body);
  font-feature-settings: 'calt' 1, 'liga' 1;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* === Utility === */
.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Verify fonts render**

```bash
npm run build
```

Expected: Build succeeds. Font files are copied to `dist/fonts/`.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/ src/styles/global.css
git commit -m "feat: add font setup and theme CSS variables"
```

---

### Task 3: i18n System

**Files:**
- Create: `src/i18n/zh.json`
- Create: `src/i18n/en.json`
- Create: `src/i18n/utils.ts`
- Create: `tests/i18n.test.ts`

- [ ] **Step 1: Write i18n test**

Create `tests/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { t, getLanguageFromURL, getTranslatedPath } from '../src/i18n/utils'

describe('i18n utils', () => {
  it('returns Chinese text for zh locale', () => {
    expect(t('zh', 'nav.blog')).toBe('博客')
  })

  it('returns English text for en locale', () => {
    expect(t('en', 'nav.blog')).toBe('Blog')
  })

  it('returns key if translation missing', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('extracts language from URL path', () => {
    expect(getLanguageFromURL('/zh/blog/')).toBe('zh')
    expect(getLanguageFromURL('/en/about')).toBe('en')
    expect(getLanguageFromURL('/')).toBe('zh')
  })

  it('generates translated path', () => {
    expect(getTranslatedPath('/zh/blog/hello', 'en')).toBe('/en/blog/hello')
    expect(getTranslatedPath('/en/about', 'zh')).toBe('/zh/about')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/i18n.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create translation files**

Create `src/i18n/zh.json`:

```json
{
  "nav.blog": "博客",
  "nav.projects": "项目",
  "nav.about": "关于",
  "home.hero.title": "探索技术的边界，\n记录成长的轨迹。",
  "home.hero.subtitle": "学习心得、个人项目与技术实验。",
  "home.latest": "最新文章",
  "home.featured": "精选项目",
  "blog.title": "博客",
  "blog.count": "共 {count} 篇",
  "projects.title": "项目",
  "about.title": "关于",
  "footer.built": "基于 Astro & Pretext 构建",
  "article.toc": "目录",
  "article.readTime": "{min} 分钟阅读",
  "lang.switch": "EN"
}
```

Create `src/i18n/en.json`:

```json
{
  "nav.blog": "Blog",
  "nav.projects": "Projects",
  "nav.about": "About",
  "home.hero.title": "Exploring the frontiers\nof technology.",
  "home.hero.subtitle": "Learning notes, projects & experiments.",
  "home.latest": "Latest Posts",
  "home.featured": "Featured Projects",
  "blog.title": "Blog",
  "blog.count": "{count} posts",
  "projects.title": "Projects",
  "about.title": "About",
  "footer.built": "Built with Astro & Pretext",
  "article.toc": "Table of Contents",
  "article.readTime": "{min} min read",
  "lang.switch": "中"
}
```

- [ ] **Step 4: Implement i18n utils**

Create `src/i18n/utils.ts`:

```ts
import zh from './zh.json'
import en from './en.json'

const translations: Record<string, Record<string, string>> = { zh, en }

export type Lang = 'zh' | 'en'

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

export function getLanguageFromURL(path: string): Lang {
  const match = path.match(/^\/(zh|en)\//)
  return (match?.[1] as Lang) ?? 'zh'
}

export function getTranslatedPath(path: string, targetLang: Lang): string {
  return path.replace(/^\/(zh|en)\//, `/${targetLang}/`)
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/i18n.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/ tests/i18n.test.ts
git commit -m "feat: add i18n translation system with zh/en support"
```

---

### Task 4: Base Layout & Theme Toggle

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/ThemeToggle.astro`

- [ ] **Step 1: Create ThemeToggle component**

Create `src/components/ThemeToggle.astro`:

```astro
---
---
<button id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
  <span class="icon-light">☀️</span>
  <span class="icon-dark">🌙</span>
</button>

<style>
  button {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 6px 10px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text);
    transition: border-color 0.2s;
  }
  button:hover {
    border-color: var(--accent);
  }
  [data-theme="light"] .icon-light { display: none; }
  [data-theme="light"] .icon-dark { display: inline; }
  [data-theme="dark"] .icon-light { display: inline; }
  [data-theme="dark"] .icon-dark { display: none; }
</style>

<script is:inline>
  (function() {
    const stored = localStorage.getItem('theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const theme = stored || preferred
    document.documentElement.setAttribute('data-theme', theme)

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme')
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('theme', next)
    })
  })()
</script>
```

- [ ] **Step 2: Create BaseLayout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css'
import ThemeToggle from '../components/ThemeToggle.astro'
import Nav from '../components/Nav.astro'
import Footer from '../components/Footer.astro'
import { type Lang } from '../i18n/utils'

interface Props {
  title: string
  lang: Lang
  description?: string
}

const { title, lang, description = '' } = Astro.props
---
<!DOCTYPE html>
<html lang={lang} data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <title>{title}</title>
  <link rel="icon" type="image/x-icon" href="/img/favicon.ico" />
  <script is:inline>
    (function() {
      const stored = localStorage.getItem('theme')
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', stored || preferred)
    })()
  </script>
</head>
<body>
  <Nav lang={lang} />
  <main>
    <slot />
  </main>
  <Footer lang={lang} />
</body>
</html>
```

- [ ] **Step 3: Create Nav component**

Create `src/components/Nav.astro`:

```astro
---
import ThemeToggle from './ThemeToggle.astro'
import LanguageSwitch from './LanguageSwitch.astro'
import { t, type Lang } from '../i18n/utils'

interface Props {
  lang: Lang
}

const { lang } = Astro.props
const currentPath = Astro.url.pathname
---
<nav class="nav">
  <div class="nav-inner container">
    <a href={`/${lang}/`} class="logo">
      <span class="logo-text">Alicia.dev</span>
    </a>
    <div class="nav-links">
      <a href={`/${lang}/blog/`} class:list={[{ active: currentPath.includes('/blog') }]}>
        {t(lang, 'nav.blog')}
      </a>
      <a href={`/${lang}/projects/`} class:list={[{ active: currentPath.includes('/projects') }]}>
        {t(lang, 'nav.projects')}
      </a>
      <a href={`/${lang}/about`} class:list={[{ active: currentPath.includes('/about') }]}>
        {t(lang, 'nav.about')}
      </a>
      <LanguageSwitch lang={lang} />
      <ThemeToggle />
    </div>
  </div>
</nav>

<style>
  .nav {
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 100;
    backdrop-filter: blur(8px);
  }
  .nav-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    padding-bottom: 14px;
  }
  .logo {
    text-decoration: none;
  }
  .logo-text {
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }
  [data-theme="dark"] .logo-text {
    color: var(--accent);
    font-family: var(--font-en);
  }
  .nav-links {
    display: flex;
    gap: 18px;
    align-items: center;
    font-size: 13px;
  }
  .nav-links a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
  }
  .nav-links a:hover,
  .nav-links a.active {
    color: var(--accent);
  }
  [data-theme="dark"] .nav-links a {
    font-family: var(--font-en);
  }
</style>
```

- [ ] **Step 4: Create LanguageSwitch component**

Create `src/components/LanguageSwitch.astro`:

```astro
---
import { t, getTranslatedPath, type Lang } from '../i18n/utils'

interface Props {
  lang: Lang
}

const { lang } = Astro.props
const targetLang: Lang = lang === 'zh' ? 'en' : 'zh'
const targetPath = getTranslatedPath(Astro.url.pathname, targetLang)
---
<a href={targetPath} class="lang-switch" title={targetLang === 'en' ? 'Switch to English' : '切换到中文'}>
  {t(lang, 'lang.switch')}
</a>

<style>
  .lang-switch {
    font-size: 12px;
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted) !important;
    transition: border-color 0.2s, color 0.2s;
  }
  .lang-switch:hover {
    border-color: var(--accent);
    color: var(--accent) !important;
    text-decoration: none !important;
  }
</style>
```

- [ ] **Step 5: Create Footer component**

Create `src/components/Footer.astro`:

```astro
---
import { t, type Lang } from '../i18n/utils'

interface Props {
  lang: Lang
}

const { lang } = Astro.props
const year = new Date().getFullYear()
---
<footer class="footer">
  <div class="container footer-inner">
    <span class="footer-prefix"></span>
    <span>© {year} Alicia — {t(lang, 'footer.built')}</span>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid var(--border);
    padding: 20px 0;
    margin-top: 48px;
  }
  .footer-inner {
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }
  .footer-prefix {
    display: none;
  }
  [data-theme="dark"] .footer-prefix {
    display: inline;
    color: var(--accent);
  }
  [data-theme="dark"] .footer-prefix::before {
    content: '> ';
  }
</style>
```

- [ ] **Step 6: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/ src/components/Nav.astro src/components/Footer.astro src/components/ThemeToggle.astro src/components/LanguageSwitch.astro
git commit -m "feat: add BaseLayout with Nav, Footer, theme toggle, language switch"
```

---

### Task 5: Content Collections & Sample Content

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/blog/zh/hello-world.md`
- Create: `src/content/blog/en/hello-world.md`
- Create: `src/content/projects/zh/sample-project.md`
- Create: `src/content/projects/en/sample-project.md`

- [ ] **Step 1: Define content schemas**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['zh', 'en']),
    translationSlug: z.string(),
    excerpt: z.string(),
    canvasRender: z.boolean().default(false),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    lang: z.enum(['zh', 'en']),
    translationSlug: z.string(),
    description: z.string(),
    tech: z.array(z.string()).default([]),
    url: z.string().optional(),
    order: z.number().default(0),
  }),
})

export const collections = { blog, projects }
```

- [ ] **Step 2: Create sample blog posts**

Create `src/content/blog/zh/hello-world.md`:

```markdown
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
```

Create `src/content/blog/en/hello-world.md`:

```markdown
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
```

- [ ] **Step 3: Create sample project entries**

Create `src/content/projects/zh/sample-project.md`:

```markdown
---
title: "OpenClaw Souls"
lang: "zh"
translationSlug: "openclaw-souls"
description: "AI Agent 技能市场平台，让开发者分享和发现 Agent Skills。"
tech: ["Next.js", "TypeScript", "Tailwind"]
url: "https://github.com/"
order: 1
---

OpenClaw Souls 是一个 AI Agent 技能市场平台。
```

Create `src/content/projects/en/sample-project.md`:

```markdown
---
title: "OpenClaw Souls"
lang: "en"
translationSlug: "openclaw-souls"
description: "AI Agent skill marketplace platform for developers to share and discover Agent Skills."
tech: ["Next.js", "TypeScript", "Tailwind"]
url: "https://github.com/"
order: 1
---

OpenClaw Souls is an AI Agent skill marketplace platform.
```

- [ ] **Step 4: Build and verify content collections work**

```bash
npm run build
```

Expected: Build succeeds, content collections are recognized.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "feat: add content collections with sample blog posts and projects"
```

---

### Task 6: Pages — Root Redirect & Home

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/zh/index.astro`
- Create: `src/pages/en/index.astro`

- [ ] **Step 1: Create root redirect page**

Create `src/pages/index.astro`:

```astro
---
const preferredLang = Astro.preferredLocale || 'zh'
return Astro.redirect(`/${preferredLang}/`)
---
```

- [ ] **Step 2: Create Chinese home page**

Create `src/pages/zh/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro'
import { getCollection } from 'astro:content'
import { t } from '../../i18n/utils'

const lang = 'zh' as const
const allPosts = await getCollection('blog', ({ data }) => data.lang === lang)
const posts = allPosts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime()).slice(0, 5)
const projects = await getCollection('projects', ({ data }) => data.lang === lang)
const sortedProjects = projects.sort((a, b) => a.data.order - b.data.order).slice(0, 3)
---
<BaseLayout title="Alicia.dev" lang={lang}>
  <!-- Hero placeholder — AsciiHero React Island goes here in Task 9 -->
  <section class="hero container">
    <h1 class="hero-title">{t(lang, 'home.hero.title')}</h1>
    <p class="hero-subtitle">{t(lang, 'home.hero.subtitle')}</p>
  </section>

  <section class="container section">
    <h2 class="section-label">{t(lang, 'home.latest')}</h2>
    <div class="card-list">
      {posts.map(post => (
        <a href={`/${lang}/blog/${post.data.translationSlug}`} class="card">
          <h3 class="card-title">{post.data.title}</h3>
          <p class="card-excerpt">{post.data.excerpt}</p>
          <div class="card-meta">
            <div class="card-tags">
              {post.data.tags.map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
            <time class="card-date">{post.data.date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
          </div>
        </a>
      ))}
    </div>
  </section>

  <section class="container section">
    <h2 class="section-label">{t(lang, 'home.featured')}</h2>
    <div class="card-list">
      {sortedProjects.map(project => (
        <div class="card">
          <h3 class="card-title">{project.data.title}</h3>
          <p class="card-excerpt">{project.data.description}</p>
          <div class="card-tags">
            {project.data.tech.map(tech => (
              <span class="tag">{tech}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .hero {
    padding: 48px 24px 40px;
  }
  .hero-title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--text);
    white-space: pre-line;
  }
  [data-theme="dark"] .hero-title {
    color: var(--accent);
    font-family: var(--font-en);
  }
  .hero-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 12px;
  }
  [data-theme="dark"] .hero-subtitle {
    color: var(--text-muted);
  }
  .section {
    margin-bottom: 40px;
  }
  .section-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
    font-weight: 400;
  }
  [data-theme="dark"] .section-label {
    color: var(--accent);
    opacity: 0.6;
    font-family: var(--font-en);
  }
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card {
    padding: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
    display: block;
  }
  .card:hover {
    border-color: var(--accent);
    text-decoration: none;
  }
  .card-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
  }
  .card-excerpt {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 8px;
    line-height: 1.7;
  }
  .card-meta {
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .card-meta .card-tags {
    margin-top: 0;
  }
  .tag {
    font-size: 11px;
    padding: 3px 10px;
    background: var(--tag-bg);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
  }
  [data-theme="dark"] .tag {
    color: var(--accent);
    border: 1px solid var(--tag-bg);
    font-family: var(--font-en);
  }
  .card-date {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 3: Create English home page**

Create `src/pages/en/index.astro`:

Same as `zh/index.astro` but with `const lang = 'en' as const`.

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro'
import { getCollection } from 'astro:content'
import { t } from '../../i18n/utils'

const lang = 'en' as const
const allPosts = await getCollection('blog', ({ data }) => data.lang === lang)
const posts = allPosts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime()).slice(0, 5)
const projects = await getCollection('projects', ({ data }) => data.lang === lang)
const sortedProjects = projects.sort((a, b) => a.data.order - b.data.order).slice(0, 3)
---
<BaseLayout title="Alicia.dev" lang={lang}>
  <section class="hero container">
    <h1 class="hero-title">{t(lang, 'home.hero.title')}</h1>
    <p class="hero-subtitle">{t(lang, 'home.hero.subtitle')}</p>
  </section>

  <section class="container section">
    <h2 class="section-label">{t(lang, 'home.latest')}</h2>
    <div class="card-list">
      {posts.map(post => (
        <a href={`/${lang}/blog/${post.data.translationSlug}`} class="card">
          <h3 class="card-title">{post.data.title}</h3>
          <p class="card-excerpt">{post.data.excerpt}</p>
          <div class="card-meta">
            <div class="card-tags">
              {post.data.tags.map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
            <time class="card-date">{post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
          </div>
        </a>
      ))}
    </div>
  </section>

  <section class="container section">
    <h2 class="section-label">{t(lang, 'home.featured')}</h2>
    <div class="card-list">
      {sortedProjects.map(project => (
        <div class="card">
          <h3 class="card-title">{project.data.title}</h3>
          <p class="card-excerpt">{project.data.description}</p>
          <div class="card-tags">
            {project.data.tech.map(tech => (
              <span class="tag">{tech}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .hero {
    padding: 48px 24px 40px;
  }
  .hero-title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--text);
    white-space: pre-line;
  }
  [data-theme="dark"] .hero-title {
    color: var(--accent);
    font-family: var(--font-en);
  }
  .hero-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 12px;
  }
  [data-theme="dark"] .hero-subtitle {
    color: var(--text-muted);
  }
  .section {
    margin-bottom: 40px;
  }
  .section-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
    font-weight: 400;
  }
  [data-theme="dark"] .section-label {
    color: var(--accent);
    opacity: 0.6;
    font-family: var(--font-en);
  }
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card {
    padding: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
    display: block;
  }
  .card:hover {
    border-color: var(--accent);
    text-decoration: none;
  }
  .card-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
  }
  .card-excerpt {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 8px;
    line-height: 1.7;
  }
  .card-meta {
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .card-meta .card-tags {
    margin-top: 0;
  }
  .tag {
    font-size: 11px;
    padding: 3px 10px;
    background: var(--tag-bg);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
  }
  [data-theme="dark"] .tag {
    color: var(--accent);
    border: 1px solid var(--tag-bg);
    font-family: var(--font-en);
  }
  .card-date {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. `dist/index.html` exists with redirect. `dist/zh/index.html` and `dist/en/index.html` exist with content.

- [ ] **Step 5: Commit**

```bash
git add src/pages/
git commit -m "feat: add home pages with root redirect and bilingual content"
```

---

### Task 7: Blog List & Article Detail Pages

**Files:**
- Create: `src/pages/zh/blog/index.astro`
- Create: `src/pages/zh/blog/[...slug].astro`
- Create: `src/pages/en/blog/index.astro`
- Create: `src/pages/en/blog/[...slug].astro`
- Create: `src/layouts/ArticleLayout.astro`
- Create: `src/components/ReadingProgress.astro`
- Create: `src/components/TOC.astro`

- [ ] **Step 1: Create blog list page (zh)**

Create `src/pages/zh/blog/index.astro`:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro'
import { getCollection } from 'astro:content'
import { t } from '../../../i18n/utils'

const lang = 'zh' as const
const allPosts = await getCollection('blog', ({ data }) => data.lang === lang)
const posts = allPosts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
---
<BaseLayout title={`${t(lang, 'blog.title')} — Alicia.dev`} lang={lang}>
  <div class="container">
    <header class="page-header">
      <h1 class="page-title">{t(lang, 'blog.title')}</h1>
      <p class="page-count">{t(lang, 'blog.count', { count: posts.length })}</p>
    </header>

    <!-- VirtualList React Island goes here in Task 12 -->
    <div class="card-list" id="blog-list">
      {posts.map(post => (
        <a href={`/${lang}/blog/${post.data.translationSlug}`} class="card">
          <h3 class="card-title">{post.data.title}</h3>
          <p class="card-excerpt">{post.data.excerpt}</p>
          <div class="card-meta">
            <div class="card-tags">
              {post.data.tags.map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
            <time class="card-date">{post.data.date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
          </div>
        </a>
      ))}
    </div>
  </div>
</BaseLayout>

<style>
  .page-header {
    padding: 40px 0 24px;
  }
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
  }
  [data-theme="dark"] .page-title {
    color: var(--accent);
  }
  .page-count {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 40px;
  }
  .card {
    padding: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
    display: block;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .card-title { font-size: 16px; font-weight: 500; color: var(--text); }
  .card-excerpt { font-size: 13px; color: var(--text-secondary); margin-top: 8px; line-height: 1.7; }
  .card-meta { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }
  .card-tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { font-size: 11px; padding: 3px 10px; background: var(--tag-bg); color: var(--text-secondary); border-radius: var(--radius-md); }
  [data-theme="dark"] .tag { color: var(--accent); border: 1px solid var(--tag-bg); }
  .card-date { font-size: 12px; color: var(--text-muted); }
</style>
```

- [ ] **Step 2: Create blog list page (en)**

Create `src/pages/en/blog/index.astro` — same structure with `const lang = 'en' as const` and `'en-US'` date locale.

- [ ] **Step 3: Create ReadingProgress component**

Create `src/components/ReadingProgress.astro`:

```astro
---
---
<div class="reading-progress" id="reading-progress">
  <div class="reading-progress-bar" id="reading-progress-bar"></div>
</div>

<style>
  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 200;
    background: transparent;
  }
  .reading-progress-bar {
    height: 100%;
    width: 0%;
    background: var(--accent);
    transition: width 0.1s linear;
  }
</style>

<script is:inline>
  (function() {
    const bar = document.getElementById('reading-progress-bar')
    if (!bar) return
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      bar.style.width = progress + '%'
    }, { passive: true })
  })()
</script>
```

- [ ] **Step 4: Create TOC component**

Create `src/components/TOC.astro`:

```astro
---
import { t, type Lang } from '../i18n/utils'

interface Props {
  headings: { depth: number; slug: string; text: string }[]
  lang: Lang
}

const { headings, lang } = Astro.props
const tocHeadings = headings.filter(h => h.depth >= 2 && h.depth <= 3)
---
{tocHeadings.length > 0 && (
  <aside class="toc">
    <h4 class="toc-title">{t(lang, 'article.toc')}</h4>
    <nav>
      <ul>
        {tocHeadings.map(h => (
          <li class:list={[`depth-${h.depth}`]}>
            <a href={`#${h.slug}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  </aside>
)}

<style>
  .toc {
    position: sticky;
    top: 80px;
    font-size: 12px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
  .toc-title {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
    font-weight: 400;
  }
  ul {
    list-style: none;
  }
  li {
    margin-bottom: 6px;
  }
  li.depth-3 {
    padding-left: 16px;
  }
  a {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  a:hover {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 5: Create ArticleLayout**

Create `src/layouts/ArticleLayout.astro`:

```astro
---
import BaseLayout from './BaseLayout.astro'
import ReadingProgress from '../components/ReadingProgress.astro'
import TOC from '../components/TOC.astro'
import { t, type Lang } from '../i18n/utils'

interface Props {
  title: string
  date: Date
  tags: string[]
  lang: Lang
  headings: { depth: number; slug: string; text: string }[]
  readingTime: number
}

const { title, date, tags, lang, headings, readingTime } = Astro.props
const dateStr = date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
})
---
<BaseLayout title={`${title} — Alicia.dev`} lang={lang}>
  <ReadingProgress />
  <div class="article-layout container">
    <article class="article-content">
      <header class="article-header">
        <h1 class="article-title">{title}</h1>
        <div class="article-meta">
          <time>{dateStr}</time>
          <span>·</span>
          <span>{t(lang, 'article.readTime', { min: readingTime })}</span>
        </div>
        <div class="article-tags">
          {tags.map(tag => <span class="tag">{tag}</span>)}
        </div>
      </header>
      <div class="prose">
        <slot />
      </div>
    </article>
    <TOC headings={headings} lang={lang} />
  </div>
</BaseLayout>

<style>
  .article-layout {
    display: grid;
    grid-template-columns: 1fr 200px;
    gap: 48px;
    padding-top: 32px;
    padding-bottom: 48px;
  }
  @media (max-width: 900px) {
    .article-layout {
      grid-template-columns: 1fr;
    }
  }
  .article-header {
    margin-bottom: 32px;
  }
  .article-title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text);
  }
  [data-theme="dark"] .article-title {
    color: var(--accent);
  }
  .article-meta {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }
  .article-tags {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .tag {
    font-size: 11px;
    padding: 3px 10px;
    background: var(--tag-bg);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
  }
  [data-theme="dark"] .tag {
    color: var(--accent);
    border: 1px solid var(--tag-bg);
  }
  .prose {
    font-size: 15px;
    line-height: 1.8;
    color: var(--text-secondary);
  }
  .prose h2 {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    margin-top: 40px;
    margin-bottom: 16px;
  }
  .prose h3 {
    font-size: 18px;
    font-weight: 500;
    color: var(--text);
    margin-top: 32px;
    margin-bottom: 12px;
  }
  .prose p {
    margin-bottom: 16px;
  }
  .prose code {
    font-size: 13px;
    padding: 2px 6px;
    background: var(--tag-bg);
    border-radius: var(--radius-sm);
  }
  .prose pre {
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    margin-bottom: 16px;
  }
  .prose pre code {
    padding: 0;
    background: none;
  }
  .prose ul, .prose ol {
    padding-left: 24px;
    margin-bottom: 16px;
  }
  .prose li {
    margin-bottom: 4px;
  }
</style>
```

- [ ] **Step 6: Create article detail page (zh)**

Create `src/pages/zh/blog/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content'
import ArticleLayout from '../../../layouts/ArticleLayout.astro'

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.lang === 'zh')
  return posts.map(post => ({
    params: { slug: post.data.translationSlug },
    props: { post },
  }))
}

const { post } = Astro.props
const { Content, headings } = await post.render()
const wordCount = post.body?.length ?? 0
const readingTime = Math.max(1, Math.ceil(wordCount / 400))
---
<ArticleLayout
  title={post.data.title}
  date={post.data.date}
  tags={post.data.tags}
  lang="zh"
  headings={headings}
  readingTime={readingTime}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 7: Create article detail page (en)**

Create `src/pages/en/blog/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content'
import ArticleLayout from '../../../layouts/ArticleLayout.astro'

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.lang === 'en')
  return posts.map(post => ({
    params: { slug: post.data.translationSlug },
    props: { post },
  }))
}

const { post } = Astro.props
const { Content, headings } = await post.render()
const wordCount = post.body?.length ?? 0
const readingTime = Math.max(1, Math.ceil(wordCount / 300))
---
<ArticleLayout
  title={post.data.title}
  date={post.data.date}
  tags={post.data.tags}
  lang="en"
  headings={headings}
  readingTime={readingTime}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. `dist/zh/blog/index.html`, `dist/zh/blog/pretext-text-layout/index.html`, and en equivalents all exist.

- [ ] **Step 9: Commit**

```bash
git add src/pages/zh/blog/ src/pages/en/blog/ src/layouts/ArticleLayout.astro src/components/ReadingProgress.astro src/components/TOC.astro
git commit -m "feat: add blog list and article detail pages with TOC and reading progress"
```

---

### Task 8: Projects & About Pages

**Files:**
- Create: `src/pages/zh/projects/index.astro`
- Create: `src/pages/en/projects/index.astro`
- Create: `src/pages/zh/about.astro`
- Create: `src/pages/en/about.astro`

- [ ] **Step 1: Create projects page (zh)**

Create `src/pages/zh/projects/index.astro`:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro'
import { getCollection } from 'astro:content'
import { t } from '../../../i18n/utils'

const lang = 'zh' as const
const projects = await getCollection('projects', ({ data }) => data.lang === lang)
const sorted = projects.sort((a, b) => a.data.order - b.data.order)
---
<BaseLayout title={`${t(lang, 'projects.title')} — Alicia.dev`} lang={lang}>
  <div class="container">
    <header class="page-header">
      <h1 class="page-title">{t(lang, 'projects.title')}</h1>
    </header>

    <!-- ShrinkWrap React Island wraps these cards in Task 14 -->
    <div class="projects-grid">
      {sorted.map(project => (
        <div class="project-card">
          <h3 class="project-title">
            {project.data.url ? (
              <a href={project.data.url} target="_blank" rel="noopener">{project.data.title}</a>
            ) : project.data.title}
          </h3>
          <p class="project-desc">{project.data.description}</p>
          <div class="project-tags">
            {project.data.tech.map(tech => (
              <span class="tag">{tech}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</BaseLayout>

<style>
  .page-header { padding: 40px 0 24px; }
  .page-title { font-size: 24px; font-weight: 600; color: var(--text); }
  [data-theme="dark"] .page-title { color: var(--accent); }
  .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding-bottom: 40px; }
  .project-card {
    padding: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    transition: border-color 0.2s;
  }
  .project-card:hover { border-color: var(--accent); }
  .project-title { font-size: 16px; font-weight: 500; }
  .project-title a { color: var(--text); text-decoration: none; }
  .project-title a:hover { color: var(--accent); }
  .project-desc { font-size: 13px; color: var(--text-secondary); margin-top: 8px; line-height: 1.7; }
  .project-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .tag { font-size: 11px; padding: 3px 10px; background: var(--tag-bg); color: var(--text-secondary); border-radius: var(--radius-md); }
  [data-theme="dark"] .tag { color: var(--accent); border: 1px solid var(--tag-bg); }
</style>
```

- [ ] **Step 2: Create projects page (en)**

Create `src/pages/en/projects/index.astro` — same with `const lang = 'en' as const`.

- [ ] **Step 3: Create about page (zh)**

Create `src/pages/zh/about.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro'
import { t } from '../../i18n/utils'

const lang = 'zh' as const
---
<BaseLayout title={`${t(lang, 'about.title')} — Alicia.dev`} lang={lang}>
  <div class="container about">
    <h1 class="about-title">{t(lang, 'about.title')}</h1>
    <div class="about-content">
      <p>你好，我是 Alicia 👋</p>
      <p>这里是我的个人博客，记录学习心得和项目经历。</p>

      <h2>技术栈</h2>
      <div class="tech-tags">
        {['TypeScript', 'React', 'Next.js', 'Astro', 'Node.js', 'Python'].map(tech => (
          <span class="tag">{tech}</span>
        ))}
      </div>

      <h2>联系方式</h2>
      <ul>
        <li><a href="https://github.com/" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </div>
  </div>
</BaseLayout>

<style>
  .about { padding: 40px 0 48px; }
  .about-title { font-size: 24px; font-weight: 600; color: var(--text); margin-bottom: 24px; }
  [data-theme="dark"] .about-title { color: var(--accent); }
  .about-content { font-size: 15px; line-height: 1.8; color: var(--text-secondary); }
  .about-content h2 { font-size: 18px; font-weight: 500; color: var(--text); margin-top: 32px; margin-bottom: 12px; }
  .about-content p { margin-bottom: 12px; }
  .about-content ul { list-style: none; }
  .about-content li { margin-bottom: 8px; }
  .about-content a { color: var(--accent); }
  .tech-tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { font-size: 12px; padding: 4px 12px; background: var(--tag-bg); color: var(--text-secondary); border-radius: var(--radius-md); }
  [data-theme="dark"] .tag { color: var(--accent); border: 1px solid var(--tag-bg); }
</style>
```

- [ ] **Step 4: Create about page (en)**

Create `src/pages/en/about.astro` — same with `const lang = 'en' as const` and English content.

- [ ] **Step 5: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. All pages generated.

- [ ] **Step 6: Commit**

```bash
git add src/pages/zh/projects/ src/pages/en/projects/ src/pages/zh/about.astro src/pages/en/about.astro
git commit -m "feat: add projects and about pages with bilingual support"
```

---

### Task 9: Pretext — ASCII Hero Animation

**Files:**
- Create: `src/components/pretext/AsciiHero.tsx`
- Modify: `src/pages/zh/index.astro` (add Island)
- Modify: `src/pages/en/index.astro` (add Island)

- [ ] **Step 1: Create AsciiHero component**

Create `src/components/pretext/AsciiHero.tsx`:

```tsx
import { useRef, useEffect, useCallback } from 'react'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  char: string
  vx: number
  vy: number
}

const ASCII_CHARS = '@#$%&*!~^()+={}[]|<>?/\\:;'
const FONT_SIZE = 32
const LINE_HEIGHT = 40

export default function AsciiHero({ text, font }: { text: string; font: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prepared = prepareWithSegments(text, `${FONT_SIZE}px ${font}`)
    const { lines } = layoutWithLines(prepared, canvas.width - 48, LINE_HEIGHT)

    const particles: Particle[] = []
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = `${FONT_SIZE}px ${font}`

    let y = (canvas.height - lines.length * LINE_HEIGHT) / 2 + FONT_SIZE
    for (const line of lines) {
      const lineWidth = line.width
      let x = (canvas.width - lineWidth) / 2

      for (const char of [...line.text]) {
        if (char.trim()) {
          const charWidth = ctx.measureText(char).width
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            targetX: x + charWidth / 2,
            targetY: y,
            char,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
          })
          x += charWidth
        } else {
          x += ctx.measureText(char).width
        }
      }
      y += LINE_HEIGHT
    }

    particlesRef.current = particles
  }, [text, font])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      const ctx = canvas.getContext('2d')
      ctx?.scale(dpr, dpr)
      canvas.dataset.cssWidth = String(rect.width)
      canvas.dataset.cssHeight = String(rect.height)
      initParticles()
    }

    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    canvas.addEventListener('mousemove', handleMouse)
    canvas.addEventListener('mouseleave', handleLeave)
    canvas.addEventListener('touchmove', (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    })

    const animate = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = Number(canvas.dataset.cssWidth) || canvas.width
      const h = Number(canvas.dataset.cssHeight) || canvas.height

      ctx.clearRect(0, 0, w, h)
      ctx.font = `${FONT_SIZE}px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const mouse = mouseRef.current
      const pushRadius = 120
      const pushStrength = 8

      for (const p of particlesRef.current) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < pushRadius && dist > 0) {
          const force = (1 - dist / pushRadius) * pushStrength
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.vx += (p.targetX - p.x) * 0.06
        p.vy += (p.targetY - p.y) * 0.06
        p.vx *= 0.88
        p.vy *= 0.88
        p.x += p.vx
        p.y += p.vy

        const distToTarget = Math.sqrt(
          (p.x - p.targetX) ** 2 + (p.y - p.targetY) ** 2
        )

        if (distToTarget > 30) {
          const randomChar = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
          ctx.fillStyle = 'var(--text-muted, #555)'
          ctx.fillText(randomChar, p.x, p.y)
        } else {
          ctx.fillStyle = 'var(--accent, #00ff88)'
          ctx.fillText(p.char, p.x, p.y)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('mouseleave', handleLeave)
    }
  }, [font, initParticles])

  return (
    <div style={{ width: '100%', height: '240px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Add AsciiHero Island to zh home page**

In `src/pages/zh/index.astro`, replace the hero section placeholder:

```astro
<!-- Add import at top of frontmatter -->
import AsciiHero from '../../components/pretext/AsciiHero.tsx'
```

Replace the `<section class="hero container">` block with:

```astro
<section class="hero container">
  <AsciiHero client:visible text={t(lang, 'home.hero.title')} font="Maple Mono NF CN" />
  <p class="hero-subtitle">{t(lang, 'home.hero.subtitle')}</p>
</section>
```

- [ ] **Step 3: Add AsciiHero Island to en home page**

Same change in `src/pages/en/index.astro`.

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. Home pages include the React island script.

- [ ] **Step 5: Manual visual test**

```bash
npm run dev
```

Open `http://localhost:4321/zh/` — verify the ASCII hero animates and responds to mouse.

- [ ] **Step 6: Commit**

```bash
git add src/components/pretext/AsciiHero.tsx src/pages/zh/index.astro src/pages/en/index.astro
git commit -m "feat: add Pretext-powered ASCII hero animation with mouse interaction"
```

---

### Task 10: Pretext — Text Scramble

**Files:**
- Create: `src/components/pretext/TextScramble.tsx`
- Create: `tests/pretext/scramble.test.ts`

- [ ] **Step 1: Write scramble logic test**

Create `tests/pretext/scramble.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scrambleStep } from '../../src/components/pretext/TextScramble'

describe('scrambleStep', () => {
  it('returns target text when progress is 1', () => {
    expect(scrambleStep('Hello', 1)).toBe('Hello')
  })

  it('returns all random chars when progress is 0', () => {
    const result = scrambleStep('Hello', 0)
    expect(result.length).toBe(5)
    expect(result).not.toBe('Hello')
  })

  it('progressively reveals characters', () => {
    const result = scrambleStep('Hello', 0.6)
    // First 3 chars should be revealed (0.6 * 5 = 3)
    expect(result.substring(0, 3)).toBe('Hel')
    expect(result.length).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pretext/scramble.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create TextScramble component**

Create `src/components/pretext/TextScramble.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { prepare, layout } from '@chenglou/pretext'

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
const DURATION = 600

export function scrambleStep(target: string, progress: number): string {
  const chars = [...target]
  const revealCount = Math.floor(progress * chars.length)
  return chars
    .map((char, i) => {
      if (i < revealCount) return char
      if (char === ' ') return ' '
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    })
    .join('')
}

export default function TextScramble({
  text,
  font,
  tag: Tag = 'span',
  className = '',
  trigger = 'hover',
}: {
  text: string
  font: string
  tag?: 'span' | 'h1' | 'h2' | 'h3' | 'a'
  className?: string
  trigger?: 'hover' | 'visible'
}) {
  const [display, setDisplay] = useState(text)
  const [fixedWidth, setFixedWidth] = useState<number | undefined>()
  const animRef = useRef<number>(0)
  const elRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      const prepared = prepare(text, `16px ${font}`)
      const { height } = layout(prepared, 9999, 20)
      if (height > 0) {
        const el = elRef.current
        if (el) setFixedWidth(el.getBoundingClientRect().width)
      }
    } catch {
      // Pretext not available in SSR
    }
  }, [text, font])

  const runScramble = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1)
      setDisplay(scrambleStep(text, progress))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick)
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }, [text])

  useEffect(() => {
    if (trigger !== 'visible') return
    const el = elRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runScramble()
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [trigger, runScramble])

  const handlers =
    trigger === 'hover' ? { onMouseEnter: runScramble } : {}

  return (
    <Tag
      ref={elRef as never}
      className={className}
      style={fixedWidth ? { display: 'inline-block', minWidth: fixedWidth } : undefined}
      {...handlers}
    >
      {display}
    </Tag>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/pretext/scramble.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pretext/TextScramble.tsx tests/pretext/scramble.test.ts
git commit -m "feat: add TextScramble component with Pretext-stabilized width"
```

---

### Task 11: Pretext — Canvas Article Rendering

**Files:**
- Create: `src/components/pretext/CanvasArticle.tsx`

- [ ] **Step 1: Create CanvasArticle component**

Create `src/components/pretext/CanvasArticle.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react'
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'

const LINE_HEIGHT = 28

interface FloatShape {
  x: number
  y: number
  width: number
  height: number
  radius?: number
}

export default function CanvasArticle({
  text,
  font = 'Maple Mono NF CN',
  fontSize = 15,
  width = 640,
  floatShape,
  typewriter = false,
}: {
  text: string
  font?: string
  fontSize?: number
  width?: number
  floatShape?: FloatShape
  typewriter?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = useState(200)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const fontStr = `${fontSize}px ${font}`
    const prepared = prepareWithSegments(text, fontStr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const padding = 24

    // Calculate all lines with variable widths (for float wrapping)
    const lines: { text: string; x: number; y: number }[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = padding + fontSize

    while (true) {
      let lineWidth = width - padding * 2

      // Narrow the line if it overlaps with the float shape
      let lineX = padding
      if (floatShape) {
        const lineTop = y - fontSize
        const lineBottom = y + (LINE_HEIGHT - fontSize)
        if (
          lineBottom > floatShape.y &&
          lineTop < floatShape.y + floatShape.height
        ) {
          lineWidth -= floatShape.width + 16
          if (floatShape.x < width / 2) {
            lineX = floatShape.x + floatShape.width + 16
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, lineWidth)
      if (line === null) break

      lines.push({ text: line.text, x: lineX, y })
      cursor = line.end
      y += LINE_HEIGHT
    }

    const totalHeight = y + padding
    setHeight(totalHeight)

    canvas.width = width * dpr
    canvas.height = totalHeight * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = totalHeight + 'px'
    ctx.scale(dpr, dpr)

    const theme = document.documentElement.getAttribute('data-theme')
    const textColor = theme === 'dark' ? '#eeeeee' : '#8b7e74'
    const accentColor = theme === 'dark' ? '#00ff88' : '#6b5c4d'

    const drawLines = (count: number) => {
      ctx.clearRect(0, 0, width, totalHeight)

      // Draw float shape
      if (floatShape) {
        ctx.strokeStyle = accentColor
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        if (floatShape.radius) {
          ctx.beginPath()
          ctx.arc(
            floatShape.x + floatShape.width / 2,
            floatShape.y + floatShape.height / 2,
            floatShape.radius,
            0,
            Math.PI * 2
          )
          ctx.stroke()
        } else {
          ctx.strokeRect(floatShape.x, floatShape.y, floatShape.width, floatShape.height)
        }
        ctx.setLineDash([])
      }

      ctx.font = fontStr
      ctx.fillStyle = textColor
      ctx.textBaseline = 'alphabetic'

      for (let i = 0; i < count && i < lines.length; i++) {
        ctx.fillText(lines[i].text, lines[i].x, lines[i].y)
      }
    }

    if (typewriter) {
      let lineIndex = 0
      const interval = setInterval(() => {
        lineIndex++
        drawLines(lineIndex)
        if (lineIndex >= lines.length) clearInterval(interval)
      }, 80)
      return () => clearInterval(interval)
    } else {
      drawLines(lines.length)
    }
  }, [text, font, fontSize, width, floatShape, typewriter])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        maxWidth: width,
        height,
        display: 'block',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border, #e8e0d8)',
      }}
    />
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/pretext/CanvasArticle.tsx
git commit -m "feat: add CanvasArticle with Pretext layoutNextLine for text wrapping"
```

---

### Task 12: Pretext — Virtual Scroll List

**Files:**
- Create: `src/components/pretext/VirtualList.tsx`
- Create: `tests/pretext/virtual-list.test.ts`

- [ ] **Step 1: Write virtual list height calculation test**

Create `tests/pretext/virtual-list.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateItemHeight } from '../../src/components/pretext/VirtualList'

describe('calculateItemHeight', () => {
  it('returns minimum card height for short text', () => {
    const height = calculateItemHeight('Short', '', 400)
    expect(height).toBeGreaterThanOrEqual(80)
  })

  it('returns taller height for longer text', () => {
    const short = calculateItemHeight('Short', 'Brief.', 400)
    const long = calculateItemHeight(
      'A Very Long Title That Will Wrap To Multiple Lines',
      'This is a much longer excerpt that should produce a taller card because it contains more text and will wrap to additional lines.',
      300
    )
    expect(long).toBeGreaterThan(short)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pretext/virtual-list.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create VirtualList component**

Create `src/components/pretext/VirtualList.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { prepare, layout } from '@chenglou/pretext'

const CARD_PADDING = 40 // top + bottom padding
const META_HEIGHT = 40  // tags + date row
const GAP = 12

export function calculateItemHeight(
  title: string,
  excerpt: string,
  containerWidth: number
): number {
  const contentWidth = containerWidth - 40 // card horizontal padding
  try {
    const titlePrepared = prepare(title, '16px Maple Mono NF CN')
    const titleLayout = layout(titlePrepared, contentWidth, 22)

    const excerptPrepared = prepare(excerpt, '13px Maple Mono NF CN')
    const excerptLayout = layout(excerptPrepared, contentWidth, 20)

    return titleLayout.height + 8 + excerptLayout.height + META_HEIGHT + CARD_PADDING
  } catch {
    // Fallback if Pretext isn't available
    return 120
  }
}

interface Item {
  title: string
  excerpt: string
  slug: string
  tags: string[]
  date: string
  lang: string
}

export default function VirtualList({
  items,
  lang,
}: {
  items: Item[]
  lang: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setViewportHeight(window.innerHeight)

    return () => observer.disconnect()
  }, [])

  const heights = items.map((item) =>
    calculateItemHeight(item.title, item.excerpt, containerWidth)
  )

  const offsets: number[] = []
  let cumulative = 0
  for (const h of heights) {
    offsets.push(cumulative)
    cumulative += h + GAP
  }
  const totalHeight = cumulative - GAP

  const handleScroll = useCallback(() => {
    setScrollTop(window.scrollY - (containerRef.current?.offsetTop ?? 0))
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const startIdx = Math.max(
    0,
    offsets.findIndex((o, i) => o + heights[i] >= scrollTop) - 1
  )
  const endIdx = Math.min(
    items.length,
    offsets.findIndex((o) => o > scrollTop + viewportHeight + 200) + 1 || items.length
  )

  const visibleItems = items.slice(
    Math.max(0, startIdx),
    endIdx
  )

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: totalHeight, minHeight: 200 }}
    >
      {visibleItems.map((item, i) => {
        const actualIndex = Math.max(0, startIdx) + i
        return (
          <a
            key={item.slug}
            href={`/${lang}/blog/${item.slug}`}
            className="virtual-card"
            style={{
              position: 'absolute',
              top: offsets[actualIndex],
              left: 0,
              right: 0,
              height: heights[actualIndex],
            }}
          >
            <h3 className="virtual-card-title">{item.title}</h3>
            <p className="virtual-card-excerpt">{item.excerpt}</p>
            <div className="virtual-card-meta">
              <div className="virtual-card-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <time className="virtual-card-date">{item.date}</time>
            </div>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/pretext/virtual-list.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pretext/VirtualList.tsx tests/pretext/virtual-list.test.ts
git commit -m "feat: add Pretext-powered virtual scroll list with precise height calculation"
```

---

### Task 13: Pretext — Scroll Spark

**Files:**
- Create: `src/components/pretext/ScrollSpark.tsx`

- [ ] **Step 1: Create ScrollSpark component**

Create `src/components/pretext/ScrollSpark.tsx`:

```tsx
import { useEffect } from 'react'

const SPARK_CHARS = '@#$%&*!~^()+={}[]|<>?/'
const MAX_PARTICLES = 30

export default function ScrollSpark() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let particleCount = 0

    const spawnParticle = (direction: 'up' | 'down') => {
      if (particleCount >= MAX_PARTICLES) return
      particleCount++

      const el = document.createElement('span')
      const char = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)]
      el.textContent = char
      el.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        font-family: var(--font-en, monospace);
        font-size: ${10 + Math.random() * 8}px;
        color: var(--accent, #00ff88);
        opacity: 0.8;
        left: ${Math.random() * window.innerWidth}px;
        top: ${direction === 'up' ? window.innerHeight + 10 : -10}px;
        transition: all ${1 + Math.random()}s ease-out;
      `
      document.body.appendChild(el)

      requestAnimationFrame(() => {
        el.style.opacity = '0'
        el.style.transform = `
          translateY(${direction === 'up' ? '-' : ''}${100 + Math.random() * 200}px)
          rotate(${(Math.random() - 0.5) * 360}deg)
        `
      })

      setTimeout(() => {
        el.remove()
        particleCount--
      }, 2000)
    }

    let lastScroll = window.scrollY
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const currentScroll = window.scrollY
        const delta = currentScroll - lastScroll
        if (Math.abs(delta) > 10) {
          const count = Math.min(3, Math.floor(Math.abs(delta) / 20))
          for (let i = 0; i < count; i++) {
            spawnParticle(delta > 0 ? 'up' : 'down')
          }
        }
        lastScroll = currentScroll
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
```

- [ ] **Step 2: Add ScrollSpark to BaseLayout**

In `src/layouts/BaseLayout.astro`, add import and Island:

```astro
<!-- Add in frontmatter -->
import ScrollSpark from '../components/pretext/ScrollSpark.tsx'
```

```astro
<!-- Add before </body> -->
<ScrollSpark client:idle />
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/pretext/ScrollSpark.tsx src/layouts/BaseLayout.astro
git commit -m "feat: add ScrollSpark particle effect on scroll"
```

---

### Task 14: Pretext — Shrink-wrap Containers

**Files:**
- Create: `src/components/pretext/ShrinkWrap.tsx`
- Create: `tests/pretext/shrink-wrap.test.ts`

- [ ] **Step 1: Write shrink-wrap test**

Create `tests/pretext/shrink-wrap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { findOptimalWidth } from '../../src/components/pretext/ShrinkWrap'

describe('findOptimalWidth', () => {
  it('returns a width smaller than maxWidth for short text', () => {
    const width = findOptimalWidth('Hello', '16px Maple Mono NF CN', 500)
    expect(width).toBeLessThanOrEqual(500)
    expect(width).toBeGreaterThan(0)
  })

  it('returns maxWidth when text is wider than max', () => {
    const width = findOptimalWidth(
      'This is a very long text that will definitely exceed the maximum width container',
      '16px Maple Mono NF CN',
      100
    )
    expect(width).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pretext/shrink-wrap.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ShrinkWrap component**

Create `src/components/pretext/ShrinkWrap.tsx`:

```tsx
import { useRef, useEffect, useState, type ReactNode } from 'react'
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext'

export function findOptimalWidth(
  text: string,
  font: string,
  maxWidth: number
): number {
  try {
    const prepared = prepareWithSegments(text, font)
    let bestWidth = maxWidth

    // Find the widest line at maxWidth — that's the tightest fit
    walkLineRanges(prepared, maxWidth, (line) => {
      if (line.width < bestWidth) bestWidth = line.width
    })

    // Check if single line — use exact width
    let lineCount = 0
    let widestLine = 0
    walkLineRanges(prepared, maxWidth, (line) => {
      lineCount++
      if (line.width > widestLine) widestLine = line.width
    })

    if (lineCount === 1) return Math.ceil(widestLine) + 1

    // For multi-line, return widest line width
    return Math.min(Math.ceil(widestLine) + 1, maxWidth)
  } catch {
    return maxWidth
  }
}

export default function ShrinkWrap({
  text,
  font = '16px Maple Mono NF CN',
  maxWidth = 400,
  children,
  className = '',
}: {
  text: string
  font?: string
  maxWidth?: number
  children: ReactNode
  className?: string
}) {
  const [width, setWidth] = useState<number | undefined>()

  useEffect(() => {
    const optimal = findOptimalWidth(text, font, maxWidth)
    setWidth(optimal)
  }, [text, font, maxWidth])

  return (
    <div
      className={className}
      style={width ? { width, maxWidth } : { maxWidth }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/pretext/shrink-wrap.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pretext/ShrinkWrap.tsx tests/pretext/shrink-wrap.test.ts
git commit -m "feat: add ShrinkWrap component with Pretext walkLineRanges"
```

---

### Task 15: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deployment workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Update astro.config.mjs for GitHub Pages**

Add `output` and `base` config if deploying to a project page (not `username.github.io`):

```js
export default defineConfig({
  site: 'https://your-username.github.io',
  // base: '/repo-name/',  // uncomment if deploying to project page
  integrations: [react()],
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
})
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. `dist/` contains all pages.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml astro.config.mjs
git commit -m "feat: add GitHub Actions deployment workflow"
```

---

### Task 16: Full Integration Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (i18n, scramble, virtual-list, shrink-wrap).

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: Clean build, no warnings.

- [ ] **Step 3: Visual verification with dev server**

```bash
npm run dev
```

Verify each page at `http://localhost:4321`:
- `/` → redirects to `/zh/`
- `/zh/` → home with ASCII hero, latest posts, featured projects
- `/en/` → English home
- `/zh/blog/` → blog list
- `/zh/blog/pretext-text-layout` → article with TOC, reading progress
- `/zh/projects/` → project cards
- `/zh/about` → about page
- Theme toggle works on all pages
- Language switch works on all pages
- Scroll spark particles appear when scrolling

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration verification"
```
