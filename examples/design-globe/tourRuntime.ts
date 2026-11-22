// The tour's runtime (plan 4b Task 20): its state, its link and when a step
// is applied. A step is applied once what it shows is in (main.ts's `apply`
// says when it isn't yet: the answers, the corridor's placements, an
// opener); leaving applies nothing, so the view, the placement and the
// measurements stay. Leaving is remembered for the session, so a bare link
// opened again doesn't start the tour over (a per-viewer convenience: the
// page works the same without storage).
import {
  formatTourStep,
  nextTour,
  parseTourStep,
  tourAutoStart,
  tourTarget,
  type TourAction,
  type TourState,
  type TourTarget,
} from "./tour.ts";

const LEFT_KEY = "design-globe.tour-left";

function readLeft(): boolean {
  try {
    return sessionStorage.getItem(LEFT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLeft(): void {
  try {
    sessionStorage.setItem(LEFT_KEY, "1");
  } catch {
    // No storage (a private window, blocked site data): the tour may start again.
  }
}

export interface TourDeps {
  /** The link's parameters when the page opened. */
  readonly initial: Readonly<Record<string, string | undefined>>;
  setLink(params: { readonly tour: string | undefined }): void;
  /** Shows a step's target; false when what it shows isn't in yet (tried again by `flush`). */
  apply(target: TourTarget): boolean;
  /** The tour was left: what a step set aside for itself comes back. */
  left?(): void;
  changed(): void;
}

export interface TourRuntime {
  state(): TourState | undefined;
  go(action: TourAction): void;
  /** Applies a step that waited for its data. */
  flush(): void;
  /** Back or forward changed the link. */
  fromLink(params: Readonly<Record<string, string | undefined>>): void;
}

export function createTour(deps: TourDeps): TourRuntime {
  const start = tourAutoStart(deps.initial, readLeft());
  let state: TourState | undefined =
    start === undefined ? undefined : { step: start, stop: 0 };
  // The first step is the page's own opening: nothing to apply.
  let pending: TourState | undefined =
    state !== undefined && state.step > 0 ? state : undefined;
  if (state !== undefined) {
    deps.setLink(formatTourStep(state.step));
  }

  function flush(): void {
    // Taken first: applying a step refreshes the page, which flushes again.
    const step = pending;
    pending = undefined;
    if (step !== undefined && !deps.apply(tourTarget(step))) {
      pending ??= step;
    }
  }

  function go(action: TourAction): void {
    const next = nextTour(state, action);
    if (next === state) {
      return;
    }
    state = next;
    if (next === undefined) {
      pending = undefined;
      writeLeft();
      deps.left?.();
      deps.setLink({ tour: undefined });
    } else {
      deps.setLink(formatTourStep(next.step));
      pending = next;
    }
    // Told first, so the step is shown as the page now is (the camera's lift).
    deps.changed();
    flush();
  }

  return {
    state: () => state,
    go,
    flush,
    fromLink(params) {
      const step = parseTourStep(params);
      if (step === state?.step) {
        return;
      }
      go(step === undefined ? { type: "leave" } : { type: "start", step });
    },
  };
}
