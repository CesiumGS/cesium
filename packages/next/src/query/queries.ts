/**
 * One query interface for rays (spec section 7.10, plan 5a's call 38):
 * picking, snapping, lines of sight and height queries reach rays through
 * it, never `castTerrainRay`, `World.castRays` or a tileset's CPU triangles
 * directly (test/seams.test.ts enforces it for the examples and
 * `measure`). Today CPU structures answer (the drawn terrain's triangles,
 * `terrainBackend.ts`) and the GPU's brute-force cast (`drawBackend.ts`);
 * a hardware ray-query engine replaces those backends later, not the
 * callers. So the interface already has the shape such an engine needs:
 *
 * - asynchronous: every answer comes later (a promise), even when the CPU
 *   knows it at once, because a GPU engine reads results back a tick or
 *   more later;
 * - batched: a query carries many rays, and the queries asked in one task
 *   go to each backend together;
 * - standing queries: re-answered each tick, or when the revision of what
 *   they ask about goes up, to a subscriber;
 * - three-way answers: clear, blocked or unknown, with the spans it
 *   couldn't decide, why, and the accuracy of what it did decide;
 * - answers that improve: each carries a revision and says whether a
 *   better one may follow (`final`).
 *
 * The 5a backends take rays in one anchor's coordinates (Earth-fixed under
 * the Earth's anchor); carrying rays through the frame tree is 5b's.
 */
import type { View } from "../scene/View.ts";
import type { AnchorHandle } from "../scene/world/types.ts";

/** What a ray may meet: the drawn terrain, or the world's draws. */
export type RayTarget = "terrain" | "draws";

/** A segment, metres in the query's anchor's coordinates. */
export interface QueryRay {
  readonly from: ArrayLike<number>;
  readonly to: ArrayLike<number>;
}

/** The terrain's own error and the observers' ground (`terrainLineOfSight`'s options). */
export interface TerrainQueryOptions {
  /**
   * The terrain source's own vertical accuracy: metres and the statistic
   * they are (`"1σ"`, `"LE90"`), added to the drawn tiles' geometric error.
   */
  readonly sourceAccuracy?: {
    readonly meters: number;
    readonly statistic: string;
  };
  /**
   * How far from each end (horizontal m) the ray counts as over its
   * observer's own ground, where the terrain's error doesn't count against
   * it (default 30).
   */
  readonly groundRadius?: number;
}

/** A batch of rays, named by their reference frame and scene time. */
export interface RayQuery {
  /**
   * The anchor whose coordinates the rays are in (the Earth's anchor:
   * Earth-fixed); undefined for the transform table's root.
   */
  readonly anchor: AnchorHandle | undefined;
  /** The scene time the rays are at, UTC seconds since 1970. */
  readonly seconds: number;
  readonly rays: readonly QueryRay[];
  /** What they may meet, each once; each ray's answer covers all of them. */
  readonly targets: readonly RayTarget[];
  /**
   * The view whose drawn content the rays meet: its world, and only what it
   * draws (default: what any view draws, in the anchor's world).
   */
  readonly view?: View;
  /** For the terrain target. */
  readonly terrain?: TerrainQueryOptions;
}

/** A ray's answer: the whole segment clears, something blocks it, or it can't tell. */
export type RayVerdict = "clear" | "blocked" | "unknown";

/**
 * Why a span is undecided: its content isn't loaded (or isn't drawn in the
 * views asked about); only a coarser stand-in is drawn while finer content
 * loads; the ray passes within the content's error; the span lies outside
 * the data; or no engine here answers that target there.
 */
export type UnknownReason =
  "notLoaded" | "notRefined" | "withinError" | "outsideData" | "unsupported";

/** A stretch of a ray (fractions of the way from `from` to `to`) it couldn't decide. */
export interface UnknownSpan {
  readonly from: number;
  readonly to: number;
  readonly reason: UnknownReason;
}

