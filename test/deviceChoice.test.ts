// The device choice (CS-35): the `renderer` option, what `auto` does when
// WebGPU is missing, the persona that `emulate` runs, and the rejection below
// the floor, with fake probes (the rules are pure), plus the WebGPU probe on
// a fake `navigator`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webgl2Personas } from "../packages/core/src/profile/personas.ts";
import {
  chooseDevice,
  forgetFallbackWarnings,
  forgetProbes,
  NoRendererError,
  probeWebgpu,
  warnFallback,
  type Probes,
  type Webgl2Probe,
  type WebgpuProbe,
} from "../packages/core/src/scene/deviceChoice.ts";
import { fakeGlFor, installFakeGl, uninstallFakeGl } from "./fakeGl.ts";

/** Probes that answer as told, and count how often they were asked. */
function probes(
  webgpu: WebgpuProbe,
  webgl2: Webgl2Probe,
): Probes & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    webgpu: async () => {
      asked.push("webgpu");
      return webgpu;
    },
    webgl2: async () => {
      asked.push("webgl2");
      return webgl2;
    },
  };
}

const basic = { ok: true, facts: webgl2Personas["webgl2-basic"] } as const;
const NO_ADAPTER = { ok: false, reason: "no adapter" } as const;

describe("chooseDevice", () => {
  it('"auto" takes WebGPU where it is available, and never probes WebGL 2', async () => {
    const p = probes({ ok: true }, basic);
    const choice = await chooseDevice({}, p);
    expect(choice).toMatchObject({
      renderer: "webgpu",
      requested: "auto",
      reason: "WebGPU available",
      fellBack: false,
    });
    expect(p.asked).toEqual(["webgpu"]);
  });

  it('"auto" falls back to WebGL 2 where WebGPU is missing, and says why', async () => {
    const p = probes(NO_ADAPTER, basic);
    const choice = await chooseDevice({ renderer: "auto" }, p);
    expect(choice).toMatchObject({
      renderer: "webgl2",
      requested: "auto",
      reason: "WebGPU unavailable: no adapter",
      fellBack: true,
    });
    expect(choice.webgl2).toBe(basic.facts);
    expect(p.asked).toEqual(["webgpu", "webgl2"]);
  });

  it('"auto" under strict throws instead of falling back', async () => {
    await expect(
      chooseDevice({ strict: true }, probes(NO_ADAPTER, basic)),
    ).rejects.toThrow(
      'strict: WebGPU is unavailable (no adapter), and renderer "auto" would fall back to WebGL 2.',
    );
  });

  it('"webgpu" is forced: no fallback, and the rejection names why', async () => {
    const p = probes(NO_ADAPTER, basic);
    await expect(chooseDevice({ renderer: "webgpu" }, p)).rejects.toThrow(
      'renderer "webgpu" was asked for, but WebGPU is unavailable: no adapter.',
    );
    expect(p.asked).toEqual(["webgpu"]);
  });

  it('"webgl2" is forced: it never asks WebGPU, and isn\'t a fallback', async () => {
    const p = probes({ ok: true }, basic);
    const choice = await chooseDevice({ renderer: "webgl2" }, p);
    expect(choice).toMatchObject({
      renderer: "webgl2",
      reason: 'renderer: "webgl2"',
      fellBack: false,
    });
    expect(p.asked).toEqual(["webgl2"]);
  });

  it("rejects below the floor with a message naming the missing item", async () => {
    const below: Webgl2Probe = {
      ok: false,
      missing: ["the extension EXT_color_buffer_float (HDR color)"],
    };
    const error = await chooseDevice(
      { renderer: "webgl2" },
      probes({ ok: true }, below),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NoRendererError);
    expect((error as Error).message).toBe(
      'Engine.create: renderer "webgl2" was asked for, but WebGL 2 lacks the extension EXT_color_buffer_float (HDR color).',
    );
    // From "auto", both reasons are in it.
    await expect(chooseDevice({}, probes(NO_ADAPTER, below))).rejects.toThrow(
      "WebGPU is unavailable (no adapter), and WebGL 2 lacks the extension EXT_color_buffer_float",
    );
  });

  it("rejects, naming a context, where there is no WebGL 2 at all", async () => {
    await expect(
      chooseDevice(
        {},
        probes(NO_ADAPTER, { ok: false, missing: ["a WebGL 2 context"] }),
      ),
    ).rejects.toThrow("WebGL 2 lacks a WebGL 2 context.");
  });
});

