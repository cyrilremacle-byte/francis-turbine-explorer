/** Canvas, lighting, the per-frame director (shared animation state) and the camera choreography. */
import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import { Machine } from './Machine'
import { Water } from './Water'
import { ACCENT, clipPlanes, registry } from './materials'
import { ANCHOR, EXPLODE, clamp, type PartId } from './layout'
import { live, VIS_OMEGA } from '../state/live'
import { useStore } from '../state/store'
import { resolveView } from '../state/view'
import { operatingPoint } from '../physics/hydro'
import { PART_META } from '../content/sources'
import { useT } from '../i18n'

const _col = new THREE.Color()
gsap.ticker.lagSmoothing(0) // keep choreography on wall-clock time, even on slow frames
const CAM_SCALE = 1.45

/** Advances the shared operating state and animates materials. Runs before Machine and Water. */
function Director() {
  useFrame((_, rawDt) => {
    const s = useStore.getState(), view = resolveView(s)
    const dt = Math.min(rawDt, 0.25), k = (rate: number) => 1 - Math.exp(-dt * rate)
    const snap = s.reduced ? 1 : 0

    const targetOpen = view.demo ? live.demo : s.mode === 'control' ? s.opening : 0.85
    live.opening += (targetOpen - live.opening) * Math.max(snap && !view.demo ? 1 : 0, k(7))
    if (s.mode === 'control') {
      live.flow = live.opening * clamp(Math.sqrt(s.head / 100), 0.4, 1.6)
      live.power = operatingPoint(live.opening, s.head).electricalMW / 17.658
    } else { live.flow = live.opening; live.power = live.opening }
    // Synchronised operation: speed is constant whatever the gate opening. Only fully closed gates
    // (no flow at all) are shown at standstill; that run-down is illustrative, not simulated.
    live.spin += ((live.opening > 0.004 ? 1 : 0) - live.spin) * k(live.opening > 0.004 ? 2.5 : 0.9)
    if (s.playing) live.angle += dt * s.vizSpeed * VIS_OMEGA * live.spin
    live.explode += ((view.explode ? 1 : 0) - live.explode) * Math.max(snap, k(3.2))
    live.clip += ((view.clip ? 1 : 0) - live.clip) * Math.max(snap, k(3.6))
    const c = (1 - live.clip) * 8
    clipPlanes[0].constant = c; clipPlanes[1].constant = c

    const hl = view.highlight
    for (const e of registry) {
      let o = e.base
      if (view.xray && e.xr) o = e.shell ? 0.07 : 0.14
      if (view.hide.includes(e.owner)) o = 0
      else if (hl) o = hl.includes(e.owner as PartId) ? (e.shell ? Math.max(e.base, 0.34) : 1) : Math.min(o, e.shell ? 0.05 : 0.07)
      if (e.section && (o < 0.99 || live.clip < 0.04)) o = 0
      const m = e.mat
      m.opacity += (o - m.opacity) * Math.max(snap, k(e.section ? 12 : 6))
      m.visible = m.opacity > 0.012
      m.depthWrite = m.opacity > 0.6
      if (e.emissive && e.owner !== 'cover') {
        const lit = s.hovered === e.owner ? 0.14 : s.selected === e.owner ? 0.05 : hl?.includes(e.owner as PartId) ? 0.035 : 0
        _col.copy(ACCENT[PART_META[e.owner as PartId].accent]).multiplyScalar(lit * (e.shell ? 1.6 : 1))
        e.emissive.lerp(_col, k(8))
      }
    }
  }, -1)
  return null
}

const FOCUS_DIST: Partial<Record<PartId, number>> = { penstock: 10, spiral: 11, draft: 12, tailrace: 12, runner: 7, gates: 7.5, stay: 8, shaft: 8, rotor: 8, stator: 9 }

