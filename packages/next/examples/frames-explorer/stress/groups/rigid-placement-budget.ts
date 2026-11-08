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
  MEASUREMENT_SITE,
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
 * axis from its origin (design 0, 0, `height`, the line level at that design
 * height): the library's (`rigidSeparation`),
 * its parts as the inset splits them (`gapParts`: the drop, and the part
 * along the line, positive where the rigid point falls short), and the hand
 * formula's (`rigidGapByHand`). The hand takes the radius of curvature in
 * the axis's true azimuth at the origin (its grid bearing, 90° less the
 * rotation, plus the convergence there) and the grid's mean scale along the
 * line (Simpson's rule over five points), from the library as grid to ground
 * takes its combined factor. One computation: the catalog's checks below and
 * the BIM site's answer (scenarios/bimSite.ts) both call it.
 *
 * Off the ellipsoid, the line is on a surface of radius R + h, h the
 * origin's ellipsoidal height, and the grid's combined factor carries its
 * elevation factor: both are taken at `height` (design height units). At
 * 290 m up (the design globe's site-grid building) R + h moves the drop by
 * 1.4 mm at 20 km, more than the 1 mm each part is checked to.
 */
export function siteGap(
  frame: EngineeringFrame,
  site: SiteTransform,
  meters: number,
  height = 0,
) {
  const onOrigin = [0, 0, height];
  const rigid = RigidPlacement.at(frame, onOrigin);
  const length = meters / frame.units.metersPerUnit;
  const design = [length, 0, height];
  const exact = Float64Array.from(frame.toBodyFixed(design));
  const placed = Float64Array.from(rigid.toBodyFixed(design));
  const start = rigid.toBodyFixed(onOrigin);
  const along = [0, 1, 2].map((i) => placed[i]! - start[i]!);
  const parts = gapParts(exact, placed, along);
  const origin = WGS84.cartesianToCartographic(frame.toBodyFixed(onOrigin), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const latitude = origin.latitude / DEGREE;
  const at = (t: number) => gridFactors(frame, [length * t, 0, height]);
  const convergence = at(0).convergence / DEGREE;
  const azimuth = siteAxisAzimuth(site.rotation / DEGREE) + convergence;
  const radius =
    normalRadius(WGS84_A, WGS84_E2, latitude, azimuth) + origin.height;
  const k = [0, 0.25, 0.5, 0.75, 1].map((t) => at(t).combinedFactor);
  const gridScale = (k[0]! + 4 * k[1]! + 2 * k[2]! + 4 * k[3]! + k[4]!) / 12;
  const hand = rigidGapByHand({
    d: meters,
    radius,
    siteScale: site.scale,
    gridScale,
  });
  return {
    gap: rigidSeparation(rigid, frame, design),
    /** The drop, and how far short along the line the rigid point falls (m). */
    drop: parts.drop,
    short: -parts.along,
    across: parts.across,
    hand,
    radius,
    gridScale,
    convergence,
    latitude,
    exact,
    placed,
    fingerprintDesigns: [onOrigin, design],
  };
}

/**
 * Each part within 1 mm of its hand formula: across the three CRSs, every
 * rotation and the scale knob's range, the drop is within 0.4 mm and the
 * part along within 0.05 mm (the higher-order terms the formulas leave
 * out), so a 1 mm along part, a tenth of the scale knob's step at 20 km,
 * shows.
 */
export const SITE_GAP_PART = 1e-3;

/** The site-gap checks' results for `frame` (the catalog's at the measurement site; the BIM site's live at its knobs). */
export function siteGapResults(
  g: ReturnType<typeof siteGap>,
  where: string,
  base: { id: string; group: string },
): StressResult[] {
  const accuracyNote =
    "exact arithmetic: both placements through the same PROJ operation, whose datum accuracy moves them together";
  return [
    {
      id: `${base.id}.drop`,
      group: base.group,
      title: `${where}: placed rigidly at its origin, the point 20 km along the site grid's x axis is above the exact placement by d²/2R, within 1 mm (R in the axis's true azimuth)`,
      pass: true,
      value: Math.abs(g.drop - g.hand.drop),
      tolerance: SITE_GAP_PART,
      unit: "m",
      detail: `drop ${fmt(g.drop, 7)} m; d²/2R ${fmt(g.hand.drop, 7)} m with R ${fmt(g.radius, 8)} m at ${fmt(g.latitude, 6)}°, azimuth ${fmt(siteAxisAzimuth(0) + g.convergence, 6)}° less the rotation (convergence ${fmt(g.convergence, 4)}°); the whole gap ${fmt(g.gap, 6)} m`,
      effect: {
        value: g.drop,
        unit: "m",
        label:
          "how far above the ground rigid placement puts a point 20 km along the site grid",
      },
      accuracyNote,
    },
    {
      id: `${base.id}.along`,
      group: base.group,
      title: `${where}: the rigid point 20 km along the site grid's x axis falls short of the exact one by d(s/k̄ − 1) + d³/3R², within 1 mm (k̄ the grid's mean scale along the line)`,
      pass: true,
      value: Math.abs(g.short - g.hand.along),
      tolerance: SITE_GAP_PART,
      unit: "m",
      detail: `short by ${fmt(g.short, 6)} m; by hand ${fmt(g.hand.along, 6)} m: d(s/k̄ − 1) ${fmt(g.hand.along - g.hand.chord, 6)} m with k̄ ${fmt(g.gridScale, 10)}, and the chord d³/3R² ${fmt(g.hand.chord, 4)} m`,
      effect: {
        value: g.short,
        unit: "m",
        label:
          "how far short along the line rigid placement puts a point 20 km along the site grid",
      },
      accuracyNote,
    },
  ];
}

const siteGapCase = stressCase(
  "rigid-placement-budget.site-gap",
  "rigid-placement-budget",
  "The California measurement site grid (EPSG:6420, θ = 12.5°, s = 1.0000375): placed rigidly at its origin, the point 20 km along its x axis is off the exact placement by the drop d²/2R and, along the line, d(s/k̄ − 1) + d³/3R², each within 1 mm",
  ["proj"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site (2D)",
        body: EARTH,
        crs: epsg(6420),
        site: MEASUREMENT_SITE,
      },
      proj(ctx),
    );
    const g = siteGap(frame, MEASUREMENT_SITE, 20_000);
    const [drop, along] = siteGapResults(
      g,
      "The California measurement site grid (EPSG:6420, θ = 12.5°, s = 1.0000375)",
      base,
    );
    return [
      {
        ...drop!,
        fingerprint: fingerprintOf(ctx, frame, g.fingerprintDesigns),
      },
      along!,
    ];
  },
);

export const rigidPlacementBudgetCases: readonly StressCase[] = [
  rigidBudgetCase,
  siteGapCase,
];
