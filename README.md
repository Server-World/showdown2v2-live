# Supersonic Showdown League 2v2

Production website for the Supersonic Showdown Rocket League community.

Public site: https://showdown2v2.live

## Public routes

- `/` — Home and current competition status
- `/matches/` — Match Center with current slate or latest recorded results
- `/standings/` — Division standings
- `/teams/` — Team directory with rank, record, and differential
- `/players/` — Player cards
- `/stats/` — Team leaders and performance highlights
- `/history/` — Season archive, leaders, champions when published, and recorded results
- `/league/` — Format, schedule, FAQ, and league-operations guidance
- `/news/` — Published news or verified data-derived league updates

## Site structure

- `site-v2.css` — core design system
- `production.css` — production polish and accessibility layer
- `competition-fixes.css` — competitive visual system
- `site-audit.css` — information hierarchy and production UX enhancements
- `site-v2.js` — navigation, public league-data rendering, refresh logic, and GTM data-layer events
- `data/league.json` — public competition data
- `data/player-card-hitman.json` — featured player-card sample record
- `scripts/seo_static.py` — crawlable public-data snapshots and metadata rendering
- `.github/workflows/seo-automation.yml` — static-render validation and IndexNow automation
- `assets/branding/` — approved public branding
- `CNAME` — custom domain
- `.nojekyll` — GitHub Pages configuration

## Analytics

The site loads Google Tag Manager container `GTM-P65S83G6`. GA4 is configured inside GTM rather than directly in website source. Site JavaScript also pushes named interaction events into the GTM data layer for Discord joins, standings-tier changes, team search, player-card tabs, key internal destinations, and future Twitch links.

## Competition schedule

- Amateur through Legend: Saturday at 8:00 PM ET
- Mythic: open scheduling Monday through Sunday; deadline Sunday at 11:59 PM ET
- Official stream: Saturday at 9:30 PM ET
- Default region: US-East unless both teams agree otherwise
- Results and required replays: within 24 hours

Supersonic Showdown is an independent community competition and is not affiliated with, endorsed by, or sponsored by Psyonix or Epic Games.