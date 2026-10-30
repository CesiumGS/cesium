import {
  Camera,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  mat4,
  vec3,
  type World,
} from "../src/index.ts";
import { flip } from "./flip.ts";
import { compareImages, type ImageMetrics } from "./metrics.ts";
import { center, parityScene, type CameraState, type Rgb } from "./scene.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see index.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const WIDTH = 480;
const HEIGHT = 270;
const NEAR = 1.0;
const deg = Math.PI / 180;
const ellipsoid = Ellipsoid.WGS84;
const scene = parityScene();

/** Canonical cameras, defined by heading/pitch/range around the scene center. */
function canonicalCameras(): CameraState[] {
  const target = ellipsoid.cartographicToCartesian(
    { ...center, height: 0 },
    vec3.vec3(),
  );
  const shots: Array<[string, number, number, number]> = [
    ["oblique", 30, -30, 900],
    ["top-down", 0, -89.9, 1500],
    ["grazing", 200, -8, 650],
    ["far", 60, -45, 20000],
  ];
  return shots.map(([name, heading, pitch, range]) => {
    const camera = new Camera();
    camera.lookAt(target, heading * deg, pitch * deg, range);
    return {
      name,
      position: [...camera.position] as CameraState["position"],
      direction: [...camera.direction] as CameraState["direction"],
      up: [...camera.up] as CameraState["up"],
      fov: camera.fov,
    };
  });
}

// ---------------------------------------------------------------- 1.x side

function createLegacyViewer() {
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
  // The scene is unlit, which both engines show as is (display-referred):
  // 1.x with HDR off, its default.
  s.highDynamicRange = false;
  s.fog.enabled = false;
  s.sun = undefined;
  s.moon = undefined;
  s.backgroundColor = Cesium.Color.BLACK;

  const flat = Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT;
  const color = (c: Rgb) =>
    Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(c[0], c[1], c[2], 1),
    );
  const g = scene.ground;
  const instances = [
    new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: new Cesium.Rectangle(g.west, g.south, g.east, g.north),
        granularity: (g.east - g.west) / g.segments,
        vertexFormat: flat,
      }),
      attributes: { color: color(g.color) },
    }),
    ...scene.boxes.map(
      (b) =>
        new Cesium.GeometryInstance({
          geometry: Cesium.BoxGeometry.fromDimensions({
            dimensions: new Cesium.Cartesian3(b.width, b.depth, b.height),
            vertexFormat: flat,
          }),
          modelMatrix: Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(
              Cesium.Cartesian3.fromRadians(b.longitude, b.latitude, 0),
            ),
            new Cesium.Cartesian3(0, 0, b.height / 2),
            new Cesium.Matrix4(),
          ),
          attributes: { color: color(b.color) },
        }),
    ),
  ];
  s.primitives.add(
    new Cesium.Primitive({
      geometryInstances: instances,
      appearance: new Cesium.PerInstanceColorAppearance({
        flat: true,
        translucent: false,
      }),
      asynchronous: false,
    }),
  );
  return viewer;
}

function captureLegacy(
  viewer: ReturnType<typeof createLegacyViewer>,
  state: CameraState,
): ImageData {
  const camera = viewer.scene.camera;
  camera.frustum.fov = state.fov;
  camera.frustum.near = NEAR;
  camera.setView({
    destination: new Cesium.Cartesian3(...state.position),
    orientation: {
      direction: new Cesium.Cartesian3(...state.direction),
      up: new Cesium.Cartesian3(...state.up),
    },
  });
  for (let i = 0; i < 3; i++) {
    viewer.render();
  }
  const canvas = viewer.scene.canvas as HTMLCanvasElement;
  const copy = document.createElement("canvas");
  copy.width = WIDTH;
  copy.height = HEIGHT;
  const ctx = copy.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
  return ctx.getImageData(0, 0, WIDTH, HEIGHT);
}

// ---------------------------------------------------------------- 2.0 side

