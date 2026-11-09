// The background: the Milky Way layer from the equirectangular map onto six
// cube faces (the star map's order and orientation, rows down the image),
// in absolute cd/m², with box-filtered levels.
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  boxLevels,
  cubeDirection,
} from "../../src/atmosphere/stars.ts";

const LUM = [0.2126, 0.7152, 0.0722];

/**
 * Cd/m² per unit of the map: a star of flux F and magnitude m gives
 * `MAGNITUDE_ZERO_ILLUMINANCE × F / faintConstant` lux, spread over a texel's
 * solid angle at the equator. `share` is the star map's part of this layer
 * (0.5, from the layer relation the star spike found).
 */
export function backgroundScale(faintConstant, width, share = 0.5) {
  return (
    ((share / faintConstant) * MAGNITUDE_ZERO_ILLUMINANCE) /
    ((2 * Math.PI) / width) ** 2
  );
}

/** The sky's mean luminance of the layer (weighted by solid angle), cd/m². */
export function meanLuminance(layer, scale) {
  const { width: W, height: H, channels } = layer;
  let sum = 0;
  let weight = 0;
  for (let y = 0; y < H; y++) {
    const c = Math.cos((Math.PI / 2) * (1 - ((y + 0.5) / H) * 2));
    let row = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      row +=
        LUM[0] * channels.R[i] +
        LUM[1] * channels.G[i] +
        LUM[2] * channels.B[i];
    }
    sum += row * c;
    weight += W * c;
  }
  return (sum / weight) * scale;
}

/**
 * @param {{width: number, height: number, channels: Record<string, Float32Array>}} layer
 * @returns {Float32Array[][]} by face, then level, rgba.
 */
export function buildBackground(layer, size, levels, scale) {
  const { width: W, height: H, channels } = layer;
  const SS = 2;
  const faces = [];
  for (let f = 0; f < 6; f++) {
    const base = new Float32Array(size * size * 4);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const acc = [0, 0, 0];
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const u = ((i + (sx + 0.5) / SS) / size) * 2 - 1;
            const v = ((j + (sy + 0.5) / SS) / size) * 2 - 1;
            const [x, y, z] = cubeDirection(f, u, v);
            const r = Math.hypot(x, y, z);
            const ra = Math.atan2(y, x);
            const de = Math.asin(z / r);
            const px = (0.5 - ra / (2 * Math.PI)) * W - 0.5;
            const py = (0.5 - de / Math.PI) * H - 0.5;
            const x0f = Math.floor(px);
            const y0 = Math.min(Math.max(Math.floor(py), 0), H - 2);
            const fx = px - x0f;
            const fy = Math.min(Math.max(py - y0, 0), 1);
            const x0 = ((x0f % W) + W) % W;
            const x1 = (x0 + 1) % W;
            for (let c = 0; c < 3; c++) {
              const m = channels["RGB"[c]];
              acc[c] +=
                (m[y0 * W + x0] * (1 - fx) + m[y0 * W + x1] * fx) * (1 - fy) +
                (m[(y0 + 1) * W + x0] * (1 - fx) + m[(y0 + 1) * W + x1] * fx) *
                  fy;
            }
          }
        }
        const o = (j * size + i) * 4;
        for (let c = 0; c < 3; c++) {
          base[o + c] = (acc[c] / (SS * SS)) * scale;
        }
        base[o + 3] = 1;
      }
    }
    faces.push(boxLevels(base, size).slice(0, levels));
  }
  return faces;
}

const halfScratch = new DataView(new ArrayBuffer(4));

/** A float as half-float bits (round to nearest, clamped to the half range). */
export function floatToHalf(value) {
  halfScratch.setFloat32(0, value);
  const x = halfScratch.getUint32(0);
  const sign = (x >>> 16) & 0x8000;
  const exponent = ((x >>> 23) & 0xff) - 127 + 15;
  const mantissa = x & 0x7fffff;
  if (exponent >= 31) {
    return sign | 0x7bff;
  }
  if (exponent <= 0) {
    if (exponent < -10) {
      return sign;
    }
    return (
      sign | ((((mantissa | 0x800000) >>> (1 - exponent)) + 0x1000) >>> 13)
    );
  }
  return sign | (exponent << 10) | ((mantissa + 0x1000) >>> 13);
}
