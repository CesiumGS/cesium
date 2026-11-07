// A CORS station in NAD83(2011) and ITRF2020 (Task 7b): CCV6, Cape Canaveral
// 6 (PID DI3564), NGS's published coordinates in both frames (MYCS3,
// references.json `ngs-DI3564`), measured data. PROJ's NAD83(2011) to
// ITRF2020 operation takes the station's NAD83(2011) position (epoch
// 2010.0) to ITRF2020 at 2010.0; the station's own ITRF2020 velocity then
// carries it to 2020.0, where NGS prints it. The robot arm's mark
// (scenarios/robotArm.ts) goes through the same function at its own epoch.
import {
  resolveOperation,
  type RecordedOperation,
} from "../../../../src/engineering/crs.ts";
import type { ProjApi } from "../../../../src/engineering/projApi.ts";
import { type Printed, cited, printed, sexagesimal } from "../references.ts";
import { type StressCase, fmt } from "../runner.ts";
import { operationFingerprint, proj, stressCase } from "../shared.ts";

/** The coordinate file's and the datasheet's values (references.json, verbatim strings). */
export interface CorsStation {
  readonly designation: string;
  readonly corsId: string;
  readonly nad83: {
    readonly epoch: string;
    readonly latitude: string;
    readonly longitude: string;
    readonly ellipsoidHeight: string;
    readonly x: string;
    readonly y: string;
    readonly z: string;
    readonly velocity: {
      readonly vx: string;
      readonly vy: string;
      readonly vz: string;
    };
    readonly networkSd: {
      readonly units: string;
      readonly north: string;
      readonly east: string;
      readonly height: string;
    };
  };
  readonly itrf2020: {
    readonly epoch: string;
    readonly x: string;
    readonly y: string;
    readonly z: string;
    readonly velocity: {
      readonly vx: string;
      readonly vy: string;
      readonly vz: string;
    };
  };
}

export const STATION_ID = "ngs-DI3564";

/** NAD83(2011) geographic 3D, and ITRF2020 geocentric (EPSG). */
const NAD83_2011_3D = 6319;
const ITRF2020_XYZ = "EPSG:9988";

/** The datasheet's FGDC network accuracy, 95%, ellipsoid height (the larger of its two), m. */
const NETWORK_95_M = 0.001;

const velocityOf = (v: CorsStation["nad83"]["velocity"]): Printed[] => [
  printed(v.vx),
  printed(v.vy),
  printed(v.vz),
];

/** The station's NAD83(2011) values, parsed. */
export function stationValues(s: CorsStation) {
  const lat = sexagesimal(s.nad83.latitude);
  const lon = sexagesimal(s.nad83.longitude);
  const h = printed(s.nad83.ellipsoidHeight);
  const sd = s.nad83.networkSd;
  const cm = sd.units === "cm" ? 0.01 : 1;
  return {
    lat,
    lon,
    h,
    epoch: printed(s.nad83.epoch).value,
    velocity: velocityOf(s.nad83.velocity),
    /** The datasheet's network standard deviations (1σ), north, east and height, m. */
    sd: [sd.north, sd.east, sd.height].map((v) => printed(v).value * cm) as [
      number,
      number,
      number,
    ],
  };
}

/**
 * The station in ITRF2020 at decimal year `year`, Earth-fixed metres:
 * its NAD83(2011) position carried from the datasheet's epoch by its
 * NAD83(2011) velocity, then PROJ's NAD83(2011) to ITRF2020 operation at
 * `year`. Also its NAD83(2011) geocentric position at `year`, by the same
 * velocity (the frame's own coordinates).
 */
export function stationInItrf(
  P: ProjApi,
  s: CorsStation,
  year: number,
): { itrf: number[]; operation: RecordedOperation } {
  const v = stationValues(s);
  const operation = resolveOperation(
    P,
    { format: "wkid", authority: "EPSG", wkid: NAD83_2011_3D, epoch: year },
    ITRF2020_XYZ,
  );
  const at2010 = operation.forward([v.lon.value, v.lat.value, v.h.value]);
  // Carry by the NAD83(2011) velocity in geocentric metres: the operation
  // itself is time-dependent, so convert at the epoch, then add the plate's
  // drift (about 3 mm/yr here) in XYZ. The drift is applied after: at these
  // rates the difference between the two orders is far below a micrometre.
  const dt = year - v.epoch;
  const itrf = [0, 1, 2].map((i) => at2010[i]! + v.velocity[i]!.value * dt);
  return { itrf, operation };
}

export const corsStationCase: StressCase = (() => {
  const s = cited<CorsStation>(STATION_ID);
  const id = "reference-values.ngs-di3564";
  return stressCase(
    id,
    "reference-values",
    `CORS station ${s.corsId} (${s.designation}, PID DI3564): its NAD83(2011) position through PROJ to ITRF2020 at 2010.0, carried to 2020.0 by its ITRF2020 velocity, against NGS's ITRF2020 position`,
    ["proj"],
    async (ctx, base) => {
      const P = proj(ctx);
      const v = stationValues(s);
      const operation = resolveOperation(
        P,
        {
          format: "wkid",
          authority: "EPSG",
          wkid: NAD83_2011_3D,
          epoch: v.epoch,
        },
        ITRF2020_XYZ,
      );
      const at2010 = operation.forward([v.lon.value, v.lat.value, v.h.value]);
      const itrfVelocity = velocityOf(s.itrf2020.velocity);
      const years = printed(s.itrf2020.epoch).value - v.epoch;
      const ours = [0, 1, 2].map(
        (i) => at2010[i]! + itrfVelocity[i]!.value * years,
      );
      const target = [s.itrf2020.x, s.itrf2020.y, s.itrf2020.z].map(printed);
      const worst = Math.max(
        ...target.map((t, i) => Math.abs(ours[i]! - t.value)),
      );
      // The printed digits' own halves: the target's, the inputs' (the
      // height's 0.5 mm and the angles' 0.000005″, about 0.15 mm) and the
      // velocity's (0.05 mm/yr over the years); then the datasheet's 95%
      // network accuracy.
      const inputs = v.h.half + Math.max(v.lat.half, v.lon.half) * 3600 * 30.9;
      const velocity =
        Math.max(...itrfVelocity.map((p) => p.half)) * Math.abs(years);
      const rounding =
        Math.max(...target.map((t) => t.half)) + inputs + velocity;
      return [
        {
          ...base,
          id: `${base.id}.itrf2020`,
          title: `${s.corsId}: NAD83(2011) ${s.nad83.latitude}, ${s.nad83.longitude}, h ${s.nad83.ellipsoidHeight} m (epoch ${s.nad83.epoch}) through PROJ to ITRF2020, carried to ${s.itrf2020.epoch} by its ITRF2020 velocity, against NGS's ITRF2020 X ${s.itrf2020.x}, Y ${s.itrf2020.y}, Z ${s.itrf2020.z} m, within the printed digits and the datasheet's 95% network accuracy (1 mm)`,
          pass: !operation.ballpark,
          value: worst,
          tolerance: rounding + NETWORK_95_M,
          unit: "m",
          detail: `ours X ${ours[0]!.toFixed(4)}, Y ${ours[1]!.toFixed(4)}, Z ${ours[2]!.toFixed(4)} m; the printed digits allow ${fmt(rounding * 1000, 3)} mm; PROJ's operation accuracy ${operation.accuracy ?? "not stated"} m; ${operation.pipeline}`,
          fingerprint: operationFingerprint(ctx, operation, [ours]),
        },
      ];
    },
  );
})();
