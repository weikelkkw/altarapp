# Groups Section — Rebuild Design

**Status:** v1 design spec — drives implementation across multiple sessions.
**Owner:** Kenneth (founder).
**Last revised:** 2026-04-30.

This document is the single source of truth for the rebuilt **Groups** experience in The Altar. It replaces the current `CommunityTab.tsx` group surface (which is essentially a chat with member-add).

> **Bar:** when a small-group leader opens this for the first time, they should say "finally, someone built this the way it should be." Spiritually purposeful, frictionless for leaders, safe for the vulnerable, native for every group size, beautiful without clutter.

---

## 0. Stack & assumptions

The app is **Next.js 16 (App Router) + React 19 + Supabase (Postgres + Auth + Realtime + Storage)**, deployed on Vercel. Existing tables are `trace_*`-prefixed. No native shell — this is a PWA targeting iOS Safari + Android Chrome. No payments. No native push (web push only, opt-in). Anthropic + ElevenLabs are server-side AI/TTS already wired.

Assumptions made for this design:

- The web app is the canonical experience; a future mobile shell will reuse the same Supabase backend and API routes.
- Real-time uses Supabase Realtime channels.
- Media (images, voice notes, study PDFs) lives in a Supabase Storage bucket `groups-media` with row-scoped policies.
- The current AI endpoints under `/api/altar/*` can be reused for AI-assisted plan generation (no new vendor).
- We extend the existing `trace_*` namespace rather than introducing a parallel `groups_v2` schema. Migrations are additive; old rows continue to work.
- Identity already exists: `trace_profiles` (id, auth_id, display_name, username, avatar_color, profile_data jsonb, settings_data jsonb, is_public, experience_level).
- We rely on the rate-limit + auth helpers in `src/lib/api/security.ts` and the audit-event logger in `src/lib/api/audit.ts`.

Open product questions are listed in §11.

---

## 1. Information architecture

```
/bible/groups                           Groups home (list + discovery + join card)
├── /bible/groups/new                   Create-a-group wizard (archetype-aware)
├── /bible/groups/discover              Discoverable + Public group browser
│   └── /bible/groups/discover/[slug]   Group profile (public-facing, no member content)
├── /bible/groups/joinrequest           My pending join requests
└── /bible/groups/[id]                  Group home (default tab: Pulse)
    ├── /pulse                          Activity feed + this-week + announcements
    ├── /chat                           Threaded chat
    │   └── /chat/t/[threadId]          Thread detail
    ├── /prayer                         Prayer Wall (the heart)
    │   ├── /prayer/[requestId]         Request detail + answered-prayer thread
    │   └── /prayer/queue               Personal prayer queue (cross-group, opt-in)
    ├── /study                          Group study + reading plans
    │   ├── /study/plan/[planId]        Plan home (progress, today's discussion)
    │   ├── /study/plan/[planId]/d/[n]  Day-N discussion thread
    │   └── /study/library              Study library (group-published files)
    ├── /meetings                       Meeting calendar + agenda templates
    │   ├── /meetings/[meetingId]       Meeting detail (RSVP, agenda, notes)
    │   └── /meetings/new               Schedule a meeting
    ├── /accountability                 Check-ins, streaks, partners, goals
    │   ├── /accountability/checkin/[id] Today's check-in
    │   └── /accountability/partner/[uid] 1:1 partner thread
    ├── /care                           Meals trains + giving links + birthdays
    │   └── /care/[careId]              Care plan detail
    ├── /members                        Member directory
    │   ├── /members/[uid]              Member profile within this group
    │   ├── /members/invite             Invite via link/QR/email/SMS/contact
    │   ├── /members/requests           Pending join requests (leaders only)
    │   └── /members/sub                Sub-groups / breakouts
    ├── /announcements                  Pinned announcements + read receipts
    ├── /settings                       Group settings (leaders only beyond Notifications)
    │   ├── /settings/identity          Name, photo, description, denomination, cadence, location
    │   ├── /settings/privacy           Private / Discoverable / Public
    │   ├── /settings/roles             Roles + permission matrix
    │   ├── /settings/notifications     Per-feature notification controls (per member)
    │   ├── /settings/moderation        Moderation queue + audit log
    │   └── /settings/danger            Archive, transfer ownership, delete
    └── /search                         In-group search (chat, prayer, study, files)
```

**Top-level navigation inside a group** is a 5-tab bar (mobile-first, with a 6th overflow on tablet+):

`Pulse · Chat · Prayer · Study · Meetings` + overflow `(Members · Care · Announcements · Settings)`

`Pulse` is the default landing — never `Chat`. A noisy chat is the wrong first impression for a returning member.

---

## 2. User flows (the 10 most important journeys)

Each flow is written from the user's perspective with screens, decisions, and the system response. Edge cases are listed inline; full edge-case matrix in §9.

### 2.1 Create a group (Pastor / leader)

1. From `/bible/groups`, taps **+ New Group** → `/bible/groups/new`.
2. Picks an **archetype**: Small Group · Bible Study · Accountability · Family · Prayer Circle · Reading Plan Cohort · Church-wide / Ministry · Custom. The wizard branches.
3. **Identity step:** name, optional cover image (camera roll or curated gallery), short description, denomination tag (optional + skippable), meeting cadence (weekly / biweekly / monthly / ad hoc), location (in-person address / hybrid / online URL), and a "what to expect" blurb (rendered to new members on first open).
4. **Privacy step:** Private (invite only) / Discoverable (listed but request-to-join) / Public (open join). Each card shows an icon, one-line explanation, and a worked example.
5. **Defaults step:** one-tap toggles for the archetype's defaults — e.g. for Reading Plan Cohort, "Start a plan now" is pre-checked; for Accountability, "Daily check-ins" is pre-checked.
6. **Co-leaders step (optional):** invite up to 3 co-leaders by username search. Their roles are pre-filled to `co_leader`.
7. **Review:** plain-language summary. **Create** button.
8. System creates `trace_groups` row, `trace_group_members` row for owner, archetype defaults rows (e.g. `trace_group_settings`), creates the welcome announcement, and routes to `/bible/groups/[id]/pulse` with an in-place celebration.

### 2.2 Discover and join a group

