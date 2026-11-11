import { Ellipsoid } from "../math/ellipsoid.ts";

/**
 * The vertex attribute a terrain tile carries when its globe is drawn under
 * a height-scale warp (`HeightScale`, camera/route.ts): per vertex `h·n̂`, the
 * geodetic height times the ellipsoid's normal there, in metres, so that
 * scaling heights by k is the displacement `(k − 1)·h·n̂`, exact and with no
 * fit (plan §13.26, the owner's answer 3: terrain keeps (u, v, h)).
 */
export const HEIGHT_NORMAL_ATTRIBUTE = "_HEIGHT_NORMAL";

/**
 * What a decoded terrain tile says of its `h·n̂` attribute: the ellipsoid
 * it was made on (WGS84) and the longest vector it holds. Undefined for a
 * tile without the attribute.
 */
export function heightNormalInfo(asset: {
  readonly meshes: ReadonlyArray<{
    readonly attributes?: Readonly<
      Record<string, { readonly data: Float32Array }>
    >;
  }>;
}):
  | {
      readonly radii: readonly [number, number, number];
      readonly maxDistance: number;
    }
  | undefined {
  let longest = -1;
  for (const mesh of asset.meshes) {
    const data = mesh.attributes?.[HEIGHT_NORMAL_ATTRIBUTE]?.data;
    if (!data) {
      continue;
    }
    for (let i = 0; i + 2 < data.length; i += 3) {
      longest = Math.max(
        longest,
        Math.hypot(data[i]!, data[i + 1]!, data[i + 2]!),
      );
    }
  }
  if (longest < 0) {
    return undefined;
  }
  const radii = Ellipsoid.WGS84.radii;
  return { radii: [radii[0]!, radii[1]!, radii[2]!], maxDistance: longest };
}
