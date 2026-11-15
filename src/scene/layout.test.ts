import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { SPIRAL_END, bandCurve, crownCurve, draftR, gateAngle, runnerPoint, spiralA, DT_LEN, bladeTheta } from './layout'
import { en } from '../i18n/en'
import { fr } from '../i18n/fr'

describe('machine geometry', () => {
  it('spiral casing section never grows along the scroll', () => {
    for (let p = 0.1; p < SPIRAL_END; p += 0.1) expect(spiralA(p)).toBeLessThanOrEqual(spiralA(p - 0.1))
    expect(spiralA(SPIRAL_END)).toBeLessThan(spiralA(0) * 0.5)
  })
  it('runner passage: enters radially at the rim, leaves axially near the axis', () => {
    const a = runnerPoint(0, 0.5, 0, new Vector3()), b = runnerPoint(1, 0.5, 0, new Vector3())
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(1, 5)
    expect(Math.hypot(b.x, b.z)).toBeLessThan(0.72)
    expect(b.y).toBeLessThan(a.y - 0.5)
    // meridional direction at inlet is mostly radial, at outlet mostly axial
    const c0 = crownCurve(0), c1 = crownCurve(0.05), e0 = bandCurve(0.95), e1 = bandCurve(1)
    expect(Math.abs(c1[0] - c0[0])).toBeGreaterThan(Math.abs(c1[1] - c0[1]) * 5)
    expect(Math.abs(e1[1] - e0[1])).toBeGreaterThan(Math.abs(e1[0] - e0[0]) * 5)
  })
  it('runner blades are fixed: their shape has no dependence on gate opening or time', () => {
    expect(bladeTheta.length).toBe(2); expect(runnerPoint.length).toBeLessThanOrEqual(4)
  })
  it('wicket gate angle increases monotonically with opening', () => {
    for (let o = 0.1; o <= 1; o += 0.1) expect(gateAngle(o)).toBeGreaterThan(gateAngle(o - 0.1))
  })
  it('draft tube is a diffuser: section grows from throat to outlet', () => {
    for (let s = 0.6; s < DT_LEN; s += 0.3) expect(draftR(s)).toBeGreaterThan(draftR(s - 0.15))
  })
})

describe('translations', () => {
  const shape = (o: any): any => Array.isArray(o) ? o.map(shape) : typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, shape(o[k])])) : typeof o
  it('EN and FR have identical structure and no empty strings', () => {
    expect(shape(fr)).toEqual(shape(en))
    const walk = (o: any) => { for (const v of Object.values(o)) typeof v === 'string' ? expect(v.trim().length).toBeGreaterThan(0) : walk(v) }
    walk(en); walk(fr)
  })
  it('six chapters, four quiz questions', () => {
    expect(en.tour.steps.length).toBe(6); expect(fr.tour.steps.length).toBe(6)
    expect(en.quiz.items.length).toBe(4); expect(fr.quiz.items.length).toBe(4)
  })
  it('no em dashes in copy', () => { expect(JSON.stringify(en) + JSON.stringify(fr)).not.toMatch(/—/) })
})
