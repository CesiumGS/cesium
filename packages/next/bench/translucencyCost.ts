import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  MaterialFlags,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type DrawHandle,
  type MeshData,
  type TranslucencyMethod,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";

/**
 * Translucency's fixed cost: GPU time of an opaque scene (boxes, sun
 * shadows) at 1456 × 1360 with no blended draw, with one drawn in no view
 * (`viewMask` 0) or hidden, and with one small and one large on screen.
 * A blended draw no view shows should cost nothing; a small one little.
 */
const TEMPLATE = `
<h1>Translucency fixed cost</h1>
<p>
  GPU time (<code>engine.stats.gpuMs</code>, the span, and the
  translucent passes' own time) and the frame interval, the median of 10
  readings 200 ms apart after 3 s of settling, per state; then "serial",
  the wall time of frames rendered back to back, each waited for (a check
  on the timer). Query:
  <code>?translucency=exact</code>, <code>?settle=ms</code>.
</p>
<div class="status">Run to measure.</div>
<canvas data-id="canvas" style="width: 728px; height: 680px"></canvas>
<table data-id="rows"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

function square(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

interface Row {
  state: string;
  gpuMs: number;
  spanMs: number;
  translucentMs: number;
  frameMs: number;
  /** Frames rendered back to back, each waited for: wall ms a frame. */
  serialMs: number;
  passes: string;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : Number.NaN;
};

async function measure(
  translucency: TranslucencyMethod,
  settle: number,
  status: Element,
): Promise<Row[]> {
  const engine = await Engine.create();
  const rows: Row[] = [];
  let watching = true;
  try {
    const world = engine.createWorld({
      maxDraws: 1024,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    const ellipsoid = Ellipsoid.WGS84;
    const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
    const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
    mat4.setTranslation(enu, vec3.vec3());
    const place = (local: mat4.Mat4) => mat4.multiply(mat4.mat4(), enu, local);
    const box = world.addMesh(createBox());
    const quad = world.addMesh(square());
    const opaque = world.addMaterial({
      baseColor: [0.7, 0.55, 0.4, 1],
      roughness: 0.7,
    });
    const ground = mat4.fromScale(mat4.mat4(), 400, 400, 1);
    mat4.setTranslation(ground, vec3.vec3(0, 0, -0.5));
    world.addDraw({
      mesh: box,
      material: opaque,
      origin,
      model: place(ground),
    });
    for (let i = 0; i < 400; i++) {
      const local = mat4.fromScale(mat4.mat4(), 4, 4, 4 + (i % 7) * 3);
      mat4.setTranslation(
        local,
        vec3.vec3(((i % 20) - 10) * 12, (Math.floor(i / 20) - 10) * 12, 2),
      );
      world.addDraw({
        mesh: box,
        material: opaque,
        origin,
        model: place(local),
      });
    }
    const glass = world.addMaterial({
      baseColor: [1, 1, 1, 0.4],
      flags: MaterialFlags.alphaBlend,
    });

    const canvas = $<HTMLCanvasElement>("canvas");
    canvas.width = 1456;
    canvas.height = 1360;
    const view = engine.addView({
      target: new CanvasTarget(canvas),
      world,
      shadows: true,
      translucencyMethod: translucency,
    });
    view.camera.near = 0.5;
    view.camera.lookAt(origin, 30 * deg, -20 * deg, 160);
    // The sun 40° up in the east-south-east: long shadows.
    const sun = vec3.vec3();
    for (let k = 0; k < 3; k++) {
      sun[k] = enu[k]! * 0.7 - enu[4 + k]! * 0.3 + enu[8 + k]! * 0.65;
    }
    engine.sunDirection.set(vec3.normalize(sun, sun));
    engine.renderMode = "continuous";
    engine.start();

    const frames: number[] = [];
    let last = performance.now();
    const tick = (t: number) => {
      frames.push(t - last);
      last = t;
      if (watching) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    // A quad facing the camera, `size` m across, `distance` m in front of
    // it (viewMask as given).
    const facing = (size: number, distance: number, viewMask?: number) => {
      const eye = view.camera.position;
      const forward = vec3.normalize(
        vec3.vec3(),
        vec3.sub(vec3.vec3(), origin, eye as vec3.Vec3),
      );
      const centre = vec3.add(
        vec3.vec3(),
        eye as vec3.Vec3,
        vec3.scale(vec3.vec3(), forward, distance),
      );
      // A z-up quad: its normal toward the camera.
      const up = vec3.normalize(vec3.vec3(), origin);
      const right = vec3.normalize(
        vec3.vec3(),
        vec3.cross(vec3.vec3(), forward, up),
      );
      const top = vec3.cross(vec3.vec3(), right, forward);
      const model = mat4.mat4();
      const back = vec3.scale(vec3.vec3(), forward, -1);
      for (let k = 0; k < 3; k++) {
        model[k] = right[k]! * size;
        model[4 + k] = top[k]! * size;
        model[8 + k] = back[k]!;
      }
      model[15] = 1;
      return world.addDraw({
        mesh: quad,
        material: glass,
        origin: centre,
        model,
        ...(viewMask === undefined ? {} : { viewMask }),
      });
    };

    const read = async (state: string) => {
      status.textContent = `${state}…`;
      await wait(settle);
      const gpu: number[] = [];
      const span: number[] = [];
      const passes: number[] = [];
      frames.length = 0;
      for (let i = 0; i < 10; i++) {
        await wait(200);
        gpu.push(engine.stats.gpuMs);
        span.push(engine.stats.gpuSpanMs);
        const p = engine.gpuPasses;
        passes.push(
          Object.entries(p)
            .filter(([k]) => k.startsWith("translucent"))
            .reduce((sum, [, v]) => sum + (Number.isFinite(v) ? v : 0), 0),
        );
      }
      // GPU time independent of the timer: frames back to back, each
      // waited for (the same CPU work in every state).
      engine.stop();
      const device = engine.gpu.device;
      const serial: number[] = [];
      for (let i = 0; i < 24; i++) {
        const t0 = performance.now();
        engine.renderFrame();
        await device.queue.onSubmittedWorkDone();
        serial.push(performance.now() - t0);
      }
      engine.start();
      const p = engine.gpuPasses;
      rows.push({
        serialMs: median(serial.slice(4)),
        state,
        gpuMs: median(gpu),
        spanMs: median(span),
        translucentMs: median(passes),
        frameMs: median(frames),
        passes: Object.entries(p)
          .filter(([, v]) => Number.isFinite(v) && v >= 0.05)
          .map(([k, v]) => `${k} ${v.toFixed(2)}`)
          .join(", "),
      });
      render(rows);
    };

    await read("no blended draw");
    let draw: DrawHandle = facing(1, 1300, 0);
    await read("1 m² quad, viewMask 0");
    world.setVisible(draw, false);
    await read("1 m² quad, hidden");
    world.removeDraw(draw);
    draw = facing(1, 60);
    await read("1 m² quad, visible (60 m)");
    world.removeDraw(draw);
    draw = facing(60, 60);
    await read("60 m quad, visible (most of the view)");
    world.removeDraw(draw);
    await read("no blended draw again");
    status.textContent = "Done.";
  } finally {
    watching = false;
    engine.stop();
    engine.destroy();
  }
  return rows;
}

function render(rows: Row[]): void {
  const f = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "–");
  $("rows").innerHTML =
    `<tr><th>State</th><th>GPU ms</th><th>Span ms</th><th>Translucent passes ms</th><th>Frame ms</th><th>Serial ms</th><th>Passes</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.state}</td><td>${f(r.gpuMs)}</td><td>${f(r.spanMs)}</td><td>${f(r.translucentMs)}</td><td>${f(r.frameMs)}</td><td>${f(r.serialMs)}</td><td style="font-size: 11px">${r.passes}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element, params) {
    root = element;
    root.innerHTML = TEMPLATE;
    const translucency = (params.get("translucency") ??
      "moments") as TranslucencyMethod;
    const settle = Number(params.get("settle") ?? 3000);
    return {
      run: () =>
        measure(translucency, settle, root.querySelector(".status") ?? root),
    };
  },
};
