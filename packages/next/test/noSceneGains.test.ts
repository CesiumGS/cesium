// The owner's rule as a seam: nothing derived from an observer reaches a scene or
// sky shader but the pre-exposure and the stars' point spread (plan's Task 11).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STARLIGHT, type SkyView } from "../src/atmosphere/Sky.ts";
import { STAR_FLOATS, type StarField } from "../src/atmosphere/stars.ts";
import { VIEW_TIME_WORD } from "../src/render/layout.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { createPostStage } from "../src/scene/postStage.ts";
import { fakeEngine } from "./fakeGpu.ts";

const root = join(import.meta.dirname, "..");

/** The engine with its writes recorded: the bytes each buffer last holds. */
async function recorded() {
  const engine = await fakeEngine();
  const held = new Map<unknown, Uint8Array>();
  const device = (
    engine.raster.sky as unknown as { device: { queue: unknown } }
  ).device;
  const queue = device.queue as Record<string, unknown>;
  device.queue = new Proxy(queue, {
    get(target, key) {
      if (key === "writeBuffer") {
        return (
          buffer: { size: number },
          offset: number,
          data: ArrayBuffer | ArrayBufferView,
          dataOffset = 0,
          size?: number,
        ) => {
          const scale = ArrayBuffer.isView(data)
            ? (data as unknown as { BYTES_PER_ELEMENT?: number })
                .BYTES_PER_ELEMENT || 1
            : 1;
          const bytes = ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array(data);
          const from = dataOffset * scale;
          const count = size === undefined ? bytes.length - from : size * scale;
          let copy = held.get(buffer);
          if (!copy) {
            copy = new Uint8Array(buffer.size ?? offset + count);
            held.set(buffer, copy);
          }
          copy.set(bytes.subarray(from, from + count), offset);
        };
      }
      return target[key as string];
    },
  });
  const view = engine.addView({
    target: new OffscreenTarget(64, 36),
    world: engine.createWorld(),
    observer: { exposure: { ev100: 3 } },
  });
  engine.renderFrame();
  const frame = engine.raster.viewFrames.get(view)!;
  const blocks = () => {
    const block = Uint8Array.from(held.get(engine.raster.viewStaging)!);
    // The seconds since the start move every tick, whoever is looking.
    new Float32Array(block.buffer)[VIEW_TIME_WORD] = 0;
    return { sky: Uint8Array.from(held.get(frame.sky.buffer)!), block };
  };
  return { engine, view, frame, blocks, held };
}

/** Which 32-bit words differ. */
function words(a: Uint8Array, b: Uint8Array): number[] {
  const x = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
  const y = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2);
  const out: number[] = [];
  x.forEach((v, i) => {
    if (v !== y[i]) {
      out.push(i);
    }
  });
  return out;
}

const SKY_EXPOSURE = 3;
const SPREAD = [80, 81, 82];

