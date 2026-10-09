# Architecture Decision Log

Record each decision with date, context, decision, alternatives, and consequences.

## Initial decisions
- Authentication: Django session authentication, not JWT, because the product is explicitly session-based.
- Password storage: Django's password hashing framework. Configure bcrypt-compatible hasher only if required; never write a custom password hashing implementation.
- Database: SQLite for the initial requested release; document backup and concurrency limitations.
- Roles: Admin/Management, Teacher, Student.
- Initial attendance granularity: one session per class + subject + date. Add periods only after explicit confirmation.
- Account provisioning: admin-managed accounts; no public self-registration in first release.
- Historical records: deactivate/archive entities rather than deleting records that are referenced by attendance.
- Reports: access-scoped; export only data the requesting user is authorized to view.

## Open decisions before production
- Attendance policy for `LATE` and `EXCUSED` in percentage calculation.
- Institution timezone and academic calendar.
- Attendance correction window and approval workflow.
- Minimum password policy and session expiry duration.
- Backup retention and hosting provider.

## 2026-10-03 — Phase 0/1/2 implementation defaults (reversible)
- Verified env: Python 3.13.5, Node v24.13.0, npm 11.6.2, Django 5.2, DRF 3.18. Documented in README.
- Password hashers: `BCryptSHA256PasswordHasher` first (bcrypt 5.0 installed, verified login works), fallback PBKDF2. No custom crypto. Date: 2026-10-03.
- `TIME_ZONE` defaults to `UTC` via `TIME_ZONE` env; change per institution before production.
- Session expiry: `SESSION_COOKIE_AGE=43200` (12h) via env; adjust after confirmation.
- Password policy: Django validators, min_length 8 + similarity/common/numeric checks.
- DB path via `DATABASE_PATH` env, default `backend/db.sqlite3`. SQLite retained per requirement; PostgreSQL migration path documented only.
- CORS/CSRF: dev origins `localhost:5173` + `127.0.0.1:5173`; prod must set exact `CSRF_TRUSTED_ORIGINS` + same-origin proxy preferred.
- API prefix `/api/v1/` with DRF `PageNumberPagination` (20/page), OpenAPI via drf-spectacular at `/api/v1/schema/` + `/api/v1/docs/`.
- Custom `AUTH_USER_MODEL=accounts.User` with `role` ADMIN/TEACHER/STUDENT + unique email, created before first migration — do not change without reset plan.
- Attendance granularity: one session per classroom+subject+date (`uniq_session_class_subject_date`); record unique per session+student. No period field until confirmed.
- `on_delete`: PROTECT for classroom/subject/assignment/enrollment/session references to preserve history; CASCADE only session→records and user→profiles.
- Frontend not scaffolded yet; Phase 4 next: React+Vite+TS + Tailwind + session API client.

## 2026-10-03 — Phase 3 API completed
- Serializers explicit allow-lists: `apps/academics/serializers.py`, `apps/attendance/serializers.py`.
- Scoped viewsets + filters + pagination: admin CRUD (years, classrooms, subjects, assignments, enrollments, profiles), `GET /teacher/classes/`, `GET /classes/{id}/students/` (student→404).
- Attendance atomic workflow in `apps/attendance/services.py`: create (validates enrollment, `transaction.atomic`, duplicate guard, audit SESSION_CREATED), submit (DRAFT→SUBMITTED, audit), corrections (DRAFT: assigned/admin; SUBMITTED: admin-only + reason≥5 + audit SESSION_CORRECTED with before/after).
- Reports in `apps/reporting/services.py` (tested pure functions, not view code): policy default LATE=attended, EXCUSED excluded, overridable via query; CSV uses `sanitize_csv_value` against formula injection.
- Auth path aligned to spec: `/api/v1/admin/users/` via `apps/accounts/admin_urls.py`; `config/urls.py` updated.
- Docs: `docs/api.md` now documents actual paths, examples, error codes.
- Quality: `ruff check` clean (pyproject config), `manage.py check` clean, OpenAPI 29 paths at `schema.yml`, 25/25 tests pass (14 new API tests: happy paths, invalid input, permissions, rollback, reports).

