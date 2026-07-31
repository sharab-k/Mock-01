# Backend & Database Implementation Plan — JE Academy SRM

**Reference:** XT-2026-JE-004-EXT (Research, Analysis & Solution Specification), `CLAUDE.md`
**Status:** Frontend complete and live at https://mock-01-eta.vercel.app/. Every screen for all six
roles + the public site renders against mock data in `lib/mock/*.ts` and inline arrays. This document
plans the work to replace that mock layer with a real Supabase backend, in phases, without breaking
the UI that's already signed off.

---

## How to use this document

Each phase below is a **standalone prompt** — copy the fenced block into a Claude Code session and
run it. Phases are ordered so each one only depends on phases before it; don't skip ahead. Within a
phase, the prompt already tells Claude which skill to invoke (`/db-migrate`, `/feature`,
`qa-fix-workflow`) — that's not optional framing, those skills are how this repo's schema and feature
work are supposed to happen per `CLAUDE.md`'s golden rules.

After each phase:
1. Run `npm run typecheck && npm run lint && npm run test && npm run build` — the quality gate order
   `CLAUDE.md` already mandates.
2. Manually click through the affected screens in the browser preview — mock data swaps are easy to
   get subtly wrong (off-by-one joins, wrong role scoping).
3. Run `/review` before opening the PR for that phase.
4. Only then move to the next phase's prompt.

Each phase produces its own PR. Don't let phases balloon into one giant diff — if a phase prompt
starts touching files outside its stated scope, stop and split it.

---

## Corrections to standing assumptions before you start

Three things this plan relies on that differ from what `CLAUDE.md` currently says or assumes — read
these before running Phase 0:

1. **Deployment target is Vercel, not Fly.io.** The app is already live on Vercel
   (`https://mock-01-eta.vercel.app/`). `CLAUDE.md` §2 and §13 still describe a Fly.io rolling-deploy
   setup — that's stale. Phase 12 below updates `CLAUDE.md` to match reality. Until then, treat every
   `CLAUDE.md` reference to `fly deploy` / `flyctl` as superseded by Vercel env vars + `vercel deploy`.
2. **Puppeteer needs a serverless-safe swap.** `CLAUDE.md` §2 recommends plain Puppeteer for PDF
   reports. Plain Puppeteer bundles a full Chromium binary that's too large for Vercel's serverless
   function size limit. Phase 7 below uses `puppeteer-core` + `@sparticuz/chromium` instead — same HTML
   template approach, different launch mechanism. `puppeteer` is already a devDependency; it'll be
   replaced, not added to.
3. **A stale `teacher` role reference exists in `app/(auth)/login/actions.ts`.** Its
   `ROLE_DESTINATIONS` map still has `teacher: '/teacher'`, a leftover from before the teacher role was
   removed from the app (no `(teacher)` route group exists, and `CLAUDE.md`'s role model has never
   included it). Phase 1 removes it — if a `teacher`-role profile ever existed, the current code would
   redirect it into a 404.

---

## Schema additions beyond the `CLAUDE.md` §5 baseline

The baseline table list in `CLAUDE.md` §5 covers most of the SOW, but one thing the frontend already
implies isn't in it. Added in the phases below, not as a separate step — noting it here so it doesn't
look accidental when you hit it:

- **`audit_log`** — Super Admin's "master raw log audits" (SOW §3) needs a real table. `notification_log`
  only covers the WhatsApp/SMS pipeline; it doesn't cover "Ms. Rida Farooq edited marks for Ahmed Ali"
  style entries already mocked on `/super-admin/audit`. Added in Phase 9, kept deliberately minimal —
  `id, actor_id, action, created_at` only. No separate `detail` column (folded into `action` as one
  descriptive string) and no stored `flagged` column (computed from `action` at query/render time
  against a small keyword list instead of being set per call site).

**Not in scope:** `assignments` / `assignment_submissions`. The `/student/assignments` screen exists in
the frontend but isn't a real requirement at this stage — it stays cosmetic (local state only, resets
on refresh) and is explicitly out of scope for every phase below, not deferred to a later one.

Also: `avg_score` and `attendance_pct` on the mock `Student` type in `lib/mock/students.ts` are
**computed values**, not real columns — don't add them to the `students` table migration. They become
aggregate queries (or a Postgres view) over `marks` and `attendance_records` in Phases 2 and 5.

---

## Phase map

