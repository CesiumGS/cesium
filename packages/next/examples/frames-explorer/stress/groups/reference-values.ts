// Reference values (R10): NGS datasheets, IOGP 373-7-2's worked examples and a
// published clothoid example.
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { Alignment } from "../../../../src/engineering/alignment.ts";
import { crsUnits, resolveOperation } from "../../../../src/engineering/crs.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  ALIGNMENT_PATH,
  ANGLE_PATH,
  ARCSECOND,
  CONVERGENCE_PATH,
  DEGREE,
  FACTOR_PATH,
  INVERSE_RESIDUAL,
  type NgsMark,
  cited,
  ellipsoidOf,
  onEarth,
  printed,
  printedStation,
  radii,
  sexagesimal,
} from "../references.ts";
import { type ResultBase, type StressCase, fmt } from "../runner.ts";
import {
  epsg,
  fingerprintOf,
  operationFingerprint,
  proj,
  stressCase,
} from "../shared.ts";

/** NAVD88 height (m): the compound CRS's vertical part, through GEOID18. */
const NAVD88_METRES = 5703;

/** The datasheet marks (PIDs) and the NAD83(2011) metre CRS of each one's SPCS 83 zone (EPSG registry names). */
const NGS_MARKS: readonly {
  readonly pid: string;
  readonly crs: number;
  readonly name: string;
}[] = [
  { pid: "GU2195", crs: 6419, name: "NAD83(2011) / California zone 3" },
  { pid: "AK7130", crs: 6437, name: "NAD83(2011) / Florida East" },
  { pid: "AA5394", crs: 6564, name: "NAD83(2011) / Pennsylvania South" },
  { pid: "KK1284", crs: 6427, name: "NAD83(2011) / Colorado Central" },
  { pid: "AJ3674", crs: 6404, name: "NAD83(2011) / Arizona Central" },
];

