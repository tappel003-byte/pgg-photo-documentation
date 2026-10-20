# Office + Sync — Netlify setup

Password-gated **office File Explorer** at `/office` and field **Sync to office**, all on Netlify (Blobs locker). No other cloud service is used.

## Netlify environment variables (required)

| Name | Purpose |
| --- | --- |
| `NLF_OFFICE_PASSWORD` | Shared company password for `/office`. |
| `NLF_SESSION_SECRET` | Random secret (16+ characters) that signs the office session cookie. |
| `NLF_FIELD_KEY` | Must match `PGG_FIELD_KEY` in `public/survey.html` (a public speed bump, not a real secret). |
| `SECRETS_SCAN_OMIT_KEYS` | Set to `NLF_FIELD_KEY`. `NLF_FIELD_KEY` itself must have "Contains secret values" OFF, or the build fails. |

## Limits (Blobs locker)

- Locker about 1 GB total
- Per-file and per-job size caps
- Daily upload limit across all phones
- Incomplete Sync pieces older than a few days are cleaned up when someone lists or uploads

## Netlify Free plan

Free gives 300 credits a month and stops the site when they run out. A production deploy costs 15 credits, so avoid unneeded deploys. After launch, use Project configuration → Build & deploy → "Stop builds" to freeze deploys.
