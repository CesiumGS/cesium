// Rigid placement budget (ruling F1: RigidPlacement against EngineeringFrame
// directly; Task 3's rigidVsExact shares `rigidSeparation`, the same math).
import {
  EngineeringFrame,
  RigidPlacement,
  type SiteTransform,
} from "../../../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { ellipsoidOf, onEarth, radii } from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { epsg, fingerprintOf, proj, stressCase } from "../shared.ts";
import { gapParts } from "../../inset.ts";
import { rigidSeparation } from "../../overlays.ts";
import {
  WGS84_A,
  WGS84_E2,
  normalRadius,
  rigidGapByHand,
  siteAxisAzimuth,
} from "../../scenarios/sites.ts";
import { Ellipsoid } from "../../../../src/math/ellipsoid.ts";

const DEGREE = Math.PI / 180;
const WGS84 = Ellipsoid.WGS84;

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

/**
 * The gap between rigid and exact placement `meters` along a site grid's x
 * axis from its origin (design 0, 0, 0): the library's (`rigidSeparation`),
 * its parts as the inset splits them (`gapParts`), and the hand formula's
 * (`rigidGapByHand`) with the radius of curvature in the axis's direction
 * (its grid bearing, 90° less the rotation: the convergence, about a
 * degree, changes the radius by under 1e-5) at the origin's latitude, and
 * the grid's scale there. One computation: the catalog's check below and
 * the BIM site's answer (scenarios/bimSite.ts) both call it.
 */
export function siteGap(
  frame: EngineeringFrame,
  site: SiteTransform,
  meters: number,
) {
  const rigid = RigidPlacement.at(frame, [0, 0, 0]);
  const design = [meters / frame.units.metersPerUnit, 0, 0];
  const exact = Float64Array.from(frame.toBodyFixed(design));
  const placed = Float64Array.from(rigid.toBodyFixed(design));
  const start = rigid.toBodyFixed([0, 0, 0]);
  const along = [0, 1, 2].map((i) => placed[i]! - start[i]!);
  const parts = gapParts(exact, placed, along);
  const origin = WGS84.cartesianToCartographic(frame.toBodyFixed([0, 0, 0]), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const latitude = origin.latitude / DEGREE;
  const azimuth = siteAxisAzimuth(site.rotation / DEGREE);
  const radius = normalRadius(WGS84_A, WGS84_E2, latitude, azimuth);
  // The grid's scale at the origin, from the library (as grid to ground
  // takes its combined factor): at height 0 it is the projection's.
  const gridScale = gridFactors(frame, [0, 0, 0]).combinedFactor;
  const hand = rigidGapByHand({
    d: meters,
    radius,
    siteScale: site.scale,
    gridScale,
  });
  return {
    gap: rigidSeparation(rigid, frame, design),
    parts,
    hand,
    radius,
    gridScale,
    latitude,
    exact,
    placed,
    fingerprintDesigns: [[0, 0, 0], design],
  };
}

/** Within 1% of the hand formula: it takes the grid's scale at the origin, not its mean along the line. */
const SITE_GAP = 0.01;

/** The California measurement site (the BIM site's checked setup): EPSG:6420, θ = 12.5°, s = 1.0000375. */
const BIM_CHECKED: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: (12.5 * Math.PI) / 180,
  scale: 1.0000375,
};

const siteGapCase = stressCase(
  "rigid-placement-budget.site-gap",
  "rigid-placement-budget",
  "The California site grid (EPSG:6420, θ = 12.5°, s = 1.0000375): placed rigidly at its origin, the point 20 km along its x axis is off the exact placement by the hand formula's √((d²/2R)² + (d(s/k − 1))²), within 1%",
  ["proj"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site (2D)",
        body: EARTH,
        crs: epsg(6420),
        site: BIM_CHECKED,
      },
      proj(ctx),
    );
    const g = siteGap(frame, BIM_CHECKED, 20_000);
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(g.gap / g.hand.gap - 1),
        tolerance: SITE_GAP,
        detail: `gap ${fmt(g.gap, 6)} m (${fmt(g.parts.drop, 5)} m down, ${fmt(g.parts.along, 4)} m along); by hand ${fmt(g.hand.gap, 6)} m (d²/2R ${fmt(g.hand.drop, 5)} m with R ${fmt(g.radius, 7)} m at ${fmt(g.latitude, 6)}°; d(s/k − 1) ${fmt(g.hand.along, 4)} m with k ${fmt(g.gridScale, 10)})`,
        effect: {
          value: g.gap,
          unit: "m",
          label:
            "how far rigid placement puts a point 20 km along the site grid from where it belongs",
        },
        accuracyNote:
          "exact arithmetic: both placements through the same PROJ operation, whose datum accuracy moves them together",
        fingerprint: fingerprintOf(ctx, frame, g.fingerprintDesigns),
      },
    ];
  },
);

export const rigidPlacementBudgetCases: readonly StressCase[] = [
  rigidBudgetCase,
  siteGapCase,
];
