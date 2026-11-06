// The one selection the tree, the globe and the tests share (R14), the lens
// and the tour stop, and their URL form (R15): `select=result:<id>`,
// `select=frame:<id>`, `lens=<lens>`, `tour=<stop>` and `imodel=<id>` in the
// example's params (Dyno's URL; the example never touches `location`).
//
// A selection is only ever something that exists and that the lens shows:
// `reconcile` clears one that vanished in a re-run or that a lens change hid
// (Review Focus 8), so the inspector and the globe never show a stale or a
// hidden one. Ids from a URL are checked before they are kept: a malformed or
// unknown id parses to none, never throws.
import { GROUP_INFO, LENSES, type Lens } from "./stress/groupInfo.ts";

/** The selection the three views share (R14). */
export type Selection =
  | { kind: "frame"; id: string }
  | { kind: "result"; id: string }
  | { kind: "none" };

/** The lens chips: "all" or one audience (R14). */
export type LensChoice = "all" | Lens;

export const LENS_CHOICES: readonly LensChoice[] = ["all", ...LENSES];

export type Tab = "explore" | "verify" | "report";

/** What the page knows exists, to check selections against. */
export interface Known {
  /** The frame tree's node ids. */
  frames?: ReadonlySet<string>;
  /**
   * Each result's lenses (its group's, and Reproducibility's when it is
   * fingerprinted). Undefined until the first run: a result selection is
   * then kept as given, for the run to confirm.
   */
  results?: ReadonlyMap<string, readonly Lens[]>;
  /** The tour's stop ids. */
  tours?: readonly string[];
}

/** The view as the URL carries it. */
export interface ViewParams {
  selection: Selection;
  lens: LensChoice;
  /** A tour stop's id. */
  tour?: string;
  /** R18: prefills "Try your own"; never fetches by itself. */
  imodel?: string;
}

const NONE: Selection = { kind: "none" };

/** A plausible id: letters, digits and the punctuation node and result ids use; at most 200 characters. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:() -]{0,199}$/;

/** An ion asset id (digits) or an iModel GUID. */
const IMODEL =
  /^(?:\d{1,12}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/** `result:<id>` or `frame:<id>`; anything else, or an id `known` doesn't have, is none. */
export function parseSelection(
  text: string | undefined,
  known: Known = {},
): Selection {
  const m = /^(result|frame):(.+)$/s.exec(text ?? "");
  if (!m || !ID.test(m[2]!)) {
    return NONE;
  }
  const selection: Selection = {
    kind: m[1] as "result" | "frame",
    id: m[2]!,
  };
  return reconcile(selection, "all", known);
}

/** The example's params as a view. Unknown or malformed values are left at their defaults. */
export function parseParams(
  params: Readonly<Record<string, string>>,
  known: Known = {},
): ViewParams {
  const lens = LENS_CHOICES.find((l) => l === params.lens) ?? "all";
  const tour = params.tour;
  const tourOk =
    tour !== undefined &&
    ID.test(tour) &&
    (known.tours === undefined || known.tours.includes(tour));
  const imodel = params.imodel?.trim();
  return {
    selection: parseSelection(params.select, known),
    lens,
    ...(tourOk && { tour }),
    ...(imodel !== undefined && IMODEL.test(imodel) && { imodel }),
  };
}

/** The view as params, for `setParams` (defaults as undefined, which removes them). */
export function formatParams(view: {
  selection: Selection;
  lens: LensChoice;
  tour?: string;
}): Record<string, string | undefined> {
  return {
    select:
      view.selection.kind === "none"
        ? undefined
        : `${view.selection.kind}:${view.selection.id}`,
    lens: view.lens === "all" ? undefined : view.lens,
    tour: view.tour,
  };
}

/**
 * `selection` if it still exists and the lens shows it, else none: a frame
 * must be in the tree, a result in the last run and in one of the lens's
 * groups. A frame selection isn't filtered by the lens. Returns the same
 * object when it stands.
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
      return known.frames === undefined || known.frames.has(selection.id)
        ? selection
        : NONE;
    case "result": {
      if (known.results === undefined) {
        return selection;
      }
      const lenses = known.results.get(selection.id);
      if (lenses === undefined) {
        return NONE;
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
  /** The tour stop shown, by id; undefined when the tour isn't on. */
  tour?: string;
}

export class ViewStore {
  private view: View = { selection: NONE, lens: "all" };
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

  setTour(tour: string | undefined): void {
    const rest: View = {
      selection: this.view.selection,
      lens: this.view.lens,
    };
    this.set(tour === undefined ? rest : { ...rest, tour });
  }

  /** A view from the URL (a deep link, back or forward). */
  apply(params: ViewParams): void {
    this.set({
      selection: params.selection,
      lens: params.lens,
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
  const group = GROUP_INFO.find(
    (g) => g.virtual !== true && id.startsWith(`${g.id}.`),
  )?.id;
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
