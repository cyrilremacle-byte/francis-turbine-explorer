import { describe, expect, it } from 'vitest'
import { electricalPowerW, flowFromGate, operatingPoint, synchronousRpm, hydraulicPowerW } from './hydro'

describe('hydropower equation', () => {
  it('100 m, 20 m3/s, 0.90 -> 17.658 MW', () => {
    expect(electricalPowerW(20, 100, 0.9) / 1e6).toBeCloseTo(17.658, 3)
  })
  it('zero flow gives zero power', () => {
    expect(electricalPowerW(0, 100, 0.9)).toBe(0)
    expect(operatingPoint(0, 150).electricalMW).toBe(0)
    expect(operatingPoint(0, 150).q).toBe(0)
  })
  it('power is linear in head at constant flow', () => {
    expect(hydraulicPowerW(20, 200)).toBeCloseTo(2 * hydraulicPowerW(20, 100), 6)
  })
  it('reference point: full gate at 100 m passes 20 m3/s', () => {
    expect(flowFromGate(1, 100)).toBeCloseTo(20, 9)
    expect(operatingPoint(1, 100).electricalMW).toBeCloseTo(17.658, 3)
  })
  it('gate opening is clamped and monotonic', () => {
    expect(flowFromGate(-1, 100)).toBe(0)
    expect(flowFromGate(2, 100)).toBeCloseTo(20, 9)
    expect(flowFromGate(0.5, 100)).toBeLessThan(flowFromGate(0.6, 100))
  })
  it('losses = hydraulic - electrical', () => {
    const p = operatingPoint(0.7, 120)
    expect(p.lossesMW).toBeCloseTo(p.hydraulicMW * 0.1, 9)
  })
  it('synchronous speed: 24 poles at 60 Hz = 300 rpm; 64 poles = 112.5 rpm', () => {
    expect(synchronousRpm(60, 24)).toBe(300)
    expect(synchronousRpm(60, 64)).toBe(112.5)
  })
})
