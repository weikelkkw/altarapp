# Backup, Recovery & Disaster Plan

This document is the canonical Disaster Recovery (DR) plan for **The Altar**.
It is the deliverable for Audit Sessions 05 (Backup_Recovery 1–3 + DR Trilogy
I/II/III). The audit-checklist coverage that produced it lives in
`~/Desktop/The Altar Actions/completed/05_*.md`.

Last reviewed: **2026-04-30** (next review: 2026-10-30).
Owner: Kenneth Weikel.

---

## 1. Asset Register

Every system that holds state The Altar depends on, classified by criticality
and data sensitivity, with explicit recovery targets.

| # | Asset | Type | Tier | Data | Hosted on | RPO | RTO |
|---|-------|------|------|------|-----------|-----|-----|
| 1 | Supabase Postgres (`trace_*` tables) | Primary DB | **T1** | Level A (PII, theological identity, prayer content) | Supabase managed | 5 min (PITR) | 4 h |
| 2 | Supabase Auth (`auth.users`) | Auth identity | **T1** | Level A (email, hashed password) | Supabase managed | 5 min (PITR) | 4 h |
| 3 | Vercel deployment + edge config | Compute / hosting | **T1** | Level C (compiled artifacts) | Vercel | 0 (immutable per deploy) | 15 min (rollback) |
| 4 | GitHub repo (`weikelkkw/altarapp`) | Source code | **T1** | Level B / C | GitHub | 0 (every push) | 1 h (clone+redeploy from any maintainer) |
| 5 | Vercel encrypted env vars | Secrets | **T1** | Level A | Vercel | n/a (manual rotation) | 30 min (re-paste from password manager) |
| 6 | DNS records for `thealtar.app` | DNS | **T1** | Level D (public) | (registrar — see `MANUAL_ACTIONS.md`) | n/a | 1 h (export + replay) |
| 7 | Domain registration `thealtar.app` | Domain | **T1** | Level B (ownership) | Registrar | n/a (yearly renewal) | 24–72 h (recover lapsed domain) |
| 8 | Anthropic Claude API state | Third-party | T2 | Level A in transit (user prompts) | console.anthropic.com | n/a (no retention contract today) | n/a (degraded-mode fallback) |
| 9 | ElevenLabs TTS state | Third-party | T3 | Level D | elevenlabs.io | n/a | n/a (TTS optional, app degrades gracefully) |
| 10 | scripture.api.bible (Bible text) | Third-party | T2 | Level D | API.Bible | n/a | 24 h (cache layer or alternate provider) |
| 11 | Mapbox tokens / styles | Third-party | T3 | Level D | mapbox.com | n/a | n/a (maps tab disabled if down) |
| 12 | Spotify OAuth tokens | Third-party | T3 | Level B (per-user OAuth refresh tokens stored in `trace_profiles.profile_data`) | Stored in T1 above | covered by T1 backup | covered by T1 backup |
| 13 | Vercel deploy logs / runtime logs | Observability | T3 | Level C | Vercel | n/a | n/a (platform-managed retention; Hobby ~30d, Pro ~90d) |

**T1 = revenue-or-trust-critical, data-loss is severe** (no revenue surface
yet, but T1 covers anything whose loss destroys user trust).
**T2 = operational** (degrades core features; user can still use parts of the
app).
**T3 = supporting** (loss is annoying, not catastrophic).

### Storage that is NOT in use

These were enumerated to confirm absence — recording it so a future engineer
doesn't assume they exist:

- **Supabase Storage buckets:** none. No file-upload feature in the app today.
  Verified: `grep -r "supabase.storage" src/` → 0 hits;
  `grep "storage" supabase/migrations/*.sql` → 0 hits. If Storage is added,
  this register and the runbooks must be updated.
- **S3 / Cloudinary / external object storage:** none.
- **Redis / KV cache:** none in production. The `src/lib/api/security.ts`
  rate limiter is in-memory per Lambda instance. Upstash Redis is on
  `MANUAL_ACTIONS.md` HIGH and would change this row when added.
- **Stripe / payment data:** none (verified in Session 04).
- **Twilio / SMS data:** none.
- **Email service (Resend/SendGrid):** none. Auth emails are sent by Supabase
  directly; no marketing email service yet.
