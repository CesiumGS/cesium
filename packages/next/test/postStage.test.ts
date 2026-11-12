// The post stage interface (sky and observer plan, Task 2): a stage's definition,
// the chain's order in a view's graph, and what a stage costs when it's off. The
// pixels are checked in spikes/observer.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../src/math/vec3.ts";
import {
  FrameGraph,
  TexturePool,
  type TextureDesc,
} from "../src/render/FrameGraph.ts";
import {
  ChainSlot,
  ViewChain,
  chainOrder,
  chainSource,
  observerShadowGain,
  registerSlot,
  type ChainEngine,
  type GraphStage,
} from "../src/render/post/chain.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import { cameraObserver, eyeObserver } from "../src/scene/observer.ts";
import {
  PostStageError,
  createPostStage,
  type PostStageOptions,
  type PostStagePass,
  type PostStageViewInfo,
} from "../src/scene/postStage.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { wgslUnit } from "../src/shaders/link/unit.ts";
import { fakeDevice, fakeEngine, installGpuGlobals } from "./fakeGpu.ts";

const PASS_THROUGH = `fn postStage(input: PostInput) -> vec4<f32> {
  return postColorAt(input.pixel);
}`;

function stage(
  name: string,
  slot: PostStageOptions["slot"] = "scene",
  more: Partial<PostStageOptions> = {},
) {
  return createPostStage({
    name,
    slot,
    kind: "look",
    label: `${name} (a look)`,
    shader: PASS_THROUGH,
    ...more,
  });
}

/** What's wrong with `options`, as a stage refuses them. */
function refusal(options: Partial<PostStageOptions>): PostStageError {
  try {
    createPostStage({
      name: "a",
      slot: "scene",
      kind: "look",
      label: "A (a look)",
      shader: PASS_THROUGH,
      ...options,
    } as PostStageOptions);
  } catch (error) {
    expect(error).toBeInstanceOf(PostStageError);
    return error as PostStageError;
  }
  throw new Error("It wasn't refused.");
}

describe("createPostStage", () => {
  it("gives what it was asked for, enabled", () => {
    const made = stage("a", "exposed", { shadowGain: 2 });
    expect(made).toMatchObject({
      name: "a",
      slot: "exposed",
      kind: "look",
      label: "a (a look)",
      enabled: true,
      shadowGain: 2,
    });
    expect(stage("b").shadowGain).toBe(1);
  });

  it.each<[string, Partial<PostStageOptions>, string, RegExp]>([
    ["no kind", { kind: undefined as never }, "kind", /required/],
    ["an unknown kind", { kind: "art" as never }, "kind", /"art"/],
    ["an unknown slot", { slot: "after" as never }, "slot", /"after"/],
    ["an empty name", { name: "" }, "name", /empty/],
    ["no label", { label: "" }, "label", /readout/],
    ["an unknown read", { reads: ["normal" as never] }, "reads", /"normal"/],
    ["a gain that isn't finite", { shadowGain: Infinity }, "shadowGain", /./],
    ["a gain outside `exposed`", { shadowGain: 8 }, "shadowGain", /exposed/],
    [
      "a texture uniform",
      { uniforms: { map: { type: "texture2d", value: "a.png" } as never } },
      "uniforms.map",
      /value uniforms/,
    ],
    [
      "depth it didn't declare",
      {
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return vec4<f32>(postDepthAt(input.pixel));
        }`,
      },
      "reads",
      /postDepthAt.*"depth"/,
    ],
    [
      "ids it didn't declare",
      {
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return vec4<f32>(f32(postIdAt(input.pixel)));
        }`,
      },
      "reads",
      /postIdAt.*"ids"/,
    ],
  ])("refuses %s, naming the field", (_, options, field, message) => {
    const error = refusal(options);
    expect(error.field).toBe(field);
    expect(error.message).toMatch(message);
    expect(error.message).toContain(field);
  });

  it("doesn't count a read named in a comment", () => {
    expect(() =>
      stage("a", "scene", {
        shader: `// Not postDepthAt, for now.\n${PASS_THROUGH}`,
      }),
    ).not.toThrow();
  });

  it("refuses a shader with no postStage: a link diagnostic", () => {
    const error = refusal({ shader: "fn other() {}" });
    expect(error.field).toBe("shader");
    expect(error.stage).toBe("a");
    expect(error.message).toContain("post stage boundary");
    expect(error.message).toContain("postStage");
  });

  it("refuses a postStage of other types, at its unit and line", () => {
    const error = refusal({
      shader: wgslUnit(
        "my unit",
        `// A helper first.
fn postStage(input: vec4<f32>) -> vec4<f32> {
  return input;
}`,
      ),
    });
    expect(error.field).toBe("shader");
    expect(error.message).toContain("my unit line 2");
  });

  it("refuses a name the glue already defines, at its unit and line", () => {
    const error = refusal({
      shader: `${PASS_THROUGH}\nfn postColor(uv: vec2<f32>) -> vec4<f32> { return vec4<f32>(0.0); }`,
    });
    expect(error.message).toContain("a shader line 4");
    expect(error.message).toContain("`postColor` is already defined");
  });

  it("links its uniforms, and refuses one it doesn't declare", () => {
    const made = stage("a", "exposed", {
      uniforms: { strength: { type: "f32", value: 0.5 } },
      shader: `fn postStage(input: PostInput) -> vec4<f32> {
        return postColorAt(input.pixel) * uniforms.strength;
      }`,
    });
    expect(made.passes[0]!.module.code).toContain("strength: f32");
    expect(made.uniformData.getFloat32(0, true)).toBe(0.5);
    made.setUniform("strength", 2);
    expect(made.uniformData.getFloat32(0, true)).toBe(2);
    expect(made.uniformVersion).toBe(1);
    expect(() => made.setUniform("gain", 1)).toThrow(/uniforms\.gain/);
  });
});

