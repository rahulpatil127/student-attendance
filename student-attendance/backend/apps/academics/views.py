"""Academics API: admin CRUD + teacher-scoped roster/classes."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from .models import (
    AcademicYear,
    Classroom,
    Complaint,
    Enrollment,
    StudentProfile,
    Subject,
    TeacherProfile,
    TeachingAssignment,
)
from .scopes import is_admin, teacher_can_access_classroom, teacher_classroom_ids
from .serializers import (
    AcademicYearSerializer,
    ClassroomSerializer,
    ComplaintSerializer,
    EnrollmentSerializer,
    RosterStudentSerializer,
    StudentProfileSerializer,
    SubjectSerializer,
    TeacherProfileSerializer,
    TeachingAssignmentSerializer,
)

User = get_user_model()


def next_prefixed_number(model, field, prefix, width=3):
    """Next free code like S021/T003. Unique DB constraints back it; retry on clash."""
    taken = set(model.objects.filter(**{f"{field}__startswith": prefix}).values_list(field, flat=True))
    i = 1
    while True:
        code = f"{prefix}{i:0{width}d}"
        if code not in taken:
            return code
        i += 1


def ensure_student_profile(student):
    profile, _ = StudentProfile.objects.get_or_create(
        user=student, defaults={"student_number": next_prefixed_number(StudentProfile, "student_number", "S")}
    )
    return profile


class TranslateModelValidationMixin:
    """Model `clean()` raises Django ValidationError; translate it to DRF 400."""

    def _save(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            ) from exc

    def perform_create(self, serializer):
        self._save(serializer)

    def perform_update(self, serializer):
        self._save(serializer)


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all().order_by("-start_date")
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get("is_active")
        if active in ("true", "True", "1"):
            qs = qs.filter(is_active=True)
        elif active in ("false", "False", "0"):
            qs = qs.filter(is_active=False)
        return qs


class ClassroomViewSet(viewsets.ModelViewSet):
    queryset = Classroom.objects.select_related("academic_year").all()
    serializer_class = ClassroomSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get("academic_year")
        if year:
            qs = qs.filter(academic_year_id=year)
        active = self.request.query_params.get("is_active")
        if active in ("true", "True", "1"):
            qs = qs.filter(is_active=True)
        return qs.order_by("name", "section")


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by("name")
    serializer_class = SubjectSerializer
    permission_classes = [IsAdmin]


class TeachingAssignmentViewSet(TranslateModelValidationMixin, viewsets.ModelViewSet):
    queryset = TeachingAssignment.objects.select_related("teacher", "classroom", "subject").all()
    serializer_class = TeachingAssignmentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("teacher"):
            qs = qs.filter(teacher_id=p.get("teacher"))
        if p.get("classroom"):
            qs = qs.filter(classroom_id=p.get("classroom"))
        if p.get("subject"):
            qs = qs.filter(subject_id=p.get("subject"))
        if p.get("academic_year"):
            qs = qs.filter(academic_year_id=p.get("academic_year"))
        return qs.order_by("id")


class EnrollmentViewSet(TranslateModelValidationMixin, viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("student", "classroom").all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        ensure_student_profile(serializer.validated_data["student"])
        super().perform_create(serializer)

    def create(self, request, *args, **kwargs):
        # Rejoining fast-path: an INACTIVE duplicate reactivates instead of 400.
        # (Runs before serializer validation, whose unique check would reject it.)
        try:
            student_id = int(request.data.get("student"))
            classroom_id = int(request.data.get("classroom"))
            year_id = int(request.data.get("academic_year"))
        except (TypeError, ValueError):
            return super().create(request, *args, **kwargs)
        existing = Enrollment.objects.select_related("student").filter(
            student_id=student_id, classroom_id=classroom_id, academic_year_id=year_id
        ).first()
        if existing is not None and existing.status != "ACTIVE":
            if existing.student.role not in ("STUDENT", "ADMIN") or not existing.student.is_active:
                return Response(
                    {"detail": "Not an active student account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ensure_student_profile(existing.student)
            existing.status = "ACTIVE"
            try:
                existing.full_clean(
                    exclude=["student", "classroom", "academic_year", "enrolled_on"]
                )
                existing.save()
            except DjangoValidationError as exc:
                raise DRFValidationError(
                    exc.message_dict if hasattr(exc, "message_dict") else str(exc)
                ) from exc
            return Response(EnrollmentSerializer(existing).data, status=status.HTTP_201_CREATED)
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("classroom"):
            qs = qs.filter(classroom_id=p.get("classroom"))
        if p.get("student"):
            qs = qs.filter(student_id=p.get("student"))
        if p.get("academic_year"):
            qs = qs.filter(academic_year_id=p.get("academic_year"))
        if p.get("status"):
            qs = qs.filter(status=p.get("status"))
        return qs.order_by("id")


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related("user").all().order_by("id")
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        number = serializer.validated_data.get("student_number") or next_prefixed_number(
            StudentProfile, "student_number", "S"
        )
        serializer.save(student_number=number)


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.select_related("user").all().order_by("id")
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        number = serializer.validated_data.get("employee_number") or next_prefixed_number(
            TeacherProfile, "employee_number", "T"
        )
        serializer.save(employee_number=number)


class TeacherClassesView(APIView):
    """GET /teacher/classes/ — assigned classes for teacher; all for admin."""

    permission_classes = [IsAuthenticated]
    serializer_class = ClassroomSerializer

    @extend_schema(responses=ClassroomSerializer(many=True))
    def get(self, request):
        user = request.user
        if is_admin(user):
            rooms = Classroom.objects.select_related("academic_year").filter(is_active=True)[:200]
        elif user.role == "TEACHER":
            ids = teacher_classroom_ids(user)
            rooms = Classroom.objects.select_related("academic_year").filter(id__in=ids)
        else:
            return Response({"detail": "Only teachers or admins."}, status=status.HTTP_403_FORBIDDEN)
        return Response(ClassroomSerializer(rooms, many=True).data)


class ClassRosterView(APIView):
    """GET /classes/{id}/students/ — admin or assigned teacher only."""

    permission_classes = [IsAuthenticated]
    serializer_class = RosterStudentSerializer

    @extend_schema(responses={"type": "object"})
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk)
        if not teacher_can_access_classroom(request.user, classroom.id):
            # 404 to avoid disclosing existence to unauthorized students
            if request.user.role == "STUDENT":
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        enrollments = (
            Enrollment.objects.filter(classroom=classroom, status="ACTIVE")
            .select_related("student")
            .order_by("student__first_name", "student__username")
        )
        students = [e.student for e in enrollments]
        data = RosterStudentSerializer(students, many=True, context={"classroom_id": classroom.id}).data
        return Response({"classroom": ClassroomSerializer(classroom).data, "students": data})


class TeacherAssignmentsView(APIView):
    """GET /teacher/assignments/ — own active assignments (teacher) or all (admin via query)."""

    permission_classes = [IsAuthenticated]
    serializer_class = TeachingAssignmentSerializer

    @extend_schema(responses=TeachingAssignmentSerializer(many=True))
    def get(self, request):
        user = request.user
        if is_admin(user):
            qs = TeachingAssignment.objects.select_related(
                "teacher", "classroom", "subject"
            ).filter(is_active=True)[:500]
            return Response(TeachingAssignmentSerializer(qs, many=True).data)
        if user.role != "TEACHER":
            return Response({"detail": "Only teachers or admins."}, status=status.HTTP_403_FORBIDDEN)
        qs = TeachingAssignment.objects.select_related(
            "teacher", "classroom", "subject", "classroom__academic_year", "academic_year"
        ).filter(teacher=user, is_active=True)
        return Response(TeachingAssignmentSerializer(qs, many=True).data)


class OwnEnrollmentsView(APIView):
    """GET /students/me/enrollments/ — own enrollments for profile page."""

    permission_classes = [IsAuthenticated]
    serializer_class = EnrollmentSerializer

    @extend_schema(responses=EnrollmentSerializer(many=True))
    def get(self, request):
        qs = Enrollment.objects.select_related("classroom", "classroom__academic_year").filter(
            student=request.user
        )
        return Response(EnrollmentSerializer(qs, many=True).data)


class BulkEnrollView(APIView):
    """POST /enrollments/bulk/ — enroll many students into one class in a single atomic request.

    Body: {"classroom": 1, "academic_year": 1, "student_ids": [5, 6, ...]}.
    Existing enrollments are skipped (reported), students with a wrong role
    or inactive accounts are rejected. Admin only.
    """

    permission_classes = [IsAdmin]
    serializer_class = EnrollmentSerializer

    @extend_schema(request={"type": "object"}, responses={"type": "object"})
    def post(self, request):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import IntegrityError, transaction
        from rest_framework import serializers

        classroom_id = request.data.get("classroom")
        year_id = request.data.get("academic_year")
        student_ids = request.data.get("student_ids", [])
        if not classroom_id or not year_id or not isinstance(student_ids, list) or not student_ids:
            raise serializers.ValidationError(
                {"detail": "classroom, academic_year and a non-empty student_ids list are required."}
            )
        classroom = get_object_or_404(Classroom, pk=classroom_id)
        if classroom.academic_year_id != int(year_id):
            raise serializers.ValidationError(
                {"academic_year": "Must match the classroom's academic year."}
            )
        created, skipped = 0, []
        with transaction.atomic():
            for sid in student_ids:
                student = User.objects.filter(pk=sid).first()
                if student is None or student.role not in ("STUDENT", "ADMIN") or not student.is_active:
                    skipped.append({"student": sid, "reason": "not an active student account"})
                    continue
                existing = Enrollment.objects.filter(
                    student=student, classroom=classroom, academic_year_id=year_id
                ).first()
                if existing is not None and existing.status == "ACTIVE":
                    skipped.append({"student": sid, "reason": "already enrolled"})
                    continue
                try:
                    ensure_student_profile(student)
                    if existing is None:
                        existing = Enrollment(
                            student=student,
                            classroom=classroom,
                            academic_year_id=year_id,
                            status="ACTIVE",
                        )
                    else:
                        existing.status = "ACTIVE"  # reactivate
                    existing.full_clean()
                    existing.save()
                except (IntegrityError, DjangoValidationError) as exc:
                    reason = "; ".join(exc.messages) if isinstance(exc, DjangoValidationError) else "already enrolled"
                    skipped.append({"student": sid, "reason": reason})
                    continue
                created += 1
        return Response({"enrolled": created, "skipped": skipped}, status=status.HTTP_201_CREATED)


class ClearInactiveView(APIView):
    """DELETE /enrollments/clear-inactive/?classroom=<id> — remove INACTIVE enrollments of one class.

    Used after a promotion to clean up leftover history rows. Only INACTIVE
    rows are touched; attendance records reference sessions, not enrollments,
    so history is preserved. Admin only.
    """

    permission_classes = [IsAdmin]

    @extend_schema(responses={"type": "object"})
    def delete(self, request):
        from rest_framework import serializers

        classroom_id = request.query_params.get("classroom")
        if not classroom_id:
            raise serializers.ValidationError(
                {"classroom": "Pick a class first (?classroom=<id>)."}
            )
        classroom = get_object_or_404(Classroom, pk=classroom_id)
        deleted, _ = Enrollment.objects.filter(
            classroom=classroom, status="INACTIVE"
        ).delete()
        return Response({"deleted": deleted, "classroom": str(classroom)})


class PromoteView(APIView):
    """POST /enrollments/promote/ — move a whole class to the next class/year.

    Body: {"from_classroom": 1, "to_classroom": 2, "academic_year": 3}.
    Every ACTIVE enrollment in the source becomes INACTIVE and a new ACTIVE
    enrollment is created in the target. Students already active elsewhere
    are skipped (reported) without touching their current enrollment.
    Admin only. Atomic per student.
    """

    permission_classes = [IsAdmin]

    @extend_schema(request={"type": "object"}, responses={"type": "object"})
    def post(self, request):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import transaction
        from rest_framework import serializers

        try:
            from_id = int(request.data.get("from_classroom"))
            to_id = int(request.data.get("to_classroom"))
            year_id = int(request.data.get("academic_year"))
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                {"detail": "from_classroom, to_classroom and academic_year are required."}
            ) from None
        if from_id == to_id:
            raise serializers.ValidationError(
                {"detail": "Source and target classes must differ."}
            )
        to_room = get_object_or_404(Classroom, pk=to_id)
        if to_room.academic_year_id != year_id:
            raise serializers.ValidationError(
                {"academic_year": "Must match the target classroom's academic year."}
            )
        moved, skipped = 0, []
        with transaction.atomic():
            actives = list(
                Enrollment.objects.select_related("student").filter(
                    classroom_id=from_id, status="ACTIVE"
                )
            )
            for enr in actives:
                clash = (
                    Enrollment.objects.filter(student=enr.student, status="ACTIVE")
                    .exclude(pk=enr.pk)
                    .exists()
                )
                if clash:
                    skipped.append(
                        {"student": enr.student_id, "reason": "active enrollment elsewhere"}
                    )
                    continue
                enr.status = "INACTIVE"
                enr.save(update_fields=["status", "updated_at"])
                try:
                    new_enr = Enrollment(
                        student=enr.student,
                        classroom=to_room,
                        academic_year_id=year_id,
                        status="ACTIVE",
                    )
                    new_enr.full_clean()
                    new_enr.save()
                except DjangoValidationError as exc:
                    raise serializers.ValidationError(
                        {"detail": "; ".join(exc.messages)}
                    ) from exc
                moved += 1
        return Response(
            {"moved": moved, "skipped": skipped, "from_classroom": from_id, "to_classroom": to_id},
            status=status.HTTP_200_OK,
        )


class ComplaintViewSet(viewsets.ModelViewSet):
    """Student grievances. Students create + read only their own; admins manage all."""

    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Complaint.objects.select_related("student").all()
        if is_admin(user):
            status_filter = self.request.query_params.get("status")
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs.order_by("-created_at")
        if user.role == "STUDENT":
            return qs.filter(student=user).order_by("-created_at")
        return Complaint.objects.none()

    def list(self, request, *args, **kwargs):
        if request.user.role == "TEACHER" and not is_admin(request.user):
            return Response(
                {"detail": "Teachers cannot view complaints."}, status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not is_admin(request.user) and obj.student_id != request.user.id:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != "STUDENT" or not user.is_active:
            return Response(
                {"detail": "Only students can submit complaints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(student=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response(
                {"detail": "Only administrators can update complaints."},
                status=status.HTTP_403_FORBIDDEN,
            )
        allowed = {"status", "admin_reply"}
        if any(k not in allowed for k in request.data):
            return Response(
                {"detail": f"Only {sorted(allowed)} may be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "Only administrators."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
