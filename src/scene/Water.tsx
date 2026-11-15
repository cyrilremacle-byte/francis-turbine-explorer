/**
 * Water flow visualisation: kinematic pathlines drawn through the real passages.
 * penstock -> spiral casing -> stay vane channels -> wicket gate channels -> runner blade passages
 * (radial in, axial out, riding in the rotating frame) -> draft tube (slowing as it widens) -> tailrace.
 * This is NOT a fluid simulation; it is a geometric guide that never crosses a wall.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  B, DT_LEN, DT_S_RUNNER, GATE_CHORD, GATE_PIVOT, N_BLADES, N_GATES, N_STAY, PEN_LEN, PEN_X, R1, RS, R_GATE, SPIRAL_A0, TAIL_LEN, TAU,
  angleOf, bandCurve, bladeTheta, clamp, crownCurve, draftPoint, draftR, gateAngle, gateChannel, lerp, pol, runnerPoint, smooth,
  spiralA, spiralRc, stayChannel, vanePoint,
} from './layout'
import { live } from '../state/live'
import { useStore } from '../state/store'
import { resolveView } from '../state/view'

const N = 2400, H = 10
const R_REF = 2.3, L_STAY = 0.5, L_GAP = 0.16, L_GATE = GATE_CHORD, L_IN = 0.22, L_RUN = 1.3
const L_DRAFT = DT_LEN - DT_S_RUNNER + TAIL_LEN - 0.3
const L_REST = L_STAY + L_GAP + L_GATE + L_IN + L_RUN + L_DRAFT
const PITCH_B = TAU / N_BLADES, PITCH_G = TAU / N_GATES

interface P {
  d: number; rho: number; psi: number; v: number; yh: number
  ks: number; fs: number; kg: number; fg: number
  phiE: number; rE: number; lSup: number
  thetaRel: number; inRunner: boolean
  chi: number; rhoD: number; swirl: number; inDraft: boolean
  e: number; a: number
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3()
const PHI_L0 = angleOf(vanePoint(R_GATE, 0, 0.33, GATE_CHORD, GATE_PIVOT, 0, 0, new THREE.Vector3()))

function spawn(p: P, d = 0) {
  p.d = d; p.rho = Math.sqrt(Math.random()) * 0.88; p.psi = Math.random() * TAU
  p.v = 0.06 + Math.random() * 0.88; p.yh = lerp(0.38, 0.02, p.v)
  p.ks = Math.floor(Math.random() * N_STAY); p.fs = 0.2 + Math.random() * 0.6
  stayChannel(p.ks, p.fs, 0, p.yh, _v)
  let phi = angleOf(_v); while (phi < 0.5) phi += TAU
  p.phiE = phi; p.rE = Math.hypot(_v.x, _v.z); p.lSup = PEN_LEN + phi * R_REF
  stayChannel(p.ks, p.fs, 1, p.yh, _v)
  const x = (angleOf(_v) + 0.1 - PHI_L0) / PITCH_G
  p.kg = Math.floor(x); p.fg = clamp(x - p.kg, 0.2, 0.8)
  p.inRunner = false; p.inDraft = false; p.e = 1; p.a = 0
  p.thetaRel = Math.random() * TAU // overwritten on entering the runner; only used for the initial fill
}

/** Position of a particle at progress d, plus its local speed factor (returned). */
function place(p: P, out: THREE.Vector3): number {
  let d = p.d
  const alpha = gateAngle(live.opening)
  if (d < p.lSup) {
    const w = smooth(1 - (p.lSup - d) / Math.min(1.7, p.phiE * R_REF))
    if (d < PEN_LEN) out.set(PEN_X + p.rho * SPIRAL_A0 * Math.cos(p.psi), B / 2 + p.rho * SPIRAL_A0 * Math.sin(p.psi), PEN_LEN - d)
    else {
      const phi = (d - PEN_LEN) / R_REF, a = spiralA(phi) * 0.92
      const r = Math.max(spiralRc(phi) + p.rho * a * Math.cos(p.psi), RS + 0.05)
      pol(lerp(r, p.rE, w), phi, lerp(B / 2 + p.rho * a * Math.sin(p.psi), p.yh, w), out)
    }
    p.e = 1
    return 1.5
  }
  d -= p.lSup
  if (d < L_STAY) { stayChannel(p.ks, p.fs, d / L_STAY, p.yh, out); return 1.8 }
  d -= L_STAY
  if (d < L_GAP) { stayChannel(p.ks, p.fs, 1, p.yh, out); gateChannel(p.kg, p.fg, 0, alpha, p.yh, _w); out.lerp(_w, d / L_GAP); return 2 }
  d -= L_GAP
  if (d < L_GATE) { gateChannel(p.kg, p.fg, d / L_GATE, alpha, p.yh, out); return 2.3 }
  d -= L_GATE
  // leaving the gates: a logarithmic spiral at the gate angle carries the swirl to the runner rim
  gateChannel(p.kg, p.fg, 1, alpha, p.yh, _w)
  const rC = Math.max(R1 + 0.01, Math.hypot(_w.x, _w.z)), phiC = angleOf(_w), cot = 1 / Math.tan(Math.max(alpha + 0.12, 0.3))
  if (d < L_IN) { const r = lerp(rC, R1, d / L_IN); pol(r, phiC + cot * Math.log(rC / r), p.yh, out); return 2.3 }
  d -= L_IN
  if (d < L_RUN) {
    if (!p.inRunner) { p.inRunner = true; p.thetaRel = phiC + cot * Math.log(rC / R1) - live.angle }
    const u = d / L_RUN, x = p.thetaRel / PITCH_B, j = Math.floor(x), f0 = x - j
    const f = lerp(f0, clamp(f0, 0.24, 0.76), smooth(u / 0.3))
    runnerPoint(u, p.v, (j + f) * PITCH_B + live.angle, out)
    p.e = lerp(1, 0.3, smooth(u))   // energy handed to the runner
    return 2.0
  }
  d -= L_RUN
  if (!p.inDraft) {
    p.inDraft = true
    const x = p.thetaRel / PITCH_B, j = Math.floor(x), f = clamp(x - j, 0.24, 0.76)
    p.chi = (j + f) * PITCH_B + bladeTheta(1, p.v) + live.angle
    p.rhoD = Math.min(0.9, lerp(crownCurve(1)[0], bandCurve(1)[0], p.v) / draftR(DT_S_RUNNER))
    p.swirl = 0.15 + 0.9 * (1 - clamp(live.flow))
  }
  const s = DT_S_RUNNER + d
  draftPoint(s, p.rhoD, p.chi + p.swirl * (1 - Math.exp(-d / 1.2)), out)
  if (s > DT_LEN) out.y += smooth((s - DT_LEN) / TAIL_LEN) * 1.0
  p.e = 0.3 - 0.1 * clamp(d / 6)
  const R = draftR(Math.min(s, DT_LEN))
  return 1.9 * (0.76 / R) ** 2   // continuity: the diffuser slows the water as its area grows
}

