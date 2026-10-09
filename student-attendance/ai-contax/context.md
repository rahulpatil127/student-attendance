# Project Context

## Product
Name: Student Attendance Management System (working title).

## Product objective
Provide a web application for an educational institution to manage student, teacher, class, subject, enrollment, and attendance workflows through role-specific experiences.

## Confirmed requirements
- Frontend: React.
- Styling: Tailwind CSS.
- Backend: Django / Django REST Framework.
- Database: SQLite.
- Password hashing: bcrypt requested; implement through Django's supported password-hasher configuration rather than custom code.
- Authentication: session-based web application.
- Roles: Administrator/Management, Teacher, Student.
- UI/UX: modern, interactive, responsive, accessible.
- Deliverable: end-to-end, client-ready project with maintainable architecture, documentation, tests, and setup instructions.
- Agent should work autonomously from this specification, avoid fabricated requirements, and document assumptions.

## Initial product scope
### Administrator / Management
- Secure login and dashboard.
- Manage users and role assignments.
- Manage academic years, classes/sections, and subjects.
- Assign teachers to classes/subjects.
- Enroll students.
- View attendance summaries and export reports.
- Review attendance corrections and audit history.

### Teacher
- View assigned classes and subjects.
- View class roster.
- Create attendance for a class, subject, and date.
- Mark Present, Absent, Late, or Excused.
- Save draft, submit, and request/carry out corrections according to policy.
- View class attendance history and reports for assigned classes only.

### Student
- View personal dashboard and attendance percentage.
- View attendance history by date, subject, and status.
- View own profile and enrollment details.
- Cannot create or modify attendance.

## Unresolved decisions
- Institution name/branding and logo.
- Whether attendance is per subject/period or once per class per day. Initial default: per subject per date; add period only if confirmed.
- Attendance threshold for low-attendance alerts. Do not hardcode a threshold until confirmed; make configurable.
- Whether students can submit absence explanations. Out of initial scope unless requested.
- Data import format and initial data migration.
- Hosting provider, domain, email/SMS notifications, and backup retention.
- Exact correction window and who approves corrections. Initial default: admin can correct with mandatory reason and audit record; teacher corrections are restricted to draft or explicitly configured window.
- Whether account creation is admin-only or includes invitations. Initial default: admin-managed accounts.

## Non-goals for first release
- Facial recognition or biometric attendance.
- GPS/geofencing attendance.
- Native mobile apps.
- Fees, exams, grades, payroll, or learning management features.
- Public self-registration.

## Product principles
Security and privacy first; minimal data exposure; transparent audit trail; predictable workflows; mobile-friendly interfaces; clear feedback; maintainable code over unnecessary complexity.
