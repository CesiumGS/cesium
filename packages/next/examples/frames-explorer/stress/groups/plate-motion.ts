// Plate motion: GDA94 to GDA2020 and ITRF2014 to GDA2020 against the ICSM
// GDA2020 Technical Manual's worked examples, and Australia's drift from its
// plate-motion model (autonomous vehicles, precision agriculture, HD maps).
import { resolveOperation } from "../../../../src/engineering/crs.ts";
import {
  type HelmertParameters,
  geocentricToGeodetic,
  geodeticToGeocentric,
  helmert,
} from "../geodesy.ts";
import {
  ARCSECOND,
  type Printed,
  cited,
  ellipsoidOf,
  printed,
  sexagesimal,
} from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  EFFECT,
  cross3,
  distance,
  norm,
  operationFingerprint,
  proj,
  stressCase,
  sub3,
} from "../shared.ts";

/** The manual's printed parameters ("0.06155 m", "-0.009994 ppm", "0.00150379 sec/yr") in SI units. */
function icsmParameters(p: Record<string, string>): HelmertParameters {
  const value = (...keys: string[]) => {
    const text = keys.map((k) => p[k]).find((v) => v !== undefined) ?? "";
    const [number, unit] = text.trim().split(/\s+/);
    const factor: Record<string, number> = {
      m: 1,
      "m/yr": 1,
      ppm: 1e-6,
      "ppm/yr": 1e-6,
      sec: ARCSECOND,
      "sec/yr": ARCSECOND,
    };
    const f = factor[unit ?? ""];
    if (f === undefined) {
      throw new Error(`unknown ICSM unit in "${text}"`);
    }
    return printed(number ?? "").value * f;
  };
  return {
    tx: value("tx", "tX"),
    ty: value("ty", "tY"),
    tz: value("tz", "tZ"),
    rx: value("rx", "rX"),
    ry: value("ry", "rY"),
    rz: value("rz", "rZ"),
    ds: value("sc", "dS"),
  };
}

const xyzOf = (values: readonly string[]) => values.map((v) => printed(v));
const worstOf = (a: ArrayLike<number>, b: readonly Printed[]) =>
  Math.max(...b.map((p, i) => Math.abs(a[i]! - p.value)));
const halfOf = (b: readonly Printed[]) => Math.max(...b.map((p) => p.half));

/** A Helmert in PROJ is exact to float64: the path's own tolerance, m. */
const HELMERT_PATH = 1e-6;

/** The library against the hand formula: 1 mm (the plan's coordinate tolerance). */
const MILLIMETRE = 1e-3;

interface Gda94Example {
  parameters: Record<string, string>;
  gda94: {
    latitude: string;
    longitude: string;
    ellipsoidalHeight: string;
    XYZ: string[];
  };
  gda2020: { XYZ: string[] };
  difference: { N: string; E: string; U: string };
}

