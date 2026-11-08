// The design globe's short tour (plan 4b Task 20; DESIGN.md "A short tour",
// owner 2026-11-07): six steps, one sentence of narration each, with Next,
// Back and "Explore on your own" always there. Each step names what it
// shows (a placement, a site and a camera shot); main.ts applies it, and
// leaving keeps the view, the placement and the measurements. The steps'
// figures come from the page's data (`TourFacts`), never from here: a
// figure the page doesn't have yet is left out of the sentence. Pure, so
// test/designGlobeTour.test.ts runs it in Node.
import { fixed } from "./measureModel.ts";
import { errorText, type Placement } from "./page.ts";

/** Where a step points the camera: main.ts's shots. */
export type TourShot = "opening" | "mark" | "pair" | "site" | "keep";

export interface TourStep {
  readonly id: "rigid" | "morph" | "mark" | "pair" | "ladder" | "yours";
  readonly title: string;
}

/** DESIGN.md's six steps, in order. */
export const TOUR_STEPS: readonly TourStep[] = [
  { id: "rigid", title: "Rigid at one anchor" },
  { id: "morph", title: "Reprojected" },
  { id: "mark", title: "Against a survey mark" },
  { id: "pair", title: "The 10,000 ft pair" },
  { id: "ladder", title: "Down the scale ladder" },
  { id: "yours", title: "Yours to explore" },
];

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
  /** answers.json's marker: rigid's separation at station 1700+00, metres. */
  readonly markerSeparation?: number;
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
  };
  /** Each ladder site's rigid error at its edge and its extent, metres (answers.json). */
  readonly ladder: ReadonlyMap<
    string,
    { readonly error: number; readonly extent: number }
  >;
}

/** A small error as DESIGN.md says it: "2.6 mm", "390 mm", "18.3 m". */
const small = (m: number): string =>
  Math.abs(m) < 0.01 ? `${fixed(m * 1000, 1)} mm` : errorText(m);

function narration(state: TourState, f: TourFacts): string {
  switch (TOUR_STEPS[state.step]?.id) {
    case "rigid":
      return f.markerSeparation !== undefined
        ? `Placed rigidly at one anchor, as most viewers place a model, the road here, 20 km out, is drawn ${errorText(f.markerSeparation)} from where its own design puts it.`
        : "Placed rigidly at one anchor, as most viewers place a model, the road here, 20 km out, is drawn metres from where its own design puts it.";
    case "morph":
      return `Reprojected through ${f.codes}, every vertex moves into the globe's frame and the gap closes to 0.000 m.`;
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
        : "10,000 ft";
      const short =
        f.pair?.rigidShort !== undefined
          ? ` (rigid draws it ${small(f.pair.rigidShort)} short)`
          : "";
      return `Two stations ${apart} apart have the same design distance in both placements, but only reprojected draws the line where it is${short}.`;
    }
    case "ladder": {
      const [building, airport, poles] = TOUR_LADDER.map((s) =>
        f.ladder.get(s.site),
      );
      const parts = [
        building && `${small(building.error)} off at a canal building's edge`,
        airport && `${small(airport.error)} at an airport's`,
        poles &&
          `${small(poles.error)} along a ${fixed(poles.extent / 1000, 1)} km pole line`,
      ].filter((p): p is string => typeof p === "string");
      if (parts.length === 0) {
        return "Down the scale ladder, from a canal building to a pole line, rigid's error grows with the model's size.";
      }
      const list =
        parts.length === 1
          ? parts[0]!
          : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)!}`;
      return `Down the scale ladder, rigid is ${list}: its error grows with the model's size.`;
    }
    default:
      return "The rest is yours: switch placements, fly to any site and measure with the tool in the panel, where every number is checked against the generator's exact answers.";
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

/** The link's `tour` (1 to 6) as a step index, or undefined. */
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