## 2026-10-03 — Phase 4 frontend foundation completed
- Scaffold: Vite 5 + React 18 + plain JavaScript (migrated from TypeScript on user request; see last entry), Tailwind 3 tokens (`primary` palette, `card` shadow), PostCSS, ESLint, Prettier.
- API client `frontend/src/lib/api.ts`: `credentials:include`, CSRF bootstrap + `X-CSRFToken`, `SESSION_EXPIRED_EVENT` broadcast; base via `VITE_API_BASE_URL` else same-origin proxy (`vite.config.ts` proxies `/api` → 8000).
- Session bootstrap + guards `frontend/src/hooks/useAuth.jsx` + `frontend/src/app/router.jsx`: `/sign-in` public, `/` + `/design` require auth, `/admin` role UX-guard; backend remains authoritative.
- AppShell `frontend/src/layouts/AppShell.jsx`: sticky header, responsive nav (mobile toggle), skip-link, breadcrumb + title pattern, role-aware links.
- Primitives: Button/Input/Field/Badge/Card (`ui.jsx`), Loading/Empty/Error/Skeleton (`feedback.jsx`), accessible Table (`table.jsx`), Dialog with focus + Escape (`dialog.jsx`); demo at `/design`.
- Verified: `npm run lint`, `npm run build` (dist 180KB JS, 14KB CSS) all pass. No mock buttons — sign-in/logout/dashboard health wire to real API.

## 2026-10-03 — Phase 5 role experiences completed (local-only, no deployment)
- Backend additions (all tested in `tests/test_phase5.py`): `GET /teacher/assignments/`, `GET /students/me/enrollments/`, `GET /attendance/sessions/{id}/audit/`, `POST /auth/password/change/`. 29/29 backend tests pass.
- Frontend: Admin (`AdminDashboard`, `UsersPage` with profile auto-create, `AcademicsPage` years/classes/subjects, `AssignmentsPage`), Teacher (`TeacherDashboard`, `AttendancePage` with subject/date → roster → bulk mark → counts → save draft/submit/correction+reason → audit), Student (`StudentDashboard` percentage + filterable history), Reports (`ReportsPage` scoped filters + blob CSV export), Profile (`ProfilePage` enrollments + password change).
- Router `frontend/src/app/router.jsx`: `/` role-home, `/admin/*` ADMIN-only, `/teacher/classes/:classroomId` TEACHER, `/reports` + `/profile` authenticated, `/design` retained. Nav updated per role in `AppShell.jsx`.
- Verified: `npm run lint`/`build` pass (55 modules, 210KB JS). Every screen has loading/empty/error/success/denied + mobile layout; all controls hit real API.
- Local-run guide added to `README.md`; deployment intentionally deferred per user request.

## 2026-10-03 — Profile auth-error fix (from screenshot)
- Symptom: `/profile` showed `Authentication credentials were not provided` inside Change-password card on load, user `admin · STUDENT`.
- Cause 1: `ProfilePage.jsx` shared one `error` state for enrollments fetch + password change, so an enrollments failure rendered as a password error.
- Cause 2: `createsuperuser` defaulted `role=STUDENT` (model default), so the superuser looked like a student and hit the student enrollments path; frontend also couldn't tell superusers apart (`/me/` hid `is_superuser`).
- Fix backend: custom `UserManager.create_superuser` forces `role=ADMIN` (`apps/accounts/models.py`); `MeSerializer`/`AdminUserSerializer` now expose read-only `is_staff`/`is_superuser`. Existing DBs: promote via shell (see README troubleshooting).
- Fix frontend: `ProfilePage` splits `enrollError`/`pwError`, skips enrollments for superusers, handles 401 as session-expired; `api.ts` broadcasts expiry on 401 only (not 403); `isAdminUser()` (`types`) used by `AppShell` links + `router` guards so superusers see admin nav.
- Verified: 29/29 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-03 — Stale-session hardening (follow-up to auth-error screenshots)
- Symptom repeated on `/admin/assignments`: cached `admin · STUDENT` user with every API call 401 after `SECRET_KEY` rotation (Django invalidates signed sessions).
- Root cause: `useAuth` expiry handler was a no-op (`setUser((u) => (u ? u : u))`), so stale user persisted and pages kept firing authenticated calls.
- Fix: `frontend/src/hooks/useAuth.jsx` clears user on any 401 (`setUser(null)`), guards redirect to `/sign-in`. Regression locked by new auth tests (`create_superuser` → ADMIN, `/me/` exposes `is_superuser`).
- Verified: backend suite + ruff + frontend lint/build re-run.

