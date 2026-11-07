import {
  Ellipsoid,
  Engine,
  fromDegrees,
  GlobeStepwiseSelection,
  OffscreenTarget,
  resolveIonAsset,
  type Tile,
  type Tileset3D,
  UNITLESS_EXPOSURE,
  UNITLESS_SKY,
  UNITLESS_SUN_ILLUMINANCE,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { requireToken } from "../bench/suite/ionToken.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see globe.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

const TEMPLATE = `
<h1>Globe selection parity (L1): 1.x globe vs 2.0 Stepwise terrain</h1>
<p>
  Cesium World Terrain tiles each engine renders after loading settles, one
  camera at a time with fresh tile state, no imagery, and fog as 1.x
  defaults (<code>?fog=0</code> turns it off in both). Tiles are compared by
  level/x/y (TMS rows); 1.x tiles upsampled for quadrants without data count
  as their parent, which 2.0 draws clipped to them. Jaccard; the bar is 99%.
</p>
<div class="status">Run to compare both engines' terrain tiles.</div>
<table data-id="results"></table>
<div class="offscreen" data-id="legacy"></div>
<div data-id="credits" hidden></div>`;

/** Where the page is mounted, and its options (harness `mount`). */
let root: HTMLElement;
let params = new URLSearchParams();
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/**
 * L1 globe selection parity (plan §15): the terrain tiles the globe
 * `Stepwise` selection renders against those 1.x's globe renders
 * (`globe._surface._tilesToRender`) for the same camera, after loading
 * settles. Each camera starts from fresh tile state in both engines, since
 * cached tiles keep tighter bounds (docs/globe-1x-spec.md §7).
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
  /** Height queries over a grid around the target: max and mean |Δ|, m. */
  heightMax?: number;
  heightMean?: number;
  heightCount?: number;
  /**
   * Drawn-surface heights (what clamping stands on) vs 1.x
   * `Globe.getHeight` on the same selected tiles: max and mean |Δ|, m.
   */
  surfaceMax?: number;
  surfaceMean?: number;
  surfaceCount?: number;
}

/** Level of the finest loaded terrain tile at a point (TMS levels). */
function finestLevel(
  tileset: Tileset3D,
  longitude: number,
  latitude: number,
): number | undefined {
  const contains = (t: Tile) => {
    const r = t.globe!.rectangle;
    return (
      longitude >= r.west &&
      longitude <= r.east &&
      latitude >= r.south &&
      latitude <= r.north
    );
  };
  let tile = tileset.root.children.find(contains);
  let level: number | undefined;
  while (tile) {
    if (tile.globe!.heights) {
      level = tile.globe!.level;
    }
    tile = tile.children.find((t) => !t.fillFromParent && contains(t));
  }
  return level;
}

/**
 * A 9×9 grid of points (radians) around a camera target, spanning a third
 * of the range: where the camera sees detailed tiles.
 */
function heightGrid(cam: (typeof CAMERAS)[number]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const span = cam.range / 3 / 6378137;
  const lat = cam.at[1]! * deg;
  for (let j = -4; j <= 4; j++) {
    for (let i = -4; i <= 4; i++) {
      points.push([
        cam.at[0]! * deg + ((i / 4) * span) / Math.cos(lat),
        lat + (j / 4) * span,
      ]);
    }
  }
  return points;
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
  const viewer = new Cesium.Viewer($("legacy"), {
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
    creditContainer: $("credits"),
  });
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
  return viewer;
}

async function legacySelection(
  viewer: Json,
  provider: Json,
  fog: boolean,
  camera: { position: Float64Array; direction: Float64Array; up: Float64Array },
  points: Array<[number, number]>,
): Promise<{
  selected: Set<string>;
  heights: Array<number | undefined>;
  surface: Array<number | undefined>;
}> {
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
  // Heights come from sampleTerrain (below): 1.x frees a tile's quantized
  // buffers once its mesh exists, and its interpolateHeight then compares
  // texture coordinates in 0..1 with u, v scaled to 0..32767, so loaded
  // globe tiles can't be sampled (a 1.x bug, plan §14).
  const heights: Array<number | undefined> = points.map(() => undefined);
  // The drawn surface: 1.x clamps models and billboards to it.
  const surface = points.map(([lon, lat]) =>
    globe.getHeight(Cesium.Cartographic.fromRadians(lon, lat)),
  );
  return { selected: selected(), heights, surface };
}

