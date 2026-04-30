# Incident Response Runbook

This document is the on-call playbook for The Altar production incidents.
Updated 2026-04-30 (Audit 04).

## Incident severity

| Severity | Definition                                                       | Response time |
|----------|------------------------------------------------------------------|---------------|
| SEV-1    | Production down, user data exposed, or auth fully broken         | 15 minutes    |
| SEV-2    | A core feature broken for all users (e.g. signup, prayer wall)   | 1 hour        |
| SEV-3    | A non-core feature broken or partial outage (TTS, maps, music)   | 1 business day|
| SEV-4    | Cosmetic, single-user, or low-impact regression                  | Next sprint   |

## Response procedure

1. **Acknowledge.** Note the time you started and what you saw.
2. **Communicate.** Drop a one-line update in the team channel:
   `INCIDENT (SEV-N) — <short symptom> — investigating.`
3. **Stop the bleeding.** Roll back if a recent deploy is the suspect — see
   [`DEPLOYMENT.md`](./DEPLOYMENT.md).
4. **Investigate.** Follow the section below that matches the incident type.
5. **Resolve.** Confirm the symptom is gone end-to-end.
6. **Postmortem.** Within 48 hours, write a brief postmortem capturing:
   - Timeline (detected, mitigated, resolved).
   - Root cause.
   - What we changed (code / config / process).
   - What we'll do to prevent recurrence.

## Quick links

- Vercel dashboard: https://vercel.com/ (project → The Altar)
- Supabase dashboard: https://supabase.com/dashboard
- GitHub repo: https://github.com/weikelkkw/altarapp
- Status page: TODO (none set up yet — see MANUAL_ACTIONS.md)
- Health endpoint: `/api/health`

## Common scenarios

### A. Production is returning 5xx

1. Check Vercel "Deployments" → is the latest deploy green?
2. If a deploy just shipped, **roll back** (see DEPLOYMENT.md).
3. Check Vercel runtime logs for the failing route.
4. If Supabase is the cause, check https://status.supabase.com.

### B. Auth is broken (users cannot sign in)

1. Verify Supabase Auth is up: dashboard → Authentication.
2. Check that the env vars `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel match the Supabase project.
3. Test the public `getSession()` flow with `curl` against the Supabase
   token endpoint.
4. If keys were rotated and the old anon key is still in Vercel, update it.

### C. A secret has leaked

1. **Rotate the secret in the source dashboard immediately.** Do NOT wait
   for the post-mortem.
2. Update the secret in Vercel project settings (Production + Preview).
3. Redeploy by pushing an empty commit:
   `git commit --allow-empty -m "Force redeploy after secret rotation" && git push`
4. Scrub the secret from any logs, error tracker, or chat history.
5. Run `gitleaks detect --no-git -v` against the repo + history to confirm
   no other instances exist.
6. File the rotation as a CRITICAL item in MANUAL_ACTIONS.md if it isn't
   already.

### D. Database (Supabase) outage

1. Check https://status.supabase.com.
2. If short (< 5 min), allow the platform's HA to recover.
3. If extended, post a banner on the homepage explaining the outage.
4. If data corruption is suspected, **freeze writes** by disabling the
   service role key (Supabase dashboard → Settings → API → revoke).
5. Restore from PITR if necessary — see "Backup verification drill" in
   MANUAL_ACTIONS.md.

### E. Suspicious traffic / abuse

1. Check Vercel firewall logs for traffic patterns.
2. Apply a firewall rule to block the offending UA / IP / pattern.
3. If the abuse is credential stuffing, enable the Captcha-on-auth manual
   item from MANUAL_ACTIONS.md ASAP.

## Emergency secret rotation

For the keys listed in MANUAL_ACTIONS.md under CRITICAL:

1. `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → "Reset service_role key".
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` — rotates with the JWT secret.
3. `BIBLE_API_KEY` — scripture.api.bible dashboard.
4. `ANTHROPIC_API_KEY` — console.anthropic.com → API Keys.
5. `ELEVENLABS_API_KEY` — elevenlabs.io → Profile → API Keys.
6. `MAPBOX_SECRET_TOKEN` + `NEXT_PUBLIC_MAPBOX_TOKEN`.
7. `SPOTIFY_CLIENT_SECRET`.

After rotating each, paste the new value into Vercel project settings under
Environment Variables (Production + Preview), then push an empty commit
to force a redeploy.

## Post-incident

Add the incident to a running log (today: nothing — this is the first
runbook commit). Each entry should answer:

- **What happened?** (in plain English)
- **Why did it happen?** (root cause, not just trigger)
- **How was it caught?** (alert? user report? luck?)
- **What did we change?** (code, config, monitoring, process)
- **What's still open?** (follow-ups, owners, dates)
