/** How the CSG sample colours its solid: the face palette's shader, and the colours of a leaf, the selection, a picked face and a hovered one. */
export const PALETTE_WIDTH = 256;
export const PALETTE_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  if (fsInput.featureId < uniforms.base) {
    return;
  }
  // Until the palette has loaded the engine binds a 1 x 1 stand-in, and
  // reading a face's texel from it gives black: the plain colour then.
  if (textureDimensions(palette, 0).x < ${PALETTE_WIDTH}u) {
    return;
  }
  let face = fsInput.featureId - uniforms.base;
  let at = vec2<i32>(i32(face % ${PALETTE_WIDTH}u), i32(face / ${PALETTE_WIDTH}u));
  (*material).baseColor *= textureLoad(palette, at, 0).rgb;
}
`;

/** Linear RGBA of the B-rep edges and the drag preview's wire. */
export const EDGE_COLOR: [number, number, number, number] = [0, 0, 0, 1];
export const PREVIEW_COLOR: [number, number, number, number] = [1, 0.32, 0, 1];
/** Linear RGB of the selection's faces, the picked face and the face under the pointer. */
export const SELECT = [1, 0.01, 0.26] as const;
export const PICK = [1, 0.85, 0.02] as const;
export const HOVER = [0.75, 0.9, 1] as const;

/** A leaf's colour in sRGB hue steps of the golden angle, so neighbours differ. */
function leafHsl(id: number): [number, number, number] {
  return [(id * 137.508) % 360, 0.6, 0.5];
}
export function leafSwatch(id: number): string {
  const [h, s, l] = leafHsl(id);
  return `hsl(${h.toFixed(0)} ${s * 100}% ${l * 100}%)`;
}
/** Linear RGB of a leaf's colour. */
export function leafColour(id: number): [number, number, number] {
  const [h, s, l] = leafHsl(id);
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [f(0), f(8), f(4)];
}
