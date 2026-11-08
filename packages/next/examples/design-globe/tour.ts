// The design globe's short tour (plan 4b Task 20; DESIGN.md "A short tour",
// owner 2026-11-07): seven steps, one sentence of narration each, with Next,
// Back and "Explore on your own" always there. Each step names what it
// shows (a placement, a site and a camera shot); main.ts applies it, and
// leaving keeps the view, the placement and the measurements. The steps'
// figures come from the page's data (`TourFacts`), never from here: a
// figure the page doesn't have yet is left out of the sentence. Pure, so
// test/designGlobeTour.test.ts runs it in Node.
import { fixed } from "./measureModel.ts";
import { errorText, lengthText, rigidVerdict, type Placement } from "./page.ts";
import { cause } from "./siteFacts.ts";

/** Where a step points the camera: main.ts's shots. */
export type TourShot = "opening" | "mark" | "pair" | "tunnel" | "site" | "keep";

export interface TourStep {
  readonly id:
    "rigid" | "morph" | "mark" | "pair" | "tunnel" | "ladder" | "yours";
  readonly title: string;
}

/** DESIGN.md's seven steps, in order. */
export const TOUR_STEPS: readonly TourStep[] = [
  { id: "rigid", title: "Rigid at one anchor" },
  { id: "morph", title: "Reprojected" },
  { id: "mark", title: "Against a survey mark" },
  { id: "pair", title: "The 10,000 ftUS pair" },
  { id: "tunnel", title: "Under the hills" },
  { id: "ladder", title: "Down the scale ladder" },
  { id: "yours", title: "Yours to explore" },
];

/**
 * The tunnel the "Under the hills" step shows (with "See underground" on):
 * the one under the alignment's middle, stations 86,700 to 92,300, under
 * up to 680 ftUS of hill.
 */
export const TOUR_TUNNEL = { from: 86_700, to: 92_300 } as const;

/** The ladder step's stops: the building, the airport and the pole line. */
export const TOUR_LADDER: readonly {
  readonly site: string;
  readonly label: string;
}[] = [
  { site: "amsterdam", label: "Building" },
  { site: "sydney", label: "Airport" },
  { site: "london", label: "Pole line" },
];

const LADDER_STEP = TOUR_STEPS.findIndex((s) => s.id === "ladder");
const LAST = TOUR_STEPS.length - 1;

/** Where the tour is: its step (0-based) and, on the ladder, its stop. */
export interface TourState {
  readonly step: number;
  readonly stop: number;
}

export type TourAction =
  | { readonly type: "start"; readonly step?: number }
  | { readonly type: "next" }
  | { readonly type: "back" }
  | { readonly type: "stop"; readonly stop: number }
  | { readonly type: "leave" };

/** The tour after `action`; undefined once left (or never started). */
export function nextTour(
  state: TourState | undefined,
  action: TourAction,
): TourState | undefined {
  const at = (step: number): TourState => ({
    step: Math.min(LAST, Math.max(0, step)),
    stop: 0,
  });
  if (action.type === "start") {
    return at(action.step ?? 0);
  }
  if (state === undefined || action.type === "leave") {
    return undefined;
  }
  switch (action.type) {
    case "next":
      return state.step >= LAST ? state : at(state.step + 1);
    case "back":
      return state.step <= 0 ? state : at(state.step - 1);
    case "stop":
      return state.step === LADDER_STEP &&
        Number.isInteger(action.stop) &&
        action.stop >= 0 &&
        action.stop < TOUR_LADDER.length
        ? { step: state.step, stop: action.stop }
        : state;
  }
}

/** What a step shows; the hand-off keeps everything as it is. */
export type TourTarget =
  | {
      readonly mode: Placement;
      readonly site: string;
      readonly shot: Exclude<TourShot, "keep">;
    }
  | { readonly shot: "keep" };

export function tourTarget(state: TourState): TourTarget {
  switch (TOUR_STEPS[state.step]?.id) {
    case "rigid":
      return { mode: "rigid", site: "corridor", shot: "opening" };
    case "morph":
      return { mode: "reprojected", site: "corridor", shot: "opening" };
    case "mark":
      return { mode: "reprojected", site: "corridor", shot: "mark" };
    case "pair":
      return { mode: "reprojected", site: "corridor", shot: "pair" };
    case "tunnel":
      return { mode: "reprojected", site: "corridor", shot: "tunnel" };
    case "ladder":
      return {
        mode: "rigid",
        site: TOUR_LADDER[state.stop]?.site ?? TOUR_LADDER[0]!.site,
        shot: "site",
      };
    default:
      return { shot: "keep" };
  }
}