export interface RayAnswer {
  readonly verdict: RayVerdict;
  /**
   * The nearest point where the ray meets a target: the fraction `t` of the
   * way, and the position in the query's anchor's coordinates. Present
   * when blocked.
   */
  readonly hit?: { readonly t: number; readonly position: Float64Array };
  /**
   * The spans it couldn't decide, nearest first. A ray that is blocked may
   * have some (beyond, or before, the block); "unknown" has at least one.
   */
  readonly unknown: readonly UnknownSpan[];
  /** How far what it decided may be off, m, when stated, and in words. */
  readonly accuracy: { readonly meters?: number; readonly note: string };
  /**
   * Heights above the surface the ray was traced against, when the engine
   * measures them (the drawn terrain's does): the lowest over the decided
   * spans (`min`, m, at fraction `t`), and the deciding one away from each
   * end's own ground less the error under it (`margin`: positive is room
   * to spare).
   */
  readonly clearance?: {
    readonly min?: { readonly meters: number; readonly t: number };
    readonly margin?: {
      readonly meters: number;
      readonly clearance: number;
      readonly error: number;
      readonly t: number;
    };
  };
}

export interface QueryAnswer {
  /** One per ray, in order. */
  readonly rays: readonly RayAnswer[];
  /**
   * The revision of what was asked about when it was answered: it goes up
   * as content loads, unloads or moves. A standing query is answered again
   * when it does.
   */
  readonly revision: number;
  /**
   * False when a better answer may follow: content it may meet was loading
   * when it was asked. A standing query asks again when that ends.
   */
  readonly final: boolean;
}

/** A standing query's subscription. */
export interface StandingQuery {
  dispose(): void;
}

export interface SpatialQueries {
  /**
   * Answers the rays later, together with the other queries asked in this
   * task. Rejects with the signal's reason when it is aborted first, and
   * for a query it can't route (a target named twice, an anchor of no
   * world here, a world removed before the answer); the other queries of
   * the batch are answered.
   */
  castRays(
    query: RayQuery,
    options?: { signal?: AbortSignal },
  ): Promise<QueryAnswer>;
  /**
   * Answers `query()` now (later, as every answer), then again each tick
   * with `everyTick`, else on a tick where its revision went up, or where
   * the content that was loading for an answer not `final` has finished.
   * What changes while an answer is in flight is looked at when it lands,
   * so an improved answer comes even if no tick follows. Answers come in
   * order, one at a time; none after `dispose`.
   */
  standing(
    query: () => RayQuery,
    listener: (answer: QueryAnswer) => void,
    options?: { everyTick?: boolean },
  ): StandingQuery;
}

/**
 * An engine behind the interface for one target: it answers every query
 * routed to it in one batch (one answer per ray, per query, in order).
 */
export interface RayBackend {
  answer(queries: readonly RayQuery[]): Promise<RayAnswer[][]> | RayAnswer[][];
}

/** What the interface asks of the scene it answers in. */
export interface QueryHost {
  /** The revision of what `query` asks about (monotonic). */
  revision(query: RayQuery): number;
  /** Whether content `query` may meet is still loading. */
  loading(query: RayQuery): boolean;
  /** Calls `listener` each tick; returns the remover. */
  onTick(listener: () => void): () => void;
  /** Throws for a query it can't route (another world's anchor). */
  check?(query: RayQuery): void;
  /** Reports a standing query's failure or its listener's error. */
  report?(error: unknown): void;
}

interface Pending {
  query: RayQuery;
  resolve: (answer: QueryAnswer) => void;
  reject: (error: unknown) => void;
  signal: AbortSignal | undefined;
  onAbort: (() => void) | undefined;
  settled: boolean;
}

/** Settles `p` once, letting go of its signal. */
function settle(p: Pending): boolean {
  if (p.settled) {
    return false;
  }
  p.settled = true;
  if (p.onAbort) {
    p.signal?.removeEventListener("abort", p.onAbort);
  }
  return true;
}

/**
 * The query interface over `backends` (a target without one answers
 * "unknown", `"unsupported"`), in the scene `host` describes.
 */
