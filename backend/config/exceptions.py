"""DRF exception handler: translate Django ProtectedError into a clean 400 JSON.

Without this, deleting an object with PROTECTed relations returns Django's
HTML 500 debug page, which the frontend cannot parse as JSON.
"""

from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def protected_handler(exc, context):
    if isinstance(exc, ProtectedError):
        protected = list(exc.protected_objects or [])
        names = sorted({o.__class__.__name__ for o in protected})
        what = ", ".join(names) if names else "related records"
        return Response(
            {
                "detail": (
                    f"Cannot delete: protected by {len(protected)} related "
                    f"record(s) ({what}). Deactivate it instead — history is kept."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return exception_handler(exc, context)
