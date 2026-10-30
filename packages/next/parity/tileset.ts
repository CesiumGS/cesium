import {
  Camera,
  Engine,
  OffscreenTarget,
  eastNorthUpToFixedFrame,
  Ellipsoid,
  mat4,
  collectFullDetailContents,
  resolveIonAsset,
  vec3,
  type TileContent,
  type GltfAsset,
} from "../src/index.ts";
import { flip } from "./flip.ts";
import { addRunButton } from "./runButton.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see tileset.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

interface Source {
  label: string;
  url: string;
  headers?: Record<string, string>;
  /** ion asset id, for loading the same asset in 1.x. */
  ionAsset?: number;
}

/** Public tilesets from Specs/Data. */
const PUBLIC: Source[] = [
  {
    label: "BatchedWithBatchTable (b3dm, RTC_CENTER, JSON batch table)",
    url: "/specs-data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json",
  },
  {
    label: "BatchedWithBatchTableBinary (b3dm, binary batch table)",
    url: "/specs-data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json",
  },
  {
    label: "BatchedWithTransformBox (tile transform)",
    url: "/specs-data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json",
  },
];

const MODES = ["unlit", "direct"] as const;
type Mode = (typeof MODES)[number];

/** Pick test grid, as fractions of the view. */
const PICK_GRID: Array<[number, number]> = [];
for (let j = 1; j <= 5; j++) {
  for (let i = 1; i <= 7; i++) {
    PICK_GRID.push([i / 8, j / 6]);
  }
}

interface Row {
  mode: Mode;
  source: string;
  status: string;
  contents?: number;
  draws?: number;
  batches?: number;
  flipSrgb?: number;
  flipGamma?: number;
  flipGammaP95?: number;
  picks?: string;
  /** Feature property names of the first content's feature table. */
  properties?: string;
  warnings?: string;
}

interface RowImages {
  legacy: ImageData;
  next: ImageData;
  heat: ImageData;
}

function unionSpheres(
  spheres: Array<{ center: Float64Array; radius: number }>,
): { center: Float64Array; radius: number } {
  const center = vec3.vec3();
  for (const s of spheres) {
    vec3.add(center, center, s.center);
  }
  vec3.scale(center, center, 1 / spheres.length);
  let radius = 0;
  for (const s of spheres) {
    radius = Math.max(radius, vec3.distance(center, s.center) + s.radius);
  }
  return { center, radius };
}

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
    msaaSamples: 4,
    useDefaultRenderLoop: false,
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
    creditContainer: document.querySelector("#credits"),
  });
  const s = viewer.scene;
  s.highDynamicRange = true;
  s.fog.enabled = false;
  s.sun = undefined;
  s.moon = undefined;
  s.backgroundColor = Cesium.Color.BLACK;
  return viewer;
}

function capture(canvas: HTMLCanvasElement): ImageData {
  const copy = document.createElement("canvas");
  copy.width = WIDTH;
  copy.height = HEIGHT;
  const ctx = copy.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
  return ctx.getImageData(0, 0, WIDTH, HEIGHT);
}

function flipHeatmap(errors: Float32Array): ImageData {
  const image = new ImageData(WIDTH, HEIGHT);
  errors.forEach((e, i) => {
    image.data[i * 4] = 255 * Math.min(1, e * 3);
    image.data[i * 4 + 1] = 255 * Math.min(1, Math.max(0, e * 3 - 1));
    image.data[i * 4 + 2] = 255 * Math.max(0, e * 3 - 2);
    image.data[i * 4 + 3] = 255;
  });
  return image;
}