- **Background jobs / queue / cron:** none. No scheduled jobs, no Vercel Cron,
  no background workers.

---

## 2. Recovery Standards

Every backup, every recovery procedure, must satisfy these standards before
The Altar holds real customer data at scale.

### 2.1 Backup standards (by tier)

| Standard | T1 | T2 | T3 |
|----------|----|----|----|
| Backup frequency | Continuous (PITR) | Daily | Best-effort |
| Retention | 7 days PITR + 30 days daily snapshots (Supabase Pro) | 7 days | None required |
| Cross-region copy | Required | Optional | None |
| Encryption at rest | **Required** | **Required** | Recommended |
| Encryption in transit | **Required** | **Required** | **Required** |
| Restore tested at least once before launch | **Required** | Recommended | Not required |
| Immutable / versioned for ransomware defense | **Required** | Recommended | Not required |
| 3-2-1 (3 copies, 2 media, 1 off-platform) | **Required** | Recommended | Not required |

### 2.2 Access recovery standards

- Every account in §1 has a documented break-glass recovery path.
- Every credential is stored in a password manager (1Password / Bitwarden /
  similar) plus a printed copy in a physical safe.
- Two humans must be able to regain access to every T1 account, OR the
  recovery email must be on a domain the founder still controls.
- 2FA is enabled on every T1 account; backup codes are stored offline.

### 2.3 DNS & domain standards

- Auto-renew enabled on `thealtar.app` (registrar-side check on
  `MANUAL_ACTIONS.md`).
- DNS records exported quarterly and stored in this repo under
  `docs/dns/thealtar-app-records.txt` (see §6.1 — automation TODO).
- Registrar 2FA enabled with recoverable backup codes.
- TTL ≤ 300s on `A`/`CNAME` records that may need fast failover.

### 2.4 Third-party dependency standards

- For every critical third party (§1 rows 8–11): documented failure mode +
  graceful-degradation path **in code**.
- API keys stored in Vercel encrypted env + password manager.
- No webhook deliveries today; if added, must use a retryable queue with a
  dead-letter sink before being declared production-ready.

### 2.5 Communication standards

- Status page: **TBD** — see `MANUAL_ACTIONS.md` HIGH (uptime monitor +
  status page). Recommended: BetterStack / Statuspage / Hyperping.
- Out-of-band channel: founder phone / SMS for now (single-operator); when
  a second human is added, designate a Signal group as backup channel.
- Customer communication templates: see §4 below.

### 2.6 Recovery testing standards

- T1 restore drill **at least once before public launch**, then quarterly.
- Tabletop exercise quarterly.
- DR plan review semi-annually (and after every architecture change).
- Full end-to-end recovery drill annually.

---

## 3. Constraints (non-negotiables)

These are the hard rules every recovery decision must satisfy. If a proposed
fix violates one, the fix is wrong.

- **No T1 asset without a tested, working backup.** Untested backups do not
  count.
- **No backup stored only in the same Supabase project as production.**
  Vercel + Supabase backups must be exportable to a separate location
  (e.g., a private GitHub Gist or off-platform encrypted disk) for ransomware
  defense.
- **No account with a single point of human failure.** Every T1 credential
  must be recoverable by at least one path that does not depend on the
  primary owner being available.
- **No critical credential stored only in one place.** Vercel env + password
  manager + offline backup is the rule.
- **No "we'll figure it out" in place of a written procedure** for any T1
  scenario. Runbooks live in §4 below.
- **No recovery path that depends on a service that might be the thing that's
  down.** (E.g., the Supabase recovery procedure cannot require reading
  Supabase docs from the affected project.)
- **No RPO/RTO target the current infra cannot deliver.** Every target in §1
  has been gut-checked against Supabase Pro's PITR window (7 days, ~5-min
  granularity) and Vercel's per-deploy immutability.
- **No DNS record that isn't exported.** No registrar account without a
  recovery path.

---

## 4. Recovery Runbooks (Tier 1)

Each runbook below assumes the operator has access to the **Vendor Contact
Dossier** (§5) and **Recovery Credentials** (§6). Each runbook follows the
template: trigger → roles → prep → steps → verification → communication →
post-incident.

