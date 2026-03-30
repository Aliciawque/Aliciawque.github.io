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
   canvasRender: false  # true to show Canvas text-wrapping demo
   ---
   ```
3. `translationSlug` must match between zh and en versions
4. `npm run build` to verify
5. `git add src/content/blog/ && git commit && git push origin main`

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
   url: "https://github.com/..."
   order: 0  # lower = first
   ---
   ```
3. Homepage shows top 3 projects by `order`

## Theme

- Light: Anthropic warm cream (#faf6f1), font Maple Mono NF CN
- Dark: terminal black (#0a0a0a) + neon green (#00ff88), English font Share Tech Mono
- All corners use border-radius: 12px (cards), 8px (tags), 6px (small)

## Key Files

- `src/styles/global.css` — theme variables, fonts, base styles
- `src/layouts/BaseLayout.astro` — HTML shell, nav, footer, ScrollSpark
- `src/layouts/ArticleLayout.astro` — article page with TOC, reading progress, Canvas demo
- `src/components/pretext/` — 6 Pretext React Islands (AsciiHero, TextScramble, CanvasArticle, VirtualList, ScrollSpark, ShrinkWrap)
- `src/components/ActivityGraph.astro` — GitHub-style post activity heatmap
- `src/i18n/` — translation strings and utils
- `public/img/claude-pixel.svg` — pixel mascot used in Canvas text wrapping
- `astro.config.mjs` — site URL, React integration

## Commands

```bash
npm run dev      # local dev server
npm run build    # build to dist/
npm run test     # vitest (14 tests)
```
