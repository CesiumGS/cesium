// Every frame (R13): first the labels, against what the canvas shows this
// frame (what the last frame placed: the engine renders before this loop
// runs); then the triads at the clock's instant, Orion's path moved with its
// drawing frame, the orbit carried with its subject, the headlight; now and
// then, what depends on the clock: the tree's statements, the walk, Orion's
// statement and the bias triad, each at most so often in real time (at
// 3,600× the clock passes a minute every frame).
import type { PageCore } from "./page.ts";

export interface FrameLoop {
  /** Starts the loop; returns what stops it. */
  start(): () => void;
  dispose(): void;
}

export function createFrameLoop(deps: {
  core: Pick<PageCore, "viewer" | "frames" | "instantNow" | "disposed"> & {
    globe: Pick<PageCore["globe"], "update" | "placeLabels">;
  };
  /** The tree's values that drift with time, at the clock's instant (treeState.ts `refresh`). */
  refreshTree(): void;
  orion: { place(): void; askIfMoved(now: number, real: number): void };
  callouts: { changed(): boolean; refresh(): void };
  overlays: {
    updateMinorGrid(): void;
    biasOn(): boolean;
    biasAt(): number;
    drawBias(): void;
  };
  followOrbit(): void;
  /** The scene's per-frame work (the headlight). */
  sceneTick(): void;
  walk: { active(): boolean; draw(): void };
}): FrameLoop {
  const { viewer, globe, frames: framesNow, instantNow, disposed } = deps.core;
  const running = new Set<() => void>();

  function start(): () => void {
    let raf = 0;
    let lastTree = viewer.clock.time;
    // Real time too: at the tour's 3,600× the clock passes a minute every
    // frame, and rebuilding the walk's statements each frame cost frames
    // (R13). Once a second at most.
    let lastTreeReal = performance.now();
    let lastBiasReal = performance.now();
    let walkAt = viewer.clock.time;
    let walkReal = performance.now();
    const tick = () => {
      if (disposed()) {
        return;
      }
      // The labels first, against what this frame shows (globe.ts).
      globe.placeLabels();
      const frames = framesNow();
      const instant = instantNow();
      if (frames && instant) {
        globe.update(frames.itrf, instant);
        const now = viewer.clock.time;
        const real = performance.now();
        if (Math.abs(now - lastTree) > 60_000 && real - lastTreeReal > 1000) {
          // The tree's Earth-orientation sigma and the walk's statements
          // (R8), in place: the tree's shape stays (Task 4d).
          lastTree = now;
          lastTreeReal = real;
          deps.refreshTree();
        }
        // Orion's path moves with its drawing frame every frame; its
        // statement (the tree and the legend) is asked for again after a
        // minute of clock time, at most once a second (R8).
        deps.orion.place();
        if (deps.callouts.changed()) {
          // Orion's marker came or went, or its minute changed.
          deps.callouts.refresh();
        }
        deps.overlays.updateMinorGrid();
        deps.followOrbit();
        // The headlight follows the camera through the stop's flight.
        deps.sceneTick();
        if (
          deps.walk.active() &&
          Math.abs(now - walkAt) > 1000 &&
          real - walkReal > 250
        ) {
          walkAt = now;
          walkReal = real;
          deps.walk.draw();
        }
        deps.orion.askIfMoved(now, real);
        if (
          deps.overlays.biasOn() &&
          Math.abs(now - deps.overlays.biasAt()) > 60_000 &&
          real - lastBiasReal > 250
        ) {
          lastBiasReal = real;
          deps.overlays.drawBias();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = () => {
      cancelAnimationFrame(raf);
      running.delete(stop);
    };
    running.add(stop);
    return stop;
  }

  return {
    start,
    dispose: () => {
      for (const stop of [...running]) {
        stop();
      }
    },
  };
}
