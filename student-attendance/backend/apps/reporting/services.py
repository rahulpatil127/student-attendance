"""Reporting calculations — kept in service functions for testability."""

from collections import defaultdict

from rest_framework.exceptions import PermissionDenied

from apps.academics.models import Enrollment, StudentProfile
from apps.academics.scopes import is_admin, teacher_classroom_ids
from apps.attendance.models import AttendanceRecord


def parse_policy(params):
    """Attendance policy defaults (reversible, documented):

    - LATE counts as attended (count_late_as_present=True)
    - EXCUSED excluded from denominator (exclude_excused=True)
    Override via query params for explicit review.
    """
    def as_bool(v, default):
        if v is None:
            return default
        return str(v).lower() in ("1", "true", "yes")

    return {
        "count_late_as_present": as_bool(params.get("count_late_as_present"), True),
        "exclude_excused": as_bool(params.get("exclude_excused"), True),
    }


def resolve_scope(user, params):
    """Returns (student_ids|None for all-in-scope, classroom_ids allowed, forced_student_only)."""
    classroom_param = params.get("classroom")
    student_param = params.get("student")

    if is_admin(user):
        allowed_classrooms = None  # all
        if classroom_param:
            allowed_classrooms = {int(classroom_param)}
        student_ids = {int(student_param)} if student_param else None
        return student_ids, allowed_classrooms, False

    if user.role == "TEACHER":
        assigned = teacher_classroom_ids(user)
        if classroom_param:
            cid = int(classroom_param)
            if cid not in assigned:
                raise PermissionDenied("Not assigned to this classroom.")
            allowed = {cid}
        else:
            allowed = set(assigned)
        student_ids = None
        if student_param:
            # verify student enrolled in one of allowed classrooms
            sid = int(student_param)
            ok = Enrollment.objects.filter(
                student_id=sid, classroom_id__in=allowed, status="ACTIVE"
            ).exists()
            if not ok:
                raise PermissionDenied("Student not in your assigned classes.")
            student_ids = {sid}
        return student_ids, allowed, False

    # STUDENT: self only
    return {user.id}, None, True


def compute_summary(user, params):
    policy = parse_policy(params)
    student_ids, allowed_classrooms, _ = resolve_scope(user, params)

    qs = AttendanceRecord.objects.select_related("student", "session").filter(
        session__status__in=["SUBMITTED", "LOCKED", "DRAFT"]
    )
    # Only count submitted+locked by default? Include DRAFT? For reports, include submitted only
    # unless explicitly requested. Default: SUBMITTED + LOCKED.
    if params.get("include_drafts", "").lower() not in ("1", "true", "yes"):
        qs = qs.filter(session__status__in=["SUBMITTED", "LOCKED"])

    if allowed_classrooms is not None:
        qs = qs.filter(session__classroom_id__in=allowed_classrooms)
    if student_ids is not None:
        qs = qs.filter(student_id__in=student_ids)
    if params.get("subject"):
        qs = qs.filter(session__subject_id=params.get("subject"))
    if params.get("date_from"):
        qs = qs.filter(session__date__gte=params.get("date_from"))
    if params.get("date_to"):
        qs = qs.filter(session__date__lte=params.get("date_to"))

    agg = defaultdict(lambda: {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0, "TOTAL": 0})
    meta = {}
    for r in qs.iterator(chunk_size=1000):
        a = agg[r.student_id]
        a[r.status] += 1
        a["TOTAL"] += 1
        if r.student_id not in meta:
            meta[r.student_id] = r.student.username

    rows = []
    numbers = {
        p.user_id: p.student_number
        for p in StudentProfile.objects.filter(user_id__in=list(agg.keys()))
    }
    for sid, counts in agg.items():
        attended = counts["PRESENT"] + (counts["LATE"] if policy["count_late_as_present"] else 0)
        denom = counts["TOTAL"] - (counts["EXCUSED"] if policy["exclude_excused"] else 0)
        pct = round(attended / denom * 100, 2) if denom > 0 else 0.0
        rows.append(
            {
                "student": sid,
                "username": meta.get(sid, ""),
                "student_number": numbers.get(sid, ""),
                "present": counts["PRESENT"],
                "absent": counts["ABSENT"],
                "late": counts["LATE"],
                "excused": counts["EXCUSED"],
                "total": counts["TOTAL"],
                "percentage": pct,
            }
        )
    rows.sort(key=lambda x: x["username"])
    return rows, policy


def sanitize_csv_value(value):
    """Prevent CSV formula injection: prefix risky leading chars with single quote."""
    s = "" if value is None else str(value)
    if s and s[0] in ("=", "+", "-", "@", "|", "%"):
        return "'" + s
    return s
