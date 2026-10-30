import {
  Ellipsoid,
  Engine,
  fromDegrees,
  GlobeLegacy1xSelection,
  OffscreenTarget,
  resolveIonAsset,
  type Tile,
  type Tileset3D,
} from "../src/index.ts";
import { addRunButton } from "./runButton.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see globe.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

/**
 * L1 globe selection parity (plan §15): the terrain tiles the globe
 * `Legacy1x` selection renders against those 1.x's globe renders
 * (`globe._surface._tilesToRender`) for the same camera, after loading
 * settles. Each camera starts from fresh tile state in both engines, since
 * cached tiles keep tighter bounds (docs/globe-legacy1x-spec.md §7).
 */

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;
/** Cesium World Terrain. */
const TERRAIN_ASSET = 1;

/** Cameras looking at a point (degrees, meters) from heading/pitch/range. */
const CAMERAS = [
  {
    label: "Rainier oblique",
    at: [-121.76, 46.85, 2000],
    heading: 30,
    pitch: -20,
    range: 15000,
  },
  {
    label: "Grand Canyon top-down",
    at: [-112.11, 36.1, 1500],
    heading: 0,
    pitch: -89,
    range: 20000,
  },
  {
    label: "Matterhorn near horizon",
    at: [7.66, 45.98, 3000],
    heading: 120,
    pitch: -5,
    range: 8000,
  },
  {
    label: "Everest regional",
    at: [86.92, 27.99, 5000],
    heading: 200,
    pitch: -35,
    range: 60000,
  },
  {
    label: "Front Range 300 km",
    at: [-105.0, 39.7, 1600],
    heading: 0,
    pitch: -60,
    range: 300000,
  },
  {
    label: "San Francisco coast",
    at: [-122.45, 37.77, 0],
    heading: 300,
    pitch: -15,
    range: 20000,
  },
];

interface Row {
  view: string;
  status: string;
  legacy?: number;
  next?: number;
  jaccard?: number;
  /** Time to settle, ms. */
  legacyMs?: number;
  nextMs?: number;
  onlyLegacy?: string;
  onlyNext?: string;
}

/** level/x/y with TMS rows (from the south), as 2.0 addresses tiles. */
function legacyKey(tile: Json): string {
  // Upsampled tiles (quadrants without data) count as their parent.
  while (tile.data?.terrainData?.wasCreatedByUpsampling?.() && tile.parent) {
    tile = tile.parent;
  }
  const rows = 1 << tile.level;
  return `${tile.level}/${tile.x}/${rows - 1 - tile.y}`;
}

function nextKey(tile: Tile): string {
  const g = tile.globe!;
  return `${g.level}/${g.x}/${g.y}`;
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
  const viewer = new Cesium.Viewer("legacy", {
    baseLayer: false,
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
    creditContainer: document.querySelector("#credits"),
  });
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
  return viewer;
}

async function legacySelection(
  viewer: Json,
  provider: Json,
  fog: boolean,
  camera: { position: Float64Array; direction: Float64Array; up: Float64Array },
): Promise<Set<string>> {
  const scene = viewer.scene;
  // Fresh tile state: a new globe, without imagery.
  const globe = new Cesium.Globe(Cesium.Ellipsoid.WGS84);
  globe.terrainProvider = provider;
  globe.showGroundAtmosphere = false;
  scene.globe = globe;
  scene.fog.enabled = fog;
  const c = scene.camera;
  c.frustum.near = 1.0;
  c.setView({
    destination: new Cesium.Cartesian3(...camera.position),
    orientation: {
      direction: new Cesium.Cartesian3(...camera.direction),
      up: new Cesium.Cartesian3(...camera.up),
    },
  });
  const selected = () =>
    new Set<string>(globe._surface._tilesToRender.map(legacyKey));
  let previous = "";
  await settle(() => {
    viewer.render();
    const now = [...selected()].sort().join("|");
    const same = globe.tilesLoaded && now === previous;
    previous = now;
    return same;
  });
  return selected();
}

