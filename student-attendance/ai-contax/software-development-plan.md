# Software Development Plan (SDP)
## Student Attendance Management System

## 1. Delivery approach
Build in vertical, testable milestones. The coding agent must inspect the repository first, preserve existing user work, and create only the files required by the agreed structure. Do not overwrite existing files without reviewing them.

## 2. Required repository structure
```text
student-attendance/
├── ai-contax/
│   ├── architecture.md
│   ├── rules.md
│   ├── context.md
│   └── software-development-plan.md
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── academics/
│   │   ├── attendance/
│   │   └── reporting/
│   ├── tests/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── api.md
│   ├── data-model.md
│   ├── test-plan.md
│   ├── deployment.md
│   └── decisions.md
├── .gitignore
└── README.md
```
Only add files that serve a defined purpose. Add individual app files and feature components as implementation requires; do not create empty placeholder modules.

## 3. Step-by-step implementation

### Phase 0 — Repository and decisions
1. Inspect current directory and existing files.
2. Read all `ai-contax` documents.
3. Confirm Python/Node versions available and document supported versions.
4. Create `docs/decisions.md` with unresolved decisions and selected reversible defaults.
5. Initialize Git if not already initialized; never destroy existing history.

Exit criteria: documented project layout, versions, and assumptions.

### Phase 1 — Backend foundation
1. Create Python virtual environment and Django project under `backend/`.
2. Install Django, DRF, CORS support only if cross-origin development requires it, OpenAPI tooling, environment loader, and test/lint dependencies.
3. Create domain apps: accounts, academics, attendance, reporting.
4. Define custom user model and role choices before first migration.
5. Configure SQLite, environment-based settings, timezone, static/media settings, and separate development/production settings as appropriate.
6. Configure password hasher. If bcrypt is required, install compatible dependency and configure Django's BCryptSHA256PasswordHasher; test login and password verification.
7. Configure session and CSRF settings; add CSRF bootstrap, login, logout, and current-user endpoints.
8. Add health endpoint and OpenAPI schema.
9. Create migrations and a documented admin bootstrap/superuser process.

Exit criteria: clean migration, server starts, login/session/CSRF tests pass, secrets are environment-based.

### Phase 2 — Domain models and permissions
1. Implement academic year, classroom, subject, teacher assignment, student enrollment, attendance session, attendance record, and audit event models.
2. Add constraints, indexes, `on_delete` policies, model validation, and admin registrations.
3. Implement reusable role and object-scope permission classes.
4. Add factories/fixtures for test data; do not commit real student data.
5. Test cross-role access denial, uniqueness, inactive accounts, and historical record preservation.

Exit criteria: model tests and permission matrix tests pass.

### Phase 3 — API implementation
1. Implement serializers with explicit allowed fields.
2. Implement list/detail/create/update endpoints and pagination/filtering.
3. Implement attendance workflow with atomic transactions and duplicate protection.
4. Enforce teacher assignment scope and student self-only access.
5. Implement report aggregation and CSV export with safe formula handling.
6. Document request/response examples and error codes in `docs/api.md`.

Exit criteria: API tests cover happy paths, invalid input, permissions, edge cases, and transaction rollback.

### Phase 4 — Frontend foundation and design system
1. Scaffold React.js + Vite + JavaScript.
2. Configure Tailwind, routing, API client, environment variables, linting, formatting, and type checking.
3. Create shared design tokens, typography, buttons, inputs, badges, cards, tables, dialogs, dropdowns, skeletons, toasts, and empty/error states.
4. Implement responsive app shell, navigation, page title/breadcrumb patterns, and accessible form primitives.
5. Implement session bootstrap and route-level UX guards; backend remains authoritative.
6. Add global error handling and session-expiration behavior.

Exit criteria: app builds, design primitives are responsive/accessibile, unauthenticated users are routed to sign-in.

### Phase 5 — Role-based experiences
Implement in this order:
1. Sign-in and logout.
2. Admin dashboard and user management.
3. Academic setup: academic years, classes, subjects.
4. Teacher assignment and student enrollment.
5. Teacher dashboard, assigned class list, and roster.
6. Attendance marking/review/submission.
7. Student dashboard and personal attendance history.
8. Reports, filters, and CSV export.
9. Profile and account settings.

For each screen, include loading, empty, error, success, permission-denied, and mobile states. Wire all controls to real behavior; do not ship decorative buttons.

Exit criteria: all primary journeys work against the API with role-appropriate access.

### Phase 6 — Quality, security, and accessibility
1. Backend unit/API tests and frontend component tests.
2. Playwright E2E tests for admin setup, teacher attendance submission, student read-only view, logout, and denied access.
3. Check CSRF, session rotation, secure cookie settings, login throttling, permission boundaries, input validation, CSV injection, and secret handling.
4. Run dependency vulnerability checks.
5. Test keyboard navigation, screen-reader labels, contrast, reduced motion, responsive breakpoints, and browser console.
6. Verify no seeded demo credentials or sensitive data remain in production configuration.

Exit criteria: all tests and checks pass; issues are documented and resolved or explicitly accepted.

### Phase 7 — Deployment and handoff
1. Provide reproducible local setup and production deployment instructions.
2. Configure production `DEBUG=False`, allowed hosts, HTTPS, secure cookies, CSRF trusted origins, static files, and environment secrets.
3. Explain SQLite concurrency and backup limitations; document restore test.
4. Run migrations and collect static assets in deployment process.
5. Configure logging, health checks, and error monitoring appropriate to hosting.
6. Create admin account securely; never embed default credentials.
7. Complete README, API docs, data model, test plan, deployment guide, and known limitations.
8. Perform a final acceptance walkthrough using non-sensitive demo data.

Exit criteria: a new developer can install, run, test, and deploy using documentation alone.

## 4. Acceptance criteria
- Admin can create and manage teachers, students, classes, subjects, assignments, and enrollments.
- Teacher sees only assigned classes and can record attendance for enrolled students.
- A student can see only their own attendance.
- Duplicate attendance records are prevented by database constraints.
- Attendance submissions and corrections are auditable.
- Session login/logout and CSRF protection work correctly.
- UI is responsive, accessible, and has complete feedback states.
- Reports match source attendance records and export safely.
- Automated tests cover core workflows and role boundaries.
- No secrets or real student information are committed.
- README and deployment instructions are complete and verified.

## 5. Agent execution protocol
At the start: summarize repository findings and proposed first milestone. Then implement without repeatedly asking for approval on routine engineering choices. Ask only when an unresolved decision materially changes product behavior, privacy, or deployment. After each phase, report files changed, commands/tests run, results, and remaining work. Do not claim end-to-end completion until all acceptance criteria are met.
