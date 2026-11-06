// Rigid placement budget (ruling F1: RigidPlacement against EngineeringFrame
// directly; Task 3's rigidVsExact shares `rigidSeparation`, the same math).
import {
  EngineeringFrame,
  RigidPlacement,
} from "../../../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { ellipsoidOf, onEarth, radii } from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { epsg, proj, stressCase } from "../shared.ts";
import { rigidSeparation } from "../../overlays.ts";

const RIGID_SITES: readonly {
  readonly latitude: number;
  readonly longitude: number;
  readonly crs: number;
  readonly name: string;
}[] = [
  { latitude: 0, longitude: 3, crs: 32631, name: "WGS 84 / UTM zone 31N" },
  { latitude: 37, longitude: -123, crs: 32610, name: "WGS 84 / UTM zone 10N" },
  { latitude: 60, longitude: 9, crs: 32632, name: "WGS 84 / UTM zone 32N" },
  {
    latitude: 80,
    longitude: -45,
    crs: 3413,
    name: "WGS 84 / NSIDC Sea Ice Polar Stereographic North",
  },
];

const RIGID_TARGETS = [0.001, 0.01, 0.1];

// m
/** Each extent's separation and its curvature-formula extent (the plan's 10%). */
const RIGID_BUDGET = 0.1;

const rigidBudgetCase = stressCase(
  "rigid-placement-budget.extents",
  "rigid-placement-budget",
  "Ground-scaled site grids at latitudes 0°, 37°, 60° (UTM) and 80° (polar stereographic): how far from the origin rigid placement drifts 1 mm, 1 cm and 10 cm from the exact placement, against √(2Rε) with R the Gaussian mean radius, within 10%",
  ["proj"],
  async (ctx, base) => {
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const results: StressResult[] = [];
    for (const site of RIGID_SITES) {
      const plain = EngineeringFrame.create(
        { name: site.name, body: EARTH, crs: epsg(site.crs) },
        proj(ctx),
      );
      const origin = plain.fromBodyFixed(
        onEarth(site.longitude, site.latitude),
      );
      // Ground units: the site scale is the combined factor there (h = 0), so
      // a design metre is a metre on the ground, as rigid placement assumes.
      const scale = gridFactors(plain, origin).combinedFactor;
      const frame = EngineeringFrame.create(
        {
          name: `${site.name} site`,
          body: EARTH,
          crs: epsg(site.crs),
          site: { origin: [origin[0]!, origin[1]!, 0], rotation: 0, scale },
        },
        proj(ctx),
      );
      const rigid = RigidPlacement.at(frame, [0, 0, 0]);
      // East from the origin: along the central meridian's normal for UTM,
      // along the parallel for the polar stereographic (constant scale).
      const separation = (x: number) =>
        rigidSeparation(rigid, frame, [x, 0, 0]);
      const R = radii(wgs84.a, wgs84.e2, site.latitude).gaussian;
      for (const target of RIGID_TARGETS) {
        let lo = 0;
        let hi = 10_000;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          if (separation(mid) < target) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        const extent = (lo + hi) / 2;
        const reached = separation(extent);
        const curvature = Math.sqrt(2 * R * target);
        const label =
          target >= 0.1
            ? `${target * 100} cm`
            : target >= 0.01
              ? "1 cm"
              : "1 mm";
        results.push({
          ...base,
          id: `${base.id}.lat-${site.latitude}-${label.replace(" ", "")}`,
          title: `Latitude ${site.latitude}° (${site.name}): the extent where rigid placement is off by ${label} is within 10% of √(2Rε) = ${fmt(curvature, 4)} m, and its separation within 10% of ${label}`,
          pass: Math.abs(reached / target - 1) <= RIGID_BUDGET,
          value: Math.abs(extent / curvature - 1),
          tolerance: RIGID_BUDGET,
          detail: `extent ${fmt(extent, 6)} m, separation there ${fmt(reached, 6)} m; R ${fmt(R, 7)} m; site scale ${fmt(scale, 10)}`,
          effect: {
            value: extent,
            unit: "m",
            label: `how far a rigidly placed site reaches before it is off by ${label} at ${site.latitude}°`,
          },
        });
      }
    }
    return results;
  },
);

export const rigidPlacementBudgetCases: readonly StressCase[] = [
  rigidBudgetCase,
];
