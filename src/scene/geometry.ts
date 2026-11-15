/** Procedural solid geometry builders for the Francis unit. Pure three.js, no React. */
import * as THREE from 'three'
import {
  B, RS, SPIRAL_END, spiralA, spiralRc, pol, N_BLADES, TAU, runnerPoint, crownCurve, bandCurve,
  DT_LEN, draftCentre, draftR, draftSx, lerp,
} from './layout'

/** Make sure triangles face outward (needed for the back-face "section cap" trick). */
export function orient(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo : geo
  const pos = g.getAttribute('position'); const idx = g.index
  if (!idx) return geo
  let vol = 0
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(pos, idx.getX(i)); b.fromBufferAttribute(pos, idx.getX(i + 1)); c.fromBufferAttribute(pos, idx.getX(i + 2))
    vol += a.dot(b.cross(c))
  }
  if (vol < 0) {
    const arr = idx.array as Uint16Array | Uint32Array
    for (let i = 0; i < arr.length; i += 3) { const t = arr[i]; arr[i] = arr[i + 2]; arr[i + 2] = t }
    idx.needsUpdate = true
  }
  g.computeVertexNormals()
  return geo
}

/** Solid of revolution from a closed [r, y] profile. */
export function lathe(profile: number[][], segments = 96) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y))
  pts.push(pts[0].clone())
  const g = new THREE.LatheGeometry(pts, segments)
  return orient(g)
}
export const ring = (r0: number, r1: number, y0: number, y1: number, seg = 96) => lathe([[r0, y0], [r1, y0], [r1, y1], [r0, y1]], seg)

