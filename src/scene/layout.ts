/**
 * Machine layout: every dimension and parametric curve of the procedural Francis unit lives here,
 * so the solid geometry (geometry.ts) and the water pathlines (Water.tsx) share one source of truth.
 * Scene units are arbitrary (roughly "runner radii"); Y is the vertical shaft axis.
 */
import { Vector3 } from 'three'

export const TAU = Math.PI * 2
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t) }

/** Polar helper. Increasing phi == positive rotation about +Y (the runner's direction of rotation). */
export function pol(r: number, phi: number, y: number, out = new Vector3()): Vector3 {
  return out.set(r * Math.cos(phi), y, -r * Math.sin(phi))
}

// ---- Distributor (stay vanes + wicket gates) ---------------------------------------------------
export const B = 0.4            // distributor height: water passage between y = 0 and y = B
export const R1 = 1.0           // runner inlet radius
export const N_GATES = 20
export const R_GATE = 1.28      // wicket gate pivot circle
export const GATE_CHORD = 0.44
export const GATE_PIVOT = 0.45  // pivot position along chord (0 = leading edge)
export const GATE_MIN = (2 * Math.PI) / 180   // closed: gates overlap tip to tail
export const GATE_MAX = (36 * Math.PI) / 180  // fully open
export const gateAngle = (opening: number) => lerp(GATE_MIN, GATE_MAX, clamp(opening))

export const N_STAY = 10
export const R_STAY = 1.675
export const STAY_CHORD = 0.42
export const STAY_ANGLE = (40 * Math.PI) / 180
export const RS = 1.85          // stay ring outer radius = spiral casing throat

/** Point on the chord line of a pivoted vane. tau: 0 leading edge .. 1 trailing edge. */
export function vanePoint(rPivot: number, phi: number, alpha: number, chord: number, pivot: number, tau: number, y: number, out = new Vector3()): Vector3 {
  const s = (tau - pivot) * chord
  const a = phi + alpha
  // trailing-edge direction: cos(alpha)*tangent + sin(alpha)*inward
  return out.set(rPivot * Math.cos(phi) - Math.sin(a) * s, y, -rPivot * Math.sin(phi) - Math.cos(a) * s)
}
export const gatePhi = (k: number) => (k * TAU) / N_GATES
export const stayPhi = (k: number) => (k * TAU) / N_STAY + 0.12
/** Y-rotation that orients a vane mesh whose local +X is the trailing-edge direction. */
export const vaneRotation = (phi: number, alpha: number) => phi + alpha + Math.PI / 2

const _a = new Vector3(), _b = new Vector3()
/** Point inside the channel between vane k and k+1 (f = 0..1 across the channel). */
export function gateChannel(k: number, f: number, tau: number, alpha: number, y: number, out = new Vector3()) {
  vanePoint(R_GATE, gatePhi(k), alpha, GATE_CHORD, GATE_PIVOT, tau, y, _a)
  vanePoint(R_GATE, gatePhi(k + 1), alpha, GATE_CHORD, GATE_PIVOT, tau, y, _b)
  return out.copy(_a).lerp(_b, f)
}
export function stayChannel(k: number, f: number, tau: number, y: number, out = new Vector3()) {
  vanePoint(R_STAY, stayPhi(k), STAY_ANGLE, STAY_CHORD, 0.5, tau, y, _a)
  vanePoint(R_STAY, stayPhi(k + 1), STAY_ANGLE, STAY_CHORD, 0.5, tau, y, _b)
  return out.copy(_a).lerp(_b, f)
}
export const angleOf = (v: Vector3) => Math.atan2(-v.z, v.x)

// ---- Spiral casing ------------------------------------------------------------------------------
export const SPIRAL_A0 = 0.62                 // section radius at the inlet
export const SPIRAL_AMIN = 0.215
export const SPIRAL_END = TAU * 0.955         // wrap angle of the scroll
/**
 * Section radius. Flow leaves the casing all along its length, so for a roughly constant velocity
 * the area must shrink in proportion to the remaining flow: a ~ sqrt(1 - phi / 2pi).
 */
export function spiralA(phi: number) {
  return Math.max(SPIRAL_AMIN, SPIRAL_A0 * Math.sqrt(Math.max(0, 1 - (0.93 * phi) / TAU)))
}
/** Radius of the section centre: the circular section meets the stay ring at y = 0 and y = B. */
export function spiralRc(phi: number) {
  const a = spiralA(phi)
  return RS + Math.sqrt(Math.max(0, a * a - (B / 2) * (B / 2)))
}
export const PEN_X = spiralRc(0)
export const PEN_LEN = 5.2

