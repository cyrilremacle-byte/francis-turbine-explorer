/**
 * Physical calculation logic. Pure functions, no UI or 3D dependencies.
 *
 * VERIFIED: P = rho * g * Q * H_net * eta  (hydropower equation; see INL HydroGenerate, NPTEL).
 * ILLUSTRATIVE: the gate-opening -> flow relationship and the fixed efficiency below.
 */
export const RHO = 1000 // kg/m^3, fresh water (approx.)
export const G = 9.81 // m/s^2

/** Illustrative assumption: fixed combined turbine-generator efficiency. Not a measured value. */
export const ETA_ASSUMED = 0.9

/** Reference point of the illustrative unit: full gate opening at 100 m net head passes 20 m^3/s. */
export const H_REF = 100 // m
export const Q_REF = 20 // m^3/s
export const HEAD_MIN = 10 // m  (Francis range quoted by Hydro-Quebec: 10 to 300 m)
export const HEAD_MAX = 300 // m

/** Electrical power in watts. */
export function electricalPowerW(q: number, hNet: number, eta: number = ETA_ASSUMED): number {
  if (!(q > 0) || !(hNet > 0) || !(eta > 0)) return 0
  return RHO * G * q * hNet * eta
}

/** Hydraulic power available in the water, in watts (eta = 1). */
export function hydraulicPowerW(q: number, hNet: number): number {
  return electricalPowerW(q, hNet, 1)
}

/**
 * Simplified educational approximation, NOT a turbine characteristic:
 * the distributor is treated like an orifice whose area is proportional to gate opening,
 * so Q scales linearly with opening and with the square root of net head.
 * Real machines follow turbine-specific performance (hill) curves.
 */
export function flowFromGate(opening: number, hNet: number): number {
  const a = Math.min(1, Math.max(0, opening))
  if (a === 0 || !(hNet > 0)) return 0
  return Q_REF * a * Math.sqrt(hNet / H_REF)
}

/** Synchronous speed in rpm: n = 120 f / poles. VERIFIED relation (grid frequency fixes speed). */
export function synchronousRpm(frequencyHz: number, poles: number): number {
  return (120 * frequencyHz) / poles
}

export interface OperatingPoint {
  opening: number; hNet: number; q: number; eta: number
  hydraulicMW: number; electricalMW: number; lossesMW: number
}

export function operatingPoint(opening: number, hNet: number): OperatingPoint {
  const q = flowFromGate(opening, hNet)
  const hyd = hydraulicPowerW(q, hNet) / 1e6
  const el = electricalPowerW(q, hNet, ETA_ASSUMED) / 1e6
  return { opening, hNet, q, eta: ETA_ASSUMED, hydraulicMW: hyd, electricalMW: el, lossesMW: hyd - el }
}
