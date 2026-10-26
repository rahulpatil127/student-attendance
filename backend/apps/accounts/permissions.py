"""Reusable role + object-scope permissions. Backend is authoritative."""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == "ADMIN" or user.is_superuser))


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role in ("TEACHER", "ADMIN") or user.is_superuser))


class IsAdminOrSelfReadOnly(BasePermission):
    """Admin full access; non-admin may read only their own user object."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == "ADMIN" or user.is_superuser:
            return True
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return obj.pk == user.pk
        return False
