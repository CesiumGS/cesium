/** A 1.x package the pinned release was published with. */
export interface PinnedSource {
  /** Its `Source/` folder. */
  dir: string;
  version: string;
}

/** The pinned CesiumJS 1.x, `cesium-1x` in the workspace root. */
export interface Pinned1x {
  version: string;
  /** The package's folder in node_modules. */
  dir: string;
  /** Its unminified build, served at /cesium1x/. */
  build: string;
  core: PinnedSource;
  engine: PinnedSource;
  widgets: PinnedSource;
}

export function pinned1x(): Pinned1x;
