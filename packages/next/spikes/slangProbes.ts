import type { Harness } from "../lab/harness.ts";
import { splitHigh } from "../src/math/transforms.ts";
import probesJson from "./slang/generated/probes.json";

/**
 * Slang feature probes (the Slang-first migration's step 1,
 * CESIUM2_WEBGPU_PLAN.md §3.4): each feature the engine's shaders need,
 * compiled by slangc to WGSL (spikes/slang/probes.mjs) and validated here
 * in WebGPU: the module compiles, its pipelines are made, and for the
 * hi/lo type its results are compared bit for bit with the engine's WGSL.
 * The WASM compiler's payload and latency are measured too. Re-run on each
 * Slang release.
 */
interface Probe {
  id: string;
  feature: string;
  entries: Array<[string, "compute" | "vertex" | "fragment"]>;
  expect: "works" | "slang-rejects" | "webgpu-rejects";
  /** WGSL the runtime adds (a function the probe calls by name). */
  runtime?: string;
  wgsl?: string;
  error?: string;
}
const { slang, probes } = probesJson as { slang: string; probes: Probe[] };

const TEMPLATE = `
<h1>Slang feature probes</h1>
<p>
  Each feature the engine's shaders need, compiled by slangc to WGSL
  (<code>node spikes/slang/probes.mjs</code>) and validated in WebGPU here.
</p>
<div class="status">Run to validate the probes.</div>
<table data-id="results"></table>`;

let root: HTMLElement;
type Row = {
  probe: string;
  feature: string;
  expected: string;
  result: string;
  detail: string;
};
const rows: Row[] = [];

function render(): void {
  // DOM nodes, not markup: compiler messages are text.
  const table = root.querySelector('[data-id="results"]')!;
  const tr = (cells: string[], tag: "th" | "td") => {
    const row = document.createElement("tr");
    for (const text of cells) {
      const cell = document.createElement(tag);
      cell.textContent = text;
      row.append(cell);
    }
    return row;
  };
  table.replaceChildren(
    tr(["probe", "feature", "expected", "result", "detail"], "th"),
    ...rows.map((r) =>
      tr([r.probe, r.feature, r.expected, r.result, r.detail], "td"),
    ),
  );
}

/** Creates the probe's module and pipelines; the first error, if any. */
async function validate(
  device: GPUDevice,
  probe: Probe,
): Promise<string | undefined> {
  device.pushErrorScope("validation");
  const code = probe.runtime ? `${probe.wgsl!}\n${probe.runtime}` : probe.wgsl!;
  const module = device.createShaderModule({ label: probe.id, code });
  const info = await module.getCompilationInfo();
  const compileError = info.messages.find((m) => m.type === "error");
  const stages = new Map(probe.entries.map(([name, stage]) => [stage, name]));
  try {
    for (const [name, stage] of probe.entries) {
      if (stage === "compute") {
        device.createComputePipeline({
          layout: "auto",
          compute: { module, entryPoint: name },
        });
      }
    }
    if (stages.has("vertex") && stages.has("fragment")) {
      device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: stages.get("vertex")! },
        fragment: {
          module,
          entryPoint: stages.get("fragment")!,
          targets: [{ format: "rgba8unorm" }],
        },
        multisample: { count: probe.id === "coverage" ? 4 : 1 },
      });
    }
  } catch (e) {
    await device.popErrorScope();
    return e instanceof Error ? e.message : String(e);
  }
  const scoped = await device.popErrorScope();
  return compileError
    ? `${compileError.lineNum}:${compileError.linePos} ${compileError.message}`
    : scoped?.message;
}

/** The engine's WGSL hi/lo difference (common.wgsl), as the reference. */
const REFERENCE = `
fn hiLoDifference(aHi: vec3f, aLo: vec3f, bHi: vec3f, bLo: vec3f) -> vec3f {
  return vec3f(vec3i(aHi) - vec3i(bHi)) + (aLo - bLo);
}
@group(0) @binding(0) var<storage, read> inputs: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> outputs: array<vec4f>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x * 4u;
  outputs[id.x] = vec4f(
    hiLoDifference(inputs[i].xyz, inputs[i + 1u].xyz, inputs[i + 2u].xyz, inputs[i + 3u].xyz),
    0.0,
  );
}`;

/**
 * Runs the Slang SplitPosition kernel and the engine's WGSL on the same
 * pairs of Earth-scale positions (up to 10 km apart): bit-equal outputs,
 * and the worst error against float64.
 */
async function precision(device: GPUDevice, wgsl: string): Promise<string> {
  const count = 4096;
  const inputs = new Float32Array(count * 16);
  const exact = new Float64Array(count * 3);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < count; k++) {
    const lon = random() * Math.PI * 2;
    const lat = (random() - 0.5) * Math.PI;
    const r = 6378137 + random() * 9000;
    const a = [
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.cos(lat) * Math.sin(lon),
      r * Math.sin(lat),
    ];
    const b = a.map((v) => v + (random() - 0.5) * 20000);
    for (let c = 0; c < 3; c++) {
      const ah = splitHigh(a[c]!);
      const bh = splitHigh(b[c]!);
      inputs[k * 16 + c] = ah;
      inputs[k * 16 + 4 + c] = Math.fround(a[c]! - ah);
      inputs[k * 16 + 8 + c] = bh;
      inputs[k * 16 + 12 + c] = Math.fround(b[c]! - bh);
      exact[k * 3 + c] = a[c]! - b[c]!;
    }
  }
  const run = async (code: string) => {
    const module = device.createShaderModule({ code });
    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });
    const input = device.createBuffer({
      size: inputs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(input, 0, inputs);
    const output = device.createBuffer({
      size: count * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const read = device.createBuffer({
      size: count * 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(
      0,
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: input } },
          { binding: 1, resource: { buffer: output } },
        ],
      }),
    );
    pass.dispatchWorkgroups(count / 64);
    pass.end();
    encoder.copyBufferToBuffer(output, 0, read, 0, count * 16);
    device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(read.getMappedRange().slice(0));
    read.unmap();
    return out;
  };
  const fromSlang = await run(wgsl);
  const reference = await run(REFERENCE);
  let equal = 0;
  let worst = 0;
  const a = new Uint32Array(fromSlang.buffer);
  const b = new Uint32Array(reference.buffer);
  for (let k = 0; k < count; k++) {
    let same = true;
    for (let c = 0; c < 3; c++) {
      same &&= a[k * 4 + c] === b[k * 4 + c];
      worst = Math.max(
        worst,
        Math.abs(fromSlang[k * 4 + c]! - exact[k * 3 + c]!),
      );
    }
    equal += same ? 1 : 0;
  }
  return `${equal} of ${count} bit-equal to the WGSL; worst error ${(worst * 1000).toFixed(3)} mm`;
}

