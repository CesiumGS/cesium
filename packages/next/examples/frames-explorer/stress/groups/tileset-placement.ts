// Tileset placement (plan 4b Task 21): the design globe's site-grid
// building (`SITE_BUILDING`: California zone 3 ftUS + NAVD88, pinned to
// GEOID18, a site grid rotated 12.5° and scaled 1.0000375) placed both ways
// a tileset can be (`placeRigid`, `placeReprojected`): the rigid placement
// inverts its own forward exactly, the reprojected one round-trips through
// PROJ, and the rigid one's sag 20 km out (`displayError`) is the hand
// formula's.
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import {
  type TilesetPlacement,
  placeReprojected,
  placeRigid,
} from "../../../../src/engineering/placement.ts";
import { SITE_BUILDING } from "../../../design-globe/sites.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  DESIGN_ROUND_TRIP,
  fingerprintOf,
  proj,
  stressCase,
} from "../shared.ts";
import { SITE_GAP_PART, siteGap } from "./rigid-placement-budget.ts";

const GROUP = "tileset-placement";
const ID = `${GROUP}.site-building`;

/**
 * A rigid placement's inverse of its own forward (the plan's accuracy
 * table): 4 ULPs of an Earth-radius coordinate. The round trip goes through
 * body-fixed metres, whose coordinates here are 4.2e6 to 8.4e6 m (2²² to
 * 2²³), where one ULP is 2⁻³⁰ m, about 9.3e-10 m; the transform and its
 * inverse each round a few of them, so 1e-9 m (about one ULP) is no bound
 * float64 can promise.
 */
const RIGID_INVERSE = 4 * 2 ** -30;

/** How far out the sag is checked, metres along the site grid's x axis. */
const SAG_AT = 20_000;

const site = SITE_BUILDING.frame.site!;

/**
 * Design points (design units): the building's footprint corners at its
 * roof, and points along both site axes out to 25 km each way (the 50 km
 * corridor), at design heights 0 and 100.
 */
function designs(frame: EngineeringFrame): number[][] {
  const { width, depth, stories, storyHeight } = SITE_BUILDING.model;
  const roof = stories * storyHeight;
  const out: number[][] = [
    [0, 0, 0],
    [width, 0, roof],
    [width, depth, roof],
    [0, depth, roof],
  ];
  const step = 5_000 / frame.units.metersPerUnit;
  for (let i = -5; i <= 5; i++) {
    if (i !== 0) {
      out.push([i * step, 0, 0], [0, i * step, 100]);
    }
  }
  return out;
}

/** The worst |designOf(displayed(d)) − d| over `points`, metres. */
function worstInverse(
  placement: TilesetPlacement,
  points: readonly number[][],
): number {
  const { frame } = placement;
  let worst = 0;
  for (const d of points) {
    const back = placement.designOf(placement.displayed(d));
    worst = Math.max(
      worst,
      Math.hypot(
        (back[0]! - d[0]!) * frame.units.metersPerUnit,
        (back[1]! - d[1]!) * frame.units.metersPerUnit,
      ),
      Math.abs(back[2]! - d[2]!) * frame.metersPerHeightUnit,
    );
  }
  return worst;
}

const NAME = `The design globe's site-grid building (${SITE_BUILDING.frame.name}: California zone 3 ftUS + NAVD88 through GEOID18, θ = 12.5°, s = 1.0000375)`;

