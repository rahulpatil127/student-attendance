"""Phase 1 acceptance: session auth, CSRF, login/logout, bcrypt hashing."""

from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class AuthFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123",
            role="ADMIN",
        )

    def test_password_is_hashed_with_supported_hasher(self):
        user = User.objects.get(username="admin1")
        self.assertNotEqual(user.password, "StrongPass123")
        self.assertTrue(user.check_password("StrongPass123"))
        # bcrypt or pbkdf2 prefix accepted; never plaintext
        self.assertTrue(user.password.startswith(("bcrypt", "pbkdf2")))

    def test_csrf_bootstrap_sets_cookie(self):
        resp = self.client.get("/api/v1/auth/csrf/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("csrftoken", resp.cookies)

    def test_login_logout_me_flow(self):
        # me before login -> forbidden
        resp = self.client.get("/api/v1/auth/me/")
        self.assertIn(resp.status_code, (401, 403))

        # invalid login -> generic 400
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": "admin1", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

        # valid login (enforce_csrf_checks False in test client is fine)
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["username"], "admin1")

        # me after login
        resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["role"], "ADMIN")

        # logout
        resp = self.client.post("/api/v1/auth/logout/")
        self.assertEqual(resp.status_code, 200)

        # me after logout -> denied
        resp = self.client.get("/api/v1/auth/me/")
        self.assertIn(resp.status_code, (401, 403))

    def test_inactive_user_denied(self):
        self.user.is_active = False
        self.user.save()
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_health_endpoint(self):
        resp = self.client.get("/api/v1/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})

    def test_admin_users_requires_admin(self):
        teacher = User.objects.create_user(
            username="t1", email="t1@example.com", password="StrongPass123", role="TEACHER"
        )
        self.client.force_login(teacher)
        resp = self.client.get("/api/v1/admin/users/")
        self.assertEqual(resp.status_code, 403)

    def test_create_superuser_defaults_to_admin_role(self):
        admin = User.objects.create_superuser(
            username="root", email="root@ex.com", password="StrongPass123"
        )
        self.assertEqual(admin.role, "ADMIN")
        self.assertTrue(admin.is_superuser)

    def test_me_exposes_superuser_flag(self):
        self.client.force_login(self.user)
        resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("is_superuser", resp.json())

    def test_admin_users_filtering(self):
        User.objects.create_user(
            username="t9", email="t9@ex.com", password="StrongPass123", role="TEACHER"
        )
        User.objects.create_user(
            username="s9", email="s9@ex.com", password="StrongPass123", role="STUDENT"
        )
        self.client.force_login(self.user)
        r = self.client.get("/api/v1/admin/users/?role=TEACHER")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(all(u["role"] == "TEACHER" for u in r.json()["results"]))
        r = self.client.get("/api/v1/admin/users/?search=s9")
        self.assertEqual(r.json()["count"], 1)
        self.assertEqual(r.json()["results"][0]["username"], "s9")

    def test_admin_users_page_size(self):
        for i in range(25):
            User.objects.create_user(
                username=f"zz{i:02d}", email=f"zz{i:02d}@ex.com",
                password="StrongPass123", role="STUDENT",
            )
        self.client.force_login(self.user)
        r = self.client.get("/api/v1/admin/users/")
        self.assertEqual(len(r.json()["results"]), 20)  # default page
        r = self.client.get("/api/v1/admin/users/?page_size=200")
        self.assertEqual(r.json()["count"], 26)
        self.assertEqual(len(r.json()["results"]), 26)

    def test_admin_users_expose_student_class(self):
        from datetime import date

        from apps.academics.models import (
            AcademicYear,
            Classroom,
            Enrollment,
        )

        year = AcademicYear.objects.create(
            name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30)
        )
        room = Classroom.objects.create(name="Grade 10", section="A", academic_year=year)
        stu = User.objects.create_user(
            username="cx", email="cx@ex.com", password="StrongPass123", role="STUDENT"
        )
        Enrollment.objects.create(student=stu, classroom=room, academic_year=year)
        self.client.force_login(self.user)
        r = self.client.get("/api/v1/admin/users/?search=cx")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Grade 10-A", r.json()["results"][0]["classes"])

    def test_admin_create_user_with_classroom(self):
        from datetime import date

        from apps.academics.models import AcademicYear, Classroom, Enrollment

        year = AcademicYear.objects.create(
            name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30)
        )
        room = Classroom.objects.create(name="Class 9", section="A", academic_year=year)
        self.client.force_login(self.user)
        r = self.client.post(
            "/api/v1/admin/users/",
            {
                "username": "withclass",
                "email": "withclass@ex.com",
                "password": "StrongPass123",
                "role": "STUDENT",
                "classroom": room.id,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        u = User.objects.get(username="withclass")
        self.assertTrue(
            Enrollment.objects.filter(student=u, classroom=room, status="ACTIVE").exists()
        )

    def test_admin_users_filter_by_class(self):
        from datetime import date

        from apps.academics.models import AcademicYear, Classroom, Enrollment

        year = AcademicYear.objects.create(
            name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30)
        )
        c1 = Classroom.objects.create(name="Class 9", section="A", academic_year=year)
        c2 = Classroom.objects.create(name="Class 10", section="A", academic_year=year)
        s1 = User.objects.create_user(
            username="cf1", email="cf1@ex.com", password="StrongPass123", role="STUDENT"
        )
        s2 = User.objects.create_user(
            username="cf2", email="cf2@ex.com", password="StrongPass123", role="STUDENT"
        )
        Enrollment.objects.create(student=s1, classroom=c1, academic_year=year)
        Enrollment.objects.create(student=s2, classroom=c2, academic_year=year)
        self.client.force_login(self.user)
        r = self.client.get(f"/api/v1/admin/users/?role=STUDENT&classroom={c1.id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([u["username"] for u in r.json()["results"]], ["cf1"])

    def test_bulk_user_upload_csv(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.academics.models import StudentProfile

        self.client.force_login(self.user)
        csv_text = (
            "username,firstname,lastname,email\n"
            "bulk1,Bulk,One,bulk1@ex.com\n"
            "bulk2,Bulk,Two,bulk2@ex.com\n"
            "badrow,,,bad@ex.com\n"
        )
        f = SimpleUploadedFile("students.csv", csv_text.encode(), content_type="text/csv")
        r = self.client.post("/api/v1/admin/users/bulk/", {"file": f})
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        self.assertEqual(len(data["created"]), 2)
        self.assertEqual(len(data["errors"]), 1)
        u = User.objects.get(username="bulk1")
        self.assertTrue(u.check_password("Bulk"))
        self.assertTrue(StudentProfile.objects.filter(user=u).exists())
        # duplicate username auto-resolves with a suffix
        f_dup = SimpleUploadedFile(
            "dup.csv", b"username,firstname,email\nbulk1,BulkX,bx@ex.com\n", content_type="text/csv"
        )
        r = self.client.post("/api/v1/admin/users/bulk/", {"file": f_dup})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["created"][0]["username"], "bulk12")
        # teacher cannot upload
        t = User.objects.create_user(
            username="tu", email="tu@ex.com", password="StrongPass123", role="TEACHER"
        )
        self.client.force_login(t)
        f2 = SimpleUploadedFile("s.csv", b"username,firstname,email\nx,X,x@ex.com\n", content_type="text/csv")
        r = self.client.post("/api/v1/admin/users/bulk/", {"file": f2})
        self.assertEqual(r.status_code, 403)
