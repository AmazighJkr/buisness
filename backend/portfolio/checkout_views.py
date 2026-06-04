"""Checkout helpers (captcha)."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .checkout_captcha import issue_captcha


class StoreCheckoutCaptchaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(issue_captcha())
