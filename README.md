# Supersonic Showdown League Website

**Status: multi-page competition platform live on GitHub Pages; verified league-data integration is in progress.**

Public site: `showdown2v2.live`

## Architecture

The website is a static GitHub Pages deployment. It does not connect directly to PostgreSQL and it does not decide competitive facts.

Authority chain:

`SSL Bot / PostgreSQL` → scheduled read-only export → `data/league.json` → website UI

The bot/database remain the single source of truth. The site publishes verified output only.

## Public routes

- `/` — competition dashboard / home
- `/matches/` — Match Center
- `/standings/` — six-division Standings Hub
- `/teams/` — team/franchise directory
- `/players/` — player directory and player-card surface
- `/stats/` — league leaders and SSL Power Index
- `/history/` — Hall of Champions, records and season archive
- `/league/` — league format, scheduling, rules and FAQ
- `/news/` — league desk and highlights

## Shared files

- `site-v2.css` — shared responsive competition design system
- `site-v2.js` — shared read-only data renderer and global public-state handling
- `data/league.json` — public league snapshot contract
- `assets/branding/` — website branding assets
- `.nojekyll` — disables Jekyll processing
- `CNAME` — custom domain `showdown2v2.live`

Legacy `styles.css` and `app.js` may remain temporarily while the V2 migration is verified; current public pages use `site-v2.css` and `site-v2.js`.

No framework, package manager, build step, external font, CDN, analytics package, or direct database connection is required.

## Public Discord

Canonical invite: `https://discord.gg/efdQJsceKb`

The shared renderer activates this invite across every public Join Discord control.

## Corrected rulebook schedule

The earlier draft incorrectly published stale `10:00 PM / 10:45 PM EST` values. The current rulebook source is reflected in the V2 pages and data contract:

- Amateur through Legend: Saturday at **8:00 PM EST**
- Mythic: open scheduling Monday through Sunday; weekly deadline Sunday at **11:59 PM EST**
- Official streamed games: Saturday at **9:30 PM EST**
- Format: 2v2 with default server settings and bots off
- Default region: US-East unless both teams agree otherwise under league rules
- Required match-result/replay reporting remains governed by the official rulebook

## Data intentionally not fabricated

The website does not invent values for:

- current season/week
- team-by-team fixtures
- standings rows
- active rosters
- player records/statistics
- power rankings
- champion/history records

Those values must come from verified league sources or the bot-owned export. Until they are published, the public UI uses clean empty states instead of fake teams, fake records, or visible development placeholders.

## Domain

GitHub Pages deploys from `main` at repository root. Custom domain: `showdown2v2.live`.

## Platform note

Supersonic Showdown is an independent community competition and is not affiliated with, endorsed by, or sponsored by Psyonix or Epic Games.