describe("what a stage's shader may hold", () => {
  const body = (lines: string) => `fn postStage(input: PostInput) -> vec4<f32> {
    ${lines}
    return vec4<f32>(0.0);
  }`;
  const COUNTED = [
    "for (var i = 0; i < 8; i++) { }",
    "for (var i: i32 = 0; i < 8; i = i + 1) { }",
    "for (var i = 8u; i > 0u; i -= 2u) { }",
    "for (var i = 0; i <= 255; i++) { }",
    "for (var i = 0; i < 16; i++) { for (var k = 0; k < 16; k++) { } }",
  ];
  it.each(COUNTED)("takes %s", (lines) => {
    expect(() => stage("a", "scene", { shader: body(lines) })).not.toThrow();
  });

  it("takes a bound held in a const, and a loop named in a comment", () => {
    const shader = `const TAPS: i32 = 12;
    // A loop would be slower. while we're here: for (;;)
    ${body("for (var i = 0; i < TAPS; i++) { }")}`;
    expect(() => stage("a", "scene", { shader })).not.toThrow();
  });

  it.each<[string, string, RegExp]>([
    [
      "a loop that doesn't end",
      "var n = 0u; loop { n = n | 1u; if (n == 0u) { break; } }",
      /`loop`/,
    ],
    ["a while", "var n = 0; while (n < 8) { n++; }", /`while`/],
    ["no test", "for (var i = 0; ; i++) { }", /`for` at line 2/],
    [
      "a bound that isn't constant",
      "for (var i = 0; i < i32(input.size.x); i++) { }",
      /`for` at line 2/,
    ],
    [
      "a start that isn't constant",
      "for (var i = input.pixel.x; i < 8; i++) { }",
      /`for`/,
    ],
    ["a step the wrong way", "for (var i = 0; i < 8; i--) { }", /`for`/],
    ["a step of none", "for (var i = 0; i < 8; i += 0) { }", /`for`/],
    [
      "a body that moves the counter",
      "for (var i = 0; i < 8; i++) { i = 0; }",
      /`for`/,
    ],
    ["too many", "for (var i = 0; i < 257; i++) { }", /257 times/],
    [
      "a nest of too many",
      "for (var i = 0; i < 17; i++) { for (var k = 0; k < 16; k++) { } }",
      /272 times/,
    ],
  ])("refuses %s, unless told", (_, lines, message) => {
    const shader = body(lines);
    const error = refusal({ shader });
    expect(error.field).toBe("shader");
    expect(error.message).toMatch(message);
    expect(error.message).toContain("allowUnboundedLoops");
    expect(() =>
      stage("a", "scene", { shader, allowUnboundedLoops: true }),
    ).not.toThrow();
  });

  it("refuses bindings of its own, even told about loops", () => {
    const shader = `@group(1) @binding(0) var lut: texture_2d<f32>;
    fn postStage(input: PostInput) -> vec4<f32> {
      return textureLoad(lut, input.pixel, 0);
    }`;
    const error = refusal({ shader, allowUnboundedLoops: true });
    expect(error.field).toBe("shader");
    expect(error.message).toMatch(/@group/);
  });
});

describe("the chain's order", () => {
  it("keeps list order within a slot", () => {
    const [a, b, c, d] = [
      stage("a", "display"),
      stage("b", "scene"),
      stage("c", "display"),
      stage("d", "exposed"),
    ];
    expect(chainOrder([a!, b!, c!, d!])).toEqual({
      scene: [b],
      exposed: [d],
      display: [a, c],
    });
  });

  it("skips disabled stages, and gives the slot's input with none", () => {
    const on = { enabled: true };
    const off = { enabled: false };
    expect(chainSource([on, off, on], 3)).toBe(2);
    expect(chainSource([on, off, on], 2)).toBe(0);
    expect(chainSource([off, off, on], 2)).toBe(-1);
    expect(chainSource([on], 0)).toBe(-1);
    expect(chainSource([], 0)).toBe(-1);
  });

  it("multiplies the enabled exposed stages' gains", () => {
    const settings = cameraObserver({ ev100: 15 });
    expect(observerShadowGain(settings)).toBe(1);
    const a = stage("a", "exposed", { shadowGain: 2 });
    const b = stage("b", "exposed", { shadowGain: 3 });
    const c = stage("c", "scene");
    const list = { ...settings, stages: [a, b, c] };
    expect(observerShadowGain(list)).toBe(6);
    b.enabled = false;
    expect(observerShadowGain(list)).toBe(2);
  });
});

