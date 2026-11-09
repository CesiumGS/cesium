// The sky and observer plan's check page: what Node tests can't see, on the GPU, in
// small offscreen targets. No token and no network: the scene is a quad under the
// sky or a flat color. Each group prints its checks; a device loss stops the run.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  Ellipsoid,
  Engine,
  OffscreenTarget,
  astrophotoCurveStage,
  cameraObserver,
  createPostStage,
  fromDegrees,
  eyeLimitStage,
  type Exposure,
  type GlareSettings,
  type MeshData,
  type PostStage,
  type PostStageOptions,
  type View,
  type World,
} from "../src/index.ts";
import { astroCurve } from "../src/render/post/astroCurve.ts";
import { computeKernel } from "../src/render/post/glareKernel.ts";
import {
  VEIL_LEVELS,
  veilSpread,
  veilWeights,
} from "../src/render/post/veilWeights.ts";
import { cullCell, type StarCell } from "../src/atmosphere/starCells.ts";
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  type StarField,
} from "../src/atmosphere/stars.ts";
import { moonPosition } from "../src/time/moon.ts";
import { sunDirection, sunPosition } from "../src/time/sun.ts";
import { Viewer } from "../widgets/Viewer.ts";
import { eyePointLimit } from "../src/scene/eye.ts";
import { ev100ToScale, type PointSpread } from "../src/scene/observer.ts";

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
async function still(
  data: Uint8ClampedArray<ArrayBuffer>,
  width = WIDTH,
  height = HEIGHT,
): Promise<string> {
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.putImageData(new ImageData(data, width), 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/png;base64,${btoa(text)}`;
}

/** Stages of several passes, intermediate textures and compute, on a real GPU. */
async function passesGroup(engine: Engine, say: Say): Promise<void> {
  const near = (a: readonly number[], b: readonly number[], by = 1) =>
    a.slice(0, 3).every((v, i) => Math.abs(v - b[i]!) <= by);
  const scene = new Scene(engine, { background: "color" });
  const before = await image(engine, scene);
  const b = at(before, ...CORNER);
  const options = {
    kind: "look",
    label: "A check (a look)",
  } as const;
  const run = async (stage: PostStage) => {
    scene.view.observer.stages = [stage];
    const after = await image(engine, scene);
    return { after, error: stage.error?.message ?? "" };
  };
  {
    const { after, error } = await run(
      createPostStage({
        ...options,
        name: "two",
        slot: "display",
        textures: { half: { scale: 0.5 } },
        passes: [
          {
            name: "down",
            writes: ["half"],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              return vec4<f32>(1.0) - postColor(input.uv);
            }`,
          },
          {
            name: "up",
            reads: ["half"],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              return vec4<f32>(textureSampleLevel(half, postSampler, input.uv, 0.0).rgb, 1.0);
            }`,
          },
        ],
      }),
    );
    const a = at(after, ...CORNER);
    say(
      "two passes through a half-size target",
      !error && near(a, [255 - b[0]!, 255 - b[1]!, 255 - b[2]!], 2),
      `${b.slice(0, 3).join()} → ${a.slice(0, 3).join()} ${error}`,
    );
  }
  {
    const { after, error } = await run(
      createPostStage({
        ...options,
        name: "levels",
        slot: "display",
        textures: { pyramid: { scale: 0.5, mips: 3, format: "rgba16float" } },
        passes: [
          {
            name: "zero",
            writes: [{ texture: "pyramid", mip: 0 }],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              return vec4<f32>(0.125, 0.0, 0.0, 1.0);
            }`,
          },
          ...[1, 2].map((mip) => ({
            name: `level${mip}`,
            reads: [{ texture: "pyramid", mip: mip - 1 }],
            writes: [{ texture: "pyramid", mip }],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              let c = textureSampleLevel(pyramid, postSampler, input.uv, 0.0);
              return vec4<f32>(c.r * 2.0, f32(input.size.x), 0.0, 1.0);
            }`,
          })),
          {
            name: "show",
            reads: ["pyramid"],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              let c = textureSampleLevel(pyramid, postSampler, input.uv, 2.0);
              return vec4<f32>(c.r, c.g / 255.0, 0.0, 1.0);
            }`,
          },
        ],
      }),
    );
    const a = at(after, ...CORNER);
    say(
      "a pyramid, written level by level, read whole; each pass knows its size",
      !error && near(a, [128, WIDTH / 2 / 4, 0], 2),
      `${a.slice(0, 3).join()} (red 0.125 × 4; green ${WIDTH / 2 / 4}: level 2's width) ${error}`,
    );
  }
  {
    const { after, error } = await run(
      createPostStage({
        ...options,
        name: "stored",
        slot: "display",
        passes: [
          {
            name: "swap",
            compute: {},
            shader: `fn postCompute(input: PostInput) {
              let c = postColorAt(input.pixel);
              textureStore(output, input.pixel, postFinite(vec4<f32>(c.b, c.g, c.r, c.a)));
            }`,
          },
        ],
      }),
    );
    const corner = at(after, ...CORNER);
    const edge = at(after, WIDTH - 1, HEIGHT - 1);
    const was = at(before, WIDTH - 1, HEIGHT - 1);
    say(
      "a compute pass stores every pixel, to the last corner",
      !error &&
        near(corner, [b[2]!, b[1]!, b[0]!]) &&
        near(edge, [was[2]!, was[1]!, was[0]!]),
      `${b.slice(0, 3).join()} → ${corner.slice(0, 3).join()}; last ${edge.slice(0, 3).join()} ${error}`,
    );
  }
  {
    const { after, error } = await run(
      createPostStage({
        ...options,
        name: "scene-compute",
        slot: "scene",
        uniforms: { gain: { type: "f32", value: 1 } },
        textures: { half: { scale: 0.5, format: "rgba16float" } },
        passes: [
          {
            name: "fill",
            compute: { workgroupSize: [4, 4] },
            reads: ["depth"],
            writes: ["half"],
            shader: `fn postCompute(input: PostInput) {
              let far = postDepthAt(input.pixel * 2) * 0.0;
              textureStore(half, input.pixel, vec4<f32>(uniforms.gain + far));
            }`,
          },
          {
            name: "apply",
            reads: ["half"],
            shader: `fn postStage(input: PostInput) -> vec4<f32> {
              return postColor(input.uv) * textureSampleLevel(half, postSampler, input.uv, 0.0);
            }`,
          },
        ],
      }),
    );
    const d = difference(after, before);
    say(
      "compute into a target with uniforms and depth, then a fragment pass reads it",
      !error && d.largest <= 1,
      `largest difference ${d.largest}/255 ${error}`,
    );
  }
  {
    const { after, error } = await run(
      createPostStage({
        ...options,
        name: "lut",
        slot: "display",
        textures: {
          lut: {
            width: 2,
            height: 1,
            data: Uint8Array.of(10, 20, 30, 255, 200, 100, 50, 255),
          },
        },
        reads: ["lut"],
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return textureLoad(lut, vec2<i32>(1, 0), 0);
        }`,
      }),
    );
    const a = at(after, ...CORNER);
    say(
      "a fixed image reaches the shader",
      !error && near(a, [200, 100, 50]),
      `${a.slice(0, 3).join()} ${error}`,
    );
  }
  {
    // One stage in two views: each its own value, and only one left out.
    const right = engine.addView({
      target: scene.target,
      world: scene.world,
      background: "color",
      clearColor: CLEAR,
      viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
      observer: { exposure: { ev100: 12 } },
    });
    scene.view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
    right.camera.position.set(scene.view.camera.position);
    right.camera.direction.set(scene.view.camera.direction);
    right.camera.orient(Float64Array.of(1, 0, 0));
    right.camera.version++;
    const plain = await image(engine, scene);
    const shared = createPostStage({
      ...options,
      name: "per-view",
      slot: "display",
      uniforms: { red: { type: "f32", value: 0 } },
      shader: `fn postStage(input: PostInput) -> vec4<f32> {
        let c = postColorAt(input.pixel);
        return vec4<f32>(uniforms.red, c.g, c.b, c.a);
      }`,
      perView: ({ view: v }, values) => {
        values.setUniform("red", v === right ? 1 : 0);
      },
    });
    scene.view.observer.stages = [shared];
    right.observer.stages = [shared];
    const both = await image(engine, scene);
    const [lx, rx] = [4, WIDTH / 2 + 4];
    say(
      "one stage, two views: each draws its own value",
      at(both, lx, 4)[0] === 0 && at(both, rx, 4)[0] === 255,
      `left red ${at(both, lx, 4)[0]}, right red ${at(both, rx, 4)[0]}`,
    );
    const leaving = createPostStage({
      ...options,
      name: "per-view-off",
      slot: "display",
      shader: `fn postStage(input: PostInput) -> vec4<f32> {
        return vec4<f32>(1.0, 0.0, 1.0, 1.0);
      }`,
      perView: ({ view: v }, values) => {
        values.enabled = v !== right;
      },
    });
    scene.view.observer.stages = [leaving];
    right.observer.stages = [leaving];
    const one = await image(engine, scene);
    say(
      "one stage, two views: left out of one, the other still draws it",
      at(one, lx, 4)[1] === 0 && at(one, rx, 4)[1] === at(plain, rx, 4)[1],
      `left green ${at(one, lx, 4)[1]}, right green ${at(one, rx, 4)[1]} (was ${at(plain, rx, 4)[1]})`,
    );
    engine.removeView(right);
  }
  scene.dispose();
}

// --- the sky -----------------------------------------------------------------------
//
// Real stars and the real sky, with no scene. Earth-fixed axes equal ICRF here
// (`icrfToFixed` stays identity), so a view is aimed by right ascension and
// declination, and the sun is set per view.

type V3 = readonly [number, number, number];
const DEG = Math.PI / 180;
const sky3 = {
  dir: (ra: number, dec: number): V3 => [
    Math.cos(dec * DEG) * Math.cos(ra * DEG),
    Math.cos(dec * DEG) * Math.sin(ra * DEG),
    Math.sin(dec * DEG),
  ],
  add: (a: V3, b: V3, k = 1): V3 => [
    a[0] + b[0] * k,
    a[1] + b[1] * k,
    a[2] + b[2] * k,
  ],
  scale: (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: (a: V3): V3 => {
    const k = 1 / Math.hypot(a[0], a[1], a[2]);
    return [a[0] * k, a[1] * k, a[2] * k];
  },
  cross: (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
};

interface SkyPose {
  position: V3;
  direction: V3;
  up: V3;
  sun: V3;
  /** The larger field of view, degrees. */
  fov: number;
  /** A camera's EV100 for this view. */
  ev100: number;
}

const NORTH: V3 = [0, 0, 1];
const GALACTIC_NORTH = sky3.dir(192.85948, 27.12825);
const orthoUp = (d: V3, up: V3) => sky3.norm(sky3.add(up, d, -sky3.dot(up, d)));

/** Looking out from 2,000 km up, the sun behind the Earth. */
const inSpace = (
  direction: V3,
  up: V3,
  fov: number,
  ev100: number,
): SkyPose => ({
  position: sky3.scale(direction, RADIUS + 2_000_000),
  direction,
  up,
  sun: sky3.scale(direction, -1),
  fov,
  ev100,
});

/** From 400 km, the Milky Way's core over the limb. */
function limbPose(sunAbove: boolean): SkyPose {
  const direction = sky3.dir(266.4, -29);
  const up = orthoUp(direction, GALACTIC_NORTH);
  const tilt = 7.2 * DEG;
  const radial = sky3.norm(
    sky3.add(sky3.scale(up, Math.cos(tilt)), direction, -Math.sin(tilt)),
  );
  const horizontal = sky3.norm(sky3.add(direction, radial, Math.sin(tilt)));
  const side = sky3.cross(horizontal, radial);
  const across = sky3.norm(
    sky3.add(
      sky3.scale(horizontal, Math.cos(18 * DEG)),
      side,
      Math.sin(18 * DEG),
    ),
  );
  const below = 45 * DEG;
  return {
    position: sky3.scale(radial, RADIUS + 400_000),
    direction,
    up,
    sun: sunAbove
      ? radial
      : sky3.norm(
          sky3.add(
            sky3.scale(across, Math.cos(below)),
            radial,
            -Math.sin(below),
          ),
        ),
    fov: 80,
    ev100: sunAbove ? 13 : -6.5,
  };
}

const SKY_POSES: Record<string, SkyPose> = {
  orion: inSpace(sky3.dir(84, 7), NORTH, 66, -6.5),
  core: inSpace(
    sky3.dir(266.4, -29),
    orthoUp(sky3.dir(266.4, -29), GALACTIC_NORTH),
    100,
    -6.5,
  ),
  limb: limbPose(false),
  limbDay: limbPose(true),
  // 2 m up, looking along the horizon, the sun 45° up behind the right shoulder.
  day: {
    position: [RADIUS + 2, 0, 0],
    direction: [0, 1, 0],
    up: [1, 0, 0],
    sun: sky3.norm([1, -0.4, 0.8]),
    fov: 66,
    ev100: 15,
  },
};

/** A view of the real sky, with no scene. */
class SkyScene {
  readonly target: OffscreenTarget;
  readonly world: World;
  readonly view: View;

  constructor(
    readonly engine: Engine,
    width: number,
    height: number,
    exposure: Exposure,
  ) {
    this.target = new OffscreenTarget(width, height);
    this.world = engine.createWorld({
      maxDraws: 4,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    this.view = engine.addView({
      target: this.target,
      world: this.world,
      background: "atmosphere",
      sunDisk: true,
      observer: { exposure },
    });
  }

  /** Aims the view, and the engine's sun with it. */
  aim(pose: SkyPose): void {
    const { camera } = this.view;
    camera.position.set(pose.position);
    camera.direction.set(pose.direction);
    camera.fov = pose.fov * DEG;
    camera.orient(Float64Array.from(pose.up));
    camera.version++;
    this.engine.sunDirection.set(pose.sun);
  }

  dispose(): void {
    this.engine.removeWorld(this.world);
  }
}

/** Ticks until `done`, or the count runs out. */
async function ticks(engine: Engine, count: number, done = () => false) {
  for (let i = 0; i < count && !done(); i++) {
    engine.renderFrame();
    await engine.gpu.device.queue.onSubmittedWorkDone();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const skyMapFaces = ["px", "mx", "py", "my", "pz", "mz"].map(
  (face) =>
    new URL(
      `../../engine/Source/Assets/Textures/SkyBox/tycho2t3_80_${face}.jpg`,
      import.meta.url,
    ),
);

/** The stars this page draws: `?pack=local`'s, or today's map, loaded anew. */
async function skyStars(engine: Engine): Promise<void> {
  engine.raster.sky.setStarField(null);
  if (params.get("pack") === "local") {
    void engine.setSkyPack("/sky-pack/");
  } else {
    engine.setStarMap(skyMapFaces);
  }
  const sky = engine.raster.sky as unknown as {
    starCount: number;
    uploading: boolean;
  };
  const scene = new SkyScene(engine, 16, 16, { ev100: 0 });
  scene.aim(SKY_POSES.orion!);
  await ticks(engine, 4000, () => sky.starCount > 0 && !sky.uploading);
  scene.dispose();
  engine.removeView(scene.view);
}

/** A star field of these stars (direction, illuminance, color), over black. */
function starField(
  stars: readonly { d: V3; lux: number; color?: V3 }[],
): StarField {
  const points = new Float32Array(stars.length * 8);
  stars.forEach(({ d, lux, color = [1, 1, 1] }, i) => {
    points.set([...d, lux, ...color, 0], i * 8);
  });
  return {
    points,
    count: stars.length,
    backgroundLevels: Array.from({ length: 6 }, () => [new Float32Array(4)]),
    backgroundSize: 1,
    holdsFaintStars: false,
    meanBackground: 0,
  };
}

async function setStars(engine: Engine, field: StarField): Promise<void> {
  const sky = engine.raster.sky;
  sky.setStarField(field);
  while (sky.advanceUpload()) {
    /* until complete */
  }
}

/** Luminance around (x, y), over what the ring just outside it holds. */
function lightAround(
  image: { width: number; data: ArrayLike<number> },
  x: number,
  y: number,
  radius: number,
  channel = (i: number) =>
    0.2126 * image.data[i]! +
    0.7152 * image.data[i + 1]! +
    0.0722 * image.data[i + 2]!,
): number {
  let sum = 0;
  let count = 0;
  let ring = 0;
  let rings = 0;
  const [cx, cy] = [Math.floor(x), Math.floor(y)];
  for (let py = cy - radius - 2; py <= cy + radius + 2; py++) {
    for (let px = cx - radius - 2; px <= cx + radius + 2; px++) {
      const v = channel((py * image.width + px) * 4);
      if (Math.abs(px - cx) <= radius && Math.abs(py - cy) <= radius) {
        sum += v;
        count++;
      } else {
        ring += v;
        rings++;
      }
    }
  }
  return sum - (ring / rings) * count;
}

/** Sets what `Sky.write` reads as the display's density. */
function setPixelRatio(ratio: number): void {
  Object.defineProperty(globalThis, "devicePixelRatio", {
    value: ratio,
    configurable: true,
  });
}

/** One star on the GPU: where its light goes, at each spread and density. */
async function pointsGroup(engine: Engine, say: Say): Promise<void> {
  const saved = Float64Array.from(engine.sunDirection);
  const savedRatio = globalThis.devicePixelRatio;
  const [W, H] = [640, 360];
  const pose = SKY_POSES.orion!;
  const scene = new SkyScene(engine, W, H, { ev100: 0 });
  scene.aim(pose);
  const tanY = Math.tan(scene.view.camera.fovy(W / H) / 2);
  const tanX = tanY * (W / H);
  const omega = ((2 * tanY) / H) ** 2;
  const right = sky3.norm(sky3.cross(pose.direction, pose.up));
  const place = (share: number) =>
    sky3.norm(sky3.add(pose.direction, right, share * tanX));
  const render = async () => {
    const read = scene.view.readHdr();
    engine.renderFrame();
    await engine.gpu.device.queue.onSubmittedWorkDone();
    return read;
  };
  const LUX = 1e-3;
  const SPREADS: [string, PointSpread][] = [
    ["σ 0.55", { core: 0.55 }],
    ["σ 0.85", { core: 0.85 }],
    ["today's", { core: 0.6, wing: { sigma: 3, share: 0.05 } }],
  ];
  await setStars(engine, starField([{ d: place(0), lux: LUX }]));
  for (const ratio of [1, 2]) {
    setPixelRatio(ratio);
    for (const [name, spread] of SPREADS) {
      scene.view.observer.pointSpread = spread;
      const hdr = await render();
      const found = lightAround(hdr, W / 2, H / 2, 24) * omega;
      say(
        `a star's summed light in readHdr: ${name}, ratio ${ratio}`,
        Math.abs(found / LUX - 1) < 0.01,
        `${(found / LUX).toFixed(4)} of its illuminance`,
      );
    }
  }
  setPixelRatio(savedRatio);
  // The spike's edge figure: 1.71 against 1.49, through the picture, at 85% of the
  // half-width. In linear light it's the pixel's solid angle; past that, the curve.
  scene.view.observer.pointSpread = { core: 0.85 };
  const share = 0.85;
  const edgeD = place(share);
  const z = sky3.dot(edgeD, pose.direction);
  const expected = 1 / z ** 3;
  const edgeX = (W / 2) * (1 + share);
  const lit = async (lux: number, d: V3, x: number) => {
    await setStars(engine, starField([{ d, lux }]));
    const hdr = await render();
    return {
      hdr: lightAround(hdr, x, H / 2, 8),
      // Through the same curve by hand, from the same light.
      curve: lightAround(hdr, x, H / 2, 8, (i) => {
        const k = ev100ToScale(0);
        const c = pbrNeutral([
          hdr.data[i]! * k,
          hdr.data[i + 1]! * k,
          hdr.data[i + 2]! * k,
        ]);
        return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
      }),
      picture: await scene.target.read().then((image) =>
        lightAround({ width: W, data: image }, x, H / 2, 8, (i) => {
          const v = image[i + 1]! / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        }),
      ),
    };
  };
  for (const peak of [0.005, 0.02, 0.06, 0.3]) {
    // The light that shows this share of white at the center's peak pixel.
    const lux = (peak / ev100ToScale(0) / 0.197) * omega;
    const center = await lit(lux, place(0), W / 2);
    const edge = await lit(lux, edgeD, edgeX);
    say(
      `the edge against the center, peak ${peak} of white`,
      Math.abs(edge.hdr / center.hdr / expected - 1) < 0.02,
      `linear ${(edge.hdr / center.hdr).toFixed(3)} (1/z³ ${expected.toFixed(3)}); the curve by hand ${(edge.curve / center.curve).toFixed(3)}; the picture ${(edge.picture / center.picture).toFixed(3)}`,
    );
  }
  scene.dispose();
  engine.removeView(scene.view);
  engine.sunDirection.set(saved);
}

