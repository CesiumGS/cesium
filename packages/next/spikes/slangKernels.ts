import type { Harness } from "../lab/harness.ts";
import depthRangeReference from "./slang/reference/depthRange.wgsl?raw";
import scatterReference from "./slang/reference/scatter.wgsl?raw";
import depthRangeSlang from "../src/shaders/generated/depthRange.wgsl?raw";
import scatterSlang from "../src/shaders/generated/scatter.wgsl?raw";

/**
 * The Slang-first migration's performance gate (CESIUM2_WEBGPU_PLAN.md
 * §3.4, step 4): each ported kernel against the hand-written WGSL it
 * replaces (spikes/slang/reference/), in isolation: the same synthetic
 * inputs, the two pipelines dispatched alternately, each timed by GPU
 * timestamps, medians compared. No scene, so nothing else loads the GPU.
 * Gate: the Slang within 5% of the WGSL.
 */
interface Case {
  name: string;
  reference: string;
  slang: string;
  /** Resources and the dispatch, for either pipeline. */
  setup(device: GPUDevice): {
    entries(layout: GPUBindGroupLayout): GPUBindGroupEntry[];
    dispatch: [number, number?, number?];
    /** What the kernel writes: cleared, then compared between the two. */
    output: GPUBuffer;
  };
}

const W = 1920;
const H = 1080;

