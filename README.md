# Supersonic Showdown League Website

**Status: Draft v0.1 — not published. Copy is not approved.**

This repository contains the draft public-facing Supersonic Showdown League website.

## Site structure

The site is a single self-contained `index.html`. It requires no build step and has no dependencies.

## Domain

`showdown2v2.live` is registered but deliberately not attached to this site. There is intentionally no `CNAME` file. Do not add one until the public copy is approved.

## Placeholders

| Marker | Needs | Source |
| --- | --- | --- |
| `data-ph="discord"` | Discord invite URL — 4 places: nav, hero, final CTA, footer | Victor or Tony |
| `data-ph="season"` / `"week"` / `"nights"` | Season number, current week, match nights | Bot |
| `data-ph="standings"` | Real standings rows | Blocked on pending DB migration |
| `data-ph="copy"` | Four unanswered FAQ answers | Official League Rulebook in Notion |

Note: old “Season 4 Week 6” is **not confirmed** and must not be used.

## Capability verification

Two lines in the markup tagged `VERIFY SHIPPED` — “Player cards” and “Roster rules that are enforced” — must be verified against the bot as it is actually running today, not as it will run after the pending migration. If either capability is not live, delete that line from the markup rather than soften or reword it.

## Publishing sequence

1. GitHub Pages from `main` / root.
2. Verify the `github.io` site renders.
3. Finish copy.
4. Tony approves.
5. Only then add the custom domain, `CNAME`, and DNS.
