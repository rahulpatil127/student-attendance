from django.urls import path

from .views import AttendanceExportView, AttendanceSummaryView

urlpatterns = [
    path("reports/attendance/summary/", AttendanceSummaryView.as_view(), name="report-summary"),
    path("reports/attendance/export.csv", AttendanceExportView.as_view(), name="report-export"),
]
