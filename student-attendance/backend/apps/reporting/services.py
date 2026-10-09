"""Reporting calculations — kept in service functions for testability."""

from collections import defaultdict

from rest_framework.exceptions import PermissionDenied

from apps.academics.models import Enrollment, StudentProfile
from apps.academics.scopes import is_admin, teacher_classroom_ids
from apps.attendance.models import AttendanceRecord, AttendanceSession


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

    has_dates = bool(params.get("date_from") or params.get("date_to"))
    if (
        allowed_classrooms is not None
        and len(allowed_classrooms) == 1
        and not has_dates
    ):
        # Current view (no date range): only students actively enrolled in
        # that class right now. Moved-out students would otherwise appear here
        # AND in their new class. Add dates to see history instead.
        cid = next(iter(allowed_classrooms))
        members = set(
            Enrollment.objects.filter(classroom_id=cid, status="ACTIVE").values_list(
                "student_id", flat=True
            )
        )
        student_ids = members if student_ids is None else (members & student_ids)

    qs = AttendanceRecord.objects.select_related(
        "student", "session", "session__subject"
    ).filter(session__status__in=["SUBMITTED", "LOCKED", "DRAFT"])
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
    subj_agg = defaultdict(lambda: {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0, "TOTAL": 0})
    subj_meta = {}
    for r in qs.iterator(chunk_size=1000):
        a = agg[r.student_id]
        a[r.status] += 1
        a["TOTAL"] += 1
        if r.student_id not in meta:
            meta[r.student_id] = r.student.username
        key = (r.student_id, r.session.subject_id)
        sa = subj_agg[key]
        sa[r.status] += 1
        sa["TOTAL"] += 1
        if key not in subj_meta:
            subj = getattr(r.session, "subject", None)
            subj_meta[key] = (subj.name if subj else "Whole day", r.session.subject_id)

    rows = []
    numbers = {
        p.user_id: p.student_number
        for p in StudentProfile.objects.filter(user_id__in=list(agg.keys()))
    }
    single_subject_name = None
    single_subject_id = None
    if params.get("subject"):
        try:
            from apps.academics.models import Subject as SubjectModel

            subj = SubjectModel.objects.filter(pk=params.get("subject")).first()
            if subj is not None:
                single_subject_name = subj.name
                single_subject_id = subj.id
        except (ValueError, TypeError):
            pass
    by_subject = params.get("by_subject", "").lower() in ("1", "true", "yes")
    if by_subject:
        sub_rows = []
        for (sid, subject_id), counts in subj_agg.items():
            attended = counts["PRESENT"] + (counts["LATE"] if policy["count_late_as_present"] else 0)
            denom = counts["TOTAL"] - (counts["EXCUSED"] if policy["exclude_excused"] else 0)
            pct = round(attended / denom * 100, 2) if denom > 0 else 0.0
            name, _ = subj_meta[(sid, subject_id)]
            sub_rows.append(
                {
                    "student": sid,
                    "username": meta.get(sid, ""),
                    "student_number": numbers.get(sid, ""),
                    "subject": subject_id,
                    "subject_name": name,
                    "present": counts["PRESENT"],
                    "absent": counts["ABSENT"],
                    "late": counts["LATE"],
                    "excused": counts["EXCUSED"],
                    "total": counts["TOTAL"],
                    "percentage": pct,
                }
            )
        sub_rows.sort(key=lambda x: (x["username"], x["subject_name"]))
        return sub_rows, policy
    for sid, counts in agg.items():
        attended = counts["PRESENT"] + (counts["LATE"] if policy["count_late_as_present"] else 0)
        denom = counts["TOTAL"] - (counts["EXCUSED"] if policy["exclude_excused"] else 0)
        pct = round(attended / denom * 100, 2) if denom > 0 else 0.0
        rows.append(
            {
                "student": sid,
                "username": meta.get(sid, ""),
                "student_number": numbers.get(sid, ""),
                "subject": single_subject_id,
                "subject_name": single_subject_name or "",
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


def compute_daily_summary(user, params):
    """Class-teacher whole-day report: days present per student in one class.

    Requires `classroom`. Counts distinct session dates (whole-day sessions
    only): days_present = dates with PRESENT/LATE, days_total = dates with any
    record for that student. Admin: any class. Teacher: assigned or class
    teacher of it. Student: own rows, must be enrolled in it.
    """
    from apps.academics.scopes import teacher_can_view_classroom

    try:
        classroom_id = int(params.get("classroom"))
    except (TypeError, ValueError):
        from rest_framework.exceptions import ValidationError

        raise ValidationError({"classroom": "Pick a class first."}) from None

    if is_admin(user):
        pass
    elif user.role == "TEACHER":
        if not teacher_can_view_classroom(user, classroom_id):
            raise PermissionDenied("Not assigned to this classroom.")
    elif user.role == "STUDENT":
        if not Enrollment.objects.filter(
            student=user, classroom_id=classroom_id, status="ACTIVE"
        ).exists():
            raise PermissionDenied("Not enrolled in this classroom.")
    else:
        raise PermissionDenied("Forbidden.")

    sessions = AttendanceSession.objects.filter(
        classroom_id=classroom_id,
        subject__isnull=True,
        status__in=["SUBMITTED", "LOCKED"],
    )
    if params.get("date_from"):
        sessions = sessions.filter(date__gte=params.get("date_from"))
    if params.get("date_to"):
        sessions = sessions.filter(date__lte=params.get("date_to"))
    session_ids = list(sessions.values_list("id", flat=True))
    dates = {s.id: str(s.date) for s in sessions.only("id", "date")}

    records = (
        AttendanceRecord.objects.filter(session_id__in=session_ids)
        .select_related("student")
        .order_by("student__username")
    )
    if user.role == "STUDENT" and not is_admin(user):
        records = records.filter(student=user)

    per_student = defaultdict(lambda: {"dates": set(), "present_dates": set()})
    names = {}
    for r in records.iterator(chunk_size=1000):
        d = dates.get(r.session_id)
        if d is None:
            continue
        names[r.student_id] = r.student.username
        per_student[r.student_id]["dates"].add(d)
        if r.status in ("PRESENT", "LATE"):
            per_student[r.student_id]["present_dates"].add(d)

    numbers = {
        p.user_id: p.student_number
        for p in StudentProfile.objects.filter(user_id__in=list(per_student.keys()))
    }
    rows = []
    for sid, v in per_student.items():
        total = len(v["dates"])
        present = len(v["present_dates"])
        rows.append(
            {
                "student": sid,
                "username": names.get(sid, ""),
                "student_number": numbers.get(sid, ""),
                "days_present": present,
                "days_total": total,
                "percentage": round(present / total * 100, 2) if total else 0.0,
            }
        )
    rows.sort(key=lambda x: x["username"])
    day_count = len(set(dates.values()))
    return rows, {"days_total": day_count}


def sanitize_csv_value(value):
    """Prevent CSV formula injection: prefix risky leading chars with single quote."""
    s = "" if value is None else str(value)
    if s and s[0] in ("=", "+", "-", "@", "|", "%"):
        return "'" + s
    return s
