// The Viewer's reference frames: its frame data, and moving its bindings onto a
// new catalog (Viewer.setFrameData and what it uses).
import type { Viewer } from "./Viewer.ts";
import { showWarnings, emit, warn } from "./viewerWarnings.ts";
import { type AnchorHandle, defaultRig } from "@cesium/next";
import {
  type FrameData,
  type CatalogFrameName,
  type Frame,
  type FrameCatalog,
  createFramesResolver,
  type FrameDataWarning,
  attachSky,
  createFrameCatalog,
} from "@cesium/next/frames";

/** The sky's reference frames (`attachSky`), asked for at "precise" with `frameData`. */
const SKY_FRAMES = ["GCRF", "ITRF", "HCRS", "MOON_ICRF", "MOON_ME"] as const;

export function setFrameData(
  viewer: Viewer,
  data: FrameData | undefined,
): void {
  if (viewer.state.destroyed) {
    return;
  }
  // Everything that can throw first: malformed data or a stranded
  // binding changes nothing.
  const bindings = carriedBindings(viewer);
  const { catalog } = frameCatalog(data, viewer.state.framesAbort);
  viewer.state.warningList.length = 0;
  showWarnings(viewer);
  emit(viewer, "warningsCleared", viewer);
  useFrames(viewer, catalog, data !== undefined, bindings);
}

/**
 * The anchor bindings of the viewer's own resolver, by reference frame
 * name, for a new catalog; throws, naming them, for anchors bound to a
 * reference frame that isn't one of the catalog's built-in ones. A body's
 * anchor is skipped: the new resolver binds it to its body's fixed
 * reference frame when it is first used (asking for it here would bind it,
 * and throw for a body the catalog has no fixed reference frame for).
 */
function carriedBindings(
  viewer: Viewer,
): Array<[AnchorHandle, CatalogFrameName]> {
  const resolver = viewer.state.ownResolver;
  if (!resolver || viewer.engine.cameras.resolver(viewer.world) !== resolver) {
    return [];
  }
  const old = viewer.state.frames_;
  const carried: Array<[AnchorHandle, CatalogFrameName]> = [];
  const stranded: string[] = [];
  for (const anchor of viewer.world.anchors) {
    if (anchor.body) {
      continue;
    }
    const frame: Frame | undefined = resolver.binding(anchor);
    if (!frame) {
      continue;
    }
    const name = frame.name as CatalogFrameName;
    if (old.names.includes(name) && old.get(name) === frame) {
      carried.push([anchor, name]);
    } else {
      stranded.push(`${anchor.name} (bound to ${frame.name})`);
    }
  }
  if (stranded.length > 0) {
    throw new Error(
      `setFrameData: anchors bound to reference frames added to viewer.frames can't move to a new catalog: ${stranded.join(", ")}`,
    );
  }
  return carried;
}

/**
 * Puts the viewer on `catalog`: the world's frame resolver over it, each
 * view's rig on its ITRF, the sky from it ("precise" with frames data, else
 * "analytic") and its warnings.
 */
export function useFrames(
  viewer: Viewer,
  catalog: FrameCatalog,
  precise: boolean,
  bindings: ReadonlyArray<[AnchorHandle, CatalogFrameName]> = [],
): void {
  viewer.state.offFrames?.();
  const cameras = viewer.engine.cameras;
  // An application's frame resolver stays, and so do the rigs it places.
  const appResolver =
    viewer.state.ownResolver !== undefined &&
    cameras.resolver(viewer.world) !== viewer.state.ownResolver;
  // The views to put on the new ITRF: all at first, then those still on
  // the viewer's own rig (an application's rig stays).
  const own = appResolver
    ? []
    : viewer.views.filter(
        (view) =>
          !viewer.state.ownRig || cameras.rig(view) === viewer.state.ownRig,
      );
  if (viewer.state.ownRig) {
    // Back to the table's root first, through the old resolver: the new
    // one can't place the old catalog's ITRF.
    for (const view of own) {
      cameras.setRig(view, defaultRig(viewer.world));
    }
  }
  viewer.state.frames_ = catalog;
  viewer.state.ownRig = {
    position: { frame: catalog.get("ITRF") },
    orientation: { kind: "free" },
  };
  if (!appResolver) {
    const resolver = createFramesResolver(catalog);
    for (const [anchor, name] of bindings) {
      resolver.bindAnchor(anchor, catalog.get(name));
    }
    viewer.state.ownResolver = resolver;
    cameras.setResolver(viewer.world, resolver);
  }
  for (const view of own) {
    cameras.setRig(view, viewer.state.ownRig);
  }
  // With frameData, one `frameDataFailed` says the load failed.
  const listed = (warning: FrameDataWarning) =>
    !(precise && warning.kind === "loadFailed");
  // Notices from before: a FrameData object's came with it (its loader
  // logged them), and a load that ended while the device was created
  // logged its own (nothing listened yet).
  for (const warning of catalog.warnings.filter(listed)) {
    warn(viewer, warning, false);
  }
  const offWarning = catalog.events.on("warning", (warning) => {
    if (listed(warning)) {
      warn(viewer, warning, true);
    }
  });
  const detachSky = attachSky(viewer.sky, {
    catalog,
    clock: viewer.clock,
    precision: precise ? "precise" : "analytic",
  });
  viewer.state.offFrames = () => {
    offWarning();
    detachSky();
  };
}

/**
 * A catalog over `data` (default: the store's URL, loaded only when
 * asked), its loads stopped by `abort`; with data, the sky's reference
 * frames are asked for at "precise" at once, so their loads start.
 */
export function frameCatalog(
  data: string | FrameData | undefined,
  abort = new AbortController(),
): { catalog: FrameCatalog; abort: AbortController } {
  const catalog = createFrameCatalog({
    ...(data !== undefined ? { data } : {}),
    signal: abort.signal,
  });
  if (data !== undefined) {
    for (const name of SKY_FRAMES) {
      catalog.get(name, { precision: "precise" });
    }
  }
  return { catalog, abort };
}
