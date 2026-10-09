# API Documentation

Base path: `/api/v1/`. Authentication uses Django sessions and CSRF protection.

## Authentication flow
1. Client requests `GET /auth/csrf/` to initialize CSRF state.
2. Client posts credentials to `POST /auth/login/` with CSRF token.
3. Client calls `GET /auth/me/` to retrieve current user and role.
4. Client includes session cookies and CSRF token for unsafe methods.
5. Client posts to `POST /auth/logout/` to invalidate the session.

## Endpoint plan
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/auth/csrf/` | Public | CSRF bootstrap |
| POST | `/auth/login/` | Public | Create session |
| POST | `/auth/logout/` | Authenticated | End session |
| GET | `/auth/me/` | Authenticated | Current user |
| GET/POST | `/admin/users/` | Admin | List/create accounts |
| GET/PATCH | `/admin/users/{id}/` | Admin | Read/update account |
| CRUD | `/academic-years/` | Admin | Academic year setup |
| CRUD | `/classrooms/` | Admin | Class/section setup |
| CRUD | `/subjects/` | Admin | Subject setup |
| CRUD | `/assignments/` | Admin | Teacher assignments |
| CRUD | `/enrollments/` | Admin | Student enrollment |
| GET | `/teacher/classes/` | Teacher | Assigned classes |
| GET | `/classes/{id}/students/` | Admin/assigned teacher | Roster |
| GET/POST | `/attendance/sessions/` | Admin/assigned teacher | List/create sessions |
| GET/PATCH | `/attendance/sessions/{id}/` | Scoped admin/teacher | Read/update session |
| POST | `/attendance/sessions/{id}/submit/` | Scoped admin/teacher | Submit attendance |
| POST | `/attendance/sessions/{id}/corrections/` | Authorized admin/teacher | Audited correction |
| GET | `/students/me/attendance/` | Student | Own attendance |
| GET | `/reports/attendance/summary/` | Admin/assigned teacher/student-self | Scoped summary |
| GET | `/reports/attendance/export.csv` | Admin/assigned teacher | Scoped CSV export |

The implementation must publish an OpenAPI schema with actual serializers, parameters, response codes, and examples. This plan is not a substitute for generated API documentation.
