import type { Tileset3D, View } from "@cesium/next";
import { CAMERA, positionOf } from "../../vertical-exaggeration/places.ts";
import { bindEarth, createDeformer, drawnAt, geodeticOf } from "../content.ts";
import { whenDrawn } from "../loading.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { checkbox, el, length, slider } from "../ui.ts";

const ION_OSM_BUILDINGS = 96188;
const deg = Math.PI / 180;
const MAX = 10;

export const splitView: Scene = {
  id: "split",
  number: 2,
  title: "Split view, true and exaggerated",
  caption:
    "One node over the Earth's content, one world, two views: the left view sets the node's strength to ×1, the right to ×k. Tiles are selected per view from one cache, and the node's strength is a uniform of each view.",
  point:
    "Same structure, different strengths is a per-view parameter on a plain tree (View.setParameter), not a second graph. A pick's true height is the same in both views; only what is drawn differs.",
  sources: [
    {
      what: "Cesium World Terrain and Bing Maps Aerial",
      who: "Cesium ion (assets 1 and 2)",
      terms: "Under the ion terms; attributions are on the view.",
      href: "https://cesium.com/platform/cesium-ion/",
    },
    {
      what: "Cesium OSM Buildings",
      who: "© OpenStreetMap contributors, through Cesium ion (asset 96188)",
      terms: "ODbL.",
      href: "https://www.openstreetmap.org/copyright",
    },
  ],
  globe: true,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, view } = viewer;
    const deformer = createDeformer(host, {
      max: MAX,
      ceiling: 12_000,
      start: 1,
    });
    const earth = bindEarth(host, deformer.frame);
    const minimumHeight = viewer.controller.minimumHeight;
    viewer.controller.minimumHeight = 40;
    host.scope.defer(() => {
      viewer.controller.minimumHeight = minimumHeight;
    });
    viewer.setSun(70, 30);

    viewer.split = true;
    host.scope.defer(() => {
      viewer.split = false;
    });
    const right = viewer.views.find((v) => v !== view) as View;
    deformer.setFactorIn(view, 1);
    deformer.setFactorIn(right, 5);
    host.scope.defer(() => {
      deformer.setFactorIn(view, undefined);
      deformer.setFactorIn(right, undefined);
    });

    // One camera for both, from the north down the valley and high enough to clear ×10 summits.
    const t = CAMERA.target;
    view.camera.lookAt(
      positionOf(t, t.height),
      CAMERA.heading * deg,
      -35 * deg,
      60_000,
    );
    right.camera.copyFrom(view.camera);
    let link: ReturnType<typeof engine.link> | undefined;
    const setLinked = (on: boolean) => {
      if (on && !link) {
        link = engine.link(view, right, { modes: ["mirror"] });
      } else if (!on && link) {
        engine.unlink(link);
        link = undefined;
      }
      engine.requestRender();
    };
    setLinked(true);
    host.scope.defer(() => setLinked(false));

    // Corner tags say which strength each view draws.
    const left = el("div", { className: "tgx-corner half-left" });
    const rightTag = el("div", { className: "tgx-corner half-right" });
    host.overlay.append(left, rightTag);
    const tags = () => {
      left.textContent = `Left view: ×${deformer.factorIn(view).toFixed(1)}`;
      rightTag.textContent = `Right view: ×${deformer.factorIn(right).toFixed(1)}`;
    };

    host.describe({
      placements: [
        {
          label: "Terrain, Cesium OSM Buildings",
          frame: deformer.frame,
          kind: "content",
        },
        { label: "Camera, left view (×1)", frame: host.itrf, kind: "camera" },
        { label: "Camera, right view (×k)", frame: host.itrf, kind: "camera" },
      ],
      detail: (f) =>
        f === deformer.frame
          ? `heights × a value per view: ${deformer.factorIn(view).toFixed(1)} left, ${deformer.factorIn(right).toFixed(1)} right`
          : undefined,
    });

    // ------------------------------------------------------- readouts
    const heights = {
      true: el("dd", {}, "–"),
      left: el("dd", {}, "–"),
      right: el("dd", {}, "–"),
    };
    const frameNote = el(
      "p",
      { className: "tgx-small" },
      "Click either view to read a point.",
    );
    const readout = el(
      "dl",
      {},
      el("dt", {}, "True height (the content's own)"),
      heights.true,
      el("dt", {}, "Drawn in the left view"),
      heights.left,
      el("dt", {}, "Drawn in the right view"),
      heights.right,
    );
    const marker = createMarker(host);
    const marker2 = createMarker(host);
    const stopPicks = host.onPick(({ pick, frame }: ScenePick) => {
      const truth = host.queries.pickIn(pick, "true");
      const h = geodeticOf(truth.position).height;
      heights.true.textContent = length(h);
      for (const [key, v] of [
        ["left", view],
        ["right", right],
      ] as const) {
        const drawn = drawnAt(deformer, truth.position, deformer.factorIn(v));
        heights[key].textContent = length(geodeticOf(drawn).height);
      }
      frameNote.textContent = `On “${frame?.name ?? "no node"}”; ${truth.note}`;
      const anchor = pick.anchor ?? earth;
      marker.set({ position: truth.position, anchor, view });
      marker2.set({ position: truth.position, anchor, view: right });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const leftSlider = slider(
      "Left view ×",
      {
        min: 1,
        max: MAX,
        step: 0.1,
        value: 1,
        format: (v) => `×${v.toFixed(1)}`,
      },
      (v) => {
        deformer.setFactorIn(view, v);
        tags();
        host.graph.refresh();
        engine.requestRender();
      },
    );
    const rightSlider = slider(
      "Right view ×",
      {
        min: 1,
        max: 8,
        step: 0.1,
        value: 5,
        format: (v) => `×${v.toFixed(1)}`,
      },
      (v) => {
        deformer.setFactorIn(right, v);
        tags();
        host.graph.refresh();
        engine.requestRender();
      },
    );
    const linked = checkbox("Right camera follows the left", true, setLinked);
    host.controls.append(
      leftSlider.root,
      rightSlider.root,
      linked.root,
      el(
        "p",
        { className: "tgx-small" },
        "The world's own value of the node's strength is not used here: each view says its own.",
      ),
    );
    host.readouts.append(readout, frameNote);
    tags();

    const buildings: Promise<Tileset3D | undefined> = viewer
      .addTileset({ ion: ION_OSM_BUILDINGS })
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
    whenDrawn(host, {
      terrainAt: { longitude: 7.7491 * deg, latitude: 46.0207 * deg },
      tilesets: [{ name: "Cesium OSM Buildings", tileset: buildings }],
    });
  },
};