// additive colour that leaves the canvas alpha untouched (the canvas is transparent over the page)
const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } as const
const VS = `attribute vec3 color; varying vec3 vC; uniform float uSize; uniform float uMax;
void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(uSize / -mv.z, uMax); }`
const FS = `varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vC * a, 1.0); }`

export function Water() {
  const points = useRef<THREE.Points>(null), lines = useRef<THREE.LineSegments>(null)
  const st = useMemo(() => {
    const ps: P[] = Array.from({ length: N }, () => { const p = {} as P; spawn(p); p.d = Math.random() * (p.lSup + L_REST); return p })
    const hist = new Float32Array(H * N * 3)
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    const lGeo = new THREE.BufferGeometry()
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * (H - 1) * 6), 3))
    lGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * (H - 1) * 6), 3))
    const pMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uSize: { value: 60 }, uMax: { value: 6 } }, transparent: true, depthWrite: false, ...ADD })
    const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, ...ADD })
    const state = { ps, hist, head: 0, acc: 0, pGeo, lGeo, pMat, lMat, warmed: false, vis: 1 }
    return state
  }, [])

  const step = (dt: number, flow: number) => {
    const { ps, hist } = st
    const base = st.head * N * 3
    for (let i = 0; i < N; i++) {
      const p = ps[i]
      const sp = place(p, _v)
      p.d += sp * flow * dt
      const total = p.lSup + L_REST
      let fresh = false
      if (p.d >= total) { spawn(p); place(p, _v); fresh = true }
      else place(p, _v)
      const downstream = p.d > p.lSup + L_STAY + L_GAP
      const quota = i / N < 0.3 + 0.7 * flow ? 1 : 0
      const target = smooth(p.d / 0.6) * smooth((total - p.d) / 2.6) * quota * (downstream ? smooth(flow / 0.06) : 1)
      p.a += (target - p.a) * Math.min(1, dt * 5)
      if (fresh) for (let h = 0; h < H; h++) { const o = (h * N + i) * 3; hist[o] = _v.x; hist[o + 1] = _v.y; hist[o + 2] = _v.z }
      else { const o = base + i * 3; hist[o] = _v.x; hist[o + 1] = _v.y; hist[o + 2] = _v.z }
    }
  }

  useFrame(({ gl, size }, rawDt) => {
    const s = useStore.getState()
    const pr = gl.getPixelRatio(); st.pMat.uniforms.uMax.value = 5.5 * pr; st.pMat.uniforms.uSize.value = 0.075 * size.height * pr
    const dt = Math.min(rawDt, 0.05) * (s.playing ? s.vizSpeed : 0)
    if (!st.warmed) { // pre-roll so the passages are already full on the first frame
      st.warmed = true
      for (let k = 0; k < 260; k++) { live.angle += 0.06 * 1.7; step(0.06, 0.85) }
      for (let h = 0; h < H; h++) st.hist.copyWithin(h * N * 3, st.head * N * 3, st.head * N * 3 + N * 3)
    }
    const want = resolveView(s).water ? 1 - smooth(live.explode * 3) : 0
    st.vis += (want - st.vis) * Math.min(1, rawDt * 6)
    points.current!.visible = lines.current!.visible = st.vis > 0.01
    if (st.vis <= 0.01) return

    st.acc += dt
    if (st.acc > 1 / 34) { // advance the trail history
      st.acc = 0
      const prev = st.head; st.head = (st.head + 1) % H
      st.hist.copyWithin(st.head * N * 3, prev * N * 3, prev * N * 3 + N * 3)
    }
    step(dt, live.flow)

    const { ps, hist } = st
    const pp = st.pGeo.attributes.position.array as Float32Array, pc = st.pGeo.attributes.color.array as Float32Array
    const lp = st.lGeo.attributes.position.array as Float32Array, lc = st.lGeo.attributes.color.array as Float32Array
    for (let i = 0; i < N; i++) {
      const p = ps[i], e = p.e, a = p.a * st.vis
      const r = lerp(0.07, 0.3, e) * a, g = lerp(0.24, 0.86, e) * a, b = lerp(0.72, 1.0, e) * a
      const o = (st.head * N + i) * 3
      pp[i * 3] = hist[o]; pp[i * 3 + 1] = hist[o + 1]; pp[i * 3 + 2] = hist[o + 2]
      pc[i * 3] = r; pc[i * 3 + 1] = g; pc[i * 3 + 2] = b
      for (let k = 0; k < H - 1; k++) {
        const h0 = (st.head - k + H) % H, h1 = (st.head - k - 1 + H) % H
        const o0 = (h0 * N + i) * 3, o1 = (h1 * N + i) * 3, q = (i * (H - 1) + k) * 6
        lp[q] = hist[o0]; lp[q + 1] = hist[o0 + 1]; lp[q + 2] = hist[o0 + 2]
        lp[q + 3] = hist[o1]; lp[q + 4] = hist[o1 + 1]; lp[q + 5] = hist[o1 + 2]
        const f0 = 0.75 * (1 - k / (H - 1)) ** 1.4, f1 = 0.75 * (1 - (k + 1) / (H - 1)) ** 1.4
        lc[q] = r * f0; lc[q + 1] = g * f0; lc[q + 2] = b * f0
        lc[q + 3] = r * f1; lc[q + 4] = g * f1; lc[q + 5] = b * f1
      }
    }
    st.pGeo.attributes.position.needsUpdate = st.pGeo.attributes.color.needsUpdate = true
    st.lGeo.attributes.position.needsUpdate = st.lGeo.attributes.color.needsUpdate = true
  })

  return (
    <group>
      <points ref={points} geometry={st.pGeo} material={st.pMat} frustumCulled={false} raycast={() => null} />
      <lineSegments ref={lines} geometry={st.lGeo} material={st.lMat} frustumCulled={false} raycast={() => null} />
    </group>
  )
}