const placementCase = stressCase(
  ID,
  GROUP,
  `${NAME}, placed as a tileset both ways: the rigid placement inverts its own forward within 4 ULPs of an Earth-radius coordinate (3.7 × 10⁻⁹ m), the reprojected one round-trips within 10⁻⁴ m, and the rigid sag 20 km out is the hand formula's`,
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(SITE_BUILDING.frame, proj(ctx));
    const points = designs(frame);
    const rigid = placeRigid(frame, SITE_BUILDING.origin);
    const reprojected = placeReprojected(frame);
    const results: StressResult[] = [];

    // 1. The rigid placement's inverse is its forward's (one transform).
    results.push({
      ...base,
      id: `${ID}.rigid-inverse`,
      title: `${NAME}: placed rigidly at its origin, the design point comes back after the forward and inverse (designOf(displayed(d))) within 4 ULPs of an Earth-radius coordinate (3.7 × 10⁻⁹ m), at its corners and out to 25 km`,
      pass: rigid.mode === "rigid" && rigid.rigid !== undefined,
      value: worstInverse(rigid, points),
      tolerance: RIGID_INVERSE,
      unit: "m",
      detail: `${points.length} design points; at the origin the rigid placement is ${fmt(rigid.displayError(SITE_BUILDING.origin))} m from the frame's own`,
      accuracyNote: "exact arithmetic: one rigid transform and its inverse",
    });

    // 2. The reprojected placement is the frame itself: no display error,
    // and its way back through PROJ.
    const drawnOff = Math.max(
      ...points.map((d) => reprojected.displayError(d)),
    );
    results.push({
      ...base,
      id: `${ID}.reprojected-round-trip`,
      title: `${NAME}: reprojected, every point through the frame, the design point comes back after the forward and inverse (designOf(displayed(d))) within 10⁻⁴ m out to 25 km, with no display error`,
      pass: reprojected.mode === "reprojected" && drawnOff === 0,
      value: worstInverse(reprojected, points),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: `${points.length} design points; display error ${fmt(drawnOff)} m; operation ${frame.operation.pipeline}`,
      accuracyNote:
        "a round trip through the recorded operation: the refined inverse's residual",
      fingerprint: fingerprintOf(ctx, frame, points),
    });

    // 3. The rigid sag 20 km along the site grid's x axis: the library's
    // display error against the hand formula. The hand: the drop d²/2R (R in
    // the axis's true azimuth) less GEOID18's rise from the origin to the
    // far point (design height 0 is NAVD88 0, so the exact point follows the
    // geoid and the rigid one keeps the origin's), and along the line
    // d(s/k̄ − 1) + d³/3R² (siteGap's, the rigid placement budget's).
    const g = siteGap(frame, site, SAG_AT);
    const far = [SAG_AT / frame.units.metersPerUnit, 0, 0];
    const sag = rigid.displayError(far);
    const rise =
      frame.toGeodetic(far).height -
      frame.toGeodetic(SITE_BUILDING.origin).height;
    const drop = g.hand.drop - rise;
    const hand = Math.hypot(drop, g.hand.along);
    results.push({
      ...base,
      id: `${ID}.sag-20km`,
      title: `${NAME}: placed rigidly at its origin, the point 20 km along the site grid's x axis is drawn off its true place by the hand formula's √(drop² + along²), within 1 mm: the drop d²/2R less GEOID18's rise along the line, and along it d(s/k̄ − 1) + d³/3R²`,
      pass: true,
      value: sag - hand,
      tolerance: SITE_GAP_PART,
      unit: "m",
      detail: `displayError ${fmt(sag, 7)} m; by hand ${fmt(hand, 7)} m: drop ${fmt(drop, 6)} m (d²/2R ${fmt(g.hand.drop, 6)} m with R ${fmt(g.radius, 8)} m at ${fmt(g.latitude, 6)}°, less GEOID18's rise ${fmt(rise, 4)} m), along ${fmt(g.hand.along, 6)} m (k̄ ${fmt(g.gridScale, 10)})`,
      effect: {
        value: sag,
        unit: "m",
        label:
          "how far rigid placement draws a point 20 km from the site-grid building's origin from where it truly is",
      },
      accuracyNote:
        "exact arithmetic: both placements through the same pinned GEOID18 operation, whose datum accuracy moves them together",
    });
    return results;
  },
);

export const tilesetPlacementCases: readonly StressCase[] = [placementCase];
