import type { Harness } from "../lab/harness.ts";
import {
  DrawItemLayout,
  DrawRecordLayout,
  InstanceLayout,
  TransformLayout,
  ViewLayout,
} from "../src/render/generated/layouts.ts";
import commonReference from "./slang/reference/common.wgsl?raw";
import cullReference from "./slang/reference/cull.wgsl?raw";
import depthRangeReference from "./slang/reference/depthRange.wgsl?raw";
import lightsReference from "./slang/reference/lights.wgsl?raw";
import raycastReference from "./slang/reference/raycast.wgsl?raw";
import scatterReference from "./slang/reference/scatter.wgsl?raw";
import cullSlang from "../src/shaders/generated/cull.wgsl?raw";
import depthRangeSlang from "../src/shaders/generated/depthRange.wgsl?raw";
import lightsSlang from "../src/shaders/generated/lights.wgsl?raw";
import raycastSlang from "../src/shaders/generated/raycast.wgsl?raw";
import scatterSlang from "../src/shaders/generated/scatter.wgsl?raw";

/**
 * The Slang-first migration's performance gate (CESIUM2_WEBGPU_PLAN.md
 * §3.4, step 4): each ported kernel against the hand-written WGSL it
 * replaces (spikes/slang/reference/), in isolation: the same synthetic
 * inputs (in the engine's formats), the two pipelines dispatched
 * alternately, each timed by GPU timestamps, medians compared; and their
 * outputs from the same inputs compared word for word. No scene, so
 * nothing else loads the GPU. Gate: the Slang within 5%, outputs equal.
 */
interface Output {
  buffer: GPUBuffer;
  /** Its contents before the dispatch (default zeros). */
  initial?: Uint32Array;
  /**
   * For float results (non-negative, so their bits order as u32s): how
   * many units in the last place may differ. Two compilers may order a
   * dot product's sum differently; that is rounding, not a wrong port.
   */
  ulps?: number;
}
interface Case {
  name: string;
  reference: string;
  slang: string;
  /** The entry point (default `main`). */
  entry?: string;
  /** The engine's bind group layouts, by group (default: `auto`). */
  layout?: GPUBindGroupLayoutEntry[][];
  setup(device: GPUDevice): {
    /** Each group's entries. */
    groups: GPUBindGroupEntry[][];
    dispatch: [number, number?, number?];
    /** What the kernel writes: reset, then compared between the two. */
    outputs: Output[];
  };
}

const W = 1920;
const H = 1080;
const COMPUTE = 4; // GPUShaderStage.COMPUTE
/** cullTables.slang `Batch`: item base, index count, first index, pad. */
const BATCH_WORDS = 4;

const storage = (
  binding: number,
  readOnly: boolean,
): GPUBindGroupLayoutEntry => ({
  binding,
  visibility: COMPUTE,
  buffer: { type: readOnly ? "read-only-storage" : "storage" },
});
const uniform = (binding: number): GPUBindGroupLayoutEntry => ({
  binding,
  visibility: COMPUTE,
  buffer: { type: "uniform" },
});

/** As RenderContext's `cull.world` (and the view's uniform in group 0). */
const CULL_LAYOUT: GPUBindGroupLayoutEntry[][] = [
  [uniform(0)],
  [
    storage(0, true),
    storage(1, true),
    storage(2, true),
    storage(3, false),
    storage(4, false),
    storage(6, true),
    storage(7, false),
    uniform(8),
  ],
];

