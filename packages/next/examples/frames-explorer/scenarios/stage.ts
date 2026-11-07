// Each scenario's scene on the globe (scenes.ts says what it is): entering
// it sets the clock's rate, the light, the exposure and its own frames (the
// lunar site, Sacramento), turns on what it draws (Orion's path) and flies
// to its view; its knobs move them; leaving undoes all of it. The scenario
// host (scenarioHost.ts) calls these as it switches.
import type { Frame } from "../../../src/frames/Frame.ts";
import type { CameraView } from "../cameraViews.ts";
import { NARROW_VIEW } from "../content.ts";
import {
  OVERLAYS,
  type EngineeringSetup,
  type OverlayState,
} from "../overlayConfig.ts";
import type { PageCore } from "../page.ts";
import type { OrionFrame, OverlayId } from "../panel/model.ts";
import type { StressResult } from "../tests.ts";
import {
  SCENES,
  earthSiteFrame,
  lunarSiteFrame,
  sceneExposure,
  type SceneSpec,
} from "./scenes.ts";
import type { KnobState, ScenarioId } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

export interface Stage {
  /** The scene on the globe, and the knobs it shows. */
  scene(): SceneSpec | undefined;
  knobs(): KnobState;
  /** The scene's own frames on the main thread (the lunar site, Sacramento), for its triads and camera. */
  local(): readonly Frame[];
  enter(id: ScenarioId, knobs: KnobState): void;
  update(knobs: KnobState): void;
  leave(): void;
  /** The imagery's exposure: the scene's, or dimmed under an engineering result. */
  exposure(): number;
  /** Why the scene's globe isn't the one it asked for, if it isn't. */
  globeProblem(): string | undefined;
  /** The globe the viewer shows now; undefined while it switches. */
  globeShown(): "ellipsoid" | "terrain" | undefined;
  /** The scene's camera, flown to (one-path in 3.0 s, stand-on-moon in 3.5 s). */
  flyToScene(): void;
  /** Orion's path was drawn: a new frame (a knob) is framed once. */
  orionDrawn(): void;
  /**
   * Back to the checked setup: the scene's view again, now, or once Orion's
   * path in its checked frame is drawn if that frame changed.
   */
  reframe(): void;
  /** Every frame: the headlight follows the camera through a flight. */
  tick(): void;
  dispose(): void;
}

