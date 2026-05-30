import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def serve_media(request, path: str):
    """Serve uploaded files from MEDIA_ROOT (production-safe)."""
    media_root = Path(settings.MEDIA_ROOT).resolve()
    safe = (path or '').lstrip('/')
    if not safe or '..' in safe:
        raise Http404()

    target = (media_root / safe).resolve()
    try:
        target.relative_to(media_root)
    except ValueError as exc:
        raise Http404() from exc

    if not target.is_file():
        raise Http404()

    content_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(
        target.open('rb'),
        content_type=content_type or 'application/octet-stream',
    )
