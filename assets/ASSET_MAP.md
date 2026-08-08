# Supersonic Showdown website asset map

Use this file as the AI/GPT handoff map for where website assets live and what is authoritative.

## Public domain

- Production domain: https://showdown2v2.live
- Canonical Discord invite: https://discord.gg/efdQJsceKb

## Repository

- GitHub repo: Server-World/showdown2v2-live
- GitHub Pages publishes from the `main` branch at repository root.
- No build step, framework, package manager, external font, CDN, analytics package, or database connection is required.

## Current live website files

- `index.html` — home dashboard
- `matches/index.html` — Match Center
- `standings/index.html` — Standings Hub
- `teams/index.html` — Teams and franchises
- `players/index.html` — Player directory/player-card surface
- `stats/index.html` — league leaders and SSL Power Index
- `history/index.html` — Hall of Champions/history
- `league/index.html` — format, schedule, rules, FAQ
- `news/index.html` — news/highlights
- `404.html` — branded not-found page
- `sitemap.xml` and `robots.txt` — public crawl files
- `CNAME` — custom domain file for `showdown2v2.live`

## Shared renderer and styling

- `site-v2.css` — current shared competition design system
- `site-v2.js` — current shared public renderer and data wiring
- `data/league.json` — public read-only league snapshot contract

Legacy files may exist while migration is verified:

- `styles.css`
- `app.js`

Do not use legacy files for new work unless the current pages still reference them.

## Brand assets in this repository

- `assets/branding/ssl-logo.svg` — current temporary public Supersonic Showdown logo supplied by Victor on 2026-08-08.
- `assets/branding/README.txt` — logo status and replacement rule.

Important: Tony says the final logo should be done, but it is not live/available yet. Keep using `assets/branding/ssl-logo.svg` as the current temporary public identity until Tony explicitly supplies and approves a replacement.

## Brand assets documented outside this website repo

The larger Notion/project brand archive documents these expected runtime/package paths, but not all are present in this website repo yet:

- `_StatBot_Empire/utilities/SSL Brand/ssl-server-logo.png` — stale/non-runtime path in earlier docs; a TrueNAS runtime search did not find it. Do not assume it exists in the repo.
- `_StatBot_Empire/utilities/Franchise Logos/` — intended franchise-logo package path for bot/runtime work.
- `utilities/Franchise Logos/manifest.json` — desired mapping file if franchise logos are added to this website repo later.

For the website, use paths actually present in this repo first.

## Data source boundaries

Authority chain:

`SSL Bot / PostgreSQL` -> scheduled read-only export -> `data/league.json` -> website UI

Rules:

- The website must not connect directly to PostgreSQL.
- The website must not calculate standings, eligibility, records, rankings, or competitive truth.
- The website must not expose credentials, private IDs, moderation notes, runtime details, staff-only controls, deployment evidence, or secret/store paths.
- If data is not in `data/league.json` or an approved public source, show a clean public empty state or hide the section.
- Do not fabricate current season/week, standings rows, player stats, active rosters, power rankings, champions, or history.

## Verified public facts currently safe to publish

From the current website docs and public data contract:

- League format: 2v2
- Core divisions: Amateur, Rookie, Contender, Elite, Legend
- Core match day/time: Saturday at 8:00 PM EST
- Mythic scheduling: open scheduling Monday-Sunday; weekly deadline Sunday at 11:59 PM EST
- Official streamed games: Saturday at 9:30 PM EST
- Default region: US-East unless both teams agree otherwise
- Score/replay reporting deadline: 24 hours
- Canonical Discord invite: https://discord.gg/efdQJsceKb

## Design tokens

Current website should follow the V5 card direction:

- Arena Navy: `#07101D`
- Raised Navy: `#0D1A2B`
- System Cyan: `#49C7FF`
- Competition Orange: `#FF9F43`
- Verified Green: `#55D68B`
- Warning Yellow: `#FFD166`
- Restricted Red: `#FF5C7A`

Tier colors:

- Mythic: `#FF69B4`
- Legend: `#BD7CFF`
- Elite: `#49C7FF`
- Contender: `#FF9F43`
- Rookie: `#55D68B`
- Amateur: `#FF8A80`

## GPT/external assistant work rules

When another GPT or coding assistant works on this repo:

1. Read this file first.
2. Read `README.md` second.
3. Inspect `site-v2.css`, `site-v2.js`, and `data/league.json` before editing pages.
4. Keep the site static and GitHub Pages-compatible.
5. Do not add a backend, auth, database, package manager, external services, analytics, or build pipeline unless Victor/Tony explicitly approve it.
6. Use `assets/branding/ssl-logo.svg` until Tony supplies the final approved logo.
7. Keep all pages production-clean: no developer placeholder language like "pending export" or "awaiting data" visible to visitors.
8. Keep unavailable competitive data hidden or represented by clean public empty states.
9. Preserve the domain `showdown2v2.live` and CNAME unless Victor/Tony explicitly change it.
