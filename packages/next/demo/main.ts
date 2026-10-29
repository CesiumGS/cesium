import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  OrbitController,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type World,
} from "../src/index.ts";

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
const philadelphia = fromDegrees(-75.1652, 39.9526, 0);

function populate(world: World): void {
  // Coarse globe: 32 × 16 surface chunks, each its own draw with its own origin.
  const chunksX = 32;
  const chunksY = 16;
  for (let y = 0; y < chunksY; y++) {
    for (let x = 0; x < chunksX; x++) {
      const west = -Math.PI + (2 * Math.PI * x) / chunksX;
      const south = -Math.PI / 2 + (Math.PI * y) / chunksY;
      const patch = createSurfacePatch(
        ellipsoid,
        west,
        south,
        west + (2 * Math.PI) / chunksX,
        south + Math.PI / chunksY,
        16,
      );
      const shade = (x + y) % 2 === 0 ? 0.05 : 0.065;
      world.addDraw({
        mesh: world.addMesh(patch),
        origin: patch.origin,
        model: mat4.mat4(),
        radius: patch.radius,
        color: [shade, shade * 1.4, shade * 2.2, 1],
        name: `globe chunk ${x},${y}`,
      });
    }
  }

  // A finer patch under the city, so the coarse chunks' chord sag doesn't hide the boxes.
  const half = 0.15 * deg;
  const city = createSurfacePatch(
    ellipsoid,
    philadelphia.longitude - half,
    philadelphia.latitude - half,
    philadelphia.longitude + half,
    philadelphia.latitude + half,
    64,
  );
  world.addDraw({
    mesh: world.addMesh(city),
    origin: city.origin,
    model: mat4.mat4(),
    radius: city.radius,
    color: [0.09, 0.1, 0.08, 1],
    name: "city ground",
  });

  // A 12 × 12 block grid of boxes on the ellipsoid.
  const box = world.addMesh(createBox());
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const enu = mat4.mat4();
  const local = mat4.mat4();
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const position = ellipsoid.cartographicToCartesian(
        {
          // ~95 m blocks: 0.0011° of longitude and 0.00085° of latitude at 40°N.
          longitude: philadelphia.longitude + (i - 5.5) * 0.0011 * deg,
          latitude: philadelphia.latitude + (j - 5.5) * 0.00085 * deg,
          height: 0,
        },
        vec3.vec3(),
      );
      const width = 25 + random() * 30;
      const depth = 25 + random() * 30;
      const height = 15 + random() ** 3 * 220;
      // model = ENU rotation × (lift by half height) × scale; translation is the origin.
      eastNorthUpToFixedFrame(position, ellipsoid, enu);
      mat4.setTranslation(enu, vec3.vec3());
      mat4.fromScale(local, width, depth, height);
      local[14] = height / 2;
      const model = mat4.multiply(mat4.mat4(), enu, local);
      const tint = 0.35 + random() * 0.45;
      world.addDraw({
        mesh: box,
        origin: position,
        model,
        radius: Math.hypot(width / 2, depth / 2, height / 2) + height / 2,
        color: [tint, tint * 0.92, tint * 0.85, 1],
        name: `building ${j * 12 + i + 1}`,
      });
    }
  }
}