/** Extruded hydrofoil vane. Local +X = trailing-edge direction, pivot at the origin, height along +Y. */
export function vane(chord: number, pivot: number, thick: number, height: number) {
  const s = new THREE.Shape(); const n = 14
  const x0 = -pivot * chord
  const half = (t: number) => thick * 2.6 * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1036 * t ** 4)
  s.moveTo(x0, 0)
  for (let i = 1; i <= n; i++) { const t = i / n; s.lineTo(x0 + t * chord, half(t)) }
  for (let i = n - 1; i >= 0; i--) { const t = i / n; s.lineTo(x0 + t * chord, -half(t)) }
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 4 })
  g.rotateX(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

/** Closed thin shell from a parametric surface P(u, v), thickened along its normal. */
export function thickSurface(P: (u: number, v: number, out: THREE.Vector3) => void, nu: number, nv: number, thick: number) {
  const pos: number[] = []; const idx: number[] = []
  const p = new THREE.Vector3(), pu = new THREE.Vector3(), pv = new THREE.Vector3(), n = new THREE.Vector3()
  const e = 1e-3
  for (let side = 0; side < 2; side++) for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = j / nv
    P(u, v, p); P(Math.min(1, u + e), v, pu); P(u, Math.min(1, v + e), pv)
    if (u + e > 1) { P(u - e, v, n); pu.copy(p).multiplyScalar(2).sub(n) }
    if (v + e > 1) { P(u, v - e, n); pv.copy(p).multiplyScalar(2).sub(n) }
    n.copy(pu.sub(p)).cross(pv.sub(p)).normalize()
    // taper toward the edges for a hydrodynamic look
    const tp = thick * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)))
    p.addScaledVector(n, (side ? -0.5 : 0.5) * tp)
    pos.push(p.x, p.y, p.z)
  }
  const W = nv + 1, S = (nu + 1) * W
  const q = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d)
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * W + j, b = (i + 1) * W + j, c = (i + 1) * W + j + 1, d = i * W + j + 1
    q(a, b, c, d); q(S + a, S + d, S + c, S + b)
  }
  for (let i = 0; i < nu; i++) { // v edges
    const a = i * W, b = (i + 1) * W; q(a, S + a, S + b, b)
    const c = i * W + nv, d = (i + 1) * W + nv; q(c, d, S + d, S + c)
  }
  for (let j = 0; j < nv; j++) { // u edges
    const a = j, b = j + 1; q(a, b, S + b, S + a)
    const c = nu * W + j, d = nu * W + j + 1; q(c, S + c, S + d, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** All runner blades merged in one geometry (runner frame). Blades are FIXED to crown and band. */
export function runnerBlades() {
  const geos: THREE.BufferGeometry[] = []
  for (let k = 0; k < N_BLADES; k++) {
    const th = (k * TAU) / N_BLADES
    geos.push(thickSurface((u, v, out) => { runnerPoint(u, v, th, out) }, 18, 8, 0.045))
  }
  return merge(geos)
}
export function merge(geos: THREE.BufferGeometry[]) {
  let vc = 0, ic = 0
  for (const g of geos) { vc += g.getAttribute('position').count; ic += g.index!.count }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), idx = new Uint32Array(ic)
  let vo = 0, io = 0
  for (const g of geos) {
    pos.set(g.getAttribute('position').array as Float32Array, vo * 3)
    nor.set(g.getAttribute('normal').array as Float32Array, vo * 3)
    const gi = g.index!.array
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo
    vo += g.getAttribute('position').count; io += gi.length
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  return out
}

export function runnerCrown() {
  const prof: number[][] = [[0, -0.66], [0.12, -0.6]]
  for (let i = 10; i >= 0; i--) prof.push(crownCurve(i / 10))
  prof.push([1.0, 0.43], [0.34, 0.455], [0, 0.455])
  return lathe(prof)
}
export function runnerBand() {
  const prof: number[][] = []
  for (let i = 0; i <= 10; i++) prof.push(bandCurve(i / 10))
  prof.push([0.75, -0.45])
  for (let i = 10; i >= 0; i--) { const [r, y] = bandCurve(i / 10); prof.push([r + lerp(0.045, 0.05, i / 10), y - lerp(0.05, 0, i / 10)]) }
  prof.push([1.0, -0.035])
  return lathe(prof)
}

/** Spiral casing shell: C-shaped sections, open toward the stay ring, shrinking along the scroll. */
export function spiralCasing(nPhi = 150, nPsi = 36) {
  const pos: number[] = [], idx: number[] = []
  const v = new THREE.Vector3()
  for (let i = 0; i <= nPhi; i++) {
    const phi = (i / nPhi) * SPIRAL_END
    const a = spiralA(phi), rc = spiralRc(phi)
    const beta = Math.asin(Math.min(1, B / 2 / a))
    for (let j = 0; j <= nPsi; j++) {
      const psi = lerp(-(Math.PI - beta), Math.PI - beta, j / nPsi)
      pol(rc + a * Math.cos(psi), phi, B / 2 + a * Math.sin(psi), v)
      pos.push(v.x, v.y, v.z)
    }
  }
  const W = nPsi + 1
  for (let i = 0; i < nPhi; i++) for (let j = 0; j < nPsi; j++) {
    const a = i * W + j, b = (i + 1) * W + j, c = (i + 1) * W + j + 1, d = i * W + j + 1
    idx.push(a, b, c, a, c, d)
  }
  // end cap (closed nose of the scroll)
  const c0 = pos.length / 3
  pol(spiralRc(SPIRAL_END), SPIRAL_END, B / 2, v); pos.push(v.x, v.y, v.z)
  for (let j = 0; j < nPsi; j++) idx.push(c0, nPhi * W + j, nPhi * W + j + 1)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Elbow draft tube shell: swept, steadily expanding section (a diffuser). */
export function draftTube(nS = 90, nC = 48) {
  const pos: number[] = [], idx: number[] = []
  const c = new THREE.Vector3(), t = new THREE.Vector3()
  for (let i = 0; i <= nS; i++) {
    const s = (i / nS) * DT_LEN
    draftCentre(s, c, t); const R = draftR(s), sx = draftSx(s)
    for (let j = 0; j <= nC; j++) {
      const chi = (j / nC) * TAU, sn = Math.sin(chi) * R
      pos.push(c.x + Math.cos(chi) * R * sx, c.y + sn * -t.z, c.z + sn * t.y)
    }
  }
  const W = nC + 1
  for (let i = 0; i < nS; i++) for (let j = 0; j < nC; j++) {
    const a = i * W + j, b = (i + 1) * W + j, cc = (i + 1) * W + j + 1, d = i * W + j + 1
    idx.push(a, b, cc, a, cc, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
