# Supersonic Showdown League Website

**Status: V1 competition hub live on GitHub Pages. Competitive data integration is still in progress.**

This repository contains the public-facing Supersonic Showdown League 2v2 website at `showdown2v2.live`.

## Architecture

The website is a static GitHub Pages deployment. It does not connect directly to PostgreSQL and it does not decide competitive facts.

The authority chain is:

`SSL Bot / PostgreSQL` → scheduled read-only export → `data/league.json` → website UI

The bot/database remain the single source of truth. The site publishes verified output only.

## Files

- `index.html` — competition-hub markup and public league content
- `styles.css` — responsive esports visual system and six-tier color system
- `app.js` — client-side rendering for the read-only league snapshot
- `data/league.json` — public data contract; currently contains confirmed rulebook facts plus empty arrays for unverified competitive data
- `.nojekyll` — prevents Jekyll processing
- `CNAME` — custom domain: `showdown2v2.live`

No framework, package manager, build step, external font, CDN, analytics package, or direct database connection is required.

## Current competition surfaces

- The Arena / Match Center
- Standings Hub with six tier tabs
- Division identities: Mythic, Legend, Elite, Contender, Rookie, Amateur
- Schedule & Match Rules
- Team Directory shell
- Player Card shell
- SSL Power Index shell
- Hall of Champions / records shell
- News & Highlights
- League onboarding / FAQ

## Confirmed rulebook facts currently published

- Official league matches: Saturdays at 10:00 PM EST
- Official streamed games: Saturdays at 10:45 PM EST
- Format: 2v2 with default server settings and bots off
- Default region: US-East unless both teams agree otherwise
- Both teams report scores and submit replays within 24 hours

## Data still intentionally empty

The site does not invent values for:

- Discord invite URL
- current season and week
- team-by-team fixtures
- standings rows
- team/player records and statistics
- power rankings
- champion/history records
- unresolved public FAQ wording

Those values must be supplied from verified league sources or the bot-owned export.

## Domain and HTTPS

GitHub Pages is configured from `main` at the repository root. The custom domain is `showdown2v2.live`, DNS passes GitHub's custom-domain check, and TLS provisioning has been initiated. Enable **Enforce HTTPS** in GitHub Pages as soon as GitHub makes the control available after certificate issuance completes.

## Brand / platform note

Supersonic Showdown is an independent community competition and is not affiliated with, endorsed by, or sponsored by Psyonix or Epic Games.
