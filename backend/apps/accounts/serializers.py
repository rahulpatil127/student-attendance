from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class MeSerializer(serializers.ModelSerializer):
    student_number = serializers.SerializerMethodField()
    employee_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "student_number",
            "employee_number",
        )
        read_only_fields = fields

    def get_student_number(self, obj):
        profile = getattr(obj, "student_profile", None)
        return profile.student_number if profile else ""

    def get_employee_number(self, obj):
        profile = getattr(obj, "teacher_profile", None)
        return profile.employee_number if profile else ""


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    classes = serializers.SerializerMethodField(
        help_text="Active enrollments, e.g. Class 10-A (2025-26). Students only."
    )
    student_number = serializers.SerializerMethodField()
    employee_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "classes",
            "student_number",
            "employee_number",
            "password",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined", "is_staff", "is_superuser", "classes")

    def get_student_number(self, obj):
        profile = getattr(obj, "student_profile", None)
        return profile.student_number if profile else ""

    def get_employee_number(self, obj):
        profile = getattr(obj, "teacher_profile", None)
        return profile.employee_number if profile else ""

    def get_classes(self, obj):
        enrollments = obj.enrollments.filter(status="ACTIVE").select_related(
            "classroom", "classroom__academic_year"
        )
        return ", ".join(str(e.classroom) for e in enrollments)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
        user = User(**validated_data)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.full_clean(exclude=["password"])
        instance.save()
        return instance
