// Units: EPSG:6420 against its international-foot copy (plan 4a, Task 3).
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { type StressCase, fmt } from "../runner.ts";
import {
  EFFECT,
  INTERNATIONAL_FOOT,
  UNIT_RATIO,
  US_SURVEY_FOOT,
  distance,
  epsg,
  proj,
  stressCase,
} from "../shared.ts";

const unitsCase = stressCase(
  "units.foot",
  "units",
  "EPSG:6420 read in US survey feet and in international feet: lengths differ by the ratio of the two foot definitions",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const wkt = P.proj_as_wkt(P.proj_create("EPSG:6420"), P.PJ_WKT2_2019);
    // Only the coordinate system's axes change unit; the conversion keeps
    // its parameters in ftUS, so the map is the same.
    const cs = wkt.indexOf("CS[");
    const international =
      wkt.slice(0, cs) +
      wkt
        .slice(cs)
        .replaceAll(
          'LENGTHUNIT["US survey foot",0.304800609601219]',
          'LENGTHUNIT["foot",0.3048]',
        );
    if (international === wkt) {
      throw new Error("EPSG:6420's WKT2 has no US survey foot axes to change");
    }
    const usFrame = EngineeringFrame.create(
      { name: "ftUS", body: EARTH, crs: epsg(6420) },
      P,
    );
    const ftFrame = EngineeringFrame.create(
      { name: "ft", body: EARTH, crs: { format: "wkt2", wkt2: international } },
      P,
    );
    const unitsRight =
      Math.abs(usFrame.units.metersPerUnit - US_SURVEY_FOOT) < 1e-15 &&
      ftFrame.units.metersPerUnit === INTERNATIONAL_FOOT;
    const units = `units from PROJ: ${usFrame.units.horizontalUnitName} ${usFrame.units.metersPerUnit} m, ${ftFrame.units.horizontalUnitName} ${ftFrame.units.metersPerUnit} m`;
    const expected = US_SURVEY_FOOT / INTERNATIONAL_FOOT;
    const length = (
      frame: EngineeringFrame,
      from: readonly number[],
      to: readonly number[],
    ) => distance(frame.toBodyFixed(to), frame.toBodyFixed(from));

    // 1. The same place: the zone's false origin, in each frame's numbers (the
    //    false easting and northing are metres, so the international-foot
    //    numbers are larger by the ratio). 3280.84 of each frame's feet east
    //    from it: the lengths differ by the ratio alone, since both lines lie
    //    where the scale factor is the same.
    const usOrigin = [6_561_666.667, 1_640_416.667, 0];
    const ftOrigin = usOrigin.map((v) => v * expected);
    const east = (o: readonly number[]) => [o[0]! + 3280.84, o[1]!, 0];
    const placed =
      length(usFrame, usOrigin, east(usOrigin)) /
      length(ftFrame, ftOrigin, east(ftOrigin));

    // 2. The same numbers (plan 4a's check): they name places about 4 m apart,
    //    so the ratio also carries the scale factor's change between them.
    const sameNumbers =
      length(usFrame, usOrigin, east(usOrigin)) /
      length(ftFrame, usOrigin, east(usOrigin));
    // The hand formula: (1200/3937) / 0.3048 - 1, in ppm.
    const handPpm = (expected - 1) * 1e6;
    const libraryPpm = (sameNumbers - 1) * 1e6;
    return [
      {
        ...base,
        id: `${base.id}.same-place`,
        title:
          "3280.84 feet east from the same place in EPSG:6420 (US survey feet) and its international-foot copy: the lengths differ by the foot definitions' ratio, (1200/3937)/0.3048, within 1e-9",
        pass: unitsRight,
        value: Math.abs(placed / expected - 1),
        tolerance: UNIT_RATIO,
        detail: `${units}; ratio of lengths ${placed}, of the foot definitions ${expected}`,
      },
      {
        ...base,
        id: `${base.id}.same-numbers`,
        title:
          "The same numbers in EPSG:6420 and its international-foot copy: a 1 km line is longer by 2 ppm in US survey feet, against the hand formula (1200/3937)/0.3048 − 1, within 2%",
        pass: unitsRight,
        value: Math.abs(libraryPpm / handPpm - 1),
        tolerance: EFFECT,
        detail: `${units}; ${fmt(libraryPpm, 7)} ppm against ${fmt(handPpm, 7)} ppm by hand (the places differ by about 4 m, which moves the scale factor by a few parts in 1e9)`,
        effect: {
          value: libraryPpm,
          unit: "ppm",
          label:
            "reading US survey feet as international feet (about 2 mm per km)",
        },
      },
    ];
  },
);

export const unitsCases: readonly StressCase[] = [unitsCase];
