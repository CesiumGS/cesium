import {
  Camera,
  Engine,
  FeatureStyle,
  OffscreenTarget,
  eastNorthUpToFixedFrame,
  Ellipsoid,
  mat4,
  collectFullDetailContents,
  resolveIonAsset,
  vec3,
  type TileContent,
  type GltfAsset,
  UNITLESS_EXPOSURE,
  UNITLESS_SKY,
  UNITLESS_SUN_ILLUMINANCE,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";
import { requireToken } from "../bench/suite/ionToken.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see tileset.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const TEMPLATE = `
<h1>Tileset parity: CesiumJS 1.x Cesium3DTileset vs 2.0 tile content</h1>
<p>
  Full-detail content of a 3D Tiles tileset (b3dm or glb, with feature IDs
  and batch/property tables) in both engines from the same camera. 1.x
  streams it with maximumScreenSpaceError 0 until every tile is loaded; 2.0
  walks the tileset (transforms, REPLACE/ADD refinement, external tilesets)
  and places each content directly. Streaming and tile selection are M2.
  Also compares picks at a grid of pixels on a feature property. Private ion
  assets: paste an ion token in Dyno (or set VITE_ION_TOKEN in .env.local for the dev server) and open with ?asset=&lt;id&gt;.
</p>
<div class="status">Run to render the tileset in both engines.</div>
<div class="images">
  <figure>
    <figcaption>1.x Cesium3DTileset (WebGL)</figcaption>
    <canvas class="out" data-id="old"></canvas>
  </figure>
  <figure>
    <figcaption>2.0 (WebGPU)</figcaption>
    <canvas class="out" data-id="next"></canvas>
  </figure>
  <figure>
    <figcaption>FLIP error</figcaption>
    <canvas class="out" data-id="heat"></canvas>
  </figure>
</div>
<table data-id="results"></table>
<div class="offscreen" data-id="legacy"></div>
<div data-id="credits" hidden></div>`;

/** Where the page is mounted, and its options (harness `mount`). */
let root: HTMLElement;
let params = new URLSearchParams();
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

interface Source {
  label: string;
  url: string;
  headers?: Record<string, string>;
  /** ion asset id, for loading the same asset in 1.x. */
  ionAsset?: number;
  /** A 3D Tiles style (1.x's JSON), applied in both engines. */
  style?: {
    show?: string;
    color?: { conditions: Array<[string, string]> };
  };
  /** How the style's color applies (1.x `colorBlendMode`; default highlight). */
  blend?: { mode: "replace" | "mix"; amount?: number };
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
  {
    label: "InstancedWithBatchTable (i3dm, positions, batch table)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json",
  },
  {
    label: "InstancedOrientation (i3dm, NORMAL_UP/RIGHT)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedOrientation/tileset.json",
  },
  {
    label: "InstancedOct32POrientation (i3dm, oct-encoded orientation)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedOct32POrientation/tileset.json",
  },
  {
    label: "InstancedQuantized (i3dm, quantized positions)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedQuantized/tileset.json",
  },
  {
    label: "InstancedScaleNonUniform (i3dm, non-uniform scale)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/tileset.json",
  },
  {
    label: "InstancedRTC (i3dm, RTC_CENTER)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedRTC/tileset.json",
  },
  {
    label: "Composite (cmpt: a b3dm and an i3dm)",
    url: "/specs-data/Cesium3DTiles/Composite/Composite/tileset.json",
  },
  {
    label: "CompositeOfComposite (cmpt in a cmpt)",
    url: "/specs-data/Cesium3DTiles/Composite/CompositeOfComposite/tileset.json",
  },
  {
    label: "CompositeOfInstanced (cmpt of i3dm)",
    url: "/specs-data/Cesium3DTiles/Composite/CompositeOfInstanced/tileset.json",
  },
  {
    label: "InstancedGltfExternal (i3dm, glTF by URI)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedGltfExternal/tileset.json",
  },
  {
    label: "InstancedTextured (i3dm, textured)",
    url: "/specs-data/Cesium3DTiles/Instanced/InstancedTextured/tileset.json",
  },
];

const MODES = ["unlit", "direct"] as const;
type Mode = (typeof MODES)[number];

/**
 * Pick test grid, as fractions of the view.
 *
 * Known difference: on the Specs Composite tileset, (0.50, 0.83) is 2.0 `id 7`
 * and 1.x no id. In 2.0 that pixel is on the b3dm building's silhouette edge,
 * about nine pixels from the nearest i3dm box (hiding the b3dm part picks
 * nothing there), so it is not a depth tie but a one-pixel edge difference.
 */
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
  const viewer = new Cesium.Viewer($("legacy"), {
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
    creditContainer: $("credits"),
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
  // Unlit color is display-referred in both engines: 1.x shows it as is
  // with HDR off (its default); lit modes compare tonemapped (HDR on).
  viewer.scene.highDynamicRange = mode !== "unlit";
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
  if (source.style) {
    tileset.style = new Cesium.Cesium3DTileStyle(source.style);
  }
  if (source.blend) {
    tileset.colorBlendMode =
      Cesium.Cesium3DTileColorBlendMode[source.blend.mode.toUpperCase()];
    tileset.colorBlendAmount = source.blend.amount ?? 0.5;
  }
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

/** The b3dm and tileset the string-styled rows use (BatchedWithBatchTable). */
const STYLED_TILESET =
  "/specs-data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";

/** Strings given to the ten buildings, in turn (a column the spec data lacks). */
const KINDS = ["school", "road", "park", "tower", "hospital"];

/**
 * BatchedWithBatchTable with a string column, `kind`, added to its batch
 * table: the b3dm rewritten in memory (its batch table's JSON gets the
 * column and is padded to eight bytes, the header's lengths follow) and a
 * tileset pointing at it, both as blob URLs, which 1.x and 2.0 read alike.
 */
async function stringTileset(): Promise<string> {
  const base = new URL(STYLED_TILESET, location.href);
  const tileset = await (await fetch(base)).json();
  const content = tileset.root.content;
  const uri = content.uri ?? content.url;
  const bytes = new Uint8Array(
    await (await fetch(new URL(uri, base))).arrayBuffer(),
  );
  const view = new DataView(bytes.buffer);
  const featureJson = view.getUint32(12, true);
  const featureBinary = view.getUint32(16, true);
  const batchJson = view.getUint32(20, true);
  const at = 28 + featureJson + featureBinary;
  const table = JSON.parse(
    new TextDecoder().decode(bytes.subarray(at, at + batchJson)),
  );
  const length = (table.id as unknown[]).length;
  table.kind = Array.from({ length }, (_, i) => KINDS[i % KINDS.length]);
  const text = new TextEncoder().encode(JSON.stringify(table));
  const padded = new Uint8Array(Math.ceil(text.length / 8) * 8).fill(0x20);
  padded.set(text);
  const out = new Uint8Array(bytes.length - batchJson + padded.length);
  out.set(bytes.subarray(0, at));
  out.set(padded, at);
  out.set(bytes.subarray(at + batchJson), at + padded.length);
  const header = new DataView(out.buffer);
  header.setUint32(8, out.length, true);
  header.setUint32(20, padded.length, true);
  const blob = (part: BlobPart, type: string) =>
    URL.createObjectURL(new Blob([part], { type }));
  const b3dm = blob(out, "application/octet-stream");
  const rewritten = { ...tileset, root: { ...tileset.root } };
  rewritten.root.content = { ...content, uri: b3dm };
  delete rewritten.root.content.url;
  return blob(JSON.stringify(rewritten), "application/json");
}

const COLORS: Source["style"] = {
  color: {
    conditions: [
      ["${kind} === 'park'", "color('#32cd32')"],
      ["${kind} === 'school' || ${kind} === 'hospital'", "color('#ff8800')"],
      ["${Height} > 10 && ${kind} === 'tower'", "rgb(200, 30, 30)"],
      ["true", "hsl(0.6, 0.5, 0.7)"],
    ],
  },
};

/**
 * Styles with string comparisons (the unstyled row is the baseline), with
 * mid-range colors, in each blend mode, and an alpha of 0 (which hides).
 */
const STRING_STYLES: Array<[string, Partial<Source>]> = [
  ["no style (baseline)", {}],
  [
    "show by strings",
    { style: { show: "${kind} !== 'tower' && ${kind} !== 'road'" } },
  ],
  ["color by strings and numbers", { style: COLORS }],
  ["color, replace", { style: COLORS, blend: { mode: "replace" } }],
  ["color, mix", { style: COLORS, blend: { mode: "mix", amount: 0.4 } }],
  [
    "color with alpha 0 hides",
    {
      style: {
        color: {
          conditions: [
            ["${kind} === 'tower'", "color('red', 0)"],
            ["true", "color('#ff8800')"],
          ],
        },
      },
    },
  ],
];

async function sources(): Promise<Source[]> {
  const asset = params.get("asset");
  if (params.get("styles") !== null) {
    const url = await stringTileset();
    return STRING_STYLES.map(([label, rest]) => ({
      label: `string styles: ${label}`,
      url,
      ...rest,
    }));
  }
  if (!asset) {
    return PUBLIC;
  }
  const token = requireToken("?asset");
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
  const status = root.querySelector(".status")!;
  const pickProperty = params.get("pick") ?? "id";
  const viewer = createViewer();
  const engine = await Engine.create();
  // 1.x's lighting has no units: compare in the same terms.
  engine.environment.setSky(UNITLESS_SKY);
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
        const style = source.style
          ? new FeatureStyle({
              ...source.style,
              ...(source.blend
                ? {
                    colorBlendMode: source.blend.mode,
                    colorBlendAmount: source.blend.amount ?? 0.5,
                  }
                : {}),
            })
          : undefined;
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
            using model = engine.uploadModel(world, asset, {
              colorTransfer,
              axes: "3d-tiles",
            });
            return model.place({
              modelMatrix: contents[i]!.transform,
              unlit: mode === "unlit",
              ...(style ? { shader: style.shader } : {}),
            });
          });
          draws = spheres.reduce((n, s) => n + s.draws.length, 0);
          const table = assets.find((a) => a.featureTables.length > 0)
            ?.featureTables[0];
          properties = table ? Object.keys(table.columns).join(", ") : "";
          if (colorTransfer === "srgb") {
            const bounds = unionSpheres(
              spheres.filter((s) => s.draws.length > 0).map((s) => s.bounds()),
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
            exposure: UNITLESS_EXPOSURE,
            background: "color",
            lighting: {
              sunIlluminance: UNITLESS_SUN_ILLUMINANCE,
              environment: "procedural",
              diffuseIbl: 0,
              specularIbl: 0,
            },
          });
          // A shader's pipelines compile in the background: until they have,
          // content draws with the default material.
          if (style) {
            await engine.compileShader(style.shader);
          }
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
    const canvas = $<HTMLCanvasElement>(id);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(image, 0, 0);
  }
}

function renderTable(rows: Row[]): void {
  const table = $("results");
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

export const harness: Harness = {
  mount(element, options) {
    root = element;
    params = options;
    root.innerHTML = TEMPLATE;
    return { run: runTileset };
  },
};
