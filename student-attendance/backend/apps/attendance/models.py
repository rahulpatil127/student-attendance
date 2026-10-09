"""Attendance domain: sessions, records, audit trail."""

from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class SessionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    LOCKED = "LOCKED", "Locked"


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"
    LATE = "LATE", "Late"
    EXCUSED = "EXCUSED", "Excused"


class AttendanceSession(models.Model):
    classroom = models.ForeignKey(
        "academics.Classroom", on_delete=models.PROTECT, related_name="attendance_sessions"
    )
    subject = models.ForeignKey(
        "academics.Subject", on_delete=models.PROTECT, related_name="attendance_sessions"
    )
    date = models.DateField(default=timezone.localdate)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_sessions")
    status = models.CharField(max_length=16, choices=SessionStatus.choices, default=SessionStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["classroom", "subject", "date"], name="uniq_session_class_subject_date"
            )
        ]
        indexes = [
            models.Index(fields=["date", "classroom"]),
            models.Index(fields=["classroom", "subject"]),
        ]
        ordering = ["-date", "classroom__name"]

    def clean(self):
        if self.date and self.date > timezone.localdate() + timedelta(days=1):
            raise ValidationError("Attendance date cannot be far in the future.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.classroom} / {self.subject} @ {self.date} [{self.status}]"


class AttendanceRecord(models.Model):
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(User, on_delete=models.PROTECT, related_name="attendance_records")
    status = models.CharField(max_length=16, choices=AttendanceStatus.choices)
    marked_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="marked_records", null=True, blank=True
    )
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session", "student"], name="uniq_record_session_student")
        ]
        indexes = [
            models.Index(fields=["student", "session"]),
            models.Index(fields=["session", "status"]),
        ]

    def __str__(self):
        return f"{self.student} {self.status} in {self.session_id}"


class AuditEvent(models.Model):
    ACTION_CHOICES = [
        ("SESSION_CREATED", "Session created"),
        ("SESSION_SUBMITTED", "Session submitted"),
        ("RECORD_CREATED", "Record created"),
        ("RECORD_CORRECTED", "Record corrected"),
        ("SESSION_CORRECTED", "Session corrected"),
    ]
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name="audit_events")
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=64, help_text="e.g. AttendanceSession / AttendanceRecord")
    target_id = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Concise before/after, no secrets.")

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self):
        return f"{self.timestamp:%Y-%m-%d %H:%M} {self.actor} {self.action} {self.target_type}:{self.target_id}"