### 4.1 RUNBOOK: Database corruption or accidental deletion

**Trigger:** Row counts drop unexpectedly, foreign-key cascade deletes a
table, a migration alters the wrong table, or a user / employee deletes data
that should not be deleted.

**Authority:** Owner (Kenneth) declares the incident. Any maintainer with
Supabase admin access can execute the runbook.

**Confirmation before acting:** Verify the data really is gone — query the
table directly in the Supabase SQL editor before assuming. Backups have
finite retention; a false alarm restore wastes the window.

#### Prep (first 5 minutes)

1. Open an incident channel / log entry: time, operator, symptom.
2. **Freeze writes** to the affected table by temporarily revoking the
   Supabase service-role key (Settings → API → "Reset"). Yes this breaks the
   running app — that is the point. Better a known outage than ongoing
   corruption.
3. Snapshot the current (corrupted) state to a backup table:
   `CREATE TABLE trace_X_corrupt_<UTC-timestamp> AS SELECT * FROM trace_X;`
   so the post-mortem has the broken version to compare to.

#### Recovery steps

1. **Identify the corruption window.** What time was the last known-good
   state? Check the GitHub commit log + Supabase audit log (Logs → Database).
2. **Decide PITR vs selective restore:**
   - If **only one table** is affected and the corruption is bounded:
     `pg_dump` from a separate restored snapshot, copy rows back manually.
   - If **multiple tables** corrupted or auth.users affected: full PITR.
