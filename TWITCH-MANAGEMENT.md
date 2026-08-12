# SSL Twitch Management

Official channel: `supersonicshowdownleague`

The public website Watch experience is credential-free. Twitch channel management and approved native Clip creation run through authenticated GitHub Actions control-plane paths.

## Public Twitch app identity

Client ID: `t7jpnnmogidiklg5ewts755ku9zkr6`

Twitch considers Client IDs public. Do not commit or paste the Client Secret, OAuth access token, or refresh token.

## One-time authorization

Only one GitHub Actions repository secret is required:

- `TWITCH_CLIENT_SECRET` — the Client Secret from the Twitch Developer Console application.

The device bootstrap requests exactly these scopes:

- `channel:manage:broadcast`
- `channel:manage:schedule`
- `channel:manage:clips`
- `user:edit`

`channel:manage:clips` is required for Twitch's Create Clip From VOD endpoint. Existing refresh tokens that were issued before this scope was added must be reauthorized before native VOD Clip creation can succeed.

After the private Client Secret is stored in GitHub Actions, set `data/twitch-bootstrap.json` to `requested: true`. The `Twitch OAuth bootstrap` workflow will produce a Twitch activation URL/code and wait for the channel owner to approve access. After approval it validates that the authorized login is exactly `supersonicshowdownleague`, encrypts the refresh token using a key derived from the Client Secret, commits only the encrypted token, sets the bootstrap request back to false, and enables `data/twitch-control.json`.

Raw OAuth tokens are never committed.

## Ongoing desired-state control

Edit `data/twitch-control.json` to manage the Twitch stream title, Rocket League category, tags, language, and recurring Saturday schedule. When enabled, `Twitch channel manager` decrypts the stored refresh token, refreshes OAuth, verifies the authenticated login and scopes, applies the desired state, and safely rotates the encrypted refresh token.

Setting `enabled` back to `false` disables Twitch channel-metadata writes while leaving the public Watch page operational.

## Approved Clip Candidate → native Twitch Clip

The editorial review system must treat an AI-selected timestamp as a **Clip Candidate**, not as a Twitch Clip.

Canonical lifecycle:

`candidate -> approved/rejected -> twitch_clip_created -> website highlight -> optional short derivative`

Rejected candidates stop permanently at `rejected`. Approved candidates may be submitted to the `Create approved Twitch VOD clip` workflow. The workflow refuses any payload whose status is not exactly `approved`.

Required candidate fields:

```json
{
  "candidate_id": "review-system-id",
  "status": "approved",
  "vod_id": "2841813940",
  "start": "20:02",
  "end": "20:24",
  "title": "Teammate chaos turns into an impossible angle goal"
}
```

The workflow:

1. validates the approval status and 5–60 second duration;
2. decrypts the existing SSL Twitch refresh token without exposing it;
3. calls Twitch `POST /helix/videos/clips` using the broadcaster as editor;
4. verifies the returned Clip ID through Get Clips;
5. persists the rotated refresh token encrypted;
6. adds the verified native Twitch Clip to `data/media.json` as a Watch-page highlight;
7. does **not** render a Short or Reel.

The same workflow accepts `repository_dispatch` event type `ssl_clip_approved`, allowing the review UI/automation to invoke it directly after a human approval decision. The `workflow_dispatch` form remains available for controlled manual recovery/testing.

## Clip creation source

`scripts/twitch_clip_creator.py` is the fail-closed writer. It accepts only one approved candidate at a time, supports seconds / `MM:SS` / `HH:MM:SS` timestamps, enforces Twitch's 5–60 second duration boundary, validates OAuth identity and `channel:manage:clips`, creates the native Twitch Clip from the VOD, and returns public Clip metadata only. `--dry-run` validates candidate payloads without Twitch API writes.

Short rendering remains a separate downstream product and is never triggered merely because a native Twitch Clip was created.
