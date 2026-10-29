/**
 * The parity scene, described once and built by both engines: a ground patch
 * and a grid of boxes, all flat-colored (unlit) so the comparison isolates
 * geometry, camera, precision, anti-aliasing and color pipeline.
 */

const deg = Math.PI / 180;

/** Colors are sRGB in [0, 1], like `Cesium.Color`. */
export type Rgb = [number, number, number];

export interface ParityBox {
  longitude: number;
  latitude: number;
  width: number;
  depth: number;
  height: number;
  color: Rgb;
}

export interface ParityScene {
  ground: {
    west: number;
    south: number;
    east: number;
    north: number;
    segments: number;
    color: Rgb;
  };
  boxes: ParityBox[];
}

export const center = { longitude: -75.1652 * deg, latitude: 39.9526 * deg };

export function parityScene(): ParityScene {
  const half = 0.02 * deg;
  const boxes: ParityBox[] = [];
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      boxes.push({
        longitude: center.longitude + (i - 3.5) * 0.0011 * deg,
        latitude: center.latitude + (j - 3.5) * 0.00085 * deg,
        width: 25 + random() * 30,
        depth: 25 + random() * 30,
        height: 15 + random() ** 2 * 150,
        color: [
          0.3 + random() * 0.6,
          0.3 + random() * 0.6,
          0.3 + random() * 0.6,
        ],
      });
    }
  }
  return {
    ground: {
      west: center.longitude - half,
      south: center.latitude - half,
      east: center.longitude + half,
      north: center.latitude + half,
      segments: 64,
      color: [0.25, 0.3, 0.22],
    },
    boxes,
  };
}

/** Serializable camera state shared by both engines. */
export interface CameraState {
  name: string;
  position: [number, number, number];
  direction: [number, number, number];
  up: [number, number, number];
  fov: number;
}
