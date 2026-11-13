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
 * What a globe's terrain tiles carry under a height-scale warp that has a
 * ceiling (`HeightScale.profile`): per vertex `(n̂, h)`, 4 components, the
 * ellipsoid's unit normal and the signed geodetic height in metres (negative
 * below the ellipsoid). The displacement is then `D(h)·n̂` for the profile's
 * `D`, which is not `h` times anything, so `h·n̂` would not do (n̂ cannot be
 * recovered from it at h = 0, nor the sign of h from its length). A tile
 * carries this or `HEIGHT_NORMAL_ATTRIBUTE`, whichever the warp asked for.
 */
export const HEIGHT_PROFILE_ATTRIBUTE = "_HEIGHT_PROFILE";

/** What a tile is asked to carry: `h·n̂` (`true`) or `(n̂, h)` for a profile (`"profile"`). */
export type HeightNormalMode = true | "profile";

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
      /** The tile carries `(n̂, h)` (`HEIGHT_PROFILE_ATTRIBUTE`), not `h·n̂`: `maxDistance` is then the largest |h|. */
      readonly profile?: true;
    }
  | undefined {
  let longest = -1;
  let profile = false;
  for (const mesh of asset.meshes) {
    const normal = mesh.attributes?.[HEIGHT_NORMAL_ATTRIBUTE]?.data;
    if (normal) {
      for (let i = 0; i + 2 < normal.length; i += 3) {
        longest = Math.max(
          longest,
          Math.hypot(normal[i]!, normal[i + 1]!, normal[i + 2]!),
        );
      }
    }
    const up = mesh.attributes?.[HEIGHT_PROFILE_ATTRIBUTE]?.data;
    if (up) {
      profile = true;
      for (let i = 0; i + 3 < up.length; i += 4) {
        longest = Math.max(longest, Math.abs(up[i + 3]!));
      }
    }
  }
  if (longest < 0) {
    return undefined;
  }
  const radii = Ellipsoid.WGS84.radii;
  return {
    radii: [radii[0]!, radii[1]!, radii[2]!],
    maxDistance: longest,
    ...(profile && { profile: true as const }),
  };
}
