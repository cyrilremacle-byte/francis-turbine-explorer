import type { PartId } from '../scene/layout'

export const SOURCES = {
  hqUnit: { label: 'Hydro-Québec, Turbine-generator units', url: 'https://hydroquebec.com/learning/hydroelectricite/turbine-alternateur.html' },
  hqTypes: { label: 'Hydro-Québec, Types de turbines', url: 'https://hydroquebec.com/comprendre/hydroelectricite/types-turbines.html' },
  doe: { label: 'U.S. Department of Energy, Types of hydropower turbines', url: 'https://www.energy.gov/cmei/water/types-hydropower-turbines' },
  nptel: { label: 'NPTEL, Francis turbine fundamentals', url: 'https://archive.nptel.ac.in/content/storage2/courses/112104117/chapter_7/7_7.html' },
  inl: { label: 'Idaho National Laboratory, HydroGenerate: hydropower theory', url: 'https://idaholabresearch.github.io/HydroGenerate/Theory_1_Hydropower.html' },
} as const
export type SourceId = keyof typeof SOURCES

export const STUDIED = [
  { label: 'MECHLAB', url: 'https://github.com/thebuggeddev/mechlab' },
  { label: 'Exploded Lens', url: 'https://github.com/wonjyou/exploded-lens' },
  { label: 'Blueprint 3D Sheet', url: 'https://github.com/lubocsu/blueprint-3d-sheet' },
  { label: 'CAD Power Animations', url: 'https://github.com/gordensun/cad-power-animations' },
  { label: 'React Three Fiber examples', url: 'https://github.com/pmndrs/react-three-fiber/blob/master/docs/getting-started/examples.mdx' },
  { label: 'Energy Education, Francis turbine model', url: 'https://energyeducation.ca/3dmodels/Francis_Turbine/' },
]

export type Motion = 'fixed' | 'rotates' | 'adjustable' | 'flows'
export const PART_META: Record<PartId, { source: SourceId; motion: Motion; accent: 'water' | 'mech' | 'elec' }> = {
  penstock: { source: 'hqUnit', motion: 'flows', accent: 'water' },
  spiral: { source: 'nptel', motion: 'fixed', accent: 'water' },
  stay: { source: 'nptel', motion: 'fixed', accent: 'water' },
  gates: { source: 'nptel', motion: 'adjustable', accent: 'mech' },
  runner: { source: 'doe', motion: 'rotates', accent: 'mech' },
  shaft: { source: 'hqUnit', motion: 'rotates', accent: 'mech' },
  rotor: { source: 'hqUnit', motion: 'rotates', accent: 'elec' },
  stator: { source: 'hqUnit', motion: 'fixed', accent: 'elec' },
  draft: { source: 'nptel', motion: 'fixed', accent: 'water' },
  tailrace: { source: 'hqTypes', motion: 'flows', accent: 'water' },
}
