import type { GltfLight } from "./gltfTypes.ts";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * A `KHR_lights_punctual` light at a node (its world matrix, glTF space):
 * point and spot lights in candela. Directional lights (lux) are skipped:
 * the sun is the scene's.
 */
export function readLight(
  def: Json,
  matrix: Float64Array,
  warnings: string[],
): GltfLight | undefined {
  if (!def || (def.type !== "point" && def.type !== "spot")) {
    if (def?.type === "directional") {
      warnings.push("skipped a directional light (the sun lights the scene)");
    }
    return undefined;
  }
  const [r = 1, g = 1, b = 1] = def.color ?? [];
  return {
    type: def.type,
    color: [r, g, b],
    intensity: def.intensity ?? 1,
    ...(typeof def.range === "number" && def.range > 0
      ? { range: def.range }
      : {}),
    ...(def.type === "spot"
      ? {
          innerConeAngle: def.spot?.innerConeAngle ?? 0,
          outerConeAngle: def.spot?.outerConeAngle ?? Math.PI / 4,
        }
      : {}),
    matrix,
  };
}
