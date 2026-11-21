// The WebGL 2 probe (CS-35): the facts it reads from a context, the
// framebuffers it builds and checks, the reason a context is below the floor,
// and that it needs nothing but an OffscreenCanvas (so it runs in a worker).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetProbes } from "../src/scene/deviceChoice.ts";
import { belowFloor, PROBED_FRAMEBUFFERS } from "../src/profile/webgl2Facts.ts";
import { angleBackend, probeWebgl2 } from "../src/webgl2/probe.ts";
import {
  FakeOffscreenCanvas,
  GL,
  fakeGlFor,
  installFakeGl,
  uninstallFakeGl,
} from "./fakeGl.ts";

beforeEach(() => forgetProbes());
afterEach(() => uninstallFakeGl());

describe("the WebGL 2 probe", () => {
  it("reads the facts of a context that meets the floor", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(true);
    const facts = probe.facts!;
    expect(facts.renderer).toBe("webgl2");
    expect(facts.version).toContain("WebGL 2.0");
    expect(facts.limits).toEqual({
      maxTextureSize: 4096,
      maxArrayTextureLayers: 256,
      max3dTextureSize: 256,
      maxUniformBlockSize: 16384,
      maxVertexTextureImageUnits: 16,
      maxSamples: 4,
      maxDrawBuffers: 4,
    });
    expect(facts.extensions).toContain("EXT_color_buffer_float");
    expect(facts.extensions).not.toContain("EXT_clip_control");
    expect(belowFloor(facts)).toEqual([]);
  });

  it("builds the renderer's framebuffers and checks each is complete", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    const { facts } = await probeWebgl2();
    expect(facts!.framebuffers.map((f) => f.name)).toEqual([
      ...PROBED_FRAMEBUFFERS,
    ]);
    expect(facts!.framebuffers.every((f) => f.complete)).toBe(true);
    const gl = FakeOffscreenCanvas.contexts[0]!;
    // Built for real: the multisampled storage was asked for at 4 samples.
    expect(gl.called("deleteFramebuffer")).toHaveLength(4);
  });

  it("asks for EXT_color_buffer_float before it builds a float target", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    await probeWebgl2();
    const calls = FakeOffscreenCanvas.contexts[0]!.calls.map((c) => c.name);
    expect(calls.indexOf("getExtension")).toBeLessThan(
      calls.indexOf("bindFramebuffer"),
    );
  });

  it("is below the floor, naming the extension, where EXT_color_buffer_float is missing", async () => {
    installFakeGl(fakeGlFor("webgl2-basic", { extensions: [] }));
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(false);
    const missing = probe.ok ? [] : probe.missing;
    expect(missing[0]).toContain("EXT_color_buffer_float");
    // The float targets can't be completed without it: checked, not assumed.
    expect(missing.join(" ")).toContain("hdr framebuffer is incomplete");
  });

  it("is below the floor, naming the limit, its value and the least", async () => {
    installFakeGl(
      fakeGlFor("webgl2-basic", { limits: { maxTextureSize: 2048 } }),
    );
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(false);
    expect(probe.ok ? [] : probe.missing).toEqual([
      "MAX_TEXTURE_SIZE is 2048, and at least 4096 is needed",
    ]);
  });

  it("names a framebuffer that isn't complete, though every extension is there", async () => {
    installFakeGl(
      fakeGlFor("webgl2-basic", { incompleteFormats: [GL.RG16UI] }),
    );
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(false);
    expect(probe.ok ? [] : probe.missing).toEqual([
      "the ids framebuffer is incomplete (FRAMEBUFFER_INCOMPLETE_ATTACHMENT)",
    ]);
  });

  it("finds a multisample count the context refuses", async () => {
    installFakeGl(fakeGlFor("webgl2-basic", { limits: { maxSamples: 2 } }));
    const probe = await probeWebgl2();
    const missing = probe.ok ? [] : probe.missing;
    expect(missing).toContain("MAX_SAMPLES is 2, and at least 4 is needed");
    expect(
      missing.some((m) => m.startsWith("the hdr-multisampled framebuffer")),
    ).toBe(true);
  });

  it("rejects, naming a context, where there is no WebGL 2", async () => {
    installFakeGl({ noWebgl2: true });
    const probe = await probeWebgl2();
    expect(probe).toEqual({ ok: false, missing: ["a WebGL 2 context"] });
  });

  it("records the unmasked renderer, the ANGLE backend and no software renderer", async () => {
    installFakeGl(fakeGlFor("webgl2-chrome"));
    const { facts } = await probeWebgl2();
    expect(facts!.unmasked?.renderer).toContain("ANGLE Metal Renderer");
    expect(facts!.angleBackend).toBe("metal");
    expect(facts!.software).toBe(false);
  });

  it("leaves the unmasked strings out where the browser blocks them", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    const { facts } = await probeWebgl2();
    expect(facts!.unmasked).toBeUndefined();
    expect(facts!.angleBackend).toBeUndefined();
  });

  it("flags a software renderer, and doesn't refuse it", async () => {
    installFakeGl(
      fakeGlFor("webgl2-basic", {
        unmasked: {
          vendor: "Google Inc. (Google)",
          renderer:
            "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
        },
      }),
    );
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(true);
    expect(probe.facts!.software).toBe(true);
    expect(probe.facts!.angleBackend).toBe("vulkan");
  });

  it("records failIfMajorPerformanceCaveat: accepted, then refused (and asks again without it)", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    expect((await probeWebgl2()).facts!.failIfMajorPerformanceCaveat).toBe(
      "accepted",
    );
    forgetProbes();
    installFakeGl(fakeGlFor("webgl2-basic", { refusesCaveat: true }));
    const probe = await probeWebgl2();
    expect(probe.ok).toBe(true);
    expect(probe.facts!.failIfMajorPerformanceCaveat).toBe("refused");
    expect(
      FakeOffscreenCanvas.requests.map(
        (r) =>
          (r.attributes as { failIfMajorPerformanceCaveat?: boolean })
            .failIfMajorPerformanceCaveat ?? false,
      ),
    ).toEqual([true, false]);
  });

  it("runs once a page, and releases its throwaway context", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    const first = await probeWebgl2();
    const second = await probeWebgl2();
    expect(second).toBe(first);
    expect(FakeOffscreenCanvas.contexts).toHaveLength(1);
    expect(FakeOffscreenCanvas.contexts[0]!.lost).toBe(true);
  });

  it("needs only an OffscreenCanvas, so it runs in a worker", async () => {
    installFakeGl(fakeGlFor("webgl2-basic"));
    // No window, no document: what a worker has.
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    expect((await probeWebgl2()).ok).toBe(true);
    expect(FakeOffscreenCanvas.requests[0]?.kind).toBe("webgl2");
  });
});

describe("angleBackend", () => {
  it.each([
    [
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
      "metal",
    ],
    [
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "d3d11",
    ],
    ["ANGLE (Intel, Mesa Intel(R) UHD Graphics, OpenGL 4.6)", "opengl"],
    ["ANGLE (ARM, Mali-G78, Vulkan 1.1.0)", "vulkan"],
    ["Apple GPU", undefined],
    ["Mali-G710", undefined],
  ])("reads %s as %s", (renderer, backend) => {
    expect(angleBackend(renderer)).toBe(backend);
  });
});
