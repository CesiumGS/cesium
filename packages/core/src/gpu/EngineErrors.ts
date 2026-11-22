/**
 * What went wrong in the engine, where an application can see it: shader
 * and pipeline failures, resources destroyed while still in use, frames
 * the GPU rejected, uncaptured device errors, reference frames a view's
 * rig couldn't resolve (`"camera"`), and support notices (`"support"`: a
 * view's look stepped, dropped or limited on this device, with the
 * `notice`). Each distinct message is
 * kept once with a count (a broken frame repeats every frame), the first
 * occurrence logged; `on` hears every report (a gallery's banner, the
 * inspector). The engine isolates what it can around each: a shader that
 * fails draws with the engine's, a batch whose textures were destroyed is
 * skipped, a world whose frame failed is bound again from its state.
 */
export type EngineErrorKind =
  | "shader"
  | "pipeline"
  | "resource"
  | "frame"
  | "device"
  | "camera"
  | "support";

/**
 * A support notice (docs/superpowers/plans/2026-11-13-engine-profiles.md,
 * section 4): a feature of a view's look stepped, dropped, unmet,
 * unsupported or limited on this device, with the rule that decided it.
 * Plain data; the profile layer (src/profile/) makes them.
 */
export interface Notice {
  readonly kind: "stepped" | "dropped" | "unmet" | "unsupported" | "limited";
  readonly feature: string;
  readonly asked: string;
  readonly given: string;
  readonly rule: string;
  readonly reason: string;
  readonly accuracy?: string;
}

export interface EngineError {
  readonly kind: EngineErrorKind;
  readonly message: string;
  /** For kind "support": what was asked, what was given, and the rule. */
  readonly notice?: Notice;
  /** Times reported. */
  count: number;
  /** `performance.now()` of the first and last report. */
  readonly first: number;
  last: number;
}

/** What `EngineErrors.on` calls: the error, as reported (its `count` so far). */
export type EngineErrorListener = (error: EngineError) => void;

/**
 * `Engine.errors`: the errors already raised, and a way to hear the next.
 *
 * It is the list itself, oldest first, one entry per distinct message with
 * its `count` (a `ReadonlyArray`: `length`, index, `filter`, `at`, spread,
 * `for…of`), so what code read before `on` existed reads the same. It is
 * live: it grows as errors are reported, and a snapshot is `[...errors]`.
 * Each entry is updated in place when its message repeats.
 *
 * A listener receives that same entry, not a copy: its `count` and `last`
 * grow with each repeat, so a listener that keeps the entry sees them move.
 * (A copy per report would cost an allocation in the tick and break
 * `error === errors.at(-1)`; read `count` when it is heard to keep a value.)
 * A listener that throws is logged with `console.error` and skipped; the
 * others still hear the report, and the throw is not added to this list. A
 * listener added while a report is being heard hears the next one, not that
 * one. The engine's `destroy` stops every listener.
 *
 * `on` hears the errors reported after it is called, never the ones
 * already in the list. Read the list first to catch up.
 */
export interface EngineErrorLog extends ReadonlyArray<EngineError> {
  /**
   * Hears each report of `kind` (`"support"`: a view's look stepped,
   * dropped or limited here, with `error.notice`), repeats included, as
   * `listener(error)`. Without a kind it hears every kind. Returns a
   * function that stops listening; calling it twice is harmless.
   */
  on(kind: EngineErrorKind, listener: EngineErrorListener): () => void;
  on(listener: EngineErrorListener): () => void;
}

/** Distinct errors kept, oldest dropped first. */
const MAX_ERRORS = 100;

export class EngineErrors {
  private readonly list: EngineError[] = [];
  private readonly byKey = new Map<string, EngineError>();
  private readonly listeners = new Set<{
    readonly kind: EngineErrorKind | undefined;
    readonly listener: EngineErrorListener;
  }>();
  private readonly log: EngineErrorLog;

  constructor() {
    // `on` rides on the list, out of its keys, so it stays an array to
    // everything that reads it (`toEqual`, spread, JSON).
    Object.defineProperty(this.list, "on", { value: this.on.bind(this) });
    this.log = this.list as unknown as EngineErrorLog;
  }

  /** Distinct errors, oldest first, with `on` (`Engine.errors`). */
  get all(): EngineErrorLog {
    return this.log;
  }

  /**
   * Records an error (counted again if seen before), logged the first time
   * unless `quiet` (support notices warn by their own rules).
   */
  report(
    kind: EngineErrorKind,
    message: string,
    detail?: { readonly notice?: Notice; readonly quiet?: boolean },
  ): EngineError {
    const key = `${kind}|${message}`;
    const now = performance.now();
    let error = this.byKey.get(key);
    if (error) {
      error.count++;
      error.last = now;
    } else {
      error = {
        kind,
        message,
        ...(detail?.notice ? { notice: detail.notice } : {}),
        count: 1,
        first: now,
        last: now,
      };
      this.byKey.set(key, error);
      this.list.push(error);
      if (this.list.length > MAX_ERRORS) {
        const dropped = this.list.shift()!;
        this.byKey.delete(`${dropped.kind}|${dropped.message}`);
      }
      if (!detail?.quiet) {
        console.error(`[cesium/next] ${kind}: ${message}`);
      }
    }
    // A snapshot, so a listener added while this report is heard waits for
    // the next one. Each listener is isolated: one that throws is logged
    // here, never through `report` (it would recurse), and the rest still
    // hear this report, so a host's bad listener can't break the tick.
    for (const entry of [...this.listeners]) {
      if (entry.kind === undefined || entry.kind === kind) {
        try {
          entry.listener(error);
        } catch (thrown) {
          console.error(
            `[cesium/next] an errors.on listener threw (${kind}: ${message}):`,
            thrown,
          );
        }
      }
    }
    return error;
  }

  /** Stops every listener (the engine's `destroy`). The list stays readable. */
  dispose(): void {
    this.listeners.clear();
  }

  /** Forgets every error (counts start again). */
  clear(): void {
    this.list.length = 0;
    this.byKey.clear();
  }

  /**
   * Hears each report of `kind`, or of every kind without one; returns the
   * unsubscribe (`Engine.errors.on`).
   */
  on(kind: EngineErrorKind, listener: EngineErrorListener): () => void;
  on(listener: EngineErrorListener): () => void;
  on(
    kindOrListener: EngineErrorKind | EngineErrorListener,
    listener?: EngineErrorListener,
  ): () => void {
    const entry =
      typeof kindOrListener === "function"
        ? { kind: undefined, listener: kindOrListener }
        : { kind: kindOrListener, listener: listener! };
    this.listeners.add(entry);
    return () => void this.listeners.delete(entry);
  }
}