async function runGlobe(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const fog = params.get("fog") !== "0";
  const token = requireToken("The globe check");
  Cesium.Ion.defaultAccessToken = token;
  const terrain = await resolveIonAsset(TERRAIN_ASSET, { accessToken: token });
  const provider =
    await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET);
  const viewer = createViewer();
  const engine = await Engine.create();
  // 1.x's lighting has no units: compare in the same terms.
  engine.environment.setSky(UNITLESS_SKY);
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
        exposure: UNITLESS_EXPOSURE,
        background: "color",
        lighting: {
          sunIlluminance: UNITLESS_SUN_ILLUMINANCE,
          environment: "procedural",
        },
      });
      const tileset: Tileset3D = await engine.addTerrain(world, terrain.url, {
        headers: terrain.headers,
        policy: "stepwise",
        cacheBytes: 4 * 1024 * 1024 * 1024,
      });
      if (tileset.selection instanceof GlobeStepwiseSelection) {
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
      const points = heightGrid(cam);
      const nextHeights = points.map(([lon, lat]) =>
        tileset.sampleHeight(lon, lat),
      );
      const nextSurface = points.map(([lon, lat]) =>
        tileset.surfaceHeight(lon, lat),
      );
      // The level each height came from: 1.x samples the same level.
      const levels = points.map(([lon, lat]) => finestLevel(tileset, lon, lat));
      // ?keep: leave both engines' state for inspection (debugging).
      if (keep) {
        Object.assign(globalThis, { parityGlobe: { engine, view, tileset } });
      } else {
        engine.removeView(view);
        engine.removeTileset(tileset);
        engine.removeWorld(world);
      }

      const legacyStart = performance.now();
      const {
        selected: legacy,
        heights: legacyHeights,
        surface: legacySurface,
      } = await legacySelection(
        viewer,
        provider,
        fog,
        {
          position: view.camera.position,
          direction: view.camera.direction,
          up: view.camera.up,
        },
        points,
      );
      // 1.x sampleTerrain at the same levels (fresh terrain data, which
      // interpolates as 2.0 does).
      for (const level of new Set(levels)) {
        if (level === undefined) {
          continue;
        }
        const indices = levels.flatMap((l, i) => (l === level ? [i] : []));
        const cartos = indices.map((i) =>
          Cesium.Cartographic.fromRadians(points[i]![0], points[i]![1]),
        );
        await Cesium.sampleTerrain(provider, level, cartos);
        indices.forEach((i, k) => {
          legacyHeights[i] = cartos[k].height;
        });
      }
      const deltas = points.flatMap((_, i) => {
        const a = legacyHeights[i];
        const b = nextHeights[i];
        return a === undefined || b === undefined ? [] : [Math.abs(a - b)];
      });
      const surfaceDeltas = points.flatMap((_, i) => {
        const a = legacySurface[i];
        const b = nextSurface[i];
        return a === undefined || b === undefined ? [] : [Math.abs(a - b)];
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
        heightMax: deltas.length ? Math.max(...deltas) : undefined,
        heightMean: deltas.length
          ? deltas.reduce((a, b) => a + b, 0) / deltas.length
          : undefined,
        heightCount: deltas.length,
        surfaceMax: surfaceDeltas.length
          ? Math.max(...surfaceDeltas)
          : undefined,
        surfaceMean: surfaceDeltas.length
          ? surfaceDeltas.reduce((a, b) => a + b, 0) / surfaceDeltas.length
          : undefined,
        surfaceCount: surfaceDeltas.length,
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
  $("results").innerHTML =
    `<tr><th>view</th><th>status</th><th>1.x</th><th>2.0</th><th>Jaccard</th><th>1.x settle</th><th>2.0 settle</th><th>height Δ max / mean (points)</th><th>surface Δ max / mean (points)</th><th>only 1.x</th><th>only 2.0</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.view}</td><td>${r.status}</td><td>${r.legacy ?? ""}</td>` +
          `<td>${r.next ?? ""}</td><td>${r.jaccard === undefined ? "" : `${(r.jaccard * 100).toFixed(1)}%`}</td>` +
          `<td>${r.legacyMs === undefined ? "" : `${(r.legacyMs / 1000).toFixed(1)} s`}</td>` +
          `<td>${r.nextMs === undefined ? "" : `${(r.nextMs / 1000).toFixed(1)} s`}</td>` +
          `<td>${r.heightMax === undefined ? "" : `${r.heightMax.toFixed(3)} / ${r.heightMean!.toFixed(3)} m (${r.heightCount})`}</td>` +
          `<td>${r.surfaceMax === undefined ? "" : `${r.surfaceMax.toFixed(3)} / ${r.surfaceMean!.toFixed(3)} m (${r.surfaceCount})`}</td>` +
          `<td class="text">${r.onlyLegacy ?? ""}</td><td class="text">${r.onlyNext ?? ""}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element, options) {
    root = element;
    params = options;
    root.innerHTML = TEMPLATE;
    return { run: runGlobe };
  },
};
