// Operation candidates: ED50 to WGS 84 at a North Sea point, PROJ's list of
// candidates against the EPSG registry (offshore energy, where the registry
// began).
import { citation } from "../references.ts";
import {
  type AreaOfInterest,
  type OperationCandidate,
  listOperations,
  resolveOperation,
} from "../../../../src/engineering/crs.ts";
import {
  ellipsoidShape,
  epsgTransformation,
  extentBox,
  geog2dHelmert,
} from "../datum.ts";
import { geodeticToGeocentric } from "../geodesy.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  EFFECT,
  distance,
  epsg,
  operationFingerprint,
  proj,
  stressCase,
} from "../shared.ts";

/** The North Sea point, ED50 longitude and latitude (degrees), at h = 0. */
const POINT = [3, 56, 0] as const;

/** A box of 0.1° around it: where the coordinates are (ruling F8). */
export const NORTH_SEA: AreaOfInterest = {
  west: 2.9,
  south: 55.9,
  east: 3.1,
  north: 56.1,
};

/** The EPSG records copied from epsg.org, by the candidate they describe. */
const RECORDS = ["epsg-1311", "epsg-1133", "epsg-1134"] as const;

const usable = (c: OperationCandidate) =>
  c.instantiable &&
  !c.ballpark &&
  c.missingGrids.length === 0 &&
  c.pipeline !== "";

/** Every pair's distance, the largest, m. */
function largestSpread(points: readonly ArrayLike<number>[]): number {
  let worst = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      worst = Math.max(worst, distance(points[i]!, points[j]!));
    }
  }
  return worst;
}

const candidatesCase = stressCase(
  "operation-candidates.ed50-north-sea",
  "operation-candidates",
  "ED50 to WGS 84 at 56°N 3°E with an area of interest: PROJ lists at least two accurate candidates, resolveOperation records the one its rule picks, their accuracies and areas of use match the EPSG registry, and their spread matches the hand-coded EPSG Helmerts within 2%",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const results: StressResult[] = [];
    const ed50 = epsg(4230);
    const candidates = listOperations(P, ed50, epsg(4979), {
      areaOfInterest: NORTH_SEA,
    });
    const accurate = candidates.filter(usable);
    const everything = listOperations(P, ed50, epsg(4979));
    results.push({
      ...base,
      id: `${base.id}.candidates`,
      source: citation("epsg-1311"),
      title:
        "PROJ's candidates for ED50 to WGS 84 within 0.1° of 56°N 3°E include at least two accurate (non-ballpark) operations; without the area of interest it offers only the ballpark",
      pass: accurate.length >= 2 && everything.filter(usable).length === 0,
      detail: `with the area: ${candidates.map((c) => `${c.name} (${c.accuracy ?? "no"} m)`).join("; ")}; without: ${everything.map((c) => c.name).join("; ")}`,
    });

    // The rule: the first instantiable, non-ballpark candidate with all its
    // grids and a PROJ string, in PROJ's order.
    const recorded = resolveOperation(P, ed50, "EPSG:4979", {
      areaOfInterest: NORTH_SEA,
    });
    const picked = accurate[0];
    const recordedAt = recorded.forward(POINT);
    const wgs84 = ellipsoidShape("epsg-ellipsoid-wgs84");
    const geocentric = (g: ArrayLike<number>) =>
      geodeticToGeocentric(g[0]!, g[1]!, g[2]!, wgs84.a, wgs84.f);
    results.push({
      ...base,
      id: `${base.id}.recorded`,
      source: citation("epsg-1311"),
      title:
        "resolveOperation with the same area records the candidate its documented rule picks from listOperations' list (pipeline and accuracy)",
      pass:
        picked !== undefined &&
        recorded.pipeline === picked.pipeline &&
        recorded.accuracy === picked.accuracy &&
        !recorded.ballpark,
      detail: `recorded ${picked?.name ?? "nothing"}, accuracy ${recorded.accuracy ?? "not stated"} m: ${recorded.pipeline}`,
      fingerprint: operationFingerprint(ctx, recorded, [
        geocentric(recordedAt),
      ]),
    });

    // Each candidate against its EPSG record: accuracy and area of use.
    for (const id of RECORDS) {
      const { record, accuracy } = epsgTransformation(id);
      const candidate = candidates.find((c) => c.name === record.name);
      const box = extentBox(record);
      let worst = Infinity;
      let half = 0;
      if (candidate?.areaOfUse !== undefined && box !== undefined) {
        worst = 0;
        for (const side of ["west", "south", "east", "north"] as const) {
          worst = Math.max(
            worst,
            Math.abs(candidate.areaOfUse[side] - box[side].value),
          );
        }
        // EPSG records bounding boxes to 0.01°; the API's JSON numbers drop
        // trailing zeros ("-16.1" is -16.10).
        half = 0.005;
      }
      const accuracyMatches =
        candidate?.accuracy !== undefined &&
        Math.abs(candidate.accuracy - accuracy.value) <= accuracy.half;
      results.push({
        ...base,
        id: `${base.id}.${id}`,
        source: citation(id),
        title: `${record.name} (EPSG transformation ${id.slice(5)}): PROJ's candidate states the registry's accuracy (${record.accuracy} m) and area of use (${record.extent?.name ?? "?"}), the box within half of its last 0.01°`,
        pass: accuracyMatches,
        value: worst,
        tolerance: half,
        unit: "°",
        detail:
          candidate === undefined
            ? `no candidate is named "${record.name}"`
            : `candidate accuracy ${candidate.accuracy ?? "none"} m against ${record.accuracy} m; area ${JSON.stringify(candidate.areaOfUse)} against W ${box?.west.value} S ${box?.south.value} E ${box?.east.value} N ${box?.north.value}`,
      });
    }

    // The spread: every accurate candidate's result, library against hand.
    const ed50Shape = ellipsoidShape("epsg-ellipsoid-international-1924");
    const libraryPoints = accurate.map((c) =>
      geocentric(
        resolveOperation(P, ed50, "EPSG:4979", {
          pipeline: c.pipeline,
        }).forward(POINT),
      ),
    );
    const named = accurate.map((c) =>
      RECORDS.find((id) => epsgTransformation(id).record.name === c.name),
    );
    const handPoints = named.flatMap((id) => {
      if (id === undefined) {
        return [];
      }
      const t = epsgTransformation(id);
      return [
        geog2dHelmert(POINT, ed50Shape, t.parameters, t.convention, wgs84).xyz,
      ];
    });
    const library = largestSpread(libraryPoints);
    const hand = largestSpread(handPoints);
    results.push({
      ...base,
      id: `${base.id}.spread`,
      source: citation("epsg-1311"),
      title:
        "The largest distance between the accurate candidates' WGS 84 positions of the point, against the same from the EPSG records' parameters by hand (IOGP 373-7-2 §4.2), within 2%",
      pass: handPoints.length === libraryPoints.length,
      value: Math.abs(library / hand - 1),
      tolerance: EFFECT,
      detail: `library ${fmt(library, 6)} m, hand ${fmt(hand, 6)} m over ${accurate.map((c) => c.name).join(", ")}`,
      effect: {
        value: library,
        unit: "m",
        label:
          "how far apart ED50's registered transformations put one North Sea point",
      },
    });
    return results;
  },
);

export const operationCandidatesCases: readonly StressCase[] = [candidatesCase];
