# SelfEmployed.app

**Live: https://selfemployed-app.pages.dev**

An interactive prototype of an AI-assisted operating platform for people becoming a microcompany of one — by choice or by displacement.

> Self-employment is becoming the new fallback plan. Make it an actual plan.

## What this is

A single-file, no-build prototype of the full product surface:

- **Landing** — emotionally honest hero, labor-market context, the six-stage arc from Decide to Operate
- **Transition Diagnostic** — paste a resume (or pick a demo persona) → displacement risk, three viable solo paths, your recommended productized offer, a 90-day plan, your first 25 prospects, today's first five actions
- **Command Center preview** — Today / Pipeline / AI helpers / Money tabs, with realistic state across four personas

Four demo personas demonstrate the horizontal range without compromising on output quality:

| Persona | From → To |
| --- | --- |
| **Sarah Chen** | Customer support manager → AI-enabled CX automation consultant |
| **Marcus Rivera** | Recruiter → Fractional hiring partner |
| **Priya Shah** | Lifecycle marketer → Productized 30-day lifecycle sprints |
| **Alex Park** | Junior developer → Two-week AI build consultant (side income) |

## Product decisions baked in

- **Horizontal audience** — serves any displaced knowledge worker, not a single vertical
- **Pre-revenue free → post-revenue paid** funnel — the Diagnostic is free distribution; the Command Center is paid ($29/mo) starting only after first paying client
- **AI-assisted, not autonomous** — every helper drafts, the user approves. No autonomous outreach, contracts, or money movement
- **Emotionally adult voice** — meets the user where they actually are, not "be your own boss!"
- **Pipeline first** — most new self-employed people die from no customers, not from sloppy bookkeeping. The Pipeline Helper is the first and most-developed AI helper.

## Stack

- One static `index.html` (~100KB), no build step
- React 18 via esm.sh import map
- Tailwind via CDN with custom theme tokens
- Source Serif 4 + Inter + JetBrains Mono via Google Fonts
- Lucide icons via esm.sh

## Running it locally

```bash
python3 -m http.server 8742
# open http://localhost:8742
```

## Deployment

Deployed to Cloudflare Pages as a static site:

```bash
wrangler pages deploy dist --project-name=selfemployed-app
```

## Status

This is a working interactive prototype, not yet a real product. The Diagnostic outputs are hand-authored per demo persona; in v1 they would be generated live from the Claude API against any resume input.

Next, in rough order: wire the Diagnostic to Claude for arbitrary input, add auth + persistence, ship the Pipeline Helper with a real prospect-research backend, integrate Stripe for the post-first-client paywall.
