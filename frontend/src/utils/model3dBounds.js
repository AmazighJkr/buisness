import * as THREE from 'three'

function meshBoxEntries(root) {
  const entries = []
  root.traverse(o => {
    if (!o.isMesh || !o.visible) return
    const geo = o.geometry
    if (!geo?.attributes?.position) return
    if (!geo.boundingBox) geo.computeBoundingBox()
    if (geo.boundingBox.isEmpty()) return
    const box = geo.boundingBox.clone().applyMatrix4(o.matrixWorld)
    const size = box.getSize(new THREE.Vector3())
    const volume = size.x * size.y * size.z
    const triangles = geo.index
      ? geo.index.count / 3
      : Math.floor(geo.attributes.position.count / 3)
    entries.push({
      box,
      center: box.getCenter(new THREE.Vector3()),
      volume,
      triangles,
      maxDim: Math.max(size.x, size.y, size.z),
    })
  })
  return entries
}

/**
 * Detect the main object in messy GLB exports (stray helpers, far-away nodes).
 * Falls back to the largest mesh by triangle count when bounds are inconsistent.
 */
export function computeSmartMeshBounds(root) {
  const meshes = meshBoxEntries(root)
  if (!meshes.length) return null
  if (meshes.length === 1) return meshes[0].box.clone()

  meshes.sort((a, b) => b.triangles - a.triangles)
  const primary = meshes[0]

  const union = new THREE.Box3()
  meshes.forEach(m => union.union(m.box))
  const unionSize = union.getSize(new THREE.Vector3())
  const unionSpan = Math.max(unionSize.x, unionSize.y, unionSize.z)

  if (unionSpan > primary.maxDim * 6) {
    return primary.box.clone()
  }

  let weightSum = 0
  const cluster = new THREE.Vector3()
  meshes.forEach(m => {
    cluster.addScaledVector(m.center, m.triangles)
    weightSum += m.triangles
  })
  cluster.multiplyScalar(1 / Math.max(weightSum, 1))

  const primaryRadius = primary.box.getBoundingSphere(new THREE.Sphere()).radius
  const threshold = Math.max(primaryRadius * 2.5, unionSpan * 0.15)

  const filtered = new THREE.Box3()
  let has = false
  meshes.forEach(m => {
    const nearCluster = m.center.distanceTo(cluster) <= threshold
    const significant = m.triangles >= primary.triangles * 0.02
    if (!nearCluster && !significant) return
    if (has) filtered.union(m.box)
    else {
      filtered.copy(m.box)
      has = true
    }
  })

  return has ? filtered : primary.box.clone()
}

export function centerAndNormalizeGroup(group, box, targetSize = 1.5) {
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 1e-8)
  const scale = targetSize / maxDim
  group.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  group.scale.setScalar(scale)
  group.updateWorldMatrix(true, true)
  return scale
}

export function frameCameraToBox(camera, box, viewportSize, padding = 1.2) {
  if (!camera.isPerspectiveCamera) return 2
  const size = box.getSize(new THREE.Vector3())
  const radius = Math.max(size.x, size.y, size.z) / 2
  const aspect = viewportSize.width / Math.max(viewportSize.height, 1)
  const fovRad = (camera.fov * Math.PI) / 180
  const fitHeight = radius / Math.tan(fovRad / 2)
  const fitWidth = radius / Math.tan(Math.atan(Math.tan(fovRad / 2) * aspect))
  const d = Math.max(fitHeight, fitWidth, 0.5) * padding
  camera.position.set(0, 0, d)
  camera.lookAt(0, 0, 0)
  camera.near = Math.max(d / 300, 0.0005)
  camera.far = Math.max(d * 300, 200)
  camera.updateProjectionMatrix()
  return d
}
