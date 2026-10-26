from django.urls import path

from .views import AttendanceExportView, AttendanceSummaryView, DailyExportView, DailySummaryView

urlpatterns = [
    path("reports/attendance/summary/", AttendanceSummaryView.as_view(), name="report-summary"),
    path("reports/attendance/daily-summary/", DailySummaryView.as_view(), name="report-daily"),
    path("reports/attendance/daily-export.csv", DailyExportView.as_view(), name="report-daily-export"),
    path("reports/attendance/export.csv", AttendanceExportView.as_view(), name="report-export"),
]
