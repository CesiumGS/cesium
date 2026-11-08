// The design globe's per-frame work, in the engine's frames (plan 4b final
// review I1): one frame loop for the page, the engine's, which sleeps on
// demand once nothing changes. Each frame runs in the engine's order:
//   - before the render (`Engine.onTick`): what moves the scene. The morph
//     and the camera's flights are animations (`animate`), busy while they
//     run, so the loop keeps going until they end;
//   - the render;
//   - after it (`Engine.onAfterTick`): the DOM placed against what the
//     canvas now shows (`afterRender`: the anchor's label, the cursor, the
//     measure tool's labels and ruler), then the stores' listeners
//     (`queue`: the panel, the HUD, the labels' layer).
// So the overlays always match the frame drawn under them. Anything that
// changes what the engine can't see calls `wake`.

/** The engine's frame loop, as the page uses it (`Engine`). */
export interface EngineFrames {
  onTick(listener: (now: number) => boolean): () => void;
  onAfterTick(listener: (now: number) => void): () => void;
  wake(): void;
}

export interface FrameDriver {
  /**
   * Runs `step(now)` before each render until it returns false (an
   * animation: the morph, a flight); the loop runs while it does. Returns
   * what ends it early.
   */
  animate(step: (now: number) => boolean): () => void;
  /**
   * Runs `place(now)` after each render the loop runs, before the queued
   * work: DOM placed against what the canvas shows. Returns the remover.
   */
  afterRender(place: (now: number) => void): () => void;
  /**
   * Runs `work` once after the next render's placing, waking the loop for
   * it (a store's listeners); queued again before then, it runs once. Work
   * queued while the queue runs runs in the same frame.
   */
  queue(work: () => void): void;
  cancel(work: () => void): void;
  /** Asks the engine for a frame (state it can't see changed). */
  wake(): void;
  dispose(): void;
}

/** Rounds of queued work one frame runs at most (work queuing more work). */
const QUEUE_ROUNDS = 8;

export function createFrameDriver(engine: EngineFrames): FrameDriver {
  let disposed = false;
  const placers: Array<(now: number) => void> = [];
  const queued = new Set<() => void>();
  const ends = new Set<() => void>();
  /** In the after-render work: what is queued then runs in this frame. */
  let after = false;
  const offAfter = engine.onAfterTick((now) => {
    if (disposed) {
      return;
    }
    after = true;
    try {
      for (const place of placers.slice()) {
        place(now);
      }
      for (let round = 0; round < QUEUE_ROUNDS && queued.size > 0; round++) {
        const due = [...queued];
        queued.clear();
        for (const work of due) {
          work();
        }
      }
    } finally {
      after = false;
    }
    if (queued.size > 0) {
      engine.wake(); // the rest in the next frame
    }
  });
  return {
    animate(step) {
      if (disposed) {
        return () => {};
      }
      let done = false;
      const end = () => {
        done = true;
        off();
        ends.delete(end);
      };
      const off = engine.onTick((now) => {
        if (done) {
          return false;
        }
        if (!step(now)) {
          end();
          return false;
        }
        return true;
      });
      ends.add(end);
      return end;
    },
    afterRender(place) {
      placers.push(place);
      engine.wake();
      return () => {
        const i = placers.indexOf(place);
        if (i >= 0) {
          placers.splice(i, 1);
        }
      };
    },
    queue(work) {
      if (!disposed) {
        queued.add(work);
        if (!after) {
          engine.wake();
        }
      }
    },
    cancel(work) {
      queued.delete(work);
    },
    wake: () => engine.wake(),
    dispose() {
      disposed = true;
      offAfter();
      for (const end of [...ends]) {
        end();
      }
      placers.length = 0;
      queued.clear();
    },
  };
}
