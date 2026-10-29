/// <reference lib="webworker" />
import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
} from "../src/index.ts";

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;

self.onmessage = async (
  event: MessageEvent<{ type: string; canvas: OffscreenCanvas }>,
) => {
  if (event.data.type !== "init") {
    return;
  }
  const report = (text: string) => self.postMessage({ type: "stats", text });
  try {
    const engine = await Engine.create();
    const world = engine.createWorld({
      vertexBytes: 8 << 20,
      indexBytes: 4 << 20,
    });
    const center = fromDegrees(-75.1652, 39.9526);
    const half = 0.02 * deg;
    const ground = createSurfacePatch(
      ellipsoid,
      center.longitude - half,
      center.latitude - half,
      center.longitude + half,
      center.latitude + half,
      32,
    );
    world.addDraw({
      mesh: world.addMesh(ground),
      origin: ground.origin,
      model: mat4.mat4(),
      radius: ground.radius,
      color: [0.08, 0.1, 0.07, 1],
    });
    const box = world.addMesh(createBox());
    const local = mat4.mat4();
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        const origin = ellipsoid.cartographicToCartesian(
          {
            longitude: center.longitude + (i - 3.5) * 0.0011 * deg,
            latitude: center.latitude + (j - 3.5) * 0.00085 * deg,
            height: 0,
          },
          vec3.vec3(),
        );
        const height = 20 + ((i * 7 + j * 13) % 9) * 15;
        const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
        mat4.setTranslation(enu, vec3.vec3());
        mat4.fromScale(local, 40, 40, height);
        local[14] = height / 2;
        world.addDraw({
          mesh: box,
          origin,
          model: mat4.multiply(mat4.mat4(), enu, local),
          radius: Math.hypot(40, 40, height),
          color: [0.6, 0.55, 0.5, 1],
        });
      }
    }
    engine.sunDirection.set(
      vec3.normalize(
        vec3.vec3(),
        ellipsoid.cartographicToCartesian(center, vec3.vec3()),
      ),
    );

    const view = engine.addView({
      target: new CanvasTarget(event.data.canvas),
      world,
    });
    const target = ellipsoid.cartographicToCartesian(center, vec3.vec3());
    let heading = 0;
    const orbit = () => {
      heading += 0.4 * deg;
      view.camera.lookAt(target, heading, -30 * deg, 1200);
      requestAnimationFrame(orbit);
    };
    orbit();
    engine.start();

    const info = engine.gpu.adapter.info;
    setInterval(() => {
      const s = engine.stats;
      report(
        [
          `running in: ${typeof WorkerGlobalScope !== "undefined" ? "dedicated worker" : "window"}`,
          `adapter:    ${info.vendor} ${info.architecture}`,
          `cpu/frame:  ${s.cpuMs.toFixed(2)} ms`,
          `gpu/frame:  ${Number.isNaN(s.gpuMs) ? "n/a" : `${s.gpuMs.toFixed(2)} ms`}`,
          `heading:    ${((heading / deg) % 360).toFixed(1)}°`,
        ].join("\n"),
      );
    }, 250);
  } catch (error) {
    report(
      `worker error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
