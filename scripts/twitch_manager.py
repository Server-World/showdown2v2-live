#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "data" / "twitch-control.json"
LEAGUE = ROOT / "data" / "league.json"
NEXT_REFRESH_PATH = Path(os.environ.get("TWITCH_NEXT_REFRESH_PATH", "/tmp/twitch-next-refresh.txt"))


def request_json(url: str, *, method: str = "GET", headers: dict | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code}: {raw}") from exc


def form_post(url: str, fields: dict[str, str]):
    data = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OAuth refresh failed: HTTP {exc.code}: {raw}") from exc


def next_weekday_time(day_name: str, hhmm: str, zone_name: str) -> datetime:
    weekdays = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    target = weekdays[day_name.lower()]
    hour, minute = [int(part) for part in hhmm.split(":", 1)]
    zone = ZoneInfo(zone_name)
    now = datetime.now(zone)
    days = (target - now.weekday()) % 7
    candidate = (now + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=7)
    return candidate


def template_context() -> dict[str, str]:
    if not LEAGUE.exists():
        return {"season": "Season", "week": "", "format": "2v2"}
    league = json.loads(LEAGUE.read_text(encoding="utf-8"))
    season = league.get("season") or {}
    competition = league.get("competition") or {}
    return {
        "season": str(season.get("name") or "Season"),
        "week": str(season.get("week") or ""),
        "format": str(competition.get("format") or "2v2"),
    }


def render(value: object, context: dict[str, str]) -> str:
    text = str(value or "")
    try:
        return text.format_map(context)
    except (KeyError, ValueError):
        return text


