// The scenario lifecycle on the main thread (spec "How the page works"):
// which scenario shows, at which knobs and time, its evaluation from the
// worker, and the overlays it owns on the globe. main.ts gives it the worker,
// the globe and the clock through `ScenarioHostDeps`; everything here is
// plain logic, unit-tested (test/framesExplorerScenarioHost.test.ts).
//
// Switching mid-evaluation (Review Focus 3): the worker can't cancel a
// scenario it has started, and one may wait behind "Run all" (about 3.5 s).
// So one request is in flight at most, with only the latest waiting (the
// ones in between are never sent), and every request takes a generation
// number: a reply, or an error, of an older generation is dropped, so a late
// reply for the previous scenario never draws, answers or proves in the new
// one. On a switch, every overlay the old scenario drew is removed, and the
// old scenario's scene left, before the new one enters or draws.
import type { OverlayGeometry } from "./protocol.ts";
import { sameData } from "./share.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import {
  checkedState,
  clampKnobs,
  withKnob,
  type KnobState,
  type KnobValue,
  type ScenarioId,
  type ScenarioSpec,
} from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";

/** What the page gives the host. */
export interface ScenarioHostDeps {
  /** The worker's evaluation of `id` at `knobs` and `epochUtcMs` (UTC ms). */
  evaluate(
    id: ScenarioId,
    knobs: KnobState,
    epochUtcMs: number,
  ): Promise<ScenarioEvaluation>;
  /** Draws one of the evaluation's overlays on the globe, under `id`. */
  drawOverlay(id: string, geometry: OverlayGeometry): void;
  removeOverlay(id: string): void;
  /** Sets the scene up on the globe: its camera, triads and clock (scenes.ts). */
  enter(spec: ScenarioSpec, knobs: KnobState): void;
  /** The knobs moved: the scene follows at once (the drawn-in frame, the site's latitude). */
  update(spec: ScenarioSpec, knobs: KnobState): void;
  /** Undoes `enter`: the scene's own drawings, lights and clock rate. */
  leave(spec: ScenarioSpec): void;
  /**
   * "Back to the checked setup": the scene's own view again. Its framing is
   * of the time it was flown at (one-path's frames the Moon where it was
   * then), so after the clock jumps back the camera may frame nothing
   * (Task 4c re-review, item 3).
   */
  reframe?(spec: ScenarioSpec): void;
  /** Sets the clock (UTC ms), paused. */
  setClock(epochUtcMs: number): void;
  /** The clock's time, UTC ms. */
  clock(): number;
  /** The state changed (the panel, the params). */
  changed(state: ScenarioHostState): void;
  /** Why a request would wait in the worker (a catalog run going on), if it would. */
  busy?(): string | undefined;
  /** A timer (tests give their own); returns its cancel. */
  schedule?(fn: () => void, ms: number): () => void;
}

export interface ScenarioHostState {
  spec: ScenarioSpec;
  knobs: KnobState;
  /** The scenario's time, UTC ms. */
  epochUtcMs: number;
  /** At the checked setup, and what moved off it (knob ids, then "time"). */
  atChecked: boolean;
  changed: readonly string[];
  /** Loading until this generation's evaluation is in (R9), then ready or error. */
  status: "loading" | "ready" | "error";
  /** While loading: why the request waits in the worker (behind a run). */
  queued?: string;
  /** The latest evaluation of this scenario, made at `evaluatedAt`. */
  evaluation?: ScenarioEvaluation;
  /** The setup `evaluation` was made at (its knobs and time). */
  evaluatedAt?: { knobs: KnobState; epochUtcMs: number };
  /**
   * The evaluation is of another setup than the current one (a knob moved,
   * or the clock): its answer and checks are the last setup's, not this
   * one's (Review Focus 1, R9). Its verdicts mustn't read as current.
   */
  stale: boolean;
  /** What differs between the evaluated setup and the current one: knob ids, then "time". */
  staleBy: readonly string[];
  problem?: { message: string; missing: boolean };
  /** Bumped by every request; replies of an older one are dropped. */
  generation: number;
}

export interface ScenarioHost {
  /** Shows `id` at `knobs` (clamped; the checked ones by default) and `epochUtcMs` (the checked epoch by default). */
  show(id: ScenarioId, knobs?: KnobState, epochUtcMs?: number): Promise<void>;
  /** Moves one knob (clamped to its spec); re-evaluates once a burst of changes ends. */
  setKnob(id: string, value: KnobValue): void;
  /** The checked knobs and epoch, evaluated at once. */
  backToChecked(): void;
  /** The clock moved (the user, or it plays): the time follows, re-evaluated at most once per wait. */
  clockChanged(): void;
  state(): ScenarioHostState;
  /** The scenario's part of the deep link, for `formatParams`. */
  params(): { scenario: ScenarioId; knobs: KnobState; time: number };
  dispose(): void;
}

