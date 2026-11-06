// The question cards (R14): every group, its lenses and its headline.
import {
  type Lens,
  type StressGroup,
  type StressResult,
  fmt,
  formatEffect,
} from "./runner.ts";

/** "n of m pass", then the first effect, else the worst value against its tolerance. */
function standardHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  // Display-only results (effects with no verdict) and the user's own
  // input (R18) are not counted.
  const judged = results.filter(
    (r) => r.displayOnly !== true && r.userInput !== true,
  );
  const passed = judged.filter((r) => r.pass).length;
  const count = `${passed} of ${judged.length} pass`;
  const effect = results.find((r) => r.effect !== undefined)?.effect;
  if (effect !== undefined) {
    return `${count}; ${formatEffect(effect)}`;
  }
  let worst: StressResult | undefined;
  let ratio = -1;
  for (const r of results) {
    if (r.value !== undefined && r.tolerance !== undefined && r.tolerance > 0) {
      const q = Math.abs(r.value) / r.tolerance;
      if (q > ratio) {
        ratio = q;
        worst = r;
      }
    }
  }
  return worst === undefined
    ? count
    : `${count}; worst ${fmt(worst.value!)} ${worst.unit ?? ""} against ${fmt(worst.tolerance!)}`.trimEnd();
}

function reproducibilityHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  const compared = results.filter((r) => r.fingerprintCheck !== undefined);
  if (compared.length === 0) {
    return `${results.length} fingerprinted results, not compared`;
  }
  const matched = compared.filter((r) => r.fingerprintCheck!.match).length;
  return `${matched} of ${compared.length} fingerprints match Node's`;
}

const group = (
  id: string,
  name: string,
  question: string,
  lenses: readonly Lens[],
  extra: Partial<Pick<StressGroup, "focus" | "collects" | "headline">> = {},
): StressGroup => ({
  id,
  name,
  question,
  lenses,
  headline: standardHeadline,
  ...extra,
});

const EARTH_FRAMES = ["ICRF", "GCRF", "ITRF"];

const ALL_FRAMES = [
  "ICRF",
  "HCRS",
  "GCRF",
  "EARTH_ICRF",
  "EME2000",
  "ITRF",
  "MOON_ICRF",
  "MOON_ME",
  "MOON_PA",
];

/**
 * Every question card, in the order the Verify tab lists them; every group
 * but the virtual Reproducibility has cases.
 */
export const STRESS_GROUPS: readonly StressGroup[] = [
  group(
    "projections",
    "Projections",
    "Do design coordinates survive the trip to the globe and back?",
    ["gis", "offshore"],
    { focus: { frames: ["ITRF"], overlay: "designGrid" } },
  ),
  group(
    "units",
    "Units",
    "Does the library tell US survey feet from international feet?",
    ["civil", "bim"],
    { focus: { frames: ["ITRF"], site: "california" } },
  ),
  group(
    "site-grids",
    "Site grids",
    "Do rotated and scaled site grids land where they should?",
    ["civil", "bim"],
    { focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" } },
  ),
  group(
    "recorded-operations",
    "Recorded operations",
    "Is the datum operation fixed, with its grids accounted for?",
    ["bim", "offshore"],
    { focus: { frames: ["ITRF"], site: "california" } },
  ),
  group(
    "frame-tree",
    "Frame tree",
    "Do the frames agree with each other however you go between them?",
    ["space"],
    { focus: { frames: ALL_FRAMES } },
  ),
  group(
    "time",
    "Time",
    "Is time continuous through leap seconds, and honest at the tables' ends?",
    ["space", "timing"],
    { focus: { frames: EARTH_FRAMES } },
  ),
  group(
    "trajectory",
    "Trajectory",
    "Is Orion's path used only where there is data?",
    ["space"],
    {
      focus: {
        frames: ["EME2000", "MOON_ME"],
        overlay: "trajectoryPath",
      },
    },
  ),
  group(
    "measurement",
    "Measurement",
    "Do design measurements agree with distances on the ground?",
    ["civil"],
    { focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" } },
  ),
  // 1b: the new groups.
  group(
    "reference-values",
    "Reference values",
    "Do results match published survey and geodesy values?",
    ["civil"],
  ),
  group(
    "vertical-profile",
    "Vertical profile",
    "Are vertical curves computed as the design manuals do?",
    ["civil"],
  ),
  group(
    "distortion",
    "Distortion",
    "How much does a projection stretch distances?",
    ["civil", "gis"],
  ),
  group(
    "rigid-placement-budget",
    "Rigid placement budget",
    "How big can a site be before rigid placement is off?",
    ["civil", "bim"],
  ),
  group(
    "coordinate-epoch",
    "Coordinate epoch",
    "How far do coordinates move between epochs?",
    ["gis", "av"],
  ),
  group(
    "axes-and-the-antimeridian",
    "Axes and the antimeridian",
    "Are axis order and the 180° meridian handled?",
    ["gis"],
  ),
  group(
    "space",
    "Space",
    "Do light time, Doppler and line of sight match the references?",
    ["space"],
  ),
  // 1c: the industry groups.
  group(
    "operation-candidates",
    "Operation candidates",
    "Which datum operation was chosen, and what were the alternatives?",
    ["gis", "offshore"],
  ),
  group(
    "ifc-map-conversion",
    "IFC map conversion",
    "Does an IFC map conversion place the model correctly?",
    ["bim"],
  ),
  group(
    "plate-motion",
    "Plate motion",
    "How fast does a map go stale as the plates move?",
    ["av"],
  ),
  group(
    "below-the-ellipsoid",
    "Below the ellipsoid",
    "Do scale factors and sight lines work below the ellipsoid?",
    ["civil"],
  ),
  group(
    "heights-and-wgs84",
    "Heights and WGS84",
    "Which height, and which WGS84, is this?",
    ["civil", "gis", "av"],
  ),
  group(
    "bound-crss",
    "Bound CRSs",
    "Are exported CRSs with TOWGS84 placed by their own parameters?",
    ["bim", "gis", "offshore"],
  ),
  group(
    "time-scales",
    "Time scales",
    "Are the GPS, TAI, TT and UTC offsets exact?",
    ["timing"],
  ),
  group(
    "lunar-time",
    "Lunar time",
    "How much faster does a clock on the Moon tick?",
    ["space", "timing"],
  ),
  // Virtual: every fingerprinted result, whatever its own group.
  group(
    "reproducibility",
    "Reproducibility",
    "Does the same file land the same in browser and Node?",
    ["bim", "offshore"],
    {
      collects: (r) => r.fingerprint !== undefined,
      headline: reproducibilityHeadline,
    },
  ),
];

/** The results a group's card shows. */
export function groupResults(
  g: StressGroup,
  results: readonly StressResult[],
): StressResult[] {
  return results.filter(g.collects ?? ((r) => r.group === g.id));
}
