// The one selection the tree, the globe and the tests share (R14), the lens
// and the tour stop, the scenario with its knobs and time, and their URL
// form (R15): `select=result:<id>`, `select=frame:<id>`, `select=node:<id>`,
// `select=edge:<id>`, `lens=<lens>`, `tour=<stop>`, `scenario=<id>`,
// `k.<knob>=<value>`, `t=<UTC ms>` and `imodel=<id>` in the example's params
// (Dyno's URL; the example never touches `location`).
//
// A selection is only ever something that exists and that the lens shows:
// `reconcile` clears one that vanished in a re-run or that a lens change hid
// (Review Focus 8), so the inspector and the globe never show a stale or a
// hidden one. Ids from a URL are checked before they are kept: a malformed or
// unknown id parses to none, never throws. A scenario, knob or time from a
// URL that isn't valid falls back to the checked setup's (Review Focus 4).
import {
  clampKnobs,
  type KnobState,
  type ScenarioId,
  type ScenarioSpec,
} from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";
import { GROUP_INFO, LENSES, type Lens } from "./stress/groupInfo.ts";

/**
 * The selection the three views share (R14). The tree diagram selects a
 * node, or an edge, named by its child node's id; node ids are the tree's
 * frame ids.
 */
export type Selection =
  | { kind: "frame"; id: string }
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | { kind: "result"; id: string }
  | { kind: "none" };

/** The lens chips: "all" or one audience (R14). */
export type LensChoice = "all" | Lens;

export const LENS_CHOICES: readonly LensChoice[] = ["all", ...LENSES];

export type Tab = "explore" | "verify" | "report";

/** The walk's reference: what a frame's composed accuracy is stated against (S-I5). */
export type Against = "ITRF" | "GCRF" | "ICRF";
export const AGAINST: readonly Against[] = ["ITRF", "GCRF", "ICRF"];

/** What the page knows exists, to check selections against. */
export interface Known {
  /** The frame tree's node ids (for frame, node and edge selections). */
  frames?: ReadonlySet<string>;
  /**
   * Each result's lenses (its group's, and Reproducibility's when it is
   * fingerprinted). Undefined until the first run: a result selection is
   * then kept as given, for the run to confirm.
   */
  results?: ReadonlyMap<string, readonly Lens[]>;
  /**
   * The groups whose results `results` holds, when only some have run (a
   * group's own run, a deep link's). A result of a group not in it is kept
   * as given, for its group's run to confirm, as before the first run.
   * Undefined with `results`: every group ran.
   */
  ran?: ReadonlySet<string>;
  /** The tour's stop ids. */
  tours?: readonly string[];
}

/** The view as the URL carries it. */
export interface ViewParams {
  selection: Selection;
  lens: LensChoice;
  /** The walk's reference (`against=`; ITRF, the default, is left out). */
  against: Against;
  /** A tour stop's id. */
  tour?: string;
  /** R18: prefills "Try your own"; never fetches by itself. */
  imodel?: string;
  /** The scenario (`scenario=`; the strip's first is left out). parseParams always sets it. */
  scenario?: ScenarioId;
  /** Its knobs (`k.<id>=`; checked values are left out). parseParams always sets them. */
  knobs?: KnobState;
  /** The time, UTC ms (`t=`; the checked epoch is left out). parseParams always sets it. */
  time?: number;
}

const NONE: Selection = { kind: "none" };

