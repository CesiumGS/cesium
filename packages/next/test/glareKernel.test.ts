// Spike sprites' kernel (sky and observer plan, Task 14), at size 128 so it runs in under
// a second. spikes/observer.ts (group `sprites`) draws them.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  KERNEL_MIN_CELLS,
  KERNEL_RADII,
  computeKernel,
  kernelImage,
  kernelRadii,
  type GlareKernel,
} from "../src/render/post/glareKernel.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { cameraObserver, type GlarePupil } from "../src/scene/observer.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const SIZE = 128;
const kernels = new Map<GlarePupil, GlareKernel>();
const kernel = (aperture: GlarePupil) => {
  let k = kernels.get(aperture);
  if (!k) {
    k = computeKernel(aperture, SIZE);
    kernels.set(aperture, k);
  }
  return k;
};

/** Green's sum by angle, in `bins` of 0 to 2π, between two radii, cells. */
function byAngle(k: GlareKernel, from: number, to: number, bins: number) {
  const out = new Float64Array(bins);
  const m = k.size / 2;
  for (let y = 0; y < k.size; y++) {
    for (let x = 0; x < k.size; x++) {
      const r = Math.hypot(x - m, y - m);
      if (r >= from && r < to) {
        // Half a bin on: a spike along a bin's edge would go either way by rounding.
        const a =
          (Math.atan2(y - m, x - m) + Math.PI / bins + 2 * Math.PI) %
          (2 * Math.PI);
        const bin = Math.min(Math.floor((a / (2 * Math.PI)) * bins), bins - 1);
        out[bin] = out[bin]! + k.texels[(y * k.size + x) * 4 + 1]!;
      }
    }
  }
  return out;
}

/** The strongest repeat around the circle, 2 or more: how many spikes there are. */
function spikes(values: ArrayLike<number>): number {
  const n = values.length;
  let best = 0;
  let strongest = 0;
  for (let m = 2; m <= 32; m++) {
    let [re, im] = [0, 0];
    for (let i = 0; i < n; i++) {
      re += values[i]! * Math.cos((2 * Math.PI * m * i) / n);
      im += values[i]! * Math.sin((2 * Math.PI * m * i) / n);
    }
    const power = Math.hypot(re, im);
    if (power > strongest) {
      strongest = power;
      best = m;
    }
  }
  return best;
}

describe("computeKernel", () => {
  it("sums to 1, with its center at 0 and no step across the taper", () => {
    for (const aperture of ["round", "vanes", "hex", "blades7"] as const) {
      const k = kernel(aperture);
      const m = SIZE / 2;
      let total = 0;
      for (let i = 1; i < k.texels.length; i += 4) {
        total += k.texels[i]!;
      }
      expect(Math.abs(total - 1)).toBeLessThan(0.01);
      expect(k.texels[(m * SIZE + m) * 4 + 1]).toBe(0);
      // Over the taper the kernel's rings still come and go, so its window is what's
      // tested: each ring's mean moves by under 5% of the largest ring's, step to step.
      const rings = new Float64Array(m);
      const counts = new Float64Array(m);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const r = Math.round(Math.hypot(x - m, y - m));
          if (r < m) {
            rings[r] = rings[r]! + k.texels[(y * SIZE + x) * 4 + 1]!;
            counts[r] = counts[r]! + 1;
          }
        }
      }
      const means = rings.map((v, i) => v / Math.max(counts[i]!, 1));
      const edge = Math.max(...means.slice(m - 12, m));
      expect(edge, aperture).toBeLessThan(Math.max(...means) * 0.05);
      expect(means[m - 1]!).toBeLessThan(Math.max(...means) * 0.01);
    }
  });

  it("vanes: four-fold, and 10 times more along its axes than between them", () => {
    // A finer grid: 128 has under a cell for a vane.
    const k = computeKernel("vanes", 512);
    const m = 256;
    const sector = (axis: number) => {
      let sum = 0;
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const r = Math.hypot(x - m, y - m);
          if (r >= 48 && r < 176) {
            const a = Math.atan2(y - m, x - m);
            const off = Math.abs(
              Math.atan2(Math.sin(a - axis), Math.cos(a - axis)),
            );
            if (off < (2.5 * Math.PI) / 180) {
              sum += k.texels[(y * 512 + x) * 4 + 1]!;
            }
          }
        }
      }
      return sum;
    };
    const quarter = Math.PI / 2;
    const along = [0, 1, 2, 3].map((i) => sector(Math.PI / 4 + i * quarter));
    const between = [0, 1, 2, 3].map((i) => sector(i * quarter));
    for (const v of along) {
      expect(Math.abs(v / along[0]! - 1)).toBeLessThan(0.02);
    }
    const mean = (values: number[]) =>
      values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean(along) / mean(between)).toBeGreaterThan(10);
  });

  it("hex shows 6 spikes", () => {
    expect(spikes(byAngle(kernel("hex"), 12, 44, 72))).toBe(6);
  });

  it("blades7 shows 14", () => {
    expect(spikes(byAngle(kernel("blades7"), 12, 44, 140))).toBe(14);
  });

  it("round has no spike: under 1.5 times between any two angles", () => {
    const angles = byAngle(kernel("round"), 12, 44, 24);
    expect(Math.max(...angles) / Math.min(...angles)).toBeLessThan(1.5);
  });

  it("spreads longer wavelengths wider", () => {
    const k = kernel("round");
    const m = SIZE / 2;
    const halfRadius = (channel: number) => {
      const rings = new Float64Array(m * 2);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const r = Math.round(Math.hypot(x - m, y - m));
          rings[r] = rings[r]! + k.texels[(y * SIZE + x) * 4 + channel]!;
        }
      }
      let sum = 0;
      for (let r = 0; r < rings.length; r++) {
        sum += rings[r]!;
        if (sum >= 0.5) {
          const before = sum - rings[r]!;
          return r - 1 + (0.5 - before) / rings[r]!;
        }
      }
      return rings.length;
    };
    expect(halfRadius(0)).toBeGreaterThan(halfRadius(2));
  });

  it("gives radii that fall as brightness falls, and no sprite below 2 cells", () => {
    const { radii } = kernel("vanes");
    expect(radii.length).toBe(KERNEL_RADII);
    for (let i = 1; i < KERNEL_RADII; i++) {
      expect(radii[i]!).toBeGreaterThanOrEqual(radii[i - 1]!);
    }
    expect(radii[KERNEL_RADII - 1]).toBeGreaterThan(SIZE / 4);
    for (const r of radii) {
      expect(r === 0 || r >= KERNEL_MIN_CELLS).toBe(true);
    }
    // A kernel that reaches only 1 cell gives no sprite at any brightness.
    const tiny = new Float32Array(16 * 16 * 4);
    tiny[(8 * 16 + 9) * 4] = 1;
    expect([...kernelRadii(tiny, 16)].every((r) => r === 0)).toBe(true);
  });

  it("refuses an unknown aperture, naming it", () => {
    expect(() => computeKernel("grating" as GlarePupil, SIZE)).toThrow(
      /"grating"/,
    );
  });
});

