"""Scope helpers: teacher assignment checks used by academics/attendance/reporting."""

from .models import TeachingAssignment


def is_admin(user):
    return bool(user and user.is_authenticated and (user.role == "ADMIN" or user.is_superuser))


def teacher_classroom_ids(user):
    """Active classroom ids assigned to teacher."""
    if not user or not user.is_authenticated:
        return set()
    return set(
        TeachingAssignment.objects.filter(teacher=user, is_active=True).values_list(
            "classroom_id", flat=True
        )
    )


def teacher_can_access_classroom(user, classroom_id):
    if is_admin(user):
        return True
    if not user or not user.is_authenticated:
        return False
    if user.role != "TEACHER":
        return False
    return TeachingAssignment.objects.filter(
        teacher=user, classroom_id=classroom_id, is_active=True
    ).exists()


def teacher_can_access_subject_in_class(user, classroom_id, subject_id):
    """Teacher must be assigned to that exact classroom+subject (or admin)."""
    if is_admin(user):
        return True
    if not user or not user.is_authenticated or user.role != "TEACHER":
        return False
    return TeachingAssignment.objects.filter(
        teacher=user, classroom_id=classroom_id, subject_id=subject_id, is_active=True
    ).exists()


def is_class_teacher_of(user, classroom_id):
    """True when the user is the designated boss (class teacher) of the class."""
    if not user or not user.is_authenticated:
        return False
    from .models import Classroom

    return Classroom.objects.filter(pk=classroom_id, class_teacher=user).exists()


def teacher_can_view_classroom(user, classroom_id):
    """Any teacher visibility into a class: assigned subject, class teacher, or admin."""
    if is_admin(user):
        return True
    if not user or not user.is_authenticated or user.role != "TEACHER":
        return False
    if teacher_can_access_classroom(user, classroom_id):
        return True
    return is_class_teacher_of(user, classroom_id)
