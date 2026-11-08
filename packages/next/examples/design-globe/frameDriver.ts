// The page's own per-frame work (plan 4b Task 18, fix 2): sweeping the
// pairs whose tiles unloaded, the cursor's staleness and the anchor's label
// when the camera moves. It runs only while something changes (the camera,
// a pair, a flight, a morph) and for a few quiet frames after, then stops:
// a settled page requests no frames, so on-demand rendering idles
// (test/onDemandIdle.test.ts's measure). Anything that may start a change
// calls `wake`.

export interface FrameDriverDeps {
  /** One frame's work; true while something is still changing. */
  step(): boolean;
  /** `requestAnimationFrame` and `cancelAnimationFrame` (injectable for tests). */
  request(callback: () => void): number;
  cancel(handle: number): void;
  /** Quiet frames to run before stopping (inertia ends, late tiles). Default 30. */
  quietFrames?: number;
}

export interface FrameDriver {
  /** Runs (again) until things are quiet. */
  wake(): void;
  /** A frame is scheduled. */
  readonly running: boolean;
  dispose(): void;
}

export function createFrameDriver(deps: FrameDriverDeps): FrameDriver {
  const quietFrames = deps.quietFrames ?? 30;
  let handle = 0;
  let quiet = 0;
  let disposed = false;
  const run = () => {
    handle = 0;
    if (disposed) {
      return;
    }
    quiet = deps.step() ? 0 : quiet + 1;
    if (quiet < quietFrames) {
      handle = deps.request(run);
    }
  };
  return {
    wake() {
      quiet = 0;
      if (handle === 0 && !disposed) {
        handle = deps.request(run);
      }
    },
    get running() {
      return handle !== 0;
    },
    dispose() {
      disposed = true;
      if (handle !== 0) {
        deps.cancel(handle);
        handle = 0;
      }
    },
  };
}
