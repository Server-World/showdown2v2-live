#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SCOPES = ["channel:manage:broadcast", "channel:manage:schedule"]
DEVICE_PATH = Path(os.environ.get("TWITCH_DEVICE_PATH", "/tmp/twitch-device.json"))
REFRESH_PATH = Path(os.environ.get("TWITCH_BOOTSTRAP_REFRESH_PATH", "/tmp/twitch-bootstrap-refresh.txt"))
EXPECTED_LOGIN = os.environ.get("TWITCH_EXPECTED_LOGIN", "supersonicshowdownleague").strip().lower()


def post_form(url: str, fields: dict[str, str]) -> dict:
    data = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"message": raw}
        message = str(payload.get("message") or payload.get("error_description") or payload.get("error") or raw)
        error = RuntimeError(message)
        setattr(error, "status", exc.code)
        raise error from exc


def validate(access_token: str, client_id: str) -> None:
    req = urllib.request.Request(
        "https://id.twitch.tv/oauth2/validate",
        headers={"Authorization": f"OAuth {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    login = str(payload.get("login") or "").lower()
    token_client_id = str(payload.get("client_id") or "")
    scopes = set(payload.get("scopes") or [])
    missing = sorted(set(SCOPES) - scopes)
    if login != EXPECTED_LOGIN:
        raise RuntimeError(f"Authorized Twitch account is {login!r}; expected {EXPECTED_LOGIN!r}")
    if token_client_id != client_id:
        raise RuntimeError("Authorized token Client ID does not match the configured Twitch app")
    if missing:
        raise RuntimeError(f"Authorized token is missing scopes: {', '.join(missing)}")


def start(client_id: str) -> int:
    payload = post_form(
        "https://id.twitch.tv/oauth2/device",
        {"client_id": client_id, "scopes": " ".join(SCOPES)},
    )
    required = ["device_code", "user_code", "verification_uri", "expires_in", "interval"]
    if any(key not in payload for key in required):
        raise RuntimeError("Twitch device authorization response was incomplete")
    DEVICE_PATH.write_text(json.dumps(payload), encoding="utf-8")
    DEVICE_PATH.chmod(0o600)
    print(f"TWITCH_ACTIVATE_URL={payload['verification_uri']}", flush=True)
    print(f"TWITCH_USER_CODE={payload['user_code']}", flush=True)
    print(f"Authorization expires in {payload['expires_in']} seconds.", flush=True)
    return 0


def poll(client_id: str) -> int:
    if not DEVICE_PATH.exists():
        raise RuntimeError("Device authorization state is missing; run start first")
    device = json.loads(DEVICE_PATH.read_text(encoding="utf-8"))
    interval = max(int(device.get("interval") or 5), 1)
    deadline = time.monotonic() + max(int(device.get("expires_in") or 1800) - 5, 1)
    while time.monotonic() < deadline:
        try:
            token = post_form(
                "https://id.twitch.tv/oauth2/token",
                {
                    "client_id": client_id,
                    "scopes": " ".join(SCOPES),
                    "device_code": str(device["device_code"]),
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                },
            )
        except RuntimeError as exc:
            message = str(exc).lower()
            if "authorization_pending" in message:
                time.sleep(interval)
                continue
            if "slow_down" in message:
                interval += 5
                time.sleep(interval)
                continue
            raise
        access_token = str(token.get("access_token") or "")
        refresh_token = str(token.get("refresh_token") or "")
        if not access_token or not refresh_token:
            raise RuntimeError("Twitch authorization completed without an access/refresh token pair")
        validate(access_token, client_id)
        REFRESH_PATH.write_text(refresh_token, encoding="utf-8")
        REFRESH_PATH.chmod(0o600)
        print(f"Twitch authorization verified for @{EXPECTED_LOGIN} with required management scopes.", flush=True)
        return 0
    raise RuntimeError("Twitch device authorization expired before approval")


def main() -> int:
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    if not client_id:
        raise RuntimeError("TWITCH_CLIENT_ID is missing")
    if len(sys.argv) != 2 or sys.argv[1] not in {"start", "poll"}:
        raise RuntimeError("Usage: twitch_device_bootstrap.py start|poll")
    return start(client_id) if sys.argv[1] == "start" else poll(client_id)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Twitch bootstrap failed: {exc}", file=sys.stderr)
        raise
