from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminUserViewSet, BulkUserUploadView

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    # before the router: otherwise "bulk" matches the users detail route
    path("admin/users/bulk/", BulkUserUploadView.as_view(), name="admin-users-bulk"),
    path("admin/", include(router.urls)),
]
