# J.E ACADEMY SRM — Architecture & Performance Report

**Scope:** the Next.js web app (`www.je-academy.com`), the Expo/React Native Android app, the Supabase database, and the pipeline between them.
**Method:** code audit of the whole repository, plus *measurements taken against the live production site, the live database and the built APK* (numbers below are measured, not guessed — estimates are always labelled "estimate").
**Measured from:** a PC in Pakistan (Cloudflare edge `KHI`), October 2026.

---

## 1. Executive summary

**Why the web and the app feel slow — in one sentence:** every screen makes several *sequential* database round trips, and each round trip crosses half the planet, because the website's servers run in **Washington D.C.** while the database is in **Sydney** — and nothing is cached.

The ranked causes, with the evidence:

| # | Cause | Evidence (measured) | Share of the slowness |
|---|---|---|---|
| 1 | **Region mismatch**: Vercel functions run in `iad1` (Washington), Supabase is in `ap-southeast-2` (Sydney). No region is configured anywhere. | Response header `x-vercel-id: sin1::iad1::…`; `supabase projects list` → `ap-southeast-2`. A route with **no** database call answers in 341 ms; every database hop adds **0.3–0.5 s**. | **Largest** |
| 2 | **Auth waterfall on every request**: middleware `getUser()` → layout `getUser()` → profile query, three sequential hops *before the page starts*. 32 `getUser()` calls in the code. | Smallest authenticated page (28 KB) takes **1.07 s**; that is the floor for any page. Student search does 4 hops = 2.25 s. | Very large |
| 3 | **Oversized pages, no pagination**: the whole student list, whole parent list, whole fee roster are sent to the browser on every visit. | `/super-admin/students` **1,049 KB / 3.4 s**; `/parents` **793 KB / 4.8 s**; `/fees` 646 KB; `/attendance/roster` 480 KB. | Large |
| 4 | **Dashboards scan whole tables** instead of asking the database to aggregate (13 unbounded reads of `marks`, several of `attendance_records`). | Fine today (45 marks / 116 attendance rows) but **silently wrong beyond 1,000 rows** — and 574 students marked for just 2 days is 1,148 rows. | A *correctness time bomb* + growing slowness |
| 5 | **Row-level-security policies are inefficient**: 16 "re-evaluated per row" warnings and 86 "multiple permissive policy" warnings (Supabase's own advisor). | `supabase db advisors` → 102 performance findings. | Medium now, large with data growth |
| 6 | **No caching anywhere**: 0 uses of `unstable_cache`/`revalidate`; every one of 67 pages is dynamic, **including the public landing page**. | Landing page TTFB 1.3–1.5 s, `Cache-Control: no-store`. | Medium |
| 7 | **Mobile app: no list virtualization, no cache, direct trans-Pacific queries, 118 MB APK.** | 173 `ScrollView`s, **0** `FlatList`s; 575 student cards rendered at once; APK has 4 CPU architectures and no code shrinking. | App-specific |

**Two findings that are urgent regardless of speed:**

1. **The bulk marks upload will time out on your real file.** Measured: **1.96 s per save group** on the live site. Your file needs roughly 150–250 groups ⇒ **≈ 5–8 minutes**, but the route is limited to 300 s (and 60 s on a Vercel Hobby plan). A real save would stop halfway with the marks *partially* written. (§7.2)
2. **Attendance and marks dashboards will start showing wrong numbers** as soon as real daily attendance is marked for the whole school (2 school days ≈ 1,148 rows > the 1,000-row limit Supabase returns per request). (§7.3)

**What is good (so it isn't lost in the list of problems):** the browser JavaScript is small (103 kB shared, 105–118 kB per page — not a problem); security is enforced in the database (RLS) rather than only in the UI; absence alerts are a database trigger and cannot be skipped; PDFs are generated without a headless browser; the indexes are mostly right; there are 166 automated tests.

**Expected effect of the fixes (estimates):** moving the functions next to the database and removing the auth waterfall should take the typical page from **1.1–3.4 s to roughly 0.4–1.2 s**, and the heavy lists from **3–5 s to ~1 s** once paginated. The APK can fall from **118 MB to roughly 35–45 MB**. Details and order of work are in §10.

---

## 2. System overview

```
                         ┌────────────────────────────────────────────┐
   Parents / Staff       │                 VERCEL                      │
   (Pakistan)            │  Edge: sin1 (Singapore)                     │
        │                │      │                                      │
        │  HTTPS         │      ▼                                      │
        ├───────────────►│  Next.js 15 (App Router)                    │
        │  web           │   • middleware.ts   → auth.getUser()  ──┐   │
        │                │   • layouts         → auth.getUser()  ──┤   │
        │                │   • Server Components / Server Actions  │   │
        │                │   • Route Handlers  /api/*  (43)        │   │
        │                │  Functions run in: iad1 (Washington D.C.)│   │
        │                └──────────────────────────────────────────┼───┘
        │                                                           │  (~0.3–0.5 s per hop)
        │  HTTPS (Bearer token)                                     ▼
        ▼                              ┌──────────────────────────────────────┐
  ┌───────────────┐   direct (RLS)     │            SUPABASE                  │
  │ Android app   ├───────────────────►│  Region: ap-southeast-2 (Sydney)     │
  │ Expo / RN     │                    │  Postgres 17 + PostgREST + Auth      │
  │ (49 screens)  │   /api/mobile/*    │  47 RLS policies · 1 DB trigger      │
  │               ├──► Vercel ────────►│  parent_credentials (encrypted)      │
  └───────────────┘   (for admin-only  └──────────────────────────────────────┘
                       reads & writes)
```

**Three data paths exist, and each has a different latency profile:**

| Path | Used by | Hops |
|---|---|---|
| **A. Browser → Vercel (Server Component/Action) → Supabase** | All web pages | 3 hops of auth + N page queries, each iad1↔Sydney |
| **B. Phone → Supabase directly** (RLS-scoped) | ~41 query sites in the app (dashboards, marks, attendance, parent views) | 1 hop per query, phone↔Sydney, no cache |
| **C. Phone → Vercel `/api/mobile/*` → Supabase** | Anything needing the service-role key: parent directory, student list, search, record, uploads, reports, writes | Path A's cost plus the phone↔Vercel leg |

### 2.1 Inventory

| Item | Count |
|---|---|
| Web pages / layouts / API routes | 67 / 8 / 43 |
| Mobile screens | 49 |
| Web source | ~22,200 lines (`app` 4,384 · `components` 9,629 · `lib` 8,214) in 302 files |
| Mobile source | ~12,050 lines in 149 files |
| SQL migrations | 32 files, 1,578 lines |
| RLS policies / indexes | 47 / ~30 |
| `'use client'` components | 61 |
| Service-role (RLS-bypassing) call sites | 23 |
| Automated tests | 166 (21 web files) · **0 for mobile** |
| Production data | students 581 · profiles 542 · parent links 576 · parent credentials 532 · attendance 116 · marks 45 · fee payments 41 · audit log 1,409 · notification log 107 (legacy) · portal notifications 21 |

### 2.2 Stack

- **Web:** Next.js 15.3, React 19, TypeScript (strict), Tailwind, `@supabase/ssr` 0.12, `pdf-lite` on `pdf-lib`, `exceljs` (spreadsheet upload), Zod, Vitest.
- **Mobile:** Expo SDK 57, React Native 0.86.2 (New Architecture, Hermes), Expo Router, `@supabase/supabase-js`, `expo-secure-store` (chunked session storage), `expo-document-picker`.
- **Database:** Supabase Postgres 17, RLS on every table, a `SECURITY DEFINER` trigger that raises the parent absence notice.
- **Hosting:** Vercel (single project, single environment), EAS Build for APKs.

---

## 3. Anatomy of a request (why one page costs ≥ 1.1 s)

### 3.1 An authenticated web page — what happens before your page code runs

```
Browser (Pakistan)
  └─► Vercel edge  sin1                                          ~0.1 s
        └─► function  iad1 (Washington)
              1. middleware.ts   supabase.auth.getUser() ───────► Supabase Auth (Sydney)   ≈0.3–0.4 s
              2. layout.tsx      requireRole → auth.getUser() ──► Supabase Auth (Sydney)   ≈0.3–0.4 s   (same user, asked again)
              3. layout.tsx      select role… from profiles ────► Postgres (Sydney)        ≈0.3–0.4 s
              4. page.tsx        its own queries …            ──► Postgres (Sydney)        ≈0.3–0.4 s each (sequential groups)
```

`getUser()` is a **network call to Supabase Auth every time** (it validates the token server-side). It is called in middleware, again in the layout, and again inside many data functions (32 call sites) — each one a Pacific-sized round trip. That is why even `/super-admin/timetable` (28 KB, almost no data) takes **1.07 s**.

### 3.2 Measured timings

**Web pages** (Super Admin, live site, median of 3 requests):

| Page | Time | HTML/RSC size | Main reason |
|---|---|---|---|
| `/super-admin/timetable` | 1.07 s | 28 KB | the auth floor (3 hops) |
| `/super-admin/search` | 1.09 s | 26 KB | the auth floor |
| `/super-admin/subjects` | 1.10 s | 107 KB | floor + 1 query |
| `/super-admin/staff` | 1.13 s | 38 KB | floor |
| `/super-admin/notifications` | 1.47 s | 62 KB | floor + queries |
| `/super-admin/audit` | 1.52 s | 223 KB | floor + audit rows |
| `/super-admin` (dashboard) | 1.54 s | 51 KB | floor + 6 parallel queries |
| `/super-admin/attendance` | 1.70 s | 80 KB | floor + 4 parallel scans |
| `/super-admin/fees` | 1.82 s | **646 KB** | whole fee roster sent |
| `/super-admin/marks/enter` | 1.92 s | 148 KB | all students + all marks |
| `/super-admin/attendance/roster` | 2.35 s | 480 KB | every student |
| `/super-admin/marks` | 2.27 s | 80 KB | scans the whole `marks` table 3× |
| `/super-admin/attendance/9/G1` | 2.55 s | 73 KB | 4 sequential query groups (roster) |
| `/super-admin/students` | **3.36 s** | **1,049 KB** | all 575 students + contacts + fees |
| `/super-admin/parents` | **4.77 s** | **793 KB** | all 532 parents joined to children + vault lookup |
| **Login → dashboard** | **5.3 s** | — | sign-in + redirect + dashboard render |

**API routes** (live, median of 5; bearer token):

| Route | Time | Notes |
|---|---|---|
| No database at all (CSV template) | **0.34 s** | the baseline cost of reaching Vercel from Pakistan |
| Invalid token → 401 | 0.62 s | = baseline + **one** Auth round trip (+0.28 s) |
| Student search | **2.25 s** | 4 sequential hops: `getUser` (route) + `getUser` (again, inside the function) + role lookup + the query |
| Student full record | 2.66 s | ~8 queries |
| Parent directory (JSON, 203 KB) | **4.9 s** | the same data the page sends |
| Progress report PDF (full / month) | 2.5 s / 2.3 s | 3 queries + render |

**Direct database from the PC (phone path "B"):**

| Operation | Median |
|---|---|
| One small query | 283 ms |
| Sign-in | 513 ms |
| Auth `getUser` | 298 ms |
| 574 students in one query | 583 ms |
| **6 queries one after another** | **1,852 ms** |
| **The same 6 queries in parallel** | **820 ms** |

The last two rows are the important lesson for the app: *sequential* awaits cost more than twice as much as parallel ones, and every query costs ~0.3 s before any data moves.

**Public pages and assets:**

| Item | TTFB | Total | Size | Note |
|---|---|---|---|---|
| Landing page `/` | 1.28–1.55 s | 1.7–1.9 s | 127 KB | **`Cache-Control: no-store`, `X-Vercel-Cache: MISS`** — a public page that is never cached |
| `/login` | 0.54–0.67 s | 0.6 s | 17 KB | |
| `classroom-group.jpg` | 0.79 s | 2.35 s | **4.1 MB** | original, un-resized file |
| `classroom-engaged.jpg` | 0.67 s | 3.06 s | 2.9 MB | |
| `classroom-primary.jpg` | 0.74 s | 2.20 s | 2.5 MB | |

(The landing page uses `next/image`, which serves resized copies, but the originals are 12+ MB in total and are what the optimizer has to fetch and process on first request.)

**Browser JavaScript is not the problem:** shared 103 kB, 105–118 kB per page, middleware 92 kB. All 67 routes are rendered on demand (`ƒ`).

---

## 4. Web application — architecture findings

### 4.1 Region mismatch — **Critical**
- **Evidence:** `x-vercel-id: sin1::iad1::…`; Supabase project `je-academy-srm` is `ap-southeast-2`. There is no `vercel.json`, no `preferredRegion`. Vercel's default function region is `iad1`.
- **Impact:** every database/auth call pays Washington↔Sydney latency (≈ 200–230 ms of pure network) plus a fresh TLS connection per invocation. Measured cost per hop: 0.28–0.5 s. This multiplies every other problem.
- **Fix:** *(a) immediately*: set the function region to Sydney (`"regions": ["syd1"]` in `vercel.json`) so functions sit beside the database; *(b) properly*: the users are in Pakistan — create the next Supabase project in a nearer region (Mumbai `ap-south-1` or Singapore `ap-southeast-1`) with functions in `bom1`/`sin1`. A Supabase project's region cannot be changed in place; it needs a new project plus a data migration.
- **Estimate:** each hop falls from ~0.35 s to ~0.02–0.05 s. A 3-hop page floor goes from 1.07 s to roughly 0.4–0.5 s.

### 4.2 The auth waterfall — **Critical**
- **Evidence:** `middleware.ts` calls `auth.getUser()` on *every* matched request (including the public landing and login pages); `requireRole()` in each layout calls `getUser()` again and then queries `profiles`; 32 `getUser()` call sites in web server code in total. The student-search function calls `getUser()` twice (once in the route, once inside `requireSuperAdmin`).
- **Impact:** 3 sequential trans-Pacific hops before any page code runs; redundant hops inside functions.
- **Fix:**
  1. Replace `getUser()` with **`getClaims()`** (verifies the JWT locally against cached signing keys — no network) in middleware and layouts. `getUser()` only where a fresh server check is truly needed (sensitive actions).
  2. Put the role into the JWT (a custom access-token hook or `app_metadata.role`) so the layout does **not** need the `profiles` query.
  3. Wrap the "current user" lookup in React `cache()` so one request resolves it once.
  4. Keep `is_active` enforcement but check it from the same JWT/claims, or from one cached read.
- **Estimate:** removes 2–3 of the 3 floor hops per page: **−0.6 to −1.0 s per page** at today's latency.

### 4.3 Public pages are dynamic and uncached — **High**
- **Evidence:** the middleware matcher covers `/` and `/login`; the landing page returns `Cache-Control: private, no-cache, no-store` and `X-Vercel-Cache: MISS` with 1.3–1.5 s TTFB.
- **Fix:** exclude public routes (`/`, `/login` marketing parts, images) from the auth middleware, or only refresh the session when a session cookie exists; render the landing page statically (ISR) so the CDN serves it in tens of milliseconds.

### 4.4 Oversized, un-paginated pages — **High**
- **Evidence:** the pages above ship up to **1 MB** of data per visit; the students and parents directories load *every* record and filter in the browser; React Server Component payloads are re-sent on each navigation.
- **Fix:** server-side search + pagination (e.g. 50 rows per page, `range()`), load detail on demand (the drawer fetches one student/parent), keep only the columns the list shows. The student-search page already follows this pattern and is the model to copy.
- **Estimate:** directories from 3.4–4.8 s / ~1 MB to ~1.0–1.5 s / <60 KB.

### 4.5 Whole-table reads for dashboards — **High (correctness + speed)**
- **Evidence (counted):** 13 unbounded reads of `marks` across web and mobile (`dashboard-data`, `student-averages`, `subjects-data`, `enter-data`, `tests`), unbounded reads of `attendance_records` in `attendance-stats.ts`, `reports-data.ts`, and the roster's term statistics (`lib/attendance/roster.ts:32` reads *all* attendance for the class).
- **Why it matters:** PostgREST returns at most **1,000 rows per request**, silently. The dashboard computes averages from whatever came back — wrong numbers with no error.
- **Fix:** move aggregation into the database (SQL views or RPC functions: `class_attendance_summary`, `subject_averages`, `student_averages`), call them with `count`/`group by`, and page anything else with `range()`. This also removes most payload.

### 4.6 Sequential query groups — **Medium**
Examples: class roster (students → today's + term attendance → parent links → notifications = 4 serial groups, 2.5 s); students page (students → contacts → fees); report data (student → three parallel queries — fine). Each serial group costs a full round trip. Merge into one RPC or issue the independent queries together.

### 4.7 No caching layer — **Medium**
`unstable_cache`/`revalidate`/`dynamic` are used **0** times. Reference data that almost never changes (subjects per grade, timetable, school constants, the staff list) is re-read from Sydney on every request. Cache it with tags and revalidate on write.

### 4.8 Static images — **Medium**
Public originals are 4.1 / 2.9 / 2.5 / 1.9 / 1.4 MB. Resize to the displayed size (≈ 200–400 KB, WebP/AVIF) before committing, and serve with long cache headers.

### 4.9 Dead weight in the server build — **Low/Medium**
`puppeteer-core` (8 MB), `@sparticuz/chromium` (67 MB) are installed but **not imported anywhere** (PDFs use `pdf-lib`). `twilio` (20 MB) is only referenced by an unused adapter (`lib/notifications/twilio.ts`) since alerts became a database trigger. Remove all three and the adapter; smaller install, faster builds and cold starts.

### 4.10 Bulk upload design — **High** (see §7.2)
Each "group" calls the full save action, which re-authenticates and re-reads on every call.

### 4.11 Progress report generation — **Low**
~2.3–2.5 s per click (3 queries + PDF render in Washington). Fine functionally; it benefits automatically from the region fix. The 45 KB logo is embedded as base64 — correct for serverless.

---

## 5. Database findings

### 5.1 Supabase's own performance advisor (102 findings)

| Finding | Count | Tables |
|---|---|---|
| `auth_rls_initplan` — `auth.uid()` / helper calls re-evaluated **per row** | 16 | parent_student_links, profiles, attendance_records, video_watch_sessions, marks, audit_log, students, fee_payments, subjects, student_subject_enrollments, tests, portal_notifications, student_subject_exclusions |
| `multiple_permissive_policies` — several permissive policies on one table/role are each evaluated | **86** | admission_enquiries, attendance_records, fee_payments, marks, notices, parent_student_links, portal_notifications, student_subject_enrollments, student_subject_exclusions, students, subjects, tests, video_lectures, video_watch_sessions |

- **Root cause in the code:** 17 policies use a bare `auth.uid()` and 49 use `current_role()` — a `SECURITY DEFINER` SQL function that does a `profiles` lookup, which Postgres cannot inline, so it is called per row. The recommended form is `(select auth.uid())` and `(select public.current_role())`, which Postgres evaluates once per statement.
- **Fix:** one migration that rewrites those policies (behaviour-preserving) and merges the per-role policies into one policy per table/action. Test with the existing RLS integration tests.
- **Impact:** small today (575 students) but grows linearly with rows — and the mobile app reads `marks`/`attendance_records` directly through these policies.

### 5.2 Security advisor (14 findings)
| Finding | Detail |
|---|---|
| `SECURITY DEFINER` functions executable by `anon` **and** `authenticated` | `allocate_roll_number`, `current_role`, `notify_parents_on_absence`, `rls_auto_enable` — revoke `EXECUTE` from `anon`/`public` where not needed |
| Functions with a mutable `search_path` | `set_updated_at`, `allocate_roll_number`, `set_student_enrollment_identifiers`, `enrol_student`, `natural_sort_key` — pin `search_path` |
| Leaked-password protection disabled | one switch in Supabase Auth settings |

### 5.3 Indexes
Mostly sound (student/class, attendance by student and date, marks by student/test/exam date, notifications by parent). Gaps to consider as data grows: a trigram index for the `ilike '%…%'` student search (`full_name`, `gr_number`, `roll_number`); a composite `attendance_records (student_id, class_date)`; `marks (student_id, exam_date)` already added.

### 5.4 Data quality (measured on production data)
| Problem | Count | Effect |
|---|---|---|
| Students sharing the same G.R. number (case/space-insensitive) | **18** | Searches and uploads by GR are ambiguous; GR is not unique in the schema |
| Grade 11/12 students with no `stream` | **20** | Shared columns (Maths/Biology, Chemistry/Computer) in result sheets cannot be assigned |
| Student names with trailing spaces | 473 | Display/search noise (names are `.trim()`-ed in code in many places, not at the source) |
| `marks.subject` stored as **text**, not a foreign key | all marks | spelling drift (`Mathematics` vs `MATHEMATICS` per grade); renaming a subject orphans history |
| Legacy `notification_log` table (107 rows) | — | belongs to the removed Twilio flow |
| Tier labels (Distinction ≥ 80, Merit ≥ 65, Pass ≥ 50) vs the new grading scale (fail < 33) | — | two inconsistent grading vocabularies (decision pending) |

### 5.5 Growth projection (why "it is fine today" will not last)
Today: 45 marks, 116 attendance rows. After the first real month: attendance ≈ **574 × ~22 days ≈ 12,600 rows/month**; after the planned upload, marks ≈ 2,200 per test cycle. Every whole-table read in §4.5 will cross the 1,000-row cap within days.

---

## 6. Mobile application — architecture findings

### 6.1 APK is 118 MB — **High**
Measured by unpacking `JE-Academy.apk` (146 MB uncompressed):

| Component | Size | Why |
|---|---|---|
| Native libraries | **83.5 MB** | built for **4 CPU types**: `x86_64` 23.4, `x86` 23.2, `arm64-v8a` 21.9, `armeabi-v7a` 15.2. Real phones need only `arm64-v8a` (+ optionally `armeabi-v7a`); the two `x86` copies (**46.6 MB**) exist only for emulators |
| Java/Kotlin code (`classes*.dex`) | **47 MB** in 5 files | **no code shrinking** (`android.enableMinifyInReleaseBuilds=false`, `enableShrinkResources` off) |
| Fonts | 7.4 MB, **44 files** | the app uses 8 faces; importing from the package root bundles *every* weight/italic of the 3 families |
| Resources/images | 8.6 MB | |
| JS bundle (Hermes) | 4.4 MB | healthy |
| Unused native modules | several MB | `expo-glass-effect`, `expo-symbols`, `@expo/ui`, `expo-video`, `expo-device`, `expo-image` are not imported by app code (verify transitive needs before removing `react-native-reanimated`, `gesture-handler`, `svg`, which Expo Router may pull in) |

- **Fix:** build with `reactNativeArchitectures=arm64-v8a,armeabi-v7a`; turn on R8 minification + resource shrinking; import fonts per weight (`@expo-google-fonts/ibm-plex-sans/400Regular`); drop unused modules; for distribution use an **AAB** (Play Store) or per-ABI APKs.
- **Estimate:** **~35–45 MB**, installs and updates much faster.

### 6.2 No list virtualization — **High**
173 `ScrollView` usages, **0** `FlatList`/`FlashList`. The student directory renders all **575** cards (each with several `Text`s) at once; the parent directory renders **532** with nested children; both rebuild on every keystroke of the search box. On a mid-range Android phone this is the main cause of scroll jank and slow screen open.
- **Fix:** `FlatList`/`FlashList` with `keyExtractor`, `getItemLayout` where possible, `memo`-ed row components; debounce search; server-side search for the directories (as in Student Search).

### 6.3 Data access — direct, sequential, uncached — **High**
- 41 direct `supabase.from(...)` sites run phone → Sydney (≈ 0.3 s+ per query on a good connection, more on mobile data), many awaited one after another (6 sequential = 1.85 s vs 0.82 s parallel, measured).
- `useAsyncData` refetches on every mount; there is **no cache, no stale-while-revalidate, no request de-duplication** — coming back to a screen shows a spinner again.
- Whole-table reads (marks, attendance) run on the phone, over the mobile network, subject to the 1,000-row cap (§4.5).
- **Fix:** adopt a query cache (TanStack Query) with sensible `staleTime`; parallelise independent queries; replace scans with aggregate RPCs; add pagination.

### 6.4 Everything goes through a slow API for admin screens — **Medium**
Parent directory (4.9 s), student list, search, record, reports: path C. These inherit all of §3 (region, auth waterfall) *and* the phone↔Vercel leg. They improve automatically with §4.1–4.2.

### 6.5 No over-the-air updates — **Medium (operations)**
`expo-updates` is not installed, so **every fix needs a new 118 MB APK**, rebuilt and re-sent. This session's builds needed a 746 MB project upload that dropped once and then waited 30+ minutes in the EAS queue. OTA updates would turn most fixes into a seconds-long, silent update.
- Also: `appBuildVersion` is `1` for every build, the Android package is the placeholder `com.anonymous.jeacademy`, and only a `preview` profile exists — the app cannot be published to the Play Store as configured.

### 6.6 Startup
Fonts gate the first render (`useFonts` of 8 faces, then splash hides) — acceptable. The session restore reads a *chunked* `SecureStore` session (several native reads) and then queries `profiles` — one more Sydney hop before the first screen. Cache the role locally after sign-in to render the portal immediately and revalidate in the background.

### 6.7 Duplicated logic between web and mobile — **Medium (maintainability)**
**34 file names exist in both** `lib/` and `mobile/src/lib/` (letter-grade, tier, term, dashboard-data, enter-data, student-averages, subjects-data, reports-data, attendance-stats, late-policy, upload-types, …). They are hand-copied. Bugs are fixed twice or only once — the "Total marks box strips the letter D" bug existed in **both** copies, and `types/supabase.ts` must be copied manually after every schema change.
- **Fix:** extract pure logic and types into a shared workspace package (`packages/shared`) imported by both.

### 6.8 No automated tests for the app — **Medium**
0 test files under `mobile/`. All 166 tests are web/DB.

---

## 7. Specific defects found during this audit

### 7.1 (already fixed during the work) 
Total-marks input filtered the wrong characters (web + app); decimal marks like `17.5` were read as `175` by the new result-sheet parser; CSV dates shifted a day because of local-time parsing; the report's September label rendered "Sept". Listed for completeness — all fixed and covered by tests.

### 7.2 Bulk marks upload will not finish on the real file — **High, open**
- `processMarksUpload` calls `bulkSaveMarksAction` once per *(subject, total, date)* group. Each call re-authenticates (2 hops), reads existing marks, inserts, logs history and writes an audit row (~5 hops).
- **Measured on the live site:** 12 groups → **23.5 s = 1.96 s per group**; an unchanged re-upload still takes 12.6 s.
- Your file: ~131 test columns, several split by subject/total ⇒ roughly **150–250 groups ⇒ 5–8 minutes**. The route's `maxDuration` is 300 s (and 60 s on a Hobby plan). Each group commits independently, so a timeout leaves the file **half-saved**.
- **Fix:** authenticate once; fetch all existing marks for the affected students in one query; one bulk `upsert` (chunks of ~500) with the history rows inserted in one statement; one audit row for the whole file. Expected: seconds, not minutes. Also stream progress or process in a background job.

### 7.3 Silent truncation at 1,000 rows — **High, open**
See §4.5. Affected: marks dashboards and averages, subject statistics, marks-entry pre-fill (`enter-data.ts`), attendance statistics and reports. Becomes visible when real attendance is marked for ~2 school days.

### 7.4 Student-directory contact lookup — **Medium**
`students/page.tsx` → `fetchParentEditContactsByStudentId(all ids)` puts ~575 UUIDs in one `.in()` URL. The credential vault was already switched to batches of 100 after the same problem silently broke it; this one is still unbatched (it works today, but sits near the URL-length limit).

### 7.5 Name/GR matching depends on dirty data
Because GR numbers are not unique or normalised (§5.4), result-sheet uploads had to be made conservative: only ~half of the sheet's G.R. numbers match exactly. 214 rows of your real file were refused (missing students, wrong totals in the sheet, missing streams, an unknown subject "BANK").

---

## 8. Operations, environments and security posture

| Area | Finding | Risk |
|---|---|---|
| **Single environment** | Local development, tests and demos all point at the **production** Supabase project. 11 integration tests use the service-role key to create and delete rows in production. | Data pollution, accidental destructive test, no safe place to try migrations |
| **Monitoring** | No error tracking or alerting (no Sentry/PostHog etc.); only Vercel logs | Failures are discovered by users |
| **Backups** | Not verified (Supabase tier/PITR not checked in the repo; CLAUDE.md lists it as a manual go-live item) | Recovery guarantees unknown |
| **Secrets** | `CREDENTIAL_ENCRYPTION_KEY` (decrypts all 532 stored parent passwords) lives only in Vercel; losing it makes every stored password unreadable | Key-custody risk — keep an offline copy |
| **Parent-password vault** | Reversible encryption by design (an explicit product decision). | Accepted trade-off; protect the key and the Super Admin account |
| **CORS** | `Access-Control-Allow-Origin: *` on `/api/mobile/*` | Acceptable only because these routes need a Bearer token, never cookies |
| **Service-role usage** | 23 call sites bypass RLS (needed for parent contacts, vault, reports) | Each must keep its explicit role check — they do today; worth a periodic review |
| **Repo hygiene** | A 7 MB PDF is tracked in git; EAS project archive is 746 MB | Slow builds, failed uploads |
| **Releases** | One Vercel project; deploys on push; no staging, no preview-database | A bad push is live immediately |

---

## 9. What is already good

- **Security model:** RLS is the real boundary (every table), layouts only provide UX; role checks are explicit wherever the service role is used; no public sign-up; audit log of admin actions.
- **Small client JavaScript:** 103 kB shared / 105–118 kB per page; fonts and icons are not bloating the web bundle.
- **Absence alerts as a database trigger:** fires however the row is written, idempotent, cannot roll back attendance.
- **Indexing** of the main access paths; batching already applied in several places (vault, notifications).
- **PDF reports without a headless browser** (works on serverless), now with logo, month, marks with dates, attendance and fee history.
- **Test discipline:** 166 passing tests including live RLS, notification-trigger and report-data integration tests.
- **Clean separation** of public site, auth, and six role portals by route group.

---

## 10. Recommended plan (ordered by value per effort)

### Phase 0 — hours (config only, biggest win)
1. `vercel.json` → `"regions": ["syd1"]` (functions beside the database). *Expected: every hop ~0.35 s → ~0.03 s.*
2. Exclude public routes (`/`, static, images) from the auth middleware; make the landing page static.
3. Revoke `EXECUTE` on the four `SECURITY DEFINER` functions from `anon`; pin `search_path`; enable leaked-password protection.
4. Remove unused deps: `puppeteer-core`, `@sparticuz/chromium`, `twilio` (+ adapter).

### Phase 1 — days (kills the auth waterfall and the correctness bombs)
5. `getClaims()` in middleware/layouts; role in the JWT; React `cache()` for the current user. *−0.6–1.0 s per page.*
6. **Batch the bulk upload** (single auth, bulk upsert) — required before uploading the real file.
7. Replace whole-table reads with SQL aggregates (dashboards, averages, subject stats, attendance stats); page everything else with `range()`.
8. RLS migration: `(select auth.uid())`, `(select current_role())`, merge permissive policies; re-run RLS tests.
9. Paginate and server-side-search the Student, Parent and Fee directories (copy the Student Search pattern).

### Phase 2 — a week (the app)
10. APK slimming: ABI filters, R8/shrink, per-weight fonts, remove unused modules → **~35–45 MB**.
11. `FlatList` everywhere a list can exceed ~30 rows; memoised rows; debounced/server search.
12. TanStack Query cache in the app; parallelise queries; local cache of role/profile for instant start.
13. Add `expo-updates` (OTA) and a proper `production` EAS profile (package id, version codes).

### Phase 3 — planning (structural)
14. **Nearer region for users in Pakistan:** new Supabase project in `ap-south-1` (Mumbai) + functions in `bom1`, migrate data. *(Largest remaining latency win after Phase 0.)*
15. **Staging environment:** a second Supabase project + Vercel preview environment; point tests and demos there.
16. Shared `packages/shared` for logic/types used by web and app; add mobile tests; add error monitoring.
17. Data clean-up: unique/normalised GR numbers, `stream` for all grade 11/12 students, trim names at write time, `marks.subject` → foreign key.

### Expected outcome (estimates — to be re-measured after each phase)

| Metric | Today | After Phase 0–1 | After Phase 3 |
|---|---|---|---|
| Typical authenticated page | 1.1–1.9 s | ~0.4–0.8 s | ~0.2–0.5 s |
| Students / Parents directory | 3.4 / 4.8 s, ~1 MB | ~1.0–1.5 s, <60 KB | ~0.5–0.8 s |
| Login → dashboard | 5.3 s | ~1.5–2 s | ~1 s |
| Student search | 2.25 s | ~0.4–0.6 s | ~0.2 s |
| Bulk upload (real file) | **times out** | seconds | seconds |
| APK size | 118 MB | — | 35–45 MB (Phase 2) |

---

## 11. Appendix

### A. How the numbers were obtained
- **Page timings:** logged in as a temporary Super Admin in the browser on the live site and timed `fetch()` of each page 3×, median reported (cache-cold server renders; browser cache not involved).
- **API timings:** temporary Super Admin bearer token, 5 requests per route (3 for heavy ones), from a PC in Karachi.
- **Direct database timings:** `supabase-js` from the same PC against the production project.
- **Region evidence:** `x-vercel-id` response header (`sin1::iad1`), `supabase projects list` (`ap-southeast-2`), `CF-RAY …-KHI` on Supabase responses.
- **APK:** `unzip -l JE-Academy.apk` (build from commit `617cf6a`).
- **Advisors:** `supabase db advisors --linked --type performance|security`.
- **Save-time:** a real 12-group upload of temporary students on the live site, then deleted.
- All temporary accounts, students and files created for measurement were deleted afterward.

### B. Where to look in the code (hot spots)
| Topic | Files |
|---|---|
| Auth waterfall | `middleware.ts`, `lib/auth/require-role.ts`, `lib/auth/require-parent-access.ts`, `lib/supabase/bearer.ts` |
| Whole-table reads | `lib/marks/{dashboard-data,student-averages,subjects-data,enter-data}.ts`, `lib/attendance/{attendance-stats,reports-data,roster}.ts` and their `mobile/src/lib/**` copies |
| Heavy pages | `app/(super-admin)/super-admin/{students,parents,fees}/page.tsx`, `lib/admissions/parent-lookup.ts`, `lib/fees/roster.ts` |
| Upload | `lib/marks/upload.ts`, `lib/actions/marks.ts` (`bulkSaveMarksAction`), `app/api/uploads/marks/route.ts` |
| RLS | `supabase/migrations/*` (47 policies; `current_role()` in `20260722212757_create_profiles.sql`) |
| Mobile lists | `mobile/src/app/(super-admin)/{students,parents}.tsx` |
| Mobile data hook | `mobile/src/lib/use-async-data.ts` |
| Mobile build | `mobile/eas.json`, `mobile/app.json`, `mobile/android/gradle.properties`, `mobile/src/constants/fonts.ts` |

### C. Table sizes at the time of the audit
students 581 · profiles 542 · parent_student_links 576 · parent_credentials 532 · attendance_records 116 · marks 45 · marks_edit_history 0 · fee_payments 41 · portal_notifications 21 · notification_log 107 · audit_log 1,409 · tests 1 · subjects 56 (44 active) · student_subject_enrollments 3 · admission_enquiries 5 · notices 1 · class_timetable_periods 2.

---

# 12. Fix pass — status and measured results (22 Oct 2026)

Everything in §10 that can be done without a new vendor account or a decision from you has been done, deployed to the live site and **re-measured the same way as the original audit**.

## 12.1 What was fixed

| # | Finding | Fix | Status |
|---|---|---|---|
| 4.1 | Functions in Washington, database in Sydney | `vercel.json` → `regions: ["syd1"]`; confirmed live: `x-vercel-id: sin1::syd1` | **Fixed** |
| 4.2 | Auth waterfall (middleware + layout + profile, 32 `getUser` calls) | Middleware makes **no** network call (reads the session cookie; skipped entirely when there is no session); one Supabase client per request with a **memoised `getUser()`** (web + bearer/mobile); the login action no longer re-asks who just signed in | **Fixed** |
| 4.3 | Landing page uncached | Static page (ISR 5 min, `revalidateTag('notices')` on change); CDN `HIT` | **Fixed** |
| 4.5 / 7.3 | Whole-table reads, silent truncation at 1,000 rows | 11 SQL aggregate functions (`marks_class_stats`, `marks_student_averages`, `attendance_class_term`, …); `fetchAllRows` paging for every list that genuinely needs all rows (students, parents, fees, class marks); marks entry pre-fills on demand | **Fixed** (web + app) |
| 4.6 | Sequential query groups | Student Directory, mobile students API, vault and contact lookups now run their reads together | **Fixed** |
| 4.8 | 12.9 MB of classroom images | resized to about 100–160 KB each (0.8 MB total) | **Fixed** |
| 4.9 | Dead dependencies | `twilio`, `puppeteer-core`, `@sparticuz/chromium` and the Twilio adapter removed; the settings page now describes the portal-inbox notifications | **Fixed** |
| 7.2 | Bulk upload times out / half-saves | `bulk_upsert_marks`: one database call per 500 marks (insert + update + edit history); route limit back to 60 s | **Fixed** |
| 5.1 | 102 performance advisor findings | RLS rewrite: `(select auth.uid())`, `(select current_role())`, merged permissive policies, `TO authenticated`. **The advisor now reports "No issues found".** Proven behaviour-identical: a before/after probe of 7 roles × reads/inserts/updates/deletes = 532 checks, **0 differences**; a rollback script is kept | **Fixed** |
| 5.2 | 14 security findings | `search_path` pinned; trigger/internal functions no longer executable by anon/authenticated; **14 → 4** (see 12.3) | **Mostly fixed** |
| 5.4 | 473 names with stray blanks | trimmed at the source | **Fixed** |
| 6.1 | APK 118 MB | ARM-only (`arm64-v8a`, `armeabi-v7a`), R8 code + resource shrinking, per-weight fonts (**44 → 9 font files**), 6 unused native modules removed | **Configured — takes effect at the next APK build** |
| 6.2 | No list virtualization | 6 long lists (students, parents, fees, roster, admissions students, marks reports) are now `FlatList`s | **Fixed** |
| 6.3 | No cache, sequential queries | stale-while-revalidate cache in the app's data hook (instant screens, background refresh, cleared on sign-in/out); aggregates replace phone-side table scans | **Fixed** |
| 6.5 | No over-the-air updates | `expo-updates` added, `runtimeVersion` policy, `preview` / `production` channels | **Configured — takes effect at the next APK build** |
| 8 | Monochrome icon failed Expo's check | made square | **Fixed** |

New tests: 14 database integration tests prove the SQL aggregates equal hand calculations, respect each role's security rules, and that the batch save inserts, updates, logs edit history and refuses other roles. Test suite: **180 passing** (was 166).

## 12.2 Measured before → after (live site, same method as §3)

**Pages (Super Admin, median of 3):**

| Page | Before | After |
|---|---|---|
| Dashboard | 1,538 ms | **852 ms** |
| Students | 3,356 ms | **1,329 ms** |
| Parents | 4,772 ms | **1,138 ms** |
| Attendance dashboard | 1,696 ms | **419 ms** |
| Marks dashboard | 2,271 ms | **629 ms** |
| Fees | 1,817 ms | **865 ms** |
| Subjects | 1,100 ms | **630 ms** |
| Timetable | 1,072 ms | **527 ms** |
| Notifications | 1,472 ms | **553 ms** |
| Audit log | 1,518 ms | **654 ms** |
| Student search | 1,094 ms | **411 ms** |
| Staff | 1,133 ms | **407 ms** |
| Marks entry | 1,916 ms | **744 ms** |
| Class attendance (9-G1) | 2,550 ms | **590 ms** |
| Attendance roster | 2,347 ms | **756 ms** |
| Login → dashboard | 5,302 ms | **1,348 ms** |

**API routes:**

| Route | Before | After |
|---|---|---|
| Student search | 2,253 ms | **514 ms** |
| Student full record | 2,660 ms | **488 ms** |
| Parent directory | 4,905 ms | **1,412 ms** |
| Progress report PDF (full / month) | 2,544 / 2,265 ms | **1,138 / 654 ms** |
| Invalid token → 401 | 616 ms | **356 ms** |

**Public site:** landing page 1.3–1.5 s TTFB with `no-store` → **CDN `HIT`**, 0.56 s TTFB, 0.73 s total; a classroom photo 4.1 MB / 2.35 s → **163 KB / 0.72 s**.

**Bulk upload:** 12 groups = 23.5 s (1.96 s per group) → **2,400 marks in 60 groups = 1.24 s**. Your real results file (about 190 groups, which would have taken roughly 6 minutes and been cut off at 5) now saves in **a couple of seconds**.

**Database advisors:** performance **102 findings → 0**; security **14 → 4**.

## 12.3 What is intentionally left, and why

| Item | Why it is open | What is needed |
|---|---|---|
| **Move the database nearer Pakistan** (Mumbai/Singapore) | A Supabase project's region cannot be changed in place; it needs a *new project* and a data migration. The functions are already beside the current database, so the remaining cost is the user↔Sydney leg (about 0.3 s for the phone, which queries Supabase directly). | Your decision + a new Supabase project (billing) |
| **Staging environment** | Same: a second Supabase project + Vercel preview environment. Tests and demos still run against production (they only create and delete clearly-named temporary rows). | Your decision + a second project |
| Security advisor, remaining 4 | `current_role()` must stay callable (RLS policies call it for the reader and it only reveals their own role); `allocate_roll_number` must stay callable by signed-in staff (the enrolment trigger runs as them); **leaked-password protection is a switch in the Supabase dashboard** (Authentication → Policies), not changeable from code. | Flip the dashboard switch |
| Students / Parents directories still about 1.1–1.3 s | They send every row (about 0.8–1 MB decoded, 73–91 KB on the wire) and filter in the browser. Fast enough now; server-side pagination would bring them to about 0.5 s. | Optional next step |
| 18 shared GR numbers (36 students), 20 Grade 11/12 students without a stream | Need a person to decide which record is right. A worksheet listing them is in `data-quality-issues.xlsx`. | Staff to correct, then re-upload |
| Hand-copied code between web and app (34 files), no mobile tests | A structural refactor (shared package) — larger than a fix, and risky to do blind | Planned work |
| Expo patch versions (14 packages slightly behind) | Upgrading blind without a device to test on | Do with the next APK test |
| **R8 shrinking, ARM-only, new fonts and OTA are configured but untested on a phone** | They only take effect in the next APK build; R8 can occasionally strip something a library needs | Build the APK and test on a real phone before sending it out |

## 12.4 How to keep it fast
- After any schema change run `npx supabase db advisors --linked --type performance` (it should stay at "No issues found").
- Never read a whole table to add it up: add a SQL function (see `supabase/migrations/20261020120000_*`) or page with `fetchAllRows`.
- For app fixes that do not touch native code, `eas update --channel preview` now pushes them to installed apps in seconds (once the APK containing `expo-updates` is installed).
