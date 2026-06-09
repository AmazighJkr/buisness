"""Build a ZIP of project source files and optional 3D assets."""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

from django.http import HttpResponse

from .model3d_convert import is_glb_name


def _safe_zip_name(name: str) -> str:
    base = Path(name or 'file').name.replace('\\', '/').lstrip('/')
    if '..' in base.split('/'):
        base = Path(base).name
    return base or 'file'


def _add_filefield(zf: zipfile.ZipFile, file_field, arc_prefix: str) -> None:
    if not file_field or not getattr(file_field, 'name', None):
        return
    arcname = f'{arc_prefix}/{_safe_zip_name(file_field.name)}'
    try:
        with file_field.open('rb') as fh:
            zf.writestr(arcname, fh.read())
    except OSError:
        pass


def build_project_bundle_response(project) -> HttpResponse:
    title = (project.title or 'project').strip()[:60]
    safe_title = ''.join(c if c.isalnum() or c in '-_' else '_' for c in title) or 'project'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for row in project.code_files_list:
            if not isinstance(row, dict):
                continue
            code = (row.get('code') or '').strip()
            if not code:
                continue
            fname = _safe_zip_name(row.get('title') or 'main.txt')
            zf.writestr(f'code/{fname}', code)

        if project.source_code and project.source_code.strip() and not project.code_files_list:
            zf.writestr('code/main.txt', project.source_code.strip())

        _add_filefield(zf, project.model_3d_glb, '3d')
        if project.model_3d_file and getattr(project.model_3d_file, 'name', None):
            if not (project.model_3d_glb and is_glb_name(project.model_3d_file.name)):
                _add_filefield(zf, project.model_3d_file, '3d')

        readme = (
            f'# {project.title}\n\n'
            'Exported from EmbeddedGrid.\n'
            '- code/ — source files\n'
            '- 3d/ — hardware model (if uploaded)\n'
        )
        zf.writestr('README.txt', readme)

    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{safe_title}-bundle.zip"'
    return response