function buffer(
  device: GPUDevice,
  data: ArrayBufferView | number,
  usage: number,
): GPUBuffer {
  const size = typeof data === "number" ? data : data.byteLength;
  const b = device.createBuffer({
    size: Math.max(16, Math.ceil(size / 16) * 16),
    usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  if (typeof data !== "number") {
    device.queue.writeBuffer(b, 0, data);
  }
  return b;
}

/**
 * The cull's tables, in the engine's layouts: 100,000 records (or 100
 * records of 1,000 instances each), a transform each within 2 km of the
 * camera, 256 batches, and a view whose frustum keeps about half.
 */
function cullTables(device: GPUDevice, instanced: boolean) {
  const records = instanced ? 100 : 100000;
  const perRecord = 1000;
  const instances = instanced ? records * perRecord : 0;
  const batchCount = 256;
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const camera = 6378137;
  const rec = (field: keyof typeof DrawRecordLayout) =>
    DrawRecordLayout[field] / 4;
  const tra = (field: keyof typeof TransformLayout) =>
    TransformLayout[field] / 4;
  const ins = (field: keyof typeof InstanceLayout) => InstanceLayout[field] / 4;
  const recordData = new ArrayBuffer(records * DrawRecordLayout.size);
  const rf = new Float32Array(recordData);
  const ru = new Uint32Array(recordData);
  const transformData = new ArrayBuffer(records * TransformLayout.size);
  const tf = new Float32Array(transformData);
  for (let i = 0; i < records; i++) {
    const o = i * rec("size");
    rf[o + rec("radius")] = 5 + random() * 10;
    ru[o + rec("transform")] = i;
    ru[o + rec("indexCount")] = 36;
    ru[o + rec("featureId")] = i + 1;
    ru[o + rec("batch")] = i % batchCount;
    ru[o + rec("viewMask")] = 0xffffffff;
    ru[o + rec("flags")] = random() < 0.05 ? 1 : 0;
    if (instanced) {
      ru[o + rec("instanceFirst")] = i * perRecord;
      ru[o + rec("instanceCount")] = perRecord;
    }
    const t = i * tra("size");
    const x = camera + (random() - 0.5) * 4000;
    const hi = Math.round(x);
    tf[t + tra("originHi")] = hi;
    tf[t + tra("originLo")] = Math.fround(x - hi);
    tf[t + tra("originHi") + 1] = Math.round((random() - 0.5) * 4000);
    tf[t + tra("originHi") + 2] = Math.round((random() - 0.5) * 4000);
    tf[t + tra("scale")] = 1 + random();
    for (let c = 0; c < 3; c++) {
      tf[t + tra("linear") + c * 4 + c] = 1 + random();
      tf[t + tra("linear") + c * 4 + ((c + 1) % 3)] = random() - 0.5;
    }
  }
  const instanceData = new ArrayBuffer(
    Math.max(1, instances) * InstanceLayout.size,
  );
  const inf = new Float32Array(instanceData);
  const inu = new Uint32Array(instanceData);
  const rows = [ins("row0"), ins("row1"), ins("row2")];
  for (let j = 0; j < instances; j++) {
    const o = j * ins("size");
    rows.forEach((row, r) => {
      inf[o + row + r] = 0.5 + random();
      inf[o + row + ((r + 2) % 3)] = random() - 0.5;
      inf[o + row + 3] = (random() - 0.5) * 50;
    });
    inu[o + ins("record")] = Math.floor(j / perRecord);
    inu[o + ins("feature")] = j % perRecord;
    // Some hidden, some drawn only within 1 km (a half float in the high bits).
    inu[o + ins("flags")] =
      j % 17 === 0 ? 1 : j % 5 === 0 ? (2 | (0x63d0 << 16)) >>> 0 : 0;
    inu[o + ins("tint")] = 0xff80ff80;
  }
  // The view: camera-relative planes keeping x < 0 (half) within a box.
  const view = new ArrayBuffer(ViewLayout.size);
  const vf = new Float32Array(view);
  const vu = new Uint32Array(view);
  vf[ViewLayout.cameraHi / 4] = camera;
  const planes = [
    [-1, 0, 0, 0],
    [0, 1, 0, 1500],
    [0, -1, 0, 1500],
    [0, 0, 1, 1500],
    [0, 0, -1, 1500],
  ];
  planes.forEach((p, k) => vf.set(p, ViewLayout.planes / 4 + k * 4));
  vu[ViewLayout.viewBit / 4] = 1;
  const items = records + instances;
  const batches = new Uint32Array(batchCount * BATCH_WORDS);
  for (let b = 0; b < batchCount; b++) {
    batches[b * BATCH_WORDS] = b * items;
    batches[b * BATCH_WORDS + 1] = 36;
  }
  const S = GPUBufferUsage.STORAGE;
  const U = GPUBufferUsage.UNIFORM;
  const itemsBuffer = buffer(device, items * DrawItemLayout.size, S);
  const args = buffer(device, batchCount * 5 * 4, S);
  const resource = (b: GPUBuffer) => ({ buffer: b });
  return {
    groups: [
      [
        {
          binding: 0,
          resource: resource(buffer(device, new Uint8Array(view), U)),
        },
      ],
      [
        {
          binding: 0,
          resource: resource(buffer(device, new Uint8Array(recordData), S)),
        },
        {
          binding: 1,
          resource: resource(buffer(device, new Uint8Array(transformData), S)),
        },
        {
          binding: 2,
          resource: resource(buffer(device, new Uint8Array(instanceData), S)),
        },
        { binding: 3, resource: resource(itemsBuffer) },
        {
          binding: 4,
          resource: resource(buffer(device, batchCount * items * 4, S)),
        },
        { binding: 6, resource: resource(buffer(device, batches, S)) },
        { binding: 7, resource: resource(args) },
        {
          binding: 8,
          resource: resource(
            buffer(
              device,
              new Uint32Array([records, batchCount, instances, records]),
              U,
            ),
          ),
        },
      ],
    ] as GPUBindGroupEntry[][],
    dispatch: [Math.ceil((instanced ? instances : records) / 64)] as [number],
    // The items (each at its own index) and the counts; the item list's
    // order depends on the atomics' scheduling, so it isn't compared.
    outputs: [{ buffer: itemsBuffer }, { buffer: args }],
  };
}

/**
 * A view's light table (common LightTable): 512 lights in front of the
 * camera within reach of some froxels, a 16 × 9 × 32 grid.
 */
function lightTable(device: GPUDevice) {
  const dims = [16, 9, 32];
  const count = 512;
  const maxLights = 1024;
  const clusterWords = dims[0]! * dims[1]! * dims[2]! * (1 + 16);
  const bytes = 80 + maxLights * 64 + clusterWords * 4;
  const data = new Float32Array(bytes / 4);
  data.set([dims[0]!, dims[1]!, dims[2]!, count], 0);
  // near 0.5 m, slices per unit of ln(z / near), tan(half fov) x and y.
  data.set([0.5, 32 / Math.log(2000 / 0.5), 1.0, 0.5625], 4);
  data.set([0, 0, 1, 2000], 8); // forward (and the grid's far end)
  data.set([1, 0, 0, 0], 12); // right
  data.set([0, 1, 0, 0], 16); // up
  let seed = 5;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let l = 0; l < count; l++) {
    const o = 20 + l * 16;
    const z = 1 + random() * 400;
    data.set(
      [(random() - 0.5) * z, (random() - 0.5) * z * 0.6, z, 5 + random() * 60],
      o,
    );
    data.set([random() * 1000, random() * 1000, random() * 1000, 0], o + 4);
  }
  const table = buffer(device, data, GPUBufferUsage.STORAGE);
  return {
    groups: [[{ binding: 0, resource: { buffer: table } }]],
    dispatch: [dims[0]!, dims[1]!] as [number, number],
    outputs: [{ buffer: table, initial: new Uint32Array(data.buffer) }],
  };
}

/**
 * Rays at a mesh (World.castRays's inputs): a 1,024-triangle sheet,
 * jittered, placed at the Earth's radius by its transform, and 256 rays
 * down at it, each in 16 jobs of 64 triangles.
 */
function raycastInputs(device: GPUDevice) {
  let seed = 3;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const side = 16;
  // A continuous, jittered height field: triangles share their corners,
  // so a ray at an edge hits the same height whichever side it takes.
  const heights = Array.from(
    { length: (side + 1) ** 2 },
    () => (random() - 0.5) * 0.5,
  );
  const vertices = new Float32Array(side * side * 2 * 9);
  let v = 0;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const corners = [
        [x, y],
        [x + 1, y],
        [x, y + 1],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
      ];
      for (const [cx, cy] of corners) {
        vertices.set(
          [cx! - side / 2, cy! - side / 2, heights[cy! * (side + 1) + cx!]!],
          v,
        );
        v += 3;
      }
    }
  }
  const triangles = side * side * 2;
  const indices = Uint32Array.from({ length: triangles * 3 }, (_, i) => i);
  const record = new ArrayBuffer(DrawRecordLayout.size);
  new Uint32Array(record)[DrawRecordLayout.indexCount / 4] = triangles * 3;
  const transform = new Float32Array(TransformLayout.size / 4);
  transform[TransformLayout.originHi / 4] = 6378137;
  for (let c = 0; c < 3; c++) {
    transform[TransformLayout.linear / 4 + c * 4 + c] = 1;
  }
  transform[TransformLayout.linear / 4 + 1] = 0.2; // a tilt
  const rayCount = 256;
  const rays = new Float32Array(rayCount * 12);
  for (let r = 0; r < rayCount; r++) {
    rays.set(
      [6378137 + (random() - 0.5) * 14, (random() - 0.5) * 14, 10, 100],
      r * 12,
    );
    rays.set([0, 0, 0, 0], r * 12 + 4);
    rays.set([0, 0, -1, 0], r * 12 + 8);
  }
  const perRay = triangles / 64;
  const jobs = new Uint32Array(rayCount * perRay * 4);
  for (let r = 0; r < rayCount; r++) {
    for (let k = 0; k < perRay; k++) {
      jobs.set([r, 0, k * 64, 0xffffffff], (r * perRay + k) * 4);
    }
  }
  const S = GPUBufferUsage.STORAGE;
  const hits = buffer(device, rayCount * 4, S);
  const entry = (binding: number, b: GPUBuffer) => ({
    binding,
    resource: { buffer: b },
  });
  return {
    groups: [
      [
        entry(0, buffer(device, rays, S)),
        entry(1, buffer(device, jobs, S)),
        entry(2, buffer(device, new Uint8Array(record), S)),
        entry(3, buffer(device, transform, S)),
        entry(4, buffer(device, InstanceLayout.size, S)),
        entry(5, buffer(device, vertices, S)),
        entry(6, buffer(device, indices, S)),
        entry(7, hits),
      ],
    ],
    dispatch: [rayCount * perRay] as [number],
    // The nearest hit's distance bits per ray, from "none" (+max).
    outputs: [
      {
        buffer: hits,
        initial: new Uint32Array(rayCount).fill(0x7f7fffff),
        ulps: 4,
      },
    ],
  };
}

