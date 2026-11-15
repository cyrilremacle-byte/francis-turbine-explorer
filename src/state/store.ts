/** Shared interaction state (UI-facing). Per-frame animation values live in live.ts. */
import { create } from 'zustand'
import type { PartId } from '../scene/layout'

export type Mode = 'tour' | 'explore' | 'control'
export type Preset = 'iso' | 'top' | 'side' | 'section'
export const LAST_CHAPTER = 6
export const QUIZ_STEP = 7

interface State {
  lang: 'en' | 'fr'
  mode: Mode
  step: number            // tour: 0 intro, 1..6 chapters, 7 quiz
  replay: number
  selected: PartId | null
  hovered: PartId | null
  cutaway: boolean; xray: boolean; explode: boolean; water: boolean; labels: boolean
  playing: boolean; vizSpeed: number
  preset: Preset; camKey: number
  opening: number; head: number
  sourcesOpen: boolean
  quizIndex: number; quizPicks: (number | null)[]
  reduced: boolean
  set: (p: Partial<State>) => void
  setMode: (m: Mode) => void
  goStep: (n: number) => void
  select: (p: PartId | null) => void
  setPreset: (p: Preset) => void
  focusPart: (p: PartId) => void
}

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const useStore = create<State>((set) => ({
  lang: 'en', mode: 'tour', step: 0, replay: 0, selected: null, hovered: null,
  cutaway: true, xray: false, explode: false, water: true, labels: true,
  playing: true, vizSpeed: 1, preset: 'iso', camKey: 0,
  opening: 1, head: 100, sourcesOpen: false, reduced, quizIndex: 0, quizPicks: [null, null, null, null],
  set: (p) => set(p),
  setMode: (mode) => set((s) => ({ mode, selected: null, hovered: null, camKey: s.camKey + 1, preset: 'iso' })),
  goStep: (n) => set((s) => ({ step: Math.max(0, Math.min(QUIZ_STEP, n)), replay: s.replay + 1, selected: null })),
  select: (p) => set((s) => ({ selected: p, camKey: s.camKey + 1 })),
  setPreset: (preset) => set((s) => ({ preset, selected: null, camKey: s.camKey + 1, cutaway: preset === 'section' ? true : s.cutaway })),
  focusPart: (p) => set((s) => ({ mode: 'explore', selected: p, explode: false, camKey: s.camKey + 1 })),
}))