describe("nothing of an observer reaches the scene but what's documented", () => {
  it("tone mapping, glare and a look stage change no byte", async () => {
    const { engine, view, blocks } = await recorded();
    const before = blocks();
    view.observer.toneMapping = "aces";
    engine.renderFrame();
    expect(words(before.sky, blocks().sky)).toEqual([]);
    expect(words(before.block, blocks().block)).toEqual([]);
    view.observer.glare = { tier: "off", veil: null, spikes: null };
    engine.renderFrame();
    expect(words(before.sky, blocks().sky)).toEqual([]);
    expect(words(before.block, blocks().block)).toEqual([]);
    view.observer.stages = [
      createPostStage({
        name: "a-look",
        slot: "exposed",
        kind: "look",
        label: "A look (a look)",
        shadowGain: 2,
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return postColorAt(input.pixel);
        }`,
      }),
    ];
    engine.renderFrame();
    expect(words(before.sky, blocks().sky)).toEqual([]);
    expect(words(before.block, blocks().block)).toEqual([]);
  });

  it("a point spread changes only its own three fields", async () => {
    const { engine, view, blocks } = await recorded();
    const before = blocks();
    view.observer.pointSpread = { core: 0.9, wing: { sigma: 2, share: 0.1 } };
    engine.renderFrame();
    expect(words(before.sky, blocks().sky)).toEqual(SPREAD);
    expect(words(before.block, blocks().block)).toEqual([]);
  });

  it("another EV100 changes only the exposure, and what's pre-exposed", async () => {
    const { engine, view, blocks } = await recorded();
    const before = blocks();
    view.observer.exposure = { ev100: 9 };
    engine.renderFrame();
    expect(words(before.sky, blocks().sky)).toEqual([SKY_EXPOSURE]);
    // The view block's own exposure, one word.
    expect(words(before.block, blocks().block).length).toBe(1);
  });
});

/** Files under a folder with this extension. */
function files(dir: string, ending: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === "generated" ? [] : files(path, ending);
    }
    return name.endsWith(ending) ? [path] : [];
  });
}

/** Lines of a Slang source that fudge scene light. */
function fudges(text: string): string[] {
  return text
    .split("\n")
    .filter(
      (line) =>
        /starExposure|EYE_STARS/.test(line) ||
        /^\s*(?:float\d?|uint|int)\s+\w*(?:[gG]ain|[sS]tretch)\w*\s*;/.test(
          line,
        ),
    );
}

describe("no shader holds a fudge", () => {
  it("the detector flags a planted one", () => {
    expect(fudges("  float starExposure;")).toHaveLength(1);
    expect(fudges("static const float EYE_STARS_EV100 = -3.0;")).toHaveLength(
      1,
    );
    expect(fudges("  float starGain;")).toHaveLength(1);
    expect(fudges("  float3 stretch;")).toHaveLength(1);
    expect(fudges("  float exposure;")).toHaveLength(0);
  });

  it("none in the atmosphere's or the engine's shaders", () => {
    const found = [
      ...files(join(root, "src/atmosphere"), ".slang"),
      ...files(join(root, "src/shaders"), ".slang"),
    ].flatMap((path) =>
      fudges(readFileSync(path, "utf8")).map((line) => `${path}: ${line}`),
    );
    expect(found).toEqual([]);
  });
});

/** A field, its background holding the faint stars or not. */
const field = (holdsFaintStars: boolean, meanBackground = 0): StarField => ({
  points: new Float32Array(STAR_FLOATS).fill(0.5),
  count: 1,
  backgroundLevels: Array.from({ length: 6 }, () => [new Float32Array(4)]),
  backgroundSize: 1,
  holdsFaintStars,
  meanBackground,
});

describe("faintStars", () => {
  const FAINT = [84, 85, 86];
  const read = (held: Map<unknown, Uint8Array>, sky: SkyView) => {
    const bytes = held.get(sky.buffer)!;
    const f = new Float32Array(bytes.buffer, bytes.byteOffset, 88);
    return FAINT.map((i) => f[i]!);
  };
  const close = (got: number[], wanted: readonly number[]) => {
    got.forEach((v, i) => expect(v).toBeCloseTo(wanted[i]!, 10));
  };

  it("is STARLIGHT with today's map, half with a deep pack", async () => {
    const { engine, frame, held, blocks } = await recorded();
    close(read(held, frame.sky), STARLIGHT);
    const before = blocks();
    const sky = engine.raster.sky;
    sky.setStarField(field(false));
    while (sky.advanceUpload()) {
      /* until complete */
    }
    engine.renderFrame();
    close(read(held, frame.sky), STARLIGHT);
    // The view block's light doesn't change with today's map.
    expect(words(before.block, blocks().block)).toEqual([]);
    sky.setStarField(field(true, 2e-4));
    while (sky.advanceUpload()) {
      /* until complete */
    }
    engine.renderFrame();
    close(
      read(held, frame.sky),
      STARLIGHT.map((v) => v * 0.5),
    );
  });

  it("an environment face adds the background's mean", async () => {
    const { engine, frame, held } = await recorded();
    const sky = engine.raster.sky;
    sky.setStarField(field(true, 2e-4));
    while (sky.advanceUpload()) {
      /* until complete */
    }
    const face = () => {
      const bytes = held.get(frame.sky.faceUniforms)!;
      const f = new Float32Array(bytes.buffer, bytes.byteOffset, 88);
      return FAINT.map((i) => f[i]!);
    };
    const encoder = {
      beginRenderPass: () => new Proxy({}, { get: () => () => {} }),
    } as unknown as GPUCommandEncoder;
    const cube = {
      createView: () => ({}),
    } as unknown as GPUTexture;
    const frameAxes = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as const;
    const { view } = { view: frame.sky };
    const ellipsoid = engine.views[0]!.body.ellipsoid;
    const position = Float64Array.of(6_378_137 + 2, 0, 0);
    const sun = [0, 0, 1];
    // Marched: its own glow and the mean.
    sky.encodeEnvironment(
      encoder,
      view,
      cube,
      ellipsoid,
      position,
      frameAxes as never,
      sun,
      undefined,
    );
    const mean = STARLIGHT.map((v) => (2e-4 * v) / 0.8e-4);
    close(
      face(),
      STARLIGHT.map((v, i) => v * 0.5 + mean[i]!),
    );
    // From the view's table, which has the glow: the mean alone.
    sky.encodeEnvironment(
      encoder,
      view,
      cube,
      ellipsoid,
      position,
      frameAxes as never,
      sun,
      { exposure: 0.5 },
    );
    close(face(), mean);
  });

  it("with today's map a face has what the view has, from the march", async () => {
    const { engine, frame, held } = await recorded();
    const sky = engine.raster.sky;
    sky.setStarField(field(false));
    while (sky.advanceUpload()) {
      /* until complete */
    }
    expect(read(held, frame.sky).length).toBe(3);
    close(read(held, frame.sky), STARLIGHT);
  });
});