| # | Phase | Unlocks | Primary skill |
|---|-------|---------|----------------|
| 0 | Supabase bootstrap + middleware | Everything below | manual + `/db-migrate` |
| 1 | Auth + `profiles` + RBAC | All role gating | `/db-migrate` |
| 2 | Admissions module | Student records exist | `/db-migrate`, `/feature` |
| 3 | Attendance + notification pipeline | WhatsApp/SMS proven end-to-end | `/db-migrate`, `/feature` |
| 4 | Marks module | Reuses Phase 3 pipeline | `/db-migrate`, `/feature` |
| 5 | Parent portal data | Read-only aggregation | `/feature` |
| 6 | Student portal + video tracking | Watch-time enforcement | `/db-migrate`, `/feature` |
| 7 | PDF progress reports | Downloadable reports work | `/feature` |
| 8 | Notices backend | Notices board is real | `/db-migrate`, `/feature` |
| 9 | Super Admin backend | Staff mgmt, audit log, settings | `/db-migrate`, `/feature` |
| 10 | Public site persistence | Enquiry form actually saves | `/feature` |
| 11 | RLS + security test suite | Confidence before go-live | `qa-fix-workflow` |
| 12 | Production hardening + docs fix | Ongoing mitigation per SOW §2 | manual |

---

## Phase 0 — Supabase bootstrap + middleware

**Manual steps (you, not Claude):**
1. Create the Supabase project in the dashboard (or confirm one already exists for this client).
2. Copy the project URL, anon key, service role key, and project ID into `.env.local` (the four
   `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_*` vars already have placeholders in `.env.example`).
3. Confirm Docker Desktop is running if you want local Supabase too (`npx supabase start`).

**Claude Code prompt:**

```
Bootstrap the Supabase project for this repo and get the "Supabase not configured" banner on
/login to disappear.

1. Run `npx supabase init` at the repo root (no supabase/ directory exists yet).
2. Run `npx supabase link --project-ref $SUPABASE_PROJECT_ID` using the value already in .env.local.
3. Create `middleware.ts` at the repo root per CLAUDE.md §4: it should only refresh the Supabase
   session (via the SSR helpers already in lib/supabase/server.ts) and do a convenience redirect to
   the signed-in user's own portal root — it must NOT do role gating, that stays in each route
   group's layout.tsx. Use the standard @supabase/ssr middleware pattern (createServerClient with a
   response object, updateSession helper). Match the config matcher to exclude /api, /_next/static,
   /_next/image, and public asset extensions.
4. In app/(auth)/login/actions.ts, delete the stale `teacher: '/teacher'` entry from
   ROLE_DESTINATIONS — there is no (teacher) route group and no teacher role in CLAUDE.md's model.
5. Confirm `npm run dev` starts clean and /login no longer shows the "Supabase not configured" dev
   banner once .env.local has real values.

Do not create any tables yet — that's Phase 1. This phase is purely project wiring.
```

**Verify:** `/login` renders the real Supabase-backed form (dev-bypass grid disappears since
`NEXT_PUBLIC_SUPABASE_URL` now starts with `https`).

---

## Phase 1 — Auth + `profiles` + RBAC scaffolding

This is the foundation phase from `CLAUDE.md` §11 — nothing else works without it.

**Claude Code prompt:**

```
Implement the profiles table, RLS, and real role-based layout guards. Use the /db-migrate skill for
the schema change — do not hand-write SQL outside that flow.

1. /db-migrate: create the `profiles` table exactly as specified in CLAUDE.md §5 —
   id uuid primary key references auth.users(id) on delete cascade, role using a `user_role` enum
   (super_admin, admissions_admin, attendance_admin, marks_admin, student, parent — no teacher),
   full_name text, phone text, email text, created_at/updated_at timestamptz defaults.
2. RLS on profiles: a user can select their own row (id = auth.uid()). No insert policy for
   authenticated or anon roles — profiles are only ever created by an admin action using the
   service role key (server-side), matching CLAUDE.md golden rule 9 (no public self-registration).
   Add an update policy limited to non-role columns for self-service profile edits later, but for
   now keep it select-only plus service-role-bypass.
3. Regenerate types: `npx supabase gen types typescript --local > types/supabase.ts` (or --project-id
   for remote). This overwrites the hand-written stub — never hand-edit the output afterward.
4. Seed exactly one super_admin row directly via SQL migration or the Supabase dashboard (not
   through any app code path) — email/name from JE Academy, per CLAUDE.md's "no UI path can create a
   Super Admin" rule.
5. Update every route group layout.tsx that currently hardcodes a MOCK_USER
   (app/(super-admin)/layout.tsx, app/(admissions)/layout.tsx, app/(attendance)/layout.tsx,
   app/(marks)/layout.tsx, app/(student)/layout.tsx, app/(parent)/layout.tsx) to instead:
   a. Load the session server-side via lib/supabase/server.ts
   b. Fetch the caller's profiles row
   c. Redirect to /login if no session, or to the correct portal root if the role doesn't match
      that route group (mirror the ROLE_DESTINATIONS map already in login/actions.ts)
   d. Pass the real profile (name, email, role, roleLabel, roleColor, initials — derive
      roleLabel/roleColor/initials the same way the mocks did) into DashboardShell as `user`
6. Write a Vitest test (or a documented manual test script if Vitest can't hit RLS directly) that
   signs in as each of the 6 roles and confirms: (a) they land in their own portal root, (b) they get
   redirected out of every other role's route group. This is CLAUDE.md §12's first testing priority
   — "test as each role's JWT, not just logged in vs not."

Do not touch any other table yet. Do not wire real data into any dashboard's content — that's the
job of Phases 2 onward. This phase only makes auth + role gating real.
```

