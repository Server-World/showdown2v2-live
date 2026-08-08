# Prompt for GPT / external coding assistant

You are working on the Supersonic Showdown League public website.

## Repository and domain

- GitHub repository: `Server-World/showdown2v2-live`
- Public domain: `https://showdown2v2.live`
- Pages deploys from `main` at repository root.
- Canonical Discord invite: `https://discord.gg/efdQJsceKb`

## Read first

Before changing anything, read these files in order:

1. `assets/ASSET_MAP.md`
2. `README.md`
3. `site-v2.css`
4. `site-v2.js`
5. `data/league.json`

## Current structure

The current site is a static multi-page GitHub Pages site:

- `/` home dashboard
- `/matches/`
- `/standings/`
- `/teams/`
- `/players/`
- `/stats/`
- `/history/`
- `/league/`
- `/news/`

Shared files:

- `site-v2.css` for styling
- `site-v2.js` for rendering/data wiring
- `data/league.json` for public read-only league data
- `assets/branding/ssl-logo.svg` for the current temporary public logo

## Brand/logo instruction

Tony says the final logo should be done, but it is not live/available yet. Do not wait on it and do not invent a new one. Use:

`assets/branding/ssl-logo.svg`

as the current temporary public Supersonic Showdown logo until Tony supplies and approves the replacement.

## Safety and data rules

- The website is read-only.
- SSL Bot/PostgreSQL remain the competitive authority.
- Do not connect directly to PostgreSQL.
- Do not add a backend, auth system, database, package manager, framework, analytics service, CDN dependency, or build step without explicit approval.
- Do not fabricate current season/week, standings rows, rosters, player stats, power rankings, champions, or match results.
- If verified data is unavailable, hide the section or show a polished public empty state.
- Do not expose credentials, tokens, private IDs, moderation notes, runtime details, staff-only controls, deployment evidence, or internal host paths.
- Public copy should describe only capabilities that actually work today.

## Current verified facts

You may use these facts:

- Format: 2v2
- Amateur through Legend match time: Saturday at 8:00 PM EST
- Mythic scheduling: Monday-Sunday with weekly deadline Sunday at 11:59 PM EST
- Official streamed games: Saturday at 9:30 PM EST
- Default region: US-East unless both teams agree otherwise
- Score/replay reporting deadline: 24 hours
- Discord invite: https://discord.gg/efdQJsceKb

## Design direction

Match the V5 Supersonic Showdown/SSL Bot visual direction:

- Deep navy/charcoal canvas
- Angular panels and subtle borders
- System cyan and competition orange accents
- Green = win/eligible/verified
- Yellow = pending/review
- Red = loss/restricted/error
- WCAG AA contrast
- Mobile-first readability
- No glossy 3D effects

Use these core colors:

- `#07101D` Arena Navy
- `#0D1A2B` Raised Navy
- `#49C7FF` System Cyan
- `#FF9F43` Competition Orange
- `#55D68B` Verified Green
- `#FFD166` Warning Yellow
- `#FF5C7A` Restricted Red

Tier colors:

- Mythic `#FF69B4`
- Legend `#BD7CFF`
- Elite `#49C7FF`
- Contender `#FF9F43`
- Rookie `#55D68B`
- Amateur `#FF8A80`

## Task to carry out

Improve the current website without changing its architecture:

1. Audit the current pages for broken links, missing logo references, stale placeholder language, and inconsistent domain/Discord references.
2. Ensure all pages use the current shared branding and reference `assets/branding/ssl-logo.svg` where a logo is needed.
3. Keep `showdown2v2.live` as the canonical domain in `CNAME`, `README.md`, `sitemap.xml`, `robots.txt`, and visible footer/meta copy.
4. Improve production polish while keeping unavailable competitive data honest and not fabricated.
5. Use `data/league.json` as the only public data contract and do not hard-code league standings or player statistics into HTML.
6. Preserve static GitHub Pages compatibility.
7. Return a concise summary of changed files, any remaining blockers, and anything Victor/Tony must approve.

Do not make deployment-causing changes outside this website repository. Do not touch `Server-World/Bot-2v2-Empire` unless explicitly instructed.