/** The page's figures the narration reads; any may be missing. */
export interface TourFacts {
  /** answers.json's marker: rigid's separation at its station, metres. */
  readonly markerSeparation?: number;
  /** The marker's station (the self-check's, where the opening shot looks), design units. */
  readonly markerStation?: number;
  /** How far the marker's station is from the anchor, km. */
  readonly markerKm?: number;
  /** The corridor CRS's codes, "EPSG:6420+6360". */
  readonly codes: string;
  readonly mark?: {
    readonly pid: string;
    readonly name: string;
    /** How far rigid draws the road from where it is, at the mark's nearest point, metres. */
    readonly rigidOffset?: number;
  };
  readonly pair?: {
    /** The pair's horizontal design distance, design units. */
    readonly horizontal: number;
    readonly symbol: string;
    /** How much shorter rigid draws the pair than its true distance, metres. */
    readonly rigidShort?: number;
    /** How far rigid draws the pair's ends from where they are, metres (their mean). */
    readonly rigidOffset?: number;
    /** The ruler at its far end: ground's last whole 1,000 ft and how far before design's it ends, design units. */
    readonly ruler?: { readonly feet: number; readonly gap: number };
  };
  /**
   * Each ladder site's rigid error at its edge and its extent, metres, its
   * error's parts and its combined factor at the anchor (answers.json).
   */
  readonly ladder: ReadonlyMap<string, LadderFacts>;
  /** The corridor's structures (corridor.ts `STRUCTURES`). */
  readonly structures?: {
    readonly tunnels: number;
    readonly viaducts: number;
    /** The share of the road they carry, 0 to 1. */
    readonly share: number;
  };
}

export interface LadderFacts {
  readonly error: number;
  readonly extent: number;
  readonly terms?: {
    readonly curvature: number;
    readonly scale: number;
    readonly geoid: number;
  };
  readonly combinedFactor?: number;
}

/** A small error as DESIGN.md says it: "2.6 mm", "390 mm", "18.3 m". */
const small = (m: number): string =>
  Math.abs(m) < 0.01 ? `${fixed(m * 1000, 1)} mm` : errorText(m);

/** "60 m", "4.00 km": page.ts's one formatter. */
const extentText = lengthText;

/** "station 1700+00". */
const stationShort = (station: number): string =>
  `station ${Math.floor(station / 100)}+${String(Math.round(station % 100)).padStart(2, "0")}`;

/** A ladder stop in one sentence: its size, its rigid error, the cause, the verdict. */
function ladderStop(stop: number, f: LadderFacts | undefined): string {
  const what = ["A canal building", "An airport", "A pole line"][stop]!;
  if (f === undefined) {
    return `${what}: its figures come with the generator's answers.`;
  }
  const why = cause(f.terms);
  const verdict = rigidVerdict(f.error);
  if (stop === 2) {
    return `A ${extentText(f.extent)} pole line: rigid is ${small(f.error)} off at its far end${why}, so reproject it.`;
  }
  if (verdict.acceptable) {
    const k =
      f.combinedFactor !== undefined && why.includes("scale")
        ? ` (${f.combinedFactor.toFixed(5)})`
        : "";
    return `${what}, ${extentText(f.extent)} across: rigid is fine here, ${small(f.error)} off at its edge${why}${k}, under a centimetre.`;
  }
  return `${what}, ${extentText(f.extent)} across: rigid is ${small(f.error)} off at its edge${why}, more than a centimetre, so reproject it.`;
}

