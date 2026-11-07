// A scenario's answer as the page writes it (DESIGN.md "Copy and numbers"):
// its figure with its unit, its accuracy in one line (R8: always stated, "not
// bounded" with its reason when it has no size), and how far a setting moves
// it from the checked setup's. Pure, unit-tested.
import type { ScenarioAnswer } from "../scenarios/evaluate.ts";
import type { TerrainSightView } from "./model.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { onGrid } from "../scenarios/placement.ts";
import { length, quantity } from "./format.ts";

/** Digits after the point that suit a unit's figures. */
const DIGITS: Readonly<Record<string, number>> = {
  "°": 2,
  "km/s": 2,
  "µs/day": 2,
  // The BIM site's gap ("31.4 m"), the corridor's station ("650.00 ft").
  m: 1,
  ft: 2,
  // The dish's light time to the µs (300 m; plan 3's check is 0.5 m).
  s: 6,
};

const grouped = (value: number, digits: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** "56.02 µs/day", "178.31°", "1.24 km/s". */
export function formatAnswer(
  value: number,
  unit: string,
  digits?: number,
): string {
  const text = grouped(value, digits ?? DIGITS[unit] ?? 3).replace("-", "−");
  return unit === "°" ? `${text}°` : `${text} ${unit}`;
}

/**
 * The accuracy needs the warning colour: the evaluator flagged it as having
 * no size (not bounded, not stated or not known). A bounded relative figure
 * ("within 2% of the method") isn't a warning (fix 2). The flag, not the
 * note's words, decides (Task 4c item 4).
 */
export function accuracyWarns(answer: ScenarioAnswer): boolean {
  return (
    answer.accuracy.meters === undefined && answer.accuracy.unbounded === true
  );
}

/** "±1.1 m (1σ): measured Earth orientation …", "Within 2% …", or "Not bounded: …". */
export function accuracyLine(answer: ScenarioAnswer): string {
  const { meters, note, unbounded } = answer.accuracy;
  if (meters !== undefined) {
    return `±${length(meters)} (1σ): ${note}`;
  }
  const sentence = note.charAt(0).toUpperCase() + note.slice(1);
  // An unbounded accuracy says so first, unless its note already does.
  return unbounded === true &&
    !/^(not bounded|not stated|not known)/i.test(note)
    ? `Not bounded: ${note}`
    : sentence;
}

/** "+2.31°", "−0.04 km/s", "no change". */
export function formatDelta(value: number, unit: string): string {
  if (value === 0) {
    return "no change";
  }
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatAnswer(Math.abs(value), unit)}`;
}

/**
 * The headline both the panel and the globe's callout show: the figure and
 * the few words that make it answer the question on its own ("1.40 km/s
 * relative to the Moon (MOON_ME)"); undefined without a figure.
 */
export function answerTitle(answer: ScenarioAnswer): string | undefined {
  if (answer.value === undefined || answer.unit === undefined) {
    // No figure: the words alone, when they answer it ("Not placed: …").
    return answer.label !== "" ? answer.label : undefined;
  }
  const figure = formatAnswer(answer.value, answer.unit, answer.digits);
  return answer.label ? `${figure} ${answer.label}` : figure;
}

/** The headline's published counterpart, as the panel shows it (the owner, fix 1). */
export interface PublishedView {
  printed: string;
  document: string;
  url?: string;
  tolerance: string;
  unit: string;
  /** "checked": the catalog's comparison is in; "off": off the checked setup; "loading": not yet. */
  state: "checked" | "off" | "loading";
  /** At the checked setup: ours, the difference, and the verdict. */
  ours?: number;
  difference?: { value: number; unit?: string };
  pass?: boolean;
  /** Off it: how far the setting moves the answer (the checks' delta). */
  delta?: { value: number; unit: string };
}

/**
 * The comparison under the headline, in words: what was published and by
 * whom, then ours against it with the difference and the verdict at the
 * checked setup; off it, that the published value applies there and how far
 * the setting moves the answer, with no verdict; loading, no verdict.
 */
export function publishedText(p: PublishedView): {
  published: string;
  comparison: string;
} {
  const published = `Published: ${p.printed}`;
  switch (p.state) {
    case "checked":
      return {
        published,
        comparison: [
          p.ours !== undefined ? `ours ${formatAnswer(p.ours, p.unit)}` : "",
          p.difference
            ? `difference ${quantity(p.difference.value, p.difference.unit)}`
            : "",
          p.tolerance,
          p.pass ? "passes" : "fails",
        ]
          .filter((t) => t !== "")
          .join(" · "),
      };
    case "off":
      return {
        published,
        comparison: `The published value applies at the checked setup${
          p.delta
            ? `; your setting moves the answer by ${formatDelta(p.delta.value, p.delta.unit)}`
            : ""
        }. No verdict here.`,
      };
    case "loading":
      return { published, comparison: "Checking ours against it…" };
  }
}

/** "30%", or "under 1%" for a sliver. */
const share = (x: number) =>
  x > 0 && x < 0.005 ? "under 1%" : `${Math.round(x * 100)}%`;

/**
 * The answer with the terrain's verdict joined to the sky's (Task 6b fix 1):
 * the weakest of the Earth, the Moon and the terrain leads the aside. Clear
 * of the Earth and the Moon but blocked by the terrain, the headline says so
 * and drops its figure; inside the terrain's error it says the terrain may
 * block, with that error; over unknown terrain, how much is unknown. Never a
 * pass the terrain hasn't given.
 */
export function withTerrain(
  answer: ScenarioAnswer,
  terrain: readonly TerrainSightView[] | undefined,
): ScenarioAnswer {
  const sky = answer.sky;
  if (!sky) {
    return answer;
  }
  // The line of sight's own view: the mask's check is a Checks row. A
  // trace made for another setup (its `traced` isn't the sky's key) isn't
  // this one's: not traced yet (Task 6c's rule; the capstone, Task 8).
  const found = terrain?.find((v) =>
    sky.line !== undefined ? v.id === sky.line : v.id !== "mask-check",
  );
  const t: TerrainSightView | undefined =
    found && sky.key !== undefined && found.traced !== sky.key
      ? { id: found.id, state: "waiting", text: "" }
      : found;
  let lead = sky.text;
  let blocked = false;
  if (sky.state === "clear" && t) {
    const err = t.meters !== undefined ? ` (±${length(t.meters)})` : "";
    switch (t.state) {
      case "clear":
        lead = `${sky.text}, and of the terrain${err}`;
        break;
      case "may-block":
        lead = `${sky.text}; the terrain may block it${err}`;
        break;
      case "unknown":
        lead = `${sky.text}; the terrain is unknown over ${share(t.unknownFraction ?? 1)} of the path near the ground`;
        break;
      case "waiting":
        lead = `${sky.text}; the terrain isn't traced yet`;
        break;
      case "blocked":
        blocked = true;
        lead = `Blocked by the terrain ${sky.where}: the Earth and the Moon are clear`;
        break;
    }
  }
  const aside = [lead, answer.aside].filter((x) => x).join(" · ");
  if (!blocked) {
    return { ...answer, aside };
  }
  const rest = { ...answer };
  delete rest.value;
  delete rest.unit;
  return { ...rest, label: `Blocked by the terrain ${sky.where}`, aside };
}