const CASES: Case[] = [
  {
    name: "depthRange",
    reference: depthRangeReference,
    slang: depthRangeSlang,
    setup(device) {
      // A multisampled depth target, cleared to one depth.
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
      const params = new ArrayBuffer(16);
      new Float32Array(params)[0] = 0.1;
      new Uint32Array(params).set([W, H, 0], 1);
      const result = buffer(device, 8, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [
            { binding: 0, resource: depth.createView() },
            {
              binding: 1,
              resource: {
                buffer: buffer(
                  device,
                  new Uint8Array(params),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
            { binding: 2, resource: { buffer: result } },
          ],
        ],
        dispatch: [8, 8],
        // A reduction's starting values: nearest as +max, farthest 0.
        outputs: [
          { buffer: result, initial: new Uint32Array([0x7f7fffff, 0, 0, 0]) },
        ],
      };
    },
  },
  {
    name: "scatter",
    reference: scatterReference,
    slang: scatterSlang,
    setup(device) {
      // 65,536 record updates of 36 words, over a 100,000-record table.
      const count = 65536;
      const words = 36;
      const data = new Uint32Array(count + count * words);
      for (let i = 0; i < count; i++) {
        data[i] = (i * 7919) % 100000;
      }
      for (let k = count; k < data.length; k++) {
        data[k] = k;
      }
      const dst = buffer(device, 100000 * words * 4, GPUBufferUsage.STORAGE);
      const params = new Uint32Array([count, words, 0, 0]);
      return {
        groups: [
          [
            {
              binding: 0,
              resource: {
                buffer: buffer(device, params, GPUBufferUsage.UNIFORM),
              },
            },
            {
              binding: 1,
              resource: {
                buffer: buffer(device, data, GPUBufferUsage.STORAGE),
              },
            },
            { binding: 2, resource: { buffer: dst } },
          ],
        ],
        dispatch: [Math.ceil((count * words) / 64)],
        outputs: [{ buffer: dst }],
      };
    },
  },
  {
    name: "lights",
    reference: `${commonReference}\n${lightsReference}`,
    slang: lightsSlang,
    entry: "assign",
    setup: lightTable,
  },
  {
    name: "raycast",
    reference: `${commonReference}\n${raycastReference}`,
    slang: raycastSlang,
    setup: raycastInputs,
  },
  {
    name: "cullRecords",
    reference: `${commonReference}\n${cullReference}`,
    slang: cullSlang,
    entry: "cullRecords",
    layout: CULL_LAYOUT,
    setup: (device) => cullTables(device, false),
  },
  {
    name: "cullInstances",
    reference: `${commonReference}\n${cullReference}`,
    slang: cullSlang,
    entry: "cullInstances",
    layout: CULL_LAYOUT,
    setup: (device) => cullTables(device, true),
  },
];

const TEMPLATE = `
<h1>Slang kernels against the WGSL</h1>
<p>
  Each ported kernel and the hand-written WGSL it replaced, dispatched
  alternately on the same inputs, timed by GPU timestamps, and their
  outputs compared. Gate: within 5%, outputs equal.
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

function render(rows: Row[]): void {
  // DOM nodes, not markup: values are text.
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

function bind(pass: GPUComputePassEncoder, groups: GPUBindGroup[]): void {
  groups.forEach((g, k) => pass.setBindGroup(k, g));
}

/** One dispatch from reset outputs; each output's words. */
async function outputs(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  groups: GPUBindGroup[],
  dispatch: [number, number?, number?],
  buffers: Output[],
): Promise<Uint32Array[]> {
  for (const { buffer: b, initial } of buffers) {
    device.queue.writeBuffer(b, 0, initial ?? new Uint32Array(b.size / 4));
  }
  const reads = buffers.map(({ buffer: b }) =>
    device.createBuffer({
      size: b.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    }),
  );
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  bind(pass, groups);
  pass.dispatchWorkgroups(...(dispatch as [number, number, number]));
  pass.end();
  buffers.forEach(({ buffer: b }, k) =>
    encoder.copyBufferToBuffer(b, 0, reads[k]!, 0, b.size),
  );
  device.queue.submit([encoder.finish()]);
  const out: Uint32Array[] = [];
  for (const read of reads) {
    await read.mapAsync(GPUMapMode.READ);
    out.push(new Uint32Array(read.getMappedRange().slice(0)));
    read.unmap();
    read.destroy();
  }
  return out;
}

/**
 * Dispatches per timed pass. Chrome quantizes timestamps to 2^16 ns
 * (65.5 µs) without its developer features, coarser than these kernels;
 * timing 64 back-to-back dispatches puts that quantization under 1%.
 */
const REPEAT = 64;

/** The median GPU time of one dispatch of each pipeline, alternating. */
async function time(
  device: GPUDevice,
  pipelines: [GPUComputePipeline, GPUComputePipeline],
  groups: [GPUBindGroup[], GPUBindGroup[]],
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
      bind(pass, groups[which]!);
      for (let n = 0; n < REPEAT; n++) {
        pass.dispatchWorkgroups(...(dispatch as [number, number, number]));
      }
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
      durations[which]!.push(Number(t[q + 1]! - t[q]!) / 1000 / REPEAT);
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
    const layouts = c.layout?.map((entries) =>
      device.createBindGroupLayout({ entries }),
    );
    const pipeline = (code: string) =>
      device.createComputePipeline({
        layout: layouts
          ? device.createPipelineLayout({ bindGroupLayouts: layouts })
          : "auto",
        compute: {
          module: device.createShaderModule({ code }),
          entryPoint: c.entry ?? "main",
        },
      });
    const pipelines: [GPUComputePipeline, GPUComputePipeline] = [
      pipeline(c.reference),
      pipeline(c.slang),
    ];
    const groups = pipelines.map((p) =>
      resources.groups.map((entries, k) =>
        device.createBindGroup({
          layout: layouts ? layouts[k]! : p.getBindGroupLayout(k),
          entries,
        }),
      ),
    ) as [GPUBindGroup[], GPUBindGroup[]];
    // The same outputs from the same inputs, word for word.
    const a = await outputs(
      device,
      pipelines[0],
      groups[0],
      resources.dispatch,
      resources.outputs,
    );
    const b = await outputs(
      device,
      pipelines[1],
      groups[1],
      resources.dispatch,
      resources.outputs,
    );
    let differ = 0;
    let beyond = 0;
    let worst = 0;
    a.forEach((words, k) => {
      const ulps = resources.outputs[k]!.ulps ?? 0;
      for (let i = 0; i < words.length; i++) {
        if (words[i] !== b[k]![i]) {
          const d = Math.abs(words[i]! - b[k]![i]!);
          differ += 1;
          beyond += d > ulps ? 1 : 0;
          worst = Math.max(worst, d);
        }
      }
    });
    const same =
      differ === 0
        ? "identical"
        : beyond === 0
          ? `${differ} words within ${worst} ulp`
          : `${beyond} words differ (up to ${worst})`;
    // Warm both, then measure.
    await time(device, pipelines, groups, resources.dispatch, 10);
    const [wgsl, slang] = await time(
      device,
      pipelines,
      groups,
      resources.dispatch,
      40,
    );
    const ratio = slang / wgsl;
    rows.push({
      kernel: c.name,
      wgsl,
      slang,
      ratio,
      same,
      gate: beyond > 0 ? "✗ differs" : ratio <= 1.05 ? "✓" : "✗ slower",
    });
    render(rows);
  }
  device.destroy();
  status.textContent = `${rows.filter((r) => r.gate === "✓").length} of ${rows.length} within the gate.`;
  return rows;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runKernels };
  },
};
