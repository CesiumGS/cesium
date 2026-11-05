import type { GlobeKind, Viewer } from "../widgets/index.ts";

/**
 * Examples (plan §13.12): what users and stakeholders see, one per
 * feature or use case. Each is a module under `examples/<slug>/` whose
 * `run` builds its scene in a viewer of its own and returns what undoes
 * it; the gallery (Dyno's Examples) keeps one engine while examples come
 * and go, each in a fresh viewer on it, and shows each one's source. The shape stays small so an
 * example can move to Sandcastle or a page of its own.
 */
export interface ExampleContext {
  /**
   * A viewer of the example's own (on the gallery's shared engine), its
   * globe as the example asks (`globe`): destroyed when the example is
   * left, with everything in its world, so an example needn't restore
   * what it changed in it.
   */
  viewer: Viewer;
  /**
   * Disposed when the example is left, after its undo: `scope.use(...)`
   * anything disposable it makes (model handles, placements).
   */
  scope: DisposableStack;
  /** A panel over the view for the example's controls and readouts. */
  panel: HTMLElement;
  /** ion access token the gallery resolved, if any. */
  accessToken: string | undefined;
  /** Aborted when the example is left, before its disposer runs. */
  signal: AbortSignal;
}

/** Removes what `run` added. */
export type Dispose = () => void;

export interface ExampleModule {
  run(context: ExampleContext): Promise<Dispose> | Dispose;
}

/** An example as the gallery lists it. */
export interface ExampleInfo {
  /** The route segment: /#/examples/<id>. */
  id: string;
  title: string;
  /** One or two sentences: what it shows. */
  description: string;
  /** Topics, for finding it ("Terrain", "Custom shading"). */
  labels: string[];
  /** The globe it is built on. */
  globe: GlobeKind;
  /**
   * Where its panel goes: over the view's top right ("overlay", the
   * default: a few controls) or in a column beside the view ("side": an
   * editor or other tools that want the room).
   */
  layout?: "overlay" | "side";
  load: () => Promise<ExampleModule>;
  /** Its module's source, as shown beside it. */
  source: () => Promise<string>;
}
