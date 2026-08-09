#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://showdown2v2.live"
SOCIAL_IMAGE = f"{HOST}/assets/branding/ssl-social-card.svg"
PAGES = [
    ROOT / "index.html",
    ROOT / "matches" / "index.html",
    ROOT / "standings" / "index.html",
    ROOT / "teams" / "index.html",
    ROOT / "players" / "index.html",
    ROOT / "stats" / "index.html",
    ROOT / "history" / "index.html",
    ROOT / "league" / "index.html",
    ROOT / "news" / "index.html",
]


def esc(value):
    return html.escape(str(value if value is not None else "—"), quote=True)


def norm(value):
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def phase_label(value):
    return str(value or "").replace("_", " ").title()


def inject_head_metadata(text: str) -> str:
    text = re.sub(
        r'<meta name="twitter:card" content="[^"]*">',
        '<meta name="twitter:card" content="summary_large_image">',
        text,
        count=1,
    )
    additions = []
    if 'property="og:image"' not in text:
        additions.extend([
            f'<meta property="og:image" content="{SOCIAL_IMAGE}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta property="og:image:type" content="image/svg+xml">',
            '<meta property="og:image:alt" content="Supersonic Showdown League 2v2 competitive Rocket League">',
        ])
    if 'name="twitter:image"' not in text:
        additions.extend([
            f'<meta name="twitter:image" content="{SOCIAL_IMAGE}">',
            '<meta name="twitter:image:alt" content="Supersonic Showdown League 2v2 competitive Rocket League">',
        ])
    if 'rel="manifest"' not in text:
        additions.append('<link rel="manifest" href="/site.webmanifest">')
    if 'name="application-name"' not in text:
        additions.append('<meta name="application-name" content="Supersonic Showdown League 2v2">')
    if additions:
        anchor = '<link rel="stylesheet" href="/site-v2.css">'
        text = text.replace(anchor, "".join(additions) + anchor, 1)
    return text


def marker_block(name: str, content: str) -> str:
    return f'<!-- SEO_STATIC:{name}:START -->{content}<!-- SEO_STATIC:{name}:END -->'


def replace_marked(text: str, name: str, content: str) -> tuple[str, bool]:
    pattern = re.compile(
        rf'<!-- SEO_STATIC:{re.escape(name)}:START -->.*?<!-- SEO_STATIC:{re.escape(name)}:END -->',
        re.S,
    )
    replacement = marker_block(name, content)
    if pattern.search(text):
        return pattern.sub(replacement, text, count=1), True
    return text, False


def match_rows(league: dict) -> str:
    rows = list(league.get("match_night", {}).get("matches", []) or [])
    season = league.get("season", {}) or {}
    week = int(season.get("week") or 0)
    phase = norm(season.get("status"))
    scoped = [m for m in rows if (not phase or norm(m.get("phase")) == phase)]
    if week:
        current = [m for m in scoped if int(m.get("week") or 0) == week]
        if current:
            scoped = current
    scoped.sort(key=lambda m: (str(m.get("date") or ""), str(m.get("time") or "")), reverse=True)
    if not scoped:
        return '<div class="data-state"><strong>No current-week match slate is in the public feed.</strong><br>Use Discord for current scheduling and match-night coordination.</div>'
    out = []
    for m in scoped[:18]:
        bits = []
        if m.get("week"):
            bits.append(f'Week {esc(m["week"])}')
        if m.get("date"):
            bits.append(esc(m["date"]))
        if m.get("time"):
            bits.append(esc(m["time"]))
        meta = " · ".join(bits) or "League match"
        out.append(
            '<div class="match-row">'
            f'<div class="match-meta"><span class="tierlabel">{esc(m.get("tier"))}</span><span class="match-sub">{meta}</span></div>'
            f'<span class="tname">{esc(m.get("home"))}</span>'
            f'<span class="scorebox">{esc(m.get("score") or "VS")}</span>'
            f'<span class="tname away">{esc(m.get("away"))}</span>'
            f'<span class="state">{esc(m.get("status"))}</span>'
            '</div>'
        )
    return "".join(out)


def standings_rows(league: dict, tier: str = "mythic") -> str:
    rows = (league.get("standings", {}) or {}).get(tier, []) or []
    if not rows:
        return '<tr class="empty-row"><td colspan="8">No standings have been published for this division.</td></tr>'
    out = []
    for i, row in enumerate(rows, 1):
        out.append(
            '<tr>'
            f'<td class="rank">{esc(row.get("rank", i))}</td>'
            f'<td><strong>{esc(row.get("team"))}</strong></td>'
            f'<td>{esc(row.get("wins"))}</td>'
            f'<td>{esc(row.get("losses"))}</td>'
            f'<td>{esc(row.get("win_pct"))}</td>'
            f'<td>{esc(row.get("goals_for"))}</td>'
            f'<td>{esc(row.get("goals_against"))}</td>'
            f'<td>{esc(row.get("differential"))}</td>'
            '</tr>'
        )
    return "".join(out)


