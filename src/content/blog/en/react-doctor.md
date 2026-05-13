---
title: "React Doctor: Who Catches the Code Your AI Writes?"
date: 2026-05-13
tags: ["React", "AI", "Code Quality", "Tools"]
lang: "en"
translationSlug: "react-doctor"
excerpt: "Million.js team built a React code health diagnostic tool. One command, 0-100 score, 9K stars in 3 months. I looked at its architecture, rule system, and agent integration — then wrapped it into a Claude Code skill."
canvasRender: false
---

## The Problem Is Real

It's 2026. Most React code is written by AI. Cursor, Claude Code, Codex generate millions of lines of JSX daily. They ship features fine, but they don't know what "good React" looks like — three setStates inside a useEffect, array index as key, dangerouslySetInnerHTML everywhere.

ESLint catches some of it, but setup is painful, rules are scattered across half a dozen plugins, and it's slow. More importantly: ESLint doesn't give you a holistic assessment. It reports errors one by one. Without seeing the full picture, you can't tell if a project is "fine" or "needs a rewrite."

## What React Doctor Does

[React Doctor](https://github.com/millionco/react-doctor) comes from the [Million.js](https://million.dev) team (Aiden Bai). One line: **one command scans your React project and outputs a 0-100 health score with actionable diagnostics.**

```bash
npx react-doctor@latest .
```

Score bands:
- **75-100 (Great)** — ship with confidence
- **50-74 (Needs work)** — fix before shipping
- **<50 (Critical)** — don't merge

It checks six dimensions: state & effects, performance, architecture, security, accessibility, and dead code. Rules toggle automatically based on your framework (Next.js, Vite, React Native) and React version.

## Why It's Fast

The engine is **oxlint** — a Rust-based linter, 50-100x faster than ESLint. Scans a project the size of tldraw in seconds. Dead code detection uses **Knip**, which specializes in finding unused exports, deps, and types.

This isn't another ESLint plugin. It's a zero-config wrapper that integrates lint + dead code + framework-aware rules into a single experience.

## The Clever Part: Agent Integration

```bash
npx react-doctor@latest install
```

This detects your local coding agents — Claude Code, Cursor, Codex, OpenCode, and 50+ others — then installs React best practice rules into them. Not for you to read. It teaches the AI to avoid anti-patterns before writing them.

Smart design. Rather than catching problems after the fact, prevent the agent from writing bad code in the first place. The Million team clearly saw the AI coding trend and targeted the pain point precisely.

## Architecture at a Glance

| Layer | Tech | Notes |
|---|---|---|
| Scan engine | oxlint (Rust) | 60+ rules, extremely fast |
| Dead code | Knip | Unused exports/deps/types |
| CLI | Commander.js | --json / --diff / --staged / --explain |
| Config | react-doctor.config.json | Ignore rules/files/directories |
| Integration | oxlint plugin + ESLint flat config | Both supported |
| CI | GitHub Action | Auto-comments score on PRs |

`--json` for structured output, `--diff main` for changed files only, `--staged` for pre-commit hooks, `--explain file:line` to understand why a rule fired. Clean API design.

Node.js API is also available: `import { diagnose } from "react-doctor/api"` for programmatic access to scores and diagnostics.

## Leaderboard

They ran it on some well-known projects:

| Project | Score |
|---|---|
| executor | 96 |
| nodejs.org | 87 |
| tldraw | 76 |
| excalidraw | 69 |
| rocket.chat | 67 |

nodejs.org at 87 — pretty solid for a Next.js project. excalidraw at 69 shows even star projects have room to improve against modern React best practices.

## What It Isn't

Let's be clear about limitations:

**Not an ESLint replacement.** 60+ rules is broad but not as deep as the accumulated ESLint ecosystem. It's more like a "quick health checkup" than a "full specialist diagnosis."

**Version 0.x.** API may change. Not ideal for stability-critical CI pipelines.

**Single core developer.** Aiden Bai has 88% of commits. Low bus factor. If he stops maintaining, the project is at risk.

**Static analysis only.** Can't catch runtime issues (unnecessary re-renders, memory leaks). For that, you still need React Profiler or React Scan.

**Scoring is a black box.** How 0-100 is calculated isn't fully public. Scores are comparable across projects with the same rule set, but cross-framework comparison isn't fair.

## What I Built

After researching, I created a Claude Code skill:

```bash
~/.claude/skills/react-doctor/SKILL.md
```

The effect: when I do code reviews in React/Next.js projects, Claude Code automatically runs react-doctor and merges results into the review — not two separate reports, but a unified diagnosis. Using `--diff` mode to scan only changed files is especially useful for PR reviews.

## Is It Worth Using?

If you're using AI coding agents for React, **worth a try**. Zero config, one command, results in 30 seconds. Even without CI integration, running it occasionally to check project health is valuable.

If you already have a solid ESLint + CI setup, the incremental value depends on rule quality — run `npx react-doctor@latest . --json` once and see if it catches things your existing tools miss.

---

Three months, 9K stars, 400K monthly downloads, and a core contributor with Million.js pedigree. This project is worth watching.