type Footprint = NonNullable<ScenarioAnswer["footprint"]>;

const dist3 = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** "6,012,345.6". */
const tenths = (v: number) => grouped(v, 1).replace("-", "−");

/**
 * A point the footprint's sight line met (Earth-fixed m) on the design
 * grid: easting and northing through the local placement, the site grid's
 * x and y through its map conversion (exact), and how far the placement
 * has drifted from PROJ there, m (Task 7).
 */
export function footprintAt(
  fp: Footprint,
  hit: ArrayLike<number>,
): { e: number; n: number; x: number; y: number; drift: number } {
  const [e, n] = onGrid(fp.placement, hit);
  const c = Math.cos(fp.site.rotation);
  const s = Math.sin(fp.site.rotation);
  const dx = (e - fp.site.origin[0]) / fp.site.scale;
  const dy = (n - fp.site.origin[1]) / fp.site.scale;
  const d = dist3(hit, fp.at);
  return {
    e,
    n,
    x: c * dx + s * dy,
    y: -s * dx + c * dy,
    drift: fp.perSquareMeter * d * d,
  };
}

/** "Camera looks here · E 6,012,345.6, N 2,101,234.5 ftUS": the footprint's label on the globe. */
export function footprintLabel(fp: Footprint, hit: ArrayLike<number>): string {
  const p = footprintAt(fp, hit);
  return `Camera looks here · E ${tenths(p.e)}, N ${tenths(p.n)} ${fp.unit}`;
}

