# DNS + Edge — Standards of Record

Owner: Kenneth Weikel
Last updated: 2026-04-30 (Audit Session 06)
Reviewed: every 6 months OR before any change to nameservers / hosting provider.

This document is the standard-of-record for The Altar's DNS and edge layer.
It exists to answer two questions for any future engineer:

1. What is the current state of `thealtar.app`?
2. What is the standard every change must satisfy before it goes live?

It is paired with `docs/BACKUP_AND_RECOVERY.md` §4.6 (DNS recovery
runbook) and the `MANUAL_ACTIONS.md` items under "DNS / registrar /
edge."

---

## 1. Current state — as of 2026-04-30

| Asset | Provider | Status |
|---|---|---|
| Domain `thealtar.app` | **Namecheap** (registrar) | Registered. Auto-renew status = **NOT VERIFIED** (MANUAL HIGH carryover from Session 05). |
| Authoritative DNS | Namecheap BasicDNS (`dns1/dns2.registrar-servers.com`) | Active, parking-page A record (`192.64.119.6`). |
| App hosting (planned) | Vercel | Repo is wired to deploy on push to `main`. Apex / `www` not yet flipped to Vercel — site is **not yet live in production**. |
| CDN / edge proxy | None | Vercel's built-in edge handles TLS / HTTP/3 / Brotli / cache. **Cloudflare is not in use.** |
| TLS issuer (planned) | Let's Encrypt via Vercel Managed Certificate | Will activate automatically when DNS flips to Vercel's verified targets. |
| Email | None configured | No `MX`, no `SPF`, no `DKIM`, no `DMARC`. Currently the domain sends no mail. The four legal mailboxes are still pending (`MANUAL_ACTIONS.md` CRITICAL — Session 03). |
| WAF / rate limiting | App-layer only | `src/lib/api/security.ts` runs a sliding-window in-memory limiter on `/api/altar/*` and `/api/tts`. Vercel Firewall is on `MANUAL_ACTIONS.md` HIGH (Session 01). |
| DNSSEC | Not enabled | Available at Namecheap; pending — see `MANUAL_ACTIONS.md`. |
| CAA records | None published | Pending — see `MANUAL_ACTIONS.md`. |

**The Altar is a single-domain, single-brand product.** The
"multi-brand zone reconciliation" check from Cloudflare Audit 1 Phase
10 is N/A by construction.

---

## 2. Why this is mostly a forward-looking document

The Cloudflare/DNS audit PDFs are written for a multi-brand,
Cloudflare-fronted application with Workers + R2 + Zero Trust + Access
groups. The Altar today has none of that. It runs on Vercel only, which
is closer to a *managed* edge — most of the controls those audits
recommend are Vercel-managed defaults, not opt-in dashboard work.

This doc therefore covers:

- The **DNS-layer controls** that apply *regardless* of edge provider
  (registrar lock, 2FA, CAA, DNSSEC, SPF/DKIM/DMARC, auto-renew, DS
  alignment).
- The **TLS / HTTPS controls** that apply to Vercel today (HSTS,
  TLS-min, Always-Use-HTTPS).
- The **deferred-but-documented** controls that would apply if/when
  Cloudflare or another CDN is fronted in (Full Strict, Authenticated
  Origin Pulls, Workers, R2, Zero Trust, Bot Management, etc.).

When any of those deferred items becomes real, this doc gets revised
*before* the change ships, not after.

---

## 3. Domain & registrar standard

These rules apply at the registrar (Namecheap today) and survive any
provider change.

| Rule | Why | Enforcement |
|---|---|---|
| Auto-renew **on**, with monitored payment method | Lapsed-domain outage is the most preventable T1 outage in `BACKUP_AND_RECOVERY.md` §4.6. | Manual at Namecheap (HIGH). |
| Registrar lock **on** | Prevents unauthorized transfer-out. | Manual at Namecheap (HIGH). |
| 2FA on the registrar account, with offline backup codes | A compromised registrar account = full domain takeover, including DNS pointing the site at attacker infrastructure. | Manual at Namecheap (HIGH). Backup codes printed + stored per Session 05 manual. |
| Documented backup administrator on the registrar account | A single-operator account dies with the operator. | Manual; tracked in `MANUAL_ACTIONS.md` MEDIUM (Session 05). |
| **API tokens at the registrar/DNS provider:** none today | Avoids credential surface; all DNS edits go through dashboard with 2FA. | If introduced, scope narrowly (zone-scope, no account-wide), rotate every 90 days, document each token + scope in `MANUAL_ACTIONS.md`. |