3. **PITR (full restore) procedure:**
   1. Supabase dashboard → Project → Database → Backups → "Restore to point
      in time."
   2. Select the timestamp ~5 min before the corruption window.
   3. Supabase will provision a NEW project at that point in time — note the
      new project URL.
   4. **Do not delete the corrupted project yet.** Compare row counts and
      sanity-check the restored project before cutting over.
   5. Update `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel → Settings → Environment
      Variables to point at the new project.
   6. Force-redeploy: `git commit --allow-empty -m "Cut over to restored DB" && git push`.
   7. Verify `/api/health` returns 200 and a fresh signup completes.
   8. After 24 h of uneventful operation, the old corrupted project can be
      deleted.
4. **Selective restore (single-table) procedure:**
   1. Initiate a PITR to a *separate staging project* at the pre-corruption
      timestamp.
   2. From the staging project: `pg_dump --table=trace_X --data-only` then
      `psql` into prod with `INSERT … ON CONFLICT DO NOTHING` to merge.
   3. Verify row counts match the staging snapshot.
   4. Tear down the staging project.

#### Verification

- Row counts match the restore-target timestamp ±expected churn.
- Foreign-key integrity holds: run the `CHECK CONSTRAINT` queries in
  `supabase/migrations/20260430_audit_2_rls.sql`'s comments to confirm
  no orphans.
- A fresh login succeeds end-to-end (auth + profile load + a sample
  prayer-wall query).
- `/api/health` 200.

#### Communication

- **Status page:** "Investigating database integrity issue — service
  restored from backup at HH:MM UTC."
- **Customers:** "Between [start] and [end] UTC we restored a portion of
  the database from backup. If you posted in that window and don't see
  your post, please re-create it. We're sorry for the disruption."
- **Internal:** post-mortem within 48 h.

#### Post-incident

- Capture: corrupted table snapshot, full SQL log of the restore, Supabase
  support case number if escalated.
- Action items: write a regression test for the bug that caused the
  corruption; add a `BEFORE DELETE` trigger or RLS guard if user/employee
  deletion was the cause.

---

### 4.2 RUNBOOK: Ransomware / encryption attack

**Trigger:** Database rows replaced with attacker-supplied content; a ransom
note appears in `trace_profiles.bio` or similar; row volumes are unchanged
but content is unreadable.

**Authority:** Owner only. This is a **legal-notification event** under
GDPR/CCPA breach rules — counsel must be looped in within hours.

#### Prep (first 5 minutes)

1. **Disconnect the application.** Force-deploy a maintenance page by:
   - Vercel → set the `MAINTENANCE_MODE=1` env var (todo: implement the
     middleware) OR pause the deployment by pointing the domain to a
     static maintenance page.
2. **Revoke every credential** the attacker may have used:
   - Supabase service-role key (Settings → API → Reset).
   - Vercel API tokens (account → Tokens).
   - GitHub PATs.
   - Anthropic / ElevenLabs / Mapbox / Spotify keys.
3. **Preserve evidence**: snapshot the current DB state to a separate
   project for forensics before any restore.

#### Recovery steps

1. **Verify backup chain integrity:** Supabase PITR window should not be
   reachable by the attacker — Supabase admin requires Supabase login,
   which is decoupled from in-app credentials. Confirm this is still true
   by attempting to reach the PITR UI.
2. **PITR to before the attack timestamp.** Use the same procedure as 4.1
   step 3.
3. **Rotate ALL secrets** in `MANUAL_ACTIONS.md` CRITICAL list. Every key,
   not just the suspected entry point.
4. **Force re-authentication** for every user: in the new restored project,
   run `UPDATE auth.users SET updated_at = now()` to invalidate sessions.
5. **Audit the access log** (`trace_auth_events` from Audit 02) for the
   attacker's pattern; subscribe to alerts on similar patterns going
   forward.
6. **Notify users** within 72 h per GDPR Art. 33 / CCPA.

#### Verification

- All §4.1 verification items.
- Plus: every user must reauthenticate (verify by checking
  `auth.users.last_sign_in_at` post-cutover).
- Plus: no auth.users row was created during the attack window remains
  active (filter by created_at and revoke).

#### Communication

- **Customers:** required breach notification (template — see §4 of this
  runbook + counsel review).
- **Regulators:** GDPR DPA notification within 72 h if EU users affected.

---

### 4.3 RUNBOOK: Account compromise (admin credentials stolen)

**Trigger:** Suspicious sign-in to Supabase / Vercel / GitHub admin; key
appears in a public paste or breach feed; ADMIN_EMAILS user reports MFA
prompt they didn't initiate.

#### Recovery steps

1. **Sign the attacker out.** Supabase → Auth → revoke all sessions for the
   compromised account; Vercel → Account → revoke tokens; GitHub → Settings
   → revoke all PATs + active sessions.
2. **Rotate** the credential and any credentials that depended on it. If
   the GitHub account is compromised, rotate every secret stored in Vercel
   *and* in GitHub Actions secrets.
3. **Audit logs**: pull the last 30 days of access logs from each platform
   to identify what the attacker touched.
4. **If backups could have been deleted**: the Supabase admin role can
   delete PITR backups. If suspected, immediately **fork the project to a
   fresh region** to capture an immutable copy of the current state.
5. **Re-enable MFA** with new device(s); rotate backup codes.
6. **Counsel notification** if user data was accessible.

---

### 4.4 RUNBOOK: Vercel outage (short — < 30 min)

**Trigger:** `https://thealtar.app` returns 5xx broadly; Vercel status page
shows incident.

#### Recovery steps

1. **Verify** at https://vercel-status.com — is this region-wide?
2. **Wait** if Vercel ETA < 30 min. Vercel auto-recovers without
   intervention for most incidents.
3. **Communicate**: status page update + pinned tweet.
4. **Verify post-recovery**: run smoke tests from `docs/DEPLOYMENT.md`.

No code action required. The app does NOT have multi-CDN failover today;
Vercel outage = thealtar.app outage. This is acceptable for current scale.

---

### 4.5 RUNBOOK: Vercel outage (extended — > 4 h or permanent)

**Trigger:** Vercel ETA exceeds business tolerance, or Vercel terminates the
account.

#### Recovery steps

1. **Clone the repo** locally (every maintainer keeps a clone):
   `git clone git@github.com:weikelkkw/altarapp.git`.
2. **Provision an alternate host.** Options, in order:
   - Netlify (similar to Vercel, supports Next.js)
   - Cloudflare Pages + Workers
   - Self-host on Render / Fly.io
3. **Re-create env vars** from the password-manager backup (every var in
   `.env.example` plus the actual values from the vault).
4. **Update DNS** at the registrar to point `thealtar.app` to the new host.
   This is why TTL ≤ 300s on §2.3 is a non-negotiable.
