import type { AnchorHandle, CorePick, View } from "@cesium/next";
import type { Frame, FrameCatalog } from "@cesium/next/frames";
import type { Viewer } from "@cesium/next/widgets";
import type { GraphPanel, GraphSpec } from "./graphPanel.ts";
import type { Queries } from "./queries.ts";

/** A credit: what the scene draws, who made it, and its terms. */
export interface Source {
  readonly what: string;
  readonly who: string;
  readonly terms: string;
  readonly href?: string;
}

/** A pick in one of the viewer's views, with the node its content sits at. */
export interface ScenePick {
  readonly pick: CorePick;
  readonly view: View;
  /** The node the picked content sits at (its anchor's bound frame); undefined for content under none. */
  readonly frame: Frame | undefined;
}

/** What the page gives a scene: the viewer, the panel's regions, and the helpers the scenes share. */
export interface SceneHost {
  readonly viewer: Viewer;
  readonly catalog: FrameCatalog;
  readonly itrf: Frame;
  readonly queries: Queries;
  /** Undone when the scene is left, in reverse order. */
  readonly scope: DisposableStack;
  /** Aborted when the scene is left. */
  readonly signal: AbortSignal;
  readonly accessToken: string | undefined;
  /** The scene's controls (sliders, switches), emptied between scenes. */
  readonly controls: HTMLElement;
  /** The scene's readouts: true and drawn values. */
  readonly readouts: HTMLElement;
  /** Over the view, for labels and the loading card; takes no input. */
  readonly overlay: HTMLElement;
  readonly graph: GraphPanel;
  /** Binds an anchor's content to a frame: its coordinates are the frame's, and it is drawn through the edges from the frame to the camera. Undone with the scene. */
  bind(anchor: AnchorHandle, frame: Frame): void;
  /** The node an anchor's content sits at. */
  frameOf(anchor: AnchorHandle | undefined): Frame | undefined;
  /** Describes the graph for the panel. */
  describe(spec: GraphSpec): void;
  /** Names what the view waits for in the loading card; undefined hides it. */
  loading(text: string | undefined): void;
  /** A line about content that did not load, or a stand-in in its place, kept under the readouts. */
  note(text: string): void;
  /** The scene's own handler of a pick in any view. Returns what stops it. */
  onPick(callback: (pick: ScenePick) => void): () => void;
  /** An error's message, without the access token. */
  scrub(error: unknown): string;
}

/** A scene, as the picker lists it. */
export interface Scene {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  /** One sentence: what it shows. */
  readonly caption: string;
  /** The design point it makes. */
  readonly point: string;
  readonly sources: readonly Source[];
  /** Whether the globe is drawn (the seismic section and the assembly sit where there is no ground to hide them). */
  readonly globe: boolean;
  /** Builds the scene in the host and returns once it is drawn or has said why it can't be. */
  start(host: SceneHost): Promise<void>;
}