---

## 4. DNS record standard

For every authoritative zone (currently just `thealtar.app`):

### 4.1 Required records once Vercel is the production target

| Record | Value | Purpose |
|---|---|---|
| `A @` | Vercel-assigned IP | Apex resolution. |
| `CNAME www` | `cname.vercel-dns.com` | `www` → apex parity. |
| `TXT @` (verification) | Whatever Vercel issues | Domain ownership for cert issuance. |
| `CAA @` (3 records) | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"`, `0 iodef "mailto:security@thealtarco.app"` | Restrict who can issue certs for the domain + report attempted unauthorized issuance. |
| `TXT @` (SPF) | `"v=spf1 -all"` (no mail today) → flip to provider's SPF when mail launches | Hard-fail any spoofed mail-from until a real sender is configured. |
| `TXT _dmarc` | `"v=DMARC1; p=reject; rua=mailto:dmarc@thealtarco.app; adkim=s; aspf=s"` | Strict alignment + reject policy, in line with the "no mail today" stance. |

### 4.2 Records to AVOID

- Wildcard `*` records — only add with a documented reason.
- TTLs > 1 hour on records likely to change during incidents
  (apex `A`, `www` `CNAME`, anything pointed at hosting). Use **300 s
  (5 min)** during launch week, **3600 s (1 h)** after the configuration
  has been stable for 30 days.
- Dangling CNAMEs pointing at deprovisioned third parties (the
  classic subdomain takeover vector). Audit on every deprovisioning.
- Verification TXT records from services no longer in use (Search
  Console, Bing Webmasters, etc.). Remove on offboarding.

### 4.3 Email-authentication records (when mail launches)

The four legal mailboxes (`privacy@`, `legal@`, `dmca@`,
`accessibility@`, plus `security@`) on `MANUAL_ACTIONS.md` are pending.
When the mail provider is selected (likely Google Workspace or
Migadu), these records ship simultaneously:

- **SPF** — `v=spf1 include:<provider> -all` (hard fail).
- **DKIM** — provider-specific selector (e.g. `google._domainkey`).
- **DMARC** — start at `p=quarantine`, escalate to `p=reject` after 30
  days of clean reporting via `rua=`.
- **MTA-STS** + **TLS-RPT** — modern best practice for inbound mail
  encryption, optional pre-launch.
- **BIMI** — defer; requires VMC and mature DMARC reputation.

Until those records ship: **DMARC reject + null-SPF blocks any
spoofing of the domain**, even with no real mail traffic.

### 4.4 DNSSEC

Namecheap supports DNSSEC on BasicDNS. Plan:

1. Enable DNSSEC at Namecheap.
2. Capture the resulting DS record (algorithm, key tag, digest).
3. **Wait** before flipping the zone to a different DNS provider —
   DNSSEC chain breaks during nameserver changes are a real outage
   class. Disable DNSSEC, change nameservers, re-enable, in that order.
4. Verify the chain quarterly via `dig +dnssec thealtar.app` /
   `dnsviz.net`.

DS-record alignment is the single most common DNSSEC failure mode and
is what the "registrar DS matches the zone's DNSKEY" check on every
audit is asking about.

---

## 5. TLS / HTTPS standard

These controls apply at the active edge — currently Vercel, would be
Cloudflare if that is ever fronted in.

| Control | Current state | Standard |
|---|---|---|
| **Always-Use-HTTPS** | Vercel default = on. App-layer redirect via `next.config.ts` `upgrade-insecure-requests`. | Required. Any HTTP request must 308 to HTTPS, ideally at the edge before the app sees it. |
| **Min TLS version** | Vercel = TLS 1.2 floor; TLS 1.3 supported and negotiated by default. | TLS 1.2 minimum, TLS 1.3 preferred. Never enable TLS 1.0 / 1.1. |
| **HSTS** | `max-age=63072000; includeSubDomains; preload` (set in `next.config.ts:68`). | 2-year max-age + `includeSubDomains` + `preload`. Submit to `hstspreload.org` once the apex stabilizes on Vercel. |
| **Cert auto-renewal** | Vercel managed; auto-renew. | Required. Calendar reminder = 30 days before expiry as a backstop against silent renewal failure. |
| **Cert transparency monitoring** | Manual; not automated. | `MANUAL_ACTIONS.md` HIGH — set up a free CT-log monitor (e.g. crt.sh RSS or Cert Spotter) for `thealtar.app` so any unexpected issuance alerts the inbox. |
| **Origin direct access** | N/A — Vercel hides origin. | If/when Cloudflare is fronted in: enforce **Authenticated Origin Pulls** + an origin firewall that rejects everything not coming from Cloudflare IP ranges. Until then: not applicable. |
| **TLS Labs grade** | Not yet measured (site not live). | Target A+ once apex is on Vercel. Re-run after every header change. |

