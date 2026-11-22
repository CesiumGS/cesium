// Waiting for a view's first correct frame (`Engine.whenReady`, provisional).
import type { Engine } from "./Engine.ts";
import type { View } from "./View.ts";
import type { DrawHandle } from "./world/types.ts";

export interface WhenReadyOptions {
  /** Wait for these draws only (default: everything the view's world draws). */
  readonly draws?: readonly DrawHandle[];
  /** Rejects with the signal's reason when it aborts. */
  readonly signal?: AbortSignal;
  /** Resolves anyway after this long, ms, with a warning (default: no limit). */
  readonly timeoutMs?: number;
}

type ReadyEngine = Pick<
  Engine,
  "onAfterTick" | "requestRender" | "reportError" | "stats"
>;

export function whenReady(
  engine: ReadyEngine,
  view: View,
  options: WhenReadyOptions = {},
): Promise<void> {
  const { draws, signal, timeoutMs } = options;
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const first = engine.stats.framesRendered;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: unknown) => {
      stop();
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    };
    const onAbort = () => finish(signal!.reason ?? new Error("aborted"));
    // After each frame of the loop: a frame must have rendered since the
    // call (it records the bundles and dices what was added), and then no
    // draw may have used a stand-in in any of them.
    const stop = engine.onAfterTick(() => {
      if (view.world.destroyed) {
        finish();
      } else if (
        engine.stats.framesRendered > first &&
        view.world.ready(draws)
      ) {
        finish();
      } else {
        engine.requestRender();
      }
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        engine.reportError(
          "frame",
          `whenReady: not ready after ${timeoutMs} ms (a pipeline or texture is slow); showing what there is.`,
        );
        finish();
      }, timeoutMs);
    }
    engine.requestRender();
  });
}
