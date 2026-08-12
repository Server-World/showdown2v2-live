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
    ROOT / "franchises" / "index.html",
    ROOT / "franchises" / "d20" / "index.html",
    ROOT / "franchises" / "solace-path" / "index.html",
    ROOT / "franchises" / "gravewardens" / "index.html",
    ROOT / "franchises" / "frozen" / "index.html",
    ROOT / "franchises" / "glow-stick-gang" / "index.html",
    ROOT / "franchises" / "ficticious-esports" / "index.html",
    ROOT / "players" / "index.html",
    ROOT / "stats" / "index.html",
    ROOT / "history" / "index.html",
    ROOT / "league" / "index.html",
    ROOT / "how-it-works" / "index.html",
    ROOT / "news" / "index.html",
    ROOT / "watch" / "index.html",
]


def esc(value):
    return html.escape(str(value if value is not None else "—"), quote=True)


def norm(value):
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def phase_label(value):
    return str(value or "").replace("_", " ").title()


def display_zone(value):
    return re.sub(r"\b(?:EST|EDT)\b", "ET", str(value or ""))


def season_phase(league: dict) -> str:
    season = league.get("season", {}) or {}
    explicit = norm(season.get("phase"))
    if explicit:
        return explicit
    status = norm(season.get("status"))
    for phase in ("regular_season", "preseason", "postseason", "playoffs", "playoff", "championship"):
        if phase in status:
            return phase
    return ""


def season_state_label(league: dict) -> str:
    season = league.get("season", {}) or {}
    raw = norm(season.get("status"))
    phase = season_phase(league)
    base = phase_label(phase or raw or "active")
    if "locked" in raw and "locked" not in base.lower():
        return f"{base} · Locked"
    return base


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
    if 'href="/site-audit.css"' not in text:
        additions.append('<link rel="stylesheet" href="/site-audit.css">')
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


def all_matches(league: dict) -> list[dict]:
    return list(league.get("match_night", {}).get("matches", []) or [])


def strict_current_matches(league: dict) -> list[dict]:
    rows = all_matches(league)
    season = league.get("season", {}) or {}
    phase = season_phase(league)
    week = int(season.get("week") or 0)
    if phase:
        rows = [m for m in rows if norm(m.get("phase")) == phase]
    if week:
        rows = [m for m in rows if int(m.get("week") or 0) == week]
    return rows


def display_match_scope(league: dict) -> tuple[list[dict], str]:
    current = strict_current_matches(league)
    if current:
        return current, "current"
    phase = season_phase(league)
    if phase:
        phase_rows = [m for m in all_matches(league) if norm(m.get("phase")) == phase]
        if phase_rows:
            return phase_rows, "phase"
    return all_matches(league), "recent"


def match_meta(match: dict) -> str:
    bits = []
    if match.get("week"):
        bits.append(f'Week {esc(match.get("week"))}')
    if match.get("date"):
        bits.append(esc(match.get("date")))
    if match.get("time"):
        bits.append(esc(display_zone(match.get("time"))))
    if match.get("phase"):
        bits.append(esc(phase_label(match.get("phase"))))
    return " · ".join(bits) or "League match"


def sorted_matches(rows: list[dict]) -> list[dict]:
    return sorted(rows, key=lambda m: (str(m.get("date") or ""), str(m.get("time") or "")), reverse=True)


def match_context(league: dict, mode: str) -> str:
    season = league.get("season", {}) or {}
    week = season.get("week") or "—"
    if mode == "current":
        return f'<div class="match-context current"><strong>{esc(season.get("name") or "Current season")} · Week {esc(week)}</strong><span>Current published match slate and results.</span></div>'
    if mode == "phase":
        return f'<div class="match-context"><strong>{esc(season_state_label(league))}</strong><span>No Week {esc(week)} slate is published yet; showing the latest matches from this phase.</span></div>'
    return '<div class="match-context"><strong>Latest recorded results</strong><span>No current-week slate is published in the public feed yet.</span></div>'


