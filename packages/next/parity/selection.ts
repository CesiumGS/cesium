import {
  Tile,
  tileHeaderKey,
  Ellipsoid,
  Engine,
  fromDegrees,
  OffscreenTarget,
  resolveIonAsset,
  type Tileset3D,
  type View,
} from "../src/index.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see selection.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

/**
 * L1 selection parity (plan §4): the tiles `Legacy1x` selects in each of two
 * views, rendered at once over one shared tile cache, against the tiles 1.x
 * selects for the same cameras, after loading settles. Jaccard over content
 * URLs, ≥ 99% required.
 */

/** Large enough that neither engine raises its SSE for memory. */
const CACHE_BYTES = 4 * 1024 * 1024 * 1024;
const LEGACY_OPTIONS = { cacheBytes: CACHE_BYTES };

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

const TILESETS = [
  "Tilesets/Tileset/tileset.json",
  "Tilesets/TilesetOfTilesets/tileset.json",
  "Tilesets/TilesetRefinementMix/tileset.json",
  "Tilesets/TilesetReplacement1/tileset.json",
  "Tilesets/TilesetReplacement2/tileset.json",
  "Tilesets/TilesetReplacement3/tileset.json",
  "Tilesets/TilesetWithViewerRequestVolume/tileset.json",
  "Tilesets/TilesetWithTransforms/tileset.json",
  "Tilesets/TilesetUniform/tileset.json",
];

/** Three cameras relative to the root bounding sphere, rendered as three simultaneous views. */
const CAMERAS = [
  { label: "close oblique", heading: 30, pitch: -20, range: 0.7 },
  { label: "far top-down", heading: 200, pitch: -75, range: 2.5 },
  { label: "street level", heading: 120, pitch: -8, range: 0.2 },
  // The demo viewer's default framing (root content volume when present).
  {
    label: "viewer default",
    heading: 35,
    pitch: -30,
    range: 2.6,
    content: true,
  },
];

interface Row {
  tileset: string;
  view: string;
  status: string;
  legacy?: number;
  next?: number;
  jaccard?: number;
  onlyLegacy?: string;
  onlyNext?: string;
}

/**
 * A tile's identity: its header's bounding volume and geometric error as
 * written in the tileset JSON. Content URLs differ per session (Google's
 * carry session tokens) and 1.x sorts `children` in place by distance, so
 * neither URLs nor tree paths are stable keys.
 */
const key = (tile: Json): string =>
  tile instanceof Tile ? tile.headerKey : tileHeaderKey(tile._header);

