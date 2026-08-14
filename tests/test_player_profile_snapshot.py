import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "player_profile_snapshot.py"
SPEC = importlib.util.spec_from_file_location("player_profile_snapshot", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not import player_profile_snapshot")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def jen_row():
    return {
        "gamertag": "Jen",
        "team": "Ebon Watch",
        "tier": "Elite",
        "franchise": "GraveWardens",
        "franchise_tag": "GWS",
        "mmr": 1295,
        "mmr_is_locked": True,
        "eligibility_label": "Eligible to Play",
        "roster_status": "Verified",
        "tracker_status": "Not provided",
        "slp": 22,
        "iron_man_weeks": 4,
        "iron_man_target": 6,
        "iron_man_blue_eligible": False,
        "iron_man_gold_eligible": False,
        "iron_man_badge": "None",
        "league_standing": 1,
        "recent_record": "WWWW",
        "season_series": 4,
        "season_wins": 4,
        "season_losses": 0,
        "season_win_pct": 100,
        "season_goals": 24,
        "season_assists": 18,
        "season_saves": 19,
        "season_shots": 61,
        "season_score": 7693,
        "season_mvps": 1,
        "career_games": 0,
        "career_wins": 0,
        "career_losses": 0,
        "career_goals": 0,
        "career_assists": 0,
        "career_saves": 0,
        "career_shots": 0,
        "career_score": 0,
        "career_mvps": 0,
        "career_win_pct": 0,
        "awards_count": 0,
        "season_number": 2,
        "week_number": 7,
    }


def bridge_payload(row=None):
    return {
        "status": "SUCCESS",
        "result": {
            "query_id": "public_player_profiles",
            "result_rows": [row or jen_row()],
        },
    }


class PlayerProfileSnapshotTests(unittest.TestCase):
    def test_builds_discord_v5_equivalent_public_profile(self):
        snapshot = MODULE.build_snapshot(
            bridge_payload(),
            generated_at="2026-08-14T21:40:00Z",
        )
        self.assertEqual(snapshot["schema_version"], 1)
        self.assertEqual(snapshot["generated_at"], "2026-08-14T21:40:00Z")
        self.assertEqual(len(snapshot["players"]), 1)
        player = snapshot["players"][0]
        self.assertEqual(player["gamertag"], "Jen")
        self.assertEqual(player["mmr"], 1295)
        self.assertEqual(player["league_standing"], 1)
        self.assertEqual(player["season_goals"], 24)
        self.assertEqual(player["season_score"], 7693)

    def test_preserves_only_approved_existing_avatar(self):
        snapshot = MODULE.build_snapshot(
            bridge_payload(),
            prior_avatars={
                "jen": "https://cdn.discordapp.com/avatars/example/avatar.png"
            },
        )
        self.assertEqual(
            snapshot["players"][0]["avatar_url"],
            "https://cdn.discordapp.com/avatars/example/avatar.png",
        )

    def test_rejects_discord_id(self):
        row = jen_row()
        row["discord_id"] = "1158071366151585913"
        with self.assertRaises(MODULE.SnapshotError):
            MODULE.build_snapshot(bridge_payload(row))

    def test_rejects_raw_private_url(self):
        row = jen_row()
        row["steam_url"] = "https://example.invalid/private"
        with self.assertRaises(MODULE.SnapshotError):
            MODULE.build_snapshot(bridge_payload(row))

    def test_rejects_non_success_bridge_result(self):
        payload = bridge_payload()
        payload["status"] = "REJECTED"
        with self.assertRaises(MODULE.SnapshotError):
            MODULE.build_snapshot(payload)


if __name__ == "__main__":
    unittest.main()