/** A knob's burst ends after this long without a change, ms. */
export const KNOB_WAIT = 160;
/** While the clock plays, the answer follows it at most this often, ms. */
export const CLOCK_WAIT = 700;

const DEFAULT_SPEC = SCENARIOS[0]!;

/** An overlay's globe id: the scenario's, so two scenarios' never mix. */
const overlayId = (scenario: ScenarioId, id: string) =>
  `scenario:${scenario}:${id}`;

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

/** A worker error that is data the store doesn't have (R5): shown with the setup hint. */
const isMissing = (e: unknown): boolean =>
  (e instanceof Error && e.name === "MissingDataError") ||
  /npm run setup|isn't in the frames store/.test(messageOf(e));

export function createScenarioHost(deps: ScenarioHostDeps): ScenarioHost {
  const schedule =
    deps.schedule ??
    ((fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    });
  let spec: ScenarioSpec = DEFAULT_SPEC;
  let knobs: KnobState = spec.checked.knobs;
  let epochUtcMs = Date.parse(spec.checked.epochUtc);
  let entered = false;
  let status: ScenarioHostState["status"] = "loading";
  let queued: string | undefined;
  let evaluation: ScenarioEvaluation | undefined;
  let evaluatedAt: ScenarioHostState["evaluatedAt"];
  let problem: ScenarioHostState["problem"];
  let generation = 0;
  let disposed = false;
  /** The overlays drawn for the current scenario, by globe id, with the geometry drawn. */
  let owned = new Map<string, OverlayGeometry>();
  /** The request in the worker, and the latest one waiting behind it. */
  let inFlight = false;
  let waiting: { send: () => void; drop: () => void } | undefined;
  /**
   * Set while the host itself sets up a scene and its clock: a clock change
   * then (the scene's rate, the old scene's time) is the host's, not the
   * user's, and mustn't move the new scenario's time.
   */
  let quiet = false;
  const quietly = (fn: () => void) => {
    quiet = true;
    try {
      fn();
    } finally {
      quiet = false;
    }
  };
  /** The pending re-evaluation (a knob's burst, the clock), and its kind. */
  let timer: { cancel: () => void; kind: "knob" | "clock" } | undefined;

  const state = (): ScenarioHostState => {
    const c = checkedState(spec, knobs, epochUtcMs);
    // The evaluated setup against the current one, as checkedState compares
    // a setup with the checked one.
    const staleBy =
      evaluation && evaluatedAt
        ? checkedState(
            {
              ...spec,
              checked: {
                knobs: evaluatedAt.knobs,
                epochUtc: new Date(evaluatedAt.epochUtcMs).toISOString(),
              },
            },
            knobs,
            epochUtcMs,
          ).changed
        : [];
    return {
      spec,
      knobs,
      epochUtcMs,
      atChecked: c.atChecked,
      changed: c.changed,
      status,
      ...(queued !== undefined && { queued }),
      ...(evaluation !== undefined && { evaluation }),
      ...(evaluatedAt !== undefined && { evaluatedAt }),
      stale: staleBy.length > 0,
      staleBy,
      ...(problem !== undefined && { problem }),
      generation,
    };
  };
  const notify = () => {
    if (!disposed) {
      deps.changed(state());
    }
  };

  const cancelTimer = () => {
    timer?.cancel();
    timer = undefined;
  };

  function removeOwned(): void {
    for (const id of owned.keys()) {
      deps.removeOverlay(id);
    }
    owned = new Map();
  }

  function apply(
    gen: number,
    e: ScenarioEvaluation,
    at: NonNullable<ScenarioHostState["evaluatedAt"]>,
  ): void {
    if (disposed || gen !== generation || e.scenario !== spec.id) {
      return;
    }
    const next = new Map(
      e.overlays.map((o) => [overlayId(spec.id, o.id), o.geometry]),
    );
    for (const id of owned.keys()) {
      if (!next.has(id)) {
        deps.removeOverlay(id);
      }
    }
    for (const [id, geometry] of next) {
      // The same geometry stays drawn: no upload while the clock plays
      // and the mesh didn't change (Task 4d).
      if (!sameData(owned.get(id), geometry)) {
        deps.drawOverlay(id, geometry);
      }
    }
    owned = next;
    evaluation = e;
    evaluatedAt = at;
    status = "ready";
    queued = undefined;
    problem = undefined;
    notify();
  }

  function fail(gen: number, error: unknown): void {
    if (disposed || gen !== generation) {
      return;
    }
    status = "error";
    queued = undefined;
    problem = { message: messageOf(error), missing: isMissing(error) };
    // Nothing of the last setup's answer stays on the globe as this one's
    // (Task 9, N8): its overlays go, and the page's layers that read the
    // evaluation (the bodies' lines and labels, the legend, the sight
    // lines) see none. The scene's own frames stay.
    removeOwned();
    evaluation = undefined;
    evaluatedAt = undefined;
    notify();
  }

  /** Asks for the current scenario at the current knobs and time: a new generation. */
  function request(): Promise<void> {
    cancelTimer();
    const gen = ++generation;
    const ask = { id: spec.id, knobs, epochUtcMs };
    status = "loading";
    problem = undefined;
    queued = deps.busy?.();
    notify();
    return new Promise<void>((resolve) => {
      const send = () => {
        inFlight = true;
        deps
          .evaluate(ask.id, ask.knobs, ask.epochUtcMs)
          .then(
            (e) =>
              apply(gen, e, { knobs: ask.knobs, epochUtcMs: ask.epochUtcMs }),
            (error: unknown) => fail(gen, error),
          )
          .finally(() => {
            inFlight = false;
            resolve();
            const next = waiting;
            waiting = undefined;
            if (next && !disposed) {
              next.send();
            } else {
              next?.drop();
            }
          });
      };
      if (inFlight) {
        // Only the latest waits: the one it replaces is never sent.
        waiting?.drop();
        waiting = { send, drop: resolve };
      } else {
        send();
      }
    });
  }

  function show(
    id: ScenarioId,
    nextKnobs?: KnobState,
    nextEpoch?: number,
  ): Promise<void> {
    const next = SCENARIOS.find((s) => s.id === id) ?? DEFAULT_SPEC;
    const switching = !entered || next.id !== spec.id;
    if (switching) {
      // The old scenario's overlays go, and its scene is left, before the
      // new one enters or draws (Review Focus 3).
      removeOwned();
      if (entered) {
        quietly(() => deps.leave(spec));
      }
      evaluation = undefined;
      evaluatedAt = undefined;
    }
    spec = next;
    knobs = clampKnobs(spec, nextKnobs ?? spec.checked.knobs);
    epochUtcMs =
      nextEpoch !== undefined && Number.isFinite(nextEpoch)
        ? nextEpoch
        : Date.parse(spec.checked.epochUtc);
    quietly(() => {
      deps.setClock(epochUtcMs);
      if (switching) {
        entered = true;
        deps.enter(spec, knobs);
      } else {
        deps.update(spec, knobs);
      }
    });
    return request();
  }

  function setKnob(id: string, value: KnobValue): void {
    if (disposed || !spec.knobs.some((k) => k.id === id)) {
      return;
    }
    const next = withKnob(spec, knobs, id, value);
    if (next[id] === knobs[id]) {
      return;
    }
    knobs = next;
    quietly(() => deps.update(spec, knobs));
    // The marker moves at once; the evaluation when the burst ends.
    cancelTimer();
    timer = {
      kind: "knob",
      cancel: schedule(() => {
        timer = undefined;
        void request();
      }, KNOB_WAIT),
    };
    notify();
  }

  function backToChecked(): void {
    if (disposed) {
      return;
    }
    cancelTimer();
    // A view knob (the dish's "From orbit") is a way of looking, not part
    // of the checked setup: it stays as the user chose it.
    const views = Object.fromEntries(
      spec.knobs
        .filter((k) => k.view === true)
        .map((k) => [k.id, knobs[k.id]!]),
    );
    knobs = { ...spec.checked.knobs, ...views };
    epochUtcMs = Date.parse(spec.checked.epochUtc);
    quietly(() => {
      deps.setClock(epochUtcMs);
      deps.update(spec, knobs);
    });
    deps.reframe?.(spec);
    void request();
  }

  function clockChanged(): void {
    // Whole milliseconds: the clock's own time is fractional while it plays,
    // and the link carries an integer (selection.ts).
    const now = Math.round(deps.clock());
    if (disposed || quiet || !entered || now === epochUtcMs) {
      return;
    }
    epochUtcMs = now;
    // At most once per wait while it plays: a timer already set stands
    // (unlike a knob's, it isn't pushed back), so the answer keeps up.
    if (timer === undefined) {
      timer = {
        kind: "clock",
        cancel: schedule(() => {
          timer = undefined;
          void request();
        }, CLOCK_WAIT),
      };
    }
    notify();
  }

  return {
    show,
    setKnob,
    backToChecked,
    clockChanged,
    state,
    params: () => ({ scenario: spec.id, knobs, time: epochUtcMs }),
    dispose: () => {
      if (disposed) {
        return;
      }
      cancelTimer();
      removeOwned();
      // Disposed first, and quietly: the scene's leave restores the clock,
      // and its change event mustn't start a request (fix 1, item 10).
      disposed = true;
      if (entered) {
        quietly(() => deps.leave(spec));
      }
      waiting?.drop();
      waiting = undefined;
    },
  };
}
