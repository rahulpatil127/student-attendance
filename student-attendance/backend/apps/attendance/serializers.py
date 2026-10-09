"""Attendance serializers — explicit fields, no silent defaults."""

from rest_framework import serializers

from .models import AttendanceRecord, AttendanceSession


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    session_date = serializers.DateField(source="session.date", read_only=True)
    subject_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source="session.classroom.name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "session",
            "session_date",
            "subject_name",
            "classroom_name",
            "student",
            "student_username",
            "status",
            "marked_by",
            "note",
        )
        read_only_fields = ("id", "marked_by")

    def get_subject_name(self, obj):
        subject = getattr(obj.session, "subject", None)
        return subject.name if subject else "Whole day"


class RecordInputSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    status = serializers.ChoiceField(choices=["PRESENT", "ABSENT", "LATE", "EXCUSED"])
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class SessionCreateSerializer(serializers.Serializer):
    classroom = serializers.IntegerField()
    subject = serializers.IntegerField(required=False, allow_null=True, default=None)
    date = serializers.DateField()
    records = RecordInputSerializer(many=True)

    def validate_records(self, value):
        if not value:
            raise serializers.ValidationError("At least one attendance record is required.")
        student_ids = [r["student"] for r in value]
        if len(student_ids) != len(set(student_ids)):
            raise serializers.ValidationError("Duplicate student entries in records.")
        return value


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, read_only=True)
    classroom_display = serializers.CharField(source="classroom.__str__", read_only=True)
    subject_display = serializers.SerializerMethodField()
    counts = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "classroom",
            "classroom_display",
            "subject",
            "subject_display",
            "date",
            "created_by",
            "status",
            "records",
            "counts",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "status", "created_at", "updated_at")

    def get_subject_display(self, obj):
        if obj.subject_id is None:
            return "Whole day"
        return str(obj.subject)

    def get_counts(self, obj):
        records = getattr(obj, "prefetched_records", None)
        if records is None and hasattr(obj, "records"):
            try:
                records = list(obj.records.all())
            except (AttributeError, ValueError):
                records = []
        counts = {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0, "TOTAL": 0}
        for r in records or []:
            s = r.status if isinstance(r.status, str) else str(r.status)
            if s in counts:
                counts[s] += 1
                counts["TOTAL"] += 1
        return counts


class CorrectionSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500)
    records = RecordInputSerializer(many=True)

    def validate_records(self, value):
        if not value:
            raise serializers.ValidationError("At least one record change is required.")
        return value
