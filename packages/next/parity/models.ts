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
];

interface Row {
  model: string;
  status: string;
  draws?: number;
  batches?: number;
  flipSrgb?: number;
  flipGamma?: number;
  flipGammaP95?: number;
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
): Promise<ImageData> {
  const model = await Cesium.Model.fromGltfAsync({
    url,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromRadians(SITE.longitude, SITE.latitude, SITE.height),
    ),
    customShader: new Cesium.CustomShader({
      lightingModel: Cesium.LightingModel.UNLIT,
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

  for (const path of MODELS) {
    const url = new URL(`/specs-data/Models/glTF-2.0/${path}`, location.href)
      .href;
    const name = path.split("/")[0]!;
    status.textContent = `${name}…`;
    try {
      const images: Partial<Record<"srgb" | "gamma2.2", ImageData>> = {};
      let placed: { radius: number; center: Float64Array } | undefined;
      let draws = 0;
      let batches = 0;
      let warnings = "";
      let asset0Translucent = false;
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
          unlit: true,
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
        });
        engine.renderFrame();
        batches = world.batchCount;
        images[colorTransfer] = new ImageData(
          await target.read(),
          WIDTH,
          HEIGHT,
        );
        engine.removeView(view);
        engine.worlds.splice(engine.worlds.indexOf(world), 1);
        world.destroy();
      }
      const legacy = await renderLegacy(viewer, url, camera);
      const srgb = flip(legacy.data, images.srgb!.data, WIDTH, HEIGHT);
      const gamma = flip(legacy.data, images["gamma2.2"]!.data, WIDTH, HEIGHT);
      const translucent = asset0Translucent;
      rows.push({
        model: name,
        status: translucent
          ? "ok (translucent: drawn opaque until OIT, M4)"
          : "ok",
        draws,
        batches,
        flipSrgb: srgb.mean,
        flipGamma: gamma.mean,
        flipGammaP95: gamma.p95,
        warnings,
      });
      lastImages.push({
        legacy,
        next: images["gamma2.2"]!,
        heat: flipHeatmap(gamma.errors),
      });
    } catch (error) {
      rows.push({
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
    `<tr><th>model</th><th>status</th><th>draws</th><th>batches</th>` +
    `<th>FLIP mean (exact sRGB)</th><th>FLIP mean (1.x color)</th><th>FLIP p95 (1.x color)</th><th>warnings</th></tr>${rows
      .map(
        (r, i) =>
          `<tr class="row" data-index="${i}"><td>${r.model}</td><td class="text">${r.status}</td>` +
          `<td>${r.draws ?? ""}</td><td>${r.batches ?? ""}</td><td>${n(r.flipSrgb)}</td>` +
          `<td>${n(r.flipGamma)}</td><td>${n(r.flipGammaP95)}</td><td class="text">${r.warnings ?? ""}</td></tr>`,
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
