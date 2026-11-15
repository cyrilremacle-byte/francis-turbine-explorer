/** Mutable per-frame animation state, shared by the 3D scene without triggering React renders. */
export const live = {
  opening: 0.85,   // smoothed wicket gate opening actually shown (0..1)
  demo: 0.85,      // gate opening driven by the tour's chapter 3 animation
  flow: 0.85,      // relative flow used by the water visualisation
  angle: 0,        // runner / shaft / rotor angle (rad). One rigid rotating assembly.
  spin: 1,         // 1 = synchronous speed, 0 = standstill
  explode: 0, clip: 0,
  power: 0.8,      // electrical output relative to the reference point, drives the winding glow
  tweening: false,
}
/** Visual angular speed at 1x. Deliberately slow so the motion can be read; NOT turbine rpm. */
export const VIS_OMEGA = 1.7
