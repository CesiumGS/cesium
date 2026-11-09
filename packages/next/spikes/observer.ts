// The sky and observer plan's check page: what Node tests can't see, on the GPU, in
// small offscreen targets. No token and no network: the scene is a quad under the
// sky or a flat color. Each group prints its checks; a device loss stops the run.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  Engine,
  OffscreenTarget,
  astroCurve,
  astrophotoCurveStage,
  createPostStage,
  type Exposure,
  type MeshData,
  type PostStage,
  type PostStageOptions,
  type View,
  type World,
} from "../src/index.ts";

const TEMPLATE = `
<h1>The observer's chain</h1>
<p>
  Post stages on the GPU: what each slot sees, how a stage's result reaches the
  target, and what a stage that misbehaves can do.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

const WIDTH = 128;
const HEIGHT = 72;
/** On the sphere's surface, m. */
const RADIUS = 6_378_137;
/** Display color behind the scene, with `background: "color"`. */
const CLEAR = [0.25, 0.5, 0.75] as const;

const quad: MeshData = {
  positions: Float32Array.of(-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

export interface Check {
  group: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface ObserverResult {
  adapter: string;
  checks: Check[];
  /** Validation errors and uncaptured ones from the device. */
  deviceErrors: string[];
  passed: boolean;
  /** With `?stills`: PNG data URLs, for looking at. */
  stills: Record<string, string>;
}

/** One small scene and its target: a quad filling the view's middle. */
class Scene {
  readonly target = new OffscreenTarget(WIDTH, HEIGHT);
  readonly world: World;
  readonly view: View;

  constructor(
    readonly engine: Engine,
    options: {
      background: "color" | "atmosphere";
      exposure?: Exposure;
      unlit?: boolean;
    },
  ) {
    this.world = engine.createWorld({
      maxDraws: 4,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    this.view = engine.addView({
      target: this.target,
      world: this.world,
      background: options.background,
      clearColor: CLEAR,
      observer: { exposure: options.exposure ?? { ev100: 12 } },
    });
    // 2 m up, looking along the horizon, the quad 3 m ahead.
    const origin = Float64Array.of(RADIUS + 2, 3, 0);
    const { camera } = this.view;
    camera.position.set([RADIUS + 2, 0, 0]);
    camera.direction.set([0, 1, 0]);
    camera.orient(Float64Array.of(1, 0, 0));
    camera.version++;
    this.world.addDraw({
      mesh: this.world.addMesh(quad),
      origin,
      color: [0.9, 0.2, 0.1, 1],
      unlit: options.unlit ?? true,
      doubleSided: true,
    });
  }

  dispose(): void {
    this.engine.removeWorld(this.world);
  }
}

/** A stage from its body: `c` is the pixel's color so far. */
function stage(
  name: string,
  slot: PostStageOptions["slot"],
  body: string,
  more: Partial<PostStageOptions> = {},
): PostStage {
  return createPostStage({
    name,
    slot,
    kind: "look",
    label: `${name} (a look)`,
    shader: `fn postStage(input: PostInput) -> vec4<f32> {
      let c = postColorAt(input.pixel);
      ${body}
    }`,
    ...more,
  });
}

/** Renders until the view's stages can draw, then once more; the image. */
async function image(
  engine: Engine,
  scene: Scene,
): Promise<Uint8ClampedArray<ArrayBuffer>> {
  const { view } = scene;
  for (let i = 0; i < 400; i++) {
    engine.renderFrame();
    await engine.gpu.device.queue.onSubmittedWorkDone();
    const { chain } = engine.raster.viewFrames.get(view)!;
    const slots = [
      chain.slots.scene!,
      chain.slots.exposed!,
      chain.slots.display!,
    ];
    const nodes = slots.flatMap((s) => s.nodes);
    const splitWaits =
      (chain.slots.exposed!.nodes.length > 0 ||
        chain.slots.display!.nodes.length > 0) &&
      !chain.pipelines;
    const stages = view.observer.stages;
    const waiting = nodes.some((node) => {
      const stage = stages.find((s) => `post.${s.name}` === node.output.name);
      return !!stage && stage.enabled && !stage.error && !node.enabled;
    });
    if (!waiting && !splitWaits) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  engine.renderFrame();
  await engine.gpu.device.queue.onSubmittedWorkDone();
  return scene.target.read();
}

const at = (data: ArrayLike<number>, x: number, y: number) => {
  const i = (y * WIDTH + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
};

/** The largest channel difference, and how many pixels differ at all. */
function difference(a: ArrayLike<number>, b: ArrayLike<number>) {
  let largest = 0;
  let pixels = 0;
  for (let i = 0; i < a.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 3; k++) {
      d = Math.max(d, Math.abs(a[i + k]! - b[i + k]!));
    }
    largest = Math.max(largest, d);
    pixels += d > 0 ? 1 : 0;
  }
  return { largest, pixels };
}

type Say = (name: string, pass: boolean, detail: string) => void;

const CORNER = [4, 4] as const;
const CENTER = [WIDTH / 2, HEIGHT / 2] as const;

async function stagesGroup(engine: Engine, say: Say): Promise<void> {
  // `OffscreenTarget.read` gives RGBA.
  const R = 0;
  {
    const scene = new Scene(engine, { background: "color" });
    const before = await image(engine, scene);
    const invert = stage(
      "invert",
      "display",
      "return vec4<f32>(1.0 - c.r, c.g, c.b, c.a);",
    );
    scene.view.observer.stages = [invert];
    const after = await image(engine, scene);
    const b = at(before, ...CORNER);
    const a = at(after, ...CORNER);
    say(
      "a display stage that inverts red changes a known pixel",
      Math.abs(a[R]! + b[R]! - 255) <= 1 && a[1] === b[1],
      `red ${b[R]} → ${a[R]}, green ${b[1]} → ${a[1]}`,
    );
    invert.enabled = false;
    const off = await image(engine, scene);
    const d = difference(off, before);
    say(
      "disabled, it's as if it weren't there",
      d.pixels === 0,
      `${d.pixels} pixels differ`,
    );
    invert.enabled = true;
    scene.view.fxaa = true;
    const smoothed = await image(engine, scene);
    const f = at(smoothed, ...CORNER);
    say(
      "with FXAA on, FXAA follows the stage",
      Math.abs(f[R]! + b[R]! - 255) <= 1,
      `red ${b[R]} → ${f[R]}`,
    );
    scene.dispose();
  }
  {
    const scene = new Scene(engine, { background: "color" });
    scene.view.observer.stages = [
      stage(
        "depth",
        "display",
        "return vec4<f32>(vec3<f32>(step(1e-30, postDepthAt(input.pixel))), 1.0);",
        { reads: ["depth"] },
      ),
    ];
    const shown = await image(engine, scene);
    const center = at(shown, ...CENTER);
    const corner = at(shown, ...CORNER);
    say(
      "a stage reading depth shows the outline of what was drawn",
      center[1] === 255 && corner[1] === 0,
      `over the quad ${center[1]}, beside it ${corner[1]}`,
    );
    scene.view.observer.stages = [
      stage(
        "ids",
        "display",
        "return vec4<f32>(vec3<f32>(f32(postIdAt(input.pixel) & 1u)), 1.0);",
        { reads: ["ids"] },
      ),
    ];
    await image(engine, scene);
    say("a stage can read ids", true, "drew with no device error");
    scene.dispose();
  }
  for (const [name, exposure] of [
    ["a camera", { ev100: 12 }],
    ["the eye", { eye: true }],
  ] as Array<[string, Exposure]>) {
    const scene = new Scene(engine, { background: "atmosphere", exposure });
    // Let the eye settle, then hold it there: it's not what's being compared.
    if ("eye" in exposure) {
      for (let i = 0; i < 40; i++) {
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    const before = await image(engine, scene);
    scene.view.observer.stages = [stage("noop", "exposed", "return c;")];
    const after = await image(engine, scene);
    const d = difference(before, after);
    say(
      `a no-op exposed stage, under ${name}, stays within 1/255`,
      d.largest <= 1,
      `largest ${d.largest}/255 over ${d.pixels} of ${WIDTH * HEIGHT} pixels`,
    );
    scene.dispose();
  }
  {
    const scene = new Scene(engine, {
      background: "atmosphere",
      exposure: { ev100: 12 },
    });
    const before = await image(engine, scene);
    const bad = (name: string, slot: PostStageOptions["slot"], value: string) =>
      stage(
        name,
        slot,
        `let zero = input.uv.x - input.uv.x;
        if (input.pixel.x == 10 && input.pixel.y == 10) {
          return vec4<f32>(${value});
        }
        return c;`,
      );
    for (const [name, slot, value] of [
      ["nan-scene", "scene", "zero / zero"],
      ["inf-scene", "scene", "1.0 / zero"],
      ["nan-exposed", "exposed", "zero / zero"],
      ["nan-display", "display", "zero / zero"],
    ] as const) {
      scene.view.observer.stages = [bad(name, slot, value)];
      const after = await image(engine, scene);
      const p = at(after, 10, 10);
      const neighbors = [at(after, 9, 10), at(after, 11, 10), at(after, 10, 9)];
      const clean = neighbors.every((n, i) => {
        const [x, y] = (
          [
            [9, 10],
            [11, 10],
            [10, 9],
          ] as const
        )[i]!;
        const was = at(before, x, y);
        return n.slice(0, 3).every((v, k) => Math.abs(v - was[k]!) <= 1);
      });
      say(
        `${name}: shows as 0 at that pixel only`,
        p[0] === 0 && p[1] === 0 && p[2] === 0 && clean,
        `the pixel ${p.slice(0, 3).join(", ")}; neighbors ${clean ? "as before" : "changed"}`,
      );
    }
    scene.dispose();
  }
  {
    // Two views of one target: a stage in each, at a nonzero origin too.
    const scene = new Scene(engine, { background: "color" });
    const right = engine.addView({
      target: scene.target,
      world: scene.world,
      background: "color",
      clearColor: CLEAR,
      viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
      observer: { exposure: { ev100: 12 } },
    });
    right.camera.copyFrom(scene.view.camera);
    scene.view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
    const before = await image(engine, scene);
    const left = at(before, 4, 4);
    const invert = stage(
      "invert",
      "display",
      "return vec4<f32>(1.0 - c.r, c.g, c.b, c.a);",
    );
    right.observer.stages = [invert];
    const one = await image(engine, scene);
    await image(engine, scene);
    const [l, r] = [at(one, 4, 4), at(one, WIDTH / 2 + 4, 4)];
    say(
      "two views: a display stage on the right one leaves the left alone",
      l[R] === left[R] && Math.abs(r[R]! + left[R]! - 255) <= 1,
      `left red ${l[R]}, right red ${r[R]}`,
    );
    right.observer.stages = [
      stage("darken", "exposed", "return vec4<f32>(c.rgb * 0.0, c.a);"),
    ];
    scene.view.observer.stages = [invert];
    await image(engine, scene);
    const two = await image(engine, scene);
    const edge = at(two, WIDTH / 2 + 1, HEIGHT / 2);
    say(
      "two views: different stages, an exposed one at a nonzero origin",
      Math.abs(at(two, 4, 4)[R]! + left[R]! - 255) <= 1,
      `left red ${at(two, 4, 4)[R]}, right beside the quad ${edge.slice(0, 3).join(", ")}`,
    );
    engine.removeView(right);
    scene.dispose();
  }
  {
    // The slots' order: a scene stage's result is what the exposed one reads.
    const scene = new Scene(engine, {
      background: "atmosphere",
      exposure: { ev100: 12 },
    });
    const before = await image(engine, scene);
    scene.view.observer.stages = [
      stage("half", "exposed", "return vec4<f32>(c.rgb * 0.5, c.a);"),
      stage("double", "scene", "return vec4<f32>(c.rgb * 2.0, c.a);"),
    ];
    const after = await image(engine, scene);
    const d = difference(before, after);
    say(
      "a scene stage feeds an exposed one, whatever the list's order",
      d.largest <= 1,
      `largest ${d.largest}/255`,
    );
    const gain = stage(
      "gain",
      "exposed",
      "return vec4<f32>(c.rgb * uniforms.gain, c.a);",
      {
        uniforms: { gain: { type: "f32", value: 1 } },
      },
    );
    scene.view.observer.stages = [gain];
    const unit = await image(engine, scene);
    gain.setUniform("gain", 0);
    const zero = await image(engine, scene);
    say(
      "setUniform reaches the shader",
      difference(unit, zero).largest > 20,
      `largest change ${difference(unit, zero).largest}/255`,
    );
    scene.dispose();
  }
}

/** present.slang's `pbrNeutral`, for one color. */
function pbrNeutral(c: readonly number[]): number[] {
  const x = Math.min(...c);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const color = c.map((v) => v - offset);
  const peak = Math.max(...color);
  if (peak < 0.76) {
    return color;
  }
  const d = 1 - 0.76;
  const newPeak = 1 - (d * d) / (peak + d - 0.76);
  const g = 1 - 1 / (0.15 * (peak - newPeak) + 1);
  return color.map(
    (v) => (v * newPeak) / peak + g * (newPeak - (v * newPeak) / peak),
  );
}

const srgb = (v: number) =>
  255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/** What the curve's shader does to an exposed color, at full strength. */
function curved(c: readonly number[]): number[] {
  const y = 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  const out = astroCurve(y, 1);
  const ratio = out / Math.max(y, 1e-6);
  return c.map((v) => Math.max(out + (v * ratio - out) * 1.4, 0));
}

/** The largest difference between a pixel and a color we expect, /255. */
const off = (pixel: readonly number[], color: readonly number[]) =>
  Math.max(...color.map((v, k) => Math.abs(srgb(v) - pixel[k]!)));

async function curveGroup(
  engine: Engine,
  say: Say,
  stills: Record<string, string>,
): Promise<void> {
  {
    // Known light at the slot's input, from a stage: no units, so exposed light
    // is this. A bright pixel for the Earth, a faint one for a star.
    const LEVELS = [
      ["an Earth pixel", 0.4],
      ["a star pixel", 0.012],
    ] as const;
    const scene = new Scene(engine, {
      background: "color",
      exposure: { scale: 1 },
    });
    scene.view.observer.stages = [
      stage(
        "pattern",
        "scene",
        `_ = c;
        return vec4<f32>(vec3<f32>(select(${LEVELS[1][1]}, ${LEVELS[0][1]}, input.pixel.x < ${WIDTH / 2})), 1.0);`,
      ),
    ];
    const before = await image(engine, scene);
    const pattern = scene.view.observer.stages[0]!;
    scene.view.observer.stages = [pattern, astrophotoCurveStage()];
    const after = await image(engine, scene);
    for (const [i, [name, level]] of LEVELS.entries()) {
      // Above and below the quad: its unlit color isn't in the chain.
      const x = i === 0 ? 4 : WIDTH - 4;
      const was = at(before, x, 4);
      const now = at(after, x, 4);
      const gray = astroCurve(level, 1);
      const wasOff = off(was, pbrNeutral([level, level, level]));
      const nowOff = off(now, pbrNeutral([gray, gray, gray]));
      say(
        `${name} changes by what astroCurve says`,
        wasOff <= 2 && nowOff <= 2,
        `${level} → ${gray.toFixed(4)}: ${was[1]} → ${now[1]}; within ${nowOff.toFixed(2)}/255`,
      );
    }
    scene.dispose();
  }
  {
    // A real sky, by a camera: a colored pixel, saturation included, and the meter.
    const scene = new Scene(engine, {
      background: "atmosphere",
      exposure: { ev100: 12 },
    });
    const read = scene.view.readHdr();
    const before = await image(engine, scene);
    const hdr = await read;
    const curve = astrophotoCurveStage();
    scene.view.observer.stages = [curve];
    const after = await image(engine, scene);
    const scale = 1 / (1.2 * 2 ** 12);
    const i = (4 * WIDTH + 4) * 4;
    const light = [hdr.data[i]!, hdr.data[i + 1]!, hdr.data[i + 2]!];
    const exposed = light.map((v) => v * scale);
    const wasOff = off(at(before, 4, 4), pbrNeutral(exposed));
    const nowOff = off(at(after, 4, 4), pbrNeutral(curved(exposed)));
    say(
      "a sky pixel's color changes as the curve's rule says",
      wasOff <= 2 && nowOff <= 2,
      `exposed ${exposed.map((v) => v.toFixed(3)).join(", ")}: ${at(before, 4, 4).slice(0, 3).join(", ")} → ${at(after, 4, 4).slice(0, 3).join(", ")}; within ${nowOff.toFixed(2)}/255`,
    );
    scene.dispose();
  }
  {
    const scene = new Scene(engine, {
      background: "atmosphere",
      exposure: { auto: true, speed: 1000 },
    });
    const settle = async () => {
      for (let i = 0; i < 30; i++) {
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return scene.view.readout().ev100!;
    };
    const before = await settle();
    scene.view.observer.stages = [astrophotoCurveStage()];
    await image(engine, scene);
    const after = await settle();
    say(
      "the meter's reading doesn't change",
      Math.abs(after - before) < 0.02,
      `EV100 ${before.toFixed(3)} → ${after.toFixed(3)}`,
    );
    scene.dispose();
  }
  if (params.has("stills")) {
    // A low sun, by a camera: for the owner's eye. Plain sky and a quad only.
    const saved = Float64Array.from(engine.sunDirection);
    engine.sunDirection.set([0.04, 1, 0.3]);
    const scene = new Scene(engine, {
      background: "atmosphere",
      exposure: { ev100: 3 },
    });
    stills.before = await still(await image(engine, scene));
    scene.view.observer.stages = [astrophotoCurveStage()];
    stills.after = await still(await image(engine, scene));
    scene.dispose();
    engine.sunDirection.set(saved);
  }
}

/** A target's image as a PNG data URL. */
async function still(data: Uint8ClampedArray<ArrayBuffer>): Promise<string> {
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(data, WIDTH, HEIGHT), 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
}

const GROUPS: Record<
  string,
  (engine: Engine, say: Say, stills: Record<string, string>) => Promise<void>
> = {
  stages: stagesGroup,
  curve: curveGroup,
};

let root: HTMLElement;
let params = new URLSearchParams();
const $ = (id: string) => root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;

async function runObserver(): Promise<ObserverResult> {
  const status = root.querySelector(".status")!;
  status.textContent = "checking…";
  $("results").replaceChildren();
  const engine = await Engine.create();
  const deviceErrors: string[] = [];
  let lost: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lost = info.message || info.reason;
  });
  engine.gpu.device.addEventListener("uncapturederror", (event) => {
    deviceErrors.push((event as GPUUncapturedErrorEvent).error.message);
  });
  const checks: Check[] = [];
  const stills: Record<string, string> = {};
  const wanted = params.get("group");
  try {
    let current = "";
    const say: Say = (name, pass, detail) => {
      if (lost !== undefined) {
        throw new Error(`the GPU device was lost (${lost}); stopped`);
      }
      checks.push({ group: current, name, pass, detail });
      const tr = document.createElement("tr");
      for (const text of [current, name, detail, pass ? "pass" : "FAIL"]) {
        const td = document.createElement("td");
        td.className = "text";
        td.textContent = text;
        tr.append(td);
      }
      $("results").append(tr);
    };
    for (const [group, run] of Object.entries(GROUPS)) {
      if (wanted && wanted !== group) {
        continue;
      }
      current = group;
      await run(engine, say, stills);
    }
  } finally {
    engine.stop();
  }
  const passed = checks.every((c) => c.pass) && deviceErrors.length === 0;
  status.textContent = passed
    ? `${checks.length} checks passed`
    : `failed: ${checks.filter((c) => !c.pass).length} checks, ${deviceErrors.length} device errors`;
  return {
    adapter: engine.gpu.adapter.info.description,
    checks,
    deviceErrors,
    passed,
    stills,
  };
}

export const harness: Harness = {
  mount(element, search) {
    root = element;
    params = search;
    root.innerHTML = TEMPLATE;
    return { run: runObserver };
  },
};
