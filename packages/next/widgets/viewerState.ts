// What a viewer's moved functions share: its globe, camera controllers, sky and
// the things it owns on an application's behalf.
import type { EarlyEndpoints, GlobeKind, ViewerWarning } from "./Viewer.ts";
import {
  vec3,
  Camera,
  type InspectController,
  type Globe,
  type ImageryProvider,
  type Attribution,
  type Tileset3D,
  type View,
  type GlobeController,
  type Rig,
} from "@cesium/next";
import type { FrameCatalog, FramesResolver } from "@cesium/next/frames";
import type { WarningsHandle } from "./warnings.ts";
import type { TimeControlsHandle } from "./timeControls.ts";

/** One per viewer, made once with it, and filled by its constructor. */
export class ViewerState {
  /** Orbit controls around the focus, when on (`setControls("orbit")`). */
  orbit_?: InspectController;

  globe_?: Globe;
  globeKind!: GlobeKind;
  globeShown = true;
  globeToken = 0;
  imagery?: ImageryProvider;
  /** The default imagery while its metadata resolves. */
  imageryLoading?: Promise<ImageryProvider>;
  terrainAttributions: Attribution[] = [];
  readonly tilesets = new Set<Tileset3D>();
  second?: View;
  secondController?: GlobeController;
  readonly focusCenter = vec3.vec3();
  sun?: { azimuth: number; elevation: number };
  sunFromClock_ = true;
  /** The catalog in use (`frames`), replaced by `setFrameData`. */
  frames_!: FrameCatalog;
  /** Aborts the catalogs' loads on `destroy`. */
  framesAbort!: AbortController;
  /** Stops the sky and the warnings of the catalog in use. */
  offFrames?: () => void;
  readonly warningList: ViewerWarning[] = [];
  warnings_?: WarningsHandle;
  /** The world's frame resolver the viewer set (an app may set its own). */
  ownResolver?: FramesResolver;
  /** The rig the viewer sets on its views for the catalog in use. */
  ownRig?: Rig;
  /** The Moon is drawn (`ViewerOptions.moon`). */
  moon!: boolean;
  /** The clock was given or has been set to the first framing's morning. */
  clockPlaced!: boolean;
  time_?: TimeControlsHandle;
  /** Each `zoomTo`, so a late correction knows whether it still applies. */
  zoomToken = 0;
  destroyed = false;
  accessToken: string | undefined;

  /** Default globe endpoints, resolved while the device was created. */
  early!: EarlyEndpoints;

  /** The night lights' image, resolving (undefined: none). */
  lightsProvider?: Promise<ImageryProvider | undefined>;
  readonly earthPose = new Camera();
  suspensions = 0;
  hidingSuspensions = 0;
  /** Frames rendered when the last hiding suspension ended, until shown. */
  unhideAfter?: number;
  resumeStart?: () => void;
}