function ngsCase(mark: (typeof NGS_MARKS)[number]): StressCase {
  const m = cited<NgsMark>(`ngs-${mark.pid}`);
  const id = `reference-values.ngs-${mark.pid.toLowerCase()}`;
  const title = `NGS datasheet ${mark.pid} (${m.designation}, SPC ${m.spc.zone}) through EPSG:${mark.crs}+${NAVD88_METRES} with GEOID18: northing and easting, convergence, scale factor, combined factor and orthometric height match the datasheet at its printed precision`;
  return stressCase(
    id,
    "reference-values",
    title,
    ["proj", "geoid"],
    async (ctx, base) => {
      const frame = EngineeringFrame.create(
        { name: mark.name, body: EARTH, crs: epsg(mark.crs, NAVD88_METRES) },
        proj(ctx),
      );
      const lat = sexagesimal(m.latitude);
      const lon = sexagesimal(m.longitude);
      const h = printed(m.ellipsoidHeight);
      // The datasheet's position and ellipsoid height: design E, N (m) and the
      // NAVD88 height PROJ gives through GEOID18.
      const design = frame.fromBodyFixed(
        onEarth(lon.value, lat.value, h.value),
      );
      const factors = gridFactors(frame, design);
      const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
      const r = radii(grs80.a, grs80.e2, lat.value);
      // The position's own rounding (half of 0.00001″ in each angle) moves the
      // grid point by up to k (M δφ + N cos φ δλ). It belongs in the
      // tolerance (ruling F14): the datasheet prints its position rounded, and
      // its northing and easting were computed from the unrounded one, so the
      // printed inputs alone can miss the printed outputs by this much.
      const inputRounding =
        factors.pointScale *
        (r.M * lat.half * DEGREE +
          r.N * Math.cos(lat.value * DEGREE) * lon.half * DEGREE);
      const north = printed(m.spc.north);
      const east = printed(m.spc.east);
      const convergence = sexagesimal(m.spc.convergence);
      const scaleFactor = printed(m.spc.scaleFactor);
      const combined = printed(m.spc.combinedFactor);
      const geoid = printed(m.geoidHeight);
      const published = printed(m.orthometricHeight);
      const sub = (suffix: string, words: string): ResultBase => ({
        ...base,
        id: `${base.id}.${suffix}`,
        title: `${mark.pid} (SPC ${m.spc.zone}): ${words}`,
      });
      const orthometric = h.value - geoid.value;
      return [
        {
          ...sub(
            "grid",
            `northing ${m.spc.north} m and easting ${m.spc.east} m from the datasheet's position, within half a unit of their last digit plus the position's own rounding`,
          ),
          pass: true,
          value: Math.max(
            Math.abs(design[1]! - north.value),
            Math.abs(design[0]! - east.value),
          ),
          tolerance:
            Math.max(north.half, east.half) + inputRounding + INVERSE_RESIDUAL,
          unit: "m",
          detail: `computed N ${design[1]!.toFixed(4)}, E ${design[0]!.toFixed(4)} m; the position's rounding allows ${fmt(inputRounding)} m; operation accuracy ${frame.operation.accuracy} m (a datum ensemble, not this check's path)`,
          fingerprint: fingerprintOf(ctx, frame, [design]),
        },
        {
          ...sub(
            "convergence",
            `convergence ${m.spc.convergence} (d m s), within 0.05″`,
          ),
          pass: true,
          value:
            Math.abs(factors.convergence - convergence.value * DEGREE) /
            ARCSECOND,
          tolerance: convergence.half * 3600 + CONVERGENCE_PATH / ARCSECOND,
          unit: "″",
          detail: `computed ${fmt(factors.convergence / DEGREE, 10)}°, published ${fmt(convergence.value, 10)}° (both from true north to grid north, positive east)`,
        },
        {
          ...sub(
            "scale-factor",
            `scale factor ${m.spc.scaleFactor}, within 5e-9`,
          ),
          pass: true,
          value: Math.abs(factors.pointScale - scaleFactor.value),
          tolerance: scaleFactor.half + FACTOR_PATH,
          detail: `computed ${factors.pointScale.toFixed(11)}`,
        },
        {
          ...sub(
            "combined-factor",
            `combined factor ${m.spc.combinedFactor} (elevation factor ${m.spc.elevationFactor} × scale factor) from gridFactors at the datasheet's ellipsoid height, within 5e-9`,
          ),
          pass: true,
          value: Math.abs(factors.combinedFactor - combined.value),
          tolerance: combined.half + FACTOR_PATH + h.half / r.gaussian,
          detail: `computed ${factors.combinedFactor.toFixed(11)} (elevation factor ${factors.elevationFactor.toFixed(11)} at h ${fmt(frame.toGeodetic(design).height, 7)} m)`,
        },
        {
          ...sub(
            "orthometric-height",
            `NAVD88 height from the ellipsoid height through GEOID18: h ${m.ellipsoidHeight} − N ${m.geoidHeight} = ${orthometric.toFixed(3)} m, within 1 mm`,
          ),
          pass: true,
          value: Math.abs(design[2]! - orthometric),
          tolerance: h.half + geoid.half + INVERSE_RESIDUAL,
          unit: "m",
          detail: `computed ${design[2]!.toFixed(4)} m; the datasheet's own NAVD 88 height is ${m.orthometricHeight} m (${m.orthometricHeightMethod}), ${fmt(published.value - orthometric, 3)} m from h − N: GEOID18's fit at this mark, not part of the check`,
        },
      ];
    },
  );
}

interface WorkedExampleEntry {
  readonly crs: string;
  readonly forward: {
    readonly latitude: string;
    readonly longitude: string;
    readonly easting: string;
    readonly northing: string;
    readonly unit: string;
  };
  readonly reverse: {
    readonly easting: string;
    readonly northing: string;
    readonly latitude: string;
    readonly longitude: string;
  };
}

/**
 * Worked examples of the projection methods the catalog uses, with the EPSG
 * codes of the examples' CRSs and their geographic CRSs (EPSG registry
 * names). Transverse Mercator's forward authority is the Ordnance Survey's
 * example (ruling F11): IOGP's uses the JHS formulas, 7.7 mm from the
 * library's Krüger series (PROJ's Poder–Engsager), so it is shown as an
 * effect, the method difference, with no pass or fail.
 */
