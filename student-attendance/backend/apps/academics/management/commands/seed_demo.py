"""Seed non-sensitive demo data for local testing.

Two demo classes: Class 9 and Class 10 (10 students each), 5 teachers,
5 subjects. Idempotent for accounts/setup (get_or_create throughout);
attendance for the demo classrooms is regenerated so rosters get full history.
Demo passwords: Admin12345 / Teach12345 / Study12345 — local use only,
never use these in production. Change them after seeding if needed.

Usage:
    python manage.py seed_demo
"""

import random
from contextlib import suppress
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError as APIValidationError

from apps.academics.models import (
    AcademicYear,
    Classroom,
    Enrollment,
    StudentProfile,
    Subject,
    TeacherProfile,
    TeachingAssignment,
)
from apps.attendance.models import AttendanceSession
from apps.attendance.services import create_session_with_records, submit_session

User = get_user_model()
random.seed(42)

TEACHERS = [
    ("anita", "anita@demo.school", "Anita", "Sharma", "T001"),
    ("ravi", "ravi@demo.school", "Ravi", "Verma", "T002"),
    ("priya", "priya@demo.school", "Priya", "Nair", "T003"),
    ("vikram", "vikram@demo.school", "Vikram", "Rao", "T004"),
    ("neha", "neha@demo.school", "Neha", "Gupta", "T005"),
]

# (username, email, first, last, student_no, class_key)
STUDENTS = [
    ("sara", "sara@demo.school", "Sara", "Khan", "S001", "10"),
    ("arjun", "arjun@demo.school", "Arjun", "Mehta", "S002", "10"),
    ("meera", "meera@demo.school", "Meera", "Iyer", "S003", "10"),
    ("kabir", "kabir@demo.school", "Kabir", "Singh", "S004", "10"),
    ("zara", "zara@demo.school", "Zara", "Ali", "S005", "10"),
    ("ira", "ira@demo.school", "Ira", "Chopra", "S016", "10"),
    ("arnav", "arnav@demo.school", "Arnav", "Malhotra", "S017", "10"),
    ("myra", "myra@demo.school", "Myra", "Kapoor", "S018", "10"),
    ("reyansh", "reyansh@demo.school", "Reyansh", "Thakur", "S019", "10"),
    ("aisha", "aisha@demo.school", "Aisha", "Raza", "S020", "10"),
    ("aarav", "aarav@demo.school", "Aarav", "Patel", "S006", "9"),
    ("diya", "diya@demo.school", "Diya", "Reddy", "S007", "9"),
    ("ishaan", "ishaan@demo.school", "Ishaan", "Joshi", "S008", "9"),
    ("ananya", "ananya@demo.school", "Ananya", "Das", "S009", "9"),
    ("vivaan", "vivaan@demo.school", "Vivaan", "Kumar", "S010", "9"),
    ("aditi", "aditi@demo.school", "Aditi", "Menon", "S011", "9"),
    ("rohan", "rohan@demo.school", "Rohan", "Bose", "S012", "9"),
    ("aditya", "aditya@demo.school", "Aditya", "Shah", "S013", "9"),
    ("navya", "navya@demo.school", "Navya", "Pillai", "S014", "9"),
    ("krishna", "krishna@demo.school", "Krishna", "Yadav", "S015", "9"),
]

SUBJECTS = [
    ("Mathematics", "MATH-10"),
    ("English", "ENG-10"),
    ("Science", "SCI-10"),
    ("Hindi", "HIN-10"),
    ("Social Studies", "SST-10"),
]

# (teacher, class_key, subject_code)
ASSIGNMENTS = [
    ("anita", "10", "MATH-10"),
    ("anita", "10", "SCI-10"),
    ("ravi", "10", "ENG-10"),
    ("ravi", "9", "MATH-10"),
    ("priya", "9", "ENG-10"),
    ("priya", "9", "SCI-10"),
    ("vikram", "10", "HIN-10"),
    ("vikram", "9", "HIN-10"),
    ("neha", "10", "SST-10"),
    ("neha", "9", "SST-10"),
]


def get_or_create_user(username, email, first, last, role, password):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": email, "first_name": first, "last_name": last, "role": role},
    )
    if created:
        user.set_password(password)
        user.save()
    return user


