# SSL Twitch Management

Official channel: `supersonicshowdownleague`

The public website Watch experience is credential-free. Twitch channel management runs through an authenticated GitHub Actions control plane.

## Public Twitch app identity

Client ID: `t7jpnnmogidiklg5ewts755ku9zkr6`

Twitch considers Client IDs public. Do not commit or paste the Client Secret, OAuth access token, or refresh token.

## One-time authorization

Only one GitHub Actions repository secret is required:

- `TWITCH_CLIENT_SECRET` — the Client Secret from the Twitch Developer Console application.

The device bootstrap requests exactly these scopes:

- `channel:manage:broadcast`
- `channel:manage:schedule`

After the private Client Secret is stored in GitHub Actions, set `data/twitch-bootstrap.json` to `requested: true`. The `Twitch OAuth bootstrap` workflow will produce a Twitch activation URL/code and wait for the channel owner to approve access. After approval it validates that the authorized login is exactly `supersonicshowdownleague`, encrypts the refresh token using a key derived from the Client Secret, commits only the encrypted token, sets the bootstrap request back to false, and enables `data/twitch-control.json`.

Raw OAuth tokens are never committed.

## Ongoing desired-state control

Edit `data/twitch-control.json` to manage the Twitch stream title, Rocket League category, tags, language, and recurring Saturday schedule. When enabled, `Twitch channel manager` decrypts the stored refresh token, refreshes OAuth, verifies the authenticated login and scopes, applies the desired state, and safely rotates the encrypted refresh token.

Setting `enabled` back to `false` disables Twitch API writes while leaving the public Watch page operational.
