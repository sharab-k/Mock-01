# CLAUDE.md — JE Academy SRM

This file is the standing context for Claude Code in this repo. It extends the global
senior-fullstack-dev golden rules with everything specific to **this** project — roles, schema,
design tokens, and build order. If something here conflicts with a generic instinct, this file
wins for this repo.

**Reference doc:** XT-2026-JE-004-EXT (Research, Analysis & Solution Specification)
**Status:** Pre-build — design system approved, schema below is the starting baseline, not yet migrated.

---

## 1. What this is

A single Next.js application serving two audiences:

1. **Public marketing site** (`(public)`) — institutional info + an admissions enquiry form. No auth.
2. **Six role-based portals** behind auth — Super Admin, Admissions Admin, Attendance Admin, Marks
   Admin, Student, Parent — each a "micro-targeted interface": a role only ever sees the components
   that map to its mandate. Nothing else.

Cross-cutting features that touch every portal: WhatsApp/SMS notifications on attendance + grade
events, multi-sibling parent accounts, strict video watch-time tracking for late enrollments, and
on-demand PDF progress reports.

---

## 2. Stack (confirmed)

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js App Router | Server Components default, single app — no separate NestJS backend for this project |
| Language | TypeScript (strict) | No `any`, no `@ts-ignore` |
| Database | Supabase (PostgreSQL) | RLS on every table — this is the real access boundary, see §4 |
| Auth | Supabase Auth | **No public sign-up route.** See §4 |
| Deployment | Fly.io | Rolling deploys |
| Styling | Tailwind CSS + shadcn/ui | Tokens in §6 — extend Tailwind, don't invent new colors |
| Validation | Zod | Every Server Action / Route Handler |
| Testing | Vitest | Alongside implementation, not after |
| Fonts | Newsreader, IBM Plex Sans, IBM Plex Mono | See §6 — serif is brand-only, never in dashboards |

**Open decisions — confirm before the relevant phase, recommendation given so work isn't blocked:**

| Decision | Recommendation | Why |
|---|---|---|
| WhatsApp/SMS provider | **Twilio** (WhatsApp Business API + SMS, one vendor) | SOW asks for SMS as a network failover to WhatsApp — one vendor with both channels is simpler to operate than Meta Cloud API + a separate SMS gateway |
| PDF report generation | **Puppeteer**, rendering an HTML report template to PDF | Reuses the existing design system (CSS) directly instead of a second styling system in a PDF-specific library |
| Video hosting/playback | Supabase Storage + native `<video>` + custom watch-time hook | No third-party video platform needed at this scale; watch-time logic must be ours regardless (see §7) |
| Super Admin provisioning | Seeded directly via Supabase dashboard/SQL, not through the app | There should be no UI path that can create a Super Admin |

---

## 3. Golden rules for this repo

The 7 global rules apply (plan before code, never touch DB without showing the migration, quality
gate order `typecheck → lint → test → build`, Server Components by default, no `any`, never expose
secrets, branch + PR always). Two more, specific to this project:

8. **RLS is the only real access boundary.** Route groups and layout-level role checks are UX —
   they make wrong-role pages unreachable through the app, but they are not security. Every table
   must enforce its own role access at the database level, full stop, even for tables that "only"
   the layout already protects.
9. **No public self-registration, anywhere.** Every account — admin, student, or parent — is
   provisioned by a higher role, not signed up. If a task implies adding a `/signup` page for
   students or parents, stop and flag it — that contradicts the SOW's credential-issuance model.

---

## 4. Roles & access model

| Role | Created by | Can do | Notes |
|---|---|---|---|
| `super_admin` | Seeded in DB directly | Override/edit anything, manage sub-admins, full audit log | 1–2 accounts, ever |
| `admissions_admin` | `super_admin` | Create/delete student records → **auto-issues parent credentials** on create | Owns the enquiry inbox too |
| `attendance_admin` | `super_admin` | Daily roster, single-click check-in → **triggers absence alerts** | One class roster view at a time |
| `marks_admin` | `super_admin` | Bulk mark entry, tier evaluation, edit history | Edits are logged, never silently overwritten |
| `student` | `admissions_admin` (on enrollment) | View own lectures, assignments, submit work | Token-validated session |
| `parent` | System-generated when `admissions_admin` creates a student | Read-only: attendance, marks, progress trends, for **all linked children** | Multi-sibling via join table, §5 |

### Route groups
```
app/
├── (public)/                 # marketing site — no auth
├── (auth)/
│   └── login/                # the ONLY auth entry point — role-aware redirect after login
├── (super-admin)/
├── (admissions)/
├── (attendance)/
├── (marks)/
├── (student)/
└── (parent)/
```

Each protected group has a `layout.tsx` that loads the session, reads `profiles.role`, and redirects
out if the role doesn't match the group. `middleware.ts` only refreshes the Supabase session and
does a convenience redirect to the user's own portal root — it is not the access control.

---

## 5. Database — baseline schema

