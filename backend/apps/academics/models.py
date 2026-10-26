"""Academics domain: years, classes, subjects, profiles, assignments, enrollments."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

User = settings.AUTH_USER_MODEL


class AcademicYear(models.Model):
    name = models.CharField(max_length=64, unique=True, help_text="e.g. 2025-26")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Academic year start_date must be on or before end_date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Classroom(models.Model):
    name = models.CharField(max_length=64, help_text="Class name, e.g. Class 10")
    section = models.CharField(max_length=16, default="A")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="classrooms")
    class_teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_teacher_of",
        help_text="Boss of the class: takes one whole-day attendance daily.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["academic_year", "name", "section"], name="uniq_classroom_year_name_section"
            )
        ]
        indexes = [models.Index(fields=["academic_year", "name"])]
        ordering = ["academic_year__name", "name", "section"]

    def clean(self):
        if self.class_teacher_id:
            from django.contrib.auth import get_user_model

            u = get_user_model().objects.filter(pk=self.class_teacher_id).first()
            if u and u.role not in ("TEACHER", "ADMIN") and not u.is_superuser:
                raise ValidationError("Class teacher must be a teacher account.")
            if u and not u.is_active:
                raise ValidationError("Class teacher account is inactive.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}-{self.section} ({self.academic_year})"


class Subject(models.Model):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=32, unique=True, help_text="e.g. MATH-10")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} [{self.code}]"


class EnrollmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    GRADUATED = "GRADUATED", "Graduated"
    TRANSFERRED = "TRANSFERRED", "Transferred"


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_number = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=16, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.user_id:
            from django.contrib.auth import get_user_model

            u = get_user_model().objects.filter(pk=self.user_id).first()
            if u and u.role != "STUDENT" and not u.is_superuser:
                raise ValidationError("StudentProfile must link to a user with STUDENT role.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_number} -> {self.user}"


class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    employee_number = models.CharField(max_length=32, unique=True)
    department = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.user_id:
            from django.contrib.auth import get_user_model

            u = get_user_model().objects.filter(pk=self.user_id).first()
            if u and u.role != "TEACHER" and not u.is_superuser:
                raise ValidationError("TeacherProfile must link to a user with TEACHER role.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee_number} -> {self.user}"


class TeachingAssignment(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.PROTECT, related_name="teaching_assignments")
    classroom = models.ForeignKey(Classroom, on_delete=models.PROTECT, related_name="teaching_assignments")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="teaching_assignments")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="teaching_assignments")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "classroom", "subject", "academic_year"],
                name="uniq_assignment_teacher_class_subject_year",
            )
        ]
        indexes = [models.Index(fields=["teacher", "academic_year"])]

    def clean(self):
        if (
            self.classroom_id
            and self.academic_year_id
            and self.classroom.academic_year_id != self.academic_year_id
        ):
            raise ValidationError("Assignment academic_year must match classroom's academic_year.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.teacher} -> {self.classroom} / {self.subject}"


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.PROTECT, related_name="enrollments")
    classroom = models.ForeignKey(Classroom, on_delete=models.PROTECT, related_name="enrollments")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="enrollments")
    status = models.CharField(max_length=16, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ACTIVE)
    enrolled_on = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "classroom", "academic_year"], name="uniq_enrollment_student_class_year"
            )
        ]
        indexes = [
            models.Index(fields=["classroom", "academic_year"]),
            models.Index(fields=["student", "academic_year"]),
        ]

    def clean(self):
        if (
            self.classroom_id
            and self.academic_year_id
            and self.classroom.academic_year_id != self.academic_year_id
        ):
            raise ValidationError("Enrollment academic_year must match classroom's academic_year.")
        if self.status == "ACTIVE":
            dup = Enrollment.objects.filter(student_id=self.student_id, status="ACTIVE")
            if self.pk:
                dup = dup.exclude(pk=self.pk)
            if dup.exists():
                raise ValidationError(
                    "Student already has an active enrollment in another class; "
                    "deactivate it before enrolling elsewhere."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} in {self.classroom}"


class ComplaintCategory(models.TextChoices):
    FACILITY = "FACILITY", "Building & facilities"
    TEACHER = "TEACHER", "Teaching & classes"
    TRANSPORT = "TRANSPORT", "Transport"
    FOOD = "FOOD", "Canteen & food"
    SAFETY = "SAFETY", "Safety & bullying"
    OTHER = "OTHER", "Other"


class ComplaintStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_REVIEW = "IN_REVIEW", "In review"
    RESOLVED = "RESOLVED", "Resolved"
    REJECTED = "REJECTED", "Rejected"


class Complaint(models.Model):
    """Student grievance to the authority. Students see only their own; admins see all."""

    student = models.ForeignKey(User, on_delete=models.PROTECT, related_name="complaints")
    title = models.CharField(max_length=120)
    category = models.CharField(max_length=16, choices=ComplaintCategory.choices, default=ComplaintCategory.OTHER)
    body = models.TextField(max_length=2000)
    status = models.CharField(max_length=16, choices=ComplaintStatus.choices, default=ComplaintStatus.OPEN)
    admin_reply = models.TextField(max_length=2000, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"#{self.id} {self.title} [{self.status}]"
