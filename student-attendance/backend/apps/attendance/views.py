"""Attendance API: scoped sessions, atomic submit, audited corrections, self-view."""

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.scopes import (
    is_admin,
    teacher_can_access_classroom,
    teacher_can_access_subject_in_class,
    teacher_classroom_ids,
)

from .models import AttendanceRecord, AttendanceSession, AuditEvent
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    CorrectionSerializer,
    SessionCreateSerializer,
)
from .services import correct_session, create_session_with_records, submit_session


def scoped_session_queryset(user):
    base = AttendanceSession.objects.select_related("classroom", "subject").prefetch_related(
        Prefetch("records", queryset=AttendanceRecord.objects.select_related("student"))
    )
    if is_admin(user):
        return base.all().order_by("-date", "-id")
    if user.role == "TEACHER":
        ids = teacher_classroom_ids(user)
        return base.filter(classroom_id__in=ids).order_by("-date", "-id")
    # Students must use /students/me/attendance/ ; deny session listing
    return base.none()


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = scoped_session_queryset(self.request.user)
        p = self.request.query_params
        if p.get("classroom"):
            qs = qs.filter(classroom_id=p.get("classroom"))
        if p.get("subject"):
            qs = qs.filter(subject_id=p.get("subject"))
        if p.get("status"):
            qs = qs.filter(status=p.get("status"))
        if p.get("date"):
            qs = qs.filter(date=p.get("date"))
        if p.get("date_from"):
            qs = qs.filter(date__gte=p.get("date_from"))
        if p.get("date_to"):
            qs = qs.filter(date__lte=p.get("date_to"))
        return qs

    def list(self, request, *args, **kwargs):
        if request.user.role == "STUDENT" and not is_admin(request.user):
            return Response({"detail": "Use /students/me/attendance/."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        # extra guard: teacher must still be assigned (queryset already scoped, double-check)
        if not is_admin(request.user) and not teacher_can_access_classroom(
            request.user, obj.classroom_id
        ):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        ser = SessionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        session = create_session_with_records(
            request.user, d["classroom"], d["subject"], d["date"], d["records"]
        )
        out = AttendanceSessionSerializer(session).data
        return Response(out, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        session = self.get_object()
        if session.status != "DRAFT":
            return Response(
                {"detail": "Only DRAFT sessions can be patched; use corrections endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Only date may be patched in Phase 3 (records via corrections)
        new_date = request.data.get("date")
        if not new_date:
            return Response({"detail": "Provide 'date' to patch."}, status=status.HTTP_400_BAD_REQUEST)
        if not (
            is_admin(request.user)
            or teacher_can_access_subject_in_class(
                request.user, session.classroom_id, session.subject_id
            )
        ):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        session.date = new_date
        try:
            session.full_clean()
            session.save()
        except (ValidationError, IntegrityError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AttendanceSessionSerializer(session).data)


class SessionSubmitView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceSessionSerializer

    @extend_schema(responses=AttendanceSessionSerializer)
    def post(self, request, pk):
        session = get_object_or_404(AttendanceSession, pk=pk)
        # scope check
        if not is_admin(request.user) and not teacher_can_access_classroom(
            request.user, session.classroom_id
        ):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        session = submit_session(request.user, session)
        return Response(AttendanceSessionSerializer(session).data)


class SessionCorrectionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CorrectionSerializer

    @extend_schema(request=CorrectionSerializer, responses=AttendanceSessionSerializer)
    def post(self, request, pk):
        session = get_object_or_404(AttendanceSession, pk=pk)
        ser = CorrectionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        session = correct_session(
            request.user, session, ser.validated_data["reason"], ser.validated_data["records"]
        )
        return Response(AttendanceSessionSerializer(session).data)


class StudentOwnAttendanceView(APIView):
    """GET /students/me/attendance/ — current user only, filterable."""

    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer

    @extend_schema(responses=AttendanceRecordSerializer(many=True))
    def get(self, request):
        qs = (
            AttendanceRecord.objects.select_related("session", "session__subject", "session__classroom")
            .filter(student=request.user)
            .order_by("-session__date", "-id")
        )
        p = request.query_params
        if p.get("status"):
            qs = qs.filter(status=p.get("status"))
        if p.get("subject"):
            qs = qs.filter(session__subject_id=p.get("subject"))
        if p.get("date_from"):
            qs = qs.filter(session__date__gte=p.get("date_from"))
        if p.get("date_to"):
            qs = qs.filter(session__date__lte=p.get("date_to"))
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        data = AttendanceRecordSerializer(page or qs[:200], many=True).data
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response(data)


class SessionAuditView(APIView):
    """GET /attendance/sessions/{id}/audit/ — audit trail for a session."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={"type": "object"})
    def get(self, request, pk):
        session = get_object_or_404(AttendanceSession, pk=pk)
        if not is_admin(request.user) and not teacher_can_access_classroom(
            request.user, session.classroom_id
        ):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        events = AuditEvent.objects.filter(
            target_type="AttendanceSession", target_id=str(session.id)
        ).order_by("-timestamp")[:100]
        data = [
            {
                "id": e.id,
                "actor": e.actor.username,
                "action": e.action,
                "timestamp": e.timestamp,
                "metadata": e.metadata,
            }
            for e in events.select_related("actor")
        ]
        return Response({"session": session.id, "events": data})