export function createSpatialQueries(
  backends: Partial<Record<RayTarget, RayBackend>>,
  host: QueryHost,
): SpatialQueries {
  let pending: Pending[] = [];
  let scheduled = false;

  /** Rejects `p` with `error` unless it has settled. */
  const fail = (p: Pending, error: unknown): void => {
    if (settle(p)) {
      p.reject(error);
    }
  };

  /**
   * `routed`'s answers from `backend`, in one batch; when the batch
   * throws, query by query, so one bad query fails only itself.
   */
  const answerAll = async (
    backend: RayBackend,
    routed: readonly RayQuery[],
  ): Promise<Array<RayAnswer[] | { error: unknown }>> => {
    try {
      return await backend.answer(routed);
    } catch (error) {
      if (routed.length === 1) {
        return [{ error }];
      }
      return Promise.all(
        routed.map(async (query) => {
          try {
            return (await backend.answer([query]))[0]!;
          } catch (one) {
            return { error: one };
          }
        }),
      );
    }
  };

  const flush = async (queued: readonly Pending[]): Promise<void> => {
    // What each answer reflects: the state at dispatch. A query whose
    // route no longer holds (its world removed since it was asked) fails
    // alone.
    const batch: Pending[] = [];
    const revisions: number[] = [];
    /** Loading at dispatch: an answer made then may be bettered later. */
    const loadings: boolean[] = [];
    for (const p of queued) {
      if (p.settled) {
        continue;
      }
      try {
        host.check?.(p.query);
        const revision = host.revision(p.query);
        const loading = host.loading(p.query);
        revisions.push(revision);
        loadings.push(loading);
        batch.push(p);
      } catch (error) {
        fail(p, error);
      }
    }
    if (batch.length === 0) {
      return;
    }
    const targets = [...new Set(batch.flatMap((p) => p.query.targets))];
    const parts = new Map<RayTarget, Array<RayAnswer[] | { error: unknown }>>();
    await Promise.all(
      targets.map(async (target) => {
        const routed = batch
          .filter((p) => p.query.targets.includes(target))
          .map((p) => p.query);
        const backend = backends[target];
        parts.set(
          target,
          backend
            ? await answerAll(backend, routed)
            : routed.map((q) => q.rays.map(() => unsupported(target))),
        );
      }),
    );
    const index = new Map<RayTarget, number>();
    batch.forEach((p, i) => {
      const { query } = p;
      const answers: RayAnswer[][] = [];
      let failed: { error: unknown } | undefined;
      for (const target of query.targets) {
        const k = index.get(target) ?? 0;
        index.set(target, k + 1);
        const part = parts.get(target)![k]!;
        if ("error" in part) {
          failed ??= part;
        } else {
          answers.push(part);
        }
      }
      if (p.settled) {
        return;
      }
      if (failed) {
        fail(p, failed.error);
        return;
      }
      const final = !loadings[i]!;
      const answer: QueryAnswer = {
        rays: query.rays.map((_, r) =>
          query.targets.length === 0
            ? unsupported(undefined)
            : combineRayAnswers(
                answers.map((a) => a[r]!),
                query.targets,
              ),
        ),
        revision: revisions[i]!,
        final,
      };
      if (settle(p)) {
        p.resolve(answer);
      }
    });
  };

  const castRays: SpatialQueries["castRays"] = (query, options = {}) => {
    const signal = options.signal;
    if (signal?.aborted) {
      return Promise.reject(signal.reason);
    }
    try {
      if (new Set(query.targets).size !== query.targets.length) {
        throw new Error(
          `castRays: a target is listed twice (${query.targets.join(", ")}); name each once.`,
        );
      }
      host.check?.(query);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise<QueryAnswer>((resolve, reject) => {
      const entry: Pending = {
        query,
        resolve,
        reject,
        signal,
        onAbort: undefined,
        settled: false,
      };
      if (signal) {
        entry.onAbort = () => fail(entry, signal.reason);
        signal.addEventListener("abort", entry.onAbort, { once: true });
      }
      pending.push(entry);
      if (!scheduled) {
        scheduled = true;
        // A task of its own: the caller's code after the call runs first,
        // and every query asked meanwhile joins the batch.
        queueMicrotask(() => {
          scheduled = false;
          const queued = pending;
          pending = [];
          flush(queued).catch((error: unknown) => {
            // A fault of the interface itself: no query waits for ever.
            for (const p of queued) {
              fail(p, error);
            }
            (host.report ?? console.error)(error);
          });
        });
      }
    });
  };

  const standing: SpatialQueries["standing"] = (
    query,
    listener,
    options = {},
  ) => {
    let disposed = false;
    let busy = false;
    let asked = -Infinity;
    let lastFinal = true;
    const report = host.report ?? console.error;
    const ask = (q: RayQuery): void => {
      try {
        asked = host.revision(q);
      } catch (error) {
        report(error);
        return;
      }
      busy = true;
      castRays(q).then(
        (answer) => {
          busy = false;
          if (disposed) {
            return;
          }
          lastFinal = answer.final;
          try {
            listener(answer);
          } catch (error) {
            report(error);
          }
          // What changed while it was in flight asks again now: the ticks
          // that saw it skipped it, and an engine settled since sends no
          // more (a GPU engine answers a tick or more late).
          if (!disposed) {
            again();
          }
        },
        (error) => {
          busy = false;
          if (!disposed) {
            report(error);
          }
        },
      );
    };
    /** Asks again if its revision rose, or loading ended after an answer not final. */
    const again = (everyTick = false): void => {
      try {
        const q = query();
        if (
          everyTick ||
          host.revision(q) > asked ||
          (!lastFinal && !host.loading(q))
        ) {
          ask(q);
        }
      } catch (error) {
        report(error);
      }
    };
    const off = host.onTick(() => {
      if (disposed || busy) {
        return; // the answer in flight looks again when it lands
      }
      again(options.everyTick);
    });
    try {
      ask(query());
    } catch (error) {
      report(error);
    }
    return {
      dispose: () => {
        disposed = true;
        off();
      },
    };
  };

  return { castRays, standing };
}

/** A target no engine here answers: unknown over the whole ray. */
export function unsupported(target: RayTarget | undefined): RayAnswer {
  return {
    verdict: "unknown",
    unknown: [{ from: 0, to: 1, reason: "unsupported" }],
    accuracy: {
      note:
        target === undefined
          ? "no targets asked for: nothing traced"
          : `no engine here answers rays against the ${target === "terrain" ? "terrain" : "draws"}: not traced`,
    },
  };
}

/**
 * One ray's answers from each of `targets`, as one: blocked when any is (at
 * the nearest hit), else unknown when any is, else clear; the undecided
 * spans of all; the largest stated error; each target's note; the
 * clearance only when its target's block decides, or nothing blocks. A
 * single target's answer is returned as it is.
 */
export function combineRayAnswers(
  parts: readonly RayAnswer[],
  targets: readonly RayTarget[],
): RayAnswer {
  if (parts.length === 1) {
    return parts[0]!;
  }
  let hit: RayAnswer["hit"];
  let decider: RayAnswer | undefined;
  for (const p of parts) {
    if (p.verdict === "blocked" && p.hit && (!hit || p.hit.t < hit.t)) {
      hit = p.hit;
      decider = p;
    }
  }
  const verdict: RayVerdict = parts.some((p) => p.verdict === "blocked")
    ? "blocked"
    : parts.some((p) => p.verdict === "unknown")
      ? "unknown"
      : "clear";
  const unknown = parts
    .flatMap((p) => p.unknown)
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const stated = parts
    .map((p) => p.accuracy.meters)
    .filter((m): m is number => m !== undefined);
  const note = parts
    .map((p, i) => `${targets[i]}: ${p.accuracy.note}`)
    .join("; ");
  // Heights above one target's surface: kept only when that target
  // decides (its block is the nearest), or when nothing blocks.
  const measured = parts.find((p) => p.clearance);
  const clearance =
    measured && (decider === undefined || decider === measured)
      ? measured.clearance
      : undefined;
  return {
    verdict,
    ...(hit && { hit }),
    unknown,
    accuracy:
      stated.length > 0 ? { meters: Math.max(...stated), note } : { note },
    ...(clearance && { clearance }),
  };
}
