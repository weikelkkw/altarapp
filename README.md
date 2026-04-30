# The Altar

A Bible study + community PWA. Next.js 16 + React 19, Supabase (Postgres + Auth),
server-side Anthropic Claude for study features, ElevenLabs for verse-by-verse
TTS, Mapbox for biblical maps, optional Spotify SDK for worship music.

Production: https://thealtar.app
Repo: https://github.com/weikelkkw/altarapp

## Local development

Requirements:

- Node.js (see [`.nvmrc`](./.nvmrc) — currently `20`)
- A Supabase project (free tier is fine)
- API keys for the services in [`.env.example`](./.env.example)

```bash
# 1. Install dependencies
npm ci

# 2. Configure env
cp .env.example .env.local
# fill in real keys

# 3. Apply database migrations
#    Either via the Supabase SQL editor (paste each file under
#    supabase/migrations/) or with the supabase CLI:
#    supabase db push

# 4. Run the dev server
npm run dev
# → http://localhost:3002
```

## Project layout

```
src/
  app/                Next.js App Router pages + API routes
    bible/            Main app surface (tabs, settings, prayer wall, etc.)
    api/              Server-only API endpoints
  lib/
    api/security.ts   verifyAuth, rateLimit, readJsonBody, getAdminClient
    api/audit.ts      auth-event audit logger
    api/log.ts        structured JSON logger for API routes
    legal/versions.ts policy version tracking
    supabase/         Supabase client factory
supabase/migrations/  Versioned SQL migrations
public/               Static assets (icons, manifest, jesus.jpg, etc.)
```

## Scripts

- `npm run dev` — local dev server on port 3002.
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm run lint` — ESLint + Next lint rules.

## Deployment

`main` is the production branch. Pushing to `main` triggers an automatic
Vercel deploy via GitHub integration. There is no separate deploy step — the
push **is** the deploy.

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full deploy +
rollback procedure, [`docs/INCIDENT_RESPONSE.md`](./docs/INCIDENT_RESPONSE.md)
for the on-call runbook, and
[`docs/BACKUP_AND_RECOVERY.md`](./docs/BACKUP_AND_RECOVERY.md) for the full
disaster-recovery plan (asset register, RPO/RTO, scenario runbooks).
Dependency posture and supply-chain controls live in
[`docs/DEPENDENCIES.md`](./docs/DEPENDENCIES.md).

## Security

Vulnerability reports go to **security@thealtarco.app** —
see [`SECURITY.md`](./SECURITY.md).

## License

Proprietary. All rights reserved.