def team_cards(league: dict) -> str:
    teams = league.get("teams", []) or []
    if not teams:
        return '<div class="data-state" style="grid-column:1/-1"><strong>No public teams are listed for the current season.</strong></div>'
    out = []
    for team in teams:
        logo = team.get("logo")
        logo_html = (
            f'<img src="{esc(logo)}" alt="{esc(team.get("franchise"))} logo" loading="lazy" decoding="async">'
            if logo else esc(team.get("franchise_tag") or "SSL")
        )
        color = esc(team.get("color") or "#49C7FF")
        out.append(
            f'<article class="card team-card" data-filterable style="--team-color:{color}">'
            f'<div class="team-logo">{logo_html}</div>'
            f'<span class="eyebrow">{esc(team.get("tier"))}</span>'
            f'<h3>{esc(team.get("name"))}</h3>'
            f'<div class="team-meta">{esc(team.get("franchise"))}</div>'
            '</article>'
        )
    return "".join(out)


def leader_rows(league: dict) -> str:
    tiers = ["mythic", "legend", "elite", "contender", "rookie", "amateur"]
    codes = {"mythic":"MYT", "legend":"LEG", "elite":"ELI", "contender":"CON", "rookie":"ROO", "amateur":"AMA"}
    out = []
    standings = league.get("standings", {}) or {}
    for tier in tiers:
        rows = standings.get(tier) or []
        if not rows:
            continue
        row = rows[0]
        out.append(
            '<div class="leader-row">'
            f'<span class="pos division-code">{codes[tier]}</span>'
            f'<div><b>{esc(row.get("team"))}</b><span>{esc(tier.title())} division leader</span></div>'
            f'<div class="value">{esc(row.get("wins"))}-{esc(row.get("losses"))}</div>'
            '</div>'
        )
    return "".join(out) or '<div class="data-state"><strong>No division leaders are currently published.</strong></div>'


def season_summary(league: dict) -> str:
    season = league.get("season", {}) or {}
    teams = league.get("teams", []) or []
    matches = league.get("match_night", {}).get("matches", []) or []
    week = int(season.get("week") or 0)
    phase = norm(season.get("status"))
    finals = [m for m in matches if norm(m.get("status")) == "final" and (not phase or norm(m.get("phase")) == phase) and (not week or int(m.get("week") or 0) == week)]
    return (
        f'<div class="leader-row"><span class="pos">S</span><div><b>{esc(season.get("name") or "Current season")}</b><span>{esc(phase_label(season.get("status") or "active"))}</span></div><div class="value">Week {esc(season.get("week"))}</div></div>'
        f'<div class="leader-row"><span class="pos">T</span><div><b>{esc(len(teams))} teams</b><span>Across six divisions</span></div><div class="value">2v2</div></div>'
        f'<div class="leader-row"><span class="pos">M</span><div><b>{esc(len(finals))} posted results</b><span>Current-week public finals</span></div><div class="value">Final</div></div>'
    )


def history_cards(league: dict) -> tuple[str, str]:
    champions = league.get("champions", []) or []
    season = league.get("season", {}) or {}
    if champions:
        cards = "".join(
            f'<article class="card record-card"><span>{esc(c.get("season"))}</span><b>{esc(c.get("team"))}</b><div class="muted">{esc(c.get("tier") or "League champion")}</div></article>'
            for c in champions
        )
    else:
        cards = f'<article class="card record-card"><span>Current competition</span><b>{esc(season.get("name") or "Current season")}</b><div class="muted">Week {esc(season.get("week"))} · {esc(phase_label(season.get("status") or "active"))}</div></article>'
    leaders = []
    for tier, rows in (league.get("standings", {}) or {}).items():
        if not rows:
            continue
        row = rows[0]
        leaders.append(
            f'<article class="card record-card"><span>{esc(tier.title())} leader</span><b>{esc(row.get("team"))}</b><div class="muted">{esc(row.get("wins"))}-{esc(row.get("losses"))}</div></article>'
        )
    return cards, "".join(leaders)