def match_rows(league: dict) -> str:
    rows, mode = display_match_scope(league)
    rows = sorted_matches(rows)
    if not rows:
        return '<div class="data-state"><strong>No match records are available in the public feed yet.</strong><br>Use Discord for scheduling and match-night coordination.</div>'
    out = [match_context(league, mode)]
    for match in rows[:18]:
        out.append(
            '<div class="match-row">'
            f'<div class="match-meta"><span class="tierlabel">{esc(match.get("tier"))}</span><span class="match-sub">{match_meta(match)}</span></div>'
            f'<span class="tname">{esc(match.get("home"))}</span>'
            f'<span class="scorebox">{esc(match.get("score") or "VS")}</span>'
            f'<span class="tname away">{esc(match.get("away"))}</span>'
            f'<span class="state">{esc(match.get("status"))}</span>'
            '</div>'
        )
    return "".join(out)


def standings_rows(league: dict, tier: str = "mythic") -> str:
    rows = (league.get("standings", {}) or {}).get(tier, []) or []
    if not rows:
        return '<tr class="empty-row"><td colspan="8">No standings have been published for this division.</td></tr>'
    out = []
    for i, row in enumerate(rows, 1):
        klass = ' class="division-leader"' if i == 1 else ""
        franchise = f'<small class="table-franchise">{esc(row.get("franchise"))}</small>' if row.get("franchise") else ""
        out.append(
            f'<tr{klass}>'
            f'<td class="rank">{esc(row.get("rank", i))}</td>'
            f'<td><strong>{esc(row.get("team"))}</strong>{franchise}</td>'
            f'<td>{esc(row.get("wins"))}</td>'
            f'<td>{esc(row.get("losses"))}</td>'
            f'<td>{esc(row.get("win_pct"))}</td>'
            f'<td>{esc(row.get("goals_for"))}</td>'
            f'<td>{esc(row.get("goals_against"))}</td>'
            f'<td>{esc(row.get("differential"))}</td>'
            '</tr>'
        )
    return "".join(out)


def standing_lookup(league: dict) -> dict[str, dict]:
    lookup = {}
    for tier, rows in (league.get("standings", {}) or {}).items():
        for row in rows or []:
            if row.get("team"):
                lookup[norm(row.get("team"))] = {**row, "tier": tier}
    return lookup


def team_cards(league: dict) -> str:
    teams = league.get("teams", []) or []
    if not teams:
        return '<div class="data-state" style="grid-column:1/-1"><strong>No public teams are listed for the current season.</strong></div>'
    lookup = standing_lookup(league)
    out = []
    for team in teams:
        standing = lookup.get(norm(team.get("name")))
        logo = team.get("logo")
        logo_html = (
            f'<img src="{esc(logo)}" alt="{esc(team.get("franchise"))} logo" loading="lazy" decoding="async">'
            if logo else esc(team.get("franchise_tag") or "SSL")
        )
        color = esc(team.get("color") or "#49C7FF")
        rank = f'#{standing.get("rank")}' if standing and standing.get("rank") else "—"
        record = f'{standing.get("wins")}-{standing.get("losses")}' if standing else "—"
        if standing and standing.get("differential") is not None:
            diff_value = int(standing.get("differential") or 0)
            diff = f'+{diff_value}' if diff_value > 0 else str(diff_value)
        else:
            diff = "—"
        out.append(
            f'<article class="card team-card" data-filterable style="--team-color:{color}" aria-label="{esc(team.get("name"))}, {esc(team.get("tier"))} division">'
            f'<div class="team-card-head"><div class="team-logo">{logo_html}</div><span class="team-rank">{esc(rank)}</span></div>'
            f'<div class="team-card-title"><span class="eyebrow">{esc(team.get("tier"))}</span><h3>{esc(team.get("name"))}</h3><div class="team-meta">{esc(team.get("franchise"))}</div></div>'
            f'<div class="team-card-stats"><span><small>Record</small><b>{esc(record)}</b></span><span><small>Rank</small><b>{esc(rank)}</b></span><span><small>Diff</small><b>{esc(diff)}</b></span></div>'
            '</article>'
        )
    return "".join(out)


def leader_rows(league: dict) -> str:
    tiers = ["mythic", "legend", "elite", "contender", "rookie", "amateur"]
    codes = {"mythic": "MYT", "legend": "LEG", "elite": "ELI", "contender": "CON", "rookie": "ROO", "amateur": "AMA"}
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


def flat_standings(league: dict) -> list[dict]:
    rows = []
    for tier, items in (league.get("standings", {}) or {}).items():
        rows.extend({**row, "tier": tier} for row in (items or []))
    return rows


