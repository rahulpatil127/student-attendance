"""Phase 3 API tests: happy paths, permissions, edge cases, rollback, reports."""

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
from apps.attendance.models import AttendanceSession, AuditEvent

User = get_user_model()


def seed(admin=None):
    if admin is None:
        admin = User.objects.create_user(
            username="admin", email="admin@ex.com", password="StrongPass123", role="ADMIN"
        )
    year = AcademicYear.objects.create(
        name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30), is_active=True
    )
    c1 = Classroom.objects.create(name="Grade 10", section="A", academic_year=year)
    c2 = Classroom.objects.create(name="Grade 10", section="B", academic_year=year)
    math = Subject.objects.create(name="Maths", code="MATH-10")
    eng = Subject.objects.create(name="English", code="ENG-10")
    t1 = User.objects.create_user(username="t1", email="t1@ex.com", password="StrongPass123", role="TEACHER")
    t2 = User.objects.create_user(username="t2", email="t2@ex.com", password="StrongPass123", role="TEACHER")
    TeacherProfile.objects.create(user=t1, employee_number="T001")
    TeacherProfile.objects.create(user=t2, employee_number="T002")
    s1 = User.objects.create_user(username="s1", email="s1@ex.com", password="StrongPass123", role="STUDENT")
    s2 = User.objects.create_user(username="s2", email="s2@ex.com", password="StrongPass123", role="STUDENT")
    StudentProfile.objects.create(user=s1, student_number="S001")
    StudentProfile.objects.create(user=s2, student_number="S002")
    TeachingAssignment.objects.create(teacher=t1, classroom=c1, subject=math, academic_year=year)
    Enrollment.objects.create(student=s1, classroom=c1, academic_year=year)
    Enrollment.objects.create(student=s2, classroom=c1, academic_year=year)
    return {"admin": admin, "year": year, "c1": c1, "c2": c2, "math": math, "eng": eng, "t1": t1, "t2": t2, "s1": s1, "s2": s2}


