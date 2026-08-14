#!/usr/bin/env python3
"""Convert a successful TrueNAS Ops Bridge Player Card query into the website feed.

This script is intentionally offline. It accepts a previously produced bridge-result
JSON file, validates the public contract, preserves any already-approved avatar_url
for matching gamertags, and writes data/player-profiles.json.

It never contacts Discord, TrueNAS, PostgreSQL, or GitHub and never accepts raw SQL.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SOURCE_OF_TRUTH = "SSL Bot + PostgreSQL via read-only Ops Bridge"

PUBLIC_FIELDS = (
    "gamertag",
    "team",
    "tier",
    "franchise",
    "franchise_tag",
    "mmr",
    "mmr_is_locked",
    "eligibility_label",
    "roster_status",
    "tracker_status",
    "slp",
    "iron_man_weeks",
    "iron_man_target",
    "iron_man_blue_eligible",
    "iron_man_gold_eligible",
    "iron_man_badge",
    "league_standing",
    "recent_record",
    "season_series",
    "season_wins",
    "season_losses",
    "season_win_pct",
    "season_goals",
    "season_assists",
    "season_saves",
    "season_shots",
    "season_score",
    "season_mvps",
    "career_games",
    "career_wins",
    "career_losses",
    "career_goals",
    "career_assists",
    "career_saves",
    "career_shots",
    "career_score",
    "career_mvps",
    "career_win_pct",
    "awards_count",
    "season_number",
    "week_number",
    "avatar_url",
)

REQUIRED_FIELDS = {
    "gamertag",
    "team",
    "tier",
    "franchise",
    "franchise_tag",
    "mmr",
    "mmr_is_locked",
    "eligibility_label",
    "roster_status",
    "tracker_status",
    "slp",
    "iron_man_weeks",
    "iron_man_target",
    "iron_man_badge",
    "league_standing",
    "recent_record",
    "season_series",
    "season_wins",
    "season_losses",
    "season_win_pct",
    "season_goals",
    "season_assists",
    "season_saves",
    "season_shots",
    "season_score",
    "season_mvps",
    "career_games",
    "career_wins",
    "career_losses",
    "career_goals",
    "career_assists",
    "career_saves",
    "career_shots",
    "career_score",
    "career_mvps",
    "career_win_pct",
    "awards_count",
    "season_number",
    "week_number",
}

SAFE_AVATAR_PREFIXES = (
    "https://cdn.discordapp.com/",
    "https://media.discordapp.net/",
    "/assets/player-avatars/",
)


class SnapshotError(ValueError):
    """Raised when a bridge payload violates the website publication contract."""


def _normalize_gamertag(value: Any) -> str:
    return str(value or "").strip().casefold()


def _safe_avatar(value: Any) -> str | None:
    text = str(value or "").strip()
    if text and text.startswith(SAFE_AVATAR_PREFIXES):
        return text
    return None


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def existing_avatars(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    payload = load_json(path)
    players = payload.get("players") if isinstance(payload, dict) else None
    if not isinstance(players, list):
        return {}

    avatars: dict[str, str] = {}
    for row in players:
        if not isinstance(row, dict):
            continue
        gamertag = _normalize_gamertag(row.get("gamertag"))
        avatar = _safe_avatar(row.get("avatar_url"))
        if gamertag and avatar:
            avatars[gamertag] = avatar
    return avatars


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise SnapshotError("bridge result must be a JSON object")
    if payload.get("status") != "SUCCESS":
        raise SnapshotError(
            f"bridge result status must be SUCCESS, got {payload.get('status')!r}"
        )

    result = payload.get("result")
    if not isinstance(result, dict):
        raise SnapshotError("bridge result.result must be an object")
    if result.get("query_id") != "public_player_profiles":
        raise SnapshotError("bridge result query_id must be public_player_profiles")

    rows = result.get("result_rows")
    if not isinstance(rows, list) or not rows:
        raise SnapshotError("public_player_profiles returned no rows")

    output: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise SnapshotError(f"row {index} is not an object")

        lower_keys = {str(key).casefold() for key in row}
        forbidden = {
            key
            for key in lower_keys
            if key == "discord_id"
            or key.endswith("_token")
            or "password" in key
            or "secret" in key
            or (key.endswith("_url") and key != "avatar_url")
        }
        if forbidden:
            raise SnapshotError(
                f"row {index} contains forbidden public fields: {sorted(forbidden)}"
            )

        missing = sorted(field for field in REQUIRED_FIELDS if field not in row)
        if missing:
            raise SnapshotError(f"row {index} missing required fields: {missing}")

        gamertag = str(row.get("gamertag") or "").strip()
        if not gamertag:
            raise SnapshotError(f"row {index} has blank gamertag")

        published = {field: row.get(field) for field in PUBLIC_FIELDS if field in row}
        published["gamertag"] = gamertag
        output.append(published)

    return output


def build_snapshot(
    bridge_payload: Any,
    *,
    prior_avatars: dict[str, str] | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    rows = extract_rows(bridge_payload)
    avatars = prior_avatars or {}

    for row in rows:
        gamertag = _normalize_gamertag(row.get("gamertag"))
        incoming = _safe_avatar(row.get("avatar_url"))
        preserved = avatars.get(gamertag)
        if incoming:
            row["avatar_url"] = incoming
        elif preserved:
            row["avatar_url"] = preserved
        else:
            row.pop("avatar_url", None)

    rows.sort(key=lambda row: _normalize_gamertag(row.get("gamertag")))

    timestamp = generated_at or datetime.now(timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )
    return {
        "schema_version": 1,
        "generated_at": timestamp,
        "source_of_truth": SOURCE_OF_TRUTH,
        "players": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="Ops Bridge result JSON")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/player-profiles.json"),
        help="Website snapshot path",
    )
    args = parser.parse_args()

    bridge_payload = load_json(args.input)
    prior_avatars = existing_avatars(args.output)
    snapshot = build_snapshot(bridge_payload, prior_avatars=prior_avatars)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Published {len(snapshot['players'])} player profiles to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