Treat this as the starting migration set. Scaffold it via `/db-migrate` table by table — don't write
it all in one migration. Standard conventions from the global skill apply (`uuid` PKs, `timestamptz`,
`text` not `varchar`, `deleted_at` soft deletes, explicit `ON DELETE`).

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id (→auth.users)`, `role enum`, `full_name`, `phone`, `email` | One row per authenticated account, every role |
| `students` | `id`, `roll_number`, `full_name`, `program`, `grade_level`, `enrollment_date`, `is_late_enrollment bool`, `status` | `is_late_enrollment` gates strict video tracking, §7 |
| `parent_student_links` | `parent_id`, `student_id` | Many-to-many — this is what makes "one login, every sibling" work |
| `attendance_records` | `id`, `student_id`, `class_date`, `status enum (present/absent/late)`, `marked_by` | Insert triggers a notification, §7 |
| `marks` | `id`, `student_id`, `subject`, `exam_type enum (monthly/half_yearly/final)`, `score`, `max_score`, `term`, `recorded_by` | Insert/update triggers a notification, §7 |
| `notices` | `id`, `title`, `body`, `audience enum`, `published_at` | Powers the public "Notices" section and in-portal notice board |
| `admission_enquiries` | `id`, `student_name`, `parent_phone`, `program_interest`, `message`, `status` | From the public enquiry form, owned by `admissions_admin` |
| `video_lectures` | `id`, `title`, `subject`, `duration_seconds`, `storage_path` | |
| `video_watch_sessions` | `id`, `student_id`, `lecture_id`, `watched_seconds`, `completed bool` | Server-accumulated, never trust a client-reported total — §7 |
| `notification_log` | `id`, `channel enum (whatsapp/sms)`, `recipient`, `payload`, `status`, `sent_at` | Audit trail for the automated pipeline |

```bash
npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts
```
`types/supabase.ts` is generated — never hand-edit it.

---

## 6. Design system — source of truth

Full spec lives in `JE-Academy-Design-System.html` (and the earlier Design Guidelines doc). Don't
introduce new colors — extend Tailwind with exactly this set.

```ts
// tailwind.config.ts — extend.colors
neutral: {
  50:'#FBFAF9', 100:'#F5F4F2', 200:'#E9E6E2', 300:'#D6D2CC', 400:'#B5AEA6',
  500:'#938B80', 600:'#756C61', 700:'#5A5349', 800:'#3C372F', 900:'#26221D', 950:'#181511',
},
ink: {
  50:'#F5F6FA', 100:'#E8EBF3', 200:'#CED4E3', 300:'#A5B0CA', 400:'#6F83AE',
  500:'#495F8D', 600:'#334671', 700:'#233357', 800:'#18243E', 900:'#0F1629',
},
success: '#3D7157', 'success-bg': '#EAF5F0',
warning: '#A97C2D', 'warning-bg': '#F7F0E3',
danger:  '#973F35', 'danger-bg':  '#F7EBE9',
role: {
  super: '#233357',      // = ink-700 — Super Admin only, do not introduce a separate hex
  admissions: '#A26D53', attendance: '#487A63',
  marks: '#7E587E',      student: '#547B96', parent: '#988671',
},
```

**Rules Claude Code should enforce on every PR touching UI:**
- Ink (`ink-600`/`ink-700`) is the only accent — no second brand color, ever.
- Role color (`role.*`) is a 6px identity dot or a small chip only. Never a full card, sidebar, or
  page background. If a diff colors an entire panel in a role hue, that's a regression, not a style choice.
- Serif (`Newsreader`) is for `(public)` routes, `(auth)/login`, and PDF report headers only. Every
  dashboard route — all six portals — is `IBM Plex Sans` body text + `IBM Plex Mono` for IDs, roll
  numbers, dates, and marks. If a dashboard PR introduces the serif on a data view, flag it.
- Status pills (present/absent/late, pass/fail) are the only place color carries meaning outside the
  ink accent. Don't add new semantic colors for other states — reuse these three.
- Avatar fallback is initials-on-`ink-100` (text `ink-700`) until real photography exists. Never a
  generated or stock face for a named person.

---

## 7. Feature specs (SOW → build rules)

**Notification pipeline** (attendance + marks → WhatsApp/SMS)
- Trigger point: after a successful insert into `attendance_records` or `marks`, not on every update.
- Flow: app inserts a row into a queue (or calls an Edge Function directly) → provider call (Twilio,
  pending §2) → row written to `notification_log` with `status: sent | failed`.
- Failures must not block the underlying attendance/mark write. Log and retry, never roll back the
  academic record because a WhatsApp call failed.

**Multi-sibling parent accounts**
- `parent_student_links` is many-to-many on purpose, even though the SOW describes one parent per
  family in practice — don't constrain it to one-to-many, a remarried or guardian-shared case will
  break it later.
- Parent portal always renders a sibling switcher when `count(links) > 1`, even if today every parent
  in the seed data has exactly one child.

**Strict video watch-time tracking**
- Only enforced when `students.is_late_enrollment = true` — on-time students aren't gated by this.
- Client sends a heartbeat (every ~10s, only while the tab is focused and the video is actually
  playing) to a Route Handler; the server accumulates `watched_seconds`, capped at `duration_seconds`.
- Never trust a client-submitted total watch time — only ever trust the accumulated heartbeats.
- Mark `completed = true` at ≥90% watched. Seeking ahead doesn't count as watching the skipped span.

**Downloadable progress reports**
- One PDF per student per term, generated on demand by a Route Handler (not pre-generated/stored) —
  aggregates monthly tests + half-yearly + final marks and the term's attendance percentage.
- Rendered from an HTML template using the design system's tokens (§6), converted via Puppeteer.

---

## 8. Folder structure

```
app/
├── (public)/
│   ├── page.tsx                 # the single landing page from the design system
│   └── components/
├── (auth)/login/page.tsx
├── (super-admin)/...
├── (admissions)/...
├── (attendance)/...
├── (marks)/...
├── (student)/...
├── (parent)/...
├── api/
│   ├── notifications/route.ts
│   ├── reports/[studentId]/route.ts
│   └── video/heartbeat/route.ts
└── layout.tsx                   # fonts (Newsreader, IBM Plex Sans/Mono), root providers
lib/
├── supabase/{client,server}.ts
├── notifications/                # provider adapter (Twilio today, swappable)
└── reports/                      # PDF template + Puppeteer wrapper
components/
├── ui/                           # shadcn primitives
└── features/                     # ProgrammeCard, FeatureTile, RoleChip, StatusPill, Avatar...
types/supabase.ts                 # generated, never hand-edited
```

---

## 9. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never shipped to the client
SUPABASE_PROJECT_ID=

TWILIO_ACCOUNT_SID=               # pending §2 confirmation
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_SMS_FROM=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 10. Local development setup

**Prerequisites:** Node 20+, npm, Docker (for local Supabase), [Supabase CLI](https://supabase.com/docs/guides/cli), Fly CLI (only needed once you deploy).

```bash
# 1. Install dependencies
npm install

