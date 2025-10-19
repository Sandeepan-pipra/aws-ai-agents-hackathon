// Scale: 1 unit = 100mm
export const SCALE = 0.01; // Convert mm to units

export const DEFAULTS = {
  bigBox: {
    dimensions: { x: 3000, y: 1500, z: 1500 }, // mm
    position: { x: 0, y: 750, z: 0 }, // mm
    borderColor: '#888888',
    sideColor: '#9fbcd4',
    opacity: 0.1
  },
  innerBox: {
    position: { x: 0, y: 0, z: 0 }, // mm
    size: { x: 400, y: 300, z: 300 }, // mm
    color: '#666666'
  },
  camera: {
    fov: 45,
    near: 0.1,
    far: 1000,
    position: { x: 30, y: 20, z: 40 }
  },
  scene: {
    background: 0xf0f0f0
  },
  materials: {
    metalness: 0.2,
    roughness: 0.7
  }
};

export const toUnits = (mm) => mm * SCALE;
export const toMM = (units) => units / SCALE;
