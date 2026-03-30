---
title: "Lessons from Building a Personal Site"
date: 2026-03-30
tags: ["Experience", "GitHub Pages", "Astro"]
lang: "en"
translationSlug: "building-personal-site"
excerpt: "From choosing a tech stack to deploying online — real experiences and gotchas from building a personal website."
canvasRender: true
---

## Why Have Your Own Site?

Social media platforms come and go, but a personal site is truly your own territory. No platform rules, no algorithm burial, no risk of disappearing when a service shuts down.

For developers, a personal site doubles as the best portfolio — it is itself proof of your skills.

## The Tech Stack Decision

I went back and forth between several options:

- **Next.js** — Most fully-featured, but overkill for a blog
- **Plain HTML/CSS** — Lightest weight, but high maintenance cost
- **Astro** — Purpose-built for content sites, static-first, JS on demand

I went with Astro because its Islands architecture perfectly solves "mostly static pages with pockets of interactivity."

## Bilingual Support Is Harder Than It Sounds

I wanted both Chinese and English support. Sounds simple, but the details add up:

- Clean URL structure: `/zh/blog/xxx` and `/en/blog/xxx`
- Each post needs a `translationSlug` field to link language versions
- UI text needs translation files, no hardcoding
- Root path needs browser language detection and auto-redirect

The final approach — file-based routing plus JSON translation files — keeps things simple and direct.

## The Theme-Switching Gotcha

Dual themes (light/dark) seem like just swapping colors, but there's a classic problem: the flash on page load.

If the theme JS runs after the page renders, users see the default theme before it jumps to their saved preference. The fix is an inline script in `<head>` that sets `data-theme` before any DOM renders.

## Deploying to GitHub Pages

This was the easiest part. One GitHub Actions workflow, push to main, auto-build and deploy in 30 seconds. Free, no server maintenance.

The only gotcha: set the GitHub Pages source to "GitHub Actions" instead of "Deploy from a branch."

## The Pretext Experiment

The most fun part was using Pretext for text interaction effects. It lets me precisely control text positioning on Canvas, achieving layouts CSS simply cannot — like text wrapping around a pixel mascot.

Some gotchas though: Pretext needs a browser environment and doesn't work during SSR. You need try/catch wrappers with fallbacks.

## Takeaway

Building a personal site doesn't need to be perfect. Ship first, iterate later. A simple page with personality beats a "perfect plan" that never launches.
