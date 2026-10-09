"""Phase 2: model constraints, integrity, permission matrix basics."""

from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.academics.models import (
    AcademicYear,
    Classroom,
    Enrollment,
    StudentProfile,
    Subject,
    TeacherProfile,
    TeachingAssignment,
)
from apps.attendance.models import AttendanceRecord, AttendanceSession

User = get_user_model()


def make_year(name="2025-26"):
    return AcademicYear.objects.create(
        name=name, start_date=date(2025, 6, 1), end_date=date(2026, 4, 30), is_active=True
    )


def make_users():
    admin = User.objects.create_user(
        username="adm", email="adm@ex.com", password="StrongPass123", role="ADMIN"
    )
    teacher = User.objects.create_user(
        username="tea", email="tea@ex.com", password="StrongPass123", role="TEACHER"
    )
    student = User.objects.create_user(
        username="stu", email="stu@ex.com", password="StrongPass123", role="STUDENT"
    )
    TeacherProfile.objects.create(user=teacher, employee_number="T001")
    StudentProfile.objects.create(user=student, student_number="S001")
    return admin, teacher, student


class DomainModelTests(TestCase):
    def test_classroom_unique_within_year(self):
        y = make_year()
        Classroom.objects.create(name="Grade 10", section="A", academic_year=y)
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                Classroom.objects.create(name="Grade 10", section="A", academic_year=y)

    def test_year_date_validation(self):
        with self.assertRaises(ValidationError):
            AcademicYear(
                name="bad", start_date=date(2026, 1, 1), end_date=date(2025, 1, 1)
            ).full_clean()

    def test_assignment_enrollment_integrity(self):
        y = make_year()
        _a, t, s = make_users()
        c = Classroom.objects.create(name="Grade 10", section="A", academic_year=y)
        sub = Subject.objects.create(name="Maths", code="MATH-10")
        TeachingAssignment.objects.create(teacher=t, classroom=c, subject=sub, academic_year=y)
        # duplicate assignment blocked
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                TeachingAssignment.objects.create(teacher=t, classroom=c, subject=sub, academic_year=y)
        Enrollment.objects.create(student=s, classroom=c, academic_year=y)
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                Enrollment.objects.create(student=s, classroom=c, academic_year=y)

    def test_session_record_uniqueness(self):
        y = make_year()
        _a, t, s = make_users()
        c = Classroom.objects.create(name="Grade 10", section="A", academic_year=y)
        sub = Subject.objects.create(name="Maths", code="MATH-10")
        sess = AttendanceSession.objects.create(
            classroom=c, subject=sub, date=date(2025, 8, 1), created_by=t
        )
        AttendanceRecord.objects.create(session=sess, student=s, status="PRESENT", marked_by=t)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AttendanceRecord.objects.create(session=sess, student=s, status="ABSENT", marked_by=t)
        # duplicate session blocked
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                AttendanceSession.objects.create(
                    classroom=c, subject=sub, date=date(2025, 8, 1), created_by=t
                )

    def test_profile_role_validation(self):
        _a, t, _s = make_users()
        # teacher user cannot have student profile
        with self.assertRaises(ValidationError):
            StudentProfile(user=t, student_number="S999").full_clean()

    def test_one_active_enrollment_per_student(self):
        y = make_year()
        _a, _t, s = make_users()
        c1 = Classroom.objects.create(name="Class 9", section="A", academic_year=y)
        c2 = Classroom.objects.create(name="Class 10", section="A", academic_year=y)
        Enrollment.objects.create(student=s, classroom=c1, academic_year=y)
        # second ACTIVE enrollment anywhere is blocked…
        with self.assertRaises(ValidationError):
            Enrollment(student=s, classroom=c2, academic_year=y).full_clean()
        # …but allowed once the first is deactivated
        first = Enrollment.objects.get(student=s, classroom=c1)
        first.status = "INACTIVE"
        first.save()
        Enrollment.objects.create(student=s, classroom=c2, academic_year=y)
