import {
  EARTH,
  Ellipsoid,
  cartographic,
  verticalExaggeration,
  type AnchorHandle,
  type DrawHandle,
  type DrawOptions,
  type MeshData,
  type PlacementParameter,
  type Tileset3D,
  type VerticalExaggeration,
  type View,
} from "@cesium/next";
import {
  smoothFrame,
  warpForward,
  warpInverse,
  type Frame,
  type SmoothFrame,
} from "@cesium/next/frames";
import type { SceneHost } from "./scene.ts";

/** The name of the application's reference frame over the Earth's content. */
export const EXAGGERATED = "Earth content (exaggerated)";

/** A geodetic position: radians, and metres above the WGS84 ellipsoid. */
export interface Geodetic {
  readonly longitude: number;
  readonly latitude: number;
  readonly height: number;
}

export const geodeticOf = (point: ArrayLike<number>): Geodetic => {
  const c = Ellipsoid.WGS84.cartesianToCartographic(
    Float64Array.of(point[0]!, point[1]!, point[2]!),
    cartographic(),
  );
  if (!c) {
    throw new RangeError("a point at the Earth's centre has no height");
  }
  return { longitude: c.longitude, latitude: c.latitude, height: c.height };
};

/** What `createDeformer` takes. */
export interface DeformerOptions {
  /** The strongest multiplier the slider reaches. */
  readonly max: number;
  /** Heights above this, m, are lifted by a constant, not scaled. */
  readonly ceiling: number;
  /** The width below the ceiling over which the lift is blended, m (a fifth of the ceiling by default). */
  readonly band?: number;
  /** The multiplier at first. */
  readonly start: number;
  /** The frame's name. */
  readonly name?: string;
  /** The frame it sits under (default ITRF). */
  readonly parent?: Frame;
}

/**
 * The vertical exaggeration over the Earth's content: a smooth frame under
 * ITRF whose edge multiplies heights by the factor below a ceiling and lifts
 * what is above it by a constant. Its slider is one float of the world
 * (`PlacementParameter` over [0, 1]), or a value per view
 * (`View.setParameter`), so the same node draws ×1 in one view and ×k in
 * another.
 */
export interface Deformer {
  readonly frame: SmoothFrame;
  readonly edge: VerticalExaggeration;
  readonly scale: PlacementParameter;
  readonly max: number;
  readonly ceiling: number;
  /** The multiplier the world's float says. */
  factor: number;
  /** The multiplier `view` draws: its own value, else the world's. */
  factorIn(view: View): number;
  /** Sets the multiplier for one view; undefined makes it follow the world's again. */
  setFactorIn(view: View, factor: number | undefined): void;
  /** Where a true point (the frame's coordinates, ITRF's axes) is drawn, at the world's multiplier. */
  drawn(point: ArrayLike<number>, out?: Float64Array): Float64Array;
  /** The true point drawn at `point`. */
  truth(point: ArrayLike<number>, out?: Float64Array): Float64Array;
}

export function createDeformer(
  host: SceneHost,
  options: DeformerOptions,
): Deformer {
  const { world } = host.viewer;
  const scaleOf = (factor: number) => (factor - 1) / (options.max - 1);
  const scale = world.createPlacementParameter(scaleOf(options.start), {
    range: [0, 1],
  });
  const edge = verticalExaggeration({
    factor: options.max,
    ceiling: options.ceiling,
    band: options.band ?? 0.2 * options.ceiling,
    scale,
  });
  const frame = smoothFrame(
    options.name ?? EXAGGERATED,
    options.parent ?? host.itrf,
    edge,
  );
  host.catalog.add(frame);
  return {
    frame,
    edge,
    scale,
    max: options.max,
    ceiling: options.ceiling,
    get factor() {
      return 1 + scale.value * (options.max - 1);
    },
    set factor(factor: number) {
      scale.value = scaleOf(factor);
    },
    factorIn: (view) => 1 + view.parameterValue(scale) * (options.max - 1),
    setFactorIn: (view, factor) =>
      view.setParameter(
        scale,
        factor === undefined ? undefined : scaleOf(factor),
      ),
    drawn: (point, out = new Float64Array(3)) =>
      warpForward(frame.warp, point, out),
    truth: (point, out = new Float64Array(3)) =>
      warpInverse(frame.warp, point, out),
  };
}