function CameraRig() {
  const controls = useRef<any>(null)
  const { camera, size } = useThree()
  const key = useStore((s) => `${s.mode}|${s.step}|${s.replay}|${s.camKey}|${s.explode}`)
  const tween = useRef<gsap.core.Tween | null>(null)
  const intro = useStore((s) => s.mode === 'tour' && s.step === 0)

  // keep the machine centred in the area not covered by the panel
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const desktop = size.width >= 900
    const portrait = size.width / size.height < 0.9
    cam.fov = portrait ? 50 : 34
    const sx = desktop ? Math.min(intro ? 330 : 230, size.width * (intro ? 0.2 : 0.17)) : 0, sy = desktop ? 0 : size.height * 0.2
    cam.setViewOffset(size.width, size.height, -sx, sy, size.width, size.height)
  }, [camera, size, intro])

  useEffect(() => {
    const s = useStore.getState(), v = resolveView(s), ctl = controls.current
    if (!ctl) return
    const t0 = ctl.target.clone(), off0 = camera.position.clone().sub(t0)
    let t1: THREE.Vector3, off1: THREE.Vector3
    if ('focus' in v.cam) {
      const id = v.cam.focus, e = s.explode ? 1 : 0
      t1 = new THREE.Vector3(...ANCHOR[id]).add(new THREE.Vector3(...EXPLODE[id]).multiplyScalar(e))
      if (id === 'runner') t1.y -= 0.1
      off1 = off0.clone().normalize().multiplyScalar(FOCUS_DIST[id] ?? 6)
      if (off1.y < 0.8 && id !== 'draft' && id !== 'tailrace') { off1.y = 1.6; off1.setLength(FOCUS_DIST[id] ?? 6) }
    } else {
      t1 = new THREE.Vector3(...v.cam.target); off1 = new THREE.Vector3(...v.cam.pos).sub(t1).multiplyScalar(CAM_SCALE)
    }
    const portrait = size.width / size.height < 0.9
    if (portrait) off1.multiplyScalar(1.18)
    const d0 = off0.length(), d1 = off1.length()
    const q = new THREE.Quaternion().setFromUnitVectors(off0.clone().normalize(), off1.clone().normalize()), qi = new THREE.Quaternion()
    const p = { t: 0 }
    const apply = () => {
      const e = p.t
      qi.identity().slerp(q, e)
      const off = off0.clone().normalize().applyQuaternion(qi).multiplyScalar(d0 + (d1 - d0) * e)
      ctl.target.lerpVectors(t0, t1, e); camera.position.copy(ctl.target).add(off); ctl.update()
    }
    tween.current?.kill()
    if (s.reduced) { p.t = 1; apply(); return }
    ctl.enabled = false; live.tweening = true
    tween.current = gsap.to(p, { t: 1, duration: 1.7, ease: 'power3.inOut', onUpdate: apply, onComplete: () => { ctl.enabled = true; live.tweening = false } })
    return () => { tween.current?.kill(); ctl.enabled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={2.2} maxDistance={34} rotateSpeed={0.7} zoomSpeed={0.7} />
}

function pick(e: ThreeEvent<PointerEvent | MouseEvent>): PartId | null {
  for (const hit of e.intersections) {
    const m = (hit.object as THREE.Mesh).material as THREE.Material & { opacity: number }
    if (!m || !m.visible || m.opacity < 0.03) continue
    if (live.clip > 0.5 && m.clippingPlanes && hit.point.x < 0 && hit.point.z > 0) continue
    let o: THREE.Object3D | null = hit.object
    while (o && !o.userData.part) o = o.parent
    if (o && o.userData.part !== 'cover') return o.userData.part as PartId
  }
  return null
}

function World() {
  const explore = useStore((s) => s.mode === 'explore')
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!explore || live.tweening) return
    const id = pick(e), s = useStore.getState()
    if (s.hovered !== id) s.set({ hovered: id })
    document.body.style.cursor = id ? 'pointer' : ''
  }
  return (
    <group
      onPointerMove={over}
      onPointerOut={() => { if (explore) { useStore.getState().set({ hovered: null }); document.body.style.cursor = '' } }}
      onClick={(e) => { if (!explore || e.delta > 5) return; const id = pick(e); if (id) { e.stopPropagation(); useStore.getState().select(id) } }}
    >
      <Machine />
      <Water />
    </group>
  )
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export function Scene() {
  const t = useT()
  return (
    <Canvas
      shadows dpr={[1, 1.75]} camera={{ position: [-11, 5.3, 10.3], fov: 34, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.toneMappingExposure = 1.05 }}
      aria-label={t.a11y.canvas} role="img"
    >
      <Director />
      <hemisphereLight args={['#e6eef8', '#16181c', 0.5]} />
      <directionalLight position={[-7, 11, 6]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 1, 40]} />
      </directionalLight>
      <directionalLight position={[7, 3, -7]} intensity={0.7} color="#9fc4ff" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0c0d0f']} />
        <Lightformer intensity={3.2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer intensity={2} position={[-9, 2, 4]} rotation-y={Math.PI / 2} scale={[12, 5, 1]} />
        <Lightformer intensity={1.2} position={[9, 1, -3]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color="#bcd4ff" />
        <Lightformer intensity={0.8} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} color="#ffe7c7" />
      </Environment>
      <World />
      <CameraRig />
    </Canvas>
  )
}
