from django.contrib import admin

from .models import AttendanceRecord, AttendanceSession, AuditEvent


@admin.register(AttendanceSession)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("classroom", "subject", "date", "status", "created_by")
    list_filter = ("status", "date")


@admin.register(AttendanceRecord)
class RecordAdmin(admin.ModelAdmin):
    list_display = ("session", "student", "status", "marked_by")
    list_filter = ("status",)


@admin.register(AuditEvent)
class AuditAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "actor", "action", "target_type", "target_id")
    list_filter = ("action",)
    readonly_fields = ("timestamp",)
