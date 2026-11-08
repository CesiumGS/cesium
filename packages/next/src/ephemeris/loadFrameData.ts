import type { LoadProgress } from "../io/readWithProgress.ts";
import { EarthOrientationParameters } from "../time/eop.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";
import { Ephemeris } from "./Ephemeris.ts";
import {
  FRAME_DATA_ROLES,
  leapSecondsFrom,
  loadFrameRoles,
  stalenessWarnings,
  type FrameDataLoadOptions,
  type FrameDataWarning,
} from "./frameRoles.ts";

export {
  FRAME_DATA_ROLES,
  leapSecondsFrom,
  loadFrameRoles,
  stalenessWarnings,
  type FrameDataLoadOptions,
  type FrameDataRole,
  type FrameDataWarning,
} from "./frameRoles.ts";

/** Everything the frames layer needs, loaded from the store `npm run setup` fills. */
export interface FrameData {
  /**
   * The store's `Leap_Second.dat` when it expires after the built-in table
   * (`LeapSeconds.builtIn()`, NAIF naif0012.tls); otherwise, or when the store
   * has none, the built-in table.
   */
  leapSeconds: LeapSeconds;
  eop: EarthOrientationParameters;
  ephemeris: Ephemeris;
  /**
   * Staleness notices: the leap-second table is past its expiry, or the EOP
   * table ends before now so its samples are degraded. Empty when current.
   */
  warnings: FrameDataWarning[];
}

/**
 * Load the Earth orientation parameters, ephemeris and leap-second table that
 * `npm run setup` wrote: every role, through `loadFrameRoles`. Rejects with a
 * message saying to run setup when the store is missing or incomplete. The
 * leap-second table is the store's only when it expires after the built-in one.
 *
 * Data past its validity is not an error here (an instant outside the data is
 * handled where it is used), but `warnings` says so, and each warning is also
 * logged once.
 *
 * `options` is a `FrameDataLoadOptions`; a bare `LoadProgress` function still
 * works. `onProgress` is called as each role file arrives, by its file name,
 * with the bytes received and the response's `Content-Length` (R9).
 */
export async function loadFrameData(
  baseUrl = "/frames-data/",
  options: FrameDataLoadOptions | LoadProgress = {},
): Promise<FrameData> {
  const {
    planets,
    moon,
    eop,
    leapSeconds: leap,
  } = await loadFrameRoles(
    baseUrl,
    FRAME_DATA_ROLES,
    typeof options === "function" ? { onProgress: options } : options,
  );
  const leapSeconds = leapSecondsFrom(leap);
  const earthOrientation = EarthOrientationParameters.fromCelestrakCsv(
    new TextDecoder().decode(eop),
  );
  const ephemeris = Ephemeris.fromPacks(planets!, moon!);
  const warnings = stalenessWarnings(leapSeconds, earthOrientation, Date.now());
  for (const warning of warnings) {
    console.warn(warning.message);
  }
  return { leapSeconds, eop: earthOrientation, ephemeris, warnings };
}
