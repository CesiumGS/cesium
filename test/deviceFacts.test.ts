import { describe, expect, it } from "vitest";
import { GpuDevice } from "../packages/core/src/gpu/GpuDevice.ts";
import { storageWritesRunPerSample } from "../packages/core/src/gpu/sampleRateProbe.ts";
import { installPersona, personas, type PersonaName } from "./fakeGpu.ts";

const REQUESTED = 12;

describe("DeviceFacts", () => {
  for (const name of Object.keys(personas) as PersonaName[]) {
    it(`reports what ${name} granted, with its adapter info`, async () => {
      const persona = installPersona(name);
      const gpu = await GpuDevice.create({ recoverFromLoss: false });
      const facts = gpu.facts;
      expect(facts.features).toEqual([...persona.features].sort());
      expect(facts.adapter).toEqual(persona.info);
      expect(facts.canvasFormat).toBe(persona.canvasFormat);
      expect(facts.probes.storageWritesRunPerSample).toBe("unknown");
      gpu.destroy();
    });
  }

  it("reports all 12 requested features, not 6", async () => {
    installPersona("minimum-limits");
    const gpu = await GpuDevice.create({ recoverFromLoss: false });
    expect(gpu.facts.features).toHaveLength(REQUESTED);
    gpu.destroy();
  });

  it("carries isFallbackAdapter for the fallback persona", async () => {
    installPersona("swiftshader");
    const gpu = await GpuDevice.create({ recoverFromLoss: false });
    expect(gpu.facts.adapter.isFallbackAdapter).toBe(true);
    gpu.destroy();
  });

  it("records a probe that errors as unknown", async () => {
    installPersona("m2-chrome");
    const gpu = await GpuDevice.create({ recoverFromLoss: false });
    // The fake device can't map a readback: the probe errors.
    const device = gpu.device;
    Object.assign(device as object, {
      createRenderPipelineAsync: () => Promise.reject(new Error("no")),
    });
    expect(await storageWritesRunPerSample(device)).toBe(true);
    expect(gpu.facts.probes.storageWritesRunPerSample).toBe("unknown");
    gpu.destroy();
  });
});
