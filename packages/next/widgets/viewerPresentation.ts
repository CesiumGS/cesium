// Holding the Viewer's image while a host application changes the scene.
import type { Viewer } from "./Viewer.ts";

export function suspendPresentation(
  viewer: Viewer,
  options: { hide?: boolean } = {},
): (() => void) & Disposable {
  let resumed = false;
  if (viewer.suspensions++ === 0) {
    viewer.view.enabled = false;
    viewer.container.dataset.cesiumPresentationSuspended = "";
    viewer.onPresentationChange?.(true);
  }
  const hide = options.hide === true;
  if (hide && viewer.hidingSuspensions++ === 0) {
    viewer.canvas.style.visibility = "hidden";
  }
  const resume = () => {
    if (resumed) {
      return;
    }
    resumed = true;
    if (hide && --viewer.hidingSuspensions === 0) {
      // Shown once a new frame is drawn (`onAfterTick`): shown now, the canvas
      // would present its last frame, of what went away, for a frame.
      viewer.unhideAfter = viewer.engine.stats.framesRendered;
    }
    if (--viewer.suspensions === 0) {
      viewer.view.enabled = true;
      delete viewer.container.dataset.cesiumPresentationSuspended;
      viewer.engine.requestRender();
      viewer.onPresentationChange?.(false);
    }
  };
  return Object.assign(resume, { [Symbol.dispose]: resume });
}

export async function suspendPresentationUntil<T>(
  viewer: Viewer,
  work: Promise<T>,
): Promise<T> {
  const resume = viewer.suspendPresentation();
  try {
    return await work;
  } finally {
    resume();
  }
}

export function resumePresentation(viewer: Viewer): void {
  viewer.resumeStart?.();
  viewer.resumeStart = undefined;
}