describe("a view's chain", () => {
  let engine: Engine;

  /** The passes before the chain and its neighbors, as they've always been. */
  const NO_STAGE = [
    "shadows",
    "height-captures",
    "select-view",
    "lights",
    "cull",
    "sky-view",
    "environment",
    "aerial-perspective",
    "prepass",
    "ambient-occlusion",
    "stars",
    "section-caps",
    "opaque",
    "translucent",
    "meter",
    "composite",
    "depth-range",
    "hdr-readback",
    "pick",
    "adaptation",
    "present",
  ];

  beforeEach(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
  });

  function addView(stages: PostStageOptions[] = [], width = 64): View {
    const view = engine.addView({
      target: new OffscreenTarget(width, 36),
      world: engine.createWorld(),
      observer: { stages: stages.map(createPostStage) },
    });
    view.camera.lookAt(v3.vec3(6_378_137, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  /** A tick, then what became ready because of it. */
  async function tick(): Promise<void> {
    engine.renderFrame();
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  const passes = (view: View) =>
    engine.raster.viewFrames.get(view)!.graph.compile();

  /** Every pipeline the next tick's passes set, by pass, in order. */
  function recordPipelines(): Array<{ pass: string; pipeline: unknown }> {
    const device = engine.ctx.device;
    const make = device.createCommandEncoder.bind(device);
    const seen: Array<{ pass: string; pipeline: unknown }> = [];
    device.createCommandEncoder = ((d?: GPUCommandEncoderDescriptor) => {
      const encoder = make(d);
      const begin = encoder.beginRenderPass.bind(encoder);
      encoder.beginRenderPass = (descriptor: GPURenderPassDescriptor) => {
        const pass = begin(descriptor);
        pass.setPipeline = (pipeline: unknown) => {
          seen.push({ pass: descriptor.label ?? "", pipeline });
        };
        return pass;
      };
      return encoder;
    }) as typeof device.createCommandEncoder;
    return seen;
  }

  it("with no stage, the pass list is as before", async () => {
    const view = addView();
    await tick();
    expect(passes(view)).toEqual(NO_STAGE);
    expect(
      engine.raster.viewFrames.get(view)!.chain.slots.scene!.nodes,
    ).toEqual([]);
  });

  it("with no stage, the present pass binds `fs`, not the split entries", async () => {
    addView();
    await tick();
    const seen = recordPipelines();
    await tick();
    expect(seen.find((s) => s.pass === "present")?.pipeline).toBe(
      engine.ctx.pipelines.present,
    );
    expect(seen.some((s) => s.pass === "present.response")).toBe(false);
  });

  it("orders the chain after the meter and the adaptation", async () => {
    const view = addView([
      { ...options("a"), slot: "scene" },
      { ...options("b"), slot: "display" },
    ]);
    await tick();
    const list = passes(view);
    const at = (name: string) => list.indexOf(name);
    expect(at("meter")).toBeLessThan(at("adaptation"));
    expect(at("hdr-readback")).toBeLessThan(at("post.a"));
    expect(at("adaptation")).toBeLessThan(at("post.a"));
    expect(at("post.a")).toBeLessThan(at("present"));
    expect(at("post.b")).toBeGreaterThan(at("present"));
    expect(list.at(-1)).toBe("present.final");
  });

  it("splits the present pass around an exposed stage, only while it runs", async () => {
    const a = stage("a", "exposed");
    const view = addView();
    view.observer.stages = [a];
    await tick();
    const list = passes(view);
    expect(list.indexOf("present.response")).toBeLessThan(
      list.indexOf("post.a"),
    );
    expect(list.indexOf("post.a")).toBeLessThan(list.indexOf("present"));
    const seen = recordPipelines();
    await tick();
    const split = await engine.ctx.pipelines.chain();
    expect(seen.map((s) => s.pipeline)).toContain(split.response);
    expect(seen.find((s) => s.pass === "present")?.pipeline).toBe(split.tone);
    // Disabled: as if it weren't there, on the pipelines it was given.
    seen.length = 0;
    a.enabled = false;
    await tick();
    expect(seen.map((s) => s.pipeline)).not.toContain(split.response);
    expect(seen.find((s) => s.pass === "present")?.pipeline).toBe(
      engine.ctx.pipelines.present,
    );
  });

  it("after a display stage, copies into the target", async () => {
    addView([{ ...options("a"), slot: "display" }]);
    await tick();
    const seen = recordPipelines();
    await tick();
    const split = await engine.ctx.pipelines.chain();
    expect(seen.map((s) => s.pass)).toContain("present.ldr");
    expect(seen.find((s) => s.pass === "present")?.pipeline).toBe(split.copy);
  });

  it("the meter and the adaptation read no stage's output", () => {
    const pool = engine.raster.pool;
    expect(pool).toBeInstanceOf(TexturePool);
    const view = addView([
      { ...options("a"), slot: "scene" },
      { ...options("b"), slot: "exposed" },
    ]);
    engine.renderFrame();
    const graph = engine.raster.viewFrames.get(view)!.graph as unknown as {
      passes: Array<{
        name: string;
        setup: { reads?: Array<{ name: string }> };
      }>;
    };
    for (const name of ["meter", "adaptation", "hdr-readback", "composite"]) {
      const pass = graph.passes.find((p) => p.name === name)!;
      const reads = (pass.setup.reads ?? []).map((r) => r.name);
      expect(reads.filter((r) => r.startsWith("post."))).toEqual([]);
    }
  });

  it("a disabled stage's pass acquires no texture", async () => {
    const a = stage("a", "scene");
    const b = stage("b", "display");
    const view = addView();
    view.observer.stages = [a, b];
    await tick();
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const labels = () =>
      acquire.mock.calls.map(([desc]) => (desc as TextureDesc).label);
    await tick();
    expect(labels()).toContain("post.a");
    expect(labels()).toContain("post.b");
    acquire.mockClear();
    a.enabled = false;
    b.enabled = false;
    await tick();
    expect(labels()).not.toContain("post.a");
    expect(labels()).not.toContain("post.b");
  });

  it("a stage's pipeline is ready a little later, and asks for a tick", async () => {
    const view = addView();
    view.observer.stages = [stage("a", "scene")];
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const request = vi.spyOn(engine, "requestRender");
    engine.renderFrame();
    // Not ready: the chain goes around it.
    expect(
      acquire.mock.calls.some(([d]) => (d as TextureDesc).label === "post.a"),
    ).toBe(false);
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    expect(request).toHaveBeenCalled();
    engine.renderFrame();
    expect(
      acquire.mock.calls.some(([d]) => (d as TextureDesc).label === "post.a"),
    ).toBe(true);
  });

  it("a shader the compiler refuses is reported once, at its line, and goes undrawn", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const device = engine.ctx.device;
    const createModule = device.createShaderModule.bind(device);
    device.createShaderModule = ((d: GPUShaderModuleDescriptor) => {
      const module = createModule(d);
      const line = d.code.split("\n").length;
      module.getCompilationInfo = () =>
        Promise.resolve({
          messages: [
            { type: "error", lineNum: line, message: "no such function" },
          ],
        } as unknown as GPUCompilationInfo);
      return module;
    }) as typeof device.createShaderModule;
    const bad = stage("bad", "scene");
    const view = addView();
    view.observer.stages = [bad];
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    await tick();
    await tick();
    expect(bad.error).toBeInstanceOf(PostStageError);
    expect(bad.error!.message).toContain("bad shader line");
    expect(bad.error!.message).toContain("no such function");
    expect(error).toHaveBeenCalledTimes(1);
    expect(
      acquire.mock.calls.some(([d]) => (d as TextureDesc).label === "post.bad"),
    ).toBe(false);
    expect(passes(view)).toContain("post.bad");
    expect(engine.errors).toMatchObject([
      { kind: "shader", message: bad.error!.message },
    ]);
  });

  it("a pipeline the GPU refuses is reported too, to the stage it was made for", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const device = engine.ctx.device;
    const make = device.createRenderPipelineAsync.bind(device);
    device.createRenderPipelineAsync = ((d: GPURenderPipelineDescriptor) =>
      d.label?.includes("refused")
        ? Promise.reject(new Error("the layout has no group 1"))
        : make(d)) as typeof device.createRenderPipelineAsync;
    const bad = stage("refused", "scene");
    const view = addView();
    view.observer.stages = [bad];
    await tick();
    await tick();
    expect(bad.error).toBeInstanceOf(PostStageError);
    expect(bad.error!.message).toContain("no group 1");
    expect(engine.errors).toMatchObject([
      { kind: "pipeline", message: bad.error!.message },
    ]);
    // One made later of the same code is told too, by its own name.
    const same = createPostStage({
      name: "refused too",
      slot: "scene",
      kind: "look",
      label: "Refused too (a look)",
      shader: PASS_THROUGH,
    });
    expect(same.error).toBeUndefined();
    addView().observer.stages = [same];
    await tick();
    expect(same.error?.stage).toBe("refused too");
    expect(same.error?.message).toContain("no group 1");
  });

  it("a lost device names the stages that were on, and they stay off", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const on = stage("on");
    const off = stage("off");
    off.enabled = false;
    addView().observer.stages = [on, off];
    await tick();
    engine.gpu.events.emit("lost", {
      message: "the GPU hung",
      reason: "unknown",
    } as GPUDeviceLostInfo);
    const [report] = engine.errors;
    expect(report).toMatchObject({ kind: "device" });
    expect(report!.message).toContain("the GPU hung");
    expect(report!.message).toContain('"on"');
    expect(report!.message).not.toContain('"off"');
    expect(on.enabled).toBe(false);
    expect(on.error?.field).toBe("device");
    expect(off.error).toBeUndefined();
  });

  describe("changing the list", () => {
    it("refuses two stages of one name, naming the name", () => {
      const view = addView();
      expect(() => {
        view.observer.stages = [stage("twin"), stage("twin", "display")];
      }).toThrow(/"twin".*name/);
      expect(view.observer.stages).toEqual([]);
      expect(() => {
        view.observer = {
          ...cameraObserver({ ev100: 15 }),
          stages: [stage("twin"), stage("twin")],
        };
      }).toThrow(/"twin"/);
      expect(() =>
        engine.addView({
          target: new OffscreenTarget(64, 36),
          world: engine.createWorld(),
          observer: { stages: [stage("twin"), stage("twin")] },
        }),
      ).toThrow(/"twin"/);
    });

    it("rebuilds the view's graph once for a new list, not for the same one", async () => {
      const a = stage("a");
      const view = addView();
      await tick();
      const first = engine.raster.viewFrames.get(view);
      const list = [a];
      view.observer.stages = list;
      await tick();
      const second = engine.raster.viewFrames.get(view);
      expect(second).not.toBe(first);
      await tick();
      expect(engine.raster.viewFrames.get(view)).toBe(second);
      // The same stages, however they're handed over.
      view.observer.stages = list;
      view.observer.stages = [a];
      view.observer = { ...view.observer, toneMapping: "agx" };
      await tick();
      expect(engine.raster.viewFrames.get(view)).toBe(second);
      // Toggling isn't a change of list.
      a.enabled = false;
      await tick();
      expect(engine.raster.viewFrames.get(view)).toBe(second);
      view.observer.stages = [];
      await tick();
      expect(engine.raster.viewFrames.get(view)).not.toBe(second);
      expect(passes(view)).toEqual(NO_STAGE);
    });

    it("returns the old stage targets to the pool, which frees them", async () => {
      const view = addView([{ ...options("a"), slot: "scene" }]);
      await tick();
      const acquire = vi.spyOn(engine.raster.pool, "acquire");
      const release = vi.spyOn(engine.raster.pool, "release");
      const named = (calls: ReadonlyArray<readonly unknown[]>) =>
        calls.filter(([d]) => (d as TextureDesc).label === "post.a").length;
      await tick();
      expect(named(acquire.mock.calls)).toBe(1);
      expect(named(release.mock.calls)).toBe(1);
      const purge = vi.spyOn(engine.raster.pool, "purge");
      view.observer.stages = [];
      await tick();
      expect(purge.mock.calls.map(([desc]) => desc.label)).toContain("post.a");
      // And it's asked for no more.
      acquire.mockClear();
      await tick();
      expect(named(acquire.mock.calls)).toBe(0);
    });

    it("wakes the loop once, and so does a stage's own change", () => {
      const a = stage("a", "scene", {
        uniforms: { x: { type: "f32", value: 0 } },
      });
      const view = addView();
      const wake = vi.fn();
      view.wake = wake;
      const revision = view.observerRevision;
      view.observer.stages = [a];
      expect(wake).toHaveBeenCalledTimes(1);
      a.enabled = false;
      expect(wake).toHaveBeenCalledTimes(2);
      a.enabled = false;
      expect(wake).toHaveBeenCalledTimes(2);
      a.setUniform("x", 1);
      expect(wake).toHaveBeenCalledTimes(3);
      expect(view.observerRevision).toBe(revision + 3);
      view.observer.stages = [];
      a.enabled = true;
      expect(wake).toHaveBeenCalledTimes(4);
    });

    it("stops listening to a stage when the view is removed", () => {
      const a = stage("a");
      const view = addView();
      view.observer.stages = [a];
      engine.removeView(view);
      const revision = view.observerRevision;
      a.enabled = false;
      expect(view.observerRevision).toBe(revision);
    });
  });

  describe("what differs from view to view", () => {
    const shared = (perView: PostStageOptions["perView"]) =>
      stage("shared", "scene", {
        uniforms: { limit: { type: "f32", value: 1 } },
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return postColorAt(input.pixel) * uniforms.limit;
        }`,
        perView,
      });
    const node = (view: View) =>
      engine.raster.viewFrames.get(view)!.chain.slots.scene!.nodes[0]!;

    /** The values written to a stage's one-float uniform buffers, in order. */
    function writes(): number[] {
      const seen: number[] = [];
      // The stand-in makes a queue per reading: keep this one.
      const device = engine.ctx.device as { queue: GPUQueue };
      const queue = device.queue;
      queue.writeBuffer = ((_b: GPUBuffer, _o: number, data: ArrayBuffer) => {
        if (data instanceof ArrayBuffer && data.byteLength === 16) {
          seen.push(new Float32Array(data)[0]!);
        }
      }) as typeof queue.writeBuffer;
      device.queue = queue;
      return seen;
    }

    it("gives each view its own uniform and its own enabled, from one stage", async () => {
      const seen = writes();
      const [left, right] = [addView(), addView()];
      const limits = new Map([
        [left, 0.25],
        [right, 0.75],
      ]);
      const off = new Set<View>();
      const made = shared(({ view }, values) => {
        values.setUniform("limit", limits.get(view)!);
        values.enabled = !off.has(view);
      });
      left.observer.stages = [made];
      right.observer = left.observer;
      await tick();
      await tick();
      expect(right.observer.stages[0]).toBe(made);
      expect(seen).toEqual([0.25, 0.75]);
      expect(node(left).enabled).toBe(true);
      expect(node(right).enabled).toBe(true);
      // Only what moved is written; one view leaving doesn't touch the other.
      seen.length = 0;
      limits.set(left, 0.5);
      off.add(right);
      await tick();
      expect(seen).toEqual([0.5]);
      expect(node(left).enabled).toBe(true);
      expect(node(right).enabled).toBe(false);
      off.clear();
      await tick();
      expect(node(right).enabled).toBe(true);
    });

    it("runs before the first stage, told the view's values", async () => {
      const seen: PostStageViewInfo[] = [];
      const view = addView();
      view.observer.exposure = { ev100: 15 };
      view.observer.stages = [shared((info) => seen.push({ ...info }))];
      await tick();
      const list = passes(view);
      expect(list.indexOf("post.perView")).toBeGreaterThan(
        list.indexOf("adaptation"),
      );
      expect(list.indexOf("post.perView")).toBeLessThan(
        list.indexOf("post.shared"),
      );
      expect(seen[0]).toMatchObject({
        view,
        width: 64,
        height: 36,
        preExposure: view.exposureScale,
      });
      expect(seen[0]!.pixelAngle).toBeGreaterThan(0);
    });

    it("isn't asked while the stage is off, and the switch holds for every view", async () => {
      const perView = vi.fn();
      const made = shared(perView);
      const view = addView();
      view.observer.stages = [made];
      await tick();
      perView.mockClear();
      made.enabled = false;
      await tick();
      expect(perView).not.toHaveBeenCalled();
      expect(node(view).enabled).toBe(false);
    });

    it("the stage's own setUniform still reaches every view", async () => {
      const seen = writes();
      const made = shared(undefined);
      const [left, right] = [addView(), addView()];
      left.observer.stages = [made];
      right.observer.stages = [made];
      await tick();
      await tick();
      expect(seen).toEqual([1, 1]);
      seen.length = 0;
      made.setUniform("limit", 2);
      await tick();
      expect(seen).toEqual([2, 2]);
    });

    it("one that throws is reported once, by name, and turned off", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const made = shared(() => {
        throw new Error("no such thing");
      });
      const view = addView();
      view.observer.stages = [made];
      await tick();
      await tick();
      expect(made.enabled).toBe(false);
      expect(made.error?.field).toBe("perView");
      expect(engine.errors).toMatchObject([{ kind: "frame", count: 1 }]);
      expect(engine.errors[0]!.message).toContain("no such thing");
      expect(passes(view)).toContain("post.shared");
    });

    it("no perView, no pass for it", async () => {
      const view = addView();
      view.observer.stages = [stage("a", "scene")];
      await tick();
      expect(passes(view)).not.toContain("post.perView");
    });
  });

  it("rebuilds the graph when glare goes on or off, and not for its values", async () => {
    const view = addView();
    await tick();
    const built = engine.raster.viewFrames.get(view);
    view.observer.toneMapping = "agx";
    await tick();
    expect(engine.raster.viewFrames.get(view)).toBe(built);
    view.observer.glare = { tier: "auto", veil: { share: 0.2 }, spikes: null };
    await tick();
    const glared = engine.raster.viewFrames.get(view);
    expect(glared).not.toBe(built);
    view.observer.glare.veil!.share = 0.1;
    await tick();
    expect(engine.raster.viewFrames.get(view)).toBe(glared);
    view.observer.glare = null;
    await tick();
    expect(engine.raster.viewFrames.get(view)).not.toBe(glared);
  });

  it("two views hold separate chains", async () => {
    const a = stage("a", "scene");
    const one = addView();
    const two = addView();
    one.observer.stages = [a];
    await tick();
    expect(passes(one)).toContain("post.a");
    expect(passes(two)).toEqual(NO_STAGE);
    expect(two.observer.stages).toEqual([]);
    // The split view's copy shares the stage, with a target of its own.
    two.observer = one.observer;
    await tick();
    expect(passes(two)).toContain("post.a");
    const frames = [one, two].map((v) => engine.raster.viewFrames.get(v)!);
    expect(frames[0]!.chain).not.toBe(frames[1]!.chain);
    expect(frames[0]!.graph).not.toBe(frames[1]!.graph);
  });

  it("gives a stage the view's values, written only when they move", async () => {
    const view = addView([{ ...options("a"), slot: "scene" }]);
    view.observer.exposure = { ev100: 15 };
    await tick();
    const chain = engine.raster.viewFrames.get(view)!.chain;
    const write = vi.spyOn(chain, "writeParams");
    await tick();
    expect(write).toHaveBeenCalledTimes(1);
    const [, width, height, preExposure, pixelAngle] = write.mock.calls[0]!;
    expect([width, height]).toEqual([64, 36]);
    expect(preExposure).toBe(view.exposureScale);
    const tanY = Math.tan(view.camera.fovy(64 / 36) / 2);
    expect(pixelAngle).toBeCloseTo((2 * tanY) / 36, 12);
  });

  it("a squeezed canvas with a stage on: no throw, no zero-size texture", async () => {
    const created = vi.spyOn(engine.raster.pool, "acquire");
    const view = addView([{ ...options("a"), slot: "scene" }], 1);
    view.viewport = { x: 0.5, y: 0, width: 0.5, height: 1 };
    await tick();
    await tick();
    expect(passes(view)).toContain("post.a");
    for (const [desc] of created.mock.calls) {
      expect((desc as TextureDesc).width).toBeGreaterThan(0);
      expect((desc as TextureDesc).height).toBeGreaterThan(0);
    }
  });

  it("the eye's chain reads as a camera's does", async () => {
    const view = addView();
    view.observer = {
      ...eyeObserver(),
      stages: [stage("a", "exposed")],
    };
    await tick();
    expect(passes(view).indexOf("adaptation")).toBeLessThan(
      passes(view).indexOf("present.response"),
    );
  });

  function options(name: string): PostStageOptions {
    return {
      name,
      slot: "scene",
      kind: "look",
      label: `${name} (a look)`,
      shader: PASS_THROUGH,
    };
  }
});

describe("a stage of several passes", () => {
  const FRAGMENT =
    "fn postStage(input: PostInput) -> vec4<f32> { return vec4<f32>(0.0); }";
  const LEVELS = 4;

  /** The shape of the veil: a pyramid written level by level, composed at half size. */
  const veil = (): Partial<PostStageOptions> => ({
    textures: {
      pyramid: { scale: 0.5, mips: LEVELS },
      composed: { scale: 0.5 },
    },
    passes: [
      {
        name: "input",
        writes: [{ texture: "pyramid", mip: 0 }],
        shader: FRAGMENT,
      },
      ...[1, 2, 3].map((mip) => ({
        name: `down.${mip}`,
        reads: [{ texture: "pyramid", mip: mip - 1 }],
        writes: [{ texture: "pyramid", mip }],
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return textureSampleLevel(pyramid, postSampler, input.uv, 0.0);
        }`,
      })),
      {
        name: "compose",
        reads: ["pyramid"],
        writes: ["composed"],
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return textureSampleLevel(pyramid, postSampler, input.uv, 2.0);
        }`,
      },
      {
        name: "add",
        reads: ["composed"],
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return postColor(input.uv) + textureSampleLevel(composed, postSampler, input.uv, 0.0);
        }`,
      },
    ],
  });

  describe("what it declares", () => {
    const pass = (more: Partial<PostStagePass>): PostStagePass => ({
      name: "a",
      shader: FRAGMENT,
      ...more,
    });
    const onePass = (
      more: Record<string, unknown>,
      options: Partial<PostStageOptions> = {},
    ): Partial<PostStageOptions> => ({
      shader: undefined,
      passes: [pass(more as never)],
      ...options,
    });

    it("binds what a pass reads and writes, at their names", () => {
      const made = stage("veil", "scene", { shader: undefined, ...veil() });
      const [input, down, , , compose, add] = made.passes;
      expect(input!.label).toBe("post.veil.input");
      expect(input!.bindings).toEqual([]);
      expect(down!.module.code).toContain(
        "@group(1) @binding(2) var pyramid: texture_2d<f32>;",
      );
      expect(compose!.bindings[0]!.mip).toBeUndefined();
      expect(add!.writes[0]!.texture.name).toBe("output");
    });

    it("a stage of one function is one pass writing its output", () => {
      const [only, ...others] = stage("a").passes;
      expect(others).toEqual([]);
      expect(only!.label).toBe("post.a");
      expect(only!.writes[0]!.texture.name).toBe("output");
      expect(only!.compute).toBeUndefined();
    });

    it("takes an image, in the simple form too", () => {
      const made = stage("lut", "exposed", {
        textures: {
          lut: { width: 2, height: 1, data: new Uint8Array(8) },
        },
        reads: ["lut"],
        shader: `fn postStage(input: PostInput) -> vec4<f32> {
          return textureSampleLevel(lut, postSampler, input.uv, 0.0);
        }`,
      });
      expect(made.passes[0]!.bindings[0]!.texture.name).toBe("lut");
    });

    it.each<[string, Partial<PostStageOptions>, string, RegExp]>([
      ["both forms", { passes: [] }, "shader", /not both/],
      ["neither form", { shader: undefined }, "shader", /not both/],
      [
        "no passes",
        { shader: undefined, passes: [] },
        "passes",
        /at least one/,
      ],
      [
        "reads beside passes",
        { shader: undefined, passes: [pass({})], reads: ["depth"] },
        "reads",
        /each pass/,
      ],
      [
        "two passes of one name",
        { shader: undefined, passes: [pass({}), pass({})] },
        "passes",
        /"a"/,
      ],
      [
        "nothing writing the output",
        onePass({ writes: ["t"] }, { textures: { t: {} } }),
        "passes",
        /"output"/,
      ],
      ["an unknown read", onePass({ reads: ["t"] }), "passes.a.reads", /"t"/],
      [
        "an unknown write",
        onePass({ writes: ["t"] }),
        "passes.a.writes",
        /"t"/,
      ],
      [
        "a read nothing wrote",
        onePass({ reads: ["t"] }, { textures: { t: {} } }),
        "passes.a.reads",
        /earlier pass/,
      ],
      [
        "a level nothing wrote",
        {
          shader: undefined,
          textures: { t: { mips: 2 } },
          passes: [
            pass({ name: "b", writes: [{ texture: "t", mip: 0 }] }),
            pass({ reads: [{ texture: "t", mip: 1 }] }),
          ],
        },
        "passes.a.reads",
        /level 1/,
      ],
      [
        "a level it doesn't have",
        onePass(
          { writes: [{ texture: "t", mip: 2 }] },
          { textures: { t: { mips: 2 } } },
        ),
        "passes.a.writes",
        /no level 2/,
      ],
      [
        "reading what it writes",
        {
          shader: undefined,
          textures: { t: { mips: 2 } },
          passes: [
            pass({ name: "b", writes: ["t"] }),
            pass({ reads: ["t"], writes: [{ texture: "t", mip: 1 }] }),
          ],
        },
        "passes.a.writes",
        /level of "t"/,
      ],
      [
        "writing a fixed image",
        onePass(
          { writes: ["t"] },
          {
            textures: {
              t: { width: 1, height: 1, data: new Uint8Array(4) },
            },
          },
        ),
        "passes.a.writes",
        /fixed image/,
      ],
      [
        "a fragment pass of two writes",
        onePass({ writes: ["output", "t"] }, { textures: { t: {} } }),
        "passes.a.writes",
        /one thing/,
      ],
      [
        "a compute pass with no postCompute",
        onePass({ compute: {} }),
        "passes.a.shader",
        /postCompute/,
      ],
      [
        "a workgroup over the limit",
        onePass({ compute: { workgroupSize: [32, 32] } }),
        "passes.a.compute",
        /256/,
      ],
      [
        "a scale over 1",
        { textures: { t: { scale: 2 } } },
        "textures.t",
        /scale of 2/,
      ],
      ["no mips", { textures: { t: { mips: 0 } } }, "textures.t", /0 mips/],
      [
        "a format it can't have",
        { textures: { t: { format: "r8unorm" as never } } },
        "textures.t",
        /"r8unorm"/,
      ],
      [
        "a name that isn't one",
        { textures: { "a b": {} } },
        "textures.a b",
        /name/,
      ],
      [
        "the output's name",
        { textures: { output: {} } },
        "textures.output",
        /name/,
      ],
      [
        "an image of the wrong size",
        { textures: { t: { width: 2, height: 2, data: new Uint8Array(4) } } },
        "textures.t",
        /16 bytes/,
      ],
      [
        "an entry point of its own",
        { shader: `@compute @workgroup_size(1) fn x() { } ${PASS_THROUGH}` },
        "shader",
        /@compute/,
      ],
    ])("refuses %s, naming the field", (_, options, field, message) => {
      const error = refusal(options);
      expect(error.field).toBe(field);
      expect(error.message).toMatch(message);
    });
  });

  describe("in a view", () => {
    let engine: Engine;

    beforeEach(async () => {
      engine = await fakeEngine();
    });
    afterEach(() => {
      engine.stop();
      vi.restoreAllMocks();
    });

    function addView(
      stages: readonly ReturnType<typeof stage>[],
      width = 64,
    ): View {
      const view = engine.addView({
        target: new OffscreenTarget(width, 36),
        world: engine.createWorld(),
        observer: { stages },
      });
      view.camera.lookAt(v3.vec3(6_378_137, 0, 0), 0, -Math.PI / 2, 100);
      return view;
    }

    async function tick(): Promise<void> {
      engine.renderFrame();
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const acquired = (spy: { mock: { calls: unknown[][] } }, label: string) =>
      spy.mock.calls
        .map(([d]) => d as TextureDesc)
        .filter((d) => d.label === label);

    it("orders its passes, each after what it reads, before what follows", async () => {
      const made = stage("veil", "scene", { shader: undefined, ...veil() });
      const view = addView([made]);
      await tick();
      const list = engine.raster.viewFrames.get(view)!.graph.compile();
      const first = list.indexOf("post.veil.input");
      expect(list.slice(first, first + 6)).toEqual([
        "post.veil.input",
        "post.veil.down.1",
        "post.veil.down.2",
        "post.veil.down.3",
        "post.veil.compose",
        "post.veil.add",
      ]);
      expect(list.indexOf("adaptation")).toBeLessThan(first);
      expect(list.indexOf("present")).toBeGreaterThan(first + 5);
    });

    it("owns its textures at their scale, from the pool, and only while it runs", async () => {
      const made = stage("veil", "scene", { shader: undefined, ...veil() });
      addView([made]);
      const acquire = vi.spyOn(engine.raster.pool, "acquire");
      const release = vi.spyOn(engine.raster.pool, "release");
      await tick();
      await tick();
      const [pyramid] = acquired(acquire, "post.veil.pyramid");
      expect(pyramid).toMatchObject({
        width: 32,
        height: 18,
        mipLevelCount: LEVELS,
        format: "rgba16float",
      });
      expect(acquired(acquire, "post.veil.composed")[0]).toMatchObject({
        width: 32,
        height: 18,
      });
      expect(acquired(release, "post.veil.pyramid").length).toBeGreaterThan(0);
      acquire.mockClear();
      made.enabled = false;
      await tick();
      expect(acquired(acquire, "post.veil.pyramid")).toEqual([]);
      expect(acquired(acquire, "post.veil")).toEqual([]);
    });

    it("tells each pass the size of what it writes", async () => {
      const made = stage("veil", "scene", { shader: undefined, ...veil() });
      const view = addView([made]);
      await tick();
      const chain = engine.raster.viewFrames.get(view)!.chain;
      const write = vi.spyOn(chain, "writeParams");
      await tick();
      const sizes = write.mock.calls.map(([, w, h]) => [w, h]);
      expect(sizes).toEqual([
        [32, 18],
        [16, 9],
        [8, 4],
        [4, 2],
        [32, 18],
        [64, 36],
      ]);
      // Radians per pixel of what it writes.
      expect(write.mock.calls[1]![4]).toBeCloseTo(
        write.mock.calls[5]![4] * 4,
        6,
      );
    });

    it("keeps its levels on a view squeezed smaller than they are", async () => {
      const made = stage("veil", "scene", { shader: undefined, ...veil() });
      addView([made], 1);
      const acquire = vi.spyOn(engine.raster.pool, "acquire");
      await tick();
      await tick();
      const [pyramid] = acquired(acquire, "post.veil.pyramid");
      expect(pyramid!.width).toBeGreaterThanOrEqual(1 << (LEVELS - 1));
    });

    it("runs a compute pass over what it writes, and lets it be stored to", async () => {
      const made = stage("compute", "scene", {
        shader: undefined,
        passes: [
          {
            name: "fill",
            compute: {},
            shader: `fn postCompute(input: PostInput) {
              textureStore(output, input.pixel, postFinite(postColorAt(input.pixel)));
            }`,
          },
        ],
      });
      const fragment = stage("fragment", "scene");
      const device = engine.ctx.device;
      const makeEncoder = device.createCommandEncoder.bind(device);
      const dispatches: number[][] = [];
      device.createCommandEncoder = ((d?: GPUCommandEncoderDescriptor) => {
        const encoder = makeEncoder(d);
        const begin = encoder.beginComputePass.bind(encoder);
        encoder.beginComputePass = (descriptor?: GPUComputePassDescriptor) => {
          const pass = begin(descriptor);
          if (descriptor?.label === "post.compute.fill") {
            pass.dispatchWorkgroups = (...size: number[]) => {
              dispatches.push(size);
            };
          }
          return pass;
        };
        return encoder;
      }) as typeof device.createCommandEncoder;
      const makeCompute = device.createComputePipelineAsync.bind(device);
      const entryPoints: Array<string | undefined> = [];
      device.createComputePipelineAsync = ((
        d: GPUComputePipelineDescriptor,
      ) => {
        entryPoints.push(d.compute.entryPoint);
        return makeCompute(d);
      }) as typeof device.createComputePipelineAsync;
      addView([made, fragment]);
      const acquire = vi.spyOn(engine.raster.pool, "acquire");
      await tick();
      await tick();
      expect(entryPoints).toContain("postComputeEntry");
      expect(dispatches.at(-1)).toEqual([8, 5]);
      expect(
        acquired(acquire, "post.compute")[0]!.usage &
          GPUTextureUsage.STORAGE_BINDING,
      ).toBeTruthy();
      expect(
        acquired(acquire, "post.fragment")[0]!.usage &
          GPUTextureUsage.STORAGE_BINDING,
      ).toBeFalsy();
    });

    it("uploads a fixed image once per graph, and frees it with the graph", async () => {
      const device = engine.ctx.device;
      const makeTexture = device.createTexture.bind(device);
      const images: GPUTexture[] = [];
      device.createTexture = ((d: GPUTextureDescriptor) => {
        const texture = makeTexture(d);
        if (d.label === "post.lut.lut") {
          images.push(texture);
        }
        return texture;
      }) as typeof device.createTexture;
      const made = stage("lut", "exposed", {
        textures: { lut: { width: 2, height: 2, data: new Uint8Array(16) } },
        reads: ["lut"],
      });
      const view = addView([made]);
      await tick();
      await tick();
      expect(images.length).toBe(1);
      let destroyed = 0;
      images[0]!.destroy = () => {
        destroyed++;
      };
      view.observer.stages = [];
      await tick();
      expect(destroyed).toBe(1);
    });
  });
});