def mixed_status(i):
    roll = random.random()
    if roll < 0.75:
        return "PRESENT"
    if roll < 0.85:
        return "LATE"
    if roll < 0.93 or i == 0:
        return "ABSENT"
    return "EXCUSED"


class Command(BaseCommand):
    help = "Seed demo data for local testing (idempotent)."

    def handle(self, *args, **options):
        with transaction.atomic():
            year, _ = AcademicYear.objects.get_or_create(
                name="2025-26",
                defaults={"start_date": date(2025, 6, 1), "end_date": date(2026, 4, 30), "is_active": True},
            )

            admin = get_or_create_user("admin", "admin@demo.school", "Admin", "", "ADMIN", "Admin12345")
            admin.is_staff = True
            admin.is_superuser = True
            admin.role = "ADMIN"
            admin.save()

            # Retire the previous demo layout (Grade 10 sections) if present.
            for old in Classroom.objects.filter(academic_year=year, name__startswith="Grade 10"):
                AttendanceSession.objects.filter(classroom=old).delete()
                Enrollment.objects.filter(classroom=old).delete()
                TeachingAssignment.objects.filter(classroom=old).delete()
                old.delete()

            subjects = {}
            for name, code in SUBJECTS:
                s, _ = Subject.objects.get_or_create(code=code, defaults={"name": name})
                subjects[code] = s

            rooms = {}
            for key in ("9", "10"):
                c, _ = Classroom.objects.get_or_create(
                    academic_year=year, name=f"Class {key}", section="A"
                )
                rooms[key] = c

            teachers = {}
            for username, email, first, last, emp in TEACHERS:
                t = get_or_create_user(username, email, first, last, "TEACHER", username)
                TeacherProfile.objects.get_or_create(user=t, defaults={"employee_number": emp})
                teachers[username] = t

            students = {}
            for username, email, first, last, number, key in STUDENTS:
                s = get_or_create_user(username, email, first, last, "STUDENT", username)
                StudentProfile.objects.get_or_create(user=s, defaults={"student_number": number})
                Enrollment.objects.get_or_create(
                    student=s, classroom=rooms[key], academic_year=year,
                    defaults={"status": "ACTIVE"},
                )
                students[username] = s

            for tname, key, code in ASSIGNMENTS:
                TeachingAssignment.objects.get_or_create(
                    teacher=teachers[tname],
                    classroom=rooms[key],
                    subject=subjects[code],
                    academic_year=year,
                )

            # Regenerate demo attendance so the full rosters get history.
            AttendanceSession.objects.filter(classroom__in=rooms.values()).delete()
            roster_10 = [u for u in students.values() if u.enrollments.filter(classroom=rooms["10"]).exists()]
            roster_9 = [u for u in students.values() if u.enrollments.filter(classroom=rooms["9"]).exists()]

            def past_weekdays(n, offset_days):
                days, day = [], date.today() - timedelta(days=offset_days)
                while len(days) < n:
                    if day.weekday() < 5:
                        days.append(day)
                    day -= timedelta(days=1)
                return sorted(days)

            for day in past_weekdays(8, 11):
                records = [{"student": s.id, "status": mixed_status(i)} for i, s in enumerate(roster_10)]
                with suppress(ValidationError, IntegrityError, APIValidationError):
                    session = create_session_with_records(
                        teachers["anita"], rooms["10"].id, subjects["MATH-10"].id, day, records
                    )
                    submit_session(teachers["anita"], session)

            for day in past_weekdays(4, 6):
                records = [{"student": s.id, "status": mixed_status(i)} for i, s in enumerate(roster_9)]
                with suppress(ValidationError, IntegrityError, APIValidationError):
                    session = create_session_with_records(
                        teachers["ravi"], rooms["9"].id, subjects["MATH-10"].id, day, records
                    )
                    submit_session(teachers["ravi"], session)

            # One DRAFT session (today, English, Class 10) for the teacher to submit via UI.
            with suppress(ValidationError, IntegrityError, APIValidationError):
                create_session_with_records(
                    teachers["ravi"],
                    rooms["10"].id,
                    subjects["ENG-10"].id,
                    date.today(),
                    [
                        {"student": s.id, "status": "LATE" if i == 2 else "PRESENT"}
                        for i, s in enumerate(roster_10)
                    ],
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready: admin/<unchanged>, "
                "teachers + students use their username as password "
                "(Class 9 + Class 10)"
            )
        )
