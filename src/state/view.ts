/** Resolves the shared UI state into what the 3D scene should show: camera, cut, highlights. */
import type { PartId } from '../scene/layout'
import type { Preset } from './store'
import { useStore } from './store'

type V3 = [number, number, number]
export interface View {
  clip: boolean; xray: boolean; explode: boolean; water: boolean
  highlight: PartId[] | null
  hide: string[]
  labels: PartId[] | 'all' | null
  cam: { pos: V3; target: V3 } | { focus: PartId }
  demo: boolean
}
interface StepView { cam: { pos: V3; target: V3 }; clip: boolean; highlight: PartId[] | null; hide?: string[]; demo?: boolean }

const HERO = { pos: [-7.6, 3.5, 7.6] as V3, target: [0, -0.5, -0.7] as V3 }
/** Camera angle, cut and highlight for the intro (0), the six chapters (1..6) and the quiz (7). */
export const STEP_VIEWS: StepView[] = [
  { cam: HERO, clip: true, highlight: null },
  { cam: { pos: [7.4, 2.6, 8.6], target: [1.7, 0.1, 2.0] }, clip: false, highlight: ['penstock'] },
  { cam: { pos: [-1.6, 9.6, 3.4], target: [0.25, 0, -0.1] }, clip: true, highlight: ['spiral'], hide: ['rotor', 'stator', 'shaft', 'cover'] },
  { cam: { pos: [-2.9, 3.9, 3.3], target: [0, 0.15, 0] }, clip: false, highlight: ['gates', 'stay'], hide: ['rotor', 'stator', 'shaft', 'cover'], demo: true },
  { cam: { pos: [-3.3, 0.9, 3.5], target: [0, -0.15, 0] }, clip: true, highlight: ['runner'], hide: ['cover'] },
  { cam: { pos: [-4.9, 5.4, 5.1], target: [0, 2.3, 0] }, clip: true, highlight: ['shaft', 'rotor', 'stator'] },
  { cam: { pos: [-9.2, -1.4, 2.6], target: [0, -2.7, -3.2] }, clip: true, highlight: ['draft', 'tailrace'] },
  { cam: HERO, clip: true, highlight: null },
]
const PRESETS: Record<Preset, { pos: V3; target: V3 }> = {
  iso: HERO,
  top: { pos: [0.01, 15, 0.6], target: [0.3, 0, -1.4] },
  side: { pos: [-14, 0.4, -1.4], target: [0, -0.5, -1.4] },
  section: { pos: [-6.2, 1.4, 6.2], target: [0, 0.4, 0] },
}
const EXPLODED = { pos: [-13.5, 5, 15.5] as V3, target: [0, 1.2, -0.8] as V3 }
const CONTROL = { pos: [-5.4, 3.4, 5.6] as V3, target: [0, 0.35, 0] as V3 }

type S = ReturnType<typeof useStore.getState>
export function resolveView(s: S): View {
  if (s.mode === 'tour') {
    const v = STEP_VIEWS[s.step]
    return { clip: v.clip, xray: false, explode: false, water: true, highlight: v.highlight, hide: v.hide ?? [], labels: v.highlight, cam: v.cam, demo: !!v.demo }
  }
  if (s.mode === 'control') {
    return { clip: true, xray: false, explode: false, water: true, highlight: null, hide: [], labels: null, cam: CONTROL, demo: false }
  }
  return {
    clip: s.cutaway, xray: s.xray, explode: s.explode, water: s.water,
    highlight: s.selected ? [s.selected] : null, hide: [],
    labels: s.labels ? (s.selected ? [s.selected] : 'all') : null,
    cam: s.selected ? { focus: s.selected } : s.explode ? EXPLODED : PRESETS[s.preset], demo: false,
  }
}