**Verify:** Sign in as the seeded Super Admin, confirm redirect to `/super-admin` and rejection from
every other route group. Confirm `/login` still shows the invalid-credentials error state correctly.

---

## Phase 2 — Admissions module backend

**Claude Code prompt:**

```
Wire the Admissions module to real data. Use /db-migrate for schema, /feature to scaffold the
Server Actions.

1. /db-migrate: create `students` per CLAUDE.md §5 plus a `section` column the baseline list omitted
   (id, roll_number, full_name, program, grade_level, section, enrollment_date,
   is_late_enrollment bool, status, deleted_at soft delete) and `parent_student_links` (parent_id
   references profiles, student_id references students, both with explicit ON DELETE CASCADE,
   composite PK on the pair). RLS: admissions_admin and super_admin can do everything on students;
   attendance_admin/marks_admin get select-only (they need it for rosters); parent gets scoped select
   via parent_student_links. No `student`-role scoping — per CLAUDE.md §4, no separate student login
   exists; a parent's own session covers both the multi-sibling view and any single-child drill-down.
2. Server Action (app/(admissions)/admissions/students/new/actions.ts or similar): replace the
   simulated genCredential() flow in AdmissionsNewStudentContent
   (components/dashboard/modules/AdmissionsNewStudentContent.tsx) with a real flow:
   a. Check for an existing parent by phone (profiles.phone, role = 'parent') — sibling case
   b. If none exists: use the Supabase Admin API (service role, server-only) to create an auth.users
      entry with a generated synthetic username (matching the existing genCredential() pattern,
      e.g. firstname.lastname.parent@jeacademy.edu.pk) and a generated temp password, then insert
      their profiles row (role: parent)
   c. Insert the students row and the parent_student_links row together via a single Postgres
      function (RPC) so they commit atomically
   d. If step (c) fails and a new parent account was created in step (b), delete that orphaned
      auth.users row as compensation — no compensation needed if an existing parent was reused
   e. Return the real roll number, username, and temp password to the success screen (same UI, real
      data instead of genCredential())
   This is the one-credential-per-family flow — there is no separate student account ever created,
   only the parent's, per CLAUDE.md §4's corrected role model.
3. Replace every mock array with real queries:
   - lib/mock/students.ts's STUDENTS/GRADE_SECTION_TOTALS usage across
     components/dashboard/modules/AdmissionsDashboardContent.tsx,
     AdmissionsClassDetailContent.tsx, and app/(admissions)/admissions/students/page.tsx
   - Compute grade/section totals with a real aggregate query, not a hardcoded object
4. Wire app/(admissions)/admissions/enquiries/page.tsx (via AdmissionsEnquiriesContent) to a real
   `admission_enquiries` table, created here via /db-migrate (not yet present — Phase 10 only wires
   the public form's insert, this phase owns the table itself). Match the columns the already-built
   UI actually uses (lib/mock/enquiries.ts): parent_name, parent_phone, grade_interest,
   program_interest, message, status, received_at — not CLAUDE.md §5's literal student_name/status
   baseline, which predates this screen being built out. Status pipeline (Unread/Contacted/Awaiting
   Visit/Enrolled/Declined) becomes a real enum column, updates via Server Action.
5. RLS test: sign in as attendance_admin and marks_admin JWTs, confirm both can read students but
   neither can insert/delete. Confirm admissions_admin cannot read attendance_records or marks
   (those tables don't exist yet this phase, so this is a forward-looking assertion to add once
   Phase 3/4 land — note it in a TODO comment in the test file instead of skipping the check
   silently).

Do not touch attendance or marks tables. Do not implement the notification trigger yet — that's
Phase 3, and admissions doesn't need it (only attendance/marks inserts trigger notifications per
CLAUDE.md §7).
```

**Verify:** Enrol a real student through the UI, confirm the parent account exists in Supabase Auth,
confirm a second child for the same parent phone links to the existing parent instead of duplicating.

---

## Phase 3 — Attendance module + notification pipeline

This is the phase that proves WhatsApp/SMS end-to-end on the simplest trigger, per `CLAUDE.md` §11 —
get this right before Marks reuses the same pipeline.

