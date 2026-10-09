# Data Model

This document is the implementation reference for the first release. See `ai-contax/architecture.md` for rationale.

## Entities and relationships
- User 1—1 StudentProfile or TeacherProfile (role-dependent).
- AcademicYear 1—many Classroom.
- Classroom many—many Student through Enrollment, scoped to AcademicYear.
- Teacher many—many Classroom/Subject through TeachingAssignment.
- Classroom + Subject + Date 1—many AttendanceSession (one session per combination by default).
- AttendanceSession 1—many AttendanceRecord.
- User 1—many AuditEvent as actor.

## Required integrity rules
- User login identifier is unique.
- Student number and employee number are unique.
- Classroom unique within academic year by name and section.
- Teaching assignment unique per teacher/classroom/subject/year.
- Enrollment unique per student/classroom/year.
- Attendance session unique per classroom/subject/date (unless a period field is approved).
- Attendance record unique per session/student.
- Student attendance records must refer to students enrolled in the session's classroom for the applicable academic year.
- Only an authorized actor may create or change attendance; corrections require reason and audit entry.

## Attendance calculation
Attendance percentage = count of qualifying attended statuses / count of statuses included in the institution's policy × 100. The institution must decide whether `LATE` counts as attended and whether `EXCUSED` is excluded from the denominator. Keep this policy configurable and document the selected default before release; do not silently assume it.