/** The Earth's content from a node `view` doesn't know it by: where `point` (true, ITRF's axes) is drawn at multiplier `factor`. */
export function drawnAt(
  deformer: Deformer,
  point: ArrayLike<number>,
  factor: number,
  out = new Float64Array(3),
): Float64Array {
  const full = deformer.edge.forward(point, out);
  const s = (factor - 1) / (deformer.max - 1);
  for (let i = 0; i < 3; i++) {
    out[i] = point[i]! + s * (full[i]! - point[i]!);
  }
  return out;
}

/** The Earth's anchor, bound to `frame`: the globe, tilesets and models loaded after this are drawn through it. */
export function bindEarth(host: SceneHost, frame: Frame): AnchorHandle {
  const earth = host.viewer.world.bodyAnchor(EARTH);
  host.bind(earth, frame);
  return earth;
}

/** Cesium OSM Buildings (ion asset 96188), removed with the scene; resolves to undefined, with a note, when it can't load. */
export function addOsmBuildings(
  host: SceneHost,
): Promise<Tileset3D | undefined> {
  const { viewer } = host;
  return viewer
    .addTileset({ ion: 96188 })
    .then((added) => {
      if (host.signal.aborted) {
        viewer.remove(added);
        return undefined;
      }
      host.scope.defer(() => viewer.remove(added));
      return added;
    })
    .catch((error: unknown) => {
      host.note(`Cesium OSM Buildings didn't load: ${host.scrub(error)}`);
      return undefined;
    });
}

/**
 * A plain studio for scenes with no globe: a light grey background, a
 * procedural environment for ambient light and an exposure to match, in
 * every view of the viewer; undone with the scene. (With no globe there is
 * no sky to light the content or fill the background.)
 */
export function stage(host: SceneHost): void {
  for (const v of host.viewer.views) {
    const saved = {
      background: v.background,
      clearColor: v.clearColor,
      environment: v.lighting.environment,
      exposure: v.observer.exposure,
    };
    v.background = "color";
    v.clearColor = [0.78, 0.82, 0.88];
    v.lighting.environment = "procedural";
    v.observer.exposure = { ev100: 13 };
    host.scope.defer(() => {
      v.background = saved.background;
      v.clearColor = saved.clearColor;
      v.lighting.environment = saved.environment;
      v.observer.exposure = saved.exposure;
    });
  }
}

/** A mesh drawn under an anchor, removed with the scene. */
export function addMeshDraw(
  host: SceneHost,
  anchor: AnchorHandle,
  mesh: MeshData,
  options: Omit<DrawOptions, "mesh" | "parent"> = {},
): DrawHandle {
  const { world } = host.viewer;
  const handle = world.addMesh(mesh);
  const draw = world.addDraw({ ...options, mesh: handle, parent: anchor });
  host.scope.defer(() => {
    if (!world.destroyed) {
      world.removeDraw(draw);
      world.removeMesh(handle);
    }
  });
  host.viewer.engine.requestRender();
  return draw;
}

/** A new anchor bound to `frame`, removed with the scene (after the draws under it). */
export function anchorIn(
  host: SceneHost,
  name: string,
  frame: Frame,
): AnchorHandle {
  const { world } = host.viewer;
  const anchor = world.addAnchor(name);
  host.scope.defer(() => {
    if (!world.destroyed) {
      world.removeAnchor(anchor);
    }
  });
  host.bind(anchor, frame);
  return anchor;
}
