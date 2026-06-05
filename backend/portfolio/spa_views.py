import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404

_STATIC_EXTENSIONS = (
    '.js',
    '.css',
    '.map',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.json',
)


def _dist() -> Path:
    return Path(settings.FRONTEND_DIST)


def _looks_like_static_asset(relative_path: str) -> bool:
    name = relative_path.rstrip('/').split('/')[-1].lower()
    return any(name.endswith(ext) for ext in _STATIC_EXTENSIONS)


def _file_response(path: Path, *, cacheable: bool = False) -> FileResponse:
    content_type, _ = mimetypes.guess_type(path.name)
    response = FileResponse(
        path.open('rb'),
        as_attachment=False,
        filename=path.name,
        content_type=content_type or 'application/octet-stream',
    )
    if cacheable:
        response['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response


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
            return _file_response(candidate, cacheable=_looks_like_static_asset(safe))
        if _looks_like_static_asset(safe):
            raise Http404(f'Static asset not found: {safe}')

    index = dist / 'index.html'
    if index.is_file():
        response = FileResponse(
            index.open('rb'),
            content_type='text/html; charset=utf-8',
        )
        response['Cache-Control'] = 'no-cache'
        return response
    raise Http404('index.html missing — rebuild the frontend.')
