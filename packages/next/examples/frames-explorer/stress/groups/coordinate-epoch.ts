// Coordinate epoch: NAD83(2011) against ITRF2014, and the hand-coded Helmert.
import { resolveOperation } from "../../../../src/engineering/crs.ts";
import { type EpsgParameter, epsgTimeDependentHelmert } from "../datum.ts";
import {
  type HelmertParameters,
  geodeticToGeocentric,
  helmert,
  reversedHelmert,
} from "../geodesy.ts";
import {
  ARCSECOND,
  MILLIARCSECOND,
  type NgsMark,
  type Printed,
  cited,
  ellipsoidOf,
  printed,
  sexagesimal,
} from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  EFFECT,
  distance,
  norm,
  operationFingerprint,
  proj,
  stressCase,
  sub3,
} from "../shared.ts";

/** IOGP's printed Helmert parameters ("+4.5 m", "–0.4254 msec", "+0.00971 ppm", "+1.42 mm/yr") in SI units. */
function iogpParameters(p: Record<string, string>): HelmertParameters {
  const value = (key: string) => {
    const [number, unit] = (p[key] ?? "").trim().split(/\s+/);
    const factor: Record<string, number> = {
      m: 1,
      mm: 1e-3,
      "mm/yr": 1e-3,
      sec: ARCSECOND,
      msec: MILLIARCSECOND,
      "msec/yr": MILLIARCSECOND,
      ppm: 1e-6,
      "ppm/yr": 1e-6,
    };
    const f = factor[unit ?? ""];
    if (f === undefined) {
      throw new Error(`unknown IOGP unit in "${p[key]}"`);
    }
    return printed(number ?? "").value * f;
  };
  return {
    tx: value("tX"),
    ty: value("tY"),
    tz: value("tZ"),
    rx: value("rX"),
    ry: value("rY"),
    rz: value("rZ"),
    ds: value("dS"),
  };
}

/** The plan's coordinate-epoch tolerance. */
const EPOCH_TOLERANCE = 1e-3;

// m

const coordinateEpochCase = stressCase(
  "coordinate-epoch.nad83-itrf2014",
  "coordinate-epoch",
  "A California point in NAD83(2011) (NGS GU2195) against ITRF2014 at epochs 2010.0 and 2026.0: the library matches the hand-coded EPSG 8970 time-dependent Helmert within 1 mm, and the hand Helmert reproduces IOGP 373-7-2's worked examples",
  ["proj"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    const xyzOf = (values: readonly string[]) => values.map((v) => printed(v));
    const worstOf = (a: ArrayLike<number>, b: readonly Printed[]) =>
      Math.max(...b.map((p, i) => Math.abs(a[i]! - p.value)));

    // 1. The helper against IOGP's position-vector example (WGS 72 to WGS 84).
    const pv = cited<{
      parameters: Record<string, string>;
      sourceXYZ: string[];
      targetXYZ: string[];
    }>("iogp-helmert-position-vector");
    const pvTarget = xyzOf(pv.targetXYZ);
    const pvOut = helmert(
      xyzOf(pv.sourceXYZ).map((p) => p.value),
      iogpParameters(pv.parameters),
      { convention: "position-vector" },
    );
    results.push({
      ...base,
      id: `${base.id}.helmert-iogp-position-vector`,
      title:
        "The hand-coded Helmert reproduces IOGP 373-7-2's position vector example (WGS 72 to WGS 84) within half a unit of its last digit plus its inputs' own rounding",
      pass: true,
      value: worstOf(pvOut, pvTarget),
      // The output's last digit and the inputs' (XT moves with XS one to one).
      tolerance:
        Math.max(...pvTarget.map((p) => p.half)) +
        Math.max(...xyzOf(pv.sourceXYZ).map((p) => p.half)) +
        1e-9,
      unit: "m",
      detail: `computed ${pvOut.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // 2. Against IOGP's time-dependent coordinate frame example, both ways.
    const td = cited<{
      parameters: Record<string, string>;
      rates: Record<string, string>;
      referenceEpoch: string;
      epoch: string;
      sourceXYZ: string[];
      targetXYZ: string[];
    }>("iogp-helmert-time-dependent");
    const tdParameters = iogpParameters(td.parameters);
    const tdRates = iogpParameters(td.rates);
    const tdTime = {
      convention: "coordinate-frame" as const,
      referenceEpoch: printed(td.referenceEpoch).value,
      epoch: printed(td.epoch).value,
    };
    const tdSource = xyzOf(td.sourceXYZ);
    const tdTarget = xyzOf(td.targetXYZ);
    const forward = helmert(
      tdSource.map((p) => p.value),
      tdParameters,
      { ...tdTime, rates: tdRates },
    );
    const reverse = helmert(
      tdTarget.map((p) => p.value),
      reversedHelmert(tdParameters),
      {
        ...tdTime,
        rates: reversedHelmert(tdRates),
      },
    );
    results.push({
      ...base,
      id: `${base.id}.helmert-iogp-time-dependent`,
      title:
        "The hand-coded Helmert reproduces IOGP 373-7-2's time-dependent coordinate frame example (ITRF2008 to GDA94 at 2013.90) forward and reversed, within half a unit of its last digit plus its inputs' own rounding",
      pass: true,
      value: Math.max(worstOf(forward, tdTarget), worstOf(reverse, tdSource)),
      tolerance:
        Math.max(...tdTarget.map((p) => p.half)) +
        Math.max(...tdSource.map((p) => p.half)) +
        1e-9,
      unit: "m",
      detail: `forward ${forward.map((v) => v.toFixed(4)).join(", ")}; reverse ${reverse.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // 3. The library against EPSG 8970, reversed (NAD83(2011) to ITRF2014).
    const record = cited<{ parameters: readonly EpsgParameter[] }>("epsg-8970");
    const h8970 = epsgTimeDependentHelmert(record.parameters);
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const mark = cited<NgsMark>("ngs-GU2195");
    const lat = sexagesimal(mark.latitude).value;
    const lon = sexagesimal(mark.longitude).value;
    const h = printed(mark.ellipsoidHeight).value;
    const nad83 = geodeticToGeocentric(lon, lat, h, grs80.a, grs80.f);
    const hand = (epoch: number) =>
      helmert(nad83, reversedHelmert(h8970.parameters), {
        convention: "coordinate-frame",
        rates: reversedHelmert(h8970.rates),
        referenceEpoch: h8970.referenceEpoch,
        epoch,
      });
    const library = (epoch?: number) => {
      const op = resolveOperation(
        proj(ctx),
        epoch === undefined
          ? { format: "wkid", authority: "EPSG", wkid: 6319 }
          : { format: "wkid", authority: "EPSG", wkid: 6319, epoch },
        "EPSG:7912",
      );
      const g = op.forward([lon, lat, h]);
      return {
        xyz: geodeticToGeocentric(g[0]!, g[1]!, g[2]!, grs80.a, grs80.f),
        op,
      };
    };
    const at2010 = library(2010);
    const at2026 = library(2026);
    const noEpoch = library();
    const hand2010 = hand(2010);
    const hand2026 = hand(2026);
    for (const [epoch, { xyz: lib, op }, byHand] of [
      [2010, at2010, hand2010],
      [2026, at2026, hand2026],
    ] as const) {
      results.push({
        ...base,
        id: `${base.id}.epoch-${epoch}`,
        title: `GU2195 in ITRF2014 at epoch ${epoch}.0: the library's NAD83(2011) to ITRF2014 against the hand-coded EPSG 8970 (reversed), within 1 mm`,
        pass: true,
        value: distance(lib, byHand),
        tolerance: EPOCH_TOLERANCE,
        unit: "m",
        detail: `library ${lib.map((v) => v.toFixed(4)).join(", ")}; hand ${byHand.map((v) => v.toFixed(4)).join(", ")}; operation accuracy ${op.accuracy ?? "not stated"} m`,
        // The pipeline is the same at both epochs; the coordinates differ.
        fingerprint: operationFingerprint(ctx, op, [lib]),
      });
    }
    const libraryMove = sub3(at2026.xyz, at2010.xyz);
    const handMove = sub3(hand2026, hand2010);
    results.push({
      ...base,
      id: `${base.id}.difference`,
      title:
        "GU2195's ITRF2014 position from 2010.0 to 2026.0: the library's difference against the hand Helmert's, within 1 mm",
      pass: true,
      value: distance(libraryMove, handMove),
      tolerance: EPOCH_TOLERANCE,
      unit: "m",
      detail: `library moves ${fmt(norm(libraryMove), 6)} m, hand ${fmt(norm(handMove), 6)} m`,
      effect: {
        value: norm(libraryMove) * 100,
        unit: "cm",
        label:
          "how far a NAD83(2011) point moves in ITRF2014 from 2010 to 2026",
      },
    });
    // PROJ's "no epoch": the rates do not apply, which by hand is t = t0.
    const missing = distance(noEpoch.xyz, at2026.xyz);
    const handMissing = norm(handMove);
    results.push({
      ...base,
      id: `${base.id}.no-epoch`,
      title:
        "The same point with no coordinate epoch (the rates do not apply) against epoch 2026.0: the error of leaving the epoch out matches the hand Helmert's 16-year move within 2%",
      pass: distance(noEpoch.xyz, at2010.xyz) < EPOCH_TOLERANCE,
      value: Math.abs(missing / handMissing - 1),
      tolerance: EFFECT,
      detail: `no epoch is ${fmt(distance(noEpoch.xyz, at2010.xyz), 3)} m from epoch 2010.0 (the parameter reference epoch)`,
      effect: {
        value: missing * 100,
        unit: "cm",
        label: "the error of giving no coordinate epoch, for a 2026 position",
      },
      fingerprint: operationFingerprint(ctx, noEpoch.op, [noEpoch.xyz]),
    });
    return results;
  },
);

export const coordinateEpochCases: readonly StressCase[] = [
  coordinateEpochCase,
];