/**
 * The drone's answer with the page's trace of its camera's ray (Task 7):
 * where it meets the terrain, on the design grid, with the accuracy that
 * brings (the terrain's error along the ray, the CRS's datum, the local
 * placement's drift). A trace made for other knobs is not this one's
 * (Task 6c's rule): tracing until it is. Never a spot the terrain hasn't
 * given: over terrain not drawn, or within its error, it says it can't tell.
 */
function withFootprint(
  answer: ScenarioAnswer,
  fp: Footprint,
  terrain: readonly TerrainSightView[] | undefined,
): ScenarioAnswer {
  const v = terrain?.find((t) => t.id === fp.line);
  const unbounded = (label: string, note: string): ScenarioAnswer => ({
    ...answer,
    label,
    accuracy: { note, unbounded: true },
  });
  if (!v || v.traced !== fp.key || v.state === "waiting") {
    return unbounded(
      "Tracing the camera's ray on the terrain",
      v?.state === "waiting" && v.traced === fp.key
        ? v.text
        : "not known until the ray is traced over the terrain",
    );
  }
  switch (v.state) {
    case "blocked": {
      if (!v.hitAt) {
        break;
      }
      const p = footprintAt(fp, v.hitAt);
      const range = v.from ? dist3(v.hitAt, v.from) : undefined;
      const err = v.meters ?? 0;
      const tan = Math.tan((Math.max(fp.tilt, 1) * Math.PI) / 180);
      const along = err / tan;
      const datum = fp.datum.meters ?? 0;
      const meters = Math.hypot(along, datum, p.drift);
      const datumWords =
        fp.datum.meters !== undefined
          ? `the CRS's ±${length(fp.datum.meters)} datum (PROJ's operation to WGS 84)`
          : fp.datum.note;
      return {
        ...answer,
        label: `Looking at E ${tenths(p.e)}, N ${tenths(p.n)} ${fp.unit}`,
        aside: [
          `On the terrain${range !== undefined ? ` ${length(range)} from the camera` : ""}`,
          `on the BIM site grid x ${tenths(p.x)}, y ${tenths(p.y)} ${fp.unit}`,
          answer.aside,
        ]
          .filter((x) => x)
          .join(" · "),
        accuracy: {
          meters,
          note: `the terrain's ±${length(err)} along a ray ${fp.tilt}° down moves the spot about ±${length(along)} on level ground (most of it, when it leads); ${datumWords}; the local placement's ${length(p.drift)} from PROJ`,
        },
      };
    }
    case "clear":
      return unbounded(
        `No ground within ${(fp.reach / 1000).toFixed(1)} km of the camera`,
        "the ray clears the drawn terrain by more than its error as far as it is traced",
      );
    case "unknown":
      return unbounded(
        "Can't tell: the terrain isn't drawn along the ray",
        v.text,
      );
    case "may-block":
      return unbounded(
        "Can't tell: the ray grazes the terrain, within its error",
        v.text,
      );
  }
  return unbounded("Tracing the camera's ray on the terrain", v.text);
}

