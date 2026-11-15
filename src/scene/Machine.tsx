/**
 * The Francis turbine-generator unit, assembled from procedural parts.
 * Fixed parts: penstock, spiral casing, stay vanes, head cover, stator, draft tube.
 * Adjustable: wicket gates (pivot together). Rotating as one rigid assembly: runner, shaft, rotor.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  ANCHOR, B, EXPLODE, GATE_CHORD, GATE_PIVOT, GEN_Y, N_GATES, N_POLES, N_SLOTS, N_STAY, PEN_LEN, PEN_X, PART_IDS, R_GATE, R_STAY,
  SPIRAL_A0, STAY_ANGLE, STAY_CHORD, TAIL_LEN, TAIL_LEVEL, TAU, DT_LEN, gateAngle, gatePhi, pol, stayPhi, vaneRotation, type PartId,
} from './layout'
import { draftTube, lathe, ring, runnerBand, runnerBlades, runnerCrown, spiralCasing, vane } from './geometry'
import { basicMat, mat, registry, sectionMat, type Owner } from './materials'
import { live } from '../state/live'
import { useStore } from '../state/store'
import { resolveView } from '../state/view'
import { useT } from '../i18n'
import { PART_META } from '../content/sources'

const groups: Partial<Record<Owner, THREE.Group>> = {}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color()
const Y = new THREE.Vector3(0, 1, 0)

function Part({ id, children }: { id: Owner; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => { groups[id] = ref.current!; return () => { delete groups[id] } }, [id])
  return <group ref={ref} userData={{ part: id }}>{children}</group>
}

function Label({ id }: { id: PartId }) {
  const s = useStore()
  const t = useT()
  const labels = resolveView(s).labels
  const show = labels === 'all' || (labels?.includes(id) ?? false)
  if (!show) return null
  const active = s.selected === id
  return (
    <Html position={ANCHOR[id]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <button
        className={`label label-${PART_META[id].accent}${active ? ' is-active' : ''}`}
        style={{ pointerEvents: s.mode === 'explore' ? 'auto' : 'none' }}
        tabIndex={s.mode === 'explore' ? 0 : -1}
        onClick={() => s.mode === 'explore' && s.select(id)}
        onPointerEnter={() => s.mode === 'explore' && s.set({ hovered: id })}
        onPointerLeave={() => s.hovered === id && s.set({ hovered: null })}
      >
        <i />{t.parts[id].name}
      </button>
    </Html>
  )
}

export function Machine() {
  const gateRef = useRef<THREE.InstancedMesh>(null), leverRef = useRef<THREE.InstancedMesh>(null), stemRef = useRef<THREE.InstancedMesh>(null)
  const stayRef = useRef<THREE.InstancedMesh>(null), poleRef = useRef<THREE.InstancedMesh>(null), barRef = useRef<THREE.InstancedMesh>(null)
  const opRing = useRef<THREE.Group>(null), spin = useRef<THREE.Group[]>([])
  const guide = useRef<THREE.LineSegments>(null)
  const lastAlpha = useRef(-1)

  const G = useMemo(() => {
    registry.length = 0
    const cyl = (r: number, h: number, seg = 48, open = false) => new THREE.CylinderGeometry(r, r, h, seg, 1, open)
    const penGeo = cyl(SPIRAL_A0, PEN_LEN, 64, true); penGeo.rotateX(Math.PI / 2)
    const lever = new THREE.BoxGeometry(0.24, 0.035, 0.06); lever.translate(0.12, 0, 0)
    const guidePts = new Float32Array([0, -9.5, 0, 0, 10.5, 0, PEN_X, B / 2, 0, PEN_X, B / 2, PEN_LEN + 3])
    const guideGeo = new THREE.BufferGeometry(); guideGeo.setAttribute('position', new THREE.BufferAttribute(guidePts, 3))
    return {
      pen: penGeo, penRing: new THREE.TorusGeometry(SPIRAL_A0 + 0.02, 0.035, 10, 64),
      spiral: spiralCasing(), draft: draftTube(),
      stayVane: vane(STAY_CHORD, 0.5, 0.05, B), gateVane: vane(GATE_CHORD, GATE_PIVOT, 0.046, B - 0.012),
      stayTop: ring(1.5, 1.9, B, B + 0.07), stayBot: ring(1.03, 1.9, -0.07, 0),
      cover: lathe([[0.24, 0.47], [1.01, 0.47], [1.01, B], [1.5, B], [1.5, 0.5], [1.1, 0.56], [0.5, 0.62], [0.24, 0.62]]),
      bearing: ring(0.2, 0.46, 1.2, 1.55), bearingArm: new THREE.BoxGeometry(2.9, 0.1, 0.16),
      stem: cyl(0.032, 0.36, 12), lever, opRing: ring(1.47, 1.56, 0.7, 0.75),
      blades: runnerBlades(), crown: runnerCrown(), band: runnerBand(),
      shaft: cyl(0.16, GEN_Y + 0.55 - 0.45), flange: cyl(0.3, 0.12),
      hub: cyl(0.42, 0.7), arm: new THREE.BoxGeometry(0.86, 0.5, 0.09), rim: ring(1.2, 1.37, -0.34, 0.34),
      pole: new THREE.BoxGeometry(0.15, 0.62, 0.25), cap: cyl(0.3, 0.26),
      core: ring(1.6, 1.9, -0.37, 0.37), frame: ring(1.9, 2.03, -0.52, 0.52), endw: new THREE.TorusGeometry(1.69, 0.075, 12, 96),
      bar: new THREE.BoxGeometry(0.035, 0.74, 0.085),
      floor: new THREE.BoxGeometry(5.4, 0.12, TAIL_LEN + 0.2),
      waterBox: new THREE.BoxGeometry(5.2, TAIL_LEVEL + 5.0, TAIL_LEN),
      guide: guideGeo,
    }
  }, [])

  const M = useMemo(() => ({
    pen: mat('penstock', 'shell', { shell: true }), penRing: mat('penstock', 'steel'),
    spiral: mat('spiral', 'shell', { shell: true, clip: true }),
    stay: mat('stay', 'steel'), stayRing: mat('stay', 'dark', { clip: true, xr: true }), staySec: sectionMat('stay'),
    gate: mat('gates', 'gate'), gateMech: mat('gates', 'dark'),
    cover: mat('cover', 'dark', { clip: true, xr: true }), coverSec: sectionMat('cover'),
    blades: mat('runner', 'bright'), hubs: mat('runner', 'bright', { clip: true }), runSec: sectionMat('runner', '#59606b'),
    shaft: mat('shaft', 'steel'),
    rotor: mat('rotor', 'dark'), pole: mat('rotor', 'white'),
    core: mat('stator', 'dark', { clip: true, xr: true }), frame: mat('stator', 'steel', { clip: true, xr: true }), statSec: sectionMat('stator'),
    copper: mat('stator', 'copper', { clip: true, xr: true }),
    bar: basicMat('stator', {}, 1),
    draft: mat('draft', 'shell', { shell: true, clip: true }),
    concrete: mat('tailrace', 'concrete'), tailWater: mat('tailrace', 'water', { shell: true, base: 0.13 }),
    guide: new THREE.LineDashedMaterial({ color: '#8f97a3', dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0 }),
  }), [])
  M.bar.clippingPlanes = M.core.clippingPlanes; M.bar.clipIntersection = true

  // static instances
  useEffect(() => {
    for (let k = 0; k < N_STAY; k++) {
      _q.setFromAxisAngle(Y, vaneRotation(stayPhi(k), STAY_ANGLE)); _m.compose(pol(R_STAY, stayPhi(k), 0, _p), _q, _s)
      stayRef.current!.setMatrixAt(k, _m)
    }
    stayRef.current!.instanceMatrix.needsUpdate = true
    for (let k = 0; k < N_GATES; k++) { _q.identity(); _m.compose(pol(R_GATE, gatePhi(k), 0.56, _p), _q, _s); stemRef.current!.setMatrixAt(k, _m) }
    stemRef.current!.instanceMatrix.needsUpdate = true
    for (let k = 0; k < N_POLES; k++) {
      const a = (k * TAU) / N_POLES
      _q.setFromAxisAngle(Y, a); _m.compose(pol(1.445, a, 0, _p), _q, _s); poleRef.current!.setMatrixAt(k, _m)
      poleRef.current!.setColorAt(k, _c.set(k % 2 ? '#a9adcf' : '#d6b995'))
    }
    poleRef.current!.instanceMatrix.needsUpdate = true; poleRef.current!.instanceColor!.needsUpdate = true
    for (let k = 0; k < N_SLOTS; k++) {
      const a = (k * TAU) / N_SLOTS
      _q.setFromAxisAngle(Y, a); _m.compose(pol(1.6, a, 0, _p), _q, _s); barRef.current!.setMatrixAt(k, _m); barRef.current!.setColorAt(k, _c.set('#c9824c'))
    }
    barRef.current!.instanceMatrix.needsUpdate = true
    guide.current!.computeLineDistances()
  }, [])

  useFrame(() => {
    // wicket gates: every gate takes the same angle (they are linked to one operating ring)
    const alpha = gateAngle(live.opening)
    if (Math.abs(alpha - lastAlpha.current) > 1e-5) {
      lastAlpha.current = alpha
      for (let k = 0; k < N_GATES; k++) {
        const phi = gatePhi(k)
        _q.setFromAxisAngle(Y, vaneRotation(phi, alpha)); _m.compose(pol(R_GATE, phi, 0.006, _p), _q, _s); gateRef.current!.setMatrixAt(k, _m)
        _q.setFromAxisAngle(Y, vaneRotation(phi, alpha) + Math.PI * 0.82); _m.compose(pol(R_GATE, phi, 0.72, _p), _q, _s); leverRef.current!.setMatrixAt(k, _m)
      }
      gateRef.current!.instanceMatrix.needsUpdate = true; leverRef.current!.instanceMatrix.needsUpdate = true
      opRing.current!.rotation.y = -(alpha - 0.33) * 0.55
    }
    // runner, shaft and rotor are one rigid assembly: same angle, always
    for (const g of spin.current) if (g) g.rotation.y = live.angle
    // induction: each stator bar glows with the field of the rotor pole passing in front of it
    const pairs = N_POLES / 2, glow = Math.min(1.15, live.power) * live.spin
    for (let k = 0; k < N_SLOTS; k++) {
      const e = Math.abs(Math.cos(pairs * ((k * TAU) / N_SLOTS - live.angle)))
      const g = glow * e * e
      barRef.current!.setColorAt(k, _c.setRGB(0.5 + 0.25 * g, 0.3 + 0.38 * g, 0.2 + 1.6 * g))
    }
    barRef.current!.instanceColor!.needsUpdate = true
    // exploded view along the assembly axes
    for (const id of [...PART_IDS, 'cover'] as Owner[]) {
      const g = groups[id]; if (!g) continue
      const o = EXPLODE[id]; g.position.set(o[0] * live.explode, o[1] * live.explode, o[2] * live.explode)
    }
    M.guide.opacity = live.explode * 0.55; guide.current!.visible = live.explode > 0.02
  })

  const setSpin = (i: number) => (g: THREE.Group | null) => { if (g) spin.current[i] = g }
  const tailZ = -(1.3 + 4.3) - TAIL_LEN / 2

  return (
    <group>
      <lineSegments ref={guide} geometry={G.guide} material={M.guide} raycast={() => null} />

      <Part id="penstock">
        <mesh geometry={G.pen} material={M.pen} position={[PEN_X, B / 2, PEN_LEN / 2]} />
        {[0.9, 2.4, 3.9, PEN_LEN - 0.05].map((z) => <mesh key={z} geometry={G.penRing} material={M.penRing} position={[PEN_X, B / 2, z]} />)}
        <Label id="penstock" />
      </Part>

      <Part id="spiral">
        <mesh geometry={G.spiral} material={M.spiral} />
        <Label id="spiral" />
      </Part>

      <Part id="stay">
        <instancedMesh ref={stayRef} args={[G.stayVane, M.stay, N_STAY]} castShadow />
        <mesh geometry={G.stayTop} material={M.stayRing} /><mesh geometry={G.stayTop} material={M.staySec} />
        <mesh geometry={G.stayBot} material={M.stayRing} receiveShadow /><mesh geometry={G.stayBot} material={M.staySec} />
        <Label id="stay" />
      </Part>

      <Part id="gates">
        <instancedMesh ref={gateRef} args={[G.gateVane, M.gate, N_GATES]} castShadow frustumCulled={false} />
        <instancedMesh ref={stemRef} args={[G.stem, M.gate, N_GATES]} />
        <instancedMesh ref={leverRef} args={[G.lever, M.gateMech, N_GATES]} frustumCulled={false} />
        <group ref={opRing}><mesh geometry={G.opRing} material={M.gateMech} /></group>
        <Label id="gates" />
      </Part>

      <Part id="cover">
        <mesh geometry={G.cover} material={M.cover} /><mesh geometry={G.cover} material={M.coverSec} />
        <mesh geometry={G.bearing} material={M.cover} /><mesh geometry={G.bearing} material={M.coverSec} />
      </Part>

      <Part id="runner">
        <group ref={setSpin(0)}>
          <mesh geometry={G.blades} material={M.blades} castShadow />
          <mesh geometry={G.crown} material={M.hubs} castShadow /><mesh geometry={G.crown} material={M.runSec} />
          <mesh geometry={G.band} material={M.hubs} /><mesh geometry={G.band} material={M.runSec} />
        </group>
        <Label id="runner" />
      </Part>

      <Part id="shaft">
        <group ref={setSpin(1)}>
          <mesh geometry={G.shaft} material={M.shaft} position={[0, (GEN_Y + 0.55 + 0.45) / 2, 0]} castShadow />
          <mesh geometry={G.flange} material={M.shaft} position={[0, 0.92, 0]} />
          {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} geometry={G.stem} material={M.shaft} scale={[1, 0.5, 1]} position={pol(0.24, (k * TAU) / 6, 0.92)} />)}
        </group>
        <Label id="shaft" />
      </Part>

      <Part id="rotor">
        <group ref={setSpin(2)} position={[0, GEN_Y, 0]}>
          <mesh geometry={G.hub} material={M.rotor} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <mesh key={k} geometry={G.arm} material={M.rotor} rotation={[0, (k * TAU) / 8, 0]} position={pol(0.8, (k * TAU) / 8, 0)} />)}
          <mesh geometry={G.rim} material={M.rotor} castShadow />
          <instancedMesh ref={poleRef} args={[G.pole, M.pole, N_POLES]} />
          <mesh geometry={G.cap} material={M.rotor} position={[0, 0.5, 0]} />
        </group>
        <Label id="rotor" />
      </Part>

      <Part id="stator">
        <group position={[0, GEN_Y, 0]}>
          <mesh geometry={G.core} material={M.core} /><mesh geometry={G.core} material={M.statSec} />
          <mesh geometry={G.frame} material={M.frame} /><mesh geometry={G.frame} material={M.statSec} />
          <mesh geometry={G.endw} material={M.copper} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.43, 0]} />
          <mesh geometry={G.endw} material={M.copper} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.43, 0]} />
          <instancedMesh ref={barRef} args={[G.bar, M.bar, N_SLOTS]} />
        </group>
        <Label id="stator" />
      </Part>

      <Part id="draft">
        <mesh geometry={G.draft} material={M.draft} />
        <Label id="draft" />
      </Part>

      <Part id="tailrace">
        <mesh geometry={G.floor} material={M.concrete} position={[0, -5.07, tailZ]} receiveShadow />
        <mesh geometry={G.waterBox} material={M.tailWater} position={[0, (TAIL_LEVEL - 5.0) / 2, tailZ]} />
        <Label id="tailrace" />
      </Part>
    </group>
  )
}
