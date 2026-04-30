# Twilio — Not Applicable (yet)

Owner: Kenneth Weikel
Last verified: 2026-04-30 (Audit Session 06)

This document exists so a future engineer doesn't waste a day searching
for a Twilio integration that doesn't exist, and so the Twilio audit
PDFs (1–4) under `~/Desktop/Devloper Audit Prompts/5_Integrations_&_Services/`
have a documented disposition.

---

## Verdict: **N/A — Twilio is not in use.**

Verified by `grep -ri 'twilio' src/ supabase/ public/ docs/` — zero hits
in source, zero hits in dependency tree (`package.json` does not list
`twilio`, `@twilio/`, or `twilio-node`). The closest matches in the
codebase are:

- `src/app/bible/lib/useDirectMessages.ts:227` — `sendMessage()`. This
  is in-app DM that writes a row to the `trace_messages` table. No SMS,
  no carrier, no Twilio.
- `src/app/layout.tsx:53` — `formatDetection: { telephone: false }`.
  This is a Next.js metadata directive that **disables** iOS's
  auto-conversion of phone-shaped numbers into `tel:` links — a UX
  hardening, not a Twilio surface.

The Altar therefore has zero phone numbers, zero messaging services,
zero webhooks, zero TwiML apps, zero subaccounts, zero A2P 10DLC
campaigns, zero toll-free verifications.

---

## Disposition of every Twilio Audit phase

### Twilio Audit 1 — Full Baseline (10 phases)

| Phase | Disposition |
|---|---|
| 1 — Phone Number Inventory | **N/A** — no phone numbers on any Twilio account belonging to The Altar. |
| 2 — A2P 10DLC & Compliance | **N/A** — no campaigns, no brand registration. |
| 3 — Messaging Service Audit | **N/A** — no messaging services. |
| 4 — Voice Configuration Audit | **N/A** — no voice numbers, no TwiML apps. |
| 5 — Webhook & Integration Audit | **N/A** — no webhook surface; the only webhook-shaped endpoints are `/api/altar/*`, `/api/bible`, `/api/tts`, `/api/account/*`, `/api/legal/*`, `/api/spotify/*`, `/api/health`, `/api/health/deep` — all internal Next.js API routes. |
| 6 — Security Audit | **N/A** — no Twilio credentials to inventory. |
| 7 — Deliverability & Performance | **N/A** — no messages or calls flow. |
| 8 — Cost & Usage | **N/A** — no Twilio bill. |
| 9 — Application Integration | **N/A** — no SDK initialised. |
| 10 — Data & Logging | **N/A** — no message or call records to log. |

### Twilio Audit 2 — Verification & Deep Dive (10 phases)

Every phase pivots on "verify the previous fix." With Audit 1 returning
all-N/A, Audit 2 is N/A by construction.

### Twilio Audit 3 — Final Production Certification (7 phases)

Adversarial compliance / security / scale tests against a Twilio
surface that does not exist. **N/A.**

### Twilio Audit 4 — Pre-Launch Final Sweep (8 phases)

Drift detection against an Audit-3 baseline that does not exist.
**N/A.**

---

## When this document needs to change

If The Altar adds **any** of the following, this file's verdict flips
to "in scope" and the Twilio audit must be run in full *before* the
feature ships:

1. SMS notifications (e.g. "your group leader sent a message").
2. Voice calls (e.g. prayer-line dial-in).
3. WhatsApp / RCS messaging.
4. Phone-number verification (using Twilio Verify instead of Supabase
   email-only auth).
5. Inbound number for support / DMCA / privacy contact.
6. Any contractor, sister product, or shared OAXII tooling that brings
   Twilio into a shared Vercel project.

The trigger is the *first commit that adds the dependency*, not the
first message sent. If `package.json` ever gains `twilio`, this file
must be replaced with a real audit before merge.

---

## Standard-of-record (for the day Twilio is added)

If/when Twilio is added, every one of the following must be true on
the same commit:

- **Credentials** — `TWILIO_ACCOUNT_SID` + a *narrowly-scoped* Twilio
  API key (NOT the master auth token) in Vercel project env. Never
  client-bundled. Verified via `grep -ri 'TWILIO_' src/` returning only
  server-route imports.
- **Webhook signature verification** — every inbound endpoint validates
  `X-Twilio-Signature` against the auth token. Reject unsigned and
  signature-mismatched requests with 403 + structured log.
- **HTTPS-only** — every webhook URL on `thealtar.app/api/*`. No
  staging / ngrok URLs in production Twilio config. No HTTP.
- **Async webhook processing** — webhook handler returns 200 within
  Twilio's 10s SMS / 15s voice timeout; downstream work runs out of
  band (queue or background fetch).
- **A2P 10DLC** — brand + campaign registration completed and
  approved before first send. Use case matches actual content.
- **Opt-out compliance** — STOP/UNSUBSCRIBE/CANCEL/END/QUIT honoured
  globally across all messaging services. Persisted in
  `trace_optout_log` (new table) with timestamp + source. Application
  layer also blocks future sends to opted-out numbers (defense in
  depth — don't rely solely on Twilio's opt-out list).
- **Consent records** — every contact has timestamp + source + exact
  disclosure language. Immutable. Linked to `trace_profiles.user_id`.
- **Quiet hours** — no marketing SMS outside 8am–9pm in the
  recipient's timezone. Use the `trace_profiles.location` field and a
  timezone library, not the server's clock.
- **TCPA + CAN-SPAM** — sample messages on file at Twilio match what's
  sent. HELP returns business name + opt-out. Sender ID clear.
- **Cost controls** — usage alert at 50% / 75% / 100% of monthly
  budget routed to `security@thealtarco.app` (or whatever the active
  ops email is by then).
- **Toll-free verification** — every TFN fully verified before any
  send.
- **No client-side credentials** — adversarial test: open production
  bundle in browser devtools, search for `AC` (Account SID prefix),
  for `SK` (API key prefix), for `tw_`, for `account_sid`. Zero hits.
- **Production / preview separation** — preview deployments use a
  Twilio sandbox subaccount with throwaway numbers, never production
  numbers. Otherwise a Vercel preview can rate-bomb a real campaign.

These rules come from Twilio Audit 1 Phase 6 + Audit 3 Phase 3 and are
recorded here so the day-one surface lands compliant rather than
playing catch-up.

---

## Cross-reference

- `docs/BACKUP_AND_RECOVERY.md §1 row 8` — third-party data resilience
  for Twilio also marked N/A pending introduction.
- `docs/DNS_AND_EDGE.md §6.3` — WAF / rate-limit posture; no SMS-shaped
  abuse vectors today.
- `~/Desktop/The Altar Actions/AUDIT_PLAN.md` — Session 06 row marks
  this audit pair done with the disposition above.

---

This file is short on purpose. The day Twilio is introduced, replace
it with a full audit walkthrough mirroring `02_Auth_Supabase.md`-style
depth, and demote this version to a historical note in the new doc's
footer.
