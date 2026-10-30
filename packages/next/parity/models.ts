import {
  Camera,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
} from "../src/index.ts";
import { flip } from "./flip.ts";
import { addRunButton } from "./runButton.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see models.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;
const ellipsoid = Ellipsoid.WGS84;
const SITE = fromDegrees(-75.1652, 39.9526, 50);

/** Khronos sample models in Specs/Data/Models/glTF-2.0. */
const MODELS = [
  "Box/glTF/Box.gltf",
  "BoxTextured/glTF-Binary/BoxTextured.glb",
  "BoxVertexColors/glTF/BoxVertexColors.gltf",
  "BoxInterleaved/glTF/BoxInterleaved.gltf",
  "TorusQuantized/glTF/TorusQuantized.gltf",
  "MeshoptCubeTest/glTF-Meshopt/MeshoptCubeTest.gltf",
  "BoomBox/glTF/BoomBox.gltf",
  "UnlitTest/glTF/UnlitTest.gltf",
  "TwoSidedPlane/glTF/TwoSidedPlane.gltf",
  "BoxCutout/glTF/BoxCutout.gltf",
  "Duck/glTF-Draco/Duck.gltf",
  "CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf",
  "BoxVertexColorsDracoRGB/glTF-Draco/BoxVertexColorsDracoRGB.gltf",
  "BoxTexturedKtx2Basis/glTF/BoxTexturedKtx2Basis.gltf",
  "BoxMixedCompression/glTF/BoxMixedCompression.gltf",
  // EXT_mesh_features + EXT_structural_metadata: per-vertex feature IDs.
  "BuildingsMetadata/glTF/buildings-metadata.gltf",
];

/**
 * Pick test grid (fractions of the view) for models with feature tables:
 * both engines pick each point and must agree on the feature's `id`.
 */
const PICK_GRID: Array<[number, number]> = [];
for (let j = 1; j <= 5; j++) {
  for (let i = 1; i <= 7; i++) {
    PICK_GRID.push([i / 8, j / 6]);
  }
}
const PICK_PROPERTY = "id";

/**
 * unlit: geometry, transforms, UVs, textures, filtering.
 * direct: + metallic-roughness BRDF under the sun (IBL off in both).
 * ibl-diffuse: + SH diffuse IBL from the same coefficients (specular IBL off).
 */
const MODES = ["unlit", "direct", "ibl-diffuse"] as const;
type Mode = (typeof MODES)[number];

interface Row {
  mode: Mode;
  model: string;
  status: string;
  draws?: number;
  batches?: number;
  flipSrgb?: number;
  flipGamma?: number;
  flipGammaP95?: number;
  /** Pick agreement with 1.x on the feature `id` (grid points). */
  picks?: string;
  warnings?: string;
}

