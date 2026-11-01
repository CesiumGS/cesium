import {
  Ellipsoid,
  Engine,
  fromDegrees,
  OffscreenTarget,
  resolveIonAsset,
  type Tileset3D,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see heights.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

const TEMPLATE = `
<h1>3D Tiles height parity: what clamped content stands on</h1>
<p>
  OSM Buildings in both engines with the 1.x selection, one camera at a
  time, settled. Over a 15×15 grid around the target: 1.x
  <code>Cesium3DTileset.getHeight</code> (CPU picking of the selected tiles)
  against 2.0 <code>World.castRays</code> (GPU, down the geodetic normal,
  nearest hit).
</p>
<div class="status">Run to compare heights in both engines.</div>
<table data-id="results"></table>
<div class="offscreen" data-id="legacy"></div>
<div data-id="credits" hidden></div>`;

/** Where the page is mounted, and its options (harness `mount`). */
let root: HTMLElement;
let params = new URLSearchParams();
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/**
 * 3D Tiles height parity (plan §15, clamping): the height clamped content
 * stands on, over a grid of points around a camera target, after both
 * engines settle the same view of OSM Buildings with the 1.x selection.
 * 2.0: `World.castRays` on the GPU down the geodetic normal against the
 * tiles the view drew, nearest hit. Two 1.x references:
 *
 * - `Scene.sampleHeight`: a depth render looking down the normal, so what
 *   1.x draws there (the reference).
 * - `Cesium3DTileset.getHeight`, what 1.x clamps models to: CPU picking of
 *   the selected tiles along a geocentric ray, the first tile with any hit.
 *   It misses geometry the renderer draws and can return a lower surface
 *   (plan §14), so it is reported, not held to.
 */

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;
/** Cesium OSM Buildings. */
const OSM_ASSET = 96188;
const RAY_START = 10000;

const CAMERAS = [
  {
    label: "Philadelphia Center City",
    at: [-75.165, 39.9526, 0],
    heading: 20,
    pitch: -45,
    range: 1500,
  },
  {
    label: "Manhattan Midtown",
    at: [-73.9857, 40.7484, 0],
    heading: 200,
    pitch: -50,
    range: 1800,
  },
];

/** 2.0 heights against one 1.x reference. */
interface Comparison {
  /** Points where both hit, and where only one did. */
  both: number;
  onlyLegacy: number;
  onlyNext: number;
  /** |Δ| over points both hit: max, mean, and how many exceed 1 cm. */
  max?: number;
  mean?: number;
  over1cm: number;
}

interface Row {
  view: string;
  status: string;
  sampleHeight?: Comparison;
  getHeight?: Comparison;
  /**
   * `Engine.sampleHeightMostDetailed` against 1.x
   * `Scene.sampleHeightMostDetailed` (content loaded down to the leaves
   * under each point, whatever the view shows).
   */
  mostDetailed?: Comparison;
}

function compare(
  legacy: Array<number | undefined>,
  next: Array<number | undefined>,
): Comparison {
  const deltas: number[] = [];
  let onlyLegacy = 0;
  let onlyNext = 0;
  legacy.forEach((a, i) => {
    const b = next[i];
    if (a !== undefined && b !== undefined) {
      deltas.push(Math.abs(a - b));
    } else if (a !== undefined) {
      onlyLegacy++;
    } else if (b !== undefined) {
      onlyNext++;
    }
  });
  return {
    both: deltas.length,
    onlyLegacy,
    onlyNext,
    max: deltas.length ? Math.max(...deltas) : undefined,
    mean: deltas.length
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : undefined,
    over1cm: deltas.filter((d) => d > 0.01).length,
  };
}

/** A 15×15 grid of points (radians) spanning a third of the range. */
function grid(cam: (typeof CAMERAS)[number]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const span = cam.range / 3 / 6378137;
  const lat = cam.at[1]! * deg;
  for (let j = -7; j <= 7; j++) {
    for (let i = -7; i <= 7; i++) {
      points.push([
        cam.at[0]! * deg + ((i / 7) * span) / Math.cos(lat),
        lat + (j / 7) * span,
      ]);
    }
  }
  return points;
}

async function settle(step: () => boolean, maxMs = 180000): Promise<void> {
  const deadline = performance.now() + maxMs;
  let stable = 0;
  while (stable < 5) {
    stable = step() ? stable + 1 : 0;
    if (performance.now() > deadline) {
      throw new Error("did not settle");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function createViewer(): Json {
  return new Cesium.Viewer($("legacy"), {
    baseLayer: false,
    globe: false,
    skyBox: false,
    skyAtmosphere: false,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    useDefaultRenderLoop: false,
    creditContainer: $("credits"),
  });
}

async function runHeights(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const token = import.meta.env.VITE_ION_TOKEN as string | undefined;
  if (!token) {
    throw new Error("needs VITE_ION_TOKEN in packages/next/.env.local");
  }
  Cesium.Ion.defaultAccessToken = token;
  const osm = await resolveIonAsset(OSM_ASSET, { accessToken: token });
  const viewer = createViewer();
  const engine = await Engine.create();
  const rows: Row[] = [];
  const only = params.get("only")?.toLowerCase();
  const keep = params.has("keep");
  for (const cam of CAMERAS) {
    if (only && !cam.label.toLowerCase().includes(only)) {
      continue;
    }
    status.textContent = `${cam.label}…`;
    try {
      const world = engine.createWorld({
        maxDraws: 1 << 14,
        vertexBytes: 256 << 20,
        indexBytes: 128 << 20,
      });
      const view = engine.addView({
        target: new OffscreenTarget(WIDTH, HEIGHT),
        world,
      });
      const tileset: Tileset3D = await engine.addTileset(world, osm.url, {
        headers: osm.headers,
        policy: "legacy1x",
        enableCollision: true,
      });
      const target = Ellipsoid.WGS84.cartographicToCartesian(
        fromDegrees(cam.at[0]!, cam.at[1]!, cam.at[2]!),
        new Float64Array(3),
      );
      view.camera.near = 1.0;
      view.camera.lookAt(target, cam.heading * deg, cam.pitch * deg, cam.range);
      const id = Math.log2(engine.viewBit(view));
      let previous = "";
      await settle(() => {
        engine.renderFrame();
        const now = (tileset.lastSelected.get(id) ?? [])
          .map((t) => t.contentUrl)
          .sort()
          .join("|");
        const same = tileset.idle && now === previous;
        previous = now;
        return same;
      });
      const points = grid(cam);
      const rays = points.map(([longitude, latitude]) => {
        const carto = { longitude, latitude, height: 0 };
        const up = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
          carto,
          new Float64Array(3),
        );
        return {
          origin: Ellipsoid.WGS84.cartographicToCartesian(
            { longitude, latitude, height: RAY_START },
            new Float64Array(3),
          ),
          direction: up.map((x) => -x),
          maxDistance: RAY_START + 12000,
        };
      });
      const hits = await world.castRays(rays, {
        collisionOnly: true,
        viewMask: engine.viewBit(view),
      });
      const next = hits.map((d) =>
        d === undefined ? undefined : RAY_START - d,
      );

      // 1.x: the same tileset and camera, settled.
      const scene = viewer.scene;
      scene.primitives.removeAll();
      const legacy = await Cesium.Cesium3DTileset.fromIonAssetId(OSM_ASSET, {
        enableCollision: true,
      });
      scene.primitives.add(legacy);
      const c = scene.camera;
      c.frustum.near = 1.0;
      c.setView({
        destination: new Cesium.Cartesian3(...view.camera.position),
        orientation: {
          direction: new Cesium.Cartesian3(...view.camera.direction),
          up: new Cesium.Cartesian3(...view.camera.up),
        },
      });
      let legacyPrevious = "";
      await settle(() => {
        viewer.render();
        const now = legacy._selectedTiles
          .map((t: Json) => t._contentResource?.url ?? "")
          .sort()
          .join("|");
        const same = legacy.tilesLoaded && now === legacyPrevious;
        legacyPrevious = now;
        return same;
      });
      const picked: Array<number | undefined> = points.map(([lon, lat]) =>
        legacy.getHeight(Cesium.Cartographic.fromRadians(lon, lat), scene),
      );
      const rendered: Array<number | undefined> = points.map(([lon, lat]) =>
        scene.sampleHeight(Cesium.Cartographic.fromRadians(lon, lat)),
      );

      // Most detailed: both engines load what the points need; their
      // frame loops run meanwhile (both use manual rendering here).
      const pump = setInterval(() => {
        engine.renderFrame();
        viewer.render();
      }, 16);
      let mostNext: Array<number | undefined>;
      let mostLegacy: Array<number | undefined>;
      try {
        mostNext = await engine.sampleHeightMostDetailed(
          world,
          points.map(([longitude, latitude]) => ({ longitude, latitude })),
          { tilesets: [tileset] },
        );
        const cartos = await scene.sampleHeightMostDetailed(
          points.map(([lon, lat]) => Cesium.Cartographic.fromRadians(lon, lat)),
        );
        mostLegacy = cartos.map((c: Json) => c?.height);
      } finally {
        clearInterval(pump);
      }

      // ?keep: leave both engines' state for inspection (debugging).
      if (keep) {
        Object.assign(globalThis, {
          parityHeights: {
            ...{ engine, world, view, tileset, legacy, viewer },
            ...{ points, picked, rendered, next, mostLegacy, mostNext },
          },
        });
      } else {
        engine.removeView(view);
        engine.removeTileset(tileset);
        engine.removeWorld(world);
      }

      rows.push({
        view: cam.label,
        status: "ok",
        sampleHeight: compare(rendered, next),
        getHeight: compare(picked, next),
        mostDetailed: compare(mostLegacy, mostNext),
      });
    } catch (error) {
      rows.push({
        view: cam.label,
        status: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    renderTable(rows);
  }
  if (!keep) {
    engine.destroy();
    viewer.destroy();
  }
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  const cells = (c?: Comparison) =>
    c
      ? `<td>${c.both}</td><td>${c.onlyLegacy}</td><td>${c.onlyNext}</td>` +
        `<td>${c.max === undefined ? "" : `${c.max.toFixed(4)} m`}</td>` +
        `<td>${c.mean === undefined ? "" : `${c.mean.toFixed(4)} m`}</td>` +
        `<td>${c.over1cm}</td>`
      : "<td></td>".repeat(6);
  const head =
    "<th>both hit</th><th>only 1.x</th><th>only 2.0</th><th>Δ max</th><th>Δ mean</th><th>Δ &gt; 1 cm</th>";
  $("results").innerHTML =
    `<tr><th></th><th></th><th colspan="6">vs 1.x Scene.sampleHeight (rendered)</th><th colspan="6">vs 1.x Cesium3DTileset.getHeight (CPU pick)</th><th colspan="6">most detailed vs 1.x sampleHeightMostDetailed</th></tr>` +
    `<tr><th>view</th><th>status</th>${head}${head}${head}</tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.view}</td><td>${r.status}</td>${cells(r.sampleHeight)}${cells(r.getHeight)}${cells(r.mostDetailed)}</tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element, options) {
    root = element;
    params = options;
    root.innerHTML = TEMPLATE;
    return { run: runHeights };
  },
};