// ---- Runner -------------------------------------------------------------------------------------
export const N_BLADES = 13
export const BLADE_WRAP = 0.95 // rad, blades sweep backwards (against rotation) from inlet to outlet
function bez(p0: number[], p1: number[], p2: number[], u: number): [number, number] {
  const w = 1 - u
  return [w * w * p0[0] + 2 * w * u * p1[0] + u * u * p2[0], w * w * p0[1] + 2 * w * u * p1[1] + u * u * p2[1]]
}
/** Crown (upper/inner) meridional streamline, [r, y]. Radial at the inlet, axial at the outlet. */
export const crownCurve = (u: number) => bez([R1, 0.38], [0.36, 0.36], [0.24, -0.42], u)
/** Band (lower/outer) meridional streamline. */
export const bandCurve = (u: number) => bez([R1, 0.02], [0.72, 0.0], [0.7, -0.45], u)
export function bladeTheta(u: number, v: number) { return -BLADE_WRAP * (0.75 + 0.35 * v) * Math.pow(u, 1.35) }
/** Point on the blade camber surface in the runner frame. u: inlet->outlet, v: crown->band. */
export function runnerPoint(u: number, v: number, theta0: number, out = new Vector3()) {
  const c = crownCurve(u), b = bandCurve(u)
  return pol(lerp(c[0], b[0], v), theta0 + bladeTheta(u, v), lerp(c[1], b[1], v), out)
}

// ---- Draft tube (elbow type) ---------------------------------------------------------------------
export const DT_TOP = -0.08
const DT_V = 2.22, DT_RE = 1.3, DT_ARC = (Math.PI / 2) * DT_RE, DT_H = 4.3
export const DT_LEN = DT_V + DT_ARC + DT_H
export const DT_S_RUNNER = 0.37 // arc length at the runner outlet plane (y = -0.45)
/** Centreline of the draft tube and its tangent, by arc length s. Lies in the Y-Z plane. */
export function draftCentre(s: number, out = new Vector3(), tan?: Vector3) {
  if (s <= DT_V) { out.set(0, DT_TOP - s, 0); tan?.set(0, -1, 0) }
  else if (s <= DT_V + DT_ARC) {
    const a = (s - DT_V) / DT_RE
    out.set(0, DT_TOP - DT_V - DT_RE * Math.sin(a), -DT_RE * (1 - Math.cos(a))); tan?.set(0, -Math.cos(a), -Math.sin(a))
  } else { out.set(0, DT_TOP - DT_V - DT_RE, -DT_RE - (s - DT_V - DT_ARC)); tan?.set(0, 0, -1) }
  return out
}
/** Section radius: throat just below the runner, then a steadily widening diffuser. */
export function draftR(s: number) {
  if (s < 0.42) return lerp(1.06, 0.76, smooth(s / 0.42))
  return lerp(0.76, 1.3, Math.pow(clamp((s - 0.42) / (DT_LEN - 0.42)), 0.85))
}
/** Horizontal widening of the outlet (elbow draft tubes flatten and widen toward the exit). */
export const draftSx = (s: number) => 1 + 0.4 * smooth((s - DT_V) / (DT_LEN - DT_V))
const _c = new Vector3(), _t = new Vector3()
export function draftPoint(s: number, rho: number, chi: number, out = new Vector3()) {
  draftCentre(Math.min(s, DT_LEN), _c, _t)
  if (s > DT_LEN) _c.z -= s - DT_LEN
  const R = draftR(Math.min(s, DT_LEN)) * rho
  // e1 = +X, e2 = X x T
  const e2y = -_t.z, e2z = _t.y
  const cx = Math.cos(chi) * R * draftSx(s), sn = Math.sin(chi) * R
  return out.set(_c.x + cx, _c.y + sn * e2y, _c.z + sn * e2z)
}
export const TAIL_LEN = 3.4
export const TAIL_LEVEL = -1.75 // tailwater surface

// ---- Shaft / generator ----------------------------------------------------------------------------
export const GEN_Y = 2.95
export const N_POLES = 24
export const N_SLOTS = 72

// ---- Exploded view: offsets along the real assembly axes (vertical shaft line, penstock axis) -----
export type PartId = 'penstock' | 'spiral' | 'stay' | 'gates' | 'runner' | 'shaft' | 'rotor' | 'stator' | 'draft' | 'tailrace'
export const PART_IDS: PartId[] = ['penstock', 'spiral', 'stay', 'gates', 'runner', 'shaft', 'rotor', 'stator', 'draft', 'tailrace']
export const EXPLODE: Record<PartId | 'cover', [number, number, number]> = {
  penstock: [0, 0, 2.2], spiral: [0, 0, 0], stay: [0, 0, 0], gates: [0, 0.9, 0], cover: [0, 1.75, 0],
  runner: [0, -1.25, 0], shaft: [0, 2.5, 0], rotor: [0, 3.6, 0], stator: [0, 5.6, 0],
  draft: [0, -2.9, 0], tailrace: [0, -2.9, -1.2],
}
/** Label anchor of each part in assembled position. */
export const ANCHOR: Record<PartId, [number, number, number]> = {
  penstock: [PEN_X, 0.9, 3.6], spiral: [-2.55, 0.75, -0.9], stay: [-1.72, -0.12, 0.5], gates: [0.55, 0.72, 1.2],
  runner: [0, -0.05, 0.0], shaft: [0, 1.75, 0], rotor: [0.9, GEN_Y, 0.9], stator: [-1.55, GEN_Y + 0.45, 1.3],
  draft: [0, -2.4, 1.0], tailrace: [0, TAIL_LEVEL, -7.6],
}