/** What compute leaves for each cell against `cullCell`, and the CPU path's image. */
async function cellsGroup(engine: Engine, say: Say): Promise<void> {
  await skyStars(engine);
  const sky = engine.raster.sky as unknown as {
    cells: readonly StarCell[];
    illuminance: Float32Array;
    starData: Float32Array;
  };
  const saved = Float64Array.from(engine.sunDirection);
  const { device } = engine.gpu;
  const views: [string, SkyPose][] = [
    ["Orion", SKY_POSES.orion!],
    ["the core", SKY_POSES.core!],
    ["the limb", SKY_POSES.limb!],
    ["a long lens", { ...SKY_POSES.orion!, fov: 5 }],
    ["a dim camera", { ...SKY_POSES.core!, ev100: 6 }],
  ];
  for (const [name, pose] of views) {
    const scene = new SkyScene(engine, 1280, 720, { ev100: pose.ev100 });
    scene.aim(pose);
    await ticks(engine, 3);
    const frame = engine.raster.viewFrames.get(scene.view)!;
    const read = device.createBuffer({
      size: 384 * 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    engine.renderFrame();
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(frame.sky.starArgs, 0, read, 0, 384 * 16);
    device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const args = new Uint32Array(read.getMappedRange().slice(0));
    read.destroy();
    const planes = sky.starData.subarray(12, 28);
    const minIlluminance = sky.starData[28]!;
    let cpu = 0;
    let gpu = 0;
    let wrong = 0;
    sky.cells.forEach((cell, c) => {
      const expected = cullCell(cell, planes, minIlluminance, sky.illuminance);
      const got = args[c * 4 + 1]!;
      cpu += expected;
      gpu += got;
      wrong += Math.abs(expected - got);
      wrong += args[c * 4]! === 4 && args[c * 4 + 3]! === cell.first ? 0 : 1e9;
    });
    say(
      `compute's arguments against cullCell: ${name}`,
      wrong <= 0.001 * Math.max(cpu, 1),
      `${gpu} stars against ${cpu}, of ${sky.illuminance.length}; ${wrong} off`,
    );
    const indirect = await scene.target.read();
    scene.world.submission = "direct";
    await ticks(engine, 2);
    const direct = await scene.target.read();
    const d = difference(indirect, direct);
    say(
      `the CPU path's image: ${name}`,
      d.largest <= 1 && d.pixels < 0.001 * indirect.length,
      `${d.pixels} pixels differ, by at most ${d.largest}/255`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  engine.sunDirection.set(saved);
}

/** A real pack (`?pack=local`): named stars' light and color, and a slow zoom. */
async function packGroup(engine: Engine, say: Say): Promise<void> {
  if (params.get("pack") !== "local") {
    say("needs ?pack=local", true, "skipped: no pack asked for");
    return;
  }
  await skyStars(engine);
  const saved = Float64Array.from(engine.sunDirection);
  const [W, H] = [1280, 720];
  const scene = new SkyScene(engine, W, H, { ev100: -3 });
  const pose = { ...inSpace(sky3.dir(92, 2), NORTH, 95, -3) };
  scene.aim(pose);
  await ticks(engine, 3);
  const hdrRead = scene.view.readHdr();
  engine.renderFrame();
  const hdr = await hdrRead;
  const tanY = Math.tan(scene.view.camera.fovy(W / H) / 2);
  const tanX = (tanY * W) / H;
  const pixel = (2 * tanY) / H;
  const right = sky3.norm(sky3.cross(pose.direction, pose.up));
  const up = sky3.cross(right, pose.direction);
  const light = (ra: number, dec: number) => {
    const d = sky3.dir(ra, dec);
    const z = sky3.dot(d, pose.direction);
    const x = ((sky3.dot(d, right) / (z * tanX)) * 0.5 + 0.5) * W;
    const y = (0.5 - (sky3.dot(d, up) / (z * tanY)) * 0.5) * H;
    const omega = pixel * pixel * z * z * z;
    const channel = (k: number) =>
      lightAround(hdr, x, y, 6, (i) => hdr.data[i + k]!) * omega;
    const lux = lightAround(hdr, x, y, 6) * omega;
    return { lux, red: channel(0), blue: channel(2) };
  };
  // HYG v4.1's places and magnitudes, which the pack follows.
  const sirius = light(101.28716, -16.71612);
  const rigel = light(78.63447, -8.20164);
  const betelgeuse = light(88.79294, 7.40706);
  const ratio = (a: number, b: number) => 10 ** (0.4 * (b - a));
  const close = (name: string, got: number, wanted: number) =>
    say(
      `${name}, summed light in readHdr`,
      Math.abs(got / wanted - 1) < 0.05,
      `${got.toFixed(3)} against ${wanted.toFixed(3)} from their magnitudes`,
    );
  close("Sirius to Rigel", sirius.lux / rigel.lux, ratio(-1.44, 0.18));
  close("Rigel to Betelgeuse", rigel.lux / betelgeuse.lux, ratio(0.18, 0.45));
  say(
    "Betelgeuse is redder than Rigel",
    betelgeuse.red / betelgeuse.blue > rigel.red / rigel.blue,
    `red to blue: Betelgeuse ${(betelgeuse.red / betelgeuse.blue).toFixed(2)}, Rigel ${(rigel.red / rigel.blue).toFixed(2)}`,
  );
  scene.dispose();
  engine.removeView(scene.view);

  // 60° to 5°, a little at a time, in linear light: the largest step in the
  // image's mean against the steps around it.
  const zoom = new SkyScene(engine, 320, 180, { ev100: -3 });
  const steps: number[] = [];
  let was: number | undefined;
  const core = { ...SKY_POSES.core! };
  for (let fov = 60; fov >= 5; fov -= 0.5) {
    zoom.aim({ ...core, fov });
    const read = zoom.view.readHdr();
    engine.renderFrame();
    const { data } = await read;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i + 1]!;
    }
    const mean = sum / (data.length / 4);
    if (was !== undefined) {
      steps.push(Math.abs(mean - was) / was);
    }
    was = mean;
  }
  const worst = Math.max(...steps);
  const typical = [...steps].sort((a, b) => a - b)[steps.length >> 1]!;
  say(
    "a slow zoom from 60° to 5° doesn't pop",
    worst < 0.1,
    `largest step in the mean ${(100 * worst).toFixed(2)}%; the median ${(100 * typical).toFixed(2)}%`,
  );
  zoom.dispose();
  engine.removeView(zoom.view);
  engine.sunDirection.set(saved);
}

/** Until a scene's stages can draw, and once more. */
async function ticksWithStages(engine: Engine, scene: Scene): Promise<void> {
  await image(engine, scene);
}

/** The fudges gone: the eye by scene, with the point limit, and the twilight table. */
async function fudgesGroup(engine: Engine, say: Say): Promise<void> {
  await skyStars(engine);
  const saved = Float64Array.from(engine.sunDirection);
  const [W, H] = [1280, 720];
  const eye: Exposure = { eye: true, speed: 1e6 };
  const shoot = async (pose: SkyPose, exposure: Exposure, limit = true) => {
    const scene = new SkyScene(engine, W, H, exposure);
    if (limit) {
      scene.view.observer = { stages: [eyeLimitStage()] };
    }
    scene.aim(pose);
    await ticks(engine, 60);
    engine.renderFrame();
    await engine.gpu.device.queue.onSubmittedWorkDone();
    const image = await scene.target.read();
    const read = scene.view.readout();
    scene.dispose();
    engine.removeView(scene.view);
    return { image, read };
  };
  /** Pixels at least this far above their row's median green, off the Earth. */
  const brightPoints = (image: Uint8ClampedArray, above = 12) => {
    let found = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        const v = image[i + 1]!;
        if (
          v >= above &&
          v > image[i + 1 - 4]! &&
          v >= image[i + 1 + 4]! &&
          v > image[i + 1 - W * 4]! &&
          v >= image[i + 1 + W * 4]!
        ) {
          found++;
        }
      }
    }
    return found;
  };
  const night = await shoot(SKY_POSES.orion!, eye);
  say(
    "a moonless night: stars show",
    brightPoints(night.image) > 50,
    `${brightPoints(night.image)} points; EV100 ${night.read.ev100?.toFixed(2)}, cones ${night.read.cones?.toExponential(2)}`,
  );
  const noLimit = await shoot(SKY_POSES.orion!, eye, false);
  say(
    "the limit takes away points fainter than it",
    brightPoints(night.image, 4) < brightPoints(noLimit.image, 4),
    `${brightPoints(noLimit.image, 4)} points without it, ${brightPoints(night.image, 4)} with`,
  );
  const sunlit = await shoot(SKY_POSES.limbDay!, eye);
  // Above the limb, where the sky is black.
  let brightest = 0;
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < W; x++) {
      brightest = Math.max(brightest, sunlit.image[(y * W + x) * 4 + 1]!);
    }
  }
  say(
    "the sunlit Earth from orbit: stars gone",
    brightest <= 2,
    `the brightest pixel above the limb ${brightest}/255; EV100 ${sunlit.read.ev100?.toFixed(2)}, cones ${sunlit.read.cones?.toExponential(2)}`,
  );

  // Terrain under the eye at night: the limit leaves what was drawn alone.
  {
    const sun: V3 = [-1, 0, 0.1];
    engine.sunDirection.set(sun);
    const shot = async (stages: PostStage[]) => {
      const scene = new Scene(engine, {
        background: "atmosphere",
        exposure: eye,
        unlit: false,
      });
      scene.view.observer = { stages };
      await ticks(engine, 30);
      const image = await (async () => {
        await ticksWithStages(engine, scene);
        return scene.target.read();
      })();
      scene.dispose();
      engine.removeView(scene.view);
      return image;
    };
    const without = await shot([]);
    const withIt = await shot([eyeLimitStage()]);
    const middle = (data: Uint8ClampedArray) => {
      const out: number[] = [];
      for (let y = 30; y < 42; y++) {
        for (let x = 54; x < 74; x++) {
          out.push(...at(data, x, y).slice(0, 3));
        }
      }
      return out;
    };
    const d = difference(middle(without), middle(withIt));
    say(
      "terrain under the eye at night isn't touched by the limit",
      d.largest === 0,
      `${d.pixels} of its pixels differ, by at most ${d.largest}/255`,
    );
  }

  // The twilight table: the faintest of a list that shows at the zenith, the sun at
  // each depth. Its places and magnitudes are HYG v4.1's. Nothing's tuned to it.
  const NAMED: [string, number, number, number][] = [
    ["Vega", 279.2346, 38.7837, 0.03],
    ["Altair", 297.6958, 8.8683, 0.76],
    ["Deneb", 310.358, 45.2803, 1.25],
    ["Sadr", 305.5571, 40.2567, 2.23],
    ["Aljanah", 311.5527, 33.9703, 2.48],
    ["Okab", 286.3525, 13.8635, 2.99],
    ["γ Sge", 299.6893, 19.4921, 3.51],
    ["41 Cyg", 307.3489, 30.3686, 4.01],
    ["23 Vul", 303.9422, 27.8142, 4.5],
    ["a star of 5.0", 271.8698, 43.4619, 5],
    ["10 Vul", 295.9289, 25.7719, 5.5],
    ["a star of 6.0", 293.4234, 49.2623, 6],
  ];
  const zenith = sky3.dir(287, 30);
  const here = sky3.scale(zenith, RADIUS + 2);
  const pole: V3 = NORTH;
  const east = sky3.norm(sky3.cross(pole, zenith));
  for (const depth of [-6, -12, -18]) {
    const sun = sky3.norm(
      sky3.add(
        sky3.scale(east, Math.cos(depth * DEG)),
        zenith,
        Math.sin(depth * DEG),
      ),
    );
    const pose: SkyPose = {
      position: here,
      direction: zenith,
      up: orthoUp(zenith, pole),
      sun,
      fov: 80,
      ev100: 0,
    };
    const { image, read } = await shoot(pose, eye);
    const tanX = Math.tan(40 * DEG);
    const tanY = tanX * (H / W);
    const right = sky3.norm(sky3.cross(pose.direction, pose.up));
    const up = sky3.cross(right, pose.direction);
    const shown: string[] = [];
    let faintest = -Infinity;
    for (const [name, ra, dec, mag] of NAMED) {
      const d = sky3.dir(ra, dec);
      const z = sky3.dot(d, zenith);
      const x = Math.round(((sky3.dot(d, right) / (z * tanX)) * 0.5 + 0.5) * W);
      const y = Math.round((0.5 - (sky3.dot(d, up) / (z * tanY)) * 0.5) * H);
      if (z <= 0 || x < 12 || y < 12 || x >= W - 12 || y >= H - 12) {
        continue;
      }
      // Its peak in a 5 × 5 box, against the median of the ring at 8 px.
      let peak = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          peak = Math.max(peak, image[((y + dy) * W + x + dx) * 4 + 1]!);
        }
      }
      const ring: number[] = [];
      for (let a = 0; a < 16; a++) {
        const px = x + Math.round(8 * Math.cos((a * Math.PI) / 8));
        const py = y + Math.round(8 * Math.sin((a * Math.PI) / 8));
        ring.push(image[(py * W + px) * 4 + 1]!);
      }
      ring.sort((p, q) => p - q);
      if (peak >= ring[8]! + 2) {
        shown.push(`${name} ${mag}`);
        faintest = Math.max(faintest, mag);
      }
    }
    say(
      `the sun at ${depth}°: the faintest named star at the zenith`,
      true,
      `magnitude ${faintest === -Infinity ? "none" : faintest}; ${shown.length} of ${NAMED.length} show; the model's limit is magnitude ${(-2.5 * Math.log10(eyePointLimit(read.rods!) / MAGNITUDE_ZERO_ILLUMINANCE)).toFixed(1)}; cones ${read.cones?.toExponential(2)} cd/m², rods ${read.rods?.toExponential(2)}, EV100 ${read.ev100?.toFixed(2)}`,
    );
  }
  engine.sunDirection.set(saved);
}