**Claude Code prompt:**

```
Wire the Attendance module to real data and stand up the notification pipeline. Use /db-migrate for
schema, /feature for the pipeline and Server Actions.

1. /db-migrate: create `attendance_records` per CLAUDE.md §5 (id, student_id, class_date,
   status enum present/absent/late, marked_by references profiles) and `notification_log`
   (id, channel enum whatsapp/sms, recipient, payload, status, sent_at). RLS: attendance_admin and
   super_admin write; parent reads only linked children's records (via parent_student_links — no
   separate student login exists, see CLAUDE.md §4); marks_admin gets no access to this table.
2. lib/notifications/ — build the provider adapter per CLAUDE.md folder structure §8: a
   provider-agnostic interface (send(channel, recipient, payload)) with a Twilio implementation
   (lib/notifications/twilio.ts) reading TWILIO_* env vars already present in .env.example. Keep the
   interface swappable — CLAUDE.md explicitly calls this out.
3. Notification trigger: after a successful insert into attendance_records (not on update), call the
   notification pipeline for absences. Implement as a Route Handler
   (app/api/notifications/route.ts) invoked from the Server Action right after the insert commits —
   NOT a Postgres trigger calling out to the internet, since CLAUDE.md's flow is "app inserts a row
   into a queue (or calls an Edge Function directly) → provider call → row written to
   notification_log with status: sent | failed." A failed Twilio call must be caught, logged to
   notification_log with status 'failed', and must NOT roll back or block the attendance_records
   insert — this is the single most important correctness rule in CLAUDE.md §7 and §12, write an
   explicit test for it (mock Twilio to throw, assert the attendance row still exists and
   notification_log has a 'failed' row).
4. Wire real data into:
   - components/dashboard/modules/AttendanceDashboardContent.tsx (replace CLASS_STATS/WEEK mocks)
   - components/dashboard/modules/AttendanceClassDetailContent.tsx (replace ALL_ROSTER/
     STUDENT_PROFILES mocks) — the single-click check-in buttons already built need to call a real
     Server Action that inserts/updates attendance_records and triggers step 3's pipeline
   - components/dashboard/AttendanceMarker.tsx (the standalone marker component used at
     /attendance/mark) — same wiring, plus its onSubmitted callback already fires a toast; connect
     that toast's count to the real number of notification_log rows written, not a guess
   - components/dashboard/modules/AttendanceRosterContent.tsx and app/(attendance)/attendance/
     reports/page.tsx and app/(attendance)/attendance/students/page.tsx
   - Since /super-admin/attendance and /super-admin/attendance/[grade]/[section] render the exact
     same shared components (basePath-parameterized, see the merge work already done), wiring the
     components once wires both shells — do not duplicate this work for the super-admin routes.
5. RLS test: attendance_admin JWT can write attendance_records; marks_admin and admissions_admin
   JWTs cannot. Parent JWT can only read attendance_records for students in their
   parent_student_links, never for any other student (write the explicit off-by-one regression test
   CLAUDE.md §12 calls out, even though the parent UI isn't wired until Phase 5 — the RLS policy
   needs to be provably correct now).
```

