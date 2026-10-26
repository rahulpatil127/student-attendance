from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicYearViewSet,
    BulkEnrollView,
    ClassroomViewSet,
    ClassRosterView,
    ClearInactiveView,
    ComplaintViewSet,
    EnrollmentViewSet,
    OwnEnrollmentsView,
    PromoteView,
    StudentProfileViewSet,
    SubjectViewSet,
    TeacherAssignmentsView,
    TeacherClassesView,
    TeacherProfileViewSet,
    TeachingAssignmentViewSet,
)

router = DefaultRouter()
router.register("academic-years", AcademicYearViewSet, basename="academic-years")
router.register("classrooms", ClassroomViewSet, basename="classrooms")
router.register("subjects", SubjectViewSet, basename="subjects")
router.register("assignments", TeachingAssignmentViewSet, basename="assignments")
router.register("enrollments", EnrollmentViewSet, basename="enrollments")
router.register("complaints", ComplaintViewSet, basename="complaints")
router.register("student-profiles", StudentProfileViewSet, basename="student-profiles")
router.register("teacher-profiles", TeacherProfileViewSet, basename="teacher-profiles")

urlpatterns = [
    # before the router: otherwise "bulk"/"promote" match the enrollments detail route
    path("enrollments/bulk/", BulkEnrollView.as_view(), name="enrollments-bulk"),
    path("enrollments/clear-inactive/", ClearInactiveView.as_view(), name="enrollments-clear"),
    path("enrollments/promote/", PromoteView.as_view(), name="enrollments-promote"),
    path("", include(router.urls)),
    path("teacher/classes/", TeacherClassesView.as_view(), name="teacher-classes"),
    path("teacher/assignments/", TeacherAssignmentsView.as_view(), name="teacher-assignments"),
    path("classes/<int:pk>/students/", ClassRosterView.as_view(), name="class-roster"),
    path("students/me/enrollments/", OwnEnrollmentsView.as_view(), name="student-own-enrollments"),
]