## 2026-10-03 — Admin CRUD, seed data, UI redesign (user request)
- Admin full CRUD: edit dialogs + delete confirms on Users (role/name/active), Years, Classes, Subjects, Assignments/Enrollments removals; backend already exposed PUT/PATCH/DELETE via ModelViewSets, protected FKs surface friendly errors.
- `python manage.py seed_demo` (idempotent): year 2025-26, Grade 10-A/B, 3 subjects, admin + 2 teachers + 5 students with profiles, 4 assignments, enrollments, 8 submitted weekday sessions + 1 draft + audits. Also promotes existing `admin` to ADMIN/superuser.
- Record context: `AttendanceRecordSerializer` now includes `session_date`, `subject_name`, `classroom_name` (additive; existing select_related covers it) powering subject-wise + trend views. Tested in `test_phase5.py`.
- Redesign (custom Tailwind design system, no external UI kit): Attendly brand, dark sidebar + gradient accents, public landing page (`/` for guests), SVG analytics (`Donut`, `StatusBars`, `Trend`, `Stat`), student low-attendance hint (display default 75%, configurable), teacher session history, reports distribution + daily trend.
## 2026-10-03 — Bulk enrollment (user question: how does admin handle many students?)
- Who decides a student's class: the admin, at admission time, via enrollment.
- New `POST /api/v1/enrollments/bulk/` (admin-only, atomic): one request enrolls many students into a class; already-enrolled are skipped and reported. Tested in `test_phase5.py`.
- New UI card on `/admin/assignments`: pick a class → tick boxes for all not-yet-enrolled students → one Enroll click.
- Verified: 33/33 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-04 — Student complaint box (user request)
- New `Complaint` model (`academics`): student, title, category (FACILITY/TEACHER/TRANSPORT/FOOD/SAFETY/OTHER), body, status (OPEN/IN_REVIEW/RESOLVED/REJECTED), admin_reply, timestamps. Migration `0002_complaint`.
- API `GET/POST /complaints/`, `GET/PATCH/DELETE /complaints/{id}/`: students create + read only their own (update → 403), teachers fully denied, admins see all + may PATCH only status/reply. Tested in `test_phase5.py`.
- UI: student `/complaints` (write-to-office form + my-complaints with office replies); admin `/admin/complaints` queue (status filter, reply + resolve, delete).

## 2026-10-04 — Notices show only the latest (user request)
- Admin pages (Users, Academics, Assignments) cleared the opposite message on every action: a new success replaces an old error and vice versa — never both stacked (screenshot showed both at once).

## 2026-10-04 — Enrollments table class filter, single form removed (user request)
- Enrollments table keeps ACTIVE/INACTIVE/ALL pills and adds an All-classes dropdown (`?classroom=` already existed in API).
- Removed the one-by-one Enroll form — bulk enroll does everything (one or many, plus reactivation), so the duplicate form is gone.
- Bulk candidates fixed: they were computed from the *filtered table* state, so filtering the table to Class 10-A made enrolled 9-A students reappear as candidates. Candidates now use a dedicated unfiltered ACTIVE list.
- Verified: 43/43 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-05 — Bulk student upload + accounts class filter (user request)
- `POST /admin/users/bulk/` (admin-only): upload `.xlsx`/`.csv` (`username,firstname,lastname,email`) → STUDENT accounts, password = firstname, IDs auto-generated. Per-row errors reported; teacher uploads → 403. Needs `openpyxl` (added to requirements).
- Accounts table gains a class dropdown (`?classroom=` = active enrollments) so long student lists filter by class.
- Verified: 45/45 backend tests, ruff clean, frontend lint/build pass.
- `sample-data/students_sample.{csv,xlsx}`: 10 fresh students, parser-verified, zero clashes; bulk-enrolled live into Class 9-A with username-passwords.