5. **Verify**: `/api/health` 200 from the new host; smoke tests pass.

This is a multi-hour recovery (RTO ~4 h). Faster paths require an active
multi-host architecture, which is overkill at current scale.

---

### 4.6 RUNBOOK: DNS provider failure / domain registrar issue

**Trigger:** `thealtar.app` resolves to wrong IP / NXDOMAIN; renewal failure
email; registrar account locked.

#### Recovery steps

1. **Verify the symptom** with `dig +trace thealtar.app` from multiple
   resolvers (1.1.1.1, 8.8.8.8, your local). Don't trust your machine's
   cache.
2. **If the registrar is down**: most registrars have a separate API/portal
   in addition to their dashboard — try the alternate.
3. **If domain expired**: pay the renewal immediately. Most TLDs have a
   30-day grace period. After grace, reclaiming requires reseller
   intervention and is much more expensive.
4. **If account is locked**: support ticket + 2FA recovery codes from
   offline backup.
5. **DNS records** to restore from `docs/dns/thealtar-app-records.txt`
   (TODO — see automation in §6.1).

#### Standard DNS record set

The Altar's required DNS records (replay this if records are wiped):

```
Type    Name              Value                                  TTL
A       @                 76.76.21.21 (Vercel anycast)           300
CNAME   www               cname.vercel-dns.com.                  300
TXT     @                 "v=spf1 include:_spf.supabase.co ~all" 300
TXT     _dmarc            (TBD — see MANUAL_ACTIONS.md)          3600
```

The exact Vercel anycast IP may change; treat the live Vercel "Domains"
panel as the source of truth and re-export records quarterly.

---

### 4.7 RUNBOOK: Supabase outage (short)

**Trigger:** Auth fails for everyone; queries return 5xx; status.supabase.com
red.

#### Recovery steps

1. **Verify** at https://status.supabase.com — region-wide or this project?
2. If region-wide: wait. Communicate the outage; the app degrades to a
   read-mostly mode because every API route catches Supabase failures and
   returns a JSON error.
3. If only this project: Supabase support ticket (Supabase Pro contract).

The app does not have a Supabase-failover backup database. RPO/RTO from §1
assumes Supabase recovers within their SLA. Multi-region replication
(Supabase Pro+ feature) is a future scale item, not pre-launch.

---

### 4.8 RUNBOOK: Anthropic Claude API outage

**Trigger:** `/api/altar/chat`, `/api/altar/explain`, `/api/altar/quiz`,
`/api/altar/crossref` return 5xx; Anthropic status page red.

#### Recovery steps

1. The app **already handles this gracefully** — every Anthropic call site
   has a `response.ok` guard and returns a user-friendly error.
2. **Communicate** if outage is extended: status page update.
3. **No restoration action.** When Anthropic recovers, our endpoints
   recover automatically.

Future work: Anthropic outage is a partial degradation, not a full outage.
The Bible-reading tab still works. AI features are gated behind an Altar
mode that can be toggled off if needed.

---

### 4.9 RUNBOOK: ElevenLabs TTS outage

**Trigger:** `/api/tts` returns 5xx; ElevenLabs status page red.

#### Recovery steps

1. App-side, TTS failures are caught and the listen button shows an error
   toast. Users can keep reading.
2. **No restoration action.** TTS is T3.

---

### 4.10 RUNBOOK: Primary administrator unavailable

**Trigger:** Owner cannot be reached and a T1 incident is unfolding.

#### Recovery steps

1. **Designated successor** (TODO — see `MANUAL_ACTIONS.md` succession
   item): granted shared password-manager vault access and CODEOWNERS
   ownership. Until designated, this is a single-point-of-failure CRITICAL
   gap.
2. The successor follows the runbook above for the relevant scenario.
3. The DR plan itself (this doc) is stored in:
   - The repo at `docs/BACKUP_AND_RECOVERY.md`
   - A printed copy in the founder's physical safe
   - A backup copy on a private encrypted disk

---

## 5. Vendor contact dossier

