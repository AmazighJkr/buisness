from .staff_audit import record_staff_audit


class StaffAuditMiddleware:
    """Log successful mutating requests to /api/admin/ by staff users."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        record_staff_audit(request, response)
        return response