/** A plausible id: letters, digits and the punctuation node and result ids use; at most 200 characters. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:() -]{0,199}$/;

/** An ion asset id (digits) or an iModel GUID. */
const IMODEL =
  /^(?:\d{1,12}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/** A time in UTC ms: an integer a `Date` can hold. */
const TIME = /^-?\d{1,16}$/;

/** The latest a `Date` can hold, ms either side of 1970. */
const MAX_DATE_MS = 8.64e15;

/** The first scenario on the strip: the page's opening view. */
const DEFAULT_SCENARIO = SCENARIOS[0]!;

const KNOB_PARAM = "k.";

/** `result:<id>`, `frame:<id>`, `node:<id>` or `edge:<id>`; anything else, or an id `known` doesn't have, is none. */
export function parseSelection(
  text: string | undefined,
  known: Known = {},
): Selection {
  const m = /^(result|frame|node|edge):(.+)$/s.exec(text ?? "");
  if (!m || !ID.test(m[2]!)) {
    return NONE;
  }
  const selection: Selection = {
    kind: m[1] as "result" | "frame" | "node" | "edge",
    id: m[2]!,
  };
  return reconcile(selection, "all", known);
}

/**
 * The scenario, its knobs and its time from the URL: an unknown scenario is
 * the strip's first, and each knob or time that is missing or invalid takes
 * the checked setup's value (a range knob out of range is clamped). Never
 * throws.
 */
function parseScenario(params: Readonly<Record<string, string>>): {
  scenario: ScenarioId;
  knobs: KnobState;
  time: number;
} {
  const spec =
    SCENARIOS.find((s) => s.id === params.scenario) ?? DEFAULT_SCENARIO;
  const raw: Record<string, string | undefined> = {};
  for (const knob of spec.knobs) {
    const key = `${KNOB_PARAM}${knob.id}`;
    raw[knob.id] = Object.hasOwn(params, key) ? params[key] : undefined;
  }
  const t = params.t;
  const ms = t !== undefined && TIME.test(t) ? Number(t) : Number.NaN;
  return {
    scenario: spec.id,
    knobs: clampKnobs(spec, raw),
    time: Math.abs(ms) <= MAX_DATE_MS ? ms : Date.parse(spec.checked.epochUtc),
  };
}

/** Every scenario's knob params, so switching scenarios removes the last one's. */
const KNOB_KEYS = [
  ...new Set(SCENARIOS.flatMap((s) => s.knobs.map((k) => k.id))),
].map((id) => `${KNOB_PARAM}${id}`);

/**
 * The scenario's params: `scenario`, then each knob off its checked value
 * and the time off the checked epoch; every other knob param undefined, to
 * remove it.
 */
function formatScenario(
  spec: ScenarioSpec,
  knobs: KnobState | undefined,
  time: number | undefined,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {
    scenario: spec === DEFAULT_SCENARIO ? undefined : spec.id,
  };
  for (const key of KNOB_KEYS) {
    out[key] = undefined;
  }
  for (const knob of spec.knobs) {
    const value = knobs?.[knob.id];
    if (value !== undefined && value !== spec.checked.knobs[knob.id]) {
      out[`${KNOB_PARAM}${knob.id}`] = String(value);
    }
  }
  out.t =
    time === undefined || time === Date.parse(spec.checked.epochUtc)
      ? undefined
      : String(time);
  return out;
}

/** The example's params as a view. Unknown or malformed values are left at their defaults. */
export function parseParams(
  params: Readonly<Record<string, string>>,
  known: Known = {},
): ViewParams {
  const lens = LENS_CHOICES.find((l) => l === params.lens) ?? "all";
  const against = AGAINST.find((a) => a === params.against) ?? "ITRF";
  const tour = params.tour;
  const tourOk =
    tour !== undefined &&
    ID.test(tour) &&
    (known.tours === undefined || known.tours.includes(tour));
  const imodel = params.imodel?.trim();
  return {
    selection: parseSelection(params.select, known),
    lens,
    against,
    ...(tourOk && { tour }),
    ...(imodel !== undefined && IMODEL.test(imodel) && { imodel }),
    ...parseScenario(params),
  };
}

/**
 * The view as params, for `setParams` (defaults as undefined, which removes
 * them). A view without a scenario leaves the scenario's params as they are.
 */
export function formatParams(view: {
  selection: Selection;
  lens: LensChoice;
  tour?: string;
  against?: Against;
  scenario?: ScenarioId;
  knobs?: KnobState;
  time?: number;
}): Record<string, string | undefined> {
  const spec = SCENARIOS.find((s) => s.id === view.scenario);
  return {
    ...(spec !== undefined && formatScenario(spec, view.knobs, view.time)),
    select:
      view.selection.kind === "none"
        ? undefined
        : `${view.selection.kind}:${view.selection.id}`,
    lens: view.lens === "all" ? undefined : view.lens,
    tour: view.tour,
    against:
      view.against === undefined || view.against === "ITRF"
        ? undefined
        : view.against,
  };
}

/**
 * `selection` if it still exists and the lens shows it, else none: a frame
 * (or a node, or an edge's child node) must be in the tree, a result in
 * the last run and in one of the lens's groups. A result of a group that
 * hasn't run yet (`known.ran`) stands, for its group's run to confirm (a
 * deep link after a partial run). A frame, node or edge selection isn't
 * filtered by the lens. Returns the same object when it stands.
 */
export function reconcile(
  selection: Selection,
  lens: LensChoice,
  known: Known,
): Selection {
  switch (selection.kind) {
    case "none":
      return selection;
    case "frame":
    case "node":
    case "edge":
      return known.frames === undefined || known.frames.has(selection.id)
        ? selection
        : NONE;
    case "result": {
      if (known.results === undefined) {
        return selection;
      }
      const lenses = known.results.get(selection.id);
      if (lenses === undefined) {
        const group = groupOfResult(selection.id);
        const pending =
          known.ran !== undefined &&
          group !== undefined &&
          !known.ran.has(group);
        return pending ? selection : NONE;
      }
      return lens === "all" || lenses.includes(lens) ? selection : NONE;
    }
  }
}

const same = (a: Selection, b: Selection): boolean =>
  a.kind === b.kind && (a.kind === "none" || a.id === (b as { id: string }).id);

/** The view's state, with listeners for the panel and the page. */
export interface View {
  selection: Selection;
  lens: LensChoice;
  /** The walk's reference, shared by the panel's walk and the globe's path. */
  against: Against;
  /** The tour stop shown, by id; undefined when the tour isn't on. */
  tour?: string;
}

export class ViewStore {
  private view: View = { selection: NONE, lens: "all", against: "ITRF" };
  private known: Known = {};
  private readonly listeners = new Set<() => void>();

  readonly get = (): View => this.view;

  private set(next: View): void {
    const selection = reconcile(next.selection, next.lens, this.known);
    const v = { ...next, selection };
    const prev = this.view;
    if (
      same(prev.selection, v.selection) &&
      prev.lens === v.lens &&
      prev.against === v.against &&
      prev.tour === v.tour
    ) {
      return;
    }
    // Keep the old selection object when it stands, for cheap comparisons.
    this.view = same(prev.selection, v.selection)
      ? { ...v, selection: prev.selection }
      : v;
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  select(selection: Selection): void {
    this.set({ ...this.view, selection });
  }

  setLens(lens: LensChoice): void {
    this.set({ ...this.view, lens });
  }

  setAgainst(against: Against): void {
    this.set({ ...this.view, against });
  }

  setTour(tour: string | undefined): void {
    const rest: View = {
      selection: this.view.selection,
      lens: this.view.lens,
      against: this.view.against,
    };
    this.set(tour === undefined ? rest : { ...rest, tour });
  }

  /** A view from the URL (a deep link, back or forward). */
  apply(params: ViewParams): void {
    this.set({
      selection: params.selection,
      lens: params.lens,
      against: params.against,
      ...(params.tour !== undefined && { tour: params.tour }),
    });
  }

  /** What exists now (the tree drew, a run ended): clears what vanished. */
  setKnown(known: Known): void {
    this.known = known;
    this.set(this.view);
  }

  /** Bound, so it can be passed as is (`useSyncExternalStore`). */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

/** The catalog group a result id belongs to (the id's first part), if any. */
export function groupOfResult(id: string): string | undefined {
  return GROUP_INFO.find((g) => g.virtual !== true && id.startsWith(`${g.id}.`))
    ?.id;
}

/**
 * A deep-linked result the page doesn't have yet (R15): runs its group (the
 * id's first part), retrying once, and says whether to show it. If it still
 * isn't there, the selection is cleared and `notice` says why: a failing
 * worker never leaves the page retrying. "stale" when the selection changed
 * meanwhile (it is then left alone).
 */
export async function loadLinkedResult(
  store: ViewStore,
  id: string,
  deps: {
    /** The page now holds this result. */
    has(id: string): boolean;
    /** Runs one group's cases. */
    run(group: string): Promise<void>;
    notice(message: string): void;
  },
): Promise<"shown" | "cleared" | "stale"> {
  const selection = store.get().selection;
  const group = groupOfResult(id);
  let why = `no group of the catalog has ${id}`;
  if (group !== undefined) {
    why = `its group's run didn't give it`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await deps.run(group);
        why = `the ${group} run didn't give it`;
      } catch (error) {
        why = `the ${group} run failed: ${error instanceof Error ? error.message : String(error)}`;
      }
      const now = store.get().selection;
      if (now !== selection && now.kind !== "none") {
        return "stale";
      }
      if (deps.has(id)) {
        return "shown";
      }
      if (now.kind === "none") {
        // The run's results cleared it (reconcile): it isn't coming.
        break;
      }
    }
  }
  store.select(NONE);
  deps.notice(`The linked result ${id} isn't in this run: ${why}.`);
  return "cleared";
}
