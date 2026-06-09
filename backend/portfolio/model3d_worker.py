"""Child-process worker: convert a mesh/CAD file to GLB (invoked by model3d_convert.py)."""
from __future__ import annotations

import sys

import trimesh


def mesh_face_count(mesh) -> int:
    faces = getattr(mesh, 'faces', None)
    if faces is None:
        return 0
    try:
        return int(len(faces))
    except (TypeError, ValueError):
        return 0


def scene_to_trimesh(loaded):
    if isinstance(loaded, trimesh.Trimesh):
        return loaded if mesh_face_count(loaded) > 0 else None
    if isinstance(loaded, trimesh.Scene):
        meshes = [
            g for g in loaded.geometry.values()
            if isinstance(g, trimesh.Trimesh) and mesh_face_count(g) > 0
        ]
        if not meshes:
            return None
        if len(meshes) == 1:
            return meshes[0]
        return trimesh.util.concatenate(meshes)
    return None


def main() -> int:
    if len(sys.argv) != 4:
        print('usage: model3d_worker.py <src> <dst.glb> <ext>', file=sys.stderr)
        return 2
    src, dst, ext = sys.argv[1], sys.argv[2], sys.argv[3]
    if ext in ('.step', '.stp'):
        import cascadio  # noqa: F401

    loaded = trimesh.load(src, force='mesh')
    mesh = scene_to_trimesh(loaded)
    if mesh is None or mesh_face_count(mesh) == 0:
        print('no geometry', file=sys.stderr)
        return 1

    mesh.merge_vertices()
    try:
        if mesh_face_count(mesh) > 120000:
            mesh = mesh.simplify_quadric_decimation(60000)
    except Exception:
        pass

    data = mesh.export(file_type='glb')
    if not data:
        print('empty glb', file=sys.stderr)
        return 1

    with open(dst, 'wb') as fh:
        fh.write(data)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