def player_fallback(player_fixture: dict) -> str:
    p = player_fixture.get("player", {}) or {}
    s = player_fixture.get("season", {}) or {}
    st = s.get("stats", {}) or {}
    c = player_fixture.get("career", {}) or {}
    return (
        '<article class="card panel pc-seo-fallback" aria-label="HI7MAN305 player profile summary">'
        f'<p class="eyebrow">{esc(p.get("tier"))} · {esc(p.get("team"))}</p>'
        f'<h3>{esc(p.get("gamertag"))}</h3>'
        f'<p>{esc(p.get("franchise"))} · {esc(p.get("role"))} · {esc(p.get("eligibility_label"))}</p>'
        '<dl>'
        f'<div><dt>Locked MMR</dt><dd>{esc(p.get("locked_mmr"))}</dd></div>'
        f'<div><dt>Season</dt><dd>{esc(st.get("games"))} games · {esc(st.get("goals"))} goals · {esc(st.get("assists"))} assists · {esc(st.get("saves"))} saves</dd></div>'
        f'<div><dt>Career</dt><dd>{esc(c.get("games"))} games · {esc(c.get("wins"))} wins · {esc(c.get("goals"))} goals · {esc(c.get("mvps"))} MVPs</dd></div>'
        f'<div><dt>SLP</dt><dd>{esc(s.get("slp"))}</dd></div>'
        '</dl><p class="muted">Interactive Player Card V5 loads immediately when JavaScript is available.</p></article>'
    )


def install_static_block(text: str, name: str, placeholder: str, content: str) -> str:
    text, found = replace_marked(text, name, content)
    if found:
        return text
    if placeholder in text:
        return text.replace(placeholder, marker_block(name, content), 1)
    return text


def main():
    league = json.loads((ROOT / "league.json").read_text(encoding="utf-8"))
    player_fixture = json.loads((ROOT / "data" / "player-card-hitman.json").read_text(encoding="utf-8"))
    match_html = match_rows(league)
    standings_html = standings_rows(league)
    teams_html = team_cards(league)
    leaders_html = leader_rows(league)
    summary_html = season_summary(league)
    history_top, history_leaders = history_cards(league)
    player_html = player_fallback(player_fixture)

    for path in PAGES:
        text = inject_head_metadata(path.read_text(encoding="utf-8"))
        rel = path.relative_to(ROOT).as_posix()
        if rel == "index.html":
            text = install_static_block(text, "home-matches", '<div class="data-state"><strong>Loading matches…</strong></div>', match_html)
        elif rel == "matches/index.html":
            text = install_static_block(text, "matches", '<div class="data-state"><strong>Loading matches…</strong></div>', match_html)
        elif rel == "standings/index.html":
            text = install_static_block(text, "standings-mythic", '<tr class="empty-row"><td colspan="8">Loading standings…</td></tr>', standings_html)
        elif rel == "teams/index.html":
            text = install_static_block(text, "teams", '<div class="data-state" style="grid-column:1/-1"><strong>Loading teams…</strong></div>', teams_html)
        elif rel == "stats/index.html":
            text = install_static_block(text, "leaders", '<div class="data-state"><strong>Loading division leaders…</strong></div>', leaders_html)
            text = install_static_block(text, "season-summary", '<div class="data-state"><strong>Loading season totals…</strong></div>', summary_html)
        elif rel == "history/index.html":
            text = install_static_block(text, "history-top", '<div class="data-state" style="grid-column:1/-1"><strong>Loading season archive…</strong></div>', history_top)
            text = install_static_block(text, "history-leaders", '<div class="data-state" style="grid-column:1/-1"><strong>Loading current leaders…</strong></div>', history_leaders)
        elif rel == "players/index.html":
            loading = '<div class="pc-loading">\n        <span class="pc-loading-mark" aria-hidden="true"></span>\n        <div><strong>Loading player profile</strong><span>Preparing Player Card V5…</span></div>\n      </div>'
            text = install_static_block(text, "featured-player", loading, player_html)
        path.write_text(text, encoding="utf-8")

    generated = str(league.get("generated_at") or "")[:10]
    lastmod = generated if re.fullmatch(r"\d{4}-\d{2}-\d{2}", generated) else date.today().isoformat()
    sitemap = ROOT / "sitemap.xml"
    stext = sitemap.read_text(encoding="utf-8")
    dynamic_urls = ["/", "/matches/", "/standings/", "/teams/", "/players/", "/stats/", "/history/"]
    for suffix in dynamic_urls:
        pattern = rf'(<loc>{re.escape(HOST + suffix)}</loc><lastmod>)\d{{4}}-\d{{2}}-\d{{2}}(</lastmod>)'
        stext = re.sub(pattern, rf'\g<1>{lastmod}\g<2>', stext)
    sitemap.write_text(stext, encoding="utf-8")


if __name__ == "__main__":
    main()
