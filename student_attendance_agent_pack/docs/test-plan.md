# Test Plan

## Backend
- Authentication: valid/invalid login, session rotation, logout invalidation, inactive user denial, CSRF enforcement.
- Authorization: admin/teacher/student access matrix; teacher cannot access unassigned class; student cannot access another student's records.
- Models: uniqueness constraints, enrollment integrity, valid attendance statuses, date constraints.
- Attendance: draft/save/submit, duplicate prevention, atomic rollback, correction reason required, audit event creation.
- Reporting: aggregation correctness, filters, timezone boundaries, CSV escaping/formula injection protection.
- API: validation errors, pagination, filtering, safe serializer fields, expected status codes.

## Frontend
- Sign-in validation and error feedback.
- Role-based navigation and session expiry.
- Attendance roster selection, bulk status changes, unsaved-change warning, submit confirmation.
- Loading, empty, error, success, and forbidden states.
- Responsive navigation and tables.
- Keyboard access and accessible dialog behavior.

## End-to-end critical journeys
1. Admin creates academic year, class, subject, teacher, students, assignment, and enrollment.
2. Teacher signs in, opens assigned class, marks attendance, reviews counts, and submits.
3. Student signs in and sees only their own updated attendance.
4. Teacher attempts to access an unassigned class and is denied.
5. Student attempts to access another student's record and is denied.
6. Admin corrects an attendance entry with a reason; audit trail records actor and change.
7. Logout invalidates session; protected API requests fail.

## Release gates
All automated tests pass; lint/type checks pass; frontend production build succeeds; no unresolved critical/high security findings; manual accessibility and responsive checks completed.