describe("emulate", () => {
  const chrome = { ok: true, facts: webgl2Personas["webgl2-chrome"] } as const;

  it("runs the WebGL 2 device with what the persona lacks hidden", async () => {
    const p = probes({ ok: true }, chrome);
    const choice = await chooseDevice({ emulate: "webgl2-basic" }, p);
    expect(choice).toMatchObject({
      renderer: "webgl2",
      reason: "emulating webgl2-basic",
      emulating: "webgl2-basic",
      fellBack: false,
    });
    // The real context has clip control and multi-draw; the persona hides them.
    expect(choice.webgl2!.extensions).toEqual(["EXT_color_buffer_float"]);
    expect(choice.webgl2!.limits.maxTextureSize).toBe(4096);
    expect(choice.webgl2!.limits.maxDrawBuffers).toBe(4);
    expect(choice.webgl2!.emulating).toBe("webgl2-basic");
    // WebGPU isn't asked: emulating names the device.
    expect(p.asked).toEqual(["webgl2"]);
  });

  it("can only remove capabilities, never add them", async () => {
    const choice = await chooseDevice(
      { emulate: "webgl2-chrome" },
      probes({ ok: true }, basic),
    );
    expect(choice.webgl2!.extensions).toEqual(["EXT_color_buffer_float"]);
    expect(choice.webgl2!.limits).toEqual(basic.facts.limits);
  });

  it("is refused for a WebGPU device, and for a name that isn't a WebGL 2 persona", async () => {
    await expect(
      chooseDevice(
        { emulate: "webgl2-basic", renderer: "webgpu" },
        probes({ ok: true }, basic),
      ),
    ).rejects.toThrow(/can't run/);
    await expect(
      chooseDevice(
        { emulate: "m2-chrome" as never },
        probes({ ok: true }, basic),
      ),
    ).rejects.toThrow(/not a WebGL 2 persona/);
  });
});

describe("the fallback warning", () => {
  beforeEach(() => forgetFallbackWarnings());

  it("is given once, with the reason", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const choice = await chooseDevice({}, probes(NO_ADAPTER, basic));
    warnFallback(choice);
    warnFallback(choice);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("WebGPU unavailable: no adapter");
    warn.mockRestore();
  });

  it("is not given where nothing fell back", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnFallback(await chooseDevice({}, probes({ ok: true }, basic)));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("probeWebgpu", () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const useNavigator = (value: unknown) =>
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value,
    });
  beforeEach(() => forgetProbes());
  afterEach(() => {
    if (saved) {
      Object.defineProperty(globalThis, "navigator", saved);
    }
    uninstallFakeGl();
  });

  it("says navigator.gpu is missing", async () => {
    useNavigator({});
    expect(await probeWebgpu()).toEqual({
      ok: false,
      reason: "navigator.gpu is missing",
    });
  });

  it("says there is no adapter", async () => {
    useNavigator({ gpu: { requestAdapter: async () => null } });
    expect(await probeWebgpu()).toEqual({ ok: false, reason: "no adapter" });
  });

  it("says why requestAdapter threw", async () => {
    useNavigator({
      gpu: {
        requestAdapter: async () => {
          throw new Error("blocked");
        },
      },
    });
    expect(await probeWebgpu()).toEqual({
      ok: false,
      reason: "requestAdapter threw: blocked",
    });
  });

  it("asks a throwaway OffscreenCanvas for a webgpu context, and asks for no device", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    const requestDevice = vi.fn();
    // The fake canvas has no WebGPU context: the page can't draw with it.
    useNavigator({
      gpu: { requestAdapter: async () => ({ requestDevice }) },
    });
    expect(await probeWebgpu()).toEqual({
      ok: false,
      reason: "no WebGPU canvas context",
    });
    expect(requestDevice).not.toHaveBeenCalled();
  });

  it("is available with an adapter (and where there is no OffscreenCanvas to ask)", async () => {
    useNavigator({ gpu: { requestAdapter: async () => ({}) } });
    expect(await probeWebgpu()).toEqual({ ok: true });
  });

  it("runs once a page", async () => {
    const requestAdapter = vi.fn(async () => ({}));
    useNavigator({ gpu: { requestAdapter } });
    await probeWebgpu();
    await probeWebgpu();
    expect(requestAdapter).toHaveBeenCalledTimes(1);
  });
});