export function createStage(deps: {
  core: Pick<PageCore, "viewer" | "globe" | "frames" | "disposed">;
  overlays: {
    state(id: OverlayId): OverlayState;
    set(id: OverlayId, on: boolean): void;
    drawOn(id: OverlayId): void;
    setEngineering(setup: EngineeringSetup | undefined): void;
    engineering(): EngineeringSetup;
  };
  orion: { frame(): OrionFrame; setFrame(frame: OrionFrame): void };
  sceneView(sc: SceneSpec, knobs: KnobState): CameraView | undefined;
  show(v: CameraView, seconds?: number): void;
  catalog: {
    results(): readonly StressResult[];
    run(ids: readonly string[]): Promise<string | undefined>;
  };
  rebuildTree(): void;
  refreshTriads(): void;
  refreshCallouts(): void;
}): Stage {
  const { viewer, globe, frames: framesNow, disposed } = deps.core;
  const { overlays, orion } = deps;
  let scene: SceneSpec | undefined;
  let sceneKnobs: KnobState = {};
  let local: Frame[] = [];
  /** The clock's rate and mode before the scene set them, restored when it's left. */
  let sceneClock: { rate: number; mode: typeof viewer.clock.mode } | undefined;
  /** Orion's frame changed: frame the new path once it is drawn. */
  let reframeOrion = false;
  /** A flight to the site's new latitude, after the knob's burst. */
  let siteFlight = 0;
  /** The engineering overlays drawn again in the knobs' setup, after their burst. */
  let engineeringRedraw = 0;
  /** The setup outside the scene, restored when it's left. */
  let defaults: EngineeringSetup | undefined;
  /**
   * The globe the scene wants (spec.globe: terrain for a local horizon,
   * Task 6b), and the one asked of the viewer. Leaving asks for the
   * ellipsoid a microtask later, so a switch from one terrain scene to
   * another keeps the terrain loaded.
   */
  let wantedGlobe: "ellipsoid" | "terrain" = "ellipsoid";
  let askedGlobe: "ellipsoid" | "terrain" = "ellipsoid";
  /** The globe the viewer shows: undefined while a switch is on its way. */
  let shownGlobe: "ellipsoid" | "terrain" | undefined = "ellipsoid";
  let globeProblem: string | undefined;
  function applyGlobe(): void {
    if (disposed() || wantedGlobe === askedGlobe) {
      return;
    }
    askedGlobe = wantedGlobe;
    globeProblem = undefined;
    shownGlobe = undefined;
    const kind = wantedGlobe;
    viewer.setGlobe(kind).then(
      () => {
        if (askedGlobe === kind) {
          shownGlobe = kind;
        }
      },
      (error: unknown) => {
        // No ion token, or the terrain endpoint failed: the line of sight
        // says the terrain is unknown (sightLines.ts), never clear. The
        // old globe stays.
        if (askedGlobe === kind) {
          globeProblem = `the ${kind} globe didn't load (${error instanceof Error ? error.message : String(error)})`;
          askedGlobe = kind === "terrain" ? "ellipsoid" : "terrain";
          shownGlobe = askedGlobe;
        }
      },
    );
  }

  const exposure = (): number =>
    sceneExposure(scene, viewer.container.clientWidth, NARROW_VIEW);

  /**
   * Earth-turns (S-I6): played at 3,600× the framed side passes into night,
   * so the globe is lit from the camera instead, set after the viewer's own
   * sun on every clock change (this listener comes after the viewer's).
   */
  let headlight = false;
  function lightFromCamera(): void {
    const p = viewer.view.camera.position;
    const l = Math.hypot(p[0]!, p[1]!, p[2]!);
    if (l > 0) {
      viewer.engine.sunDirection.set([p[0]! / l, p[1]! / l, p[2]! / l]);
      viewer.engine.requestRender();
    }
  }
  const offClock = viewer.clock.events.on("change", () => {
    if (headlight) {
      lightFromCamera();
    }
  });

  // Earth-turns' exposure depends on the view's width (F43): follow it.
  const exposureObserver = new ResizeObserver(() => {
    if (scene?.dim !== undefined) {
      globe.dimGround(exposure());
    }
  });
  exposureObserver.observe(viewer.container);

  function flyToScene(): void {
    const v = scene && deps.sceneView(scene, sceneKnobs);
    if (v) {
      deps.show(v, scene!.flight);
    }
  }

  /** The knobs on the globe: the clock's rate, the lunar site, Orion's frame. */
  function applySceneKnobs(): void {
    const frames = framesNow();
    if (!scene || !frames) {
      return;
    }
    if (scene.clockRate) {
      viewer.clock.rate = scene.clockRate(sceneKnobs);
    }
    const latitude = scene.lunarSite?.(sceneKnobs);
    const itrf = frames.itrf;
    local = [
      ...(latitude !== undefined
        ? [lunarSiteFrame(frames.moonMe, latitude)]
        : []),
      ...(scene.earthSites?.(sceneKnobs) ?? []).map((s) =>
        earthSiteFrame(itrf, s),
      ),
    ];
    const drawIn = scene.orion?.(sceneKnobs);
    if (drawIn !== undefined) {
      const o = overlays.state("orion");
      if (!o.on || drawIn !== orion.frame()) {
        orion.setFrame(drawIn);
        overlays.drawOn("orion");
      }
    } else if (scene.orion && overlays.state("orion").on) {
      // A view without the path (the dish's own): it goes.
      overlays.set("orion", false);
    }
    deps.rebuildTree();
    deps.refreshTriads();
    deps.refreshCallouts();
  }

  /** The scene's engineering overlays, on and in its setup at the knobs (the BIM site, the corridor). */
  function applyEngineering(): void {
    const eng = scene?.engineering;
    if (!eng) {
      return;
    }
    defaults ??= overlays.engineering();
    const setup = eng.setup(sceneKnobs, defaults);
    const moved =
      overlays.engineering().look.join() !== setup.look.join() &&
      overlays.engineering() !== defaults;
    overlays.setEngineering(setup);
    // A CRS whose area of use doesn't cover the site draws nothing (the
    // answer says why): its overlays go off until it does.
    for (const o of eng.overlays) {
      overlays.set(o, setup.outside === undefined);
    }
    if (moved) {
      // Another site (the BIM site's knob): the camera goes there.
      flyToScene();
    }
  }

  function enter(id: ScenarioId, knobs: KnobState): void {
    scene = SCENES[id];
    sceneKnobs = knobs;
    wantedGlobe = SCENARIOS.find((s) => s.id === id)?.globe ?? "ellipsoid";
    applyGlobe();
    // The overlays no scenario owns (turned on from Verification's results)
    // go with the scene they were drawn over.
    for (const o of OVERLAYS) {
      if (o !== "triads" && overlays.state(o).on) {
        overlays.set(o, false);
      }
    }
    sceneClock = { rate: viewer.clock.rate, mode: viewer.clock.mode };
    if (scene?.light === "camera") {
      headlight = true;
      lightFromCamera();
    }
    applySceneKnobs();
    applyEngineering();
    globe.dimGround(exposure());
    flyToScene();
    // Its proof at the checked setup: the catalog's checks, run if they
    // aren't in hand (queued after the scenario's own evaluation).
    queueMicrotask(() => ensureProof(id));
  }

  function update(knobs: KnobState): void {
    const moved =
      scene?.lunarSite?.(knobs) !== scene?.lunarSite?.(sceneKnobs) ||
      JSON.stringify(scene?.look?.(knobs)) !==
        JSON.stringify(scene?.look?.(sceneKnobs)) ||
      scene?.cameraFor?.(knobs) !== scene?.cameraFor?.(sceneKnobs);
    if (scene?.orion && scene.orion(knobs) !== scene.orion(sceneKnobs)) {
      reframeOrion = true;
    }
    sceneKnobs = knobs;
    applySceneKnobs();
    if (scene?.engineering) {
      // PROJ draws them again once the slider rests, not at every step.
      clearTimeout(engineeringRedraw);
      engineeringRedraw = window.setTimeout(() => {
        if (!disposed()) {
          applyEngineering();
        }
      }, 200);
    }
    if (moved) {
      // The camera follows the site once the slider rests.
      clearTimeout(siteFlight);
      siteFlight = window.setTimeout(() => {
        if (
          !disposed() &&
          (scene?.lunarSite || scene?.look || scene?.cameraFor)
        ) {
          flyToScene();
        }
      }, 400);
    }
  }

  function leave(): void {
    if (scene?.orion) {
      overlays.set("orion", false);
    }
    clearTimeout(engineeringRedraw);
    if (scene?.engineering) {
      for (const o of scene.engineering.overlays) {
        overlays.set(o, false);
      }
      overlays.setEngineering(defaults);
      defaults = undefined;
    }
    if (headlight) {
      headlight = false;
      viewer.sunFromClock = true;
    }
    if (sceneClock) {
      // The rate and the mode the scene found (fix 1, item 10).
      viewer.clock.rate = sceneClock.rate;
      viewer.clock.mode = sceneClock.mode;
      sceneClock = undefined;
    }
    clearTimeout(siteFlight);
    // A switch mid-draw mustn't fly to the old scene's path (fix 2).
    reframeOrion = false;
    scene = undefined;
    local = [];
    wantedGlobe = "ellipsoid";
    queueMicrotask(applyGlobe);
    globe.dimGround(false);
    deps.rebuildTree();
    deps.refreshTriads();
    deps.refreshCallouts();
  }

  /** The catalog's proof checks for scenario `id`, run if the page doesn't have them. */
  function ensureProof(id: ScenarioId): void {
    const spec = SCENARIOS.find((s) => s.id === id);
    const missing = (spec?.proof ?? []).filter(
      (p) => !deps.catalog.results().some((r) => r.id === p),
    );
    if (!disposed() && missing.length > 0) {
      void deps.catalog.run(missing);
    }
  }

  return {
    scene: () => scene,
    knobs: () => sceneKnobs,
    local: () => local,
    enter,
    update,
    leave,
    exposure,
    globeProblem: () => globeProblem,
    globeShown: () => shownGlobe,
    flyToScene,
    reframe: () => {
      clearTimeout(siteFlight);
      if (scene && !reframeOrion) {
        flyToScene();
      }
    },
    orionDrawn: () => {
      if (reframeOrion) {
        // A new frame reads as a change: the camera frames the new path
        // (the ITRF spiral is far larger than the figure-eight).
        reframeOrion = false;
        flyToScene();
      }
    },
    tick: () => {
      if (headlight) {
        // Follows the camera through the stop's flight.
        lightFromCamera();
      }
    },
    dispose: () => {
      // In the reverse of the order they were set up.
      exposureObserver.disconnect();
      if (headlight) {
        viewer.sunFromClock = true;
      }
      offClock();
      clearTimeout(siteFlight);
      clearTimeout(engineeringRedraw);
    },
  };
}