class AcademicsApiTests(TestCase):
    def setUp(self):
        self.d = seed()
        self.client = APIClient()

    def test_admin_crud_year_class_subject(self):
        self.client.force_login(self.d["admin"])
        r = self.client.post(
            "/api/v1/academic-years/",
            {"name": "2026-27", "start_date": "2026-06-01", "end_date": "2027-04-30", "is_active": False},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        r = self.client.get("/api/v1/academic-years/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("results", r.json())

    def test_non_admin_cannot_create_academics(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post("/api/v1/subjects/", {"name": "X", "code": "X-1"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_assignments_filter_and_edit(self):
        self.client.force_login(self.d["admin"])
        a = TeachingAssignment.objects.create(
            teacher=self.d["t2"], classroom=self.d["c2"],
            subject=self.d["eng"], academic_year=self.d["year"],
        )
        r = self.client.get(f"/api/v1/assignments/?subject={self.d['eng'].id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["id"] for x in r.json()["results"]], [a.id])
        r = self.client.get(f"/api/v1/assignments/?classroom={self.d['c1'].id}")
        self.assertEqual(r.json()["count"], 1)
        r = self.client.get(f"/api/v1/assignments/?teacher={self.d['t1'].id}")
        self.assertEqual(r.json()["count"], 1)
        # edit class/subject/active
        r = self.client.patch(
            f"/api/v1/assignments/{a.id}/",
            {"classroom": self.d["c1"].id, "subject": self.d["math"].id, "is_active": False},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        a.refresh_from_db()
        self.assertEqual(a.classroom_id, self.d["c1"].id)
        self.assertFalse(a.is_active)

    def test_teacher_classes_scoped(self):
        self.client.force_login(self.d["t1"])
        r = self.client.get("/api/v1/teacher/classes/")
        self.assertEqual(r.status_code, 200)
        ids = [c["id"] for c in r.json()]
        self.assertIn(self.d["c1"].id, ids)
        self.assertNotIn(self.d["c2"].id, ids)

    def test_roster_assigned_only(self):
        self.client.force_login(self.d["t2"])  # not assigned to c1
        r = self.client.get(f"/api/v1/classes/{self.d['c1'].id}/students/")
        self.assertEqual(r.status_code, 403)
        self.client.force_login(self.d["t1"])
        r = self.client.get(f"/api/v1/classes/{self.d['c1'].id}/students/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["students"]), 2)

    def test_student_roster_hidden(self):
        self.client.force_login(self.d["s1"])
        r = self.client.get(f"/api/v1/classes/{self.d['c1'].id}/students/")
        self.assertEqual(r.status_code, 404)

    def test_second_active_enrollment_rejected_with_400(self):
        # s1 is already actively enrolled in c1; enrolling in c2 must 400, not 500.
        self.client.force_login(self.d["admin"])
        r = self.client.post(
            "/api/v1/enrollments/",
            {
                "student": self.d["s1"].id,
                "classroom": self.d["c2"].id,
                "academic_year": self.d["year"].id,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 400, r.content)

    def test_protected_delete_returns_clean_400(self):
        # c1 has enrollments; deleting it must 400 JSON, never an HTML 500.
        self.client.force_login(self.d["admin"])
        r = self.client.delete(f"/api/v1/classrooms/{self.d['c1'].id}/")
        self.assertEqual(r.status_code, 400)
        self.assertIn("protected", r.json()["detail"].lower())

    def test_single_enroll_reactivates_inactive(self):
        from apps.academics.models import Enrollment

        self.client.force_login(self.d["admin"])
        Enrollment.objects.filter(student=self.d["s1"]).update(status="INACTIVE")
        r = self.client.post(
            "/api/v1/enrollments/",
            {
                "student": self.d["s1"].id,
                "classroom": self.d["c1"].id,
                "academic_year": self.d["year"].id,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(
            Enrollment.objects.get(student=self.d["s1"], classroom=self.d["c1"]).status,
            "ACTIVE",
        )


class AttendanceApiTests(TestCase):
    def setUp(self):
        self.d = seed()
        self.client = APIClient()

    def _session_payload(self, bad_student=None):
        s1, s2 = self.d["s1"], self.d["s2"]
        s2_id = bad_student or s2.id
        return {
            "classroom": self.d["c1"].id,
            "subject": self.d["math"].id,
            "date": "2025-08-01",
            "records": [
                {"student": s1.id, "status": "PRESENT"},
                {"student": s2_id, "status": "ABSENT"},
            ],
        }

    def test_teacher_create_submit_flow(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sid = r.json()["id"]
        self.assertEqual(r.json()["counts"]["TOTAL"], 2)
        r = self.client.post(f"/api/v1/attendance/sessions/{sid}/submit/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "SUBMITTED")
        self.assertTrue(AuditEvent.objects.filter(target_id=str(sid)).exists())

    def test_duplicate_session_blocked(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.assertEqual(r.status_code, 201)
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.assertEqual(r.status_code, 400)

    def test_unassigned_teacher_denied(self):
        self.client.force_login(self.d["t2"])
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.assertEqual(r.status_code, 403)

    def test_student_cannot_create(self):
        self.client.force_login(self.d["s1"])
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.assertIn(r.status_code, (403, 404))

    def test_transaction_rollback_on_bad_student(self):
        self.client.force_login(self.d["t1"])
        before = AttendanceSession.objects.count()
        r = self.client.post(
            "/api/v1/attendance/sessions/", self._session_payload(bad_student=99999), format="json"
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(AttendanceSession.objects.count(), before)

    def test_admin_correction_requires_reason_and_audits(self):
        self.client.force_login(self.d["t1"])
        r = self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        sid = r.json()["id"]
        self.client.post(f"/api/v1/attendance/sessions/{sid}/submit/", {}, format="json")
        # teacher cannot correct submitted
        r = self.client.post(
            f"/api/v1/attendance/sessions/{sid}/corrections/",
            {"reason": "fix it", "records": [{"student": self.d["s1"].id, "status": "LATE"}]},
            format="json",
        )
        self.assertEqual(r.status_code, 403)
        # admin without reason -> 400
        self.client.force_login(self.d["admin"])
        r = self.client.post(
            f"/api/v1/attendance/sessions/{sid}/corrections/",
            {"reason": "x", "records": [{"student": self.d["s1"].id, "status": "LATE"}]},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        # admin with reason -> ok + audit
        r = self.client.post(
            f"/api/v1/attendance/sessions/{sid}/corrections/",
            {"reason": "verified late arrival", "records": [{"student": self.d["s1"].id, "status": "LATE"}]},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(
            AuditEvent.objects.filter(target_id=str(sid), action="SESSION_CORRECTED").exists()
        )

    def test_student_own_attendance_only(self):
        self.client.force_login(self.d["t1"])
        self.client.post("/api/v1/attendance/sessions/", self._session_payload(), format="json")
        self.client.force_login(self.d["s1"])
        r = self.client.get("/api/v1/students/me/attendance/")
        self.assertEqual(r.status_code, 200)
        for rec in r.json().get("results", r.json() if isinstance(r.json(), list) else []):
            self.assertEqual(rec["student"], self.d["s1"].id)


class ReportingApiTests(TestCase):
    def setUp(self):
        self.d = seed()
        self.client = APIClient()
        self.client.force_login(self.d["t1"])
        payload = {
            "classroom": self.d["c1"].id,
            "subject": self.d["math"].id,
            "date": "2025-08-01",
            "records": [
                {"student": self.d["s1"].id, "status": "PRESENT"},
                {"student": self.d["s2"].id, "status": "ABSENT"},
            ],
        }
        r = self.client.post("/api/v1/attendance/sessions/", payload, format="json")
        sid = r.json()["id"]
        self.client.post(f"/api/v1/attendance/sessions/{sid}/submit/", {}, format="json")

    def test_summary_admin_and_teacher_scope(self):
        self.client.force_login(self.d["admin"])
        r = self.client.get("/api/v1/reports/attendance/summary/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 2)
        # teacher unassigned classroom -> 403
        self.client.force_login(self.d["t2"])
        r = self.client.get(f"/api/v1/reports/attendance/summary/?classroom={self.d['c1'].id}")
        self.assertEqual(r.status_code, 403)
        # student self only
        self.client.force_login(self.d["s1"])
        r = self.client.get("/api/v1/reports/attendance/summary/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)

    def test_summary_classroom_current_members_vs_history(self):
        from apps.academics.models import Enrollment

        self.client.force_login(self.d["admin"])
        cid = self.d["c1"].id
        # both s1/s2 have records in c1; move s2 out
        Enrollment.objects.filter(student=self.d["s2"]).update(status="INACTIVE")
        r = self.client.get(f"/api/v1/reports/attendance/summary/?classroom={cid}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["username"] for x in r.json()["results"]], ["s1"])
        # with a date range, history owners reappear
        r = self.client.get(
            f"/api/v1/reports/attendance/summary/?classroom={cid}&date_from=2025-01-01"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 2)

    def test_export_csv_safe(self):
        self.client.force_login(self.d["admin"])
        r = self.client.get("/api/v1/reports/attendance/export.csv")
        self.assertEqual(r.status_code, 200)
        self.assertIn("text/csv", r["Content-Type"])
        content = r.content.decode()
        self.assertIn("student_id,username,student_number,subject,present", content)
        self.assertIn("s1", content)
