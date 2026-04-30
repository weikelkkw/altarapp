# Deployment

The Altar deploys to Vercel via GitHub integration.

## Environments

| Environment | URL                       | Branch       | Trigger         |
|-------------|---------------------------|--------------|-----------------|
| Production  | https://thealtar.app      | `main`       | push to `main`  |
| Preview     | per-PR `*.vercel.app`     | feature PRs  | open / push PR  |
| Local       | `http://localhost:3002`   | (any)        | `npm run dev`   |

## Deploy

```bash
git push origin main
```

That's the entire deploy. Vercel watches `main` and ships within ~2 minutes.
Confirm the new commit reaches `origin/main` before declaring the deploy
complete; the push **is** the deploy.

The local repo intentionally does **not** have a `.vercel/` link checked in
(it's gitignored). Do not run `vercel link` or `vercel --prod` from the
repo — let the GitHub integration handle it.

## Rollback

Vercel's "Promote to Production" UI is the fastest path:

1. Open the Vercel dashboard → The Altar project → Deployments.
2. Find the last known-good deployment.
3. Click ⋯ → **Promote to Production**.
4. Verify https://thealtar.app loads the rolled-back version.

If the offending commit also broke a database migration, the rollback is
**not complete** until the migration is reversed. Migrations are forward-only
by default — write a new compensating migration in `supabase/migrations/`
to undo schema changes if needed, then redeploy.

## Smoke test (post-deploy)

After every production deploy, manually verify:

- [ ] https://thealtar.app loads the home tab without console errors.
- [ ] `/api/health` returns `200 {"status":"ok",...}`.
- [ ] `/bible/auth` renders and a fresh signup completes end-to-end.
- [ ] Prayer Wall posts load (community tab → Prayer Wall).
- [ ] Settings → Account → Export My Data downloads a JSON file.
- [ ] Settings → Account → Delete My Account is reachable (do not run).

If any of the above fail, roll back per the procedure above and open an
incident per [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md).

## Migrations during deploy

Code that depends on a new migration must wait for the migration to land in
Supabase before the code is merged. The deploy order is:

1. Apply migration via Supabase SQL editor or `supabase db push`.
2. Verify the new tables / policies in the SQL editor.
3. Merge + push the dependent code to `main`.

Never merge code that references a table that does not yet exist in
production Supabase.
