"""Attendance domain services: atomic session creation, submit, corrections + audit."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.academics.models import Classroom, Enrollment
from apps.academics.scopes import is_admin, teacher_can_access_subject_in_class

from .models import AttendanceRecord, AttendanceSession, AuditEvent

User = get_user_model()


def _ensure_can_mark(user, classroom_id, subject_id):
    if is_admin(user):
        return
    if not teacher_can_access_subject_in_class(user, classroom_id, subject_id):
        raise PermissionDenied("Not assigned to this class/subject.")


def _enrolled_student_ids(classroom):
    return set(
        Enrollment.objects.filter(classroom=classroom, status="ACTIVE").values_list(
            "student_id", flat=True
        )
    )


def create_session_with_records(user, classroom_id, subject_id, date_value, records_data):
    _ensure_can_mark(user, classroom_id, subject_id)
    try:
        classroom = Classroom.objects.select_related("academic_year").get(pk=classroom_id)
    except Classroom.DoesNotExist as exc:
        raise ValidationError({"classroom": "Classroom not found."}) from exc
    from apps.academics.models import Subject

    try:
        subject = Subject.objects.get(pk=subject_id)
    except Subject.DoesNotExist as exc:
        raise ValidationError({"subject": "Subject not found."}) from exc

    enrolled = _enrolled_student_ids(classroom)
    for r in records_data:
        if r["student"] not in enrolled:
            raise ValidationError(
                {"records": f"Student {r['student']} is not actively enrolled in this classroom."}
            )

    try:
        with transaction.atomic():
            session = AttendanceSession(
                classroom=classroom, subject=subject, date=date_value, created_by=user
            )
            session.full_clean()
            session.save()
            records = []
            for r in records_data:
                student = User.objects.filter(pk=r["student"]).first()
                if student is None:
                    raise ValidationError({"records": f"Student {r['student']} not found."})
                rec = AttendanceRecord(
                    session=session,
                    student=student,
                    status=r["status"],
                    marked_by=user,
                    note=r.get("note", ""),
                )
                rec.full_clean(exclude=["marked_by"])
                rec.save()
                records.append(rec)
            AuditEvent.objects.create(
                actor=user,
                action="SESSION_CREATED",
                target_type="AttendanceSession",
                target_id=str(session.id),
                metadata={
                    "classroom": classroom_id,
                    "subject": subject_id,
                    "date": str(date_value),
                    "count": len(records),
                },
            )
            return session
    except IntegrityError as exc:
        # duplicate session (classroom/subject/date) or duplicate record
        raise ValidationError(
            {"detail": "Duplicate attendance session for this class/subject/date."}
        ) from exc
    except DjangoValidationError as exc:
        # unique constraint surfaced via full_clean
        if "already exists" in str(exc).lower() or "unique" in str(exc).lower():
            raise ValidationError(
                {"detail": "Duplicate attendance session for this class/subject/date."}
            ) from exc
        raise ValidationError(
            exc.message_dict if hasattr(exc, "message_dict") else str(exc)
        ) from exc


def submit_session(user, session):
    _ensure_can_mark(user, session.classroom_id, session.subject_id)
    if session.status != "DRAFT":
        raise ValidationError({"detail": f"Only DRAFT sessions can be submitted (now {session.status})."})
    if session.records.count() == 0:
        raise ValidationError({"detail": "Cannot submit a session with no records."})
    session.status = "SUBMITTED"
    session.save(update_fields=["status", "updated_at"])
    AuditEvent.objects.create(
        actor=user,
        action="SESSION_SUBMITTED",
        target_type="AttendanceSession",
        target_id=str(session.id),
        metadata={"count": session.records.count()},
    )
    return session


def correct_session(user, session, reason, records_data):
    if not reason or len(reason.strip()) < 5:
        raise ValidationError({"reason": "Correction reason (min 5 chars) is required."})
    # Policy: DRAFT -> assigned teacher or admin; SUBMITTED/LOCKED -> admin only.
    if session.status == "DRAFT":
        _ensure_can_mark(user, session.classroom_id, session.subject_id)
    else:
        if not is_admin(user):
            raise PermissionDenied("Only an administrator can correct a submitted session.")
    enrolled = _enrolled_student_ids(session.classroom)
    before = {r.student_id: r.status for r in session.records.all()}
    with transaction.atomic():
        for r in records_data:
            if r["student"] not in enrolled:
                raise ValidationError(
                    {"records": f"Student {r['student']} is not actively enrolled."}
                )
            student = User.objects.filter(pk=r["student"]).first()
            if student is None:
                raise ValidationError({"records": f"Student {r['student']} not found."})
            rec, _ = AttendanceRecord.objects.update_or_create(
                session=session,
                student=student,
                defaults={"status": r["status"], "marked_by": user, "note": r.get("note", "")},
            )
        after = {r.student_id: r.status for r in session.records.all()}
        AuditEvent.objects.create(
            actor=user,
            action="SESSION_CORRECTED",
            target_type="AttendanceSession",
            target_id=str(session.id),
            metadata={"reason": reason.strip(), "before": before, "after": after},
        )
    session.refresh_from_db()
    return session