async function runGlobe(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const params = new URLSearchParams(location.search);
  const fog = params.get("fog") !== "0";
  const token = import.meta.env.VITE_ION_TOKEN as string | undefined;
  if (!token) {
    throw new Error("needs VITE_ION_TOKEN in packages/next/.env.local");
  }
  Cesium.Ion.defaultAccessToken = token;
  const terrain = await resolveIonAsset(TERRAIN_ASSET, { accessToken: token });
  const provider =
    await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET);
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
      const tileset: Tileset3D = await engine.addTerrain(world, terrain.url, {
        headers: terrain.headers,
        policy: "legacy1x",
        cacheBytes: 4 * 1024 * 1024 * 1024,
      });
      if (tileset.selection instanceof GlobeLegacy1xSelection) {
        tileset.selection.fog = fog;
      }
      const target = Ellipsoid.WGS84.cartographicToCartesian(
        fromDegrees(cam.at[0]!, cam.at[1]!, cam.at[2]!),
        new Float64Array(3),
      );
      view.camera.near = 1.0;
      view.camera.lookAt(target, cam.heading * deg, cam.pitch * deg, cam.range);
      const id = Math.log2(engine.viewBit(view));
      // Parents drawn clipped to quadrants without data are marked "*".
      const selected = () =>
        new Set(
          (tileset.lastSelected.get(id) ?? []).map(
            (t) => nextKey(t) + (t.placeholderMask !== 0 ? "*" : ""),
          ),
        );
      let previous = "";
      const nextStart = performance.now();
      await settle(() => {
        engine.renderFrame();
        const now = [...selected()].sort().join("|");
        const same = tileset.idle && now === previous;
        previous = now;
        return same;
      });
      const nextMs = performance.now() - nextStart;
      const marked = selected();
      const next = new Set([...marked].map((k) => k.replace("*", "")));
      // ?keep: leave both engines' state for inspection (debugging).
      if (keep) {
        Object.assign(globalThis, { parityGlobe: { engine, view, tileset } });
      } else {
        engine.removeView(view);
        engine.removeTileset(tileset);
        engine.removeWorld(world);
      }

      const legacyStart = performance.now();
      const legacy = await legacySelection(viewer, provider, fog, {
        position: view.camera.position,
        direction: view.camera.direction,
        up: view.camera.up,
      });
      const legacyMs = performance.now() - legacyStart;
      const union = new Set([...legacy, ...next]);
      const both = [...legacy].filter((k) => next.has(k)).length;
      rows.push({
        view: cam.label,
        status: fog ? "ok (fog)" : "ok (no fog)",
        legacy: legacy.size,
        next: next.size,
        jaccard: union.size === 0 ? 1 : both / union.size,
        legacyMs,
        nextMs,
        onlyLegacy: [...legacy]
          .filter((k) => !next.has(k))
          .slice(0, 8)
          .join(" "),
        onlyNext: [...marked]
          .filter((k) => !legacy.has(k.replace("*", "")))
          .slice(0, 8)
          .join(" "),
      });
    } catch (error) {
      rows.push({
        view: cam.label,
        status: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    renderTable(rows);
  }
  if (keep) {
    Object.assign(globalThis, { parityViewer: viewer });
  } else {
    engine.destroy();
    viewer.destroy();
  }
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  document.querySelector("#results")!.innerHTML =
    `<tr><th>view</th><th>status</th><th>1.x</th><th>2.0</th><th>Jaccard</th><th>1.x settle</th><th>2.0 settle</th><th>only 1.x</th><th>only 2.0</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.view}</td><td>${r.status}</td><td>${r.legacy ?? ""}</td>` +
          `<td>${r.next ?? ""}</td><td>${r.jaccard === undefined ? "" : `${(r.jaccard * 100).toFixed(1)}%`}</td>` +
          `<td>${r.legacyMs === undefined ? "" : `${(r.legacyMs / 1000).toFixed(1)} s`}</td>` +
          `<td>${r.nextMs === undefined ? "" : `${(r.nextMs / 1000).toFixed(1)} s`}</td>` +
          `<td class="text">${r.onlyLegacy ?? ""}</td><td class="text">${r.onlyNext ?? ""}</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runGlobe });
addRunButton(runGlobe);
