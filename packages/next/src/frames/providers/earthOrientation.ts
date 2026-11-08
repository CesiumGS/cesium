// The Earth orientation provider: ITRF's precise edge from GCRF (plan 5a,
// ruling 1), from the EOP table and the leap-second table. The catalog
// reaches this module only by dynamic `import()`, so its IAU 2006/2000A
// series and the EOP parser load only when someone asks for ITRF at
// "precise".
import {
  leapSecondsFrom,
  loadFrameRoles,
  stalenessWarnings,
  type FrameData,
  type FrameDataLoadOptions,
  type FrameDataWarning,
} from "../../ephemeris/loadFrameData.ts";
import { EarthOrientationParameters } from "../../time/eop.ts";
import type { LeapSeconds } from "../../time/leapSeconds.ts";
import { itrfAccuracy, itrfEdge, type PreciseEdge } from "../edges.ts";

/** What the Earth orientation provider gives the catalog. */
export interface EarthOrientation {
  readonly leapSeconds: LeapSeconds;
  readonly eop: EarthOrientationParameters;
  /** Staleness notices (`stalenessWarnings`) at the time it loaded. */
  readonly warnings: readonly FrameDataWarning[];
  readonly edges: { readonly ITRF: PreciseEdge };
}

/** The provider over data already in hand (no fetch, no warnings added). */
export function earthOrientationFrom(
  data: Pick<FrameData, "eop" | "leapSeconds">,
): EarthOrientation {
  return {
    leapSeconds: data.leapSeconds,
    eop: data.eop,
    warnings: [],
    edges: {
      ITRF: {
        toParent: itrfEdge(data),
        accuracy: (instant) => itrfAccuracy(data, instant),
      },
    },
  };
}

/**
 * Load the EOP table and the leap-second table from the store at `baseUrl`
 * (roles `eop` and `leapSeconds`, nothing else), and build ITRF's edge.
 */
export async function loadEarthOrientation(
  baseUrl: string,
  options: FrameDataLoadOptions,
): Promise<EarthOrientation> {
  const { eop, leapSeconds } = await loadFrameRoles(
    baseUrl,
    ["eop", "leapSeconds"],
    options,
  );
  const data = {
    leapSeconds: leapSecondsFrom(leapSeconds),
    eop: EarthOrientationParameters.fromCelestrakCsv(
      new TextDecoder().decode(eop),
    ),
  };
  return {
    ...earthOrientationFrom(data),
    warnings: stalenessWarnings(data.leapSeconds, data.eop, Date.now()),
  };
}