function narration(state: TourState, f: TourFacts): string {
  switch (TOUR_STEPS[state.step]?.id) {
    case "rigid": {
      const where =
        f.markerStation !== undefined
          ? `the road at ${stationShort(f.markerStation)}${f.markerKm !== undefined ? `, ${fixed(f.markerKm, 1)} km from the anchor,` : ""}`
          : "the road here";
      const off =
        f.markerSeparation !== undefined
          ? errorText(f.markerSeparation)
          : "metres";
      return `Placed rigidly at one anchor, as most viewers place a model, ${where} is drawn ${off} from where its own design puts it.`;
    }
    case "morph":
      return `Reprojected through ${f.codes}, every vertex moves into the globe's frame and the gap closes to 0.000 m; the faint orange above is where rigid drew it, kept as a ghost.`;
    case "mark": {
      const name = f.mark
        ? `${f.mark.pid} ${f.mark.name}`
        : "NGS's survey mark";
      const rigid =
        f.mark?.rigidOffset !== undefined
          ? `, while rigid draws the road ${errorText(f.mark.rigidOffset)} away`
          : "";
      return `${name}, placed from NGS's published position, lines up with the reprojected design${rigid}.`;
    }
    case "pair": {
      const apart = f.pair
        ? `${fixed(f.pair.horizontal, 0)} ${f.pair.symbol}`
        : "10,000 ftUS";
      const away =
        f.pair?.rigidOffset !== undefined
          ? ` about ${errorText(f.pair.rigidOffset)} away`
          : " away";
      const short =
        f.pair?.rigidShort !== undefined
          ? ` and ${small(f.pair.rigidShort)} short`
          : "";
      // One sentence, read at the ruler's far end where the shot is: the
      // claim (only reprojected draws it where it is), then the ruler.
      const ruler =
        f.pair?.ruler !== undefined
          ? `; up close at its far end, ground's ${fixed(f.pair.ruler.feet, 0)} ${f.pair.symbol} ends ${fixed(f.pair.ruler.gap, 3)} ${f.pair.symbol} before design's`
          : "";
      return `Two stations ${apart} apart measure ${apart} in both placements, but only reprojected draws the line where it is (rigid draws it${away}${short})${ruler}.`;
    }
    case "tunnel": {
      const carry = f.structures
        ? `${f.structures.tunnels} tunnels and ${f.structures.viaducts} viaducts carry ${Math.round(f.structures.share * 100)}% of the road`
        : "tunnels and viaducts carry most of the road";
      return `Across the hills ${carry}; See underground makes the ground around it translucent, so this tunnel shows in place under its hill, and clicks reach the road through it.`;
    }
    case "ladder":
      return ladderStop(
        state.stop,
        f.ladder.get(TOUR_LADDER[state.stop]?.site ?? ""),
      );
    default:
      return "The rest is yours: switch placements, fly to any site and measure with the toolbar over the view; the page's own figures are checked against the generator's exact answers in Checks, where you can measure an answer pair to see it checked.";
  }
}

/** The tour's card over the globe. */
export interface TourCardView {
  readonly index: number;
  readonly count: number;
  /** "Step 3 of 6". */
  readonly progress: string;
  readonly title: string;
  /** One sentence. */
  readonly narration: string;
  readonly canBack: boolean;
  readonly canNext: boolean;
  /** The ladder step's stops. */
  readonly stops?: readonly {
    readonly label: string;
    readonly selected: boolean;
  }[];
}

export function tourCard(state: TourState, facts: TourFacts): TourCardView {
  const step = TOUR_STEPS[state.step] ?? TOUR_STEPS[0]!;
  return {
    index: state.step,
    count: TOUR_STEPS.length,
    progress: `Step ${state.step + 1} of ${TOUR_STEPS.length}`,
    title: step.title,
    narration: narration(state, facts),
    canBack: state.step > 0,
    canNext: state.step < LAST,
    ...(step.id === "ladder" && {
      stops: TOUR_LADDER.map((s, i) => ({
        label: s.label,
        selected: i === state.stop,
      })),
    }),
  };
}

// ------------------------------------------------------------- the link

const STEP_TEXT = /^[1-9]\d*$/;

/** The link's `tour` (1 to 7) as a step index, or undefined. */
export function parseTourStep(
  params: Readonly<Record<string, string | undefined>>,
): number | undefined {
  const text = Object.hasOwn(params, "tour") ? params.tour : undefined;
  if (text === undefined || !STEP_TEXT.test(text)) {
    return undefined;
  }
  const n = Number(text);
  return n >= 1 && n <= TOUR_STEPS.length ? n - 1 : undefined;
}

export function formatTourStep(step: number | undefined): {
  readonly tour: string | undefined;
} {
  return { tour: step === undefined ? undefined : String(step + 1) };
}

/**
 * Where the tour starts when the page opens: at a linked step; at the first
 * on a bare link, unless the viewer left the tour in this session; else
 * not at all (a link to a site or a measurement opens there).
 */
export function tourAutoStart(
  params: Readonly<Record<string, string | undefined>>,
  left: boolean,
): number | undefined {
  const linked = parseTourStep(params);
  if (linked !== undefined) {
    return linked;
  }
  const bare = Object.values(params).every((v) => v === undefined || v === "");
  return bare && !left ? 0 : undefined;
}
