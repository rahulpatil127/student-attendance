# Student Attendance Management System

Session-based web app for managing students, teachers, classes, subjects, enrollments, and attendance.

Stack: React.js + Vite + JavaScript, Tailwind CSS, Django + DRF, SQLite, Django session auth + CSRF.

See `ai-contax/` for product context, architecture, rules, and `ai-contax/software-development-plan.md` for phased delivery.
See `docs/` for API, data model, test plan, deployment, decisions.

## Project layout
```
student-attendance/
├── ai-contax/       # agent context (copied from handoff pack)
├── backend/         # Django + DRF (config, apps/accounts|academics|attendance|reporting, tests)
├── frontend/        # React + Vite + TS (role dashboards, attendance marking, reports)
├── docs/            # api, data-model, test-plan, deployment, decisions
└── README.md
```

## Run locally (Windows PowerShell)

Prerequisites: Python 3.13+, Node 24+, npm. No deployment needed.

### 1) Backend — Django API on http://127.0.0.1:8000
```powershell
cd "student-attendance\backend"
pip install -r requirements.txt
Copy-Item .env.example .env -Force
python manage.py migrate
python manage.py createsuperuser   # create your ADMIN (username/email/password)
python manage.py seed_demo         # optional demo data: 2 teachers, 5 students, sessions
python manage.py runserver 127.0.0.1:8000
```
Check: open http://127.0.0.1:8000/api/v1/health/ → `{"status":"ok"}`. API docs: `/api/v1/docs/`.

Demo logins (local only): `admin` keeps your own password; every teacher and student uses their **username as password** (e.g. `anita`/`anita`, `sara`/`sara`).

### 2) Frontend — React app on http://localhost:5173
Open a second terminal:
```powershell
cd "student-attendance\frontend"
Copy-Item .env.example .env -Force
npm install
npm run dev
```
Vite proxies `/api` → `http://127.0.0.1:8000`, so no CORS setup needed locally. Open http://localhost:5173 → sign in with the superuser.

### 3) First-use journeys (all wired to real API)
- Admin: `/` → Users (`/admin/users`: create TEACHER/STUDENT + numbers) → Academics (`/admin/academics`: year → class → subject) → Assignments (`/admin/assignments`: assign teacher, enroll students).
- Teacher: sign in → `/` lists assigned classes → Open class → pick subject/date → roster defaults PRESENT → Save draft → Submit → correction needs reason (DRAFT only; SUBMITTED = admin-only) → audit trail shown.
- Student: sign in → `/` shows percentage + history with status filter.
- Reports: `/reports` — filters + CSV export. Profile: `/profile` — enrollments + password change.

### 4) Verify
```powershell
# backend (from backend/)
python manage.py test tests -v 1
ruff check apps tests config
python manage.py check

# frontend (from frontend/)
npm run lint; npm run build
```

Troubleshooting:
- CSRF/cookies: use the two URLs above exactly (`127.0.0.1:8000` + `localhost:5173` are in `.env.example` trusted origins). Keep `frontend/.env` as `VITE_API_BASE_URL=` empty (same-origin proxy). Setting it to the backend URL breaks session cookies across `localhost` vs `127.0.0.1`.
- `Authentication credentials were not provided` on every page: session is gone (most common: you changed `SECRET_KEY`, which invalidates all signed sessions). Log out, clear `localhost` cookies if needed, log in again. The app now auto-redirects to `/sign-in` on 401.
- Header shows `admin · STUDENT`: pre-fix superusers defaulted to STUDENT. Promote once: `python manage.py shell -c "from django.contrib.auth import get_user_model; u=get_user_model().objects.get(username='admin'); u.role='ADMIN'; u.save(); print(u.username, u.role, u.is_superuser)"`, then log out/in.
- Port busy: `python manage.py runserver 127.0.0.1:8001` + set `VITE_DEV_PROXY=http://127.0.0.1:8001` before `npm run dev`.
- Fresh DB: delete `backend/db.sqlite3`, rerun `migrate` + `createsuperuser` (new superusers are ADMIN automatically).
- Never commit `.env` or `db.sqlite3`. Never paste real passwords into online hash generators — create users in `/admin/users`.

## Status
- [x] Phase 0 — repo, versions, decisions
- [x] Phase 1 — backend foundation, session/CSRF/login, bcrypt hasher, health, OpenAPI
- [x] Phase 2 — domain models + constraints + admin
- [x] Phase 3 — API: admin CRUD, teacher-scoped roster, atomic attendance, self-view, scoped summary + safe CSV (25 tests)
- [x] Phase 4 — frontend foundation: Vite+React+TS, Tailwind, router + session guards, design system
- [x] Phase 5 — role experiences: admin users/academics/assignments, teacher marking/submit/corrections/audit, student history, reports export, profile + password change (29 backend tests, frontend build clean)
- [x] Phase 5.1 — full admin CRUD (edit/delete users, years, classes, subjects, assignments, enrollments with protection handling), `seed_demo` data, UI redesign (Attendly brand, dark sidebar, landing page, SVG analytics: donuts, bars, trends), student subject-wise + low-attendance hints, teacher session history, reports analytics (32 backend tests, frontend build clean)
- [ ] Phase 6 — quality/security/a11y + E2E (deferred per request)
- [ ] Phase 7 — deployment (deferred per request — local-only for now)

Environment verified: Python 3.13.5, Node v24.13.0, npm 11.6.2.

## Security notes
- Django session auth only, no JWT. `SESSION_COOKIE_HTTPONLY=True`, CSRF enforced.
- Passwords via Django hashers (`BCryptSHA256PasswordHasher` first), never plaintext/custom crypto.
- All authorization enforced server-side. Frontend guards are UX only.
- Secrets via `.env`, never committed.