def season_summary(league: dict) -> str:
    season = league.get("season", {}) or {}
    teams = league.get("teams", []) or []
    current_finals = [m for m in strict_current_matches(league) if norm(m.get("status")) == "final"]
    recorded_finals = [m for m in all_matches(league) if norm(m.get("status")) == "final"]
    finals = current_finals or recorded_finals
    result_label = "Current-week public finals" if current_finals else "Recorded public finals"
    rows = flat_standings(league)
    top = sorted(rows, key=lambda row: (-int(row.get("wins") or 0), int(row.get("losses") or 0), -int(row.get("differential") or 0)))[0] if rows else None
    html_parts = [
        f'<div class="leader-row"><span class="pos">S</span><div><b>{esc(season.get("name") or "Current season")}</b><span>{esc(season_state_label(league))}</span></div><div class="value">Week {esc(season.get("week"))}</div></div>',
        f'<div class="leader-row"><span class="pos">T</span><div><b>{esc(len(teams))} teams</b><span>Across six divisions</span></div><div class="value">2v2</div></div>',
        f'<div class="leader-row"><span class="pos">M</span><div><b>{esc(len(finals))} posted results</b><span>{esc(result_label)}</span></div><div class="value">Final</div></div>',
    ]
    if top:
        html_parts.append(f'<div class="leader-row"><span class="pos">W</span><div><b>{esc(top.get("team"))}</b><span>Strongest current record</span></div><div class="value">{esc(top.get("wins"))}-{esc(top.get("losses"))}</div></div>')
    return "".join(html_parts)