describe("a built-in stage of several passes", () => {
  it("registers itself in the slot's place, with what it needs", () => {
    installGpuGlobals();
    const pool = {
      acquire: () => ({}),
      release: () => {},
    } as unknown as ConstructorParameters<typeof FrameGraph>[0];
    const graph = new FrameGraph(pool);
    const usage = 4;
    const size = { width: 8, height: 8, format: "rgba16float", usage } as const;
    const input = graph.createTexture("color", size);
    const depth = graph.createTexture("depth", size);
    const ids = graph.createTexture("ids", size);
    const chain = new ViewChain();
    const slot = new ChainSlot(input);
    const seen: string[] = [];
    const built: GraphStage = {
      name: "glare",
      slot: "scene",
      kind: "physics",
      label: "Glare",
      enabled: true,
      register(g, io) {
        expect(g).toBe(graph);
        expect(io.sources).toEqual([input]);
        expect(io.source()).toBe(input);
        expect(io.output.name).toBe("post.glare");
        expect([io.width, io.height]).toEqual([8, 8]);
        g.addPass(
          "glare.veil",
          { reads: [...io.sources], writes: [io.output] },
          () => seen.push("veil"),
        );
      },
    };
    const device = fakeDevice({});
    registerSlot(
      { ctx: { device } } as unknown as ChainEngine,
      graph,
      chain,
      slot,
      [built],
      {
        width: 8,
        height: 8,
        depth,
        ids,
        view: undefined as never,
        preExposure: () => 1,
        pixelAngle: () => 0.001,
      },
    );
    expect(slot.latest().name).toBe("post.glare");
    built.enabled = false;
    expect(slot.latest()).toBe(input);
    expect(chainOrder([built]).scene).toEqual([built]);
  });
});