async function runProbes(): Promise<{ rows: Row[]; slang: string }> {
  rows.length = 0;
  const status = root.querySelector<HTMLElement>(".status")!;
  status.textContent = "Validating…";
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No WebGPU adapter.");
  }
  const features: GPUFeatureName[] = adapter.features.has("subgroups")
    ? ["subgroups" as GPUFeatureName]
    : [];
  const device = await adapter.requestDevice({ requiredFeatures: features });
  for (const probe of probes) {
    const row: Row = {
      probe: probe.id,
      feature: probe.feature,
      expected: probe.expect,
      result: "",
      detail: "",
    };
    if (probe.wgsl === undefined) {
      const why =
        (probe.error ?? "").split("\n").find((l) => /error/.test(l)) ?? "";
      row.result = probe.expect === "slang-rejects" ? "✓ rejected" : "✗ slangc";
      row.detail = why.trim();
    } else {
      const error = await validate(device, probe);
      if (probe.expect === "webgpu-rejects") {
        row.result = error ? "✓ rejected" : "✗ accepted";
        row.detail = error ?? "";
      } else if (probe.expect === "slang-rejects") {
        row.result = "✗ compiled";
      } else if (error) {
        row.result = "✗ WebGPU";
        row.detail = error;
      } else {
        row.result = "✓";
        if (probe.id === "names") {
          const mangled = /records_0|doubled_0/.test(probe.wgsl);
          row.result = mangled ? "✓ (suffixed)" : "✓";
          row.detail = mangled
            ? "By default names get Slang's _N suffixes (records_0, doubled_0); entry points keep theirs. What runtime code uses is declared as the boundary (next probe)."
            : "";
        } else if (probe.id === "boundary") {
          // What the runtime code relies on, by name, in the WGSL as emitted.
          const kept = [
            "struct VertexInput",
            "struct VertexOutput",
            "struct MaterialOutput",
            "fn materialTint(",
            "var<uniform> tint",
            "userFragment(",
          ];
          const fields = (struct: string) =>
            /\{([^}]*)\}/.exec(
              probe.wgsl!.slice(probe.wgsl!.indexOf(`struct ${struct}`)),
            )?.[1] ?? "";
          const missing = kept.filter((k) => !probe.wgsl!.includes(k));
          const separate =
            /positionMC/.test(fields("VertexInput")) &&
            /positionMC/.test(fields("VertexOutput"));
          row.result = !missing.length && separate ? "✓" : "✗ names";
          row.detail = missing.length
            ? `missing: ${missing.join(", ")}`
            : separate
              ? "Contract structs, their fields (same-named ones kept apart), a helper and a binding keep their names; the runtime function is called by name."
              : "same-named fields merged across structs";
        } else if (probe.id === "matrix") {
          const wrapped = probe.wgsl.includes("_MatrixStorage");
          row.detail = wrapped
            ? "Matrices are stored as arrays of vec4 (_MatrixStorage) and rebuilt element by element on each read."
            : "";
        } else if (probe.id === "precision") {
          row.detail = await precision(device, probe.wgsl);
          row.result = row.detail.startsWith("4096 of 4096")
            ? "✓"
            : "✗ differs";
        }
      }
    }
    rows.push(row);
    render();
  }
  // The WASM compiler: payload and latency (as the playground compiles).
  // Its size as served (a GET: the dev server sends no length on HEAD).
  const bytes = await fetch("/slang-wasm/slang-wasm.wasm")
    .then(async (r) => (r.ok ? (await r.arrayBuffer()).byteLength : 0))
    .catch(() => 0);
  if (bytes > 0) {
    const { CustomShader } = await import("../src/scene/CustomShader.ts");
    const source = `import cesium;
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor *= 0.5;
}`;
    const time = async () => {
      const t0 = performance.now();
      await CustomShader.fromSlang(source);
      return performance.now() - t0;
    };
    const cold = await time();
    // The best of three: the first compiles after loading still warm up.
    const warm = Math.min(await time(), await time(), await time());
    rows.push({
      probe: "wasm",
      feature: "WASM compiler payload and latency",
      expected: "measured",
      result: "✓",
      detail: `${(bytes / 1048576).toFixed(1)} MB; a custom shader in ${cold.toFixed(0)} ms cold (worker and WASM load), ${warm.toFixed(0)} ms warm (best of three)`,
    });
    render();
  }
  device.destroy();
  status.textContent = `Slang ${slang}: ${rows.filter((r) => r.result.startsWith("✓")).length} of ${rows.length} as expected.`;
  return { rows, slang };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runProbes };
  },
};
