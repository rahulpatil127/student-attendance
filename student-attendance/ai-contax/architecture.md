# Student Attendance Management System — Architecture

## 1. Purpose
Build a production-minded, session-based student attendance web application for an educational institution. The application has three roles: Administrator, Teacher, and Student. It must be secure, accessible, responsive, maintainable, and ready for institutional handoff.

## 2. Technology decisions
- Frontend: React.js + Vite + JavaScript
- Styling: Tailwind CSS
- Backend: Python + Django + Django REST Framework
- Database: SQLite for the requested initial deployment
- Authentication: Django session authentication with secure, HttpOnly session cookies; CSRF protection for state-changing requests
- Password hashing: Django's built-in password hashers (PBKDF2 by default; Argon2 may be enabled if dependency is installed). Never store or compare plaintext passwords. “bcrypt” is not a separate login flow; if bcrypt is explicitly required, configure Django's BCryptSHA256PasswordHasher and verify migration compatibility.
- API: REST, JSON, versioned under `/api/v1/`
- Tests: Django test framework/pytest, React Testing Library, Playwright for critical end-to-end flows
- Quality: Ruff, ESLint, Prettier

## 3. High-level architecture
```text
Browser (React SPA)
  ├── React Router (routes + role guards for UX only)
  ├── API client (credentials: include; CSRF token handling)
  ├── Feature modules (auth, students, teachers, classes, attendance, reports)
  └── Tailwind design system
          │ HTTPS / JSON / session cookie + CSRF token
          ▼
Django + Django REST Framework
  ├── Authentication/session middleware
  ├── Permission classes (authoritative role + object-level access)
  ├── Domain apps
  │    ├── accounts
  │    ├── academics
  │    ├── attendance
  │    └── reporting
  ├── Validation + business services
  └── SQLite (development/small deployment; plan migration for larger scale)
```

## 4. Backend app boundaries
- `accounts`: custom user model, role field, login/logout/current-user/CSRF endpoints, account administration.
- `academics`: academic years/terms, departments (optional), classes/sections, subjects, student profiles, teacher profiles, teaching assignments/enrollments.
- `attendance`: sessions, attendance records, attendance submission and correction workflows, audit history.
- `reporting`: aggregated attendance summaries and CSV exports. Keep calculations in tested query/service functions, not in view code.

## 5. Core data model
Use UUID or integer primary keys consistently; choose UUID only if justified. Define `AUTH_USER_MODEL` before the first migration.

- `User`: username/email (unique as selected), password hash, `role` (`ADMIN`, `TEACHER`, `STUDENT`), `is_active`, timestamps. Use Django's `AbstractUser` unless requirements demand otherwise.
- `StudentProfile`: one-to-one User, student number (unique), class/section, enrollment status.
- `TeacherProfile`: one-to-one User, employee number (unique), optional department.
- `AcademicYear`: name, start/end dates, active flag.
- `Classroom`: name/grade, section, academic year; unique constraint for year + name + section.
- `Subject`: name, code (unique), active flag.
- `TeachingAssignment`: teacher + classroom + subject + academic year; unique constraint across the combination.
- `Enrollment`: student + classroom + academic year; unique constraint; effective dates/status.
- `AttendanceSession`: classroom + subject + date + created_by + status (`DRAFT`, `SUBMITTED`, `LOCKED`); prevent duplicate sessions for same classroom/subject/date unless a period/slot is introduced.
- `AttendanceRecord`: session + student + status (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) + marked_by + timestamps + optional note. Unique constraint on session + student.
- `AuditEvent`: actor, action, target type/id, timestamp, concise before/after metadata for attendance edits. Avoid storing secrets or unnecessary personal data.

Use database constraints for uniqueness and integrity. Add indexes for common filters (date, classroom, student, session). Define deletion policies deliberately; prefer archival/deactivation over destructive deletion for historical records.

## 6. Authorization matrix
| Capability | Admin | Teacher | Student |
|---|---:|---:|---:|
| Manage user accounts and roles | Yes | No | No |
| Create/manage academic years, classes, subjects | Yes | No | No |
| Assign teachers and enroll students | Yes | No | No |
| View assigned classes and rosters | All | Assigned only | Own class only |
| Create/submit attendance | Any (with audit) | Assigned classes only | No |
| Edit submitted attendance | Admin with reason/audit | Within configured correction window, with audit | No |
| View attendance | All | Assigned classes | Own records only |
| Export institution-wide reports | Yes | No | No |
| Export assigned-class reports | Yes | Assigned only | No |
| View personal summary | Yes | Yes | Yes |