# 2. Start Supabase locally (Postgres + Auth + Storage in Docker)
npx supabase init        # first time only
npx supabase start

# 3. Copy env template and fill in the local Supabase values it prints out
cp .env.example .env.local

# 4. Apply migrations (once the first ones exist — see §11 build order)
npx supabase db reset

# 5. Generate types
npx supabase gen types typescript --local > types/supabase.ts

# 6. Run the app
npm run dev   # http://localhost:3000
```

**Working with Claude Code in this repo:**
- The global **senior-fullstack-dev** skill is already your standing lens — no setup needed, it
  applies automatically to every engineering conversation in this directory.
- Use `/feature` to scaffold each module in §11 in order: migration → types → API → UI → tests.
- Use `/db-migrate` for every single schema change, including the baseline tables in §5 — don't
  hand-write SQL outside that flow.
- Use `/review` before opening every PR.
- Once the first version is live and the client starts sending feedback, switch to your
  **qa-fix-workflow** skill for applying it — that's what it's built for.

---

## 11. Recommended build order

1. **Auth + `profiles` + RBAC scaffolding** — route groups, layout-level role gates, RLS on `profiles`. Nothing else works without this.
2. **Admissions module** — student CRUD, and the auto-issued parent credential flow. This is the only way test data enters the system, so it has to come early.
3. **Attendance module + the notification pipeline** — prove WhatsApp/SMS end-to-end here, on the simplest trigger, before marks needs the same plumbing.
4. **Marks module** — reuses the notification pipeline from step 3.
5. **Parent portal** — read-only aggregation across attendance + marks, sibling switcher.
6. **Student portal + video watch-time tracking.**
7. **PDF progress reports** — depends on marks + attendance data existing.
8. **Public landing page** — static content, doesn't block any internal SRM functionality, but the client may want to see it earlier for sign-off; reorder ahead of step 5 if so.
9. **Design-freeze polish pass** — audit every screen against §6 before client sign-off on wireframes.

---

## 12. Testing priorities

- RLS policies — test as each role's JWT, not just "logged in vs not." A `marks_admin` token must
  fail every attendance write, and vice versa.
- Notification trigger correctness — a failed Twilio call must not roll back the academic record.
- Watch-time edge cases — tab blur, pause, seek-ahead, multiple tabs open at once.
- Parent scoping — a parent with two children must never receive a third child's data through an
  off-by-one query, even in a join.

---

## 13. Deployment

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx supabase db push      # migrations before code, always
fly deploy
fly logs --tail
```

Suggest two Fly apps — `je-academy-staging` and `je-academy` — never push straight to the production
app. Same rolling-deploy, secrets-via-flyctl rules as the global skill.

---

## 14. Open questions before Phase 1

- WhatsApp/SMS provider — confirm Twilio (§2) or specify the alternative.
- Exact grading scale/weights behind "student tier evaluation" in the Marks Admin spec — not yet defined anywhere in the SOW.
- Real content for the public site (faculty bios, address, principal's note) — still pending from JE Academy per the SOW's Content Provision clause; the landing page is built with clearly marked placeholders for all of it.
