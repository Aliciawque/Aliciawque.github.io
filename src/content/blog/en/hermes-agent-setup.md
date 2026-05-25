---
title: "Setting Up Hermes Agent Locally: From Zero to 24 Rotating Skins"
date: 2026-05-25
tags: ["AI Agent", "Terminal", "MiniMax", "Hermes"]
lang: "en"
translationSlug: "hermes-agent-setup"
excerpt: "Installing Nous Research's open-source AI Agent locally, wiring up Chinese Coding Plan APIs, hitting Python 3.14's .pth trap, and building a 24-skin random rotation system. Full troubleshooting log."
canvasRender: false
---

## Why Hermes Agent

Hermes Agent is an open-source AI Agent by Nous Research — built-in tool calling, 60+ tools, 22 messaging platform integrations, and a skill system. Think of it as a Claude Code alternative that runs in your terminal and supports any model provider.

My use case was simple: a capable AI assistant in the terminal, not locked to a single API provider, that works with Chinese Coding Plan subscriptions.

## Installation: Looks Simple Enough

Forked the repo from GitHub, cloned locally, created a venv, `pip install -e .`.

Then `hermes --version` — error:

```
ModuleNotFoundError: No module named 'hermes_cli'
```

Worked fine inside the project directory. Broke everywhere else.

### The Python 3.14 .pth Trap

Investigation revealed: Python 3.14 treats `.pth` files starting with `__` as hidden and skips them entirely. UV's editable install generates files named `__editable__.hermes_agent-0.14.0.pth`.

Verbose mode made it crystal clear:

```
Skipping hidden .pth file: '.../__editable__.hermes_agent-0.14.0.pth'
```

ALL `.pth` files were being skipped, including venv's own `_virtualenv.pth`.

**Fix**: Skip editable install, use regular install instead.

```bash
uv pip install --python .venv/bin/python "."   # no -e flag
```

The tradeoff: you need to reinstall after updates. But that's far better than being unable to run from outside the project directory.

## Configuring MiniMax Coding Plan

MiniMax's Coding Plan (also called Token Plan) keys start with `sk-cp-` and come with monthly quotas. Hermes has a built-in `minimax-cn` provider — just configure `.env`.

But `.env` needs to be in TWO places:

- `~/.hermes/.env` — read by the TUI version (`hermes chat`)
- Project directory `.env` — read by the non-TUI version (`hermes-agent`)

Configure only one, and you get `No inference provider configured`.

The MiniMax CN provider uses the Anthropic Messages compatible endpoint by default (`https://api.minimaxi.com/anthropic`). The `sk-cp-` coding plan key works fine with this endpoint.

Verify your balance with curl:

```bash
curl https://api.minimaxi.com/v1/token_plan/remains \
  -H "Authorization: Bearer sk-cp-xxx"
```

## Adding Zhipu GLM

Zhipu's Coding Plan key format is `{id}.{secret}`. In Hermes it's the `zai` provider. Set `GLM_API_KEY` and `GLM_BASE_URL`, made it the default model. Hermes even has auto-detection — it probes global, cn, coding-global, coding-cn endpoints and finds the one that works.

Now I have two providers configured:
- Default: Zhipu GLM-5.1 (Coding Plan)
- Backup: MiniMax M2.7 (Token Plan)

## 24 Skins with Random Rotation

Hermes has a skin system that changes visuals — colors, banner, spinner, response box labels. Not behavior. 9 built-in skins, plus 15 community skins.

Downloaded all `.yaml` files from [hermes-skins](https://github.com/joeynyc/hermes-skins) into `~/.hermes/skins/`, then wrote a wrapper script that:

1. Collects all available skins (built-in + user-installed)
2. Reads rotation state from `~/.hermes/.skin_rotation`
3. Picks the next skin from the remaining pool (no repeats)
4. Reshuffles when the pool is exhausted
5. Writes to `config.yaml`'s `display.skin`, then launches hermes

Lessons learned: the first wrapper version used `python3 + pyyaml` to write config. Later switched to pure `sed` — fewer dependencies is better. Also replaced all `~` with `$HOME` for reliable path expansion.

Added one line to `~/.zshrc`:

```bash
alias hermes='~/Documents/hermes-agent/hermes-wrapper.sh'
```

Open a new Ghostty window, type `hermes`, get a different skin every time.

## The Result

Open terminal, type `hermes`, and a randomly-skinned AI assistant appears. It can chat, execute commands, search the web, manage files. Two Chinese Coding Plan providers take turns — basically free.

### Config Quick Reference

```yaml
# ~/.hermes/config.yaml
model:
  default: zai/glm-5.1
terminal:
  backend: local
display:
  skin: <auto-rotated by wrapper>
```

```bash
# ~/.hermes/.env
MINIMAX_CN_API_KEY=sk-cp-xxx
GLM_API_KEY=xxx.yyy
GLM_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
```

## Troubleshooting Cheat Sheet

| Problem | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError` outside project dir | Python 3.14 skips `__`-prefixed .pth | Non-editable install |
| `.env` not found by TUI | TUI and non-TUI read different paths | Configure both |
| MiniMax CN 404 | Wrong URL path | `minimax-cn` uses Anthropic transport |
| Skins not rotating | `~` expansion failed / pyyaml dependency | `$HOME` + sed |
| `hermes-agent` missing `--provider` | Non-TUI CLI has limited flags | Use `hermes chat` |
