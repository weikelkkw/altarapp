# Contributing

Internal contributor notes. The Altar is closed-source; external PRs are not
accepted at this time.

## Branching

- `main` is the production branch and auto-deploys to Vercel on push.
- For non-trivial changes, open a feature branch and PR into `main`.
- Pull-request reviews are required (see CODEOWNERS) once branch protection
  is enabled.

## Commit style

Follow the conventional pattern already in use:

```
<short imperative subject — under 70 chars>

<optional body explaining the why, not the what>
```

Examples from history:
- `Audit 03: Legal & Compliance — consent log, deletion/export, DMCA, accessibility`
- `Security audit pass: auth, rate limiting, SSRF guard, headers`

## Quality gates (CI)

Every pull request runs:
1. `npm run lint`
2. `npm run build`
3. `npm audit --audit-level=high`

Merges to `main` are blocked when any of the above fail.

## Migrations

Every schema change goes in `supabase/migrations/<YYYYMMDD>_<short-name>.sql`.
Never modify a migration that has already been applied to production —
write a new migration instead.

## Secrets

Never commit secrets. Use `.env.local` for development. All production
secrets live in the Vercel project settings.

If you accidentally commit a secret, rotate it immediately and follow the
emergency rotation procedure in [`docs/INCIDENT_RESPONSE.md`](./docs/INCIDENT_RESPONSE.md).