const CASES: Case[] = [
  {
    name: "depthRange",
    reference: depthRangeReference,
    slang: depthRangeSlang,
    setup(device) {
      // A multisampled depth target, half sky (0), half surfaces.
      const depth = device.createTexture({
        size: [W, H],
        format: "depth32float",
        sampleCount: 4,
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      const encoder = device.createCommandEncoder();
      encoder
        .beginRenderPass({
          colorAttachments: [],
          depthStencilAttachment: {
            view: depth.createView(),
            depthClearValue: 0.37,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        })
        .end();
      device.queue.submit([encoder.finish()]);
      const params = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(params, 0, new Float32Array([0.1, 0, 0, 0]));
      device.queue.writeBuffer(params, 4, new Uint32Array([W, H, 0]));
      const result = device.createBuffer({
        size: 8,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_SRC |
          GPUBufferUsage.COPY_DST,
      });
      return {
        entries: () => [
          { binding: 0, resource: depth.createView() },
          { binding: 1, resource: { buffer: params } },
          { binding: 2, resource: { buffer: result } },
        ],
        dispatch: [8, 8],
        output: result,
      };
    },
  },
  {
    name: "scatter",
    reference: scatterReference,
    slang: scatterSlang,
    setup(device) {
      // 65,536 record updates of 36 words, scattered over a 100,000-record table.
      const count = 65536;
      const words = 36;
      const params = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(
        params,
        0,
        new Uint32Array([count, words, 0, 0]),
      );
      const data = new Uint32Array(count + count * words);
      for (let i = 0; i < count; i++) {
        data[i] = (i * 7919) % 100000;
      }
      const src = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(src, 0, data);
      const dst = device.createBuffer({
        size: 100000 * words * 4,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_SRC |
          GPUBufferUsage.COPY_DST,
      });
      return {
        entries: () => [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: src } },
          { binding: 2, resource: { buffer: dst } },
        ],
        dispatch: [Math.ceil((count * words) / 64)],
        output: dst,
      };
    },
  },
];

const TEMPLATE = `
<h1>Slang kernels against the WGSL</h1>
<p>
  Each ported kernel and the hand-written WGSL it replaced, dispatched
  alternately on the same inputs and timed by GPU timestamps. Gate: within
  5%.
</p>
<div class="status">Run to time the kernels.</div>
<table data-id="results"></table>`;

let root: HTMLElement;

interface Row {
  kernel: string;
  wgsl: number;
  slang: number;
  ratio: number;
  /** Their outputs from the same inputs: identical, or how many words differ. */
  same: string;
  gate: string;
}

/** One dispatch from a cleared output; the output's words. */
async function output(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  group: GPUBindGroup,
  dispatch: [number, number?, number?],
  buffer: GPUBuffer,
): Promise<Uint32Array> {
  const read = device.createBuffer({
    size: buffer.size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.clearBuffer(buffer);
  // A reduction's starting values (depthRange: nearest as +max, farthest 0).
  if (buffer.size === 8) {
    device.queue.writeBuffer(buffer, 0, new Uint32Array([0x7f7fffff, 0]));
  }
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, group);
  pass.dispatchWorkgroups(...(dispatch as [number, number, number]));
  pass.end();
  encoder.copyBufferToBuffer(buffer, 0, read, 0, buffer.size);
  device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const words = new Uint32Array(read.getMappedRange().slice(0));
  read.unmap();
  read.destroy();
  return words;
}

function render(rows: Row[]): void {
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
    tr(
      ["kernel", "WGSL (µs)", "Slang (µs)", "Slang / WGSL", "outputs", "gate"],
      "th",
    ),
    ...rows.map((r) =>
      tr(
        [
          r.kernel,
          r.wgsl.toFixed(1),
          r.slang.toFixed(1),
          r.ratio.toFixed(3),
          r.same,
          r.gate,
        ],
        "td",
      ),
    ),
  );
}

/** The median GPU time of `runs` dispatches of each pipeline, alternating. */
async function time(
  device: GPUDevice,
  pipelines: [GPUComputePipeline, GPUComputePipeline],
  groups: [GPUBindGroup, GPUBindGroup],
  dispatch: [number, number?, number?],
  runs: number,
): Promise<[number, number]> {
  const querySet = device.createQuerySet({
    type: "timestamp",
    count: 4 * runs,
  });
  const resolve = device.createBuffer({
    size: 8 * 4 * runs,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  });
  const read = device.createBuffer({
    size: 8 * 4 * runs,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  for (let r = 0; r < runs; r++) {
    for (let k = 0; k < 2; k++) {
      // Alternating which goes first, so neither is always the warm one.
      const which = (r + k) % 2;
      const q = (r * 2 + which) * 2;
      const pass = encoder.beginComputePass({
        timestampWrites: {
          querySet,
          beginningOfPassWriteIndex: q,
          endOfPassWriteIndex: q + 1,
        },
      });
      pass.setPipeline(pipelines[which]!);
      pass.setBindGroup(0, groups[which]!);
      pass.dispatchWorkgroups(...(dispatch as [number, number, number]));
      pass.end();
    }
  }
  encoder.resolveQuerySet(querySet, 0, 4 * runs, resolve, 0);
  encoder.copyBufferToBuffer(resolve, 0, read, 0, 8 * 4 * runs);
  device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const t = new BigUint64Array(read.getMappedRange().slice(0));
  read.unmap();
  const durations: [number[], number[]] = [[], []];
  for (let r = 0; r < runs; r++) {
    for (let which = 0; which < 2; which++) {
      const q = (r * 2 + which) * 2;
      durations[which]!.push(Number(t[q + 1]! - t[q]!) / 1000);
    }
  }
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[xs.length >> 1]!;
  return [median(durations[0]!), median(durations[1]!)];
}

async function runKernels(): Promise<Row[]> {
  const status = root.querySelector<HTMLElement>(".status")!;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter?.features.has("timestamp-query")) {
    throw new Error("Needs timestamp queries.");
  }
  const device = await adapter.requestDevice({
    requiredFeatures: ["timestamp-query"],
  });
  const rows: Row[] = [];
  for (const c of CASES) {
    status.textContent = `Timing ${c.name}…`;
    const resources = c.setup(device);
    const pipeline = (code: string) =>
      device.createComputePipeline({
        layout: "auto",
        compute: {
          module: device.createShaderModule({ code }),
          entryPoint: "main",
        },
      });
    const pipelines: [GPUComputePipeline, GPUComputePipeline] = [
      pipeline(c.reference),
      pipeline(c.slang),
    ];
    const groups = pipelines.map((p) =>
      device.createBindGroup({
        layout: p.getBindGroupLayout(0),
        entries: resources.entries(p.getBindGroupLayout(0)),
      }),
    ) as [GPUBindGroup, GPUBindGroup];
    // The same output from the same inputs, word for word.
    const a = await output(
      device,
      pipelines[0],
      groups[0],
      resources.dispatch,
      resources.output,
    );
    const b = await output(
      device,
      pipelines[1],
      groups[1],
      resources.dispatch,
      resources.output,
    );
    let differ = 0;
    for (let i = 0; i < a.length; i++) {
      differ += a[i] === b[i] ? 0 : 1;
    }
    const same = differ === 0 ? "identical" : `${differ} words differ`;
    // Warm both, then measure.
    await time(device, pipelines, groups, resources.dispatch, 10);
    const [wgsl, slang] = await time(
      device,
      pipelines,
      groups,
      resources.dispatch,
      200,
    );
    const ratio = slang / wgsl;
    rows.push({
      kernel: c.name,
      wgsl,
      slang,
      ratio,
      same,
      gate: differ > 0 ? "✗ differs" : ratio <= 1.05 ? "✓" : "✗ slower",
    });
    render(rows);
  }
  device.destroy();
  status.textContent = `${rows.filter((r) => r.gate === "✓").length} of ${rows.length} within 5%.`;
  return rows;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runKernels };
  },
};