/** A point's height above the ellipsoid, m. */
const heightOf = (p: ArrayLike<number>): number | undefined =>
  Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })?.height;

/**
 * The ship's answer with the page's trace of the mast's sight line to the
 * buoy (Task 7): the verdict joins the label and leads the aside. It says
 * what decided it: where the line meets the drawn terrain, or the lowest
 * clearance beyond each end's own ground (the ray's margin) with the
 * terrain's error there, over the drawn sea or the drawn land. The sea is
 * GEOID18's whatever the datum knob says (review finding 9): ground within
 * 3 m of it is the sea. Never in sight over terrain not drawn, or within
 * its error.
 */
function withSight(
  answer: ScenarioAnswer,
  sight: NonNullable<ScenarioAnswer["sight"]>,
  terrain: readonly TerrainSightView[] | undefined,
): ScenarioAnswer {
  const v = terrain?.find((t) => t.id === sight.line);
  const join = (verdict: string, lead: string): ScenarioAnswer => ({
    ...answer,
    label: `${answer.label} · ${verdict}`,
    aside: [lead, answer.aside].filter((x) => x).join(" · "),
  });
  if (!v || v.traced !== sight.key || v.state === "waiting") {
    return join(
      "buoy: tracing",
      `${sight.target}: ${v?.state === "waiting" && v.traced === sight.key ? v.text : "the sight line isn't traced yet"}`,
    );
  }
  /** "the drawn sea" or "the drawn land" under a point `above` m over the drawn surface. */
  const ground = (p: ArrayLike<number>, above: number) => {
    const h = heightOf(p);
    return h !== undefined && Math.abs(h - above - sight.sea) < 3
      ? "the drawn sea"
      : "the drawn land";
  };
  /** "2.1 km short of the buoy". */
  const short = (p: ArrayLike<number>) =>
    v.to ? ` ${length(dist3(p, v.to))} short of ${sight.target}` : "";
  const m = v.margin;
  switch (v.state) {
    case "clear":
      return join(
        "buoy in sight",
        `${sight.target} in sight: ${m ? `the line passes ${length(m.clearance)} over ${ground(m.at, m.clearance)}${short(m.at)} at its lowest, beyond the terrain's ±${length(m.error)}` : "the line clears the drawn terrain"}`,
      );
    case "blocked": {
      const where = v.hitAt
        ? ` ${ground(v.hitAt, 0)}${v.from ? ` ${length(dist3(v.hitAt, v.from))} out` : ""}`
        : " the drawn terrain";
      return join(
        "buoy hidden",
        `${sight.target} hidden: the line meets${where}`,
      );
    }
    case "may-block":
      return join(
        "buoy: can't tell",
        m
          ? `${sight.target}: the line passes ${length(m.clearance)} over ${ground(m.at, m.clearance)}${short(m.at)}, inside the terrain's ±${length(m.error)} (a per-level heuristic): can't tell`
          : `${sight.target}: the line passes within the terrain's error; can't tell`,
      );
    case "unknown":
      return join(
        "buoy: can't tell",
        `${sight.target}: ${v.unknownFraction !== undefined && v.unknownFraction < 1 ? `the terrain is unknown over ${share(v.unknownFraction)} of the line near the ground` : "no drawn terrain to trace it over"}; can't tell`,
      );
  }
  return answer;
}

/** The answer with the page's terrain traces its footprint or sight line asks for (Task 7). */
export function withTerrainAnswer(
  answer: ScenarioAnswer,
  terrain: readonly TerrainSightView[] | undefined,
): ScenarioAnswer {
  if (answer.footprint) {
    return withFootprint(answer, answer.footprint, terrain);
  }
  if (answer.sight) {
    return withSight(answer, answer.sight, terrain);
  }
  return answer;
}
