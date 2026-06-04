"""Public and admin APIs for legal pages (CGV, privacy)."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .legal_defaults import LEGAL_SEED
from .models import LegalPage
from .permissions import CanManageStore


def _pick_locale(content: dict, lang: str) -> dict:
    lang = (lang or 'fr').strip().lower()[:2]
    if lang in content:
        return content[lang]
    return content.get('fr') or content.get('en') or {}


class LegalPagePublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            page = LegalPage.objects.get(slug=slug)
        except LegalPage.DoesNotExist:
            if slug in LEGAL_SEED:
                content = LEGAL_SEED[slug]
                locale = _pick_locale(content, request.query_params.get('lang', 'fr'))
                return Response({
                    'slug': slug,
                    'lang': request.query_params.get('lang', 'fr'),
                    'updated_at': None,
                    **locale,
                })
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        lang = request.query_params.get('lang', 'fr')
        locale = _pick_locale(page.content or {}, lang)
        return Response({
            'slug': page.slug,
            'lang': lang,
            'updated_at': page.updated_at.isoformat() if page.updated_at else None,
            **locale,
        })


class AdminLegalPageListView(APIView):
    permission_classes = [CanManageStore]

    def get(self, request):
        pages = {p.slug: p for p in LegalPage.objects.all()}
        out = []
        for slug in ('terms', 'privacy'):
            page = pages.get(slug)
            out.append({
                'slug': slug,
                'content': page.content if page else LEGAL_SEED.get(slug, {}),
                'updated_at': page.updated_at.isoformat() if page and page.updated_at else None,
            })
        return Response(out)


class AdminLegalPageDetailView(APIView):
    permission_classes = [CanManageStore]

    def get(self, request, slug):
        if slug not in ('terms', 'privacy'):
            return Response({'detail': 'Invalid slug.'}, status=status.HTTP_400_BAD_REQUEST)
        page, _ = LegalPage.objects.get_or_create(
            slug=slug,
            defaults={'content': LEGAL_SEED.get(slug, {})},
        )
        return Response({
            'slug': page.slug,
            'content': page.content,
            'updated_at': page.updated_at.isoformat() if page.updated_at else None,
        })

    def put(self, request, slug):
        if slug not in ('terms', 'privacy'):
            return Response({'detail': 'Invalid slug.'}, status=status.HTTP_400_BAD_REQUEST)
        content = request.data.get('content')
        if not isinstance(content, dict):
            return Response({'content': 'Required object with en/fr locales.'}, status=400)
        page, _ = LegalPage.objects.get_or_create(slug=slug, defaults={'content': {}})
        page.content = content
        page.save(update_fields=['content', 'updated_at'])
        return Response({
            'slug': page.slug,
            'content': page.content,
            'updated_at': page.updated_at.isoformat(),
        })
