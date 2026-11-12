import {
  MOON,
  Ellipsoid,
  eastNorthUpToFixedFrame,
  mat4,
  type Tileset3D,
} from "@cesium/next";
import { Frame, frameTransform } from "@cesium/next/frames";
import { Instant } from "@cesium/next/time";
import {
  CAMERA,
  PLACES,
  positionOf,
} from "../../vertical-exaggeration/places.ts";
import {
  addMeshDraw,
  anchorIn,
  bindEarth,
  createDeformer,
  geodeticOf,
} from "../content.ts";
import { hex, MeshBuilder } from "../geometry.ts";
import { whenDrawn } from "../loading.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, checkbox, el, length, slider, trueDrawnTable } from "../ui.ts";

const ION_OSM_BUILDINGS = 96188;
const deg = Math.PI / 180;
const MAX = 10;
const CEILING = 12_000;
/** The satellite's true place: height above the ellipsoid, m, over the Alps. */
const SATELLITE_HEIGHT = 150_000;

/** A satellite for the scene: a body and two panels, 20 km across so that it reads from a few hundred km. */
function satelliteMesh() {
  const b = new MeshBuilder();
  b.box([-5000, -3500, -3500], [5000, 3500, 3500], hex("#d9b44a"));
  b.box([-24000, -400, -7000], [-6000, 400, 7000], hex("#27478f"));
  b.box([6000, -400, -7000], [24000, 400, 7000], hex("#27478f"));
  b.box([-800, -800, 3500], [800, 800, 9000], hex("#cccccc"));
  return b.build();
}

/** A synthetic Moon: a sphere of the Moon's mean radius with dark maria and bright highlands, no data. */
function moonMesh() {
  const b = new MeshBuilder();
  const radius = Ellipsoid.MOON.maximumRadius;
  b.sphere([0, 0, 0], radius, 64, (lon, lat) => {
    const maria =
      Math.sin(lon * 2.1 + 0.7) * Math.cos(lat * 1.7 - 0.2) +
      0.5 * Math.sin(lon * 5.3 - lat * 3.1);
    const v = maria > 0.55 ? 0.28 : 0.62 + 0.12 * Math.sin(lon * 17 + lat * 11);
    return [v * 0.95, v * 0.93, v * 0.88, 1];
  });
  return b.build();
}

