// A FrameData over synthetic packs for the frame tree's unit tests. Positions
// and angles are meaningless; the span is TDB [INIT, INIT + COUNT * LEN].
import { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../src/ephemeris/loadFrameData.ts";
import type { EarthOrientationParameters, EopSample } from "../src/time/eop.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { pack } from "./syntheticPacks.ts";

const buffer = (u8: Uint8Array): ArrayBuffer =>
  u8.slice().buffer as ArrayBuffer;

/** An EOP sample with realistic-size values, the default for the stub. */
export const SAMPLE: EopSample = {
  ut1MinusUtc: 0.1,
  ut1MinusTai: 0.1 - 37,
  xp: 1e-7,
  yp: 2e-7,
  dX: 1e-9,
  dY: -1e-9,
  predicted: false,
  degraded: false,
};

/**
 * The synthetic `FrameData`: synthetic packs, the built-in leap seconds and
 * an `eop` stub whose `atInstant` returns `sample` for every instant.
 */
export function syntheticFrameData(sample: EopSample = SAMPLE): FrameData {
  return {
    leapSeconds: LeapSeconds.builtIn(),
    eop: { atInstant: () => sample } as unknown as EarthOrientationParameters,
    ephemeris: Ephemeris.fromPacks(
      buffer(pack("SPK", ["sun", "emb", "moon"], "ICRF", "position")),
      buffer(pack("PCK", ["moonPa"], "MOON_PA", "euler")),
    ),
    warnings: [],
  };
}