const WORKED_EXAMPLES: readonly {
  /** The case id's stem, and references.json's entry ("iogp-<id>" or "os-<id>"). */
  readonly id: string;
  readonly reference: string;
  readonly authority: string;
  readonly method: string;
  readonly crs: number;
  readonly geographic: string;
  /** Shown, not judged, in this direction. */
  readonly displayOnly?: "forward";
}[] = [
  {
    id: "iogp-lambert-conic-conformal-2sp",
    reference: "iogp-lambert-conic-conformal-2sp",
    authority: "IOGP 373-7-2's",
    method: "Lambert Conic Conformal (2SP)",
    crs: 32040,
    geographic: "EPSG:4267",
  },
  {
    id: "iogp-transverse-mercator",
    reference: "iogp-transverse-mercator",
    authority: "IOGP 373-7-2's",
    method: "Transverse Mercator",
    crs: 27700,
    geographic: "EPSG:4277",
    displayOnly: "forward",
  },
  {
    id: "iogp-polar-stereographic-b",
    reference: "iogp-polar-stereographic-b",
    authority: "IOGP 373-7-2's",
    method: "Polar Stereographic (variant B)",
    crs: 3032,
    geographic: "EPSG:4326",
  },
  {
    id: "iogp-pseudo-mercator",
    reference: "iogp-pseudo-mercator",
    authority: "IOGP 373-7-2's",
    method: "Popular Visualisation Pseudo-Mercator",
    crs: 3857,
    geographic: "EPSG:4326",
  },
  {
    id: "os-national-grid",
    reference: "os-national-grid-example",
    authority:
      "The Ordnance Survey's (A Guide to Coordinate Systems in Great Britain, Annexe C)",
    method: "Transverse Mercator",
    crs: 27700,
    geographic: "EPSG:4277",
  },
];

function workedExampleCase(
  example: (typeof WORKED_EXAMPLES)[number],
  direction: "forward" | "reverse",
): StressCase {
  const x = cited<WorkedExampleEntry>(example.reference);
  const id = `reference-values.${example.id}-${direction}`;
  const f = x.forward;
  const rv = x.reverse;
  const shown = example.displayOnly === direction;
  const title = shown
    ? `${example.authority} ${example.method} example (${x.crs}, EPSG:${example.crs}), forward, shown: its E ${f.easting}, N ${f.northing} (JHS formulas) against the library's (Krüger series, Poder–Engsager), the method difference, with no pass or fail`
    : direction === "forward"
      ? `${example.authority} ${example.method} example (${x.crs}, EPSG:${example.crs}), forward: ${f.latitude}, ${f.longitude} gives E ${f.easting}, N ${f.northing} ${f.unit}, within half a unit of the last digit`
      : `${example.authority} ${example.method} example (${x.crs}, EPSG:${example.crs}), reverse: E ${rv.easting}, N ${rv.northing} gives ${rv.latitude}, ${rv.longitude}, within half a unit of the last digit`;
  return stressCase(
    id,
    "reference-values",
    title,
    ["proj"],
    async (ctx, base) => {
      // The conversion alone: from the projected CRS to its own geographic CRS.
      const op = resolveOperation(
        proj(ctx),
        epsg(example.crs),
        example.geographic,
      );
      const conversionOnly =
        op.grids.length === 0 && !/helmert|\bcart\b/.test(op.pipeline);
      if (direction === "forward") {
        const units = crsUnits(proj(ctx), epsg(example.crs));
        const easting = printed(f.easting);
        const northing = printed(f.northing);
        const en = op.inverse([
          sexagesimal(f.longitude).value,
          sexagesimal(f.latitude).value,
          0,
        ]);
        const value = Math.max(
          Math.abs(en[0]! - easting.value),
          Math.abs(en[1]! - northing.value),
        );
        const detail = `computed E ${en[0]!.toFixed(4)}, N ${en[1]!.toFixed(4)}; pipeline ${op.pipeline}`;
        const fingerprint = operationFingerprint(ctx, op, [en]);
        if (shown) {
          return [
            {
              ...base,
              pass: conversionOnly,
              detail: `${detail}; the Ordnance Survey's example is the authority for this method`,
              effect: {
                value:
                  Math.hypot(en[0]! - easting.value, en[1]! - northing.value) *
                  units.metersPerUnit *
                  1000,
                unit: "mm",
                label:
                  "IOGP's Transverse Mercator example (JHS formulas) against the library (Krüger series, Poder–Engsager)",
              },
              fingerprint,
            },
          ];
        }
        return [
          {
            ...base,
            pass: conversionOnly,
            value,
            tolerance:
              Math.max(easting.half, northing.half) +
              INVERSE_RESIDUAL / units.metersPerUnit,
            unit: units.horizontalUnitName,
            detail,
            fingerprint,
          },
        ];
      }
      const back = op.forward([
        printed(rv.easting).value,
        printed(rv.northing).value,
        0,
      ]);
      const lat = sexagesimal(rv.latitude);
      const lon = sexagesimal(rv.longitude);
      return [
        {
          ...base,
          pass: conversionOnly,
          value:
            Math.max(
              Math.abs(back[1]! - lat.value),
              Math.abs(back[0]! - lon.value),
            ) * 3600,
          tolerance: Math.max(lat.half, lon.half) * 3600 + ANGLE_PATH,
          unit: "″",
          detail: `computed ${fmt(back[1]!, 12)}°, ${fmt(back[0]!, 12)}°; pipeline ${op.pipeline}`,
          // Geographic results as metres on the Earth's ellipsoid.
          fingerprint: operationFingerprint(ctx, op, [
            onEarth(back[0]!, back[1]!),
          ]),
        },
      ];
    },
  );
}