/** Star time: `?time`, with `?pack=local`. Bright poses, at the spike's size. */
async function starTimes(engine: Engine, say: Say): Promise<void> {
  if (!params.has("time")) {
    return;
  }
  await skyStars(engine);
  const saved = Float64Array.from(engine.sunDirection);
  for (const [name, fov, who] of [
    ["core", 100, "camera"],
    ["orion", 66, "camera"],
    ["orion", 66, "eye"],
    ["orion", 5, "camera"],
  ] as const) {
    const pose = { ...SKY_POSES[name]!, fov };
    const exposure: Exposure =
      who === "eye" ? { eye: true, speed: 1e6 } : { ev100: pose.ev100 };
    const scene = new SkyScene(engine, 2560, 1440, exposure);
    scene.aim(pose);
    if (who === "eye") {
      scene.view.observer = { stages: [eyeLimitStage()] };
    }
    await ticks(engine, 60);
    const passes = engine.gpuPasses;
    const started = performance.now();
    let cpu = 0;
    for (let i = 0; i < 30; i++) {
      const t = performance.now();
      engine.renderFrame();
      cpu += performance.now() - t;
      await engine.gpu.device.queue.onSubmittedWorkDone();
    }
    say(
      `star time: ${name}, ${fov}°, ${who}`,
      true,
      `stars ${passes.stars?.toFixed(2)} ms, cull ${passes["star-cull"]?.toFixed(2) ?? "-"} ms, the limit ${passes["post.eye-point-limit"]?.toFixed(2) ?? "-"} ms, tick's CPU ${(cpu / 30).toFixed(2)} ms, over ${(performance.now() - started).toFixed(0)} ms`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  engine.sunDirection.set(saved);
}

/** The stills for the owner's review: `?stills`. */
async function stillsGroup(
  engine: Engine,
  say: Say,
  stills: Record<string, string>,
): Promise<void> {
  if (!params.has("stills")) {
    return;
  }
  await skyStars(engine);
  const saved = Float64Array.from(engine.sunDirection);
  for (const [name, pose] of Object.entries(SKY_POSES)) {
    for (const who of ["eye", "camera"]) {
      const exposure: Exposure =
        who === "eye" ? { eye: true, speed: 1e6 } : { ev100: pose.ev100 };
      const scene = new SkyScene(engine, 1280, 720, exposure);
      scene.aim(pose);
      if (who === "eye" && params.has("limit")) {
        scene.view.observer = { stages: [eyeLimitStage()] };
      }
      if (params.get("spread") === "today") {
        // The spread today's quads drew with, for comparing strips with them.
        scene.view.observer.pointSpread = {
          core: 0.6,
          wing: { sigma: 3, share: 0.05 },
        };
      }
      await ticks(engine, 40);
      const image = await (async () => {
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        return scene.target.read();
      })();
      stills[`${name}-${who}`] = await still(image, 1280, 720);
      const r = scene.view.readout();
      say(
        `${name}, ${who}`,
        true,
        `EV100 ${r.ev100?.toFixed(2)}, cones ${r.cones?.toExponential(2)}`,
      );
      scene.dispose();
      engine.removeView(scene.view);
    }
  }
  engine.sunDirection.set(saved);
}

// --- glare -------------------------------------------------------------------------

const SOURCE_FLOATS = 8;

/** The view's list as it stands: the header, the sun, and the records after it. */
async function readSources(engine: Engine, view: View): Promise<Float32Array> {
  const { device } = engine.gpu;
  const list = engine.raster.viewFrames.get(view)!.glare!.sources;
  const staging = device.createBuffer({
    size: list.size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(list, 0, staging, 0, list.size);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(staging.getMappedRange().slice(0));
  staging.unmap();
  staging.destroy();
  return out;
}

const sunRecord = (list: Float32Array) => ({
  count: list[0]!,
  z: list[1]!,
  pixel: [list[SOURCE_FLOATS]!, list[SOURCE_FLOATS + 1]!],
  visibility: list[SOURCE_FLOATS + 3]!,
  light: [
    list[SOURCE_FLOATS + 4]!,
    list[SOURCE_FLOATS + 5]!,
    list[SOURCE_FLOATS + 6]!,
  ],
  kind: list[SOURCE_FLOATS + 7]!,
});

const VEIL_ONLY = { tier: "full", veil: { share: 0.2 }, spikes: null } as const;

/** A view with glare, of the real sky; the sun set by the pose. */
function glareScene(
  engine: Engine,
  exposure: Exposure,
  width = 256,
  height = 256,
): SkyScene {
  const scene = new SkyScene(engine, width, height, exposure);
  scene.view.observer.glare = { ...VEIL_ONLY, veil: { share: 0.2 } };
  return scene;
}

/** The sun's light from the table itself, at zenith cosine `mu` from the ground. */
async function tableAt(engine: Engine, mu: number): Promise<number[]> {
  const { device } = engine.gpu;
  const staging = device.createBuffer({
    size: 256 * 8 * 64,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture: engine.raster.sky.sunLight },
    { buffer: staging, bytesPerRow: 256 * 8 },
    [256, 64],
  );
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const halves = new Uint16Array(staging.getMappedRange());
  const half = (h: number) => {
    const e = (h >> 10) & 31;
    const m = h & 1023;
    const v =
      e === 0
        ? m / 2 ** 24
        : e === 31
          ? Infinity
          : (1 + m / 1024) * 2 ** (e - 15);
    return h & 0x8000 ? -v : v;
  };
  const u = (0.5 + 0.5 * Math.sign(mu) * Math.sqrt(Math.abs(mu))) * 255;
  const [i, f] = [Math.floor(u), u - Math.floor(u)];
  const out = [0, 1, 2].map((c) => {
    const a = half(halves[i * 4 + c]!);
    const b = half(halves[(i + 1) * 4 + c]!);
    return (a + (b - a) * f) * 1e5;
  });
  staging.unmap();
  staging.destroy();
  return out;
}

/** A pose on the ground at elevation `degrees`, the sun straight ahead. */
const groundSun = (degrees: number, fov = 3): SkyPose => {
  const e = degrees * DEG;
  const direction: V3 = [Math.sin(e), Math.cos(e), 0];
  return {
    position: [RADIUS + 2, 0, 0],
    direction,
    up: [0, 0, 1],
    sun: direction,
    fov,
    ev100: 15,
  };
};

/** The share of a disc of radius `r` a disc of radius `m` covers, `d` from it. */
function discOverlap(r: number, m: number, d: number): number {
  if (d >= r + m) {
    return 0;
  }
  if (d <= Math.abs(m - r)) {
    return Math.min(1, (m * m) / (r * r));
  }
  return (
    (r * r * Math.acos((d * d + r * r - m * m) / (2 * d * r)) +
      m * m * Math.acos((d * d + m * m - r * r) / (2 * d * m)) -
      0.5 * Math.sqrt((-d + r + m) * (d + r - m) * (d - r + m) * (d + r + m))) /
    (Math.PI * r * r)
  );
}

async function sourcesGroup(engine: Engine, say: Say): Promise<void> {
  const saved = Float64Array.from(engine.sunDirection);
  await engine.ctx.pipelines.glare();
  // A box half across the sun.
  {
    const scene = glareScene(engine, { ev100: 15 });
    const pose = groundSun(30);
    scene.aim(pose);
    scene.view.camera.direction.set(pose.direction);
    scene.view.camera.orient(Float64Array.from(pose.up));
    await ticks(engine, 10);
    const open = sunRecord(await readSources(engine, scene.view));
    say(
      "nothing across the sun: it's all seen",
      open.visibility === 1 && open.kind === 1,
      `visibility ${open.visibility}, kind ${open.kind}`,
    );
    const along = 3 / Math.cos(30 * DEG);
    scene.world.addDraw({
      mesh: scene.world.addMesh(quad),
      origin: Float64Array.of(RADIUS + 2 + along * Math.sin(30 * DEG), 3, 1),
      color: [0.5, 0.5, 0.5, 1],
      unlit: true,
      doubleSided: true,
    });
    await ticks(engine, 10);
    const half = sunRecord(await readSources(engine, scene.view));
    say(
      "a box half across the sun: 0.5 ± 0.07",
      Math.abs(half.visibility - 0.5) <= 0.07,
      `visibility ${half.visibility}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // The eclipse of 2024-04-08: the sun and Moon of that date, with the Earth's axes
  // taken as the ICRF's at that moment, from the line of totality and away from it.
  {
    const scene = glareScene(engine, { ev100: 15 });
    const when = Date.UTC(2024, 3, 8, 18, 18, 0);
    const sun = sunPosition(when, new Float64Array(3));
    const moon = moonPosition(when, new Float64Array(3));
    const toSun = sky3.norm([sun[0]!, sun[1]!, sun[2]!]);
    const moonAt: V3 = [moon[0]!, moon[1]!, moon[2]!];
    // Where the line from the sun through the Moon meets the Earth.
    const along = -sky3.dot(moonAt, toSun);
    const foot = sky3.add(moonAt, toSun, along);
    const off = Math.hypot(foot[0], foot[1], foot[2]);
    const center = sky3.add(
      foot,
      toSun,
      Math.sqrt(Math.max(RADIUS * RADIUS - off * off, 0)),
    );
    const side = sky3.norm(sky3.cross(toSun, NORTH));
    const seenAt: string[] = [];
    let worst = 0;
    const sunDistance = Math.hypot(sun[0]!, sun[1]!, sun[2]!);
    for (const shift of [0, 1_500_000, 2_500_000, 3_500_000]) {
      const position = sky3.scale(
        sky3.norm(sky3.add(center, side, shift)),
        RADIUS + 2,
      );
      const towardMoon = sky3.add(moonAt, position, -1);
      const moonDistance = Math.hypot(...towardMoon);
      const moonDir = sky3.norm(towardMoon);
      scene.aim({
        position,
        direction: toSun,
        up: side,
        sun: toSun,
        fov: 3,
        ev100: 15,
      });
      engine.moonPosition = Float64Array.from(moonAt);
      await ticks(engine, 4);
      const { visibility } = sunRecord(await readSources(engine, scene.view));
      const d = Math.acos(Math.min(sky3.dot(moonDir, toSun), 1));
      const overlap = discOverlap(
        0.00935 / 2,
        Math.asin(1_737_400 / moonDistance),
        d,
      );
      worst = Math.max(worst, Math.abs(1 - visibility - overlap));
      seenAt.push(
        `${shift / 1000} km: ${visibility.toFixed(3)} v ${(1 - overlap).toFixed(3)}`,
      );
    }
    void sunDistance;
    engine.moonPosition = undefined;
    say(
      "the eclipse of 2024-04-08: the overlap within 0.08",
      worst <= 0.08,
      seenAt.join(", "),
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // The table's color.
  {
    const scene = glareScene(engine, { ev100: 15 });
    for (const elevation of [2, 45]) {
      scene.aim(groundSun(elevation));
      await ticks(engine, 4);
      const { light } = sunRecord(await readSources(engine, scene.view));
      const table = await tableAt(engine, Math.sin(elevation * DEG));
      const worst = Math.max(
        ...light.map((v, i) =>
          table[i]! > 0 ? Math.abs(v / table[i]! - 1) : v === 0 ? 0 : 1,
        ),
      );
      say(
        `the sun's light at ${elevation}° is the table's within 1%`,
        worst < 0.01,
        `${light.map((v) => v.toFixed(0)).join(", ")} v ${table.map((v) => v.toFixed(0)).join(", ")}`,
      );
    }
    scene.view.lighting.sunIlluminance = 50_000;
    await ticks(engine, 4);
    const set = sunRecord(await readSources(engine, scene.view));
    say(
      "a set illuminance is that number",
      set.light.every((v) => v === 50_000),
      set.light.join(", "),
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // Just off screen, and behind the camera.
  {
    const scene = glareScene(engine, { ev100: 15 });
    const pose = groundSun(30, 20);
    const e = 30 * DEG;
    const up: V3 = [Math.cos(e), -Math.sin(e), 0];
    scene.aim({
      ...pose,
      direction: sky3.norm(sky3.add(pose.sun, up, Math.tan(11 * DEG))),
    });
    await ticks(engine, 4);
    const off = sunRecord(await readSources(engine, scene.view));
    say(
      "a sun just off screen reads 1",
      off.visibility === 1 && (off.pixel[0]! < 0 || off.pixel[0]! > 256),
      `visibility ${off.visibility}, at ${off.pixel.map((p) => p.toFixed(0)).join(", ")}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // Across the Earth's limb from orbit: no step over 3/32.
  {
    const scene = glareScene(engine, { ev100: 15 });
    const altitude = 400_000;
    const position: V3 = [RADIUS + altitude, 0, 0];
    const dip = Math.acos(RADIUS / (RADIUS + altitude));
    const sunRadius = 0.00935 / 2;
    let last = -1;
    let worst = 0;
    const seen: number[] = [];
    for (let i = 0; i <= 64; i++) {
      // The sun's center from 2 radii above the limb to 2 below it.
      const elevation = -dip + sunRadius * (2 - (i / 64) * 4);
      const sun: V3 = [Math.sin(elevation), Math.cos(elevation), 0];
      scene.aim({
        position,
        direction: sun,
        up: [0, 0, 1],
        sun,
        fov: 10,
        ev100: 15,
      });
      await ticks(engine, 2);
      const { visibility } = sunRecord(await readSources(engine, scene.view));
      seen.push(visibility);
      if (last >= 0) {
        worst = Math.max(worst, Math.abs(visibility - last));
      }
      last = visibility;
    }
    say(
      "across the Earth's limb from orbit it goes from 1 to 0, in small steps",
      seen[0] === 1 && seen[seen.length - 1] === 0 && worst <= 3 / 32 + 1e-6,
      `first ${seen[0]}, last ${seen[seen.length - 1]}, largest step ${worst.toFixed(3)}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // No sky.
  {
    const scene = new Scene(engine, { background: "color" });
    scene.view.observer.glare = { ...VEIL_ONLY, veil: { share: 0.2 } };
    await ticks(engine, 4);
    const none = sunRecord(await readSources(engine, scene.view));
    say(
      "with no sky there's no source",
      none.visibility === 0 && none.kind === 0,
      `visibility ${none.visibility}, kind ${none.kind}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  engine.sunDirection.set(saved);
}

/** A view's light after glare, once its passes are ready. */
async function readAfterGlare(engine: Engine, view: View) {
  const read = view.readHdr({ after: "glare" });
  engine.renderFrame();
  await engine.gpu.device.queue.onSubmittedWorkDone();
  await ticks(engine, 2);
  return read;
}

async function readBeforeGlare(engine: Engine, view: View) {
  const read = view.readHdr();
  engine.renderFrame();
  await engine.gpu.device.queue.onSubmittedWorkDone();
  await ticks(engine, 2);
  return read;
}

/** Ticks until the view's chain draws its stages. */
async function veilReady(engine: Engine, view: View): Promise<void> {
  await engine.ctx.pipelines.glare();
  await ticks(engine, 200, () => {
    const { chain } = engine.raster.viewFrames.get(view) ?? {};
    return !!chain && chain.slots.scene!.latest().name.startsWith("post.glare");
  });
}

function imageRange(data: Float32Array): {
  bad: number;
  least: number;
  most: number;
} {
  let bad = 0;
  let least = Infinity;
  let most = -Infinity;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c]!;
      if (!Number.isFinite(v)) {
        bad++;
      } else {
        least = Math.min(least, v);
        most = Math.max(most, v);
      }
    }
  }
  return { bad, least, most };
}

async function veilGroup(engine: Engine, say: Say): Promise<void> {
  const saved = Float64Array.from(engine.sunDirection);
  // A synthetic star's veil against the formula.
  {
    const size = 1024;
    const fov = 60;
    const d = sky3.dir(84, 7);
    const lux = 0.02; // Under the star's clamp (sky.slang STAR_MAX).
    await setStars(engine, starField([{ d, lux }]));
    const scene = glareScene(engine, { ev100: 5 }, size, size);
    scene.aim({ ...inSpace(d, NORTH, fov, 5), fov });
    await veilReady(engine, scene.view);
    await ticks(engine, 4);
    const before = await readBeforeGlare(engine, scene.view);
    const after = await readAfterGlare(engine, scene.view);
    const angle = (2 * Math.tan((fov * DEG) / 2)) / size;
    const weights = veilWeights(angle, VEIL_LEVELS, 2);
    const scale = (lux * 0.2) / (angle * angle);
    const lines: string[] = [];
    let worst = 0;
    for (const degrees of [1, 2, 4, 8, 12, 16, 20]) {
      const r = (Math.tan(degrees * DEG) / angle) | 0;
      let sum = 0;
      let count = 0;
      for (let a = 0; a < 64; a++) {
        const x = Math.round(size / 2 + r * Math.cos((a * Math.PI) / 32));
        const y = Math.round(size / 2 + r * Math.sin((a * Math.PI) / 32));
        const i = (y * size + x) * 4 + 1;
        sum += after.data[i]! - before.data[i]!;
        count++;
      }
      const seen = sum / count;
      const wanted = scale * veilSpread(r, weights, 2);
      worst = Math.max(worst, Math.abs(seen / wanted - 1));
      lines.push(`${degrees}°: ${(seen / wanted).toFixed(3)}`);
    }
    say(
      // Near the view's edge, clamping at it gives a little back (a flat image stays flat).
      "a star's veil is the formula within 12%, 1° to 20°",
      worst <= 0.12,
      lines.join(", "),
    );
    const sum = (data: Float32Array) => {
      let total = 0;
      for (let i = 1; i < data.length; i += 4) {
        total += data[i]!;
      }
      return total;
    };
    const [a, b] = [sum(before.data), sum(after.data)];
    say(
      "a star's summed light holds, less what leaves the view",
      b <= a * 1.02 && b >= a * 0.9,
      `after / before ${(b / a).toFixed(4)}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
    engine.raster.sky.setStarField(null);
  }
  // The sun, at the exposures' limits.
  for (const [name, exposure] of Object.entries({
    "EV100 -12": { ev100: -12 },
    "EV100 5": { ev100: 5 },
    "EV100 15": { ev100: 15 },
    "EV100 18": { ev100: 18 },
    "a scale of 1": { scale: 1 },
  }) as [string, Exposure][]) {
    const scene = glareScene(engine, exposure);
    scene.aim(groundSun(30, 60));
    await veilReady(engine, scene.view);
    await ticks(engine, 2);
    const { data } = await readAfterGlare(engine, scene.view);
    const { bad, least, most } = imageRange(data);
    const shown = scene.target.read();
    const probe = await shown;
    say(
      `the sun at ${name}: finite, not below 0`,
      bad === 0 && least >= 0 && probe.length > 0,
      `not finite ${bad}, from ${least.toExponential(2)} to ${most.toExponential(2)}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // The meter doesn't see it.
  {
    const reading = async (glare: boolean) => {
      const scene = new SkyScene(engine, 256, 256, {
        auto: true,
        speed: 1000,
      });
      if (glare) {
        scene.view.observer.glare = { ...VEIL_ONLY, veil: { share: 0.2 } };
      }
      scene.aim(groundSun(30, 60));
      if (glare) {
        await veilReady(engine, scene.view);
      }
      await ticks(engine, 60);
      const { ev100 } = scene.view.readout();
      scene.dispose();
      engine.removeView(scene.view);
      return ev100!;
    };
    const [without, withGlare] = [await reading(false), await reading(true)];
    say(
      "the meter reads the same with glare on and off, to 4 decimals",
      Math.abs(without - withGlare) < 5e-4,
      `${without.toFixed(5)} v ${withGlare.toFixed(5)}`,
    );
  }
  // Across things, tick by tick: no pop.
  const moves: Record<string, (t: number) => SkyPose> = {
    "at the Earth's limb from orbit": (t) => {
      const altitude = 400_000;
      const dip = Math.acos(RADIUS / (RADIUS + altitude));
      const elevation = -dip + (0.00935 / 2) * (1.2 - t * 2.4);
      const sun: V3 = [Math.sin(elevation), Math.cos(elevation), 0];
      return {
        position: [RADIUS + altitude, 0, 0],
        direction: sky3.norm([-0.25, 1, 0]),
        up: [1, 0.25, 0],
        sun,
        fov: 60,
        ev100: 15,
      };
    },
    "leaving the screen": (t) => {
      const e = 30 * DEG;
      const sun: V3 = [Math.sin(e), Math.cos(e), 0];
      const up: V3 = [Math.cos(e), -Math.sin(e), 0];
      return {
        position: [RADIUS + 2, 0, 0],
        direction: sky3.norm(sky3.add(sun, up, Math.tan((26 + t * 8) * DEG))),
        up: [0, 0, 1],
        sun,
        fov: 60,
        ev100: 15,
      };
    },
  };
  for (const [name, pose] of Object.entries(moves)) {
    const scene = glareScene(engine, { ev100: 15 });
    scene.aim(pose(0));
    await veilReady(engine, scene.view);
    // A ring around the sun: what the veil moves, with no disc's pixels.
    const patch: number[] = [];
    let bad = 0;
    for (let i = 0; i <= 64; i++) {
      scene.aim(pose(i / 64));
      await ticks(engine, 1);
      const { data } = await readAfterGlare(engine, scene.view);
      bad += imageRange(data).bad;
      const { pixel } = sunRecord(await readSources(engine, scene.view));
      // Off the screen, a fixed patch: a ring would change which pixels it has.
      const [cx, cy, radius] =
        name === "leaving the screen"
          ? [128, 128, 8]
          : [pixel[0]!, pixel[1]!, 40];
      let sum = 0;
      let count = 0;
      for (let a = 0; a < 32; a++) {
        const x = Math.round(cx + radius * Math.cos((a * Math.PI) / 16));
        const y = Math.round(cy + radius * Math.sin((a * Math.PI) / 16));
        if (x >= 0 && y >= 0 && x < 256 && y < 256) {
          sum += data[(y * 256 + x) * 4 + 1]!;
          count++;
        }
      }
      patch.push(sum / Math.max(count, 1));
    }
    let step = 0;
    for (let i = 1; i < patch.length; i++) {
      step = Math.max(step, Math.abs(patch[i]! - patch[i - 1]!));
    }
    const range = Math.max(...patch) - Math.min(...patch);
    say(
      `the sun ${name}: no pop`,
      bad === 0 && step <= range * 0.12,
      `not finite ${bad}; largest change between ticks ${((step / range) * 100).toFixed(1)}% of the whole, from ${patch[0]!.toFixed(1)} to ${patch[patch.length - 1]!.toFixed(1)} cd/m²`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // Its time, at 2560×1440, by its passes' timers.
  {
    const scene = glareScene(engine, { ev100: 15 }, 2560, 1440);
    scene.aim(groundSun(30, 60));
    await veilReady(engine, scene.view);
    const times: number[] = [];
    let parts = "";
    for (let i = 0; i < 80; i++) {
      await ticks(engine, 1);
      let sum = 0;
      parts = Object.entries(engine.gpuPasses)
        .filter(([label]) => label.includes("glare"))
        .map(
          ([label, ms]) =>
            `${label.replace("post.glare.", "")} ${ms.toFixed(2)}`,
        )
        .join(", ");
      for (const [label, ms] of Object.entries(engine.gpuPasses)) {
        if (label.includes("glare")) {
          sum += ms;
        }
      }
      if (i > 20 && sum > 0) {
        times.push(sum);
      }
    }
    scene.dispose();
    engine.removeView(scene.view);
    times.sort((a, b) => a - b);
    say(
      "the veil's time at 2560×1440 (target 1.5 ms; the spike's 2.75)",
      true,
      `${(times[times.length >> 1] ?? 0).toFixed(2)} ms: ${parts}`,
    );
  }
  engine.sunDirection.set(saved);
}

/** The kernel's levels as floats, from a box filter: the reference is here alone. */
function kernelImageOf(kernel: {
  texels: Float32Array;
  size: number;
}): Float32Array[] {
  const levels = [kernel.texels];
  let n = kernel.size;
  while (n > 4) {
    const from = levels[levels.length - 1]!;
    const m = n >> 1;
    const next = new Float32Array(m * m * 4);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < m; x++) {
        for (let c = 0; c < 4; c++) {
          next[(y * m + x) * 4 + c] =
            (from[(y * 2 * n + x * 2) * 4 + c]! +
              from[(y * 2 * n + x * 2 + 1) * 4 + c]! +
              from[((y * 2 + 1) * n + x * 2) * 4 + c]! +
              from[((y * 2 + 1) * n + x * 2 + 1) * 4 + c]!) /
            4;
        }
      }
    }
    levels.push(next);
    n = m;
  }
  return levels;
}

const SPIKES = { aperture: "vanes", share: 0.05, extent: 3 } as const;

async function spritesReady(engine: Engine, view: View): Promise<void> {
  await veilReady(engine, view);
  await ticks(
    engine,
    2000,
    () => !!engine.raster.glareKernels.get(SPIKES.aperture),
  );
  await ticks(engine, 3);
}

async function spritesGroup(engine: Engine, say: Say): Promise<void> {
  const saved = Float64Array.from(engine.sunDirection);
  const glare = {
    tier: "full",
    veil: { share: 0.2 },
    spikes: { ...SPIKES },
  } as const;
  // A star's spikes against the same kernel's values, peak-normalized.
  {
    const size = 1024;
    const fov = 20;
    const d = sky3.dir(84, 7);
    const lux = 0.002;
    await setStars(engine, starField([{ d, lux }]));
    const scene = new SkyScene(engine, size, size, { ev100: 0 });
    scene.view.observer.glare = { ...glare, spikes: { ...SPIKES } };
    scene.aim({ ...inSpace(d, NORTH, fov, 0), fov });
    await spritesReady(engine, scene.view);
    const { glare: state } = engine.raster.viewFrames.get(scene.view)!;
    void state;
    const list = await readSources(engine, scene.view);
    const count = list[0]!;
    const star = list.subarray(SOURCE_FLOATS * 2, SOURCE_FLOATS * 3);
    const veilOnly = await (async () => {
      const read = scene.view.readHdr({ after: "glare" });
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
      await ticks(engine, 2);
      return read;
    })();
    scene.view.observer.glare.spikes = null;
    await veilReady(engine, scene.view);
    await ticks(engine, 3);
    const without = await readAfterGlare(engine, scene.view);
    const kernel = kernelImageOf(computeKernel(SPIKES.aperture, 1024));
    const angle = (2 * Math.tan((fov * DEG) / 2)) / size;
    const cell = (2 * SPIKES.extent * DEG) / 1024;
    const cellsPerPixel = angle / cell;
    const lod = Math.max(Math.log2(cellsPerPixel), 0);
    const bilinear = (level: number, u: number, v: number) => {
      const n = 1024 >> level;
      const [x, y] = [u * n - 0.5, v * n - 0.5];
      const [x0, y0] = [Math.floor(x), Math.floor(y)];
      const [fx, fy] = [x - x0, y - y0];
      const at = (i: number, j: number) => kernel[level]![(j * n + i) * 4 + 1]!;
      return (
        (1 - fy) * ((1 - fx) * at(x0, y0) + fx * at(x0 + 1, y0)) +
        fy * ((1 - fx) * at(x0, y0 + 1) + fx * at(x0 + 1, y0 + 1))
      );
    };
    const lines: string[] = [];
    let worst = 0;
    let peak = 0;
    const samples: { seen: number; wanted: number }[] = [];
    // Along the spikes' axis: the image's diagonal, from the star.
    for (const r of [30, 50, 70, 90, 110]) {
      const px = Math.round(size / 2 + r * Math.SQRT1_2);
      const py = Math.round(size / 2 + r * Math.SQRT1_2);
      const seen =
        veilOnly.data[(py * size + px) * 4 + 1]! -
        without.data[(py * size + px) * 4 + 1]!;
      const u = 0.5 + ((px + 0.5 - size / 2) * cellsPerPixel) / 1024;
      const v = 0.5 + ((py + 0.5 - size / 2) * cellsPerPixel) / 1024;
      const low = Math.floor(lod);
      const f = lod - low;
      const wanted =
        (1 - f) * bilinear(low, u, v) + f * bilinear(low + 1, u, v);
      samples.push({ seen, wanted });
      peak = Math.max(peak, seen / wanted);
    }
    for (const { seen, wanted } of samples) {
      const ratio = seen / wanted / peak;
      worst = Math.max(worst, 1 - ratio);
      lines.push(ratio.toFixed(2));
    }
    say(
      "a star draws one sprite",
      count === 2 && star[7] === 2,
      `records ${count}, radius ${star[2]!.toFixed(0)} px`,
    );
    say(
      "its spike follows the kernel, peak-normalized, within 10%",
      worst <= 0.1,
      lines.join(", "),
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // 300 bright stars.
  {
    const center = sky3.dir(84, 7);
    const right = sky3.norm(sky3.cross(center, NORTH));
    const up = sky3.cross(right, center);
    const stars = Array.from({ length: 300 }, (_, i) => ({
      d: sky3.norm(
        sky3.add(
          sky3.add(center, right, ((i % 20) - 10) * 0.03),
          up,
          (Math.floor(i / 20) - 8) * 0.03,
        ),
      ),
      lux: 1e-4,
    }));
    await setStars(engine, starField(stars));
    const scene = new SkyScene(engine, 1024, 1024, { ev100: 0 });
    scene.view.observer.glare = { ...glare, spikes: { ...SPIKES } };
    scene.aim({ ...inSpace(center, NORTH, 60, 0), fov: 60 });
    await spritesReady(engine, scene.view);
    const list = await readSources(engine, scene.view);
    say(
      "300 bright stars keep to 256 records and the pixel budget",
      list[0]! <= 256 && list[3]! <= 4_000_000 + 4 * 512 * 512,
      `records ${list[0]}, pixels ${list[3]}`,
    );
    const times: number[] = [];
    for (let i = 0; i < 60; i++) {
      await ticks(engine, 1);
      const ms = engine.gpuPasses["glare.sprites"];
      if (i > 20 && ms !== undefined) {
        times.push(ms);
      }
    }
    times.sort((a, b) => a - b);
    say(
      "sprites' time beside the spike's 0.13 ms",
      true,
      `${(times[times.length >> 1] ?? 0).toFixed(2)} ms, at 1024²`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  // A star behind the limb.
  {
    const altitude = 400_000;
    const dip = Math.acos(RADIUS / (RADIUS + altitude));
    const elevation = -dip - 3 * DEG;
    const d: V3 = [Math.sin(elevation), Math.cos(elevation), 0];
    await setStars(engine, starField([{ d, lux: 0.01 }]));
    const scene = new SkyScene(engine, 512, 512, { ev100: 0 });
    scene.view.observer.glare = { ...glare, spikes: { ...SPIKES } };
    scene.aim({
      position: [RADIUS + altitude, 0, 0],
      direction: d,
      up: [0, 0, 1],
      sun: sky3.scale(d, -1),
      fov: 30,
      ev100: 0,
    });
    await spritesReady(engine, scene.view);
    const list = await readSources(engine, scene.view);
    say(
      "a star behind the limb has no sprite",
      list[0] === 1,
      `records ${list[0]}`,
    );
    scene.dispose();
    engine.removeView(scene.view);
  }
  engine.raster.sky.setStarField(null);
  engine.sunDirection.set(saved);
}

/** Flat-shaded boxes as one mesh, around an origin: axes `u`, `v`, `w`, meters. */
function trussMesh(
  u: V3,
  v: V3,
  w: V3,
  boxes: readonly (readonly [number, number, number, number, number, number])[],
): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const at = (a: number, b: number, c: number): V3 => [
    u[0] * a + v[0] * b + w[0] * c,
    u[1] * a + v[1] * b + w[1] * c,
    u[2] * a + v[2] * b + w[2] * c,
  ];
  for (const [cu, cv, cw, hu, hv, hw] of boxes) {
    for (const [axis, sign] of [
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [2, 1],
      [2, -1],
    ] as const) {
      const n: [number, number, number] = [0, 0, 0];
      n[axis] = sign;
      const next = (axis + 1) % 3;
      const last = (axis + 2) % 3;
      const base = positions.length / 3;
      for (const [p, q] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const c: [number, number, number] = [0, 0, 0];
        c[axis] = sign;
        c[next] = p * sign;
        c[last] = q;
        positions.push(...at(cu + c[0] * hu, cv + c[1] * hv, cw + c[2] * hw));
        normals.push(...at(n[0], n[1], n[2]));
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}

/** The stills for Batch D's look: sun and stars, with glare off, a veil, and spikes. */
async function glareStillsGroup(
  engine: Engine,
  say: Say,
  stills: Record<string, string>,
): Promise<void> {
  if (!params.has("glarestills")) {
    return;
  }
  const only = params.get("glarestills")!;
  const wanted = (name: string) => only === "" || only.includes(name);
  const variants = {
    off: null,
    veil: { tier: "full", veil: { share: 0.2 }, spikes: null },
    spikes: {
      tier: "full",
      veil: { share: 0.2 },
      spikes: { aperture: "vanes", share: 0.05, extent: 3 },
    },
  } as const;
  const glareOf = (name: keyof typeof variants): GlareSettings | null => {
    const v = variants[name];
    return v
      ? {
          tier: v.tier,
          veil: v.veil && { ...v.veil },
          spikes: v.spikes && { ...v.spikes },
        }
      : null;
  };
  const saved = Float64Array.from(engine.sunDirection);
  if (wanted("stars")) {
    await skyStars(engine);
    for (const name of ["orion", "core"]) {
      for (const who of ["camera", "eye"] as const) {
        const pose = SKY_POSES[name]!;
        const exposure: Exposure =
          who === "eye" ? { eye: true, speed: 1e6 } : { ev100: pose.ev100 };
        for (const variant of Object.keys(
          variants,
        ) as (keyof typeof variants)[]) {
          if (who === "eye" && variant === "spikes") {
            continue;
          }
          const scene = new SkyScene(engine, 1280, 720, exposure);
          scene.aim(pose);
          if (who === "eye") {
            scene.view.observer = { stages: [eyeLimitStage()] };
          }
          scene.view.observer.glare = glareOf(variant);
          if (variant === "spikes") {
            await spritesReady(engine, scene.view);
          } else if (variant === "veil") {
            await veilReady(engine, scene.view);
          }
          await ticks(engine, 40);
          let drew = 1;
          if (variant !== "off") {
            drew = (await readSources(engine, scene.view))[0]!;
          }
          engine.renderFrame();
          await engine.gpu.device.queue.onSubmittedWorkDone();
          stills[`${name}-${who}-${variant}`] = await still(
            await scene.target.read(),
            1280,
            720,
          );
          say(`${name}, ${who}, ${variant}`, true, `records ${drew}`);
          scene.dispose();
          engine.removeView(scene.view);
        }
      }
    }
    engine.raster.sky.setStarField(null);
  }
  if (wanted("sun")) {
    await skyStars(engine);
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:0;top:0;width:1280px;height:720px";
    document.body.append(host);
    const token = (import.meta as unknown as { env: Record<string, string> })
      .env.VITE_ION_TOKEN;
    const viewer = await Viewer.create(host, {
      engine,
      globe: "terrain",
      ...(token ? { accessToken: token } : {}),
      observer: cameraObserver({ ev100: 14 }),
      credits: false,
      timeControls: false,
    });
    const { view } = viewer;
    const canvas = host.querySelector("canvas")!;
    const shot = async (name: string) => {
      await ticks(engine, 6);
      engine.renderFrame();
      stills[name] = canvas.toDataURL("image/png");
      await engine.gpu.device.queue.onSubmittedWorkDone();
    };
    const wait = async (seconds: number) => {
      const until = performance.now() + seconds * 1000;
      while (performance.now() < until) {
        await ticks(engine, 1);
      }
    };
    const aim = (position: V3, direction: V3, up: V3, fov: number) => {
      const { camera } = view;
      camera.position.set(position);
      camera.direction.set(direction);
      camera.fov = fov * DEG;
      camera.orient(Float64Array.from(up));
      camera.version++;
    };
    const set = async (exposure: Exposure, variant: keyof typeof variants) => {
      view.observer.exposure = exposure;
      view.observer.glare = glareOf(variant);
      if (variant === "spikes") {
        await spritesReady(engine, view);
      } else if (variant === "veil") {
        await veilReady(engine, view);
      }
    };
    const sunAt = (ms: number): V3 => {
      const d = sunDirection(ms, new Float64Array(3));
      return [d[0]!, d[1]!, d[2]!];
    };
    // The sun low over the Alps, from 4,000 m: a summer evening, at 4° and 1.5° up.
    const place = fromDegrees(7.75, 46.0, 4000);
    const position = Ellipsoid.WGS84.cartographicToCartesian(
      place,
      new Float64Array(3),
    );
    const here: V3 = [position[0]!, position[1]!, position[2]!];
    const zenith = sky3.norm(here);
    const when = (elevation: number) => {
      let ms = Date.UTC(2024, 5, 21, 17, 0, 0);
      while (
        Math.asin(sky3.dot(sunAt(ms), zenith)) / DEG > elevation &&
        ms < Date.UTC(2024, 5, 21, 21, 0, 0)
      ) {
        ms += 15_000;
      }
      return ms;
    };
    for (const elevation of [4, 1.5]) {
      if (!wanted(`terrain${elevation}`) && !wanted("terrain")) {
        continue;
      }
      const ms = when(elevation);
      viewer.clock.time = ms;
      const sun = sunAt(ms);
      const flat = sky3.norm(sky3.add(sun, zenith, -sky3.dot(sun, zenith)));
      const direction = sky3.norm(sky3.add(flat, zenith, Math.tan(-1 * DEG)));
      aim(here, direction, zenith, 60);
      await set({ ev100: 13 }, "off");
      await wait(elevation === 4 ? 25 : 10);
      for (const variant of Object.keys(
        variants,
      ) as (keyof typeof variants)[]) {
        await set({ ev100: 13 }, variant);
        await shot(`terrain${elevation}-camera-${variant}`);
      }
      view.observer.toneMapping = "agx";
      await set({ ev100: 13 }, "veil");
      await shot(`terrain${elevation}-camera-veil-agx`);
      view.observer.toneMapping = "pbrNeutral";
      await set({ eye: true, speed: 1e6 }, "off");
      await ticks(engine, 30);
      await shot(`terrain${elevation}-eye-off`);
      await set({ eye: true, speed: 1e6 }, "veil");
      await ticks(engine, 30);
      await shot(`terrain${elevation}-eye-veil`);
      say(`terrain, the sun at ${elevation}°`, true, "");
    }
    // At the limb from orbit, 400 km up: above it, half behind it, then behind it.
    const ms = Date.UTC(2024, 5, 21, 12, 0, 0);
    viewer.clock.time = ms;
    const sun = sunAt(ms);
    const across = sky3.norm(sky3.cross(sun, [0, 0, 1]));
    const altitude = 400_000;
    const dip = Math.acos(RADIUS / (RADIUS + altitude));
    const orbit = (above: number): { at: V3; up: V3 } => {
      const e = -dip + above * DEG;
      const n = sky3.add(sky3.scale(sun, Math.sin(e)), across, Math.cos(e));
      return {
        at: sky3.scale(sky3.norm(n), RADIUS + altitude),
        up: sky3.norm(n),
      };
    };
    if (wanted("limb")) {
      const a = orbit(0.6);
      aim(a.at, sky3.norm(sky3.add(sun, a.up, Math.tan(-12 * DEG))), a.up, 70);
      await set({ ev100: 13 }, "off");
      await wait(20);
      for (const [name, above] of [
        ["above", 0.6],
        ["half", 0.0],
        ["behind", -0.6],
      ] as const) {
        const { at, up } = orbit(above);
        aim(at, sky3.norm(sky3.add(sun, up, Math.tan(-12 * DEG))), up, 70);
        for (const variant of Object.keys(
          variants,
        ) as (keyof typeof variants)[]) {
          await set({ ev100: 13 }, variant);
          await wait(1);
          await shot(`limb-${name}-${variant}`);
        }
      }
      say("the limb from orbit", true, "");
    }
    // Behind a truss, 20 m away, the Earth below.
    if (wanted("truss")) {
      const { at, up } = orbit(8);
      const direction = sun;
      const right = sky3.norm(sky3.cross(direction, up));
      const upward = sky3.cross(right, direction);
      const beams: [number, number, number, number, number, number][] = [
        // Uprights, each a beam's half-width of 0.4 m.
        [-6, 0, 0, 0.4, 12, 0.4],
        [0, 0, 0, 0.4, 12, 0.4],
        [6, 0, 0, 0.4, 12, 0.4],
        // Rails.
        [0, 6, 0, 12, 0.4, 0.4],
        [0, -6, 0, 12, 0.4, 0.4],
      ];
      const origin = sky3.add(at, direction, 20);
      const world = viewer.world;
      const mesh = world.addMesh(trussMesh(right, upward, direction, beams));
      const place3 = (shift: number) =>
        world.addDraw({
          mesh,
          origin: Float64Array.from(sky3.add(origin, right, shift)),
          color: [0.55, 0.55, 0.58, 1],
          doubleSided: true,
        });
      aim(at, direction, upward, 70);
      await set({ ev100: 13 }, "off");
      await wait(15);
      const list: { dispose?: () => void; remove?: () => void }[] = [];
      for (const [name, shift] of [
        ["clear", 3],
        ["half", 0.4],
        ["behind", 0],
      ] as const) {
        const draw = place3(shift) as unknown as {
          dispose?: () => void;
          remove?: () => void;
        };
        list.push(draw);
        for (const variant of Object.keys(
          variants,
        ) as (keyof typeof variants)[]) {
          await set({ ev100: 13 }, variant);
          await shot(`truss-${name}-${variant}`);
          if (variant !== "off") {
            const seen = sunRecord(await readSources(engine, view)).visibility;
            say(`the truss, ${name}, ${variant}`, true, `visibility ${seen}`);
          }
        }
        world.removeDraw(draw as never);
      }
    }
    viewer.destroy();
    host.remove();
    engine.raster.sky.setStarField(null);
  }
  engine.sunDirection.set(saved);
}

const GROUPS: Record<
  string,
  (engine: Engine, say: Say, stills: Record<string, string>) => Promise<void>
> = {
  stages: stagesGroup,
  passes: passesGroup,
  curve: curveGroup,
  points: pointsGroup,
  cells: cellsGroup,
  pack: packGroup,
  fudges: fudgesGroup,
  times: starTimes,
  stills: stillsGroup,
  sources: sourcesGroup,
  veil: veilGroup,
  sprites: spritesGroup,
  glarestills: glareStillsGroup,
};

let root: HTMLElement;
let params = new URLSearchParams();
const $ = (id: string) => root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;

async function runObserver(): Promise<ObserverResult> {
  const status = root.querySelector(".status")!;
  status.textContent = "checking…";
  $("results").replaceChildren();
  const engine = await Engine.create();
  // ?pack=local: the sky pack `npm run sky -- build` made on this machine, offered
  // by the dev server at /sky-pack/. The groups that draw stars load it (`skyStars`).
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