describe("kernelImage", () => {
  it("has levels down to 4, in fp16, scaled to reach 1", () => {
    const image = kernelImage(kernel("hex"));
    expect(image.levels.length).toBe(Math.log2(SIZE / 4) + 1);
    expect(image.levels[0]!.length).toBe(SIZE * SIZE * 4);
    const most = Math.max(...image.levels[0]!);
    expect(most).toBe(0x3c00); // 1.0
    expect(image.scale).toBeGreaterThan(0);
  });
});

describe("the live path", () => {
  const src = fileURLToPath(new URL("../src", import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });

  it("no shader under src/ holds an FFT", () => {
    for (const file of files(src)) {
      if (/\.(slang|wgsl)$/.test(file)) {
        expect(readFileSync(file, "utf8"), file).not.toMatch(/\bfft/i);
      }
    }
  });

  it("only the worker imports computeKernel", () => {
    const importers = files(src).filter(
      (file) =>
        /\.ts$/.test(file) &&
        !file.endsWith("glareKernel.ts") &&
        /import[^;]*\bcomputeKernel\b[^;]*from/.test(
          readFileSync(file, "utf8"),
        ),
    );
    expect(
      importers.map((f) => f.slice(src.length).replaceAll("\\", "/")),
    ).toEqual(["/io/worker.ts"]);
  });
});

describe("the sprite pass", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
    engine.stop();
  });

  it("draws 4 vertices of 256 instances, and never an indirect draw", async () => {
    const view = engine.addView({
      target: new OffscreenTarget(256, 256),
      world: engine.createWorld(),
      observer: {
        ...cameraObserver({ ev100: 15 }),
        glare: {
          tier: "full",
          veil: { share: 0.2 },
          spikes: { aperture: "vanes", share: 0.05, extent: 3 },
        },
      },
    });
    engine.renderFrame();
    const { glare, graph } = engine.raster.viewFrames.get(view)!;
    expect(graph.compile()).toContain("glare.sprites");
    expect(graph.compile().indexOf("glare.sprites")).toBeGreaterThan(
      graph.compile().indexOf("post.glare.composite"),
    );
    const pass = {
      setPipeline: vi.fn(),
      setBindGroup: vi.fn(),
      draw: vi.fn(),
      drawIndirect: vi.fn(),
    };
    glare!.drawSprites(pass as unknown as GPURenderPassEncoder);
    expect(pass.draw).toHaveBeenCalledWith(4, 256);
    expect(pass.drawIndirect).not.toHaveBeenCalled();
  });
});
