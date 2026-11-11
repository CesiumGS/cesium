// Waiting for a view's first right frame (`Engine.whenReady`, provisional): the
// shader cache says when a pipeline is still to come, the world says when its
// draws had none of those and were diced, and the wait follows the frames.
import { describe, expect, it } from "vitest";
import { installGpuGlobals } from "./fakeGpu.ts";
import { whenReady } from "../src/scene/engineReady.ts";
import { drawsReady, type ReadyWorld } from "../src/scene/world/ready.ts";
import { withPatchDisplay } from "../src/scene/world/patches.ts";
import { PATCH_ISO_SHIFT, RecordFlags } from "../src/render/layout.ts";
import type { CustomShader } from "../src/scene/CustomShader.ts";
import type { View } from "../src/scene/View.ts";
import type { Batch, DrawHandle } from "../src/scene/world/types.ts";

// The cache reaches the engine's pipeline keys, which read WebGPU's flags.
installGpuGlobals();
const { ShaderCache } = await import("../src/scene/ShaderCache.ts");

const shader = (code: string) => ({ code }) as unknown as CustomShader;
const pipeline = {} as GPURenderPipeline;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("ShaderCache.pending", () => {
  // A world records again whenever it is told (`World.shaderReady`): it asks
  // for the pipeline again, which is what starts the making once compiled.
  const asking = (cache: InstanceType<typeof ShaderCache>, s: CustomShader) => {
    const told: string[] = [];
    const ask = (): GPURenderPipeline | undefined => {
      told.push("asked");
      return cache.pipeline(s, "opaque", () => void setTimeout(ask, 0));
    };
    return { ask, told };
  };

  it("is true from the first ask until the pipeline is made", async () => {
    let made: (() => void) | undefined;
    const cache = new ShaderCache(
      async () => () =>
        new Promise<GPURenderPipeline>((resolve) => {
          made = () => resolve(pipeline);
        }),
    );
    const s = shader("a");
    const { ask } = asking(cache, s);
    expect(cache.pending(s, "opaque")).toBe(false);
    expect(ask()).toBeUndefined();
    expect(cache.pending(s, "opaque")).toBe(true);
    for (let i = 0; i < 3 && !made; i++) {
      await flush();
    }
    made!();
    await flush();
    expect(cache.pending(s, "opaque")).toBe(false);
    expect(ask()).toBe(pipeline);
  });

  it("ends when the pipeline fails, and tells the worlds to record again", async () => {
    const cache = new ShaderCache(
      async () => () => Promise.reject(new Error("no pipeline")),
      { report: () => undefined } as never,
    );
    const s = shader("b");
    const { ask, told } = asking(cache, s);
    ask();
    for (let i = 0; i < 5; i++) {
      await flush();
    }
    expect(cache.pending(s, "opaque")).toBe(false);
    // Asked again when the shader compiled (which made the pipeline), and again when it failed.
    expect(told.length).toBeGreaterThanOrEqual(3);
  });

  it("ends when the shader fails to compile, and tells the worlds", async () => {
    const cache = new ShaderCache(() => Promise.reject(new Error("bad wgsl")), {
      report: () => undefined,
    } as never);
    const s = shader("c");
    let ready = 0;
    cache.pipeline(s, "opaque", () => ready++);
    expect(cache.pending(s, "opaque")).toBe(true);
    await flush();
    expect(cache.pending(s, "opaque")).toBe(false);
    expect(ready).toBe(1);
  });
});

const batch = (shown = 1) => ({ shown }) as unknown as Batch;
const handle = (index: number) => ({ index }) as unknown as DrawHandle;

function worldOf(options: {
  bundle?: boolean;
  gaps?: Record<string, Batch[]>;
  patchDraws?: Array<{ batch: Batch; diced: boolean }>;
  drawBatches?: Batch[];
}): ReadyWorld {
  return {
    raster: {
      bundle: options.bundle === false ? undefined : ({} as GPURenderBundle),
      drawBatches: options.drawBatches ?? [],
      patchDraws: new Map(
        (options.patchDraws ?? []).map((draw, i) => [i, draw] as const),
      ),
      pipelineGaps: new Map(
        Object.entries(options.gaps ?? {}).map(
          ([kind, batches]) => [kind, new Set(batches)] as const,
        ),
      ),
    },
  } as unknown as ReadyWorld;
}

