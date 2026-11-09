// Holding the Viewer's image while a host application changes the scene.
import type { Viewer } from "./Viewer.ts";
import type { ViewerState } from "./viewerState.ts";

/** @internal Holding the image. */
export interface ViewerHoldContext extends Pick<
  Viewer,
  | "canvas"
  | "container"
  | "engine"
  | "onPresentationChange"
  | "suspendPresentation"
  | "view"
> {
  readonly state: Pick<
    ViewerState,
    "hidingSuspensions" | "resumeStart" | "suspensions" | "unhideAfter"
  >;
}

export function suspendPresentation(
  viewer: ViewerHoldContext,
  options: { hide?: boolean } = {},
): (() => void) & Disposable {
  let resumed = false;
  if (viewer.state.suspensions++ === 0) {
    viewer.view.enabled = false;
    viewer.container.dataset.cesiumPresentationSuspended = "";
    viewer.onPresentationChange?.(true);
  }
  const hide = options.hide === true;
  if (hide && viewer.state.hidingSuspensions++ === 0) {
    viewer.canvas.style.visibility = "hidden";
  }
  const resume = () => {
    if (resumed) {
      return;
    }
    resumed = true;
    if (hide && --viewer.state.hidingSuspensions === 0) {
      // Shown once a new frame is drawn (`onAfterTick`): shown now, the canvas
      // would present its last frame, of what went away, for a frame.
      viewer.state.unhideAfter = viewer.engine.stats.framesRendered;
    }
    if (--viewer.state.suspensions === 0) {
      viewer.view.enabled = true;
      delete viewer.container.dataset.cesiumPresentationSuspended;
      viewer.engine.requestRender();
      viewer.onPresentationChange?.(false);
    }
  };
  return Object.assign(resume, { [Symbol.dispose]: resume });
}

export async function suspendPresentationUntil<T>(
  viewer: ViewerHoldContext,
  work: Promise<T>,
): Promise<T> {
  const resume = viewer.suspendPresentation();
  try {
    return await work;
  } finally {
    resume();
  }
}

export function resumePresentation(viewer: ViewerHoldContext): void {
  viewer.state.resumeStart?.();
  viewer.state.resumeStart = undefined;
}
