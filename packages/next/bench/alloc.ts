import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type World,
} from "../src/index.ts";

const deg = Math.PI / 180;
const ellipsoid = Ellipsoid.WGS84;
const center = fromDegrees(-75.1652, 39.9526);
const centerCartesian = ellipsoid.cartographicToCartesian(center, vec3.vec3());

let engine: Engine | undefined;
let world: World | undefined;

/** Builds the scene with `draws` boxes (distinct colors → one batch per color). */
async function allocSetup(
  draws: number,
): Promise<{ records: number; batches: number }> {
  engine ??= await Engine.create();
  if (world) {
    engine.views.slice().forEach((v) => engine!.removeView(v));
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }
  world = engine.createWorld({
    maxDraws: draws + 64,
    vertexBytes: 8 << 20,
    indexBytes: 4 << 20,
  });
  const box = world.addMesh(createBox());
  const side = Math.ceil(Math.sqrt(draws));
  const local = mat4.fromScale(mat4.mat4(), 6, 6, 12);
  local[14] = 6;
  for (let k = 0; k < draws; k++) {
    const i = k % side;
    const j = Math.floor(k / side);
    const origin = ellipsoid.cartographicToCartesian(
      {
        longitude: center.longitude + (i - side / 2) * 0.0001 * deg,
        latitude: center.latitude + (j - side / 2) * 0.0001 * deg,
        height: 0,
      },
      vec3.vec3(),
    );
    const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
    mat4.setTranslation(enu, vec3.vec3());
    world.addDraw({
      mesh: box,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      color: [0.5 + (k % 5) * 0.1, 0.6, 0.7, 1],
    });
  }
  const asset = await engine.loadGltf(
    "/specs-data/Models/glTF-2.0/BoomBox/glTF/BoomBox.gltf",
  );
  const modelMatrix = mat4.mat4();
  mat4.multiply(
    modelMatrix,
    eastNorthUpToFixedFrame(centerCartesian, ellipsoid, mat4.mat4()),
    mat4.fromScale(mat4.mat4(), 400, 400, 400),
  );
  engine.addModel(world, asset, { modelMatrix });

  const a = new CanvasTarget(document.querySelector<HTMLCanvasElement>("#a")!);
  const main = engine.addView({ target: a, world });
  main.camera.lookAt(centerCartesian, 30 * deg, -35 * deg, side * 18);
  const inset = engine.addView({
    target: a,
    world,
    viewport: { x: 0.7, y: 0.05, width: 0.25, height: 0.3 },
  });
  inset.camera.lookAt(centerCartesian, 0, -89 * deg, side * 25);
  const second = engine.addView({
    target: new CanvasTarget(document.querySelector<HTMLCanvasElement>("#b")!),
    world,
  });
  second.camera.lookAt(centerCartesian, 210 * deg, -25 * deg, side * 14);
  engine.link(main, inset, { modes: ["footprint"] });

  // Long enough for the optimizing JIT to settle, so the gate measures
  // steady state rather than interpreter boxing.
  for (let i = 0; i < 300; i++) {
    engine.renderFrame();
    if (i % 10 === 9) {
      await engine.gpu.device.queue.onSubmittedWorkDone();
    }
  }
  await engine.gpu.device.queue.onSubmittedWorkDone();
  return { records: world.recordCount, batches: world.batchCount };
}

/** Runs `frames` frames back to back, waiting for the GPU every 10 frames. */
async function allocRun(frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) {
    engine!.renderFrame();
    if (i % 10 === 9) {
      await engine!.gpu.device.queue.onSubmittedWorkDone();
    }
  }
}

Object.assign(globalThis, { allocSetup, allocRun });