function createViewer() {
  const viewer = new Cesium.Viewer("legacy", {
    globe: false,
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
  viewer.scene.fog.enabled = false;
  return viewer;
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

async function legacySelection(
  viewer: Json,
  source: { url: string; ionAsset?: number },
  camera: { position: Float64Array; direction: Float64Array; up: Float64Array },
): Promise<Set<string>> {
  const c = viewer.scene.camera;
  c.frustum.near = 1.0;
  c.setView({
    destination: new Cesium.Cartesian3(...camera.position),
    orientation: {
      direction: new Cesium.Cartesian3(...camera.direction),
      up: new Cesium.Cartesian3(...camera.up),
    },
  });
  const tileset =
    source.ionAsset !== undefined
      ? await Cesium.Cesium3DTileset.fromIonAssetId(
          source.ionAsset,
          LEGACY_OPTIONS,
        )
      : await Cesium.Cesium3DTileset.fromUrl(source.url, LEGACY_OPTIONS);
  viewer.scene.primitives.add(tileset);
  let previous = "";
  await settle(() => {
    viewer.render();
    const now = tileset._selectedTiles
      .map((t: Json) => key(t))
      .sort()
      .join("|");
    const same = tileset.tilesLoaded && now === previous;
    previous = now;
    return same;
  });
  const selected = new Set<string>(
    tileset._selectedTiles.map((t: Json) => key(t)),
  );
  viewer.scene.primitives.remove(tileset);
  return selected;
}

async function runSelection(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const rows: Row[] = [];
  const viewer = createViewer();
  const engine = await Engine.create();
  const params = new URLSearchParams(location.search);
  const sources: Array<{
    label: string;
    url: string;
    headers?: Record<string, string>;
    ionAsset?: number;
  }> = TILESETS.map((path) => ({
    label: path.split("/")[1]!,
    url: new URL(`/specs-data/Cesium3DTiles/${path}`, location.href).href,
  }));
  const asset = params.get("asset");
  if (asset) {
    const token = import.meta.env.VITE_ION_TOKEN as string;
    Cesium.Ion.defaultAccessToken = token;
    const resolved = await resolveIonAsset(Number(asset), {
      accessToken: token,
    });
    sources.length = 0;
    sources.push({
      label: "ion asset",
      url: resolved.url,
      headers: resolved.headers,
      ionAsset: Number(asset),
    });
  }

  for (const source of sources) {
    status.textContent = `${source.label}…`;
    try {
      const world = engine.createWorld({
        maxDraws: 1 << 15,
        vertexBytes: 256 << 20,
        indexBytes: 128 << 20,
      });
      const views: View[] = CAMERAS.map(() =>
        engine.addView({ target: new OffscreenTarget(WIDTH, HEIGHT), world }),
      );
      const tileset: Tileset3D = await engine.addTileset(world, source.url, {
        ...(source.headers ? { headers: source.headers } : {}),
        // Memory pressure is out of scope here: 2.0 serves several views from
        // one cache while 1.x gets a tileset per camera.
        cacheBytes: CACHE_BYTES,
        policy: "legacy1x",
      });
      const at = params.get("at")?.split(",").map(Number);
      if (at) {
        // Planet-scale tilesets (OSM Buildings): cameras around a location.
        const target = Ellipsoid.WGS84.cartographicToCartesian(
          fromDegrees(at[0]!, at[1]!, 0),
          new Float64Array(3),
        );
        const absolute = [
          { heading: 30, pitch: -30, range: 600 },
          { heading: 200, pitch: -80, range: 2500 },
          { heading: 120, pitch: -6, range: 120 },
          { heading: 35, pitch: -30, range: 1500 },
        ];
        CAMERAS.forEach((_, i) => {
          const cam = absolute[i]!;
          const camera = views[i]!.camera;
          camera.near = 1.0;
          camera.lookAt(target, cam.heading * deg, cam.pitch * deg, cam.range);
        });
      }
      CAMERAS.forEach((cam, i) => {
        if (at) {
          return;
        }
        const volume =
          ("content" in cam && tileset.root.contentVolume) ||
          tileset.root.volume;
        const center =
          volume.kind === "box" ? volume.obb.center : volume.sphere.center;
        const camera = views[i]!.camera;
        camera.near = 1.0;
        camera.lookAt(
          center,
          cam.heading * deg,
          cam.pitch * deg,
          volume.sphere.radius * cam.range,
        );
      });
      let previous = "";
      await settle(() => {
        engine.renderFrame();
        const now = views
          .map((v) =>
            (tileset.lastSelected.get(viewId(engine, v)) ?? [])
              .map((t) => key(t))
              .sort()
              .join("|"),
          )
          .join("#");
        const same = tileset.idle && now === previous;
        previous = now;
        return same;
      });
      for (let i = 0; i < CAMERAS.length; i++) {
        const next = new Set(
          (tileset.lastSelected.get(viewId(engine, views[i]!)) ?? []).map((t) =>
            key(t),
          ),
        );
        const camera = views[i]!.camera;
        const legacy = await legacySelection(viewer, source, {
          position: camera.position,
          direction: camera.direction,
          up: camera.up,
        });
        const union = new Set([...legacy, ...next]);
        const both = [...legacy].filter((k) => next.has(k)).length;
        rows.push({
          tileset: source.label,
          view: CAMERAS[i]!.label,
          status: `ok (2.0 SSE ${tileset.stats.screenSpaceError.toFixed(1)})`,
          legacy: legacy.size,
          next: next.size,
          jaccard: union.size === 0 ? 1 : both / union.size,
          onlyLegacy: [...legacy]
            .filter((k) => !next.has(k))
            .slice(0, 6)
            .join(" "),
          onlyNext: [...next]
            .filter((k) => !legacy.has(k))
            .slice(0, 6)
            .join(" "),
        });
      }
      for (const view of views) {
        engine.removeView(view);
      }
      engine.removeTileset(tileset);
      engine.removeWorld(world);
    } catch (error) {
      rows.push({
        tileset: source.label,
        view: "",
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

function viewId(engine: Engine, view: View): number {
  return Math.log2(engine.viewBit(view));
}

function renderTable(rows: Row[]): void {
  document.querySelector("#results")!.innerHTML =
    `<tr><th>tileset</th><th>view</th><th>status</th><th>1.x</th><th>2.0</th><th>Jaccard</th><th>only 1.x</th><th>only 2.0</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.tileset}</td><td>${r.view}</td><td>${r.status}</td><td>${r.legacy ?? ""}</td>` +
          `<td>${r.next ?? ""}</td><td>${r.jaccard === undefined ? "" : `${(r.jaccard * 100).toFixed(1)}%`}</td>` +
          `<td>${r.onlyLegacy ?? ""}</td><td>${r.onlyNext ?? ""}</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runSelection });