interface RowImages {
  legacy: ImageData;
  next: ImageData;
  heat: ImageData;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x API
  viewer: any,
  url: string,
  camera: Camera,
  mode: Mode,
  sun: Float64Array,
  sh: Array<[number, number, number]>,
  picks?: Array<unknown>,
): Promise<ImageData> {
  viewer.scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(-sun[0]!, -sun[1]!, -sun[2]!),
    intensity: 2.0,
  });
  const model = await Cesium.Model.fromGltfAsync({
    url,
    // Wait for textures before "ready" (1.x defaults to loading them later).
    incrementallyLoadTextures: false,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromRadians(SITE.longitude, SITE.latitude, SITE.height),
    ),
    customShader:
      mode === "unlit"
        ? new Cesium.CustomShader({ lightingModel: Cesium.LightingModel.UNLIT })
        : undefined,
    imageBasedLighting: new Cesium.ImageBasedLighting({
      imageBasedLightingFactor: new Cesium.Cartesian2(
        mode === "ibl-diffuse" ? 1 : 0,
        0,
      ),
      sphericalHarmonicCoefficients:
        mode === "ibl-diffuse"
          ? sh.map((c) => new Cesium.Cartesian3(...c))
          : undefined,
    }),
  });
  viewer.scene.primitives.add(model);
  const deadline = performance.now() + 15000;
  while (!model.ready) {
    viewer.render();
    if (performance.now() > deadline) {
      throw new Error("1.x model did not become ready");
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
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
  for (let i = 0; i < 3; i++) {
    viewer.render();
  }
  const image = capture(viewer.scene.canvas);
  if (picks) {
    const canvas = viewer.scene.canvas as HTMLCanvasElement;
    for (const [fx, fy] of PICK_GRID) {
      // 1×1: 1.x defaults to a 3×3 search window; 2.0 reads one pixel.
      const picked = viewer.scene.pick(
        new Cesium.Cartesian2(
          fx * canvas.clientWidth,
          fy * canvas.clientHeight,
        ),
        1,
        1,
      );
      picks.push(
        picked instanceof Cesium.ModelFeature
          ? picked.getProperty(PICK_PROPERTY)
          : undefined,
      );
    }
  }
  viewer.scene.primitives.remove(model);
  return image;
}

let lastImages: RowImages[] = [];

async function runModels(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const viewer = createViewer();
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const modelMatrix = eastNorthUpToFixedFrame(
    ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
    ellipsoid,
    mat4.mat4(),
  );
  const rows: Row[] = [];
  lastImages = [];
  // Sun at azimuth 150°, elevation 40° over the site, in both engines.
  const enu = mat4.copy(mat4.mat4(), modelMatrix);
  const az = 150 * deg;
  const el = 40 * deg;
  const [e, n, u] = [
    Math.cos(el) * Math.sin(az),
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
  ];
  const sun = vec3.normalize(
    vec3.vec3(),
    vec3.vec3(
      enu[0]! * e + enu[4]! * n + enu[8]! * u,
      enu[1]! * e + enu[5]! * n + enu[9]! * u,
      enu[2]! * e + enu[6]! * n + enu[10]! * u,
    ),
  );
  vec3.copy(engine.sunDirection, sun);
  const sh = await engine.environment.readSphericalHarmonics();

  // `?only=Name` restricts the run to models whose path contains Name.
  const only = new URLSearchParams(location.search).get("only");
  const models = only ? MODELS.filter((m) => m.includes(only)) : MODELS;

  for (const mode of MODES) {
    for (const path of models) {
      const url = new URL(`/specs-data/Models/glTF-2.0/${path}`, location.href)
        .href;
      const name = path.split("/")[0]!;
      status.textContent = `${mode}: ${name}…`;
      try {
        const images: Partial<Record<"srgb" | "gamma2.2", ImageData>> = {};
        let placed: { radius: number; center: Float64Array } | undefined;
        let draws = 0;
        let batches = 0;
        let warnings = "";
        let asset0Translucent = false;
        let nextPicks: unknown[] | undefined;
        const camera = new Camera();
        for (const colorTransfer of ["srgb", "gamma2.2"] as const) {
          const asset = await engine.loadGltf(url);
          warnings = asset.warnings.join("; ");
          asset0Translucent = asset.materials.some(
            (m) => m.alphaMode === "BLEND",
          );
          const world = engine.createWorld({
            maxDraws: 4096,
            vertexBytes: 16 << 20,
            indexBytes: 8 << 20,
          });
          const instance = engine.addModel(world, asset, {
            modelMatrix,
            unlit: mode === "unlit",
            colorTransfer,
          });
          placed ??= instance;
          draws = instance.draws.length;
          if (colorTransfer === "srgb") {
            camera.near = Math.max(0.01, instance.radius * 0.01);
            camera.lookAt(
              instance.center,
              35 * deg,
              -25 * deg,
              instance.radius * 2.8,
            );
          }
          const view = engine.addView({
            target,
            world,
            camera,
            clearColor: [0, 0, 0],
            outputEncoding: colorTransfer === "srgb" ? "srgb" : "gamma2.2",
            lighting: {
              sunIntensity: 2,
              diffuseIbl: mode === "ibl-diffuse" ? 1 : 0,
              specularIbl: 0,
            },
          });
          engine.renderFrame();
          batches = world.batchCount;
          images[colorTransfer] = new ImageData(
            await target.read(),
            WIDTH,
            HEIGHT,
          );
          if (
            mode === "unlit" &&
            colorTransfer === "srgb" &&
            asset.featureTables.length > 0
          ) {
            nextPicks = [];
            for (const [fx, fy] of PICK_GRID) {
              const pick = view.pick(fx * WIDTH, fy * HEIGHT);
              engine.renderFrame(); // the pick rides along with a frame
              nextPicks.push((await pick)?.properties?.[PICK_PROPERTY]);
            }
          }
          engine.removeView(view);
          engine.worlds.splice(engine.worlds.indexOf(world), 1);
          world.destroy();
        }
        const legacyPicks = nextPicks ? [] : undefined;
        const legacy = await renderLegacy(
          viewer,
          url,
          camera,
          mode,
          sun,
          sh,
          legacyPicks,
        );
        let picks: string | undefined;
        if (nextPicks && legacyPicks) {
          const hits = legacyPicks.filter((v) => v !== undefined).length;
          const agree = nextPicks.filter((v, i) => v === legacyPicks[i]).length;
          const mismatches = PICK_GRID.flatMap(([fx, fy], i) =>
            nextPicks![i] === legacyPicks[i]
              ? []
              : [
                  `(${fx.toFixed(2)},${fy.toFixed(2)}): 2.0 ${String(nextPicks![i])}, 1.x ${String(legacyPicks[i])}`,
                ],
          );
          const detail = mismatches.length ? `; ${mismatches.join("; ")}` : "";
          picks = `${agree}/${PICK_GRID.length} agree (${hits} features hit)${detail}`;
        }
        const srgb = flip(legacy.data, images.srgb!.data, WIDTH, HEIGHT);
        const gamma = flip(
          legacy.data,
          images["gamma2.2"]!.data,
          WIDTH,
          HEIGHT,
        );
        const translucent = asset0Translucent;
        rows.push({
          mode,
          model: name,
          status: translucent
            ? "ok (translucent: drawn opaque until OIT, M4)"
            : "ok",
          draws,
          batches,
          flipSrgb: srgb.mean,
          flipGamma: gamma.mean,
          flipGammaP95: gamma.p95,
          ...(picks ? { picks } : {}),
          warnings,
        });
        lastImages.push({
          legacy,
          next: images["gamma2.2"]!,
          heat: flipHeatmap(gamma.errors),
        });
      } catch (error) {
        rows.push({
          mode,
          model: name,
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
  const first = lastImages.findIndex((_, i) => rows[i]!.status === "ok");
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
  const n = (v: number | undefined, digits = 4) =>
    v === undefined ? "" : v.toFixed(digits);
  table.innerHTML =
    `<tr><th>mode</th><th>model</th><th>status</th><th>draws</th><th>batches</th>` +
    `<th>FLIP mean (exact sRGB)</th><th>FLIP mean (1.x color)</th><th>FLIP p95 (1.x color)</th><th>picks vs 1.x</th><th>warnings</th></tr>${rows
      .map(
        (r, i) =>
          `<tr class="row" data-index="${i}"><td>${r.mode}</td><td class="text">${r.model}</td><td class="text">${r.status}</td>` +
          `<td>${r.draws ?? ""}</td><td>${r.batches ?? ""}</td><td>${n(r.flipSrgb)}</td>` +
          `<td>${n(r.flipGamma)}</td><td>${n(r.flipGammaP95)}</td><td class="text">${r.picks ?? ""}</td><td class="text">${r.warnings ?? ""}</td></tr>`,
      )
      .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      showImages(lastImages[Number(tr.dataset.index)]!);
    }),
  );
}

Object.assign(globalThis, { runModels });
addRunButton(runModels);