## 2026-10-05 — Duplicate names, class at creation, promote (user request)
- Bulk upload no longer rejects taken usernames: `sara` (taken) becomes `sara2`, reported via `renamed_from`. Same-name students coexist, told apart by username + auto ID + last name.
- Create-user form has a Class picker — student is enrolled immediately, no Assignments step needed. Same for bulk upload (one class for the whole file). API: `POST /admin/users/` accepts `classroom`.
- New Promote card + `POST /enrollments/promote/`: move a whole class to the next class/year in one click (old enrollments → INACTIVE, new ACTIVE created, clashes skipped with reasons).
- Verified: 47/47 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-05 — Page split, enrollment edit, clear-inactive (user request)
- Bulk enroll section removed (creation/upload/promote cover all adds); new `/admin/teachers` page holds all teacher work (assign form + table); Assignments page is now enrollments + promote.
- Enrollments have Edit (class + status — fixes wrong-class mistakes, one-active rule enforced) and per-row Remove.
- Promoted leftovers: `DELETE /enrollments/clear-inactive/?classroom=<id>` + UI button (two-click confirm) deletes INACTIVE rows of one class at once; history (sessions) untouched.
- Verified: 49/49 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-05 — Teacher filters + assignment edit (user request)- Assignments API gains `?subject=` filter (teacher/class/year existed).
- `/admin/teachers` table filters by teacher, class, and subject dropdowns; each row has Edit (class, subject, active toggle) with year auto-matched.
- Verified: 50/50 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-09 — Reports simplified to instant filtering (user request)
- Filters apply the moment they change — no Apply button to hunt for. Live "Showing: …" line always tells you the current scope, with one-click Reset.
- Teachers now get a real subject list (built from their own assignments; previously empty).
- Empty trend hidden instead of a dead "No trend data" box.
- Verified: frontend lint/build pass (backend untouched).

## 2026-10-09 — Class reports show current members; dates show history (user request)
- Problem: moved-out students appeared in both their old class and new class reports (history matched the class filter).
- Rule: filtering one class with no dates now shows only ACTIVELY enrolled members; add From/To dates to see full history including moved students. CSV export follows the same rule.
- Verified: 51/51 backend tests (new current-vs-history test), frontend lint/build pass.

## 2026-10-09 — Subject-wise reports + class-teacher whole-day attendance (user request)
- Reports table splits per subject by default (`dev` → English 2, Science 1); CSV gains a `subject` column. API: `?by_subject=1`.
- New class-teacher role: `Classroom.class_teacher` (admin sets it in Academics edit; demo: anita → Class 10, ravi → Class 9). Only the class teacher (or admin) can mark a whole-day session (`subject` omitted, one per class/day, duplicate-guarded).
- New days report `GET /reports/attendance/daily-summary/?classroom=<id>` + UI card: days present / days total per student = "how many days came to college".
- Teacher dashboard shows class-teacher duties with links to `/teacher/daily/:id` marking pages; roster endpoint admits class teachers.
- Verified: 53/53 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-09 — Compact subject view + days CSV (user request)
- Students table no longer dumps every student × subject: with no subject picked it shows one compact row per student (Subject = All); picking a subject shows only that subject's rows.
- Class-teacher days card gains **Export days CSV** (`daily-export.csv` for the selected class + dates).
- Verified: backend tests, ruff clean, frontend lint/build pass.

