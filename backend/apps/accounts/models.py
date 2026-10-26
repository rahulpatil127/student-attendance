"""Custom user model with role field. Defined before first migration per plan."""

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as BaseUserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrator / Management"
    TEACHER = "TEACHER", "Teacher"
    STUDENT = "STUDENT", "Student"


class UserManager(BaseUserManager):
    """Ensure createsuperuser always lands as ADMIN, not default STUDENT."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.STUDENT)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    REQUIRED_FIELDS = ["email"]

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN or self.is_superuser

    @property
    def is_teacher(self) -> bool:
        return self.role == Role.TEACHER

    @property
    def is_student(self) -> bool:
        return self.role == Role.STUDENT