---

## 6. WAF / bot / DDoS posture

Today this is a single layer (the app's own rate limiter). The
Cloudflare-style multi-layer defense is documented here as the target
posture for whatever WAF provider is eventually fronted in.

### 6.1 Today

- App-layer **rate limiting** in `src/lib/api/security.ts` —
  sliding-window, per-user-or-IP, on `/api/altar/{chat,crossref,explain,quiz}`
  and `/api/tts`. In-memory only; resets on every cold start. **Sufficient
  for pre-launch; insufficient at scale.**
- App-layer **auth + Bearer-or-cookie verification** on every
  protected route via `verifyAuth()`.
- App-layer **JSON body size cap** (Session 01).
- App-layer **SSRF guard** on `/api/bible` (Session 01).

### 6.2 Targets before scale

| Layer | Target | Status |
|---|---|---|
| Distributed rate limit | Upstash Redis sliding-window, replacing in-memory | `MANUAL_ACTIONS.md` HIGH (Session 01). |
| Edge WAF | Vercel Firewall managed ruleset on `/api/*` | `MANUAL_ACTIONS.md` HIGH (Session 01). |
| Captcha on auth | Cloudflare Turnstile + Supabase captcha hook | `MANUAL_ACTIONS.md` HIGH (Session 01). |
| Bot management | Vercel-side challenge for unknown UAs hitting `/api/*` | Deferred until first observed abuse. |
| L7 DDoS | Vercel default (managed) | Verified by Vercel docs. No further action pre-launch. |

### 6.3 Cloudflare-only controls (deferred)

If/when Cloudflare zone is created in front of Vercel:

- Managed Ruleset = **on** (sensitivity = high once known false-positive
  patterns are documented).
- OWASP Core Ruleset = **on** at paranoia level 1, escalate to 2 only
  after FP triage.
- Custom rules with phase tags + creation reason captured in commit
  messages on the IaC repo (Terraform / wrangler).
- Bot Fight Mode = **on**; verified bots (Googlebot, Bingbot) explicitly
  allowed.
- Browser Integrity Check = **on**; Privacy Pass = **on**.
- Authenticated Origin Pulls = **on**, with the Cloudflare client cert
  pinned at Vercel.
- IP allow / block lists = empty by default; every entry must have a
  date + reason + review-by date in the commit message.

These are written down so that when the migration happens, the
configuration is not invented from scratch.

---

## 7. Workers / R2 / Zero Trust posture

**N/A — not in use.**

The Altar has zero Cloudflare Workers, zero R2 buckets, zero Access
applications, zero Tunnels, zero WARP enrollments. The supabase admin
client + Vercel serverless functions cover everything those
primitives would otherwise serve.

If any of these is introduced later:

- Workers — source must live in `infra/workers/<name>/`, deploy via
  `wrangler` in CI with SHA-pinned actions, secrets stored as Worker
  secrets (never plain env), routes documented per audit Phase 6.
- R2 — bucket names + access posture (private / signed-URL /
  Worker-only) committed in `infra/r2.tf` or equivalent.
- Zero Trust / Access — every Access policy + group must list its
  members in IaC; former-employee removal is part of offboarding.

Before any of these go live, this section gets re-written with the
real state, not the abstract.

---

## 8. Performance posture

Vercel-managed, all-on by default:

- **HTTP/2 + HTTP/3 (QUIC)** — both negotiated at Vercel's edge.
- **Brotli** — yes, default.
- **Auto Minify** — Next.js production build does this; Vercel layers
  no extra transform.
- **Early Hints** — Next.js 16 emits `103 Early Hints` for `<link
  rel=preload>` automatically; verified at build time.
- **Tiered Cache** — N/A (single edge tier on Vercel today).
- **Image optimization** — `images.unoptimized = true` in
  `next.config.ts:21`. Deliberate (avoids Vercel image-API cost during
  pre-launch); review post-launch.

Cache TTLs:

- `/api/*` — `Cache-Control: no-store, max-age=0` + `X-Robots-Tag:
  noindex,nofollow` (set in `next.config.ts:73-78`).
- `/api/health` — explicitly `no-store` (set in `vercel.json:8-13`).
- Static assets under `/_next/static/*` — Vercel's default
  `Cache-Control: public, max-age=31536000, immutable`. Verified by the
  Vercel build output.

Cache hit ratio observability is **not yet wired**. When it is,
watch for hit ratio < 70% on static asset paths as the canary for a
build-pipeline regression.

---

## 9. Observability posture

Today:

- **Vercel deploy logs** — every deploy + every runtime function
  invocation, retained per Vercel plan tier.
- **Health endpoints** — `/api/health` (shallow, set in
  `src/app/api/health/route.ts`) and `/api/health/deep` (DB probe,
  shipped Session 05).
- **No Logpush / external SIEM** — out of scope at current scale.
- **No external uptime monitor yet** — `MANUAL_ACTIONS.md` MEDIUM
  carryover from Session 05.

When Vercel Firewall logs / Cloudflare Logpush become real, the
destination must be a monitored channel — not a write-only S3 bucket
nobody ever opens. The "alerts route somewhere a human will see"
control from every audit Phase 9 is non-negotiable.

---

## 10. Cross-environment isolation

The Altar has exactly two environments:

- **Production** — `https://thealtar.app` (planned). Branch: `main`.
- **Preview / development** — Vercel preview URLs per PR. Branch:
  any non-`main`.

There is no separate staging domain. There is no shared edge
configuration to keep in sync across brands (single-brand product).

When previews share secrets with prod (current state), they share
*read* access to the same Supabase project. This is a known limitation
flagged on `MANUAL_ACTIONS.md` HIGH (Vercel deployment protection +
preview-env separation, Session 01).

---

## 11. Production-readiness checklist (per Cloudflare DNS Audit 2 Phase 10)

Marked against current state. "Ready" means the control either is in
place already OR has a clear standard documented above and a manual
item tracking the dashboard work.

### Domain & DNS

- [ ] Every domain on auto-renewal with registrar lock — **NOT READY** (manual HIGH, Session 05).
- [x] Every zone with clean DNS records and no dangling CNAMEs — **READY** (the zone is currently a parking record only).
- [ ] SPF, DKIM, DMARC, CAA all correct per zone — **NOT READY** (CAA pending — manual HIGH; SPF/DMARC `-all` / `p=reject` will land with mail provider; DKIM same).
- [ ] DNSSEC enabled where supported — **NOT READY** (manual HIGH, planned for after apex flip).

### SSL/TLS

- [n/a] Full Strict mode on every zone where origin supports it — **N/A** (no Cloudflare zone).
- [x] HSTS enabled with preload — **READY** (`next.config.ts:68`); preload submission still pending until apex is live.
- [x] Minimum TLS 1.2 enforced — **READY** (Vercel default).
- [n/a] Authenticated Origin Pulls enabled — **N/A** (Vercel-managed origin, no Cloudflare).
- [x] All certificates auto-renewing with no near-term expiry — **READY** (Vercel managed).

### Security

- [ ] WAF managed rulesets active with appropriate sensitivity — **NOT READY** (Vercel Firewall pending — manual HIGH).
- [partial] Rate limiting on sensitive endpoints — **PARTIAL** (in-memory app-layer; Upstash distributed pending — manual HIGH).
- [ ] Bot protection configured — **NOT READY** (deferred until first observed abuse).
- [x] Origin IP not leaked through any channel — **READY** (Vercel hides origin by construction; cert transparency = `*.vercel.app` SAN, no real origin).
- [x] DDoS protection rulesets enabled — **READY** (Vercel-managed default).

### Rulesets & Cache

- [x] Page rules and modern rulesets clean and intentional — **READY** (none configured; Vercel-default behavior is the intended posture).
- [n/a] Cache hit ratio healthy — **N/A** (no traffic yet).
- [x] Redirects working without loops or chains — **READY** (no edge redirects configured; `upgrade-insecure-requests` is the only redirect-equivalent and it has no chain).

### Workers & R2

- [n/a] Every Worker source in version control with automated deployment — **N/A** (no Workers).
- [n/a] Worker secrets stored as Worker secrets — **N/A** (no Workers).
- [n/a] Worker error rates within acceptable bounds — **N/A** (no Workers).
- [n/a] R2 bucket access correctly scoped — **N/A** (no R2).

### Zero Trust

- [n/a] Access policies follow least privilege — **N/A** (no Access apps).
- [n/a] Former employees removed from all groups — **N/A** (no groups).
- [n/a] Tunnels current and credentials secure — **N/A** (no Tunnels).

### Observability

- [x] Logpush shipping to monitored destination — **N/A in current state** (Vercel logs accessible via dashboard; external SIEM out of scope at current scale).
- [ ] Alerts wired to channel a human will see — **NOT READY** (uptime monitor + Sentry both manual HIGH, Session 01 / 05).
- [ ] Dashboards providing actionable visibility — **NOT READY** (no dashboard product yet).

---

## 12. Adversarial readiness (per Cloudflare DNS Audit 3 Phase 2)

Documented as a checklist for the first time the site goes live. Until
then these tests cannot run against production traffic.

| Attack surface | Current posture | Test plan once live |
|---|---|---|
| Origin IP exposure via CT logs | Vercel-managed origin; no separate origin certificate. | Search `crt.sh` for `thealtar.app` post-launch; confirm only Vercel-issued certs. |
| Origin IP exposure via DNS history | Apex currently parked; first non-park `A` record will be Vercel's. | After apex flip, verify `securitytrails.com` history shows only the parking IP and the Vercel target. |
| Subdomain takeover via dangling CNAME | None possible — there are no CNAMEs. | Re-test on every CNAME addition. |
| WAF bypass via header smuggling | App rate limiter is the only enforcement layer; not WAF-grade. | Defer until Vercel Firewall is enabled (manual HIGH). |
| Layer-7 burst | App rate limiter handles ~100 req/min/user; Vercel handles infrastructure-level burst. | Synthetic burst test against `/api/altar/*` post-launch with 50 IPs at 10 rps each. |
| Credential stuffing on `/api/auth/*` | Captcha pending. Supabase Auth handles its own throttle. | Test once Captcha is live (manual HIGH). |
| Slowloris | Vercel-managed; no public origin to slowloris. | Confirm via `slowhttptest` post-launch. |
| CAA evasion | Pending — see §11. | Test after CAA records publish: try issuing via a non-allowed CA (will fail at the CA's pre-issuance check). |

---

## 13. Compliance & access

- **Data residency for edge cache and logs** — Vercel's default is
  global edge with US-based log retention. The Privacy Policy
  (Session 03) discloses this. Vercel DPA on `MANUAL_ACTIONS.md` HIGH
  pending sign.
- **PII not inadvertently cached or logged** — `/api/*` is `no-store`
  + `noindex` in `next.config.ts:73-78` and `vercel.json:8-13`. Server
  logs from `src/lib/api/log.ts` (Session 04) scrub credential-shaped
  fields before emit.
- **DPA in place with Cloudflare** — N/A (no Cloudflare).
- **Access to the edge audited and authorized** — Vercel team =
  Kenneth only today. Backup-operator MANUAL MEDIUM (Session 05) is
  the open gap.

---

## 14. Final verdict (per Cloudflare DNS Audit 3 Phase 7)

**CONDITIONAL CERTIFICATION** for DNS + edge.

Conditional on:

- The MANUAL HIGH items in §3, §4.4, §6.2, and `MANUAL_ACTIONS.md`'s
  registrar / DNS / Vercel-Firewall / Captcha / Sentry / uptime
  blocks closing.
- The apex flipping from Namecheap parking to Vercel before any user
  traffic is sent to `thealtar.app`.
- The CAA, DNSSEC, SPF, DMARC records publishing as defined in §4.

Once those close, this verdict can be re-marked **CERTIFIED FOR
PRODUCTION** with no code change required.

---

## 15. Post-launch monitoring plan

First 24 hours after the apex flip:

- Verify TLS handshake at `thealtar.app` and `www.thealtar.app` (curl
  + `testssl.sh`).
- Verify HSTS header is present on every first-byte response.
- Verify `/api/health` and `/api/health/deep` return 200 from a
  non-Vercel network.
- Watch Vercel deploy log for any 5xx burst.

First 7 days:

- Re-run TLS Labs scan; target A+.
- Confirm no unexpected certificate issued for `thealtar.app` /
  `*.thealtar.app` in `crt.sh`.
- Confirm DNSSEC chain validates (`dig +dnssec thealtar.app`).
- Audit Vercel access list for any unintended additions.

Quarterly thereafter:

- Re-export DNS zone to `docs/dns/thealtar-app-records.txt`
  (`MANUAL_ACTIONS.md` MEDIUM, Session 05).
- Re-verify CAA, DMARC, DKIM records still match the standard above.
- Verify registrar auto-renew is still on with a non-expired payment
  method.

---

This document supersedes any DNS / edge guidance in older sessions.
When the edge layer changes (Cloudflare added, separate DNS provider
adopted, etc.), revise this file *first*, then make the change.
