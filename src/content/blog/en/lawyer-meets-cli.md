---
title: "Lawyer Meets CLI: A Day of Legal Document Processing with Claude Code"
date: 2026-05-25
tags: ["Claude Code", "Legal Tech", "MCP", "Lawyer Tools"]
lang: "en"
translationSlug: "lawyer-meets-cli"
excerpt: "Installed 12 legal plugins and two legal database MCPs. Moved contract review, trademark clearance, and employment dispute analysis into the terminal. Not replacing lawyers — replacing the window-switching between three databases."
canvasRender: false
---

## The Shape of the Problem

Half my practice goes like this: open a PDF, read contract clauses, switch to the browser to look up statutes, switch to PKULaw for case law, switch back to draft the review memo. Bouncing between three or four windows, one contract per hour if I'm fast.

The pain isn't "I don't know how to review." It's "the tools are too fragmented."

## A Serendipitous Find

I came across [claude-for-legal-ZH](https://github.com/CSlawyer1985/claude-for-legal-ZH) on GitHub — a Chinese-law localization of Anthropic's official claude-for-legal, built by Chen Shi, a lawyer at Haitian Law Firm in Zhejiang. Twelve domain plugins, from commercial contracts to intellectual property to employment law, each with specialized review skills.

My first thought wasn't "this replaces lawyers." It was: if the review framework runs through an agent and I just make the judgment calls, can I close two of those three windows?

## Three, Not Twelve

I only installed the three most relevant plugins:

| Plugin | Use Case | Config Depth |
|---|---|---|
| commercial-legal | Contract review (sales, SaaS, NDAs) | Quick mode |
| ip-legal | Trademarks, patents, copyright, trade secrets | **Full config** |
| employment-legal | Employment (hiring, termination, policies) | Quick mode |

Each plugin requires a cold-start interview after installation — answering questions about your jurisdiction, client types, review stance, deal-breakers. The plugin writes this into a practice profile (CLAUDE.md) that it reads before every review.

This is smart design. Not generic "we'll review your contract," but "we'll review **your way**."

## Two Legal Databases, Two Fates

The plugin system integrates two legal databases via MCP: Yuandian and PKULaw.

### Yuandian: Native MCP, 37 Tools Out of the Box

Yuandian uses the stdio transport protocol, launched via npx, natively supported by Claude Code. Works immediately after setup — 37 tools covering law and regulation search, semantic case retrieval, corporate registry queries, litigation document lists.

In practice:

```
Me: Look up relevant statutes on non-compete compensation standards

Claude: [calls yuandian_law_vector_search]
Returns Supreme Court judicial interpretations,
Labor Contract Law provisions, HR Ministry compliance guidelines...
```

No need to visit a website, select a database, or craft keyword combinations. One sentence, semantic search, results.

### PKULaw: The streamableHttp Trap

PKULaw was also configured in `.mcp.json`, but it uses the `streamableHttp` protocol — which Claude Code's plugin system **doesn't load**. The server is alive (curl works perfectly), but the tools never appear in the tool list.

Workaround: two shell scripts wrapping curl calls.

```bash
# Exact article lookup
pkulaw-get "中华人民共和国民法典" "第一百四十三条"

# Semantic search
pkulaw-search "竞业限制补偿标准"
```

Placed in `~/.claude/bin/`, invoked by Claude via the Bash tool. Not elegant, but functional.

**Strategy:** Yuandian by default (unlimited calls), PKULaw only for cross-referencing specific statutes (limited quota).

## A Day's Workflow

### Morning: SaaS Subscription Agreement Review

Drop the PDF into the terminal, say "review this SaaS agreement."

The plugin auto-identifies the agreement type, routes to `/commercial-legal:saas-msa-review`, and checks each clause against my review guidelines — auto-renewal, price adjustment, data portability, SLA, sub-processor rights. Each risk point gets a red/yellow/green label with statutory basis and suggested revision language.

Meanwhile, Yuandian MCP pulls relevant statutes in the background, with citation markers: `[元典检索]` or `[北大法宝]`.

Output is a review memo: `SaaS订阅协议 审查备忘录 — 2026-05-25`.

### Afternoon: Trademark Clearance + Employment Dispute

A client asks if a trademark is registrable. `/ip-legal:clearance` runs an exclusion screening, Yuandian searches for similar-mark cases, outputs an annotated list (not a legal opinion, a screening result).

Another client gets sued by a former employee. `/employment-legal:termination-review` checks the termination against local rules (Guangzhou jurisdiction), auto-flags high-risk factors — pregnant employees, work-injury employees, 10+ years tenure. Yuandian pulls local court guidelines, PKULaw verifies the exact statutory text.

## Not Replacement — Context Compression

What these tools do, fundamentally, is context management:

- **Contract clauses** → Plugin scans per review guidelines
- **Statutory basis** → Yuandian/PKULaw direct lookup, no browser needed
- **Case references** → Semantic search replaces keyword combinations
- **Review opinions** → Framework generated by agent, lawyer makes judgment calls

I still read the clauses, still assess risk levels, still make the final call. But three or four windows become one terminal.

## Advice for Colleagues

If you're a lawyer curious about these tools:

1. **Don't skip the cold-start interview.** The more specific your review guidelines, the better the output.
2. **Yuandian MCP is the core.** Make sure the API key is configured before installing plugins (`/plugin install` overwrites manual config).
3. **PKULaw's streamableHttp doesn't work natively yet.** Wait for Claude Code updates or use the script workaround.
4. **All outputs are review drafts, not legal opinions.** Final responsibility stays with the lawyer.
5. Start with one practice area. Don't install all twelve at once.

Tools don't replace professional judgment. But they let you spend the time you'd use switching windows on actually thinking about the case.
