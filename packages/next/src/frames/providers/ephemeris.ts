// The ephemeris provider: the precise edges of GCRF, EARTH_ICRF, HCRS,
// MOON_ICRF (plan 5a, ruling 1) and MOON_ME, from DE440 and the lunar PCK.
// `Ephemeris.fromPacks` takes both packs, so they load together (plan 5a's
// call 10). The catalog reaches this module only by dynamic `import()`.
import { Ephemeris } from "../../ephemeris/Ephemeris.ts";
import {
  loadFrameRoles,
  type FrameDataLoadOptions,
} from "../../ephemeris/frameRoles.ts";
import type { Instant } from "../../time/Instant.ts";
import { bodyEdge, gcrfEdge, moonMeEdge, type PreciseEdge } from "../edges.ts";
import { BUILT_IN_ACCURACY } from "../frameAccuracy.ts";

/** The reference frames whose edges the ephemeris provides. */
export type EphemerisFrameName =
  "GCRF" | "EARTH_ICRF" | "HCRS" | "MOON_ICRF" | "MOON_ME";

/** What the ephemeris provider gives the catalog. */
export interface EphemerisFrames {
  readonly ephemeris: Ephemeris;
  readonly edges: { readonly [N in EphemerisFrameName]: PreciseEdge };
}

/** The provider over an ephemeris already in hand. */
export function ephemerisFrom(ephemeris: Ephemeris): EphemerisFrames {
  const data = { ephemeris };
  const covers = (instant: Instant) => ephemeris.contains(instant);
  return {
    ephemeris,
    edges: {
      GCRF: {
        toParent: gcrfEdge(data),
        accuracy: BUILT_IN_ACCURACY.GCRF,
        covers,
      },
      EARTH_ICRF: {
        toParent: bodyEdge("EARTH_ICRF", data),
        accuracy: BUILT_IN_ACCURACY.EARTH_ICRF,
        covers,
      },
      HCRS: {
        toParent: bodyEdge("HCRS", data),
        accuracy: BUILT_IN_ACCURACY.HCRS,
        covers,
      },
      MOON_ICRF: {
        toParent: bodyEdge("MOON_ICRF", data),
        accuracy: BUILT_IN_ACCURACY.MOON_ICRF,
        covers,
      },
      MOON_ME: {
        toParent: moonMeEdge(data),
        accuracy: BUILT_IN_ACCURACY.MOON_ME,
        covers,
      },
    },
  };
}

/** Load the planets and Moon packs from the store at `baseUrl` (roles `planets` and `moon`). */
export async function loadEphemeris(
  baseUrl: string,
  options: FrameDataLoadOptions,
): Promise<EphemerisFrames> {
  const { planets, moon } = await loadFrameRoles(
    baseUrl,
    ["planets", "moon"],
    options,
  );
  return ephemerisFrom(Ephemeris.fromPacks(planets!, moon!));
}
