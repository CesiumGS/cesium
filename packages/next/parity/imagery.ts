import {
  BingImagery,
  Ellipsoid,
  Engine,
  fromDegrees,
  GlobeLegacy1xSelection,
  OffscreenTarget,
  resolveIonAsset,
  type Tileset3D,
} from "../src/index.ts";
import { flip } from "./flip.ts";
import { compareImages } from "./metrics.ts";
import { addRunButton } from "./runButton.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see imagery.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

/**
 * L2 globe imagery parity (plan §15): Cesium World Terrain with the ion
 * default imagery (Bing Maps Aerial), rendered by 1.x and by 2.0 for the
 * same cameras after loading settles. Terrain selection is identical in
 * both (globe `Legacy1x`, 100% L1), and fog and atmosphere are off in
 * both, so the difference is imagery: level choice, compositing,
 * filtering and color. 2.0 is allowed to look better; this records by how
 * much and where (docs/imagery-legacy1x-spec.md §7).
 */

const WIDTH = 640;
const HEIGHT = 360;
const deg = Math.PI / 180;

const CAMERAS = [
  {
    label: "Rainier oblique",
    at: [-121.76, 46.85, 2000],
    heading: 30,
    pitch: -25,
    range: 15000,
  },
  {
    label: "San Francisco top-down",
    at: [-122.42, 37.78, 0],
    heading: 0,
    pitch: -89,
    range: 6000,
  },
  {
    label: "Matterhorn",
    at: [7.66, 45.98, 3000],
    heading: 120,
    pitch: -20,
    range: 9000,
  },
  {
    label: "Alps regional",
    at: [9.0, 46.3, 1500],
    heading: 0,
    pitch: -55,
    range: 150000,
  },
  // The viewer's framing for ?at=-121.76,46.80,9000 (over the ellipsoid).
  {
    label: "Rainier viewer framing",
    at: [-121.76, 46.8, 0],
    heading: 35,
    pitch: -30,
    range: 9000,
  },
];

interface Row {
  view: string;
  status: string;
  flipMean?: number;
  flipP95?: number;
  meanDeltaE?: number;
  noticeable?: number;
}

