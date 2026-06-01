from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class OptionalJWTAuthentication(JWTAuthentication):
    """
    Treat invalid/expired Bearer tokens as anonymous instead of HTTP 401.

    Public catalog endpoints (categories, projects) must work for guests even when
    the browser still has an old user_access_token in localStorage.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None
