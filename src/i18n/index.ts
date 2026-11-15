import { en, type Dict } from './en'
import { fr } from './fr'
import { useStore } from '../state/store'

export type Lang = 'en' | 'fr'
export const dicts: Record<Lang, Dict> = { en, fr }
export const useT = (): Dict => dicts[useStore((s) => s.lang)]
export function fmt(n: number, lang: Lang, digits = 1) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}
