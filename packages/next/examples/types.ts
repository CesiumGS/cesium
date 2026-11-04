import type { GlobeKind, Viewer } from "../widgets/index.ts";

/**
 * Examples (plan §13.12): what users and stakeholders see, one per
 * feature or use case. Each is a module under `examples/<slug>/` whose
 * `run` builds its scene in the gallery's viewer and returns what undoes
 * it; the gallery (Dyno's Examples) keeps one viewer while examples come
 * and go, and shows each one's source. The shape stays small so an
 * example can move to Sandcastle or a page of its own.
 */
export interface ExampleContext {
  /** The gallery's viewer, its globe set as the example asks (`globe`). */
  viewer: Viewer;
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
  load: () => Promise<ExampleModule>;
  /** Its module's source, as shown beside it. */
  source: () => Promise<string>;
}