describe("drawsReady", () => {
  const a = batch();
  const b = batch();

  it("waits for the world's first bundle", () => {
    expect(drawsReady(worldOf({ bundle: false }))).toBe(false);
    expect(drawsReady(worldOf({}))).toBe(true);
  });

  it("waits while any bundle drew a batch with a stand-in", () => {
    const world = worldOf({ gaps: { "shadow+clip": [a] } });
    expect(drawsReady(world)).toBe(false);
  });

  it("looks at the named draws only", () => {
    const world = worldOf({ gaps: { opaque: [a] }, drawBatches: [a, b] });
    expect(drawsReady(world, [handle(0)])).toBe(false);
    expect(drawsReady(world, [handle(1)])).toBe(true);
  });

  it("waits for a shown patch draw to be diced once", () => {
    const undiced = { batch: a, diced: false };
    expect(drawsReady(worldOf({ patchDraws: [undiced] }))).toBe(false);
    expect(
      drawsReady(worldOf({ patchDraws: [{ batch: a, diced: true }] })),
    ).toBe(true);
    // A draw no view shows is not diced, and not waited for.
    expect(
      drawsReady(worldOf({ patchDraws: [{ batch: batch(0), diced: false }] })),
    ).toBe(true);
  });
});

describe("whenReady", () => {
  function fake() {
    const listeners = new Set<(now: number) => void>();
    const errors: string[] = [];
    const engine = {
      stats: { framesRendered: 0 },
      renders: 0,
      onAfterTick(listener: (now: number) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      requestRender() {
        this.renders++;
      },
      reportError(_kind: string, message: string) {
        errors.push(message);
      },
    };
    const frame = () => {
      engine.stats.framesRendered++;
      for (const listener of [...listeners]) {
        listener(0);
      }
    };
    return { engine, listeners, errors, frame };
  }
  const viewOf = (ready: () => boolean) =>
    ({ world: { destroyed: false, ready } }) as unknown as View;

  it("resolves after a frame that finds everything ready, asking for frames until then", async () => {
    const { engine, listeners, frame } = fake();
    let ready = false;
    let done = false;
    const waiting = whenReady(
      engine as never,
      viewOf(() => ready),
    ).then(() => {
      done = true;
    });
    expect(engine.renders).toBe(1);
    frame();
    await flush();
    expect(done).toBe(false);
    expect(engine.renders).toBe(2);
    ready = true;
    frame();
    await waiting;
    expect(done).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it("wants a frame rendered since the call, however ready the world looks", async () => {
    const { engine, listeners } = fake();
    let done = false;
    const waiting = whenReady(
      engine as never,
      viewOf(() => true),
    ).then(() => {
      done = true;
    });
    // A tick that rendered nothing since the call (the frame count is the same).
    for (const listener of [...listeners]) {
      listener(0);
    }
    await flush();
    expect(done).toBe(false);
    engine.stats.framesRendered++;
    for (const listener of [...listeners]) {
      listener(0);
    }
    await waiting;
    expect(done).toBe(true);
  });

  it("passes its draws to the world", async () => {
    const { engine, frame } = fake();
    const draws = [handle(3)];
    let seen: unknown;
    const view = {
      world: {
        destroyed: false,
        ready: (d: unknown) => {
          seen = d;
          return true;
        },
      },
    } as unknown as View;
    const waiting = whenReady(engine as never, view, { draws });
    frame();
    await waiting;
    expect(seen).toBe(draws);
  });

  it("rejects when aborted, and resolves with a report after its timeout", async () => {
    const { engine, listeners, errors } = fake();
    const controller = new AbortController();
    const aborted = whenReady(
      engine as never,
      viewOf(() => false),
      { signal: controller.signal },
    );
    controller.abort(new Error("left"));
    await expect(aborted).rejects.toThrow("left");
    expect(listeners.size).toBe(0);
    await whenReady(
      engine as never,
      viewOf(() => false),
      { timeoutMs: 5 },
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not ready after 5 ms");
    expect(listeners.size).toBe(0);
  });
});

describe("withPatchDisplay", () => {
  it("sets the display bits and keeps the draw's other flags", () => {
    const flags = RecordFlags.patches | RecordFlags.notGround;
    const shown = withPatchDisplay(flags, {
      wire: true,
      iso: 6,
      flat: true,
      linesOnly: true,
    });
    expect(shown & flags).toBe(flags);
    expect(shown & RecordFlags.patchWire).toBeTruthy();
    expect(shown & RecordFlags.patchFlat).toBeTruthy();
    expect(shown & RecordFlags.patchLinesOnly).toBeTruthy();
    expect(shown & RecordFlags.patchIso).toBeTruthy();
    expect((shown >>> PATCH_ISO_SHIFT) & 255).toBe(6);
  });

  it("clears what is omitted, and reads an iso boolean as 8 divisions", () => {
    const on = withPatchDisplay(RecordFlags.patches, { iso: true, wire: true });
    expect((on >>> PATCH_ISO_SHIFT) & 255).toBe(8);
    const off = withPatchDisplay(on, {});
    expect(off).toBe(RecordFlags.patches);
    // One division is no lines.
    expect(withPatchDisplay(0, { iso: 1 })).toBe(0);
  });

  it("refuses a count that doesn't fit", () => {
    expect(() => withPatchDisplay(0, { iso: 300 })).toThrow(RangeError);
    expect(() => withPatchDisplay(0, { iso: -2 })).toThrow(RangeError);
  });
});
