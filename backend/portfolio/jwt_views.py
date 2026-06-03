"""JWT token endpoint — staff accounts only (React admin panel)."""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': 'Invalid credentials.',
    }

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise self.fail('no_active_account')
        return data


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer
