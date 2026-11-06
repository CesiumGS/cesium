// Heights and WGS84: which height, and which WGS 84, at the California
// datasheet point (aviation and drones).
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { resolveOperation } from "../../../../src/engineering/crs.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { epsgTimeDependentHelmert, type EpsgParameter } from "../datum.ts";
import { geodeticToGeocentric, helmert, reversedHelmert } from "../geodesy.ts";
import {
  type NgsMark,
  citation,
  cited,
  ellipsoidOf,
  onEarth,
  printed,
  sexagesimal,
} from "../references.ts";
import { CALIFORNIA, type StressCase, fmt } from "../runner.ts";
import {
  EFFECT,
  US_SURVEY_FOOT,
  distance,
  epsg,
  fingerprintOf,
  proj,
  stressCase,
} from "../shared.ts";

/** The California datasheet point (NGS GU2195). */
function gu2195() {
  const mark = cited<NgsMark>("ngs-GU2195");
  return {
    mark,
    lat: sexagesimal(mark.latitude).value,
    lon: sexagesimal(mark.longitude).value,
    h: printed(mark.ellipsoidHeight),
  };
}

const itrfCase = stressCase(
  "heights-and-wgs84.nad83-itrf2014",
  "heights-and-wgs84",
  "NAD83(2011) against ITRF2014 at epoch 2026.0 at the California datasheet point (GU2195): the size of the difference, against the Coordinate epoch group's hand-coded EPSG 8970 Helmert, within 2%",
  ["proj"],
  async (ctx, base) => {
    const { lat, lon, h } = gu2195();
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const nad83 = geodeticToGeocentric(lon, lat, h.value, grs80.a, grs80.f);
    const op = resolveOperation(
      proj(ctx),
      { format: "wkid", authority: "EPSG", wkid: 6319, epoch: 2026 },
      "EPSG:7912",
    );
    const g = op.forward([lon, lat, h.value]);
    const library = geodeticToGeocentric(g[0]!, g[1]!, g[2]!, grs80.a, grs80.f);
    const record = cited<{ parameters: readonly EpsgParameter[] }>("epsg-8970");
    const t = epsgTimeDependentHelmert(record.parameters);
    const hand = helmert(nad83, reversedHelmert(t.parameters), {
      convention: "coordinate-frame",
      rates: reversedHelmert(t.rates),
      referenceEpoch: t.referenceEpoch,
      epoch: 2026,
    });
    const size = distance(library, nad83);
    const handSize = distance(hand, nad83);
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(size / handSize - 1),
        tolerance: EFFECT,
        source: citation("epsg-8970"),
        detail: `library ${fmt(size, 6)} m, hand ${fmt(handSize, 6)} m; operation accuracy ${op.accuracy ?? "not stated"} m`,
        effect: {
          value: size,
          unit: "m",
          label:
            "how far NAD83(2011) is from ITRF2014 (≈ today's WGS 84) in 2026 at GU2195",
        },
      },
    ];
  },
);

const ensembleCase = stressCase(
  "heights-and-wgs84.wgs84-ensemble",
  "heights-and-wgs84",
  "EPSG:4326 is the WGS 84 datum ensemble: NAD83(2011) to it, and the California frame to EPSG:4979, state accuracies of at least the ensemble's 2 m (EPSG datum ensemble 6326)",
  ["proj", "geoid"],
  async (ctx, base) => {
    const P = proj(ctx);
    const ensemble = cited<{
      ensembleAccuracy: string;
      members: string[];
      remark: string;
    }>("epsg-wgs84-ensemble");
    const accuracy = printed(ensemble.ensembleAccuracy).value;
    const toEnsemble = resolveOperation(P, epsg(6318), "EPSG:4326");
    const frame = EngineeringFrame.create(
      { name: "California zone 3", body: EARTH, crs: CALIFORNIA },
      P,
    );
    const stated = [toEnsemble.accuracy, frame.operation.accuracy];
    return [
      {
        ...base,
        pass: stated.every((a) => a !== undefined && a >= accuracy),
        detail: `NAD83(2011) to EPSG:4326: ${toEnsemble.accuracy ?? "not stated"} m (${toEnsemble.pipeline}); California frame to EPSG:4979: ${frame.operation.accuracy ?? "not stated"} m. Why: WGS 84 as EPSG:4326 is an ensemble of ${ensemble.members.length} realizations with an ensemble accuracy of ${ensemble.ensembleAccuracy} m, and EPSG treats them as one ("${ensemble.remark.split(".")[0]}."), so no operation to it can be better than that`,
      },
    ];
  },
);

const heightsCase = stressCase(
  "heights-and-wgs84.three-heights",
  "heights-and-wgs84",
  "Three heights at GU2195 through the California frame (EPSG:6420+6360 with GEOID18): the ellipsoid height to the NAVD88 height against the datasheet's h − N within 1 mm, the geoid separation shown beside the datasheet's GEOID18 height, and the datasheet's own leveled NAVD88 height shown beside it",
  ["proj", "geoid"],
  async (ctx, base) => {
    const { mark, lat, lon, h } = gu2195();
    const frame = EngineeringFrame.create(
      { name: "California zone 3", body: EARTH, crs: CALIFORNIA },
      proj(ctx),
    );
    // NAD83(2011) is placed as is: the frame's operation to WGS 84 is EPSG's
    // null transformation (±2 m), so body-fixed WGS 84 from the same numbers.
    const design = frame.fromBodyFixed(onEarth(lon, lat, h.value));
    const navd88 = design[2]! * US_SURVEY_FOOT;
    const N = printed(mark.geoidHeight);
    const leveled = printed(mark.orthometricHeight);
    const fromDatasheet = h.value - N.value;
    const separation = h.value - navd88;
    return [
      {
        ...base,
        id: `${base.id}.navd88`,
        title: `The NAVD88 height from the ellipsoid height ${mark.ellipsoidHeight} m through GEOID18, against the datasheet's h − N = ${fromDatasheet.toFixed(3)} m, within half a unit of each plus 1e-4 m`,
        pass: true,
        value: Math.abs(navd88 - fromDatasheet),
        tolerance: h.half + N.half + 1e-4,
        unit: "m",
        detail: `library ${navd88.toFixed(4)} m (design ${fmt(design[2]!, 9)} ftUS)`,
        fingerprint: fingerprintOf(ctx, frame, [design]),
      },
      {
        ...base,
        id: `${base.id}.separation`,
        title:
          "The geoid separation (ellipsoid height − NAVD88 height) beside the datasheet's GEOID18 height (shown, not judged: the NAVD88 row above checks it to 1.1 mm)",
        pass: true,
        displayOnly: true,
        detail: `library ${fmt(separation, 6)} m, datasheet ${mark.geoidHeight} m`,
        effect: {
          value: separation,
          unit: "m",
          label:
            "how far the NAVD88 height and the GPS (ellipsoid) height differ at GU2195",
        },
      },
      {
        ...base,
        id: `${base.id}.leveled`,
        title:
          "The datasheet's own NAVD88 height (adjusted by leveling) against h − N through GEOID18: GEOID18's fit at this mark (shown, not judged)",
        pass: true,
        displayOnly: true,
        detail: `leveled ${mark.orthometricHeight} m (${mark.orthometricHeightMethod}); GEOID18 ${navd88.toFixed(3)} m; ${fmt((leveled.value - navd88) * 1000, 3)} mm apart`,
        effect: {
          value: (leveled.value - navd88) * 1000,
          unit: "mm",
          label: "GEOID18's fit to leveling at GU2195",
        },
      },
    ];
  },
);

export const heightsAndWgs84Cases: readonly StressCase[] = [
  itrfCase,
  ensembleCase,
  heightsCase,
];
