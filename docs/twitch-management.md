# SSL Twitch Management

Official channel: `supersonicshowdownleague`

The website broadcast surface is public and credential-free. Channel management is separated into an authenticated GitHub Actions control plane.

## Desired-state control

Edit `data/twitch-control.json` to manage the Twitch stream title, Rocket League category, channel tags, language, and recurring Saturday schedule. The manager is intentionally committed with `enabled: false` until OAuth is configured.

## One-time repository secrets

Configure these GitHub Actions repository secrets before enabling the control file:

- `TWITCH_CLIENT_ID` — Client ID from the registered Twitch developer application.
- `TWITCH_CLIENT_SECRET` — client secret from that application.
- `TWITCH_REFRESH_TOKEN` — initial user refresh token created with Authorization Code Grant for the `supersonicshowdownleague` account.
- `TWITCH_TOKEN_KEY` — a long random encryption passphrase used only to protect the rotating refresh token at rest in the repository.

The Twitch authorization must include both scopes:

- `channel:manage:broadcast`
- `channel:manage:schedule`

After the first successful run, the workflow encrypts the rotated refresh token into `data/.twitch-refresh.enc`. Subsequent management runs decrypt that token with `TWITCH_TOKEN_KEY`, refresh OAuth, validate that the authenticated login is exactly `supersonicshowdownleague`, apply the desired channel state, and re-encrypt the newest refresh token. Raw OAuth tokens are never committed.

## Safety

The manager refuses to run if the OAuth token belongs to a different Twitch login, if required scopes are missing, or if credentials are absent. Setting `enabled` back to `false` disables all Twitch API writes while leaving the website Watch page operational.
