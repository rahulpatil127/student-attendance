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
