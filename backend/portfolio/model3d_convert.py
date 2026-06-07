"""Convert uploaded 3D meshes/CAD to GLB for reliable browser preview."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

GLB_EXTENSIONS = {'.glb', '.gltf'}
CONVERTIBLE_EXTENSIONS = {
    '.obj', '.stl', '.step', '.stp', '.off', '.ply', '.dae', '.3mf', '.fbx',
}


class Model3dConversionError(Exception):
    """Raised when a 3D upload cannot be converted to GLB."""


def extension_from_name(name: str) -> str:
    return Path(name or '').suffix.lower()


def is_glb_name(name: str) -> bool:
    return extension_from_name(name) in GLB_EXTENSIONS


def _load_trimesh(path: str, ext: str):
    try:
        import trimesh
    except ImportError as exc:
        raise Model3dConversionError(
            '3D converter is not installed on the server (trimesh).',
        ) from exc

    if ext in {'.step', '.stp'}:
        try:
            import cascadio  # noqa: F401
        except ImportError as exc:
            raise Model3dConversionError(
                'STEP files need the cascadio package on the server. '
                'Export STL or GLB from your CAD tool, or redeploy after build.',
            ) from exc

    try:
        loaded = trimesh.load(path, force='mesh')
    except Exception as exc:
        raise Model3dConversionError(
            f'Could not read 3D file ({ext or "unknown"}). '
            'Try GLB or STL export from your CAD tool.',
        ) from exc

    if loaded is None:
        raise Model3dConversionError('File contained no 3D geometry.')

    if isinstance(loaded, trimesh.Scene):
        if not loaded.geometry:
            raise Model3dConversionError('File contained no 3D geometry.')
        return loaded

    return loaded


def file_to_glb_content(uploaded_file) -> ContentFile | None:
    """
    Return GLB ContentFile for conversion, or None if upload is already GLB/GLTF.
    """
    ext = extension_from_name(uploaded_file.name)
    if ext in GLB_EXTENSIONS:
        return None
    if ext not in CONVERTIBLE_EXTENSIONS:
        raise Model3dConversionError(
            f'Format {ext} cannot be converted here. Upload GLB, or export STL/STEP/OBJ from CAD.',
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

        loaded = _load_trimesh(tmp_path, ext)
        glb_bytes = loaded.export(file_type='glb')
        if not glb_bytes:
            raise Model3dConversionError('GLB export produced an empty file.')

        stem = Path(uploaded_file.name).stem or 'model'
        return ContentFile(glb_bytes, name=f'{stem}.glb')
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            os.unlink(tmp_path)


def convert_project_model_to_glb(project) -> None:
    """
    Populate project.model_3d_glb from project.model_3d_file when needed.
    Clears stale GLB when source is removed or already GLB.
    """
    source = project.model_3d_file
    if not source or not getattr(source, 'name', None):
        if project.model_3d_glb:
            project.model_3d_glb.delete(save=False)
            project.model_3d_glb = None
            project.save(update_fields=['model_3d_glb'])
        return

    if is_glb_name(source.name):
        if project.model_3d_glb:
            project.model_3d_glb.delete(save=False)
            project.model_3d_glb = None
            project.save(update_fields=['model_3d_glb'])
        return

    glb_content = file_to_glb_content(source)
    if not glb_content:
        return

    if project.model_3d_glb:
        project.model_3d_glb.delete(save=False)

    project.model_3d_glb.save(glb_content.name, glb_content, save=False)
    project.save(update_fields=['model_3d_glb'])
    logger.info('Converted 3D model to GLB for project %s', project.pk)