type ColorTransfer = (c: number) => number;
const srgbToLinear: ColorTransfer = (c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
/** 1.x `czm_gammaCorrect` under HDR. */
const gamma22: ColorTransfer = (c) => c ** 2.2;

function populate(world: World, toLinear: ColorTransfer): void {
  const linear = (c: Rgb) =>
    [toLinear(c[0]), toLinear(c[1]), toLinear(c[2]), 1] as const;
  const g = scene.ground;
  const patch = createSurfacePatch(
    ellipsoid,
    g.west,
    g.south,
    g.east,
    g.north,
    g.segments,
  );
  world.addDraw({
    mesh: world.addMesh(patch),
    origin: patch.origin,
    model: mat4.mat4(),
    radius: patch.radius,
    color: linear(g.color),
    unlit: true,
    name: "ground",
  });
  const box = world.addMesh(createBox());
  const local = mat4.mat4();
  for (const b of scene.boxes) {
    const origin = ellipsoid.cartographicToCartesian(
      { longitude: b.longitude, latitude: b.latitude, height: 0 },
      vec3.vec3(),
    );
    const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
    mat4.setTranslation(enu, vec3.vec3());
    mat4.fromScale(local, b.width, b.depth, b.height);
    local[14] = b.height / 2;
    world.addDraw({
      mesh: box,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      radius: Math.hypot(b.width, b.depth, b.height),
      color: linear(b.color),
      unlit: true,
    });
  }
}

// ---------------------------------------------------------------- runner

interface ParityRow {
  camera: string;
  variant: string;
  metrics: Omit<ImageMetrics, "heatmap">;
  flip: { mean: number; median: number; p95: number };
}

interface RowImages {
  legacy: ImageData;
  next: ImageData;
  heatmap: ImageData;
}

async function setup() {
  const engine = await Engine.create();
  const srgbWorld = engine.createWorld();
  populate(srgbWorld, srgbToLinear);
  const legacyColorWorld = engine.createWorld();
  populate(legacyColorWorld, gamma22);
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({
    target,
    world: srgbWorld,
    clearColor: [0, 0, 0],
  });
  view.camera.near = NEAR;
  const variants = [
    { name: "2.0 sRGB curves", world: srgbWorld, encoding: "srgb" as const },
    {
      name: "2.0 gamma 2.2 (1.x color)",
      world: legacyColorWorld,
      encoding: "gamma2.2" as const,
    },
  ];

  async function capture(
    state: CameraState,
    variant: (typeof variants)[number],
  ) {
    view.world = variant.world;
    view.outputEncoding = variant.encoding;
    vec3.set(view.camera.position, ...state.position);
    vec3.set(view.camera.direction, ...state.direction);
    vec3.set(view.camera.up, ...state.up);
    vec3.cross(view.camera.right, view.camera.direction, view.camera.up);
    view.camera.fov = state.fov;
    engine.renderFrame();
    return new ImageData(await target.read(), WIDTH, HEIGHT);
  }

  return { engine, variants, capture };
}

async function runParity(): Promise<ParityRow[]> {
  const status = document.querySelector("#status")!;
  status.textContent = "running…";
  const viewer = ((
    globalThis as { __legacy?: ReturnType<typeof createLegacyViewer> }
  ).__legacy ??= createLegacyViewer());
  const next = await (nextPromise ??= setup());
  const rows: ParityRow[] = [];
  const images: RowImages[] = [];
  for (const state of canonicalCameras()) {
    const legacy = captureLegacy(viewer, state);
    for (const variant of next.variants) {
      const image = await next.capture(state, variant);
      const { meanDeltaE, p95DeltaE, noticeable } = compareImages(
        legacy.data,
        image.data,
        WIDTH,
        HEIGHT,
      );
      const metrics = { meanDeltaE, p95DeltaE, noticeable };
      const f = flip(legacy.data, image.data, WIDTH, HEIGHT);
      rows.push({
        camera: state.name,
        variant: variant.name,
        metrics,
        flip: { mean: f.mean, median: f.median, p95: f.p95 },
      });
      images.push({ legacy, next: image, heatmap: flipHeatmap(f.errors) });
    }
  }
  renderTable(rows, images);
  showImages(images[0]!);
  lastImages = images.map((pair, i) => ({
    camera: rows[i]!.camera,
    variant: rows[i]!.variant,
    legacy: toDataUrl(pair.legacy),
    next: toDataUrl(pair.next),
  }));
  const canvas = viewer.scene.canvas as HTMLCanvasElement;
  status.textContent = `done — 1.x canvas ${canvas.width}×${canvas.height}, adapter ${next.engine.gpu.adapter.info.vendor} ${next.engine.gpu.adapter.info.architecture}`;
  return rows;
}

let nextPromise: ReturnType<typeof setup> | undefined;

/** PNG data URLs of the last run, for cross-checking with external tools. */
let lastImages: Array<{
  camera: string;
  variant: string;
  legacy: string;
  next: string;
}> = [];

function toDataUrl(image: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")!.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** FLIP error in [0, 1] → black → red → yellow → white. */
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

function showImages(images: RowImages): void {
  const pairs: Array<[string, ImageData]> = [
    ["#old", images.legacy],
    ["#next", images.next],
    ["#heat", images.heatmap],
  ];
  for (const [selector, image] of pairs) {
    const canvas = document.querySelector<HTMLCanvasElement>(selector)!;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(image, 0, 0);
  }
}

function renderTable(rows: ParityRow[], images: RowImages[]): void {
  const table = document.querySelector("#results")!;
  table.innerHTML = `<tr><th>camera</th><th>variant</th><th>FLIP mean</th><th>FLIP median</th><th>FLIP p95</th><th>mean ΔE</th><th>p95 ΔE</th><th>pixels ΔE&gt;2.3</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.camera}</td><td>${r.variant}</td>` +
        `<td>${r.flip.mean.toFixed(4)}</td><td>${r.flip.median.toFixed(4)}</td><td>${r.flip.p95.toFixed(4)}</td>` +
        `<td>${r.metrics.meanDeltaE.toFixed(2)}</td>` +
        `<td>${r.metrics.p95DeltaE.toFixed(2)}</td><td>${(r.metrics.noticeable * 100).toFixed(1)}%</td></tr>`,
    )
    .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      showImages(images[Number(tr.dataset.index)]!);
    }),
  );
}

document.querySelector("#run")!.addEventListener("click", () => {
  runParity().catch((error: unknown) => {
    console.error(error);
    document.querySelector("#status")!.textContent = String(error);
  });
});
Object.assign(globalThis, { runParity, parityImages: () => lastImages });