async function renderLegacy(
  viewer: Json,
  source: Source,
  camera: Camera,
  mode: Mode,
  sun: Float64Array,
  pickProperty: string,
): Promise<{ image: ImageData; picks: unknown[] }> {
  viewer.scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(-sun[0]!, -sun[1]!, -sun[2]!),
    intensity: 2.0,
  });
  const options = {
    maximumScreenSpaceError: 0, // full detail everywhere in view
    customShader:
      mode === "unlit"
        ? new Cesium.CustomShader({ lightingModel: Cesium.LightingModel.UNLIT })
        : undefined,
    imageBasedLighting: new Cesium.ImageBasedLighting({
      imageBasedLightingFactor: new Cesium.Cartesian2(0, 0),
    }),
  };
  const c = viewer.scene.camera;
  c.frustum.fov = camera.fov;
  c.frustum.near = camera.near;
  c.setView({
    destination: new Cesium.Cartesian3(...camera.position),
    orientation: {
      direction: new Cesium.Cartesian3(...camera.direction),
      up: new Cesium.Cartesian3(...camera.up),
    },
  });
  const tileset =
    source.ionAsset !== undefined
      ? await Cesium.Cesium3DTileset.fromIonAssetId(source.ionAsset, options)
      : await Cesium.Cesium3DTileset.fromUrl(source.url, options);
  viewer.scene.primitives.add(tileset);
  const deadline = performance.now() + 120000;
  let frames = 0;
  while (!tileset.tilesLoaded || frames < 3) {
    viewer.render();
    frames++;
    if (performance.now() > deadline) {
      throw new Error("1.x tileset did not finish loading");
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  for (let i = 0; i < 3; i++) {
    viewer.render();
  }
  const image = capture(viewer.scene.canvas);
  const picks: unknown[] = [];
  const canvas = viewer.scene.canvas as HTMLCanvasElement;
  for (const [fx, fy] of PICK_GRID) {
    // 1×1: 1.x defaults to a 3×3 search window; 2.0 reads one pixel.
    const picked = viewer.scene.pick(
      new Cesium.Cartesian2(fx * canvas.clientWidth, fy * canvas.clientHeight),
      1,
      1,
    );
    picks.push(
      picked instanceof Cesium.Cesium3DTileFeature
        ? picked.getProperty(pickProperty)
        : undefined,
    );
  }
  viewer.scene.primitives.remove(tileset);
  return { image, picks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x objects
type Json = any;

let lastImages: RowImages[] = [];

async function sources(): Promise<Source[]> {
  const params = new URLSearchParams(location.search);
  const asset = params.get("asset");
  if (!asset) {
    return PUBLIC;
  }
  const token = import.meta.env.VITE_ION_TOKEN as string | undefined;
  if (!token) {
    throw new Error("?asset needs VITE_ION_TOKEN in packages/next/.env.local");
  }
  Cesium.Ion.defaultAccessToken = token;
  const resolved = await resolveIonAsset(Number(asset), { accessToken: token });
  return [
    {
      label: "ion asset",
      url: resolved.url,
      headers: resolved.headers,
      ionAsset: Number(asset),
    },
  ];
}

async function runTileset(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const params = new URLSearchParams(location.search);
  const pickProperty = params.get("pick") ?? "id";
  const viewer = createViewer();
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const rows: Row[] = [];
  lastImages = [];

  for (const source of await sources()) {
    const warnings = new Set<string>();
    const contents: TileContent[] = [];
    try {
      status.textContent = `${source.label}: reading tileset…`;
      await collectFullDetailContents(
        new URL(source.url, location.href).href,
        source.headers,
        mat4.mat4(),
        contents,
        warnings,
      );
    } catch (error) {
      rows.push({
        mode: "unlit",
        source: source.label,
        status: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    for (const mode of MODES) {
      status.textContent = `${mode}: ${source.label} (${contents.length} contents)…`;
      try {
        const images: Partial<Record<"srgb" | "gamma2.2", ImageData>> = {};
        const camera = new Camera();
        const sun = vec3.vec3();
        let draws = 0;
        let batches = 0;
        let properties = "";
        let nextPicks: unknown[] = [];
        for (const colorTransfer of ["srgb", "gamma2.2"] as const) {
          const assets: GltfAsset[] = await Promise.all(
            contents.map((c) =>
              engine.loadGltf(
                c.url,
                source.headers ? { headers: source.headers } : {},
              ),
            ),
          );
          const world = engine.createWorld({
            maxDraws: 1 << 16,
            maxMaterials: 1 << 14,
            vertexBytes: 256 << 20,
            indexBytes: 128 << 20,
          });
          const spheres = assets.map((asset, i) => {
            asset.warnings.forEach((w) => warnings.add(w));
            return engine.addModel(world, asset, {
              modelMatrix: contents[i]!.transform,
              unlit: mode === "unlit",
              colorTransfer,
              axes: "3d-tiles",
            });
          });
          draws = spheres.reduce((n, s) => n + s.draws.length, 0);
          const table = assets.find((a) => a.featureTables.length > 0)
            ?.featureTables[0];
          properties = table ? Object.keys(table.columns).join(", ") : "";
          if (colorTransfer === "srgb") {
            const bounds = unionSpheres(
              spheres.filter((s) => s.draws.length > 0),
            );
            camera.near = Math.max(0.01, bounds.radius * 0.01);
            // ?zoom=k moves k× closer than the whole-tileset framing.
            const zoom = Number(params.get("zoom") ?? 1);
            camera.lookAt(
              bounds.center,
              35 * deg,
              -30 * deg,
              (bounds.radius * 2.6) / zoom,
            );
            // Sun at azimuth 150°, elevation 40° over the tileset.
            const enu = eastNorthUpToFixedFrame(
              bounds.center,
              Ellipsoid.WGS84,
              mat4.mat4(),
            );
            const [e, n, u] = [
              Math.cos(40 * deg) * Math.sin(150 * deg),
              Math.cos(40 * deg) * Math.cos(150 * deg),
              Math.sin(40 * deg),
            ];
            vec3.normalize(
              sun,
              vec3.vec3(
                enu[0]! * e + enu[4]! * n + enu[8]! * u,
                enu[1]! * e + enu[5]! * n + enu[9]! * u,
                enu[2]! * e + enu[6]! * n + enu[10]! * u,
              ),
            );
            vec3.copy(engine.sunDirection, sun);
          }
          const view = engine.addView({
            target,
            world,
            camera,
            clearColor: [0, 0, 0],
            outputEncoding: colorTransfer === "srgb" ? "srgb" : "gamma2.2",
            lighting: { sunIntensity: 2, diffuseIbl: 0, specularIbl: 0 },
          });
          engine.renderFrame();
          batches = world.batchCount;
          images[colorTransfer] = new ImageData(
            await target.read(),
            WIDTH,
            HEIGHT,
          );
          if (colorTransfer === "srgb") {
            nextPicks = [];
            for (const [fx, fy] of PICK_GRID) {
              const pick = view.pick(fx * WIDTH, fy * HEIGHT);
              engine.renderFrame(); // the pick rides along with a frame
              nextPicks.push((await pick)?.properties?.[pickProperty]);
            }
          }
          engine.removeView(view);
          engine.worlds.splice(engine.worlds.indexOf(world), 1);
          world.destroy();
        }
        const legacy = await renderLegacy(
          viewer,
          source,
          camera,
          mode,
          sun,
          pickProperty,
        );
        const srgb = flip(legacy.image.data, images.srgb!.data, WIDTH, HEIGHT);
        const gamma = flip(
          legacy.image.data,
          images["gamma2.2"]!.data,
          WIDTH,
          HEIGHT,
        );
        const hits = legacy.picks.filter((v) => v !== undefined).length;
        // By string: 1.x returns 64-bit integers (iTwin element IDs) as BigInt.
        const same = (i: number) =>
          String(nextPicks[i]) === String(legacy.picks[i]);
        const agree = nextPicks.filter((_, i) => same(i)).length;
        const mismatches = PICK_GRID.flatMap(([fx, fy], i) =>
          same(i)
            ? []
            : [
                `(${fx.toFixed(2)},${fy.toFixed(2)}): 2.0 ${String(nextPicks[i])}, 1.x ${String(legacy.picks[i])}`,
              ],
        );
        rows.push({
          mode,
          source: source.label,
          status: "ok",
          contents: contents.length,
          draws,
          batches,
          flipSrgb: srgb.mean,
          flipGamma: gamma.mean,
          flipGammaP95: gamma.p95,
          picks: `${agree}/${PICK_GRID.length} agree on "${pickProperty}" (${hits} features hit)${
            mismatches.length ? `; ${mismatches.slice(0, 4).join("; ")}` : ""
          }`,
          properties,
          warnings: [...warnings].join("; "),
        });
        lastImages.push({
          legacy: legacy.image,
          next: images["gamma2.2"]!,
          heat: flipHeatmap(gamma.errors),
        });
      } catch (error) {
        rows.push({
          mode,
          source: source.label,
          status: `error: ${error instanceof Error ? error.message : String(error)}`,
        });
        lastImages.push({
          legacy: new ImageData(WIDTH, HEIGHT),
          next: new ImageData(WIDTH, HEIGHT),
          heat: new ImageData(WIDTH, HEIGHT),
        });
      }
      renderTable(rows);
    }
  }
  engine.destroy();
  viewer.destroy();
  status.textContent = "done";
  const first = lastImages.findIndex((_, i) => rows[i]?.status === "ok");
  if (first >= 0) {
    showImages(lastImages[first]!);
  }
  return rows;
}

function showImages(images: RowImages): void {
  for (const [id, image] of [
    ["old", images.legacy],
    ["next", images.next],
    ["heat", images.heat],
  ] as const) {
    const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`)!;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(image, 0, 0);
  }
}

function renderTable(rows: Row[]): void {
  const table = document.querySelector("#results")!;
  const n = (v: number | undefined) => (v === undefined ? "" : v.toFixed(4));
  table.innerHTML =
    `<tr><th>mode</th><th>source</th><th>status</th><th>contents</th><th>draws</th><th>batches</th>` +
    `<th>FLIP mean (exact sRGB)</th><th>FLIP mean (1.x color)</th><th>FLIP p95 (1.x color)</th>` +
    `<th>picks vs 1.x</th><th>feature properties</th><th>warnings</th></tr>${rows
      .map(
        (r, i) =>
          `<tr class="row" data-index="${i}"><td>${r.mode}</td><td class="text">${r.source}</td><td class="text">${r.status}</td>` +
          `<td>${r.contents ?? ""}</td><td>${r.draws ?? ""}</td><td>${r.batches ?? ""}</td><td>${n(r.flipSrgb)}</td>` +
          `<td>${n(r.flipGamma)}</td><td>${n(r.flipGammaP95)}</td><td class="text">${r.picks ?? ""}</td>` +
          `<td class="text">${r.properties ?? ""}</td><td class="text">${r.warnings ?? ""}</td></tr>`,
      )
      .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      const images = lastImages[Number(tr.dataset.index)];
      if (images) {
        showImages(images);
      }
    }),
  );
}

Object.assign(globalThis, { runTileset });
addRunButton(runTileset);