const gda94Case = stressCase(
  "plate-motion.gda94-gda2020",
  "plate-motion",
  "GDA94 to GDA2020 at Alice Springs: the ICSM Technical Manual's 7-parameter example by hand within its printed digits, the library within 1 mm of the hand result and its printed XYZ, and the 1.7 m shift within 2% of the manual's N, E, U",
  ["proj"],
  async (ctx, base) => {
    const ex = cited<Gda94Example>("icsm-gda94-gda2020");
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const p = icsmParameters(ex.parameters);
    const results: StressResult[] = [];
    // The manual's own convention (Equation 18): coordinate frame.
    const source = xyzOf(ex.gda94.XYZ);
    const target = xyzOf(ex.gda2020.XYZ);
    const handFromXyz = helmert(
      source.map((v) => v.value),
      p,
      { convention: "coordinate-frame" },
    );
    results.push({
      ...base,
      id: `${base.id}.hand`,
      title:
        "The hand-coded 7-parameter Helmert (coordinate frame, the manual's Equation 18) takes the manual's GDA94 XYZ of ALIC to its printed GDA2020 XYZ, within half a unit of the last digit plus the inputs' own",
      pass: true,
      value: worstOf(handFromXyz, target),
      tolerance: halfOf(target) + halfOf(source) + 1e-9,
      unit: "m",
      detail: `computed ${handFromXyz.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // Through the library: GDA94 (EPSG:4939) to GDA2020 (EPSG:7843).
    const lat = sexagesimal(ex.gda94.latitude, -1);
    const lon = sexagesimal(ex.gda94.longitude);
    const h = printed(ex.gda94.ellipsoidalHeight);
    const op = resolveOperation(
      proj(ctx),
      { format: "wkid", authority: "EPSG", wkid: 4939 },
      "EPSG:7843",
    );
    const g = op.forward([lon.value, lat.value, h.value]);
    const library = geodeticToGeocentric(g[0]!, g[1]!, g[2]!, grs80.a, grs80.f);
    const handFromGeographic = helmert(
      geodeticToGeocentric(lon.value, lat.value, h.value, grs80.a, grs80.f),
      p,
      { convention: "coordinate-frame" },
    );
    const grids = op.grids.length === 0 ? "no grid" : op.grids.join(", ");
    results.push({
      ...base,
      id: `${base.id}.library`,
      title:
        "resolveOperation from GDA94 (EPSG:4939) to GDA2020 (EPSG:7843) takes ALIC's printed latitude, longitude and height to the hand Helmert's position within 1 mm (the library picks the 7-parameter transformation, not the conformal grid)",
      pass: op.grids.length === 0 && !op.ballpark,
      value: distance(library, handFromGeographic),
      tolerance: MILLIMETRE,
      unit: "m",
      detail: `${grids}; accuracy ${op.accuracy ?? "not stated"} m; ${op.pipeline}`,
      fingerprint: operationFingerprint(ctx, op, [library]),
    });
    // The manual's latitude prints to 1e-6″ (0.03 mm), its height to 0.1 mm.
    const inputHalf = h.half + (lat.half + lon.half) * 111_320;
    results.push({
      ...base,
      id: `${base.id}.printed`,
      title:
        "The library's GDA2020 position of ALIC against the manual's printed GDA2020 XYZ, within half a unit of its last digit plus the inputs' own and the path's",
      pass: true,
      value: worstOf(library, target),
      tolerance: halfOf(target) + inputHalf + HELMERT_PATH,
      unit: "m",
      detail: `library ${library.map((v) => v.toFixed(4)).join(", ")}`,
    });
    const shift = distance(
      library,
      source.map((v) => v.value),
    );
    const printedShift = Math.hypot(
      printed(ex.difference.N).value,
      printed(ex.difference.E).value,
      printed(ex.difference.U).value,
    );
    results.push({
      ...base,
      id: `${base.id}.shift`,
      title:
        "The size of the GDA94 to GDA2020 shift at ALIC, against the manual's printed N, E and U differences, within 2%",
      pass: true,
      value: Math.abs(shift / printedShift - 1),
      tolerance: EFFECT,
      detail: `library ${fmt(shift, 6)} m; manual sqrt(N² + E² + U²) = ${fmt(printedShift, 6)} m`,
      effect: {
        value: shift,
        unit: "m",
        label: "how far GDA2020 moved Alice Springs from GDA94",
      },
    });
    return results;
  },
);

interface PlateMotion {
  parameters: Record<string, string>;
  rates: Record<string, string>;
  referenceEpoch: string;
  itrf2014Epoch: string;
  itrf2014XYZ: string[];
  gda2020XYZ: string[];
}

const plateMotionCase = stressCase(
  "plate-motion.itrf2014-gda2020",
  "plate-motion",
  "ITRF2014 at 2018.0 to GDA2020 at Alice Springs: the manual's plate-motion example by hand and through the library, and Australia's drift in ITRF2014 from the model's Euler-pole rates, |ω × r|, within 2%",
  ["proj"],
  async (ctx, base) => {
    const ex = cited<PlateMotion>("icsm-itrf2014-gda2020");
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const p = icsmParameters(ex.parameters);
    const rates = icsmParameters(ex.rates);
    const t0 = printed(ex.referenceEpoch).value;
    const epoch = printed(ex.itrf2014Epoch).value;
    const source = xyzOf(ex.itrf2014XYZ);
    const target = xyzOf(ex.gda2020XYZ);
    const results: StressResult[] = [];
    const hand = helmert(
      source.map((v) => v.value),
      p,
      { convention: "coordinate-frame", rates, referenceEpoch: t0, epoch },
    );
    results.push({
      ...base,
      id: `${base.id}.hand`,
      title:
        "The hand-coded time-dependent Helmert (rotation rates only, coordinate frame, t0 = 2020.0) takes the manual's ITRF2014 XYZ of ALIC at 2018.0 to its printed GDA2020 XYZ, within half a unit of the last digit plus the inputs' own",
      pass: true,
      value: worstOf(hand, target),
      tolerance: halfOf(target) + halfOf(source) + 1e-9,
      unit: "m",
      detail: `computed ${hand.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // Through the library: ITRF2014 (EPSG:7912) at its epoch to GDA2020.
    const P = proj(ctx);
    const library = (at: number) => {
      const op = resolveOperation(
        P,
        { format: "wkid", authority: "EPSG", wkid: 7912, epoch: at },
        "EPSG:7843",
      );
      const g = op.forward(
        geocentricToGeodetic(
          source.map((v) => v.value),
          grs80.a,
          grs80.f,
        ),
      );
      return {
        op,
        xyz: geodeticToGeocentric(g[0]!, g[1]!, g[2]!, grs80.a, grs80.f),
      };
    };
    const at = library(epoch);
    results.push({
      ...base,
      id: `${base.id}.library`,
      title:
        "resolveOperation from ITRF2014 at epoch 2018.0 (EPSG:7912) to GDA2020 (EPSG:7843) against the manual's printed GDA2020 XYZ, within half a unit of its last digit plus the inputs' own and the path's",
      pass: !at.op.ballpark,
      value: worstOf(at.xyz, target),
      tolerance: halfOf(target) + halfOf(source) + HELMERT_PATH,
      unit: "m",
      detail: `library ${at.xyz.map((v) => v.toFixed(4)).join(", ")}; accuracy ${at.op.accuracy ?? "not stated"} m; ${at.op.pipeline}`,
      fingerprint: operationFingerprint(ctx, at.op, [at.xyz]),
    });

    // Drift: a point fixed in ITRF2014 moves against GDA2020 (fixed to the
    // plate) by ω × r per year: |ω × r| by hand from the Euler-pole rates.
    const later = library(epoch + 1);
    const drift = distance(later.xyz, at.xyz);
    const r = source.map((v) => v.value);
    const omega = [rates.rx, rates.ry, rates.rz];
    const handDrift = norm(cross3(omega, r));
    const direction = sub3(later.xyz, at.xyz);
    results.push({
      ...base,
      id: `${base.id}.drift`,
      title:
        "Australia's drift in ITRF2014 at ALIC: the library's one-year change against |ω × r| from the plate-motion model's rotation rates (Table 3.3), within 2%",
      pass: true,
      value: Math.abs(drift / handDrift - 1),
      tolerance: EFFECT,
      detail: `library ${fmt(drift * 100, 6)} cm/yr (ΔX ${fmt(direction[0]! * 1000, 4)}, ΔY ${fmt(direction[1]! * 1000, 4)}, ΔZ ${fmt(direction[2]! * 1000, 4)} mm), hand ${fmt(handDrift * 100, 6)} cm/yr`,
      effect: {
        value: drift * 100,
        unit: "cm/yr",
        label: "how fast an Australian map goes stale in ITRF2014",
      },
    });
    return results;
  },
);

export const plateMotionCases: readonly StressCase[] = [
  gda94Case,
  plateMotionCase,
];