## 2026-10-09 — Subject CSV per table + clean protected-delete errors (user request)
- Students table has its own **Export this view (CSV)** — exports exactly the filtered view (teachers use it for their subject data too).
- Deleting a referenced object (e.g. a class with enrollments) now returns clean `400 {"detail": "Cannot delete: protected by N related records…"}` via a global handler instead of an HTML 500 the app couldn't parse; the API client also degrades gracefully on non-JSON responses.
- Verified: 54/54 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-04 — Auto IDs, bulk-candidate + manisha fixes (user screenshots)
- Student/employee numbers auto-generate (`S021…`, `T006…`) when left blank: profile endpoints accept missing numbers; enrolling a student without a profile auto-creates one. User form hints updated.
- Bulk candidates now hide anyone with an ACTIVE enrollment anywhere (backend rejects them anyway) — `arjun` no longer offered for Class 9.
- Fixed `manisha` enroll failure: forms took the year from a hidden default (newest year first) instead of the chosen class — now the year always comes from the selected classroom. Enrolled live as `S021` in Class 9-A.
- Bulk submit re-fetches enrollments first (stale ticks can't submit), shows per-student skip reasons, and single POST reactivates an INACTIVE duplicate instead of 400.
- Pagination fix: admin dropdowns/tables only saw page 1 (20 rows), so `rahul` never appeared and `harshal`/`manisha` rows were missing. New `?page_size=` param (max 500); admin fetches use `page_size=200`. Verified live: Class 9 candidates = exactly `['rahul']`.
- Verified: 43/43 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-04 — Student IDs visible + one-class rule (user request)
- Every student has a unique ID (`S001`…): now shown in Users table (ID column), enrollments table, teacher roster + marking, own profile, and reports (incl. CSV). Teachers see student IDs, students see their own, admin sees all — so same-name students are distinguishable.
- Rule enforced in `Enrollment.clean()`: one ACTIVE enrollment per student. A second active enroll is rejected (`400` via translated model validation; bulk puts it in `skipped`). Deactivate the old enrollment first to move a student.
- Fixed live data: `arjun` was ACTIVE in two classes — his older demo enrollment is now INACTIVE, keeping his 2026-27 class active.
- Enrollments table defaults to ACTIVE with an Active/Inactive/All filter + Status badges (inactive rows no longer confuse the list); bulk re-enroll reactivates an INACTIVE row instead of skipping it.
- Verified: 38/38 backend tests, ruff clean, frontend lint/build pass.

## 2026-10-04 — User table Class column (user request)
- Admin pages (Users, Academics, Assignments) cleared the opposite message on every action: a new success replaces an old error and vice versa — never both stacked (screenshot showed both at once).
- `AdminUserSerializer` now exposes read-only `classes` (active enrollments, e.g. `Grade 10-A (2025-26)`; empty for non-students), prefetched to avoid N+1. Tested in `test_auth.py`.
- Users table shows Username | Role | Class | Active | Actions.

## 2026-10-04 — Demo DB refreshed to 5 teachers + 20 students (user request)
- `seed_demo` extended: 5 teachers, 20 students (10 in 10-A, 10 in 10-B), 5 subjects, 10 assignments, 8+4 submitted sessions + 1 draft regenerated with full rosters. Existing `admin` kept as-is (password untouched).
- Removed user's own test accounts `jadu`/`sarvesh` only after explicit approval (their assignment/enrollment/audit rows removed first due to PROTECT).
- Final dev DB: 1 admin + 5 teachers + 20 students = 26 users; 13 sessions, 130 records. Tests use a separate test DB — unaffected (35/35 pass).

## 2026-10-04 — Demo passwords = usernames (user request)
- All 5 teachers + 20 students now log in with their username as password (`anita`/`anita`, `sara`/`sara`). Admin untouched. `seed_demo` updated so re-seeds keep this scheme. Verified via `authenticate()` for sample accounts; 36/36 tests pass. Note: weak passwords — local demo only.

## 2026-10-04 — Two demo classes: Class 9 + Class 10 (user request)
- Renamed wording Grade → Class everywhere user-facing (model help text, seed, Academics placeholder). Old `Grade 10-A/B` demo rooms retired by the seed (their sessions/enrollments/assignments removed with them); your own `Class 10th-A (2026-27)` room left untouched.
- Layout now: Class 9-A and Class 10-A, 10 students each; teachers split across both (e.g. ravi teaches English in 10th, Maths in 9th). Migration `0003_alter_classroom_name` (help text only).

## 2026-10-04 — Admin user filters (user request)
- `GET /admin/users/` now accepts `?role=ADMIN|TEACHER|STUDENT`, `?is_active=true|false`, `?search=` (matches username/email/first/last name). Tested in `test_auth.py`.
- Users page filter bar: ALL/ADMIN/TEACHER/STUDENT pills, active dropdown, search box with empty-result state. Filters hit the API (not just the visible page).

## 2026-10-04 — Frontend migrated TypeScript → plain JavaScript (user request)
- All 27 source files converted `.ts`/`.tsx` → `.js`/`.jsx` via mechanical type-stripping (esbuild transform); behavior identical.
- Removed: `typescript`, `@types/*`, `@typescript-eslint/*` deps, `tsconfig*.json`, `src/vite-env.d.ts`, `typecheck` script. Build is now `vite build` only; lint covers `.js`/`.jsx`.
- Stack docs updated everywhere: README, `ai-contax/` (architecture, rules, plan), `README.pack.md`, this log.

## 2026-10-09 — Demo DB refreshed, all passwords = usernames (user request)
- `seed_demo` now skips students the admin already placed elsewhere (one-active rule crashed it on a moved student) instead of failing.
- Reset all 32 teacher/student passwords to their usernames (verified `anita`, `rahul`, `tarkeshvar`, `manisha` log in); admin untouched.
- Live DB: 33 users (1 admin + 6 teachers + 26 students), your custom classes kept.