| Vendor | Account ID / project | Support | Escalation | Most likely failure mode |
|--------|----------------------|---------|------------|--------------------------|
| Supabase | (project ID — see Supabase dashboard) | https://supabase.com/support | Pro plan: dashboard ticket | Auth outage, DB pool exhaustion |
| Vercel | thealtar.app project | https://vercel.com/help | dashboard ticket | Region outage, deploy failure |
| GitHub | weikelkkw/altarapp | https://support.github.com | Email | Account lock, 2FA recovery |
| Cloudflare / registrar | (registrar — see `MANUAL_ACTIONS.md`) | (varies) | (varies) | Domain expiry, DNS edit lock |
| Anthropic | console.anthropic.com | https://support.anthropic.com | console form | API outage |
| ElevenLabs | elevenlabs.io | https://help.elevenlabs.io | dashboard | API outage |
| API.Bible | scripture.api.bible | (form) | (low priority) | Rate limit, upstream outage |
| Mapbox | account.mapbox.com | https://support.mapbox.com | (rare) | Tile fetch outage |
| Spotify | developer.spotify.com | (community) | (no SLA) | OAuth scope changes |

This dossier must be **printed** and stored in the same physical safe as the
2FA backup codes; an attacker who has wiped the digital copies should not
be able to wipe the recovery contact list.

---

## 6. Automation candidates

These are improvements that turn manual procedures into automated ones.
Each item is on the post-launch backlog unless flagged otherwise.

### 6.1 DNS export (semi-automated, weekly)

A scheduled GitHub Action could `dig`-export every DNS record and commit it
to `docs/dns/thealtar-app-records.txt` so the repo is always a hot backup
of zone state. Tracked separately; not implemented this audit because the
registrar and exact zone are still being decided.

### 6.2 SBOM generation (DONE this audit)

Every CI build now writes a CycloneDX SBOM to artifacts (90-day retention).
See `.github/workflows/ci.yml`.

### 6.3 Backup verification drill (manual, quarterly — see MANUAL_ACTIONS)

Walk through §4.1 steps 3.1–3.7 against a throwaway staging project at
least once before launch and once per quarter after.

### 6.4 Tabletop exercise scenarios (quarterly)

Three ready-to-use scenarios for Q1/Q2/Q3 rotation:

1. **"The 2 AM page"** — Supabase prod project deleted by a typo in a
   migration. RTO/RPO drill. Use §4.1.
2. **"The leaked key"** — Anthropic key spotted in a public GitHub Gist.
   Walk through credential rotation per §4.3 and Audit 01 manual items.
3. **"The Vercel account suspension"** — billing card expired during
   travel, Vercel suspended the account, prod is dark. Use §4.5.

For each, time: detection → mitigation → resolution → post-mortem.
Document gaps in the runbook and update the doc.

---

## 7. Production readiness verdict

Per Audit 01–03 + DR Trilogy I/II/III checklist:

- ✅ T1 backups exist (Supabase managed, Vercel immutable, GitHub git).
- ✅ T1 restore procedures **documented** in §4.
- ⏳ T1 restore drills **not yet performed** — on `MANUAL_ACTIONS.md` HIGH.
- ✅ Backups encrypted at rest + in transit (Supabase managed defaults).
- ✅ No SPOF in source control (every maintainer can clone).
- ⏳ Cross-region backup copy: Supabase PITR is single-region; cross-region
  replication is a paid feature and on the post-launch list.
- ⏳ Tabletop exercise: not yet performed; first scheduled within 30 days
  per the audit's "or the whole thing decays" warning.
- ⏳ Status page: not yet stood up.
- ✅ Vendor dossier documented (this doc §5; needs printing).

**Verdict: CONDITIONAL CERTIFICATION** for backup & recovery — the *plan*
is production-grade; the *capability* is conditional on running the first
drill within 30 days. See `MANUAL_ACTIONS.md` HIGH for the drill checklist.

---

## 8. What this plan can survive that the prior plan could not

Before this audit, the runbook covered "what to do when prod is on fire."
After this audit, the plan covers:

- A migration that drops the wrong table.
- A ransomware attacker who reaches the database but not the Supabase admin
  panel.
- A Vercel account suspension during peak.
- A registrar account lock-out.
- The founder being unreachable while a T1 system is down (with the
  successor item resolved).
- A regulator asking for an SBOM of every shipped production build.
