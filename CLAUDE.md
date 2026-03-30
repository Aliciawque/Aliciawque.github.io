# Alicia.dev Personal Blog

## Quick Info

- **Live**: https://aliciawque.github.io
- **Repo**: github.com/Aliciawque/Aliciawque.github.io
- **Stack**: Astro 5 + React Islands + @chenglou/pretext
- **Branch**: main (push triggers auto-deploy via GitHub Actions, ~30s)

## Publish a Blog Post

1. Create `src/content/blog/zh/<slug>.md` and `src/content/blog/en/<slug>.md`
2. Frontmatter:
   ```yaml
   ---
   title: "标题"
   date: 2026-03-30
   tags: ["Tag1", "Tag2"]
   lang: "zh"  # or "en"
   translationSlug: "same-slug-for-both"
   excerpt: "一句话摘要"
   canvasRender: false  # true to show Canvas text-wrapping demo in article
   ---
   ```
3. `translationSlug` must match between zh and en versions
4. `npm run build` to verify
5. `git add src/content/blog/ && git commit && git push origin main`
6. Activity graph on homepage updates automatically based on post dates

## Add a Project

1. Create `src/content/projects/zh/<name>.md` and `src/content/projects/en/<name>.md`
2. Frontmatter:
   ```yaml
   ---
   title: "Project Name"
   lang: "zh"  # or "en"
   translationSlug: "same-slug"
   description: "一句话描述"
   tech: ["Tech1", "Tech2"]
   url: "https://github.com/..."  # GitHub repo URL, not live site
   order: 0  # lower = first
   ---
   ```
3. Homepage shows top 3 projects by `order`
4. Project cards on homepage link to `url` field (should be GitHub repo)

## Theme

- Light: Anthropic warm cream (#faf6f1), font Maple Mono NF CN
- Dark: terminal black (#0a0a0a) + neon green (#00ff88), English font Share Tech Mono
- Dark mode: all h1-h4 use --accent (neon green), set in global.css
- All corners use border-radius: 12px (cards), 8px (tags), 6px (small)

## Mobile

- Hero font size responsive: <400px: 32px, <500px: 40px, <700px: 52px, >=700px: 72px
- Hero touch interaction disabled on mobile (visual-only animation)
- Article layout switches to single column (display: block) on <900px
- Canvas text wrapping scales down mascot image on narrow screens
- body/main have overflow-x: hidden

## Key Files

- `src/styles/global.css` — theme variables, fonts, base styles, dark mode heading colors
- `src/layouts/BaseLayout.astro` — HTML shell, nav, footer, ScrollSpark
- `src/layouts/ArticleLayout.astro` — article page with TOC (h2 only), reading progress, Canvas demo with Claude pixel mascot
- `src/components/pretext/AsciiHero.tsx` — Canvas particle hero, responsive font, mouse-only interaction
- `src/components/pretext/CanvasArticle.tsx` — text wrapping around mascot image
- `src/components/pretext/ScrollSpark.tsx` — ASCII particles on scroll (150 max, threshold 2)
- `src/components/pretext/TextScramble.tsx` — scramble effect (integrated via Nav inline script)
- `src/components/ActivityGraph.astro` — GitHub-style heatmap, current year, tracks post dates
- `src/components/Nav.astro` — includes inline text scramble script for hover
- `src/i18n/` — translation strings and utils
- `public/img/claude-pixel.svg` — Claude pixel mascot (#D97757 orange)
- `astro.config.mjs` — site URL, React integration (no i18n config, handled manually)
- `src/pages/index.astro` — JS redirect to /en/ (detects zh browser)

## Important Notes

- No Astro i18n config (removed to avoid redirect page flash)
- Root `/` redirects via JS + meta refresh, defaults to /en/
- Project pages use regular scoped styles (not ShrinkWrap component)
- Blog list uses static cards (not VirtualList component — Pretext needs browser canvas)
- TOC only shows h2 headings (not h3) to keep sidebar clean

## Commands

```bash
npm run dev      # local dev server
npm run build    # build to dist/
npm run test     # vitest (14 tests)
```