function sunFromLocalAzimuthElevation(
  azimuthDeg: number,
  elevationDeg: number,
): Float64Array {
  const origin = ellipsoid.cartographicToCartesian(philadelphia, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  const az = azimuthDeg * deg;
  const el = elevationDeg * deg;
  const e = Math.cos(el) * Math.sin(az);
  const n = Math.cos(el) * Math.cos(az);
  const u = Math.sin(el);
  return vec3.normalize(
    vec3.vec3(),
    vec3.vec3(
      enu[0]! * e + enu[4]! * n + enu[8]! * u,
      enu[1]! * e + enu[5]! * n + enu[9]! * u,
      enu[2]! * e + enu[6]! * n + enu[10]! * u,
    ),
  );
}

async function main(): Promise<void> {
  const engine = await Engine.create();
  vec3.copy(engine.sunDirection, sunFromLocalAzimuthElevation(150, 35));
  const world = engine.createWorld();
  populate(world);

  const cityCenter = ellipsoid.cartographicToCartesian(
    philadelphia,
    vec3.vec3(),
  );

  // 1. Main view + 2. picture-in-picture overview on the same canvas.
  const mainCanvas = document.querySelector<HTMLCanvasElement>("#main")!;
  const mainTarget = new CanvasTarget(mainCanvas);
  const main = engine.addView({ target: mainTarget, world });
  main.camera.lookAt(cityCenter, 30 * deg, -25 * deg, 2200);
  const overview = engine.addView({
    target: mainTarget,
    world,
    viewport: { x: 0.7, y: 0.02, width: 0.28, height: 0.3 },
  });
  engine.link(main, overview, {
    modes: ["follow", "footprint"],
    followScale: 3,
  });
  const mainControl = new OrbitController(main, mainCanvas);
  mainControl.ignore = (x, y) => overview.contains(x, y);
  // "Control" link: input in the overview drives the main camera.
  const overviewControl = new OrbitController(overview, mainCanvas);
  overviewControl.camera = main.camera;

  // 3. A second canvas with its own independent camera on the same world.
  const secondCanvas = document.querySelector<HTMLCanvasElement>("#second")!;
  const second = engine.addView({
    target: new CanvasTarget(secondCanvas),
    world,
  });
  second.camera.lookAt(cityCenter, 200 * deg, -45 * deg, 4500);
  const secondControl = new OrbitController(second, secondCanvas);

  // 4. Offscreen view, enabled only when capturing.
  const offscreenTarget = new OffscreenTarget(640, 360);
  const offscreen = engine.addView({ target: offscreenTarget, world });
  offscreen.enabled = false;
  document.querySelector("#capture")!.addEventListener("click", async () => {
    offscreen.camera.copyFrom(main.camera);
    offscreen.enabled = true;
    engine.renderFrame();
    offscreen.enabled = false;
    const pixels = await offscreenTarget.read();
    const canvas = document.createElement("canvas");
    canvas.width = offscreenTarget.width;
    canvas.height = offscreenTarget.height;
    canvas
      .getContext("2d")!
      .putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
    document.querySelector<HTMLImageElement>("#capture-img")!.src =
      canvas.toDataURL();
  });

  // Picking: click (without dragging) in the main view.
  let downAt: [number, number] | undefined;
  mainCanvas.addEventListener(
    "pointerdown",
    (e) => (downAt = [e.clientX, e.clientY]),
  );
  mainCanvas.addEventListener("pointerup", async (e) => {
    if (
      !downAt ||
      Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 3
    ) {
      return;
    }
    const rect = mainCanvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * mainCanvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * mainCanvas.height;
    if (overview.contains(x, y)) {
      return;
    }
    const result = await main.pick(x, y);
    document.querySelector("#pick")!.textContent = result
      ? `${result.name} (feature ${result.featureId})`
      : "nothing";
  });

  const caps = engine.capabilities;
  const adapter = engine.gpu.adapter.info;
  const statsEl = document.querySelector("#stats")!;
  setInterval(() => {
    const s = engine.stats;
    statsEl.textContent = [
      `adapter      ${adapter.vendor} ${adapter.architecture}`.trimEnd(),
      `views        ${s.views}`,
      `draw records ${s.draws}`,
      `cpu / frame  ${s.cpuMs.toFixed(2)} ms`,
      `gpu / frame  ${Number.isNaN(s.gpuMs) ? "n/a (no timestamp-query)" : `${s.gpuMs.toFixed(2)} ms`}`,
      `firstInstance ${caps.indirectFirstInstance ? "indirect" : "fallback attribute"}`,
      `subgroups    ${caps.subgroups}`,
    ].join("\n");
  }, 250);

  engine.start();
  Object.assign(globalThis, { engine, main, overview, second, secondControl });
}

main().catch((error: unknown) => {
  console.error(error);
  document.querySelector("#error")!.textContent = String(
    error instanceof Error ? error.message : error,
  );
});
