"""Academics serializers — explicit allowed fields only."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AcademicYear,
    Classroom,
    Complaint,
    Enrollment,
    StudentProfile,
    Subject,
    TeacherProfile,
    TeachingAssignment,
)

User = get_user_model()


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ("id", "name", "start_date", "end_date", "is_active")
        read_only_fields = ("id",)


class ClassroomSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    class_teacher_username = serializers.CharField(
        source="class_teacher.username", read_only=True, default=""
    )

    class Meta:
        model = Classroom
        fields = (
            "id",
            "name",
            "section",
            "academic_year",
            "academic_year_name",
            "class_teacher",
            "class_teacher_username",
            "is_active",
        )
        read_only_fields = ("id",)

    def validate_class_teacher(self, value):
        if value is None:
            return value
        if value.role not in ("TEACHER", "ADMIN") and not value.is_superuser:
            raise serializers.ValidationError("Class teacher must be a teacher account.")
        if not value.is_active:
            raise serializers.ValidationError("Class teacher account is inactive.")
        return value


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "name", "code", "is_active")
        read_only_fields = ("id",)


class StudentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ("id", "user", "username", "student_number", "status")
        read_only_fields = ("id",)
        extra_kwargs = {"student_number": {"required": False, "allow_blank": True}}


class TeacherProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TeacherProfile
        fields = ("id", "user", "username", "employee_number", "department")
        read_only_fields = ("id",)
        extra_kwargs = {"employee_number": {"required": False, "allow_blank": True}}


class TeachingAssignmentSerializer(serializers.ModelSerializer):
    teacher_username = serializers.CharField(source="teacher.username", read_only=True)
    classroom_display = serializers.CharField(source="classroom.__str__", read_only=True)
    subject_display = serializers.CharField(source="subject.__str__", read_only=True)

    class Meta:
        model = TeachingAssignment
        fields = (
            "id",
            "teacher",
            "teacher_username",
            "classroom",
            "classroom_display",
            "subject",
            "subject_display",
            "academic_year",
            "is_active",
        )
        read_only_fields = ("id",)

    def validate_teacher(self, value):
        if value.role not in ("TEACHER", "ADMIN") and not value.is_superuser:
            raise serializers.ValidationError("Assigned teacher must have TEACHER role.")
        if not value.is_active:
            raise serializers.ValidationError("Assigned teacher account is inactive.")
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    student_number = serializers.SerializerMethodField()
    classroom_display = serializers.CharField(source="classroom.__str__", read_only=True)

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "student",
            "student_username",
            "student_number",
            "classroom",
            "classroom_display",
            "academic_year",
            "status",
            "enrolled_on",
        )
        read_only_fields = ("id", "enrolled_on")

    def get_student_number(self, obj):
        profile = getattr(obj.student, "student_profile", None)
        return profile.student_number if profile else ""

    def validate_student(self, value):
        if value.role not in ("STUDENT", "ADMIN") and not value.is_superuser:
            raise serializers.ValidationError("Enrolled student must have STUDENT role.")
        if not value.is_active:
            raise serializers.ValidationError("Student account is inactive.")
        return value


class RosterStudentSerializer(serializers.ModelSerializer):
    """Minimal roster exposure: no sensitive fields beyond name + student number."""

    student_number = serializers.CharField(source="student_profile.student_number", read_only=True)
    enrollment_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "student_number", "enrollment_status")
        read_only_fields = fields

    def get_enrollment_status(self, obj):
        classroom_id = self.context.get("classroom_id")
        enr = getattr(obj, "_prefetched_enrollment", None)
        if enr is not None:
            return enr
        if classroom_id is None:
            return None
        e = obj.enrollments.filter(classroom_id=classroom_id).first()
        return e.status if e else None


class ComplaintSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = Complaint
        fields = (
            "id",
            "student",
            "student_username",
            "title",
            "category",
            "body",
            "status",
            "admin_reply",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "student", "created_at", "updated_at")
