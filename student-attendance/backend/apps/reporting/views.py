"""Reporting API: scoped summary + safe CSV export."""

import csv

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import compute_daily_summary, compute_summary, sanitize_csv_value


class SummaryRowSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    username = serializers.CharField()
    student_number = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.IntegerField(required=False, allow_null=True)
    subject_name = serializers.CharField(required=False, allow_blank=True)
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    excused = serializers.IntegerField()
    total = serializers.IntegerField()
    percentage = serializers.FloatField()


class AttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SummaryRowSerializer

    @extend_schema(responses={"type": "object"})
    def get(self, request):
        rows, policy = compute_summary(request.user, request.query_params)
        return Response(
            {
                "policy": policy,
                "policy_note": "Default: LATE counts as attended; EXCUSED excluded from denominator. Override via query params.",
                "count": len(rows),
                "results": rows,
            }
        )


class AttendanceExportView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SummaryRowSerializer

    @extend_schema(responses={"type": "string", "format": "binary"})
    def get(self, request):
        rows, _policy = compute_summary(request.user, request.query_params)
        # Students already scoped to self in compute_summary; teachers/admins scoped to assignments.
        by_subject = any("subject_name" in r for r in rows)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="attendance_export.csv"'
        writer = csv.writer(response)
        header = ["student_id", "username", "student_number"]
        if by_subject:
            header.append("subject")
        header += ["present", "absent", "late", "excused", "total", "percentage"]
        writer.writerow(header)
        for r in rows:
            line = [
                sanitize_csv_value(r["student"]),
                sanitize_csv_value(r["username"]),
                sanitize_csv_value(r.get("student_number", "")),
            ]
            if by_subject:
                line.append(sanitize_csv_value(r.get("subject_name", "")))
            line += [
                r["present"],
                r["absent"],
                r["late"],
                r["excused"],
                r["total"],
                r["percentage"],
            ]
            writer.writerow(line)
        return response


class DailyRowSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    username = serializers.CharField()
    student_number = serializers.CharField(required=False, allow_blank=True)
    days_present = serializers.IntegerField()
    days_total = serializers.IntegerField()
    percentage = serializers.FloatField()


class DailySummaryView(APIView):
    """GET /reports/attendance/daily-summary/?classroom=<id> — class-teacher days."""

    permission_classes = [IsAuthenticated]
    serializer_class = DailyRowSerializer

    @extend_schema(responses={"type": "object"})
    def get(self, request):
        rows, meta = compute_daily_summary(request.user, request.query_params)
        return Response({"days_total": meta["days_total"], "count": len(rows), "results": rows})


class DailyExportView(APIView):
    """GET /reports/attendance/daily-export.csv — days CSV for the selected class."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={"type": "string", "format": "binary"})
    def get(self, request):
        rows, meta = compute_daily_summary(request.user, request.query_params)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="daily_attendance_export.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["student_id", "username", "student_number", "days_present", "days_total", "percentage"]
        )
        for r in rows:
            writer.writerow(
                [
                    sanitize_csv_value(r["student"]),
                    sanitize_csv_value(r["username"]),
                    sanitize_csv_value(r.get("student_number", "")),
                    r["days_present"],
                    r["days_total"],
                    r["percentage"],
                ]
            )
        return response