export const exaggeration: Scene = {
  id: "exaggeration",
  number: 1,
  title: "Exaggeration over Earth content",
  caption:
    "Alps terrain and OSM Buildings sit under one smooth node that multiplies heights; a satellite at 150 km and a synthetic Moon sit at other nodes. The camera is at ITRF, so what it sees of each is decided by where that content is placed.",
  point:
    "Placement decides what is warped. Above the ceiling the node lifts by a constant, so the satellite moves rigidly and the Moon (384,000 km out) hardly at all; put either outside the node and it is not touched.",
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
    {
      what: "The Moon and the satellite",
      who: "Synthetic meshes made for this page",
      terms:
        "No data; the Moon is placed by the engine's reference frames (MOON_ME).",
    },
  ],
  globe: true,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, world, view } = viewer;
    const deformer = createDeformer(host, {
      max: MAX,
      ceiling: CEILING,
      start: 5,
    });
    const earth = bindEarth(host, deformer.frame);

    const minimumHeight = viewer.controller.minimumHeight;
    viewer.controller.minimumHeight = 40;
    host.scope.defer(() => {
      viewer.controller.minimumHeight = minimumHeight;
    });
    viewer.setSun(70, 30);

    // ----------------------------------------------------- the satellite
    const satPlace = { longitude: 7.62, latitude: 46.35 };
    const satPosition = positionOf(satPlace, SATELLITE_HEIGHT);
    const enu = eastNorthUpToFixedFrame(
      satPosition,
      Ellipsoid.WGS84,
      mat4.mat4(),
    );
    enu[12] = enu[13] = enu[14] = 0;
    const satAnchor = anchorIn(host, "Satellite", host.itrf);
    addMeshDraw(host, satAnchor, satelliteMesh(), {
      origin: satPosition,
      model: enu,
      name: "Satellite",
      doubleSided: true,
    });

    // -------------------------------------------------------- the Moon
    const moonMe = host.catalog.get("MOON_ME");
    const moonAnchor = world.bodyAnchor(MOON);
    addMeshDraw(host, moonAnchor, moonMesh(), {
      origin: new Float64Array(3),
      name: "Moon",
      doubleSided: true,
    });
    // The Moon, placed as the engine's frames say, but under the deformer when asked.
    const moonUnder = new Frame(
      "Moon (placed under the deformer)",
      deformer.frame,
      (instant, out) => void frameTransform(moonMe, host.itrf, instant, out),
      {
        cache: false,
        accuracy: {
          byDefinition: true,
          note: "a placement the application chose",
        },
      },
    );
    host.catalog.add(moonUnder);

    const state = { satelliteUnder: false, moonUnder: false };
    const describe = () => {
      host.describe({
        placements: [
          {
            label: "Terrain, Cesium OSM Buildings",
            frame: deformer.frame,
            kind: "content",
          },
          {
            label: "Satellite (150 km up)",
            frame: state.satelliteUnder ? deformer.frame : host.itrf,
            kind: "content",
          },
          {
            label: "Synthetic Moon",
            frame: state.moonUnder ? moonUnder : moonMe,
            kind: "content",
          },
          {
            label: "Camera (the viewer's rig)",
            frame: host.itrf,
            kind: "camera",
          },
        ],
        detail: (f) =>
          f === deformer.frame
            ? `heights × ${deformer.factor.toFixed(1)} up to ${Math.round(CEILING / 1000)} km, then a constant lift`
            : f === moonUnder
              ? "the Moon's pose in ITRF, as an edge under the deformer"
              : undefined,
      });
    };
    describe();

    // ----------------------------------------------------------- shots
    const valley = () => {
      const t = CAMERA.target;
      view.camera.lookAt(
        deformer.drawn(positionOf(t, t.height)),
        CAMERA.heading * deg,
        CAMERA.pitch * deg,
        CAMERA.range,
      );
      engine.requestRender();
    };
    /** From 55 km up, 190 km south of the Alps, looking north to the satellite over them. */
    const orbit = () => {
      const from = positionOf({ longitude: 7.65, latitude: 44.6 }, 55_000);
      const mid = positionOf({ longitude: 7.65, latitude: 46.1 }, 90_000);
      const camera = view.camera;
      const d = [mid[0]! - from[0]!, mid[1]! - from[1]!, mid[2]! - from[2]!];
      const l = Math.hypot(d[0]!, d[1]!, d[2]!);
      for (let i = 0; i < 3; i++) {
        camera.position[i] = from[i]!;
        camera.direction[i] = d[i]! / l;
      }
      camera.orient(from);
      engine.requestRender();
    };
    const moonAt = (time: number, matrix = new Float64Array(16)) =>
      frameTransform(
        moonMe,
        host.itrf,
        Instant.fromUtc(time, host.catalog.leapSeconds),
        matrix,
      );
    /** The Moon above the Alps' horizon: finds a time in the next month when it stands 22° to 40° up at Zermatt. */
    const moonShot = () => {
      const place = positionOf(PLACES[0]!, 3000);
      const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
        place,
        new Float64Array(3),
      )!;
      const matrix = new Float64Array(16);
      const start = viewer.clock.time;
      let found: number | undefined;
      for (let i = 0; i < 24 * 30 && found === undefined; i++) {
        const time = start + i * 3_600_000;
        moonAt(time, matrix);
        const m = [
          matrix[12]! - place[0]!,
          matrix[13]! - place[1]!,
          matrix[14]! - place[2]!,
        ];
        const l = Math.hypot(m[0]!, m[1]!, m[2]!);
        const elevation = Math.asin(
          (m[0]! * up[0]! + m[1]! * up[1]! + m[2]! * up[2]!) / l,
        );
        if (elevation > 22 * deg && elevation < 40 * deg) {
          found = time;
        }
      }
      if (found === undefined) {
        host.note("The Moon is not 22° up at Zermatt in the next month.");
        return;
      }
      viewer.clock.time = found;
      moonAt(found, matrix);
      const m = [
        matrix[12]! - place[0]!,
        matrix[13]! - place[1]!,
        matrix[14]! - place[2]!,
      ];
      const l = Math.hypot(m[0]!, m[1]!, m[2]!);
      const camera = view.camera;
      for (let i = 0; i < 3; i++) {
        camera.position[i] = place[i]!;
        camera.direction[i] = m[i]! / l;
      }
      camera.orient(up);
      engine.requestRender();
    };
    valley();

    // ------------------------------------------------------- readouts
    const pickTable = trueDrawnTable(
      ["Height above the ellipsoid", "Lengths along it"],
      ["True", "Drawn"],
    );
    const pickText = el(
      "p",
      { className: "tgx-small" },
      "Click the view to read a point.",
    );
    const satShift = el("dd", {}, "–");
    const moonShift = el("dd", {}, "–");
    const shifts = el(
      "dl",
      {},
      el("dt", {}, "Satellite, drawn above its true place"),
      satShift,
      el("dt", {}, "Moon, drawn off its true place"),
      moonShift,
    );
    const marker = createMarker(host);
    const refresh = () => {
      host.graph.refresh();
      const drawnIfUnder = (under: boolean, p: Float64Array) =>
        under ? deformer.drawn(p) : p;
      const s = drawnIfUnder(state.satelliteUnder, satPosition);
      satShift.textContent = length(geodeticOf(s).height - SATELLITE_HEIGHT, 1);
      const matrix = moonAt(viewer.clock.time);
      const moon = Float64Array.of(matrix[12]!, matrix[13]!, matrix[14]!);
      const moved = drawnIfUnder(state.moonUnder, moon);
      const shift = Math.hypot(
        moved[0]! - moon[0]!,
        moved[1]! - moon[1]!,
        moved[2]! - moon[2]!,
      );
      moonShift.textContent = `${length(shift, 1)}, ${((shift / Math.hypot(moon[0]!, moon[1]!, moon[2]!)) * 100).toFixed(4)} % of its distance`;
    };

    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      const truth = host.queries.pickIn(pick, "true");
      const drawn = host.queries.pickIn(pick, "drawn");
      pickTable.set(
        "Height above the ellipsoid",
        length(geodeticOf(truth.position).height),
        length(geodeticOf(drawn.position).height),
      );
      pickTable.set(
        "Lengths along it",
        "1 (true)",
        `×${drawn.stretch[0].toFixed(2)} to ×${drawn.stretch[1].toFixed(2)}`,
      );
      pickText.textContent = `On “${frame?.name ?? "no node"}”: ${truth.note}`;
      marker.set({
        position: truth.position,
        anchor: pick.anchor ?? earth,
        view: v,
      });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const slide = slider(
      "Heights ×",
      {
        min: 1,
        max: MAX,
        step: 0.1,
        value: deformer.factor,
        format: (v) => `×${v.toFixed(1)}`,
      },
      (v) => {
        deformer.factor = v;
        engine.requestRender();
        refresh();
      },
    );
    const satellite = checkbox("Satellite under the deformer", false, (on) => {
      state.satelliteUnder = on;
      host.bind(satAnchor, on ? deformer.frame : host.itrf);
      describe();
      refresh();
      engine.requestRender();
    });
    const moon = checkbox("Moon under the deformer", false, (on) => {
      state.moonUnder = on;
      host.bind(moonAnchor, on ? moonUnder : moonMe);
      describe();
      refresh();
      engine.requestRender();
    });
    host.controls.append(
      slide.root,
      satellite.root,
      moon.root,
      el(
        "div",
        { className: "buttons" },
        button("Valley", valley),
        button("Satellite over the Alps", orbit),
        button("Moon over the Alps", moonShot),
      ),
    );
    host.readouts.append(pickTable.root, pickText, shifts);
    refresh();

    // --------------------------------------------------------- content
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
