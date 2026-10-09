"""Reporting API: scoped summary + safe CSV export."""

import csv

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import compute_summary, sanitize_csv_value


class SummaryRowSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    username = serializers.CharField()
    student_number = serializers.CharField(required=False, allow_blank=True)
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
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="attendance_export.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["student_id", "username", "student_number", "present", "absent", "late", "excused", "total", "percentage"]
        )
        for r in rows:
            writer.writerow(
                [
                    sanitize_csv_value(r["student"]),
                    sanitize_csv_value(r["username"]),
                    sanitize_csv_value(r.get("student_number", "")),
                    r["present"],
                    r["absent"],
                    r["late"],
                    r["excused"],
                    r["total"],
                    r["percentage"],
                ]
            )
        return response