def stat_highlights(league: dict) -> str:
    rows = [row for row in flat_standings(league) if row.get("team")]
    if not rows:
        return '<div class="data-state" style="grid-column:1/-1">Team performance highlights will appear when standings are published.</div>'
    best_record = sorted(rows, key=lambda row: (-int(row.get("wins") or 0), int(row.get("losses") or 0), -int(row.get("differential") or 0)))[0]
    best_offense = max(rows, key=lambda row: int(row.get("goals_for") or 0))
    best_diff = max(rows, key=lambda row: int(row.get("differential") or 0))
    undefeated = sum(1 for row in rows if int(row.get("losses") or 0) == 0)
    generated = str(league.get("generated_at") or "")[:10] or "Public snapshot"
    return (
        f'<article class="card insight-card"><span>Best record</span><strong>{esc(best_record.get("team"))}</strong><b>{esc(best_record.get("wins"))}-{esc(best_record.get("losses"))}</b><small>{esc(phase_label(best_record.get("tier")))}</small></article>'
        f'<article class="card insight-card"><span>Most goals</span><strong>{esc(best_offense.get("team"))}</strong><b>{esc(best_offense.get("goals_for"))} GF</b><small>{esc(phase_label(best_offense.get("tier")))}</small></article>'
        f'<article class="card insight-card"><span>Best differential</span><strong>{esc(best_diff.get("team"))}</strong><b>{"+" if int(best_diff.get("differential") or 0) > 0 else ""}{esc(best_diff.get("differential"))}</b><small>{esc(phase_label(best_diff.get("tier")))}</small></article>'
        f'<article class="card insight-card"><span>Undefeated</span><strong>{esc(undefeated)} teams</strong><b>{esc(len(rows))} ranked</b><small>Updated {esc(generated)}</small></article>'
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
        cards = (
            f'<article class="card record-card"><span>Current competition</span><b>{esc(season.get("name") or "Current season")}</b><div class="muted">Week {esc(season.get("week"))} · {esc(season_state_label(league))}</div></article>'
            '<article class="card record-card"><span>Championship archive</span><b>Not yet published</b><div class="muted">Verified champions will appear here when the public feed includes them.</div></article>'
        )
    leaders = []
    for tier, rows in (league.get("standings", {}) or {}).items():
        if not rows:
            continue
        row = rows[0]
        leaders.append(
            f'<article class="card record-card"><span>{esc(tier.title())} leader</span><b>{esc(row.get("team"))}</b><div class="muted">{esc(row.get("wins"))}-{esc(row.get("losses"))}</div></article>'
        )
    return cards, "".join(leaders)


def history_results(league: dict) -> str:
    finals = sorted_matches([m for m in all_matches(league) if norm(m.get("status")) == "final"])
    if not finals:
        return '<div class="data-state" style="grid-column:1/-1">No final match records are published yet.</div>'
    return "".join(
        '<article class="card result-card">'
        f'<div><span class="eyebrow">{esc(m.get("tier") or "League")}</span><small>{match_meta(m)}</small></div>'
        f'<strong>{esc(m.get("home"))} <b>{esc(m.get("score") or "VS")}</b> {esc(m.get("away"))}</strong>'
        '</article>'
        for m in finals[:9]
    )


def news_cards(league: dict) -> str:
    published = league.get("news", []) or []
    if published:
        rows = published[:9]
    else:
        standings = league.get("standings", {}) or {}
        leaders = [(tier, items[0]) for tier, items in standings.items() if items]
        finals = sorted_matches([m for m in all_matches(league) if norm(m.get("status")) == "final"])
        latest = finals[0] if finals else None
        competition = league.get("competition", {}) or {}
        generated = str(league.get("generated_at") or "")[:10] or "Public snapshot"
        rows = [
            {
                "category": "Season update",
                "title": f'{league.get("season", {}).get("name") or "Current season"} · Week {league.get("season", {}).get("week") or "—"}',
                "summary": f'{season_state_label(league)}. {len(flat_standings(league)) or len(league.get("teams", []) or [])} ranked team entries are published across six divisions.',
                "date": f'Updated {generated}',
            }
        ]
        if leaders:
            rows.append({
                "category": "Standings",
                "title": "Division leaders are set.",
                "summary": " · ".join(f'{phase_label(tier)}: {row.get("team")}' for tier, row in leaders),
                "date": f'Updated {generated}',
            })
        if latest:
            rows.append({
                "category": "Latest result",
                "title": f'{latest.get("home")} {latest.get("score") or "vs"} {latest.get("away")}',
                "summary": f'{latest.get("tier") or "League"} · {match_meta(latest)}',
                "date": latest.get("date") or generated,
            })
        rows.append({
            "category": "Broadcast",
            "title": f'Official stream · {display_zone(competition.get("official_stream_time") or "9:30 PM ET")}',
            "summary": f'{competition.get("official_stream_day") or "Saturday"} featured games follow the primary match window.',
            "date": "Weekly schedule",
        })
    out = []
    for index, item in enumerate(rows):
        feature = " feature" if index == 0 else ""
        out.append(
            f'<article class="card news-card{feature}"><span class="eyebrow">{esc(item.get("category") or "League news")}</span>'
            f'<h3>{esc(item.get("title"))}</h3><p>{esc(display_zone(item.get("summary")))}</p><time>{esc(display_zone(item.get("date")))}</time></article>'
        )
    return "".join(out)


def home_status(league: dict) -> str:
    season = league.get("season", {}) or {}
    competition = league.get("competition", {}) or {}
    teams = league.get("teams", []) or []
    generated = str(league.get("generated_at") or "")[:10] or "Public snapshot"
    return (
        '<div class="wrap competition-status-grid">'
        f'<div class="status-primary"><span class="live-dot" aria-hidden="true"></span><div><small>Current competition</small><strong>{esc(season.get("name") or "Season")} · Week {esc(season.get("week") or "—")}</strong><span>{esc(season_state_label(league))}</span></div></div>'
        f'<div class="status-item"><small>Match night</small><strong>{esc(competition.get("core_match_day") or "Saturday")} · {esc(display_zone(competition.get("core_match_time") or "8:00 PM ET"))}</strong><span>{esc(competition.get("default_region") or "US-East")}</span></div>'
        f'<div class="status-item"><small>Official stream</small><strong>{esc(competition.get("official_stream_day") or "Saturday")} · {esc(display_zone(competition.get("official_stream_time") or "9:30 PM ET"))}</strong><span>Featured league games</span></div>'
        f'<div class="status-item"><small>Field</small><strong>{esc(len(teams) or 36)} teams · 6 divisions</strong><span>Updated {esc(generated)}</span></div>'
        '<div class="status-actions"><a class="btn ghost" href="/matches/">Match Center</a><a class="btn primary" href="https://discord.gg/efdQJsceKb" target="_blank" rel="noopener noreferrer">Join Discord</a></div>'
        '</div>'
    )


def player_fallback(player_fixture: dict) -> str:
    p = player_fixture.get("player", {}) or {}
    s = player_fixture.get("season", {}) or {}
    st = s.get("stats", {}) or {}
    c = player_fixture.get("career", {}) or {}
    return (
        '<article class="card panel pc-seo-fallback" aria-label="HI7MAN305 featured player profile summary">'
        f'<p class="eyebrow">{esc(p.get("tier"))} · {esc(p.get("team"))}</p>'
        f'<h3>{esc(p.get("gamertag"))}</h3>'
        f'<p>{esc(p.get("franchise"))} · {esc(p.get("role"))} · {esc(p.get("eligibility_label"))}</p>'
        '<dl>'
        f'<div><dt>Locked MMR</dt><dd>{esc(p.get("locked_mmr"))}</dd></div>'
        f'<div><dt>Season</dt><dd>{esc(st.get("games"))} games · {esc(st.get("goals"))} goals · {esc(st.get("assists"))} assists · {esc(st.get("saves"))} saves</dd></div>'
        f'<div><dt>Career</dt><dd>{esc(c.get("games"))} games · {esc(c.get("wins"))} wins · {esc(c.get("goals"))} goals · {esc(c.get("mvps"))} MVPs</dd></div>'
        f'<div><dt>SLP</dt><dd>{esc(s.get("slp"))}</dd></div>'
        '</dl><p class="muted">Interactive Player Card V5 loads when JavaScript is available. Missing values are not fabricated.</p></article>'
    )


def install_static_block(text: str, name: str, placeholder: str, content: str) -> str:
    text, found = replace_marked(text, name, content)
    if found:
        return text
    if placeholder in text:
        return text.replace(placeholder, marker_block(name, content), 1)
    return text


def ensure_generated_sections(text: str, rel: str, home_status_html: str, highlights_html: str, history_results_html: str, news_html: str) -> str:
    if rel == "index.html" and 'SEO_STATIC:home-status:START' not in text:
        block = f'<section id="competition-status-band" class="competition-status-band">{marker_block("home-status", home_status_html)}</section>'
        anchor = '<div class="ticker">'
        if anchor in text:
            text = text.replace(anchor, block + anchor, 1)

    if rel == "stats/index.html" and 'SEO_STATIC:stat-highlights:START' not in text:
        anchor = '</div></section><section class="section alt">'
        block = f'<div id="stat-highlights" class="insight-grid">{marker_block("stat-highlights", highlights_html)}</div>'
        if anchor in text:
            text = text.replace(anchor, f'</div>{block}</section><section class="section alt">', 1)

    if rel == "history/index.html" and 'SEO_STATIC:history-results:START' not in text:
        block = (
            '<section id="history-results-section" class="section"><div class="wrap">'
            '<div class="section-head"><div><p class="eyebrow">Recorded results</p><h2>Recent match archive.</h2>'
            '<p>Final series retained in the current public competition snapshot.</p></div></div>'
            f'<div id="history-results" class="history-result-grid">{marker_block("history-results", history_results_html)}</div>'
            '</div></section>'
        )
        if '</main>' in text:
            text = text.replace('</main>', block + '</main>', 1)

    if rel == "news/index.html" and 'SEO_STATIC:news:START' not in text:
        pattern = re.compile(r'(<div id="news-grid" class="news-grid">).*?(</div></div></section>)', re.S)
        text = pattern.sub(lambda m: m.group(1) + marker_block("news", news_html) + m.group(2), text, count=1)

    return text


def polish_page_copy(text: str, rel: str) -> str:
    text = display_zone(text)
    if rel == "index.html":
        text = text.replace('Recent results and posted fixtures from across the league.', 'The current slate when published, otherwise the latest recorded results from across the league.')
    elif rel == "matches/index.html":
        text = text.replace('Final scores and posted fixtures appear together so players can quickly find the latest action.', 'The current slate appears when published; otherwise the latest recorded results remain visible so the Match Center never becomes an empty page.')
    elif rel == "players/index.html":
        text = text.replace('A web-native version of the SSL Player Card V5: fast to scan, consistent with the league site, and ready to populate from approved player data.', 'The SSL Player Card V5 on the web: a fast, consistent view of competitive identity, eligibility, season performance, career totals, matches, and awards.')
        text = text.replace('The featured card is rendered from one structured data file instead of duplicating player values throughout the page. The public website can replace that fixture with exporter data later without redesigning the card.', 'HI7MAN305 is the featured sample profile. The card reads one structured record, keeps missing values explicit, and is ready for the public roster feed without changing the design.')
        text = text.replace('<span class="pc-data-pill">V5 web profile</span>', '<span class="pc-data-pill">Featured profile</span>')
    elif rel == "news/index.html":
        text = text.replace('Announcements, weekly recaps, featured matches, and the stories shaping the season.', 'Verified competition updates, standings movement, recent results, broadcast timing, and published league news.')
        text = text.replace('<p class="eyebrow">Latest updates</p><h2>From around the league.</h2>', '<p class="eyebrow">Latest updates</p><h2>What is happening now.</h2>')
    elif rel == "league/index.html" and 'league-operations-note' not in text:
        anchor = '</div></div></section></main>'
        note = ('</div><div class="card league-operations-note"><span class="eyebrow">League operations</span>'
                '<h3>Discord remains authoritative for rulings and exceptions.</h3>'
                '<p>Use the published website rules for normal competition. Eligibility decisions, roster actions, disputes, reschedules, and approved exceptions are handled through official league operations in Discord.</p>'
                '<a class="btn ghost" href="https://discord.gg/efdQJsceKb" target="_blank" rel="noopener noreferrer">Open league operations in Discord</a></div></div></section></main>')
        if anchor in text:
            text = text.replace(anchor, note, 1)
    return text


def main():
    league = json.loads((ROOT / "league.json").read_text(encoding="utf-8"))
    player_fixture = json.loads((ROOT / "data" / "player-card-hitman.json").read_text(encoding="utf-8"))
    match_html = match_rows(league)
    standings_html = standings_rows(league)
    teams_html = team_cards(league)
    leaders_html = leader_rows(league)
    summary_html = season_summary(league)
    highlights_html = stat_highlights(league)
    history_top, history_leaders = history_cards(league)
    history_results_html = history_results(league)
    news_html = news_cards(league)
    home_status_html = home_status(league)
    player_html = player_fallback(player_fixture)

    for path in PAGES:
        rel = path.relative_to(ROOT).as_posix()
        text = inject_head_metadata(path.read_text(encoding="utf-8"))
        text = polish_page_copy(text, rel)
        text = ensure_generated_sections(text, rel, home_status_html, highlights_html, history_results_html, news_html)
        if rel == "index.html":
            text = install_static_block(text, "home-status", '<div class="data-state">Loading current competition…</div>', home_status_html)
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
            text = install_static_block(text, "stat-highlights", '<div class="data-state" style="grid-column:1/-1">Loading performance highlights…</div>', highlights_html)
        elif rel == "history/index.html":
            text = install_static_block(text, "history-top", '<div class="data-state" style="grid-column:1/-1"><strong>Loading season archive…</strong></div>', history_top)
            text = install_static_block(text, "history-leaders", '<div class="data-state" style="grid-column:1/-1"><strong>Loading current leaders…</strong></div>', history_leaders)
            text = install_static_block(text, "history-results", '<div class="data-state" style="grid-column:1/-1">Loading recorded results…</div>', history_results_html)
        elif rel == "players/index.html":
            loading = '<div class="pc-loading">\n        <span class="pc-loading-mark" aria-hidden="true"></span>\n        <div><strong>Loading player profile</strong><span>Preparing Player Card V5…</span></div>\n      </div>'
            text = install_static_block(text, "featured-player", loading, player_html)
        elif rel == "news/index.html":
            text = install_static_block(text, "news", '<div class="data-state" style="grid-column:1/-1">Loading league updates…</div>', news_html)
        path.write_text(text, encoding="utf-8")

    generated = str(league.get("generated_at") or "")[:10]
    lastmod = generated if re.fullmatch(r"\d{4}-\d{2}-\d{2}", generated) else date.today().isoformat()
    sitemap = ROOT / "sitemap.xml"
    stext = sitemap.read_text(encoding="utf-8")
    dynamic_urls = ["/", "/matches/", "/standings/", "/franchises/", "/franchises/d20/", "/franchises/solace-path/", "/franchises/gravewardens/", "/franchises/frozen/", "/franchises/glow-stick-gang/", "/franchises/ficticious-esports/", "/players/", "/stats/", "/history/", "/league/", "/how-it-works/", "/news/", "/watch/"]
    for suffix in dynamic_urls:
        pattern = rf'(<loc>{re.escape(HOST + suffix)}</loc><lastmod>)\d{{4}}-\d{{2}}-\d{{2}}(</lastmod>)'
        stext = re.sub(pattern, rf'\g<1>{lastmod}\g<2>', stext)
    sitemap.write_text(stext, encoding="utf-8")


if __name__ == "__main__":
    main()
