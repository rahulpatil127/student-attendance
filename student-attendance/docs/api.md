# API Documentation — Phase 3 implemented

Base path: `/api/v1/`. Authentication uses Django sessions and CSRF protection.
OpenAPI schema: `GET /api/v1/schema/` (29 paths), Swagger UI: `GET /api/v1/docs/`.

## Authentication flow
1. Client requests `GET /api/v1/auth/csrf/` to initialize CSRF state (sets `csrftoken` cookie, returns `csrfToken`).
2. Client posts credentials to `POST /api/v1/auth/login/` with `X-CSRFToken` header + `credentials:include`.
3. Client calls `GET /api/v1/auth/me/` to retrieve current user and role.
4. Client includes session cookies and CSRF token for unsafe methods.
5. Client posts to `POST /api/v1/auth/logout/` to invalidate the session.

Example login:
```json
POST /api/v1/auth/login/
{"username": "t1", "password": "StrongPass123"}
→ 200 {"id":2,"username":"t1","email":"t1@ex.com","role":"TEACHER","is_active":true}
```
Invalid credentials → `400 {"detail":"Invalid credentials."}` (generic, no user enumeration).

## Endpoints (all JSON unless noted)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/health/` | Public | `{"status":"ok"}` |
| GET | `/api/v1/auth/csrf/` | Public | CSRF bootstrap |
| POST | `/api/v1/auth/login/` | Public | Create session (rotates key) |
| POST | `/api/v1/auth/logout/` | Authenticated | End session |
| GET | `/api/v1/auth/me/` | Authenticated | Current user |
| GET | `/api/v1/admin/users/` | Admin | List with filters `?role=&is_active=&search=&classroom=` (name/username/email; classroom = active enrollments), paginated. Includes `classes` (active enrollments) + `student_number`/`employee_number` |
| POST | `/api/v1/admin/users/bulk/` | Admin | Excel/CSV upload (`.xlsx`/`.csv`, columns username/firstname/lastname/email) → creates STUDENT accounts, password = firstname, IDs auto. Taken usernames auto-resolve (`sara`→`sara2`, reported). Optional `classroom` enrolls all into it. Returns `{created, errors, total}` |
| GET/PATCH/PUT/DELETE | `/api/v1/admin/users/{id}/` | Admin | Read/update account |
| POST | `/api/v1/admin/users/` | Admin | Create account; optional `classroom` enrolls a STUDENT immediately (no separate step) |
| GET/POST | `/api/v1/academic-years/` | Admin | List/create; filter `?is_active=true` |
| GET/PUT/PATCH/DELETE | `/api/v1/academic-years/{id}/` | Admin | Detail |
| GET/POST | `/api/v1/classrooms/` | Admin | Filter `?academic_year=&is_active=` |
| GET/POST | `/api/v1/subjects/` | Admin | — |
| GET/POST | `/api/v1/assignments/` | Admin | Teacher assignments; filters `?teacher=&classroom=&subject=&academic_year=` |
| GET/POST | `/api/v1/enrollments/` | Admin | One-by-one enroll. Rule: **one ACTIVE enrollment per student** — a second active enroll → `400`; deactivate the old one first |
| POST | `/api/v1/enrollments/bulk/` | Admin | Whole-class enroll: `{classroom, academic_year, student_ids[]}` → `{enrolled, skipped[]}`, atomic (double-enrolls land in `skipped`) |
| POST | `/api/v1/enrollments/promote/` | Admin | Year-end move: `{from_classroom, to_classroom, academic_year}` → `{moved, skipped[]}`; old enrollments go INACTIVE |
| DELETE | `/api/v1/enrollments/clear-inactive/?classroom=<id>` | Admin | Delete INACTIVE rows of one class (post-promote cleanup); returns `{deleted}` |
| GET/POST | `/api/v1/complaints/` | Student own / Admin all | Grievances; student create+read own, teacher denied |
| GET/PATCH/DELETE | `/api/v1/complaints/{id}/` | Scoped | Admin may PATCH only `status` + `admin_reply`; student update → 403 |
| GET/POST | `/api/v1/student-profiles/` | Admin | `{user, student_number, status}` |
| GET/POST | `/api/v1/teacher-profiles/` | Admin | `{user, employee_number, department}` |
| GET | `/api/v1/teacher/classes/` | Teacher (+Admin sees all) | Assigned classes |
| GET | `/api/v1/classes/{id}/students/` | Admin/assigned teacher | Roster `{classroom, students[]}`; student → 404 |
| GET/POST | `/api/v1/attendance/sessions/` | Admin/assigned teacher (+class teacher for whole-day) | List (filters `classroom,subject,status,date,date_from,date_to`) / create atomic. Omit `subject` for a whole-day session (class teacher only) |
| GET/PATCH | `/api/v1/attendance/sessions/{id}/` | Scoped | Read; PATCH `date` only if DRAFT |
| POST | `/api/v1/attendance/sessions/{id}/submit/` | Scoped | DRAFT→SUBMITTED, audit |
| POST | `/api/v1/attendance/sessions/{id}/corrections/` | DRAFT: assigned/admin; SUBMITTED: admin only | `{reason>=5 chars, records[]}`, audit |
| GET | `/api/v1/students/me/attendance/` | Authenticated (self) | Own records, filters `status,subject,date_from,date_to`, paginated |
| GET | `/api/v1/students/me/enrollments/` | Authenticated (self) | Own enrollments for profile |
| GET | `/api/v1/teacher/assignments/` | Teacher (own) / Admin (all) | Assigned class+subject combos for marking UI |
| GET | `/api/v1/attendance/sessions/{id}/audit/` | Admin/assigned teacher | Audit trail `{session, events[]}` |
| POST | `/api/v1/auth/password/change/` | Authenticated | `{old_password, new_password}` → validated, updates hash |
| GET | `/api/v1/reports/attendance/summary/` | Admin/assigned teacher/student-self | Aggregates + policy. `by_subject=1` splits rows per subject (English 2, Science 1…) |
| GET | `/api/v1/reports/attendance/daily-summary/?classroom=<id>` | Admin/assigned or class teacher | Whole-day day counts: `{student, username, student_number, days_present, days_total, percentage}` |
| GET | `/api/v1/reports/attendance/daily-export.csv?classroom=<id>` | Same scope | Same rows as CSV |
| GET | `/api/v1/reports/attendance/export.csv` | Scoped (student=self only) | CSV download, formula-safe; gains a `subject` column in by-subject mode |

