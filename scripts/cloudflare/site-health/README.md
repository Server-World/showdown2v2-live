# SSL Production Site Health Worker

Deterministic Cloudflare Cron monitor for the public Supersonic Showdown League website.

## What it checks every 15 minutes

- Public route availability for the homepage and primary league sections.
- `robots.txt` and `sitemap.xml` availability and basic expected content.
- The four browser-required JSON feeds are HTTP 200 and valid JSON.
- Internal/protected paths remain HTTP 404, including `CNAME`, `.github`, scripts/docs, Wrangler/log artifacts, and Twitch auth/control data.
- The homepage still contains GTM, JSON-LD, and autoplay/muted/loop video markers.
- `www.showdown2v2.live` still returns a 301 to the apex while preserving path and query string.

## Security model

This Worker has **no secrets and no mutation authority**. It only fetches public URLs, emits structured logs, and fails its scheduled invocation when a deterministic production check fails.

Workers Logs/observability are enabled in `wrangler.jsonc`. Configure Cloudflare Notifications for Worker/Cron errors so a failed scheduled invocation becomes an operational alert without giving the monitor credentials to GitHub, Discord, or any other system.

## Source boundary

This project intentionally lives under `scripts/`, which is already excluded by the production website `.assetsignore`. Its source/config therefore cannot become a public website asset when the main `showdown2v2-live` Worker is deployed.

## Local validation

```bash
npm run check
```

The scheduled handler can also be exercised with Wrangler's local scheduled-handler endpoint before production deployment.

## Rollback

Disable/remove the `*/15 * * * *` Cron Trigger or delete the `ssl-site-health` Worker. This monitor is read-only and has no effect on the production website Worker, DNS, or GitHub source.
