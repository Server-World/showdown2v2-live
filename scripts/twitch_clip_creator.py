#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CONFIG = Path(__file__).resolve().parents[1] / "data" / "twitch-control.json"
REQUIRED_SCOPE = "channel:manage:clips"


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


def form_post(url: str, fields: dict[str, str]) -> dict:
    data = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OAuth refresh failed: HTTP {exc.code}: {raw}") from exc


def parse_clock(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip()
    if not text:
        raise ValueError("timestamp is empty")
    try:
        return float(text)
    except ValueError:
        pass
    parts = text.split(":")
    if len(parts) not in {2, 3}:
        raise ValueError(f"unsupported timestamp {text!r}; expected seconds, MM:SS, or HH:MM:SS")
    nums = [float(part) for part in parts]
    if len(nums) == 2:
        minutes, seconds = nums
        return minutes * 60 + seconds
    hours, minutes, seconds = nums
    return hours * 3600 + minutes * 60 + seconds


def normalize_candidate(candidate: dict) -> dict:
    status = str(candidate.get("status") or "").strip().lower()
    if status != "approved":
        raise ValueError(f"candidate status must be 'approved', got {status or '<missing>'!r}")

    vod_id = str(candidate.get("vod_id") or "").strip()
    title = str(candidate.get("title") or "").strip()
    if not vod_id:
        raise ValueError("candidate vod_id is required")
    if not title:
        raise ValueError("candidate title is required")

    start = parse_clock(candidate.get("start_seconds", candidate.get("start")))
    end = parse_clock(candidate.get("end_seconds", candidate.get("end")))
    if start < 0 or end <= start:
        raise ValueError("candidate timestamps must satisfy 0 <= start < end")

    # Twitch requires an integer VOD offset identifying the clip end, while
    # duration may use 0.1-second precision. Preserve the requested start as
    # closely as the endpoint allows.
    vod_offset = int(round(end))
    duration = round(vod_offset - start, 1)
    if not 5 <= duration <= 60:
        raise ValueError(f"native Twitch Clip duration must be 5-60 seconds; got {duration:.1f}")

    return {
        "candidate_id": str(candidate.get("candidate_id") or candidate.get("id") or "").strip(),
        "status": "approved",
        "vod_id": vod_id,
        "title": title,
        "start_seconds": round(start, 1),
        "end_seconds": round(end, 1),
        "vod_offset": vod_offset,
        "duration": duration,
    }


def load_candidate(path: str | None) -> dict:
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    if sys.stdin.isatty():
        raise ValueError("provide --candidate FILE or pipe one candidate JSON object on stdin")
    return json.loads(sys.stdin.read())


def refreshed_token() -> tuple[str, str, str]:
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    refresh_token = os.environ.get("TWITCH_REFRESH_TOKEN", "").strip()
    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError("Missing TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, or TWITCH_REFRESH_TOKEN")

    token = form_post(
        "https://id.twitch.tv/oauth2/token",
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
    )
    return client_id, str(token["access_token"]), str(token["refresh_token"])


def validate_identity(access_token: str, client_id: str, expected_login: str) -> str:
    _, payload = request_json(
        "https://id.twitch.tv/oauth2/validate",
        headers={"Authorization": f"OAuth {access_token}"},
    )
    login = str((payload or {}).get("login") or "").lower()
    user_id = str((payload or {}).get("user_id") or "")
    token_client_id = str((payload or {}).get("client_id") or "")
    scopes = set((payload or {}).get("scopes") or [])
    if login != expected_login:
        raise RuntimeError(f"OAuth token belongs to {login!r}, expected {expected_login!r}")
    if token_client_id != client_id:
        raise RuntimeError("OAuth token Client ID does not match TWITCH_CLIENT_ID")
    if REQUIRED_SCOPE not in scopes:
        raise RuntimeError(
            f"OAuth token is missing {REQUIRED_SCOPE}; reauthorize using the Twitch OAuth bootstrap"
        )
    if not user_id:
        raise RuntimeError("Twitch token validation did not return a user_id")
    return user_id


def create_vod_clip(candidate: dict, *, verify_seconds: int = 60) -> dict:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    expected_login = str(cfg.get("channel") or "supersonicshowdownleague").strip().lower()

    client_id, access_token, next_refresh = refreshed_token()
    user_id = validate_identity(access_token, client_id, expected_login)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Client-Id": client_id,
        "Content-Type": "application/json",
    }

    query = {
        "editor_id": user_id,
        "broadcaster_id": user_id,
        "vod_id": candidate["vod_id"],
        "vod_offset": str(candidate["vod_offset"]),
        "duration": f"{candidate['duration']:.1f}",
        "title": candidate["title"],
    }
    _, payload = request_json(
        "https://api.twitch.tv/helix/videos/clips?" + urllib.parse.urlencode(query),
        method="POST",
        headers=headers,
    )
    rows = (payload or {}).get("data") or []
    if len(rows) != 1 or not rows[0].get("id"):
        raise RuntimeError("Twitch Create Clip From VOD returned no clip ID")

    clip_id = str(rows[0]["id"])
    edit_url = str(rows[0].get("edit_url") or "")
    public_url = ""
    deadline = time.monotonic() + max(verify_seconds, 0)
    while True:
        _, check = request_json(
            "https://api.twitch.tv/helix/clips?" + urllib.parse.urlencode({"id": clip_id}),
            headers=headers,
        )
        clips = (check or {}).get("data") or []
        if clips:
            public_url = str(clips[0].get("url") or "")
            break
        if time.monotonic() >= deadline:
            break
        time.sleep(5)

    return {
        **candidate,
        "status": "twitch_clip_created" if public_url else "twitch_clip_created_unverified",
        "twitch_clip_id": clip_id,
        "twitch_clip_url": public_url,
        "twitch_edit_url": edit_url,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "_next_refresh_token": next_refresh,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create one native Twitch Clip from one explicitly approved SSL VOD clip candidate."
    )
    parser.add_argument("--candidate", help="Path to a candidate JSON object; stdin is used when omitted.")
    parser.add_argument("--output", help="Optional JSON result path. Does not contain OAuth secrets.")
    parser.add_argument("--next-refresh-path", help="Optional path for the rotated Twitch refresh token.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print the Twitch payload without API writes.")
    parser.add_argument("--verify-seconds", type=int, default=60)
    args = parser.parse_args()

    candidate = normalize_candidate(load_candidate(args.candidate))
    if args.dry_run:
        print(json.dumps({**candidate, "status": "dry_run", "endpoint": "POST /helix/videos/clips"}, indent=2))
        return 0

    result = create_vod_clip(candidate, verify_seconds=args.verify_seconds)
    next_refresh = result.pop("_next_refresh_token")

    refresh_path = args.next_refresh_path or os.environ.get("TWITCH_NEXT_REFRESH_PATH", "").strip()
    if refresh_path:
        path = Path(refresh_path)
        path.write_text(next_refresh, encoding="utf-8")
        path.chmod(0o600)

    if args.output:
        Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Twitch VOD clip creation failed: {exc}", file=sys.stderr)
        raise