**Verify:** Mark a real student absent through `/attendance/mark`, confirm a `notification_log` row
appears (even if Twilio isn't configured yet — verify the `failed`-but-non-blocking path), confirm the
attendance record persisted regardless.

---

## Phase 4 — Marks module

**Claude Code prompt:**

```
Wire the Marks module to real data, reusing the Phase 3 notification pipeline. Use /db-migrate for
schema, /feature for Server Actions.

1. /db-migrate: create `marks` per CLAUDE.md §5 (id, student_id, subject, exam_type enum
   monthly/half_yearly/final, score, max_score, term, recorded_by references profiles) plus a
   `marks_edit_history` table (id, mark_id references marks, previous_score, new_score, edited_by,
   edited_at) — CLAUDE.md §4 requires marks_admin edits to be "logged, never silently overwritten."
   RLS: marks_admin and super_admin write marks (and the edit history is insert-only, populated by
   a trigger or the Server Action itself on update, never editable after the fact); parent reads
   only linked children's marks (via parent_student_links); attendance_admin/admissions_admin get
   no access.
2. Reuse lib/notifications/ from Phase 3 — insert into marks triggers the same
   app/api/notifications/route.ts pipeline (grade alerts to parents), same non-blocking-on-failure
   guarantee, same test pattern.
3. Resolve the open tier-evaluation question from CLAUDE.md §14 ("exact grading scale/weights...not
   yet defined anywhere in the SOW"): implement the four tiers already shown throughout the UI —
   Distinction ≥80%, Merit 65–79%, Pass 50–64%, Below Pass <50% — as a computed value (SQL CASE
   expression in a view, or computed in the query), not a stored column. Flag this default to the
   client as an assumption that needs their sign-off; leave a comment in the migration noting it's
   provisional pending confirmation.
4. Wire real data into:
   - components/dashboard/modules/MarksDashboardContent.tsx (replace CLASS_MARKS/TIERS/SUBJECTS)
   - components/dashboard/modules/MarksClassDetailContent.tsx (replace ALL_MARKS)
   - components/dashboard/modules/MarksEnterContent.tsx — the bulk score-entry table already has
     client-side validation against max_score; wire its save action to a real bulk insert Server
     Action, one marks_edit_history row per changed entry
   - components/dashboard/modules/MarksReportsContent.tsx (tier report — use the computed tier from
     step 3) and app/(marks)/marks/subjects/page.tsx and app/(marks)/marks/students/page.tsx
   - Same note as Phase 3: /super-admin/marks/* renders the same shared components, so this wiring
     covers both shells automatically.
5. RLS test: marks_admin JWT can write marks; every other admin role cannot. Confirm the edit-history
   table is genuinely append-only — attempt an UPDATE/DELETE against it with the marks_admin JWT and
   assert it's rejected by RLS, not just by application logic.
```

**Verify:** Enter marks for a real class through `/marks/enter`, edit one score, confirm
`marks_edit_history` recorded the change with both old and new values.

---

## Phase 5 — Parent portal data

**Claude Code prompt:**

```
Wire the parent dashboard to real aggregated data. This is read-only end to end — no new tables, no
new Server Actions that mutate anything. Use /feature to scaffold the queries.

1. Replace every mock in app/(parent)/parent/page.tsx (CHILDREN, CHILD_DATA, and the NOTICES array
   once Phase 8 lands — for now leave notices mocked if Phase 8 hasn't run yet, but everything else
   real) with real queries scoped through parent_student_links:
   - Sibling switcher: real list of linked children for the signed-in parent
   - Attendance KPI card + detail panel: aggregate attendance_records for the selected child
   - Marks KPI card + detail panel: aggregate marks for the selected child, same tier logic as Phase 4
   - "Progress Report" button stays wired to the Phase 7 PDF endpoint once that phase lands; for now
     it can keep its current simulated loading state if Phase 7 hasn't run yet
2. This is the single most security-sensitive read path in the app. Write the explicit regression
   test CLAUDE.md §12 names directly: "a parent with two children must never receive a third child's
   data through an off-by-one query, even in a join." Seed three students, two linked to parent A and
   one to parent B, sign in as parent A's JWT, and assert the query result set is exactly the two
   linked children — not by row count alone, by explicit ID match.
3. Confirm the multi-sibling data model stays many-to-many (CLAUDE.md explicitly warns against
   narrowing parent_student_links to one-to-many even though today's seed data might only have single
   children) — don't let a convenient query shortcut assume one parent per student.
```

**Verify:** Sign in as a parent with 2+ linked children, confirm the sibling switcher and both KPI
cards show correct per-child data, confirm no other student's data is reachable by manipulating the
selected-child state client-side.

---

## Phase 6 — Student-view screens (reached via parent session) + video watch-time tracking

Per CLAUDE.md §4's corrected role model: there is no separate student login. This phase makes the
`(student)` route group's content reachable through the signed-in parent's session for a specific
linked child, not through its own `requireRole('student')` guard (delete that guard — it can never
succeed, since nothing ever creates a `role = 'student'` profile).

**Claude Code prompt:**

```
Wire the student-view screens to real data and make video watch-time tracking real. Use /db-migrate
for schema, /feature for the heartbeat endpoint and the new access guard.

0. Replace app/(student)/layout.tsx's `requireRole('student')` call with a
   `requireParentAccessToChild(studentId)` helper (lib/auth/require-parent-access.ts): loads the
   parent's session same as requireRole, then confirms `studentId` (from a route param or query —
   decide the URL shape now, e.g. /student/[studentId]/lectures) is in that parent's
   parent_student_links. Redirect to /parent if not signed in as a parent, or if the studentId isn't
   one of theirs. Every page under (student) needs the selected child in scope from this point on —
   thread studentId through instead of assuming "the current student."
1. /db-migrate: create `video_lectures` (id, title, subject, duration_seconds, storage_path) and
   `video_watch_sessions` (id, student_id, lecture_id, watched_seconds, completed bool) per
   CLAUDE.md §5. RLS: a parent can read/write watch sessions only for students in their
   parent_student_links (no self-referential "own session" policy — there's no student auth id to
   match); admins get read access appropriate to their existing scope (marks_admin doesn't need
   this, admissions/attendance don't either — likely super_admin-only admin visibility for now
   unless the client specifies a teacher-facing view later).
2. Build app/api/video/heartbeat/route.ts per CLAUDE.md §7: accepts a POST with studentId, lecture_id,
   and a watched-seconds delta, validates the caller's session is a parent linked to that studentId
   (same check as step 0), accumulates server-side into video_watch_sessions.watched_seconds capped
   at duration_seconds — never trust a client-submitted total, only ever the accumulated
   server-side value. Mark completed = true at >=90% watched.
3. Rewire the heartbeat hook already built in app/(student)/student/lectures/page.tsx (path changes
   per step 0) — it currently simulates accumulation locally with setInterval and a demo-only
   IS_LATE_ENROLLMENT_DEMO flag. Keep the same UX (play/pause, progress bar, the "Late enrollment —
   strict tracking" badge) but:
   a. Read is_late_enrollment from the real students row for the selected child, not a hardcoded
      constant
   b. Only send heartbeats while the tab is visible AND actively playing — the demo already has a
      document.visibilitychange listener, keep that gating logic but point the interval's payload at
      a real fetch() to the heartbeat endpoint instead of local state
   c. Swap the "simulated video, no real asset" player for whatever real video source JE Academy
      provides (storage_path from video_lectures — likely Supabase Storage per CLAUDE.md §2). If no
      real lecture video assets exist yet, keep the current simulated player UI but make the
      heartbeat accumulation genuinely server-authoritative so the mechanism is provably correct
      even before real video files are supplied — the client-side simulation and server accumulation
      should agree.
4. Wire real data into app/(student)/student/attendance/page.tsx, marks/page.tsx, notices/page.tsx
   (once Phase 8 lands), and guides/page.tsx, all scoped to the selected child via step 0's guard.
   Leave assignments/page.tsx as is — out of scope, see the note at the top of this plan.
5. Decide and build the actual navigation from /parent into a child's student-view screens (e.g. a
   "View full portal" action on the sibling switcher) — there was no such entry point built yet
   since these were designed as separately-reached portals before this phase's correction.
6. Test the edge cases CLAUDE.md §12 names explicitly: tab blur mid-play (no heartbeat sent while
   hidden), pause (no accumulation while paused), seek-ahead (skipped span doesn't count — the
   heartbeat endpoint should reject or ignore a delta that implies a jump larger than the elapsed
   wall-clock time between heartbeats), multiple tabs open at once for the same lecture (accumulation
   shouldn't double-count). Also test that parent A cannot reach parent B's child's watch-time via a
   guessed studentId in the URL — the step 0 guard must reject it, not just hide the nav link.
```

**Verify:** As a parent, navigate from `/parent` into a linked child's lecture view, watch part of a
lecture, background the tab, come back, confirm `watched_seconds` only reflects foregrounded playback
time. Confirm an on-time student's lecture progress isn't gated by the 90% rule at all (per CLAUDE.md,
strict tracking is late-enrollment only). Confirm manually editing the studentId in the URL to a
non-linked child redirects away instead of leaking that child's data.

---

## Phase 7 — Downloadable PDF progress reports

**Claude Code prompt:**

```
Implement real PDF progress report generation. Use /feature to scaffold the route.

1. Swap the Puppeteer dependency for Vercel serverless compatibility: remove `puppeteer` from
   devDependencies, add `puppeteer-core` and `@sparticuz/chromium` to dependencies. This repo is
   deployed to Vercel (see the correction note at the top of this plan), and plain Puppeteer's
   bundled Chromium exceeds Vercel's serverless function size limit.
2. Build lib/reports/ per CLAUDE.md folder structure §8: an HTML report template (reusing the design
   system's tokens from CLAUDE.md §6 — ink-*/success/warning/danger colors, Newsreader serif for the
   report header only, IBM Plex Sans body, IBM Plex Mono for scores/dates/roll numbers) and a
   Puppeteer wrapper that renders the template to PDF via puppeteer-core + @sparticuz/chromium.
3. Build app/api/reports/[studentId]/route.ts: generates on demand (not pre-generated/stored per
   CLAUDE.md §7), aggregates monthly + half-yearly + final marks (from Phase 4's marks table) and the
   term's attendance percentage (from Phase 3's attendance_records), one PDF per student per term.
   Auth-gate it: only the student themselves, their linked parent(s), or an admin role may request
   it — verify against the session, not a client-supplied student ID alone.
4. Wire the "Progress Report" / "Download Progress Report" buttons already built in
   app/(parent)/parent/page.tsx and app/(student)/student/marks/page.tsx (both currently simulate a
   1.2–1.8s loading state then flip to a success icon) to call this real endpoint and trigger an
   actual file download, keeping the existing loading → success UI states.
5. Test: request a report for a student with no marks yet entered (empty state, don't crash), and for
   a student with entries across all three exam types (full aggregation).
```

**Verify:** Download a real PDF for a student with data in all three exam types, confirm it opens and
matches the design system visually, confirm an unauthorized user (wrong parent, wrong student) gets a
403, not a PDF.

---

## Phase 8 — Notices backend

**Claude Code prompt:**

```
Wire the notices system to a real table. Use /db-migrate for schema, /feature for the CRUD.

1. /db-migrate: create `notices` per CLAUDE.md §5 (id, title, body, audience enum, published_at) —
   the frontend's lib/mock/notices.ts already models category and a published bool beyond CLAUDE.md's
   baseline columns; carry those over into the real table since the UI depends on them
   (super-admin/notices/page.tsx's publish/unpublish toggle, category pills across every notice
   consumer).
2. RLS: only super_admin writes (matches the frontend — it's the only page with a create/edit modal);
   every other authenticated role gets audience-scoped read access to published notices only
   (published = true and audience matches their role or 'All'); anon/public gets read access to
   published notices where audience is 'All' or a public-facing category, for the landing page.
3. Wire real data into app/(super-admin)/super-admin/notices/page.tsx (full CRUD, replace the
   useState-seeded local array), and every read-only consumer: app/(admissions)/admissions/
   notices/page.tsx, app/(student)/student/notices/page.tsx, and the parent dashboard's Notices KPI
   panel in app/(parent)/parent/page.tsx.
4. Wire app/(public)/components/NoticesSection.tsx to pull real published, public-audience notices
   instead of its hardcoded NOTICES array — keep the same card + detail-modal UI already built.
```

**Verify:** Publish a notice as Super Admin, confirm it appears on the public landing page and in the
student/parent/admissions notice lists; unpublish it, confirm it disappears from all of them.

---

## Phase 9 — Super Admin backend (staff, audit log, settings)

**Claude Code prompt:**

```
Wire the remaining Super Admin surfaces to real data. Use /db-migrate for the audit_log addition,
/feature for the rest.

1. /db-migrate: create `audit_log` (id, actor_id references profiles, action text, created_at) — this
   is new versus CLAUDE.md §5's baseline (see the note at the top of this plan). Deliberately simple:
   a single `action` text column holds the full human-readable entry (e.g. "Edited marks — Ahmed Ali
   · Mathematics · Monthly"), not split into separate short-label + detail columns. There's no stored
   `flagged` column either — "flagged" is a display concern, not data: derive it at query/render time
   by matching `action` against a small fixed keyword list (e.g. contains "Deleted", "Deactivated",
   "failover"). RLS: insert-only for authenticated roles via Server Actions (never direct client
   insert), select restricted to super_admin.
2. Populate audit_log from the actions that already produce log-worthy events in earlier phases:
   student enrollment (Phase 2), attendance marked (Phase 3), marks edited (Phase 4), notice
   published (Phase 8), sub-admin account changes (this phase). The cleanest approach is a small
   shared server-side helper (lib/audit/log.ts, a single `logAction(actorId, action)` function) called
   explicitly at the end of each relevant Server Action — not a blanket Postgres trigger on every
   table, since the entries need human-readable text the DB layer doesn't have.
3. Server Actions for sub-admin lifecycle: create (Supabase Admin API, same pattern as Phase 2's
   parent account creation, role one of admissions_admin/attendance_admin/marks_admin only — never
   super_admin, matching CLAUDE.md's "no UI path can create a Super Admin"), deactivate/reactivate
   (toggle a status on profiles or a dedicated is_active column — add via /db-migrate if profiles
   doesn't already support it).
4. Wire real data into:
   - app/(super-admin)/super-admin/staff/page.tsx and staff/new/page.tsx
   - app/(super-admin)/super-admin/audit/page.tsx (replace the local AUDIT_LOG array, keep the
     actor/action-type/flagged-only filters already built — "flagged" now runs client- or
     query-side against the keyword list from step 1, not a stored column)
   - app/(super-admin)/super-admin/students/page.tsx and parents/page.tsx (shared students query
     from Phase 2, parent directory derived the same way the mock version group students by parent)
   - app/(super-admin)/super-admin/settings/page.tsx — Academy Info section stays mostly static
     content (placeholders per CLAUDE.md §14 pending real content from the client); Notification
     Provider status card should reflect whether TWILIO_* env vars are actually set, not a hardcoded
     "Pending configuration" pill
   - app/(super-admin)/super-admin/page.tsx root dashboard — replace STATS/ADMIN_PROFILES/
     GRADE_COUNTS with real aggregate queries across students, profiles, and attendance_records
5. teachers/page.tsx stays presentational/mock — CLAUDE.md's schema has no teachers table and this
   was always flagged as informational-only, not wired to real data. Leave it as is unless the
   client asks for a real teacher directory later.
```

**Verify:** Create a new sub-admin, confirm they can sign in and land in their correct portal
(re-running the Phase 1 role-redirect test against the new account). Confirm the audit log shows
entries from earlier phases' actions, not just this phase's.

---

## Phase 10 — Public site persistence

**Claude Code prompt:**

```
Finish the public-facing enquiry form. Use /feature — this is a small phase.

1. app/api/enquiry/route.ts already validates with Zod and has a TODO comment where persistence
   should go. Replace the console.info stub with a real insert into admission_enquiries (created in
   Phase 2 if not already present — check first, don't create it twice).
2. RLS on admission_enquiries: anon role gets INSERT only, no select/update/delete — the public form
   must never be able to read back other enquiries. admissions_admin and super_admin get full access
   (already covered by Phase 2's policies if that table was created there).
3. Confirm app/(public)/components/EnquirySection.tsx's existing success/error UI states work against
   the real endpoint unchanged — this phase is backend-only, no frontend UI changes expected.
```

**Verify:** Submit the public enquiry form, confirm the row appears in `admission_enquiries` and shows
up in `/admissions/enquiries`.

---

## Phase 11 — RLS + security test suite

Run this with the `qa-fix-workflow` skill per `CLAUDE.md` §10 — "once the first version is live and the
client starts sending feedback, switch to your qa-fix-workflow skill." This phase is the formal pass
that turns every ad hoc test written in earlier phases into a real suite, plus fills any gaps.

**Claude Code prompt:**

```
Invoke the qa-fix-workflow skill. Build out the full RLS and security regression suite for
CLAUDE.md §12's testing priorities, consolidating what earlier phases wrote plus filling gaps:

1. Per-table, per-role JWT test matrix: for every table created in Phases 1–9 (profiles, students,
   parent_student_links, attendance_records, marks, marks_edit_history, notification_log,
   video_lectures, video_watch_sessions, notices, admission_enquiries, audit_log), assert every
   role's JWT gets exactly the access CLAUDE.md §4 and
   this plan's earlier phases specify — not just "logged in vs not," full write/read matrix per role.
   A marks_admin token must fail every attendance write and vice versa (CLAUDE.md §12's explicit
   example).
2. Notification trigger correctness: consolidate Phase 3/4's failed-Twilio-doesn't-rollback tests
   into one suite, covering both attendance and marks triggers.
3. Watch-time edge cases: consolidate Phase 6's tab-blur/pause/seek-ahead/multi-tab tests.
4. Parent scoping: consolidate Phase 5's off-by-one sibling test, extend it to marks and notices
   once those are parent-readable.
5. Run the full suite against a fresh `npx supabase db reset` to confirm migrations + seed + RLS are
   reproducible from zero, not just working against a hand-tweaked local DB.

Report any gap you find between what CLAUDE.md specifies and what's actually enforced — don't
silently patch policy differences without flagging them first.
```

**Verify:** `npm run test` passes clean against a freshly reset local Supabase instance.

---

## Phase 12 — Production hardening + docs correction

**Claude Code prompt:**

```
Close out the "Ongoing Mitigation" scope from the SOW (§2) and correct CLAUDE.md to match reality.

1. Update CLAUDE.md:
   - §2 Stack table: change Deployment from "Fly.io" to "Vercel"
   - §13 Deployment: replace the fly deploy / flyctl instructions with the Vercel equivalent
     (vercel env, vercel deploy --prod, checking build logs in the Vercel dashboard)
   - §14 Open questions: remove items resolved by earlier phases (grading tier weights, once Phase 4
     confirms the assumption with the client), keep items still genuinely open (real content,
     WhatsApp/SMS provider confirmation if not yet formally signed off)
2. Confirm Supabase automatic backups / point-in-time recovery are enabled on the project tier in
   use — this is infrastructure config, verify and document it, not code.
3. Set up basic error monitoring for the Vercel deployment (Vercel's own observability is enough to
   start; note in CLAUDE.md if a dedicated tool like Sentry gets added later).
4. Confirm all secrets (SUPABASE_SERVICE_ROLE_KEY, TWILIO_*) are set via Vercel's environment
   variables UI, not committed anywhere, and are scoped to Production/Preview appropriately.
5. Do a final pass confirming every mock import (`lib/mock/*.ts`, and any remaining inline mock
   arrays inside dashboard component files) has been removed and nothing in the shipped app still
   reads from them. Grep for `lib/mock` imports across app/ and components/ as the last check.
```

**Verify:** `grep -r "lib/mock" app/ components/` returns nothing. Production deploy on Vercel reflects
real Supabase data end to end for all six roles plus the public site.