## Attendance examples

Create (atomic):
```json
POST /api/v1/attendance/sessions/
{"classroom":1,"subject":1,"date":"2025-08-01",
 "records":[{"student":5,"status":"PRESENT"},{"student":6,"status":"ABSENT","note":""}]}
→ 201 {"id":1,"status":"DRAFT","records":[...],"counts":{"PRESENT":1,"ABSENT":1,"TOTAL":2}}
```
Duplicate class/subject/date → `400 {"detail":"Duplicate attendance session..."}`.
Non-enrolled student → `400 {"records":"Student X is not actively enrolled..."}`. Whole transaction rolls back (verified by test).
Unassigned teacher → `403`. Student create → `403`.

Submit:
```
POST /api/v1/attendance/sessions/1/submit/ → 200 {"status":"SUBMITTED",...}
```
Empty or non-DRAFT → `400`.

Correction:
```json
POST /api/v1/attendance/sessions/1/corrections/
{"reason":"verified late arrival","records":[{"student":5,"status":"LATE"}]}
→ 200 (admin only for SUBMITTED; teacher 403). Missing/short reason → 400.
Creates AuditEvent action=SESSION_CORRECTED with before/after.
```

Records now carry `session_date`, `subject_name`, `classroom_name` (read-only) for student analytics.

## Reports policy
`percentage = attended / denominator *100` where default `count_late_as_present=true`, `exclude_excused=true` (documented reversible default). Override: `?count_late_as_present=false&exclude_excused=false&include_drafts=true`.
Example:
```json
GET /api/v1/reports/attendance/summary/?classroom=1
{"policy":{"count_late_as_present":true,"exclude_excused":true},"count":2,
 "results":[{"student":5,"username":"s1","present":1,"absent":0,"late":0,"excused":0,"total":1,"percentage":100.0}]}
```
CSV: `student_id,username,present,absent,late,excused,total,percentage`; values starting with `= + - @ | %` are prefixed with `'` to block formula injection.

## Status codes & pagination
- `200/201` success, `400` validation (field-keyed or `{"detail":...}`), `401/403` unauthenticated/unauthorized (student roster misuse → `404` to avoid disclosure), `404` not found.
- List endpoints use `PageNumberPagination` (`page_size=20`): `{"count","next","previous","results"}`. Query filters validated; `page_size` capped by DRF.
- Serializers expose explicit allow-lists only (no password hashes, no cross-role PII beyond roster minimum).
