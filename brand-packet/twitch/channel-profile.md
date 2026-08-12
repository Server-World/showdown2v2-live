# Supersonic Showdown League — Twitch Channel Profile

Canonical channel: `https://www.twitch.tv/supersonicshowdownleague`

This file is the source-of-truth profile package for Twitch surfaces that are not currently writable through the Twitch API.

## Canonical public brand

- Display brand: **Supersonic Showdown League**
- Short brand: **SSL**
- Competition: **Rocket League 2v2**
- Brand voice: **PLAY. REPORT. CLIMB.**
- Primary background: `#07101D` Arena Navy
- Raised background: `#0D1A2B` Raised Navy
- Panel background: `#101F35` Panel Navy
- Primary accent: `#49C7FF` System Cyan
- Competition accent: `#FF9F43` Competition Orange
- Primary text: `#F7FBFF`
- Muted text: `#9CB0C9`
- Primary public mark: `/assets/branding/ssl-logo-primary.png`
- Shared website mark: `/assets/branding/ssl-logo.svg`

Use the approved **blue/orange SSL shield + ball** public league identity. Do not use older temporary logo treatments and do not replace or reuse SSL Bot/bot-specific branding for the public Twitch channel.

## API-managed live profile

The GitHub Twitch manager owns the Twitch metadata below and synchronizes Season/Week from `data/league.json` through `data/twitch-control.json`:

- Category: `Rocket League`
- Language: `English`
- Stream title template: `Supersonic Showdown League | {season} Week {week} | Rocket League 2v2`
- Tags: `RocketLeague`, `2v2`, `Esports`, `Competitive`, `CommunityLeague`, `LeaguePlay`, `Tournament`, `USEast`
- Recurring broadcast: Saturday, 9:30 PM America/New_York, 150 minutes
- Schedule title: `Supersonic Showdown League 2v2 | Official Saturday Broadcast`

Do not duplicate or manually fight these API-managed fields unless troubleshooting the manager. The Broadcast OS preflight validates them before the Saturday show.

## Bio

Official home of Supersonic Showdown League 2v2 — competitive Rocket League across six divisions. Live Saturday broadcasts at 9:30 PM ET. Standings, teams, rules and match center: showdown2v2.live | Join: discord.gg/efdQJsceKb

## Twitch Brand-tab settings — manual Creator Dashboard work

These fields are intentionally manual because Twitch's current channel-management path used by SSL does not upload these surfaces.

### Profile accent color

`#49C7FF`

### Profile picture

Use `/assets/branding/ssl-logo-primary.png` with a clean square crop. Keep the shield + ball readable at small size. No tiny text, extra lettering or bot imagery.

### Profile banner

- Recommended canvas: **1200 × 480 px**
- Arena Navy base
- System Cyan technical accents
- Competition Orange highlights
- Approved SSL shield + ball identity concentrated toward the left side
- Text hierarchy:
  - `SUPERSONIC SHOWDOWN LEAGUE`
  - `ROCKET LEAGUE 2v2`
  - `SATURDAYS • 9:30 PM ET`
- Optional lower line: `PLAY. REPORT. CLIMB.`
- Do not put Season/Week in permanent banner artwork; that state changes weekly.

### Offline / video-player banner

Use the same visual system as the profile banner and include:

- `OFF AIR`
- `NEXT OFFICIAL BROADCAST • SATURDAY 9:30 PM ET`
- `showdown2v2.live/watch/`
- `PLAY. REPORT. CLIMB.`

Do not use a fake LIVE indicator when the channel is offline.

## Social links

Use these five links in this order:

1. **Official Website** — `https://showdown2v2.live/`
2. **Join SSL Discord** — `https://discord.gg/efdQJsceKb`
3. **Match Center** — `https://showdown2v2.live/matches/`
4. **Standings** — `https://showdown2v2.live/standings/`
5. **Watch Hub** — `https://showdown2v2.live/watch/`

## Information panels

Panel art: 320 px wide, Arena/Panel Navy background, System Cyan label, Competition Orange keyline, approved SSL public mark where useful, and white label text. Keep copy short and action-oriented.

### ABOUT SSL

Supersonic Showdown League is an organized Rocket League 2v2 competition built around divisions, teams, standings, player identity and official match-night broadcasts.

**PLAY. REPORT. CLIMB.**

[Visit the official league site](https://showdown2v2.live/)

### BROADCAST SCHEDULE

**Official SSL Broadcast**  
Saturday • 9:30 PM ET  
Rocket League 2v2

Current Season/Week and match information are maintained on the official site.

[Open the Watch Hub](https://showdown2v2.live/watch/)

### JOIN THE LEAGUE

Want to compete, follow league operations or join the SSL community?

[Join the official SSL Discord](https://discord.gg/efdQJsceKb)

### MATCH CENTER

Current-week match information, verified results and match-night context.

[Open Match Center](https://showdown2v2.live/matches/)

### STANDINGS

Follow division standings, records and competitive movement throughout the season.

[View Standings](https://showdown2v2.live/standings/)

### TEAMS & PLAYERS

Browse league teams and player information from the public SSL data feed.

[Teams](https://showdown2v2.live/teams/) • [Players](https://showdown2v2.live/players/)

### LEAGUE RULES

Competition format, scheduling, substitutions, reporting and standings rules.

[Read League Rules](https://showdown2v2.live/league/)

## Channel trailer

Do not publish a generic or AI-placeholder trailer. After a polished broadcast package is available, use a 30–45 second trailer built from actual SSL broadcast footage, league UI/scoreboard graphics, the approved public identity, and a clear CTA to follow Twitch and join Discord.

## Suggested channels

Do not populate Suggested Channels until official SSL caster/partner channels are verified. Avoid unrelated channels simply to fill the section.

## Manual verification checklist

After any Twitch branding change, verify on desktop and mobile:

- Correct blue/orange SSL shield + ball avatar is visible.
- Banner is readable without stretching/cropping critical text.
- Accent color is `#49C7FF`.
- Offline banner matches the public brand and shows the next Saturday broadcast.
- Bio is current and not duplicated by panel copy.
- Social links are in the approved order and all resolve.
- Panels use the approved public identity, not SSL Bot branding.
- Schedule shows Saturday 9:30 PM ET without duplicate recurring entries.
- Current title/category/tags match `data/twitch-control.json` and the preflight check.
