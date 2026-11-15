/** Materials, the shared cutaway planes, and the registry the MaterialDirector animates. */
import * as THREE from 'three'
import type { PartId } from './layout'

export type Owner = PartId | 'cover'
export const ACCENT = { water: new THREE.Color('#46d3ff'), mech: new THREE.Color('#ffae42'), elec: new THREE.Color('#7f86ff') }

/** Cutaway: the quadrant x < 0, z > 0 is removed when both planes clip (clipIntersection). */
export const clipPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 8), new THREE.Plane(new THREE.Vector3(0, 0, -1), 8)]

export interface Entry {
  mat: THREE.Material & { opacity: number }
  owner: Owner
  base: number        // resting opacity
  shell: boolean      // translucent water passage
  xr: boolean         // fades in X-ray mode
  section: boolean    // back-face cap, only visible while cut
  emissive?: THREE.Color
}
export const registry: Entry[] = []

const KINDS = {
  shell: { color: '#8497ab', metalness: 0.3, roughness: 0.18 },
  steel: { color: '#8b929c', metalness: 0.75, roughness: 0.42 },
  dark: { color: '#4a5059', metalness: 0.7, roughness: 0.5 },
  bright: { color: '#cfd4da', metalness: 0.95, roughness: 0.26 },
  gate: { color: '#b9bec6', metalness: 0.9, roughness: 0.34 },
  copper: { color: '#c9824c', metalness: 1, roughness: 0.36 },
  concrete: { color: '#3b3e44', metalness: 0, roughness: 0.95 },
  water: { color: '#2f93cf', metalness: 0.1, roughness: 0.08 },
  white: { color: '#ffffff', metalness: 0.85, roughness: 0.35 },
}
export function mat(owner: Owner, kind: keyof typeof KINDS, o: { clip?: boolean; shell?: boolean; xr?: boolean; base?: number } = {}) {
  const shell = !!o.shell
  const m = new THREE.MeshStandardMaterial({
    ...KINDS[kind], transparent: true, opacity: o.base ?? (shell ? 0.17 : 1),
    side: shell ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: 1.0,
  })
  if (o.clip) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; m.clipShadows = true }
  registry.push({ mat: m, owner, base: o.base ?? (shell ? 0.17 : 1), shell, xr: !!o.xr || shell, section: false, emissive: m.emissive })
  return m
}
/** Flat back-face material: makes a clipped closed solid read as a cut section. */
export function sectionMat(owner: Owner, color = '#2b2f36') {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, clippingPlanes: clipPlanes, clipIntersection: true })
  registry.push({ mat: m, owner, base: 1, shell: false, xr: true, section: true })
  return m
}
export function basicMat(owner: Owner, o: Partial<THREE.MeshBasicMaterialParameters> = {}, base = 1, xr = false) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, ...o })
  registry.push({ mat: m, owner, base, shell: false, xr, section: false })
  return m
}