async function settle(step: () => boolean, maxMs = 120000): Promise<void> {
  const deadline = performance.now() + maxMs;
  let stable = 0;
  while (stable < 8) {
    stable = step() ? stable + 1 : 0;
    if (performance.now() > deadline) {
      throw new Error("did not settle");
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

function capture(canvas: HTMLCanvasElement): ImageData {
  const copy = document.createElement("canvas");
  copy.width = WIDTH;
  copy.height = HEIGHT;
  const ctx = copy.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
  return ctx.getImageData(0, 0, WIDTH, HEIGHT);
}

function heatmap(errors: Float32Array): ImageData {
  const image = new ImageData(WIDTH, HEIGHT);
  errors.forEach((e, i) => {
    image.data[i * 4] = 255 * Math.min(1, e * 3);
    image.data[i * 4 + 1] = 255 * Math.min(1, Math.max(0, e * 3 - 1));
    image.data[i * 4 + 2] = 255 * Math.max(0, e * 3 - 2);
    image.data[i * 4 + 3] = 255;
  });
  return image;
}

async function createViewer(token: string, ellipsoid: boolean): Promise<Json> {
  Cesium.Ion.defaultAccessToken = token;
  const viewer = new Cesium.Viewer("legacy", {
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.IonImageryProvider.fromAssetId(2),
    ),
    ...(ellipsoid ? {} : { terrain: Cesium.Terrain.fromWorldTerrain() }),
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
    msaaSamples: 4,
    useDefaultRenderLoop: false,
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
    creditContainer: document.querySelector("#credits"),
  });
  const scene = viewer.scene;
  scene.fog.enabled = false;
  scene.globe.showGroundAtmosphere = false;
  scene.sun = undefined;
  scene.moon = undefined;
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.screenSpaceCameraController.enableCollisionDetection = false;
  // Wait for the terrain and imagery providers.
  await new Promise<void>((resolve) => {
    const check = () =>
      (ellipsoid || scene.globe.terrainProvider?.availability !== undefined) &&
      scene.imageryLayers.get(0)?.ready
        ? resolve()
        : setTimeout(check, 50);
    check();
  });
  return viewer;
}

async function runImagery(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const images = document.querySelector("#images")!;
  const token = import.meta.env.VITE_ION_TOKEN as string | undefined;
  if (!token) {
    throw new Error("needs VITE_ION_TOKEN in packages/next/.env.local");
  }
  const params = new URLSearchParams(location.search);
  const only = params.get("only")?.toLowerCase();
  const [terrain, imagery] = await Promise.all([
    resolveIonAsset(1, { accessToken: token }),
    BingImagery.fromIon(2, { accessToken: token }),
  ]);
  // ?ellipsoid: the globe without terrain in both engines.
  const ellipsoid = params.has("ellipsoid");
  const viewer = await createViewer(token, ellipsoid);
  const engine = await Engine.create();
  const rows: Row[] = [];

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
      const target = new OffscreenTarget(WIDTH, HEIGHT);
      const view = engine.addView({ target, world, clearColor: [0, 0, 0] });
      const tileset: Tileset3D = ellipsoid
        ? engine.addEllipsoid(world, { policy: "legacy1x", imagery })
        : await engine.addTerrain(world, terrain.url, {
            headers: terrain.headers,
            policy: "legacy1x",
            imagery,
          });
      if (tileset.selection instanceof GlobeLegacy1xSelection) {
        tileset.selection.fog = false;
      }
      const at = Ellipsoid.WGS84.cartographicToCartesian(
        fromDegrees(cam.at[0]!, cam.at[1]!, cam.at[2]!),
        new Float64Array(3),
      );
      view.camera.near = 1;
      view.camera.lookAt(at, cam.heading * deg, cam.pitch * deg, cam.range);
      const id = Math.log2(engine.viewBit(view));
      let previous = "";
      await settle(() => {
        engine.renderFrame();
        const now = (tileset.lastSelected.get(id) ?? []).length;
        const same =
          tileset.idle && !tileset.imagery?.busy && String(now) === previous;
        previous = String(now);
        return same;
      });
      engine.renderFrame();
      const next = new ImageData(await target.read(), WIDTH, HEIGHT);

      // 1.x, same camera.
      const c = viewer.scene.camera;
      c.frustum.near = 1;
      c.setView({
        destination: new Cesium.Cartesian3(...view.camera.position),
        orientation: {
          direction: new Cesium.Cartesian3(...view.camera.direction),
          up: new Cesium.Cartesian3(...view.camera.up),
        },
      });
      await settle(() => {
        viewer.render();
        return viewer.scene.globe.tilesLoaded;
      });
      viewer.render();
      const legacy = capture(viewer.scene.canvas);
      engine.removeView(view);
      engine.removeTileset(tileset);
      engine.removeWorld(world);

      const f = flip(legacy.data, next.data, WIDTH, HEIGHT);
      const m = compareImages(legacy.data, next.data, WIDTH, HEIGHT);
      rows.push({
        view: cam.label,
        status: "ok",
        flipMean: f.mean,
        flipP95: f.p95,
        meanDeltaE: m.meanDeltaE,
        noticeable: m.noticeable,
      });
      const figure = document.createElement("div");
      figure.className = "row";
      for (const [label, image] of [
        ["1.x", legacy],
        ["2.0", next],
        ["FLIP error", heatmap(f.errors)],
      ] as const) {
        const box = document.createElement("figure");
        const caption = document.createElement("figcaption");
        caption.textContent = `${cam.label}: ${label}`;
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.getContext("2d")!.putImageData(image, 0, 0);
        box.append(caption, canvas);
        figure.append(box);
      }
      images.append(figure);
    } catch (error) {
      rows.push({
        view: cam.label,
        status: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    renderTable(rows);
  }
  engine.destroy();
  viewer.destroy();
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  const pct = (v?: number) =>
    v === undefined ? "" : `${(v * 100).toFixed(1)}%`;
  const n = (v?: number) => (v === undefined ? "" : v.toFixed(3));
  document.querySelector("#results")!.innerHTML =
    `<tr><th>view</th><th>status</th><th>FLIP mean</th><th>FLIP p95</th><th>mean ΔE</th><th>ΔE > 2.3</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.view}</td><td>${r.status}</td><td>${n(r.flipMean)}</td><td>${n(r.flipP95)}</td>` +
          `<td>${n(r.meanDeltaE)}</td><td>${pct(r.noticeable)}</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runImagery });
addRunButton(runImagery);