describe("FrameGraph's mips", () => {
  const desc = (mipLevelCount?: number): TextureDesc => ({
    width: 256,
    height: 256,
    format: "rgba16float",
    usage: 4,
    ...(mipLevelCount === undefined ? {} : { mipLevelCount }),
  });

  it("counts their bytes", () => {
    installGpuGlobals();
    const pool = new TexturePool(fakeDevice({}));
    pool.acquire(desc());
    const base = pool.stats.residentBytes;
    const mipped = new TexturePool(fakeDevice({}));
    mipped.acquire(desc(5));
    expect(mipped.stats.residentBytes / base).toBeGreaterThan(1.32);
    expect(mipped.stats.residentBytes / base).toBeLessThan(1.34);
  });

  it("doesn't share a bucket between descs that differ only in mips", () => {
    installGpuGlobals();
    const pool = new TexturePool(fakeDevice({}));
    const a = desc(1);
    const texture = pool.acquire(a);
    pool.release(a, texture);
    expect(pool.acquire(desc(5))).not.toBe(texture);
    expect(pool.acquire(desc(1))).toBe(texture);
  });

  it("gives one view of a level, and an image's own for each", () => {
    installGpuGlobals();
    const pool = new TexturePool(fakeDevice({}));
    const graph = new FrameGraph(pool);
    const handle = graph.createTexture("pyramid", desc(5));
    expect(graph.mipView(handle, 2)).toBe(graph.mipView(handle, 2));
    expect(graph.mipView(handle, 2)).not.toBe(graph.mipView(handle, 3));
    expect(graph.texture(handle)).toBeDefined();
  });
});