Every permission must be enforced server-side. Frontend route guards are convenience only. Return 403 for authenticated but unauthorized requests and 404 where object-existence disclosure should be avoided.

## 7. Session authentication and security
- Use Django session authentication, not JWT, as requested.
- Serve frontend and backend from the same site/origin in production where practical. If separate origins are necessary, configure exact CORS/CSRF trusted origins and credentialed requests; never use wildcard origins with credentials.
- `SESSION_COOKIE_HTTPONLY=True`, `SESSION_COOKIE_SECURE=True` in HTTPS production, `SESSION_COOKIE_SAMESITE='Lax'` (review if deployment requires otherwise).
- `CSRF_COOKIE_HTTPONLY=False` only if frontend reads the CSRF cookie; alternatively expose a CSRF bootstrap endpoint and return token in JSON. Never disable CSRF for convenience.
- Use `credentials: 'include'`/Axios `withCredentials: true`; send `X-CSRFToken` on unsafe methods.
- Rotate session key on login; invalidate session on logout; expire inactive sessions according to policy.
- Use Django password hashers; never implement custom hashing. If bcrypt is mandated, configure and test Django's supported bcrypt hasher and retain a safe migration path.
- Rate-limit login attempts at the application/proxy layer; generic login error messages; enforce strong password policy and secure admin access.
- Validate uploads, escape/render user content safely, use HTTPS, set security headers, protect secrets via environment variables.
- Do not log passwords, session IDs, CSRF tokens, or full sensitive payloads.

## 8. API conventions
- Prefix: `/api/v1/`
- Use consistent response shapes and standard HTTP status codes.
- Paginate list endpoints; validate query filters; cap page size.
- Use serializers for input/output validation.
- Use service functions for multi-step transactions.
- Use `transaction.atomic()` when creating a session and its attendance records.
- Use timezone-aware dates and institution timezone configuration.
- Document endpoints with OpenAPI (drf-spectacular or equivalent).

Suggested endpoints:
- `GET /api/v1/auth/csrf/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/logout/`
- `GET /api/v1/auth/me/`
- `GET/POST /api/v1/admin/users/`
- CRUD `/api/v1/academic-years/`, `/classrooms/`, `/subjects/`, `/assignments/`, `/enrollments/`
- `GET /api/v1/teacher/classes/`
- `GET /api/v1/classes/{id}/students/`
- `GET/POST /api/v1/attendance/sessions/`
- `GET/PATCH /api/v1/attendance/sessions/{id}/`
- `POST /api/v1/attendance/sessions/{id}/submit/`
- `POST /api/v1/attendance/sessions/{id}/corrections/`
- `GET /api/v1/students/me/attendance/`
- `GET /api/v1/reports/attendance/summary/`
- `GET /api/v1/reports/attendance/export.csv`

## 9. Frontend structure and UX
- Role-specific dashboards, but shared layout, navigation primitives, form controls, tables, dialogs, alerts, and loading/empty/error states.
- Design direction: clean contemporary education SaaS; restrained neutral palette with one primary accent; clear typography; consistent spacing; responsive sidebar/topbar; accessible contrast and focus states.
- Use a design token layer in Tailwind; avoid arbitrary one-off values.
- Required pages: sign-in, access denied/not found, admin dashboard, user management, academic setup, teacher dashboard, class roster, attendance marking/review, reports, student dashboard, personal attendance history/profile.
- Attendance workflow: select assigned class/subject/date → load roster → mark present/absent/late/excused → review counts → save draft or submit → show confirmation and audit trail.
- Prevent accidental loss with unsaved-change prompts. Use optimistic updates only where rollback is safe.
- Meet WCAG 2.2 AA where feasible: semantic HTML, keyboard navigation, labels, visible focus, accessible dialogs, reduced-motion support.

## 10. Deployment and operational notes
SQLite is suitable for development, demos, and small deployments with modest write concurrency. For multi-campus or high-concurrency production, plan a tested migration to PostgreSQL. Back up SQLite using a consistent backup procedure; never copy a live database file blindly while writes are occurring. Store media/static assets separately. Configure `DEBUG=False`, allowed hosts, HTTPS, secure cookies, error monitoring, logs, and restore testing before go-live.
