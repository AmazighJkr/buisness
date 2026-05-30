from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def _dist() -> Path:
    return Path(settings.FRONTEND_DIST)


def serve_frontend(request):
    dist = _dist()
    if not dist.is_dir():
        raise Http404('Frontend not built. Run deploy/build script.')

    safe = request.path.lstrip('/')
    if safe:
        candidate = (dist / safe).resolve()
        try:
            candidate.relative_to(dist.resolve())
        except ValueError as exc:
            raise Http404() from exc
        if candidate.is_file():
            return FileResponse(open(candidate, 'rb'))

    index = dist / 'index.html'
    if index.is_file():
        return FileResponse(open(index, 'rb'))
    raise Http404('index.html missing — rebuild the frontend.')
