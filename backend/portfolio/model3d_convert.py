"""Convert uploaded 3D meshes/CAD to GLB for reliable browser preview."""
from __future__ import annotations

import logging
import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

GLB_EXTENSIONS = {'.glb', '.gltf'}
CONVERTIBLE_EXTENSIONS = {
    '.obj', '.stl', '.step', '.stp', '.off', '.ply', '.dae', '.3mf', '.fbx',
}


def _conversion_timeout_sec() -> int:
    return int(os.getenv('MODEL_3D_CONVERT_TIMEOUT', '90'))


class Model3dConversionError(Exception):
    """Raised when a 3D upload cannot be converted to GLB."""


def extension_from_name(name: str) -> str:
    return Path(name or '').suffix.lower()


def is_glb_name(name: str) -> bool:
    return extension_from_name(name) in GLB_EXTENSIONS


def project_model_3d_pending(project) -> bool:
    """Source uploaded but no GLB preview yet (conversion failed or pending)."""
    glb = getattr(project, 'model_3d_glb', None)
    if glb and getattr(glb, 'name', None):
        return False
    source = getattr(project, 'model_3d_file', None)
    return bool(source and getattr(source, 'name', None) and not is_glb_name(source.name))


def _ensure_converter_installed() -> None:
    try:
        import trimesh  # noqa: F401
    except ImportError as exc:
        raise Model3dConversionError(
            '3D converter missing. In backend/: pip install -r requirements.txt '
            '(needs trimesh, numpy, cascadio).',
        ) from exc


def _convert_path_to_glb_bytes(tmp_path: str, ext: str) -> bytes:
    """
    Run conversion in a child process so heavy STEP parsing cannot kill gunicorn (502).
    """
    _ensure_converter_installed()
    out_path = f'{tmp_path}.glb'
    script = textwrap.dedent(
        '''
        import sys
        import trimesh

        src, dst, ext = sys.argv[1], sys.argv[2], sys.argv[3]
        if ext in ('.step', '.stp'):
            import cascadio  # noqa: F401
        loaded = trimesh.load(src, force='mesh')
        if loaded is None:
            raise RuntimeError('no geometry')
        data = loaded.export(file_type='glb')
        if not data:
            raise RuntimeError('empty glb')
        with open(dst, 'wb') as fh:
            fh.write(data)
        ''',
    ).strip()
    try:
        result = subprocess.run(
            [sys.executable, '-c', script, tmp_path, out_path, ext],
            timeout=_conversion_timeout_sec(),
            check=True,
            capture_output=True,
        )
        if result.stderr:
            logger.debug('model3d convert stderr: %s', result.stderr.decode(errors='replace')[:300])
    except subprocess.TimeoutExpired as exc:
        raise Model3dConversionError(
            'Conversion timed out (file may be too large). Export as STL or GLB and re-upload.',
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or b'').decode(errors='replace').strip()[:240]
        raise Model3dConversionError(
            f'Could not convert to GLB. Export as STL or GLB from CAD. {detail}',
        ) from exc
    except OSError as exc:
        raise Model3dConversionError(f'Conversion process failed: {exc}') from exc

    try:
        with open(out_path, 'rb') as fh:
            return fh.read()
    finally:
        if os.path.isfile(out_path):
            os.unlink(out_path)


def file_to_glb_content(uploaded_file) -> ContentFile | None:
    """Return GLB ContentFile for conversion, or None if upload is already GLB/GLTF."""
    ext = extension_from_name(uploaded_file.name)
    if ext in GLB_EXTENSIONS:
        return None
    if ext not in CONVERTIBLE_EXTENSIONS:
        raise Model3dConversionError(
            f'Format {ext} cannot be converted. Upload GLB, or export STL/STEP/OBJ from CAD.',
        )

    suffix = ext or '.bin'
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            if hasattr(uploaded_file, 'chunks'):
                for chunk in uploaded_file.chunks():
                    tmp.write(chunk)
            else:
                tmp.write(uploaded_file.read())
            if hasattr(uploaded_file, 'seek'):
                uploaded_file.seek(0)

        glb_bytes = _convert_path_to_glb_bytes(tmp_path, ext)
        if not glb_bytes:
            raise Model3dConversionError('GLB export produced an empty file.')

        stem = Path(uploaded_file.name).stem or 'model'
        return ContentFile(glb_bytes, name=f'{stem}.glb')
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            os.unlink(tmp_path)


def convert_project_model_to_glb(project) -> bool:
    """
    Populate project.model_3d_glb from project.model_3d_file when needed.
    Returns True if a GLB preview is available after this call.
    """
    source = project.model_3d_file
    if not source or not getattr(source, 'name', None):
        if project.model_3d_glb:
            project.model_3d_glb.delete(save=False)
            project.model_3d_glb = None
            project.save(update_fields=['model_3d_glb'])
        return False

    if is_glb_name(source.name):
        if project.model_3d_glb:
            project.model_3d_glb.delete(save=False)
            project.model_3d_glb = None
            project.save(update_fields=['model_3d_glb'])
        return True

    glb_content = file_to_glb_content(source)
    if not glb_content:
        return True

    if project.model_3d_glb:
        project.model_3d_glb.delete(save=False)

    project.model_3d_glb.save(glb_content.name, glb_content, save=False)
    project.save(update_fields=['model_3d_glb'])
    logger.info('Converted 3D model to GLB for project %s', project.pk)
    return True
