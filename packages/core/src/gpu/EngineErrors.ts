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

/** Distinct errors kept, oldest dropped first. */
const MAX_ERRORS = 100;

export class EngineErrors {
  private readonly list: EngineError[] = [];
  private readonly byKey = new Map<string, EngineError>();
  private readonly listeners = new Set<(error: EngineError) => void>();

  /** Distinct errors, oldest first. */
  get all(): readonly EngineError[] {
    return this.list;
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
    for (const listener of this.listeners) {
      listener(error);
    }
    return error;
  }

  /** Forgets every error (counts start again). */
  clear(): void {
    this.list.length = 0;
    this.byKey.clear();
  }

  /** Hears every report; returns the unsubscribe. */
  on(listener: (error: EngineError) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