def main() -> int:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    if not cfg.get("enabled"):
        print("Twitch control plane is installed but disabled. No Twitch API changes were attempted.")
        return 0

    context = template_context()
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    refresh_token = os.environ.get("TWITCH_REFRESH_TOKEN", "").strip()
    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError("Missing TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, or TWITCH_REFRESH_TOKEN")

    token = form_post("https://id.twitch.tv/oauth2/token", {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
    })
    access_token = token["access_token"]
    next_refresh = token["refresh_token"]
    NEXT_REFRESH_PATH.write_text(next_refresh, encoding="utf-8")

    status, validation = request_json(
        "https://id.twitch.tv/oauth2/validate",
        headers={"Authorization": f"OAuth {access_token}"},
    )
    if status != 200:
        raise RuntimeError("Twitch token validation failed")

    login = str(validation.get("login", "")).lower()
    user_id = str(validation.get("user_id", ""))
    token_client_id = str(validation.get("client_id", ""))
    scopes = set(validation.get("scopes") or [])
    required = {"channel:manage:broadcast", "channel:manage:schedule"}
    missing = sorted(required - scopes)
    if login != str(cfg.get("channel", "")).lower():
        raise RuntimeError(f"OAuth token belongs to {login!r}, expected {cfg.get('channel')!r}")
    if token_client_id != client_id:
        raise RuntimeError("OAuth token Client ID does not match TWITCH_CLIENT_ID")
    if missing:
        raise RuntimeError(f"OAuth token is missing scopes: {', '.join(missing)}")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Client-Id": client_id,
        "Content-Type": "application/json",
    }

    category_name = str(cfg.get("category") or "Rocket League")
    _, games = request_json(
        "https://api.twitch.tv/helix/games?" + urllib.parse.urlencode({"name": category_name}),
        headers=headers,
    )
    game_rows = (games or {}).get("data") or []
    if not game_rows:
        raise RuntimeError(f"Twitch category not found: {category_name}")
    game_id = game_rows[0]["id"]

    title = render(cfg.get("title") or "Supersonic Showdown League 2v2", context)
    if len(title) > 140:
        raise RuntimeError(f"Configured Twitch title exceeds 140 characters: {len(title)}")
    tags = [str(tag) for tag in (cfg.get("tags") or [])][:10]
    if any((not tag) or len(tag) > 25 or not tag.isalnum() for tag in tags):
        raise RuntimeError("Twitch tags must be non-empty, at most 25 characters, and contain only letters/numbers")

    channel_body = {
        "title": title,
        "game_id": game_id,
        "broadcaster_language": str(cfg.get("language") or "en"),
        "tags": tags,
    }
    request_json(
        "https://api.twitch.tv/helix/channels?" + urllib.parse.urlencode({"broadcaster_id": user_id}),
        method="PATCH",
        headers=headers,
        body=channel_body,
    )
    print(f"Updated Twitch channel metadata for @{login}: {channel_body['title']} / {category_name}")

    bio = render(cfg.get("bio") or "", context).strip()
    if bio:
        if len(bio) > 300:
            raise RuntimeError(f"Configured Twitch bio exceeds 300 characters: {len(bio)}")
        if "user:edit" in scopes:
            request_json(
                "https://api.twitch.tv/helix/users?" + urllib.parse.urlencode({"description": bio}),
                method="PUT",
                headers=headers,
            )
            print("Updated Twitch channel bio.")
        else:
            print("Bio is configured, but the current OAuth token lacks user:edit; reauthorization is required to apply it.")

    schedule = cfg.get("schedule") or {}
    if schedule.get("enabled"):
        zone_name = str(schedule.get("timezone") or "America/New_York")
        desired_local = next_weekday_time(
            str(schedule.get("day") or "Saturday"),
            str(schedule.get("time") or "21:30"),
            zone_name,
        )
        desired_weekday = desired_local.weekday()
        desired_hm = (desired_local.hour, desired_local.minute)
        desired_duration = int(schedule.get("duration_minutes") or 150)
        desired_schedule_title = render(schedule.get("title") or title, context)
        schedule_url = "https://api.twitch.tv/helix/schedule?" + urllib.parse.urlencode({"broadcaster_id": user_id})
        existing_segments = []
        try:
            _, current_schedule = request_json(schedule_url, headers=headers)
            existing_segments = ((current_schedule or {}).get("data") or {}).get("segments") or []
        except RuntimeError as exc:
            if "HTTP 404" not in str(exc):
                raise

        zone = ZoneInfo(zone_name)
        matched_segment = None
        for segment in existing_segments:
            if not segment.get("is_recurring"):
                continue
            start = datetime.fromisoformat(str(segment["start_time"]).replace("Z", "+00:00")).astimezone(zone)
            if start.weekday() == desired_weekday and (start.hour, start.minute) == desired_hm:
                matched_segment = segment
                break

        segment_body = {
            "timezone": zone_name,
            "duration": str(desired_duration),
            "category_id": game_id,
            "title": desired_schedule_title,
        }
        if matched_segment:
            request_json(
                "https://api.twitch.tv/helix/schedule/segment?" + urllib.parse.urlencode({
                    "broadcaster_id": user_id,
                    "id": str(matched_segment["id"]),
                }),
                method="PATCH",
                headers=headers,
                body=segment_body,
            )
            print(f"Updated recurring Twitch schedule: {schedule.get('day')} {schedule.get('time')} {zone_name}")
        else:
            create_body = {
                **segment_body,
                "start_time": desired_local.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                "is_recurring": bool(schedule.get("recurring", True)),
            }
            request_json(
                "https://api.twitch.tv/helix/schedule/segment?" + urllib.parse.urlencode({"broadcaster_id": user_id}),
                method="POST",
                headers=headers,
                body=create_body,
            )
            print(f"Created recurring Twitch schedule: {schedule.get('day')} {schedule.get('time')} {zone_name}")

    _, channel_info = request_json(
        "https://api.twitch.tv/helix/channels?" + urllib.parse.urlencode({"broadcaster_id": user_id}),
        headers=headers,
    )
    current = ((channel_info or {}).get("data") or [{}])[0]
    print(f"Verified channel: title={current.get('title')!r}, game={current.get('game_name')!r}, tags={current.get('tags')!r}")

    if "user:edit" in scopes:
        _, user_info = request_json(
            "https://api.twitch.tv/helix/users?" + urllib.parse.urlencode({"id": user_id}),
            headers=headers,
        )
        user = ((user_info or {}).get("data") or [{}])[0]
        if bio and str(user.get("description") or "") != bio:
            raise RuntimeError("Twitch bio verification failed")
        if bio:
            print("Verified channel bio.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Twitch manager failed: {exc}", file=sys.stderr)
        raise
