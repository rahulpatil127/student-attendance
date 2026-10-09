"""Phase 5 backend additions: teacher assignments, own enrollments, audit, password change."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.academics.models import (
    AcademicYear,
    Classroom,
    Enrollment,
    StudentProfile,
    Subject,
    TeacherProfile,
    TeachingAssignment,
)

User = get_user_model()


def seed():
    admin = User.objects.create_user(
        username="admin", email="admin@ex.com", password="StrongPass123", role="ADMIN"
    )
    year = AcademicYear.objects.create(
        name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30), is_active=True
    )
    c1 = Classroom.objects.create(name="Grade 10", section="A", academic_year=year)
    math = Subject.objects.create(name="Maths", code="MATH-10")
    t1 = User.objects.create_user(username="t1", email="t1@ex.com", password="StrongPass123", role="TEACHER")
    TeacherProfile.objects.create(user=t1, employee_number="T001")
    s1 = User.objects.create_user(username="s1", email="s1@ex.com", password="StrongPass123", role="STUDENT")
    StudentProfile.objects.create(user=s1, student_number="S001")
    TeachingAssignment.objects.create(teacher=t1, classroom=c1, subject=math, academic_year=year)
    Enrollment.objects.create(student=s1, classroom=c1, academic_year=year)
    return {"admin": admin, "year": year, "c1": c1, "math": math, "t1": t1, "s1": s1}


class Phase5ApiTests(TestCase):
    def setUp(self):
        self.d = seed()
        self.client = APIClient()

    def test_teacher_assignments_self(self):
        self.client.force_login(self.d["t1"])
        r = self.client.get("/api/v1/teacher/assignments/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)
        self.client.force_login(self.d["s1"])
        r = self.client.get("/api/v1/teacher/assignments/")
        self.assertEqual(r.status_code, 403)

    def test_own_enrollments(self):
        self.client.force_login(self.d["s1"])
        r = self.client.get("/api/v1/students/me/enrollments/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_session_audit_scoped(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post(
            "/api/v1/attendance/sessions/",
            {
                "classroom": self.d["c1"].id,
                "subject": self.d["math"].id,
                "date": "2025-08-01",
                "records": [{"student": self.d["s1"].id, "status": "PRESENT"}],
            },
            format="json",
        )
        sid = r.json()["id"]
        r = self.client.get(f"/api/v1/attendance/sessions/{sid}/audit/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(len(r.json()["events"]) >= 1)

    def test_record_carries_session_context(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post(
            "/api/v1/attendance/sessions/",
            {
                "classroom": self.d["c1"].id,
                "subject": self.d["math"].id,
                "date": "2025-08-02",
                "records": [{"student": self.d["s1"].id, "status": "PRESENT"}],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        rec = r.json()["records"][0]
        self.assertEqual(rec["subject_name"], "Maths")
        self.assertEqual(rec["session_date"], "2025-08-02")

    def test_bulk_enroll(self):
        s2 = User.objects.create_user(
            username="s2", email="s2@ex.com", password="StrongPass123", role="STUDENT"
        )
        StudentProfile.objects.create(user=s2, student_number="S002")
        self.client.force_login(self.d["admin"])
        r = self.client.post(
            "/api/v1/enrollments/bulk/",
            {
                "classroom": self.d["c1"].id,
                "academic_year": self.d["year"].id,
                "student_ids": [self.d["s1"].id, s2.id],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["enrolled"], 1)  # s1 already enrolled
        self.assertEqual(len(r.json()["skipped"]), 1)
        # non-admin denied
        self.client.force_login(self.d["t1"])
        r = self.client.post(
            "/api/v1/enrollments/bulk/",
            {
                "classroom": self.d["c1"].id,
                "academic_year": self.d["year"].id,
                "student_ids": [s2.id],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 403)

    def test_bulk_enroll_reactivates_inactive(self):
        from apps.academics.models import Enrollment

        self.client.force_login(self.d["admin"])
        Enrollment.objects.filter(student=self.d["s1"]).update(status="INACTIVE")
        r = self.client.post(
            "/api/v1/enrollments/bulk/",
            {
                "classroom": self.d["c1"].id,
                "academic_year": self.d["year"].id,
                "student_ids": [self.d["s1"].id],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["enrolled"], 1)
        self.assertEqual(
            Enrollment.objects.get(student=self.d["s1"], classroom=self.d["c1"]).status,
            "ACTIVE",
        )

    def test_promote_moves_class(self):
        from apps.academics.models import Classroom, Enrollment

        self.client.force_login(self.d["admin"])
        year2 = self.d["year"]
        c9 = Classroom.objects.create(name="Class 9", section="A", academic_year=year2)
        r = self.client.post(
            "/api/v1/enrollments/promote/",
            {"from_classroom": self.d["c1"].id, "to_classroom": c9.id, "academic_year": year2.id},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["moved"], 1)
        self.assertEqual(
            Enrollment.objects.get(student=self.d["s1"], classroom=self.d["c1"]).status,
            "INACTIVE",
        )
        self.assertEqual(
            Enrollment.objects.get(student=self.d["s1"], classroom=c9).status, "ACTIVE"
        )
        # same class rejected
        r = self.client.post(
            "/api/v1/enrollments/promote/",
            {"from_classroom": c9.id, "to_classroom": c9.id, "academic_year": year2.id},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_clear_inactive(self):
        from apps.academics.models import Enrollment

        self.client.force_login(self.d["admin"])
        enr = Enrollment.objects.get(student=self.d["s1"])
        enr.status = "INACTIVE"
        enr.save()
        # classroom required
        r = self.client.delete("/api/v1/enrollments/clear-inactive/")
        self.assertEqual(r.status_code, 400)
        r = self.client.delete(
            f"/api/v1/enrollments/clear-inactive/?classroom={self.d['c1'].id}"
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["deleted"], 1)
        self.assertFalse(Enrollment.objects.filter(pk=enr.pk).exists())

    def test_enrollment_patch_moves_class(self):
        from apps.academics.models import Classroom, Enrollment

        self.client.force_login(self.d["admin"])
        c9 = Classroom.objects.create(
            name="Class 9", section="A", academic_year=self.d["year"]
        )
        enr = Enrollment.objects.get(student=self.d["s1"])
        r = self.client.patch(
            f"/api/v1/enrollments/{enr.id}/",
            {"classroom": c9.id},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Enrollment.objects.get(pk=enr.pk).classroom_id, c9.id)

    def test_password_change(self):
        self.client.force_login(self.d["s1"])
        r = self.client.post(
            "/api/v1/auth/password/change/",
            {"old_password": "StrongPass123", "new_password": "NewStrong456"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.client.logout()
        r = self.client.post(
            "/api/v1/auth/login/",
            {"username": "s1", "password": "NewStrong456"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)

    def test_complaints_flow(self):        # student submits
        self.client.force_login(self.d["s1"])
        r = self.client.post(
            "/api/v1/complaints/",
            {"title": "Leaking tap", "category": "FACILITY", "body": "Tap leaks in washroom."},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        cid = r.json()["id"]
        # student sees own only
        r = self.client.get("/api/v1/complaints/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)
        # student cannot update own complaint
        r = self.client.patch(
            f"/api/v1/complaints/{cid}/", {"status": "RESOLVED"}, format="json"
        )
        self.assertEqual(r.status_code, 403)
        # teacher cannot view
        self.client.force_login(self.d["t1"])
        r = self.client.get("/api/v1/complaints/")
        self.assertEqual(r.status_code, 403)
        # admin resolves with reply
        self.client.force_login(self.d["admin"])
        r = self.client.patch(
            f"/api/v1/complaints/{cid}/",
            {"status": "RESOLVED", "admin_reply": "Fixed today."},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["admin_reply"], "Fixed today.")
        # admin cannot change title/body via patch
        r = self.client.patch(
            f"/api/v1/complaints/{cid}/", {"title": "Hacked"}, format="json"
        )
        self.assertEqual(r.status_code, 400)

    def test_profile_numbers_auto_generated(self):
        self.client.force_login(self.d["admin"])
        stu = User.objects.create_user(
            username="noprof", email="noprof@ex.com", password="StrongPass123", role="STUDENT"
        )
        r = self.client.post(
            "/api/v1/student-profiles/", {"user": stu.id}, format="json"
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["student_number"].startswith("S"))
        tea = User.objects.create_user(
            username="noprof2", email="noprof2@ex.com", password="StrongPass123", role="TEACHER"
        )
        r = self.client.post(
            "/api/v1/teacher-profiles/", {"user": tea.id}, format="json"
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["employee_number"].startswith("T"))

    def test_enrollment_creates_missing_profile(self):
        from apps.academics.models import Classroom, StudentProfile

        self.client.force_login(self.d["admin"])
        stu = User.objects.create_user(
            username="manisha", email="manisha@ex.com", password="StrongPass123", role="STUDENT"
        )
        room2 = Classroom.objects.create(
            name="Class 9", section="A", academic_year=self.d["year"]
        )
        r = self.client.post(
            "/api/v1/enrollments/",
            {
                "student": stu.id,
                "classroom": room2.id,
                "academic_year": self.d["year"].id,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(
            StudentProfile.objects.filter(user=stu).exists()
        )