interface SpiralExample {
  readonly given: {
    readonly piStation: string;
    readonly LS: string;
    readonly delta: string;
    readonly D: string;
  };
  readonly tableRow: {
    readonly deltaS: string;
    readonly R: string;
    readonly X: string;
    readonly Y: string;
    readonly ST: string;
    readonly LT: string;
  };
  readonly stations: {
    readonly TS: string;
    readonly SC: string;
    readonly CS: string;
    readonly ST: string;
  };
}

const clothoidReferenceCase = stressCase(
  "reference-values.clothoid",
  "reference-values",
  "WYDOT Survey Manual's spiral example (LS 150 ft, D 10°, ∆ 35°, PI 100+00) as a tangent, clothoid, arc, clothoid, tangent alignment: the spiral angle, X and Y at the SC, the long and short tangents and the TS, SC, CS and ST stations match the published values",
  [],
  async (_ctx, base) => {
    const s = cited<SpiralExample>("wydot-spiral-example");
    const LS = printed(s.given.LS.replace("ft", "")).value;
    const D = printed(s.given.D.replace("°", "")).value;
    const delta = printed(s.given.delta.replace("°", "")).value;
    // The arc definition of the degree of curve (100 ft of arc subtends D),
    // which the manual's R = 5729.58 / D rounds.
    const R = 18_000 / (Math.PI * D);
    const deltaS = (D * LS) / 200; // degrees
    const LC = (100 * (delta - 2 * deltaS)) / D;
    const lead = 500;
    // Eastbound from the origin, curving left (positive radius).
    const road = new Alignment({
      name: "WYDOT spiral example",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [
        { kind: "line", length: lead },
        { kind: "spiral", length: LS, startRadius: Infinity, endRadius: R },
        { kind: "arc", length: LC, radius: R },
        { kind: "spiral", length: LS, startRadius: R, endRadius: Infinity },
        { kind: "line", length: lead },
      ],
    });
    const at = (station: number) => road.pointAt(station);
    const dir = (station: number) => {
      const a = road.azimuthAt(station);
      return [Math.sin(a), Math.cos(a)];
    };
    const ts = at(lead);
    const sc = at(lead + LS);
    const t0 = dir(lead);
    const n0 = [-t0[1]!, t0[0]!]; // left normal
    const d = [sc[0]! - ts[0]!, sc[1]! - ts[1]!];
    const X = d[0]! * t0[0]! + d[1]! * t0[1]!;
    const Y = d[0]! * n0[0]! + d[1]! * n0[1]!;
    const thetaS = (road.azimuthAt(lead) - road.azimuthAt(lead + LS)) / DEGREE;
    // Lines p + s u and q + t v meet at p + s u, s = ((q − p) × v) / (u × v).
    const meet = (
      p: ArrayLike<number>,
      u: ArrayLike<number>,
      q: ArrayLike<number>,
      v: ArrayLike<number>,
    ) => {
      const cross = u[0]! * v[1]! - u[1]! * v[0]!;
      const s2 = ((q[0]! - p[0]!) * v[1]! - (q[1]! - p[1]!) * v[0]!) / cross;
      return [p[0]! + s2 * u[0]!, p[1]! + s2 * u[1]!];
    };
    // The spiral's PI (SPI): the back tangent meets the tangent at the SC.
    const spi = meet(ts, t0, sc, dir(lead + LS));
    const LT = Math.hypot(spi[0]! - ts[0]!, spi[1]! - ts[1]!);
    const ST = Math.hypot(sc[0]! - spi[0]!, sc[1]! - spi[1]!);
    // The main PI: the back tangent meets the forward tangent; TS = PI − Ts.
    const end = road.endStation;
    const pi = meet(at(0), dir(0), at(end), dir(end));
    const Ts = Math.hypot(pi[0]! - ts[0]!, pi[1]! - ts[1]!);
    const offset =
      printedStation(s.given.piStation.replace("+", " + ")).value - Ts - lead;
    const stations = {
      TS: offset + lead,
      SC: offset + lead + LS,
      CS: offset + lead + LS + LC,
      ST: offset + lead + 2 * LS + LC,
    };
    const row = s.tableRow;
    const pX = printed(row.X);
    const pY = printed(row.Y);
    const pLT = printed(row.LT);
    const pST = printed(row.ST);
    const pTheta = sexagesimal(row.deltaS);
    const keys = ["TS", "SC", "CS", "ST"] as const;
    const worstStation = Math.max(
      ...keys.map((k) =>
        Math.abs(stations[k] - printedStation(s.stations[k]).value),
      ),
    );
    const stationHalf = printedStation(s.stations.TS).half;
    const sub = (suffix: string, words: string): ResultBase => ({
      ...base,
      id: `${base.id}.${suffix}`,
      title: `WYDOT spiral example: ${words}`,
    });
    const ft = (v: number) => v.toFixed(4);
    return [
      {
        ...sub("spiral-angle", `spiral angle ∆S ${row.deltaS}, within 0.5″`),
        pass: true,
        value: Math.abs(thetaS - pTheta.value) * 3600,
        tolerance: pTheta.half * 3600 + ALIGNMENT_PATH,
        unit: "″",
        detail: `heading change over the spiral ${fmt(thetaS, 12)}°; R ${fmt(R, 10)} ft (the table prints ${row.R})`,
      },
      {
        ...sub(
          "x-y",
          `X ${row.X} ft and Y ${row.Y} ft at the SC, within 0.005 ft`,
        ),
        pass: true,
        value: Math.max(Math.abs(X - pX.value), Math.abs(Y - pY.value)),
        tolerance: Math.max(pX.half, pY.half) + ALIGNMENT_PATH,
        unit: "ft",
        detail: `X ${ft(X)}, Y ${ft(Y)} ft`,
      },
      {
        ...sub(
          "tangents",
          `long tangent ${row.LT} ft and short tangent ${row.ST} ft, within 0.005 ft`,
        ),
        pass: true,
        value: Math.max(Math.abs(LT - pLT.value), Math.abs(ST - pST.value)),
        tolerance: Math.max(pLT.half, pST.half) + ALIGNMENT_PATH,
        unit: "ft",
        detail: `LT ${ft(LT)}, ST ${ft(ST)} ft`,
      },
      {
        ...sub(
          "stations",
          `TS ${s.stations.TS}, SC ${s.stations.SC}, CS ${s.stations.CS} and ST ${s.stations.ST}, from the PI and the tangents' intersection, within 0.005 ft`,
        ),
        pass: true,
        value: worstStation,
        tolerance: stationHalf + ALIGNMENT_PATH,
        unit: "ft",
        detail: `Ts ${ft(Ts)} ft; TS ${ft(stations.TS)}, SC ${ft(stations.SC)}, CS ${ft(stations.CS)}, ST ${ft(stations.ST)}`,
      },
    ];
  },
);

export const referenceValuesCases: readonly StressCase[] = [
  ...NGS_MARKS.map(ngsCase),
  ...WORKED_EXAMPLES.map((e) => workedExampleCase(e, "forward")),
  ...WORKED_EXAMPLES.map((e) => workedExampleCase(e, "reverse")),
  clothoidReferenceCase,
];