1. `/bible/groups/discover`. Filter chips: Location (uses approximate region the user opted into during onboarding — never raw geo), Meeting time (Mon–Sun + AM/PM), Life stage (Singles, Married, Parents, Empty Nesters, College, Recovery, Men, Women, All), Topic (book or thematic study), Language, Denomination.
2. Taps a card → `/bible/groups/discover/[slug]`. Public-facing profile: leader bio, current study, vibe summary (e.g. "Active this week — 38 messages, 6 prayers"), without exposing private content.
3. **Request to join** if Discoverable; **Join** if Public. Submits an optional 1-line note.
4. System inserts `trace_group_join_requests` (status `pending`) and notifies leaders. For Public groups, inserts the membership row directly.
5. User sees a holding state on `/bible/groups/joinrequest` until a leader approves. They can withdraw.
6. On approval, user receives a notification + email. First open of `/bible/groups/[id]` shows new-member onboarding (§2.3).

### 2.3 New-member onboarding inside a group

1. First time opening a group, an inline overlay (not a separate page) shows:
   - A pinned **welcome from the leader** (text + optional voice note).
   - **Group rhythms**: meeting cadence, current study, prayer-wall norms.
   - **Who's who**: 5 most active members with bios (only fields they marked shareable).
   - **How to participate**: three small cards — post a prayer, introduce yourself, join the current plan.
2. The overlay is dismissable once (`trace_group_member_onboarded`) but lives at `/bible/groups/[id]/welcome` permanently.

### 2.4 Post a prayer request

1. From `/bible/groups/[id]/prayer`, taps **+ Add Prayer**.
2. Sheet opens with: title (required, ≤80 chars), body (optional, ≤2000 chars), category (Healing / Family / Work / Spiritual / Salvation / Praise Report / Other), urgency (Whisper / Standard / Urgent), **privacy scope** (Whole group / Leaders only / Specific members [picker] / Anonymous), optional related Scripture (verse picker reused from the Bible reader).
3. **Anonymous toggle** is sticky in this session. If selected, body warns "Even leaders cannot see who posted this. Are you sure?" and stores `author_id = null` with a separate `trace_prayer_anon_keys` row (encrypted, server-only) so the user themselves can later "Reveal."
4. On submit: `trace_prayer_requests` insert, fan-out notifications per member's prayer-notification preference (default: in-app only).
5. The request card appears at top of the Prayer Wall with a 🙏 button, comment thread, and "Update" button (only the original author or leaders can update; updates can be marked **Praise Report**).
6. Follow-up prompts (§3.4) fire at +3d / +7d / +30d.

### 2.5 Pray for a request (the receiver-side flow)

1. Notification: "3 new prayers in `Tuesday Women's Group`." Tap → `/bible/groups/[id]/prayer`.
2. Each card has a 🙏 **I prayed for this** button. Tap increments a counter; if the original poster didn't opt out, they get a single batched notification at end-of-day: "12 people prayed for your request today."
3. Long-press a card → opens **Guided Prayer Mode**: full-screen, request body large, a soft 60-second timer (skippable), a Scripture suggestion, an "Add a note" composer that posts as a comment on the request.
4. Personal Prayer Queue (`/bible/groups/prayer/queue`) pulls every active request from every group the user belongs to (opt-in per group). Swipe to step through. This is the killer feature — most apps make you hunt; we surface the ask.

### 2.6 Join a reading plan as a group

1. From `/bible/groups/[id]/study`, taps **+ Start a plan**.
2. Picks from: **Curated** (Editorial picks), **Church-published** (if the group is part of a church account), **My plans** (user-created), or **AI-assisted** (topic / book → generated plan with reviewable outline).
3. Sets **start date** + **daily post time** (when the auto-discussion prompt drops).
4. Members are notified once. Each member confirms enrollment (opt-in — never auto-enrolled, even members of the group).
5. Group plan home (`/bible/groups/[id]/study/plan/[planId]`) shows:
   - Current day, "We're on Day 7 of 21 — 18 of 24 members on track."
   - Today's passage + discussion prompt + thread.
   - Catch-up mode for late joiners ("Start where you are, Day 1 still available below").
   - Per-passage discussion threads (every day has a thread).
   - **Verse annotations**: members highlight in the reader and the group sees a "12 members highlighted this verse" badge, with collective insight on tap.

### 2.7 Run a meeting

