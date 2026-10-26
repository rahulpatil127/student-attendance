from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceSessionViewSet,
    SessionAuditView,
    SessionCorrectionView,
    SessionSubmitView,
    StudentOwnAttendanceView,
)

router = DefaultRouter()
router.register("attendance/sessions", AttendanceSessionViewSet, basename="attendance-sessions")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "attendance/sessions/<int:pk>/submit/",
        SessionSubmitView.as_view(),
        name="session-submit",
    ),
    path(
        "attendance/sessions/<int:pk>/corrections/",
        SessionCorrectionView.as_view(),
        name="session-corrections",
    ),
    path(
        "attendance/sessions/<int:pk>/audit/",
        SessionAuditView.as_view(),
        name="session-audit",
    ),
    path("students/me/attendance/", StudentOwnAttendanceView.as_view(), name="student-own-attendance"),
]