1. Leader creates a meeting: title, day/time, location (in-person / online with link / hybrid), agenda from a template (Opening prayer → Ice-breaker → Scripture → Discussion → Prayer requests → Closing) — drag-and-drop to reorder, edit any step.
2. Members get RSVP card (Going / Maybe / Can't). Reminders fire 24h, 2h, 10m before.
3. At meeting time, `/bible/groups/[id]/meetings/[meetingId]` opens to **Live Mode**:
   - Agenda steps tickable.
   - Shared Bible follow-along (the leader's verse navigation syncs to participants who opt in).
   - Live prayer capture — each request gets one tap → drops into the Prayer Wall.
   - "Mark attendance" tap-list.
   - Recording (consent-gated) with AI transcript + speaker labels post-meeting.
4. After-meeting summary auto-generated: attendees, passages covered, prayers captured, decisions made, next meeting set.
5. Posted to `/bible/groups/[id]/meetings/[meetingId]/recap` with an option to email the absent.

### 2.8 Daily check-in (Accountability group)

1. At the user's chosen time, a single notification: "Two-minute check-in — `Brothers in Christ`."
2. Tap → `/bible/groups/[id]/accountability/checkin/[id]`.
3. Three short prompts (configurable by leader): Did you spend time in the Word? In prayer? Anything to share? Each is yes/no + optional note. A fourth optional "Any wins?" prompt celebrates consistency.
4. Submit → answers are visible to the group (or to the user's accountability partner only — depends on group setting).
5. Streak increments. Streaks are gentle: a missed day shows a soft "Welcome back" badge, never a broken-streak shame.

### 2.9 Care coordination — meal train

1. Member or leader posts a Care Plan: "Sarah just had a baby — let's organize meals for two weeks."
2. Picks dates, allergens, drop-off window, address visibility (full address vs. drop-off porch with code).
3. Sign-up grid generated. Members claim slots; reminders fire 24h before.
4. Care Plan stays at the top of `/care` until the window ends, then archives to "Past care."
5. Giving coordination is a separate Care Plan type — links out to the church's existing giving platform or a personal Venmo/Zelle/PayPal handle the recipient provided. The app never handles money.

### 2.10 Submit a confession to an accountability partner

1. From `/bible/groups/[id]/accountability/partner/[uid]`, taps **Confess in confidence**.
2. Composer makes the privacy explicit ("Only `partner_name` will see this. Stored end-to-end-encrypted at rest. Cannot be made public except by you.").
3. Message is encrypted client-side using a shared per-pair AES-GCM key derived from each user's public key (libsodium NaCl box). Server never sees plaintext. Audit row records *that* a confession was sent, not its content.
4. Partner gets a private notification. Reply flows the same way.
5. There's a dedicated "Bring this to a leader" button — surfaces a step-by-step path the user can take *if* they choose; never automatic.

---

## 3. Screen-by-screen wireframes

Every screen lists: purpose, layout (mobile-first), primary actions, empty / loading / error / offline states, accessibility notes.

### 3.1 `/bible/groups` — Groups home

- **Purpose:** answer "what's happening in my groups today?" in under one second.
- **Layout (top to bottom):**
  - Header: avatar, "My Groups," + button.
  - Pulse strip: 3 horizontal cards summarizing the most active group, the most prayer-active group, and a "due today" card (check-in or plan day).
  - **My Groups** list — each row: cover image (32×32 rounded), name, last-activity sentence ("3 new prayers · 2h"), unread dot, mute icon if muted.
  - Empty footer link: "Find a group to join."
- **States:**
  - Empty: hero illustration + two CTAs ("Create a group", "Find a group").
  - Loading: skeleton rows, shimmer on the pulse strip.
  - Error: inline retry banner; cached list still rendered.
  - Offline: cached list, prefixed with a soft "You're offline" banner. Pulse strip hidden.

### 3.2 `/bible/groups/new` — Create-a-group wizard

- 5 steps, each a single screen, swipe + button navigation, progress dots.
- Step 1 archetype: 8 large tappable cards.
- Step 2 identity: form fields. Cover image picker has a curated gallery (seasonal art) + camera roll.
- Step 3 privacy: 3 radio cards.
- Step 4 defaults: archetype-specific toggles.
- Step 5 review: human-language summary.
- **States:** in-progress save (auto-draft to `localStorage`), validation errors inline.

### 3.3 `/bible/groups/[id]/pulse` — Group home (default tab)

- **Purpose:** the calm, useful default. No chat firehose.
- **Sections (in order):**
  1. **Today** — single most important card (today's prayer prompt OR today's plan day OR today's meeting OR today's announcement).
  2. **This week** — meetings, plan progress, birthdays, events.
  3. **Recent prayer requests** — top 3, "open Prayer Wall."
  4. **Recent insights** — 2–3 most-reacted Scripture insights.
  5. **Care** — any active meal trains or care plans.
- **States:**
  - Empty group: only the welcome card + 3 starter actions ("Post a welcome", "Pick a study", "Schedule first meeting").
  - Loading: skeletons section by section.
  - Offline: cached pulse from last open.

### 3.4 `/bible/groups/[id]/chat` — Threaded chat

- **Layout:** message list, composer at bottom with verse-picker + voice + attach + emoji + new-thread.
- **Threads:** parent message + reply count chip; tap opens `/chat/t/[threadId]` with the parent at top.
- **Composer:**
  - Verse picker → search → translation respected (uses each user's `defaultBible`).
  - Inserted verse renders as a card (`<VerseCard>`) inline, tappable to open in the reader.
  - Voice message: hold-to-record, autotranscribed via `/api/tts/transcribe` (Whisper). Transcript stored alongside audio.
  - Image attach: through Supabase Storage, max 8 MB, JPEG/PNG/WebP only.
  - Polls: 2–6 options, optional anonymous, optional close-at.
  - Inline event: opens a slim event composer.
- **Reactions:** 🙏 ✝️ ❤️ 📖 🕊️ + standard emoji bar. Per-message tap → expands counts.
- **Long-press a verse:** menu = Save to highlights / Add to journal / Start a study note / Quote in reply.
- **Search bar** at top filters: by member, date, Scripture ref, attachment type, presence of a reaction.
- **Mute / notification settings:** per-thread + per-group from the kebab menu.
- **States:**
  - Empty: friendly "First message" CTA with a verse-of-the-day suggestion.
  - Loading: bubble skeletons.
  - Network drop mid-send: outbound message has a "retry" pill; queued message stored to IndexedDB.

### 3.5 `/bible/groups/[id]/prayer` — Prayer Wall

- **Tabs at top:** All · Mine · Praise reports · Archive.
- **Card layout:**
  - Title (bold), body (2-line preview), category chip, urgency chip if Standard+, **🙏 N prayed** counter, comment count, time.
  - Privacy chip on left: 🔒 Anonymous / 👥 Group / 👑 Leaders only / ✉️ Specific members.
  - Long-press → Guided Prayer Mode (full-screen).
- **Composer (sheet):** title · body · category · urgency · privacy · related Scripture.
- **Follow-up:** 3-day prompt: "How are you doing with this?" 7-day: "Any update?" 30-day: "Praise report?"
- **Praise report:** distinct color / icon, surfaces in a dedicated "Praise" filter and on `/pulse`.
- **States:** empty (3 starter prompts), loading, offline (cached + inline-banner), error.

### 3.6 `/bible/groups/[id]/prayer/queue` — Personal prayer queue

- Cross-group only. Pulls from groups the user has opted in to.
- **One full-screen card per request.** Soft transition. Timer (off / 30s / 60s / 90s / 2m).
- **Actions per card:** 🙏 prayed (logs `trace_prayer_deliveries`), Add a note, Skip, Done.
- "Pause queue" persists state.
- **End screen:** quiet summary — "You prayed for 5 requests across 3 groups. Praise."

### 3.7 `/bible/groups/[id]/study/plan/[planId]`

- **Header:** plan name, total days, current day badge, leader name.
- **Today's card:** today's passage rendered inline + the discussion prompt.
- **Progress strip:** circles for each day, filled = read, dimmed = upcoming, half = halfway. Group average shown beneath.
- **Members on track:** "18 of 24 on track." Tap → list with friendly "send encouragement" tap (sends a one-tap prayer or note).
- **Per-day threads:** scrollable list. Each opens a thread with collective annotations.
- **Catch-up:** never feels behind — "Start where you are, today's day is ready" plus visible Day 1 entry.

### 3.8 `/bible/groups/[id]/meetings/[meetingId]`

- **Pre-meeting:** RSVP buttons (Going / Maybe / Can't), agenda preview, location, "Get me there" link.
- **Live:** agenda checklist, shared Bible follow (toggle), prayer capture (button drops a prayer to the wall), attendance tap-list, recording (consent gate per participant).
- **Post-meeting:** summary card, transcript, "Email the absent" button.

### 3.9 `/bible/groups/[id]/accountability/checkin/[id]`

- Three prompts, two of which are yes/no with optional note. Submit. Streak chip.
- Settings link: "Change my check-in time."

### 3.10 `/bible/groups/[id]/care/[careId]`

- Care plan title, recipient, type (meal train / rides / visits / giving link).
- Sign-up grid (date × slot). Tap a cell to claim or release.
- Notes & dietary restrictions visible to claimers only.
- Past care plans archive in a collapsed accordion.

### 3.11 `/bible/groups/[id]/members`

- Search + filter (role, joined-this-week, on the current plan).
- Row per member: avatar, display name, role chip, last-active sentence, mute / DM / view-profile actions.
- Sub-groups section at bottom: list of breakouts with member count and Open button.

### 3.12 `/bible/groups/[id]/members/invite`

- 4 tabs: **Link** (copy + QR), **Email** (multi-recipient), **SMS** (multi-recipient), **In-app** (search by username).
- Optional welcome message on the invite. Optional pre-assigned role (member only — not co-leader).

### 3.13 `/bible/groups/[id]/announcements`

- Pinned announcements from the leader at top with read receipts (visible to leaders).
- Compose: title + body + optional Scripture + optional schedule-for-later.

### 3.14 `/bible/groups/[id]/settings/*`

- Identity / Privacy / Roles / Notifications / Moderation / Danger.
- Roles tab includes the **permissions matrix** (§8) editable per role.
- Moderation tab shows the audit log + open reports queue.
- Danger tab gates archive / transfer-ownership / delete behind a typed-confirm of the group name.

### 3.15 Empty / loading / error / offline conventions

Every screen has all four states. Empties use one short sentence + a single primary action. Loading is skeletal — no spinners on first paint. Errors are inline with retry, never a full-page fallback. Offline shows cached content with a slim banner; mutating actions are queued in IndexedDB and replay on reconnect.

---

## 4. Data model & API spec

### 4.1 Tables (additions only — keep existing rows valid)

```sql
-- Already exist (referenced; not redefined):
--   trace_profiles, trace_groups, trace_group_members, trace_messages,
--   trace_prayer_comments, trace_prayer_deliveries, trace_event_rsvps,
--   trace_plan_progress, trace_message_reactions, trace_friendships,
--   trace_highlights, trace_reading_activity.

-- New columns on trace_groups
alter table trace_groups
  add column if not exists archetype text,                          -- enum-like text
  add column if not exists privacy text not null default 'private', -- 'private'|'discoverable'|'public'
  add column if not exists denomination text,
  add column if not exists cadence text,                            -- 'weekly'|'biweekly'|'monthly'|'adhoc'
  add column if not exists location_kind text,                      -- 'inperson'|'hybrid'|'online'
  add column if not exists location_text text,
  add column if not exists location_url text,
  add column if not exists what_to_expect text,
  add column if not exists cover_image_url text,
  add column if not exists slug text unique,                        -- for /discover/[slug]
  add column if not exists archived_at timestamptz,
  add column if not exists settings_data jsonb not null default '{}';

-- New columns on trace_group_members
alter table trace_group_members
  add column if not exists role text not null default 'member',     -- 'owner'|'leader'|'co_leader'|'member'|'guest'
  add column if not exists notif_prefs jsonb not null default '{}',
  add column if not exists onboarded_at timestamptz,
  add column if not exists muted_until timestamptz,
  add column if not exists subgroup_id uuid;

create table if not exists trace_group_subgroups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  name text not null,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists trace_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  note text,
  status text not null default 'pending',                           -- 'pending'|'approved'|'declined'|'withdrawn'
  decided_by uuid references trace_profiles(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(group_id, user_id)
);

create table if not exists trace_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  invited_by uuid not null references trace_profiles(id) on delete cascade,
  token text unique not null,                                       -- random 16 bytes b64url
  channel text not null,                                            -- 'link'|'qr'|'email'|'sms'|'inapp'
  recipient text,                                                   -- email / phone / username
  role text not null default 'member',
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid references trace_profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists trace_group_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  parent_message_id uuid,                                           -- references trace_messages(id) loosely
  title text,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Prayer wall
create table if not exists trace_prayer_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  author_id uuid references trace_profiles(id) on delete set null, -- null = anonymous
  title text not null,
  body text,
  category text,
  urgency text not null default 'standard',                         -- 'whisper'|'standard'|'urgent'
  privacy_scope text not null default 'group',                      -- 'group'|'leaders'|'specific'|'anonymous'
  scripture_ref text,
  status text not null default 'open',                              -- 'open'|'praise'|'archived'
  pray_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists trace_prayer_request_targets (
  request_id uuid not null references trace_prayer_requests(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  primary key (request_id, user_id)
);

create table if not exists trace_prayer_anon_keys (
  request_id uuid primary key references trace_prayer_requests(id) on delete cascade,
  -- server-only; client cannot select. Used to allow the original author to
  -- self-reveal later. Never exposed to leaders.
  author_id uuid not null references trace_profiles(id) on delete cascade
);

create table if not exists trace_prayer_request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references trace_prayer_requests(id) on delete cascade,
  author_id uuid references trace_profiles(id) on delete set null,
  body text not null,
  is_praise boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists trace_prayer_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references trace_prayer_requests(id) on delete cascade,
  assignee_id uuid not null references trace_profiles(id) on delete cascade,
  assigned_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (request_id, assignee_id)
);

-- Already-existing trace_prayer_deliveries logs each "I prayed" tap.

-- Reading plans
create table if not exists trace_group_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  plan_template_id uuid,                                            -- references a curated template if any
  title text not null,
  total_days int not null,
  start_date date not null,
  daily_post_time time,                                             -- when the discussion drops
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists trace_group_plan_days (
  plan_id uuid not null references trace_group_plans(id) on delete cascade,
  day_index int not null,
  reference text not null,                                          -- e.g. "John 1:1-18"
  prompt text,                                                      -- discussion prompt
  primary key (plan_id, day_index)
);

create table if not exists trace_group_plan_enrollments (
  plan_id uuid not null references trace_group_plans(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  status text not null default 'active',                            -- 'active'|'paused'|'completed'|'left'
  current_day int not null default 1,
  primary key (plan_id, user_id)
);

create table if not exists trace_group_plan_day_threads (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references trace_group_plans(id) on delete cascade,
  day_index int not null,
  message_id uuid                                                   -- the parent message, if any
);

-- Meetings
create table if not exists trace_group_meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_kind text not null,                                      -- 'inperson'|'online'|'hybrid'
  location_text text,
  online_url text,
  agenda jsonb not null default '[]',                               -- array of {id, label, kind, completed}
  recording_consent_required boolean not null default true,
  recording_url text,
  transcript_text text,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists trace_group_meeting_attendance (
  meeting_id uuid not null references trace_group_meetings(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  status text not null default 'unknown',                           -- 'going'|'maybe'|'cant'|'attended'|'absent'
  primary key (meeting_id, user_id)
);

-- Accountability
create table if not exists trace_group_checkins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  date date not null,
  word boolean,
  prayer boolean,
  share text,
  win text,
  visibility text not null default 'group',                         -- 'group'|'partner'|'private'
  created_at timestamptz not null default now(),
  unique (group_id, user_id, date)
);

create table if not exists trace_group_partner_pairings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  user_a uuid not null references trace_profiles(id) on delete cascade,
  user_b uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (group_id, user_a, user_b)
);

create table if not exists trace_group_confessions (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid not null references trace_group_partner_pairings(id) on delete cascade,
  sender_id uuid not null references trace_profiles(id) on delete cascade,
  ciphertext bytea not null,                                        -- libsodium box; server can't read
  nonce bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists trace_group_streaks (
  group_id uuid not null references trace_groups(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_checkin_date date,
  primary key (group_id, user_id)
);

-- Announcements
create table if not exists trace_group_announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  author_id uuid not null references trace_profiles(id) on delete cascade,
  title text not null,
  body text,
  scripture_ref text,
  scheduled_for timestamptz,
  pinned boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists trace_group_announcement_reads (
  announcement_id uuid not null references trace_group_announcements(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- Care
create table if not exists trace_group_care_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  recipient_id uuid not null references trace_profiles(id) on delete cascade,
  kind text not null,                                               -- 'meals'|'rides'|'visits'|'giving'|'other'
  title text not null,
  notes text,
  starts_on date not null,
  ends_on date not null,
  giving_url text,                                                  -- only for kind='giving'
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists trace_group_care_slots (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references trace_group_care_plans(id) on delete cascade,
  slot_date date not null,
  slot_label text not null,
  claimed_by uuid references trace_profiles(id),
  claimed_at timestamptz
);

-- Moderation
create table if not exists trace_group_audit_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  actor_id uuid references trace_profiles(id) on delete set null,
  event text not null,                                              -- 'member.joined'|'member.removed'|'role.changed'|...
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Search index helpers
create index if not exists trace_messages_group_id_created_idx
  on trace_messages (group_id, created_at desc);

create index if not exists trace_prayer_requests_group_id_status_idx
  on trace_prayer_requests (group_id, status, created_at desc);

create index if not exists trace_group_announcements_group_id_pinned_idx
  on trace_group_announcements (group_id, pinned, created_at desc);
```

### 4.2 RLS — must accompany every new table

Every new table gets:

- `select` allowed only for members of the parent `group_id` (look up via `trace_group_members`), with role-aware narrowing for leader-only resources.
- `insert` requires the user is a member with the right role (see permissions matrix in §8).
- `update` / `delete` author-only or leader-only depending on resource.
- `trace_prayer_anon_keys` and `trace_group_confessions` are server-write-only via the admin client; clients can never `select` them.
- `trace_prayer_requests` with `privacy_scope = 'leaders'` is selectable only by leaders / co_leaders / owner.
- `privacy_scope = 'specific'` joins `trace_prayer_request_targets` to grant select.

These extend the patterns established in `20260430_audit_2_rls.sql`. Migration file: `20260501_groups_rebuild.sql`.

### 4.3 API surface

REST under `/api/groups/*`. All routes are auth-gated via `verifyAuth` (Cookie or Bearer) and rate-limited via `rateLimit` from `src/lib/api/security.ts`. Mutations write to `trace_group_audit_log` where applicable.

```
POST   /api/groups                                Create a group
GET    /api/groups                                List my groups
GET    /api/groups/discover                       Discover (filtered)
GET    /api/groups/[id]                           Group detail (RLS-scoped)
PATCH  /api/groups/[id]                           Update identity / privacy / settings
DELETE /api/groups/[id]                           Archive (soft) → 7-day grace then hard delete via cron
POST   /api/groups/[id]/transfer-owner            Transfer ownership (requires re-auth)

POST   /api/groups/[id]/invites                   Create invite (link/qr/email/sms/inapp)
GET    /api/groups/[id]/invites                   List active invites
POST   /api/groups/invites/[token]/accept         Consume invite

POST   /api/groups/[id]/join-requests             Submit join request
GET    /api/groups/[id]/join-requests             List pending (leaders)
POST   /api/groups/[id]/join-requests/[reqId]/decide  approve|decline

GET    /api/groups/[id]/members
PATCH  /api/groups/[id]/members/[userId]          Update role / mute
DELETE /api/groups/[id]/members/[userId]          Remove member
POST   /api/groups/[id]/subgroups
PATCH  /api/groups/[id]/subgroups/[subId]

GET    /api/groups/[id]/messages                  Paged
POST   /api/groups/[id]/messages
PATCH  /api/groups/[id]/messages/[messageId]      Edit (15 min window)
DELETE /api/groups/[id]/messages/[messageId]      Delete
POST   /api/groups/[id]/messages/[messageId]/reactions
DELETE /api/groups/[id]/messages/[messageId]/reactions/[emoji]

POST   /api/groups/[id]/threads                   Open thread
GET    /api/groups/[id]/threads/[threadId]        Thread detail

POST   /api/groups/[id]/prayer-requests
GET    /api/groups/[id]/prayer-requests
PATCH  /api/groups/[id]/prayer-requests/[reqId]
DELETE /api/groups/[id]/prayer-requests/[reqId]
POST   /api/groups/[id]/prayer-requests/[reqId]/pray   Increments pray_count + writes trace_prayer_deliveries
POST   /api/groups/[id]/prayer-requests/[reqId]/updates
POST   /api/groups/[id]/prayer-requests/[reqId]/assign Pairs with member
POST   /api/groups/[id]/prayer-requests/[reqId]/reveal Anonymous → reveal-self
GET    /api/me/prayer-queue                       Cross-group personal queue

POST   /api/groups/[id]/plans                     Start plan (curated/AI/custom)
GET    /api/groups/[id]/plans/[planId]
POST   /api/groups/[id]/plans/[planId]/enroll
POST   /api/groups/[id]/plans/[planId]/leave
POST   /api/groups/[id]/plans/[planId]/days/[n]/discussion  Drop today's discussion
POST   /api/altar/plan/generate                   AI-assisted plan generation (existing /api/altar wrapper)

POST   /api/groups/[id]/meetings
GET    /api/groups/[id]/meetings
GET    /api/groups/[id]/meetings/[meetingId]
PATCH  /api/groups/[id]/meetings/[meetingId]
DELETE /api/groups/[id]/meetings/[meetingId]
POST   /api/groups/[id]/meetings/[meetingId]/rsvp        going|maybe|cant
POST   /api/groups/[id]/meetings/[meetingId]/attendance  bulk attendance mark
POST   /api/groups/[id]/meetings/[meetingId]/recording   Upload recording (consent gated)

POST   /api/groups/[id]/checkins
GET    /api/groups/[id]/checkins?from=&to=
POST   /api/groups/[id]/pairings
DELETE /api/groups/[id]/pairings/[pairingId]
POST   /api/groups/[id]/confessions                       Stores ciphertext only

POST   /api/groups/[id]/announcements
PATCH  /api/groups/[id]/announcements/[annId]
POST   /api/groups/[id]/announcements/[annId]/read

POST   /api/groups/[id]/care-plans
PATCH  /api/groups/[id]/care-plans/[careId]
POST   /api/groups/[id]/care-plans/[careId]/slots/[slotId]/claim
DELETE /api/groups/[id]/care-plans/[careId]/slots/[slotId]/claim

POST   /api/groups/[id]/reports                           Report content/member
GET    /api/groups/[id]/audit-log                         Leader-only

GET    /api/groups/[id]/search?q=&type=
```

All routes return `{ data, error }` envelopes consistent with existing routes. Pagination via `?limit=&cursor=`. Realtime piggybacks on Supabase channels named `group:{id}:chat`, `group:{id}:prayer`, `group:{id}:plan:{planId}`, `group:{id}:meeting:{meetingId}`.

### 4.4 Auth scopes

Two custom scopes encoded in `trace_group_members.role`: `owner | leader | co_leader | member | guest`. Server checks role per route per the permissions matrix (§8). No JWT custom claims — Supabase RLS + a server-side `assertRole(group_id, user_id, ['leader','owner'])` helper in `src/lib/api/groups.ts`.

---

## 5. Component library additions

New reusable components under `src/app/bible/tabs/groups/`:

- `<GroupCard />` — list row in `/bible/groups`.
- `<PulseStrip />` — horizontal scroller of pulse cards.
- `<GroupTabBar />` — 5-tab + overflow.
- `<ArchetypeCard />` — wizard step 1.
- `<PrivacyCard />` — wizard step 3.
- `<MemberRow />` — directory row.
- `<RoleChip />` — owner / leader / co_leader / member / guest.
- `<VerseCard />` — reusable in chat / announcements / prayer / meeting agenda.
- `<MessageBubble />` — chat / thread.
- `<ThreadHeader />` — parent message + reply count.
- `<ReactionBar />` — faith-native emoji bar with counts.
- `<VoiceMessagePlayer />` — record / play / transcript.
- `<PrayerCard />` — wall card.
- `<PrayerComposer />` — sheet with all fields.
- `<PrayerCounter />` — 🙏 + N animated bump.
- `<GuidedPrayerOverlay />` — full-screen guided mode.
- `<PrayerQueueScreen />` — swipeable cross-group queue.
- `<PlanProgressStrip />` — circular day strip + group avg.
- `<PlanDayCard />` — today's day card.
- `<DiscussionThread />` — per-day comment thread.
- `<MeetingCard />` — calendar row.
- `<AgendaBuilder />` — drag-and-drop list.
- `<LiveMeetingShell />` — live mode header + steps + capture buttons.
- `<CheckinForm />` — daily check-in form.
- `<StreakBadge />` — gentle streak chip.
- `<CarePlanGrid />` — date × slot grid.
- `<AnnouncementCard />` — pinned card with read-receipt avatars.
- `<JoinRequestRow />` — pending request row for leaders.
- `<InviteSheet />` — link / QR / email / SMS / in-app tabs.
- `<EmptyState />` — single sentence + one action.
- `<OfflineBanner />` — slim, always above content.

Common primitives (shared with rest of app, but must support these flows): `<Sheet />`, `<Modal />`, `<DragHandle />`, `<Skeleton />`, `<Toast />`.

---

## 6. Notification matrix

Defaults are intentionally quiet. Each event has: trigger, channels, default state, batching window, per-user override.

| Event | Channels | Default | Batch | Override |
|---|---|---|---|---|
| New chat in muted thread | — | Off | — | — |
| New chat in unmuted thread | In-app | On | None | Per-thread mute / per-group mute |
| @mention in chat | In-app + email | On | None | Always-on by policy |
| Direct reply to my message | In-app | On | None | Mute thread |
| New prayer request (group) | In-app | On | None | Per-feature toggle |
| New prayer request directed at me | In-app + email | On | None | Always-on by policy |
| Pray-count update on my request | In-app | Off → daily digest | End of day | Per-request opt-in for live |
| Praise report posted | In-app | On | None | Mute |
| Prayer follow-up (3d / 7d / 30d) | In-app + email | On | None | Mute |
| Plan day discussion drop | In-app | On (only enrolled) | None | Mute plan |
| Plan: someone fell behind 5 days | In-app to leaders | On | Daily | — |
| Meeting reminder (24h / 2h / 10m) | In-app + email | On | — | Per-meeting opt-out |
| Meeting recap | In-app + email | On | — | Per-group toggle |
| Check-in reminder | In-app | On | None | Per-day time |
| Streak rescue ("Welcome back") | In-app | On | None | Mute |
| New care plan I might serve | In-app | On | None | Mute |
| Announcement (pinned) | In-app + email if marked-important | On | None | Per-group |
| New join request (leaders) | In-app + email | On | None | Mute |
| Member joined | In-app | On | Daily | Mute |
| Member left / removed | In-app to leaders | On | Daily | Mute |
| Sub-group activity | In-app | On (sub-group members) | Hourly | Mute |
| Report flagged for leader review | In-app + email | On | None | Always-on |
| Auto-flagged self-harm language | In-app to chosen leaders | On | None | Always-on |
| Sabbath / quiet hours | All notifs paused | Off | — | Per-user |

Smart batching rule: notifications of the same event type from the same group are coalesced if more than 3 fire within an hour ("12 new prayers in `Tuesday Women's`").

Web-push delivery uses VAPID; users must opt in. Email channel uses Supabase Auth's email sender (transactional only — see Session 07 manual items for custom SMTP).

---

## 7. Permissions matrix

| Action | Owner | Leader | Co-leader | Member | Guest |
|---|---|---|---|---|---|
| Edit identity / privacy / settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ | ❌ |
| Archive / delete group | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve / decline join requests | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ✅ | ✅ (link only) | ❌ |
| Promote member → co_leader | ✅ | ✅ | ❌ | ❌ | ❌ |
| Promote co_leader → leader | ✅ | ❌ | ❌ | ❌ | ❌ |
| Remove member | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pin / unpin announcement | ✅ | ✅ | ✅ | ❌ | ❌ |
| Post announcement | ✅ | ✅ | ✅ | ❌ | ❌ |
| Post chat / start thread | ✅ | ✅ | ✅ | ✅ | ✅ (read-only by default) |
| Post prayer request | ✅ | ✅ | ✅ | ✅ | ❌ |
| Post on behalf of someone (Compassion mode) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark Praise Report on someone else's request | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign prayer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Start a reading plan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule meeting | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create care plan | ✅ | ✅ | ✅ | ✅ (for self) | ❌ |
| Open / claim a care slot | ✅ | ✅ | ✅ | ✅ | ❌ |
| Submit check-in | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pair as accountability partner | ✅ | ✅ | ✅ | ✅ | ❌ |
| Confess to partner | n/a | n/a | n/a | ✅ | ❌ |
| Read leader-only prayer | ✅ | ✅ | ✅ | ❌ | ❌ |
| View moderation queue / audit log | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit member roles | ✅ | ✅ | ❌ | ❌ | ❌ |

Permissions are stored on the role definitions in `trace_groups.settings_data.role_overrides`, allowing leaders to grant specific abilities ("a member can post announcements") without changing the role itself. Sane defaults shipped above.

---

## 8. Edge cases & failure modes (32 scenarios)

1. **Owner deletes account** → ownership auto-transfers to senior leader by `joined_at`. If none, group archives and members keep read-only access for 30 days.
2. **All leaders leave** → app prompts a senior member to "Step up as leader." If declined for 7 days, group goes read-only.
3. **Chat send while offline** → message queued in IndexedDB, retry on reconnect, shows "pending" pill, user can cancel.
4. **Verse picker offline** → uses cached `BOOKS` index already in app; verse text fetch falls back to "Tap to load when online."
5. **Voice message larger than 25 MB** → reject client-side with "Try a shorter message."
6. **Anonymous prayer request author later wants to reveal self** → server endpoint matches `request_id` against `trace_prayer_anon_keys`, only original author can call.
7. **Anonymous request flagged for moderation** → leader sees the report with the *content* but never the author identity. Action available: archive the post, not "ban the user."
8. **Self-harm language detected** in any chat / prayer / check-in → user receives an in-place card with crisis-line links + a "Talk to a leader" tap. Two leaders the user has marked as "trusted leader" get a discreet alert. No public flagging.
9. **Two leaders simultaneously approve the same join request** → unique constraint on `trace_group_members(user_id, group_id)`; second approval is a no-op with a friendly toast.
10. **Member leaves mid-plan** → enrollment goes to `left`. Their per-day comments stay visible but their progress strip stops advancing.
11. **Plan day comment posted after group archives the plan** → comment is rejected with "This plan has been archived."
12. **Catch-up joiner on Day 14 of a 21-day plan** → starts at Day 1 of their personal track; group view shows "X is catching up" rather than "X is behind."
13. **Meeting recording with one participant who declined consent** → recording is auto-paused and a banner shows "Recording paused — `name` declined." Resumes only when consent is granted or that participant leaves the room.
14. **AI-generated plan referencing a fabricated verse** → every generated reference is verified against the local `BOOKS` table before save; mismatches block the save with a server error.
15. **User toggles a group to Public after posting private prayers** → existing prayers retain their original `privacy_scope` (no retroactive widening). New prayers default per the new privacy. Banner explains.
16. **Care plan recipient withdraws** → recipient can archive the plan; existing claims show "Recipient withdrew" and reach out is on hold.
17. **Meal-train slot claimer cancels last-minute** → slot reopens; an alert goes to leaders + recipient; backup slots can be marked.
18. **Push permission revoked by browser** → app surfaces a single in-app banner once per week explaining how to re-enable.
19. **Quiet hours active** → notifications stack in a "While you were away" digest at end of quiet hours.
20. **Member muted-until + new prayer directed at them** → pierce-through rule: directed-at-me always notifies, mute or not. Documented in §6 ("Always-on by policy").
21. **Group member blocked at app level** → invisible to the blocker across all groups; blocker's messages still visible to blockee (asymmetric mute).
22. **Sub-group has an owner who isn't a leader of the parent group** → forbidden by RLS; sub-group create requires leader role on parent.
23. **Birthday reminder on a member who didn't share birthday** → the reminder simply doesn't fire; the field is opt-in.
24. **Translation per-message in chat** → tap "Translate" → request goes to a server endpoint (we'll proxy DeepL or Google Translate) so language keys aren't shipped client-side.
25. **Realtime channel disconnect during a busy chat** → reconnects with exponential backoff; on reconnect, fetches messages since the last seen `created_at`.
26. **Service worker stale** → versioned cache; on `controllerchange` we toast "New version available" and offer reload.
27. **Long voice message transcript fails** → audio plays normally; transcript shows "Transcription unavailable; tap to retry."
28. **Mass ban / takeover attempt** (compromised owner) → owner-only actions require recent re-auth (≤ 10 min). Audit-log row for every member-removal + email to all leaders within seconds.
29. **Duplicate-join via stale invite** → invite tokens are single-use; consumed tokens return 410 Gone.
30. **Plan / meeting / care plan in a deleted group** → cascade deletes via FKs; the soft-delete window of 7 days for archived groups holds the group + all children.
31. **Reactions to a deleted message** → cascade deletes via FKs.
32. **Confession dropped because pairing dissolved** → pairing soft-ends; existing confessions remain readable to the original pair only (clients hold private keys); server cannot decrypt.

---

## 9. Phased rollout

### v1 — Foundation (this rebuild)

Ships as a coordinated feature flag (`groups_v2`) gated per user — no big-bang flip. Includes:

- New tab IA + Pulse / Chat / Prayer / Study / Meetings / Members / Settings.
- Group create wizard with 4 archetypes (Small Group, Bible Study, Prayer Circle, Reading Plan Cohort) — others unlock in v2.
- Membership: invite (link + in-app username only), join requests, role matrix.
- Threaded chat with verse picker + reactions + reply threads. **No voice / no polls in v1.**
- Prayer Wall + Personal Prayer Queue + answered-prayer archive.
- Reading plans: Curated + Custom (manual entry). **AI generation in v2.**
- Meetings: schedule + RSVP + agenda. **Live mode + recording in v2.**
- Pulse home + announcements + read receipts.
- Notifications matrix (in-app only; web-push behind flag).
- Moderation: report content + audit log. **Auto self-harm flagging in v2.**

### v2 — Depth

- Voice messages + polls + image rich-link previews.
- AI-assisted plan generation.
- Live meeting mode + recording + transcription.
- Care plans (meal trains / rides / visits / giving).
- Accountability check-ins + streaks + partner pairings.
- Sub-groups / breakouts.
- Web-push opt-in flow live.
- Auto-flagging for self-harm language.
- Cross-group prayer wall (opt-in).

### v3 — Scale

- Confession (E2E encrypted) module.
- Church / organization accounts with verified badges.
- BIMI + custom-SMTP for outbound notifications.
- Multi-language UI + per-message translation.
- Audio Bible deep-integration (TTS already in app).

### Deprecation

The current `CommunityTab.tsx` "groups" surface stays available behind a "Classic groups" toggle for one release after v1 ships, then is removed. Data migration is a no-op — same tables.

---

## 10. Open questions

1. **Slug strategy** — auto-generated short slug (Reddit-style adjective-noun-N) vs. user-pickable slug at create time? Picked: auto initial, editable in Settings → Identity.
2. **Anonymous prayer + leader audit log** — should leaders see "anonymous prayer posted" in the audit log? Picked: no — too leaky. Audit row stores `event = 'prayer.created'` with `target_id = request_id` and no author.
3. **Sub-group privacy** — does a parent leader automatically see all sub-group content? Default proposed: **yes**, parent leaders see all (for moderation). Open: should there be an opt-in "private breakout" mode?
4. **Care-plan giving** — do we offer to embed a static QR for Venmo / Zelle / PayPal vs. only showing a text URL? The latter is safer (no QR-spoof risk).
5. **AI plan generator** — do we cache generated plans across users (similar topic) to control Anthropic spend? Trade-off: shared caches reveal what topics are popular in plan creation, which is identifying.
6. **Web-push** — VAPID key management: founder-managed in env, or per-user generated? Recommend founder-managed for v2.
7. **Translation provider** — DeepL vs. Google. DeepL is higher quality at low volume; Google scales cheaper. Open.
8. **Streak philosophy** — do streaks reset to 0 after a missed day, or do we use a "freeze" model (1 free miss / week)? Recommend freeze; needs leader sanity check.
9. **Confession key escrow** — if both partners lose their devices, confessions are unrecoverable by design. Acceptable? Yes — this is the *point*.
10. **Cover-image gallery** — do we ship a curated set of 30 free images at v1, or open camera-roll only? Recommend gallery for archetype-aware defaults; saves the 80% case.

---

## Appendix — Performance budgets (extracted from prompt)

- Chat send perceived latency `< 100 ms` (optimistic local insert + realtime echo).
- Group home load `< 1 s` on mid-tier Android over Fast 3G (skeletal first, server-rendered Pulse strip).
- Prayer wall scroll `60 fps` (virtualized list + lazy-loaded cards).
- Initial route JS `< 200 KB gzipped` (relies on `next/dynamic` from Session 07 + per-tab code split below).

Each tab loads behind `next/dynamic` so a returning user lands on Pulse without paying for Chat / Prayer / Study / Meetings until they tap.

---

## Appendix — Out of scope

Per the prompt:

- No payments, ever. Care-plan giving is a link-out.
- No medical data storage. Prayer requests can mention illness; we never store ICD codes or HIPAA-class info.
- No biometric data. No face / voice prints stored.
- No raw geo. Region-level only, opted in.
- No engagement-bait notifications. No streak shame. No re-engagement loops.

End of design.
