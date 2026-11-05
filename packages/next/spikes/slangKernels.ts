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
import overlayReference from "./slang/reference/overlay.wgsl?raw";
import splatReference from "./slang/reference/splat.wgsl?raw";
import imageryReference from "./slang/reference/imagery.wgsl?raw";
import adaptReference from "./slang/reference/adapt.wgsl?raw";
import scatterReference from "./slang/reference/scatter.wgsl?raw";
import cullSlang from "../src/shaders/generated/cull.wgsl?raw";
import depthRangeSlang from "../src/shaders/generated/depthRange.wgsl?raw";
import lightsSlang from "../src/shaders/generated/lights.wgsl?raw";
import raycastSlang from "../src/shaders/generated/raycast.wgsl?raw";
import overlaySlang from "../src/shaders/generated/overlay.wgsl?raw";
import splatSlang from "../src/shaders/generated/splat.wgsl?raw";
import imagerySlang from "../src/shaders/generated/imagery.wgsl?raw";
import adaptSlang from "../src/shaders/generated/adapt.wgsl?raw";
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
/** How an output's elements compare: their bits as ordered integers. */
type Element = "u32" | "f32" | "f16" | "unorm8";
interface Output {
  /** A buffer the kernel writes, or a texture (storage or attachment). */
  buffer?: GPUBuffer;
  texture?: GPUTexture;
  /** A texture's bytes per texel (default 4). */
  texelBytes?: number;
  /** A buffer's contents before the dispatch (default zeros). */
  initial?: Uint32Array;
  /** Its elements (default u32: bit for bit). */
  element?: Element;
  /**
   * How many units in the last place an element may differ. Two
   * compilers may order a sum differently, or fuse a multiply-add one
   * way and not the other; that is rounding, not a wrong port.
   */
  ulps?: number;
}
/** A render pipeline's case: its attachments are its outputs. */
interface RenderSetup {
  vertex: string;
  fragment: string;
  targets: GPUColorTargetState[];
  depthStencil?: GPUDepthStencilState;
  vertexBuffers?: GPUVertexBufferLayout[];
}
interface Resources {
  /** Each group's entries. */
  groups: GPUBindGroupEntry[][];
  /** Workgroups (compute), or vertices to draw (render: `[count]`). */
  dispatch: [number, number?, number?];
  /** The Slang's, where the port changed its workgroups' shape. */
  slangDispatch?: [number, number?, number?];
  /** What the kernel writes: reset, then compared between the two. */
  outputs: Output[];
  /** Render: the color attachments (outputs too) and depth. */
  colors?: GPUTexture[];
  depth?: GPUTexture;
  vertexBuffers?: GPUBuffer[];
}
interface Case {
  name: string;
  reference: string;
  slang: string;
  /** The entry point (default `main`; compute only). */
  entry?: string;
  /** A render pipeline instead of a compute one. */
  render?: RenderSetup;
  /** The engine's bind group layouts, by group (default: `auto`). */
  layout?: GPUBindGroupLayoutEntry[][];
  setup(device: GPUDevice): Resources;
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
        element: "f32",
        ulps: 4,
      },
    ],
  };
}

/** A seeded random source (the same inputs for both pipelines). */
function randoms(seed: number): () => number {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/** A float as half-float bits (round to nearest; finite, normal range). */
function toHalf(x: number): number {
  const f = new Float32Array([x]);
  const b = new Uint32Array(f.buffer)[0]!;
  const sign = (b >>> 16) & 0x8000;
  const exp = ((b >>> 23) & 0xff) - 127 + 15;
  if (exp <= 0) {
    return sign;
  }
  const mantissa = (b >>> 13) & 0x3ff;
  return sign | (Math.min(exp, 30) << 10) | mantissa;
}

const T = GPUTextureUsage;

/** A texture of random texels (`bytes` per texel), sampled or stored. */
function texture(
  device: GPUDevice,
  descriptor: Omit<GPUTextureDescriptor, "usage"> & { usage?: number },
  fill?: (i: number) => number,
  texelBytes = 4,
): GPUTexture {
  const size = descriptor.size as [number, number, number?];
  const [w, h, d = 1] = size;
  const t = device.createTexture({
    dimension: d > 1 ? "3d" : "2d",
    ...descriptor,
    usage:
      (descriptor.usage ?? 0) | T.TEXTURE_BINDING | T.COPY_DST | T.COPY_SRC,
  });
  if (fill) {
    const bytes = new Uint8Array(w * h * d * texelBytes);
    const view =
      texelBytes === 8
        ? new Uint16Array(bytes.buffer)
        : new Uint8Array(bytes.buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = fill(i);
    }
    device.queue.writeTexture(
      { texture: t },
      bytes,
      { bytesPerRow: w * texelBytes, rowsPerImage: h },
      [w, h, d],
    );
  }
  return t;
}

/** A view uniform: identity view-projection, the gate's viewport. */
function viewUniform(device: GPUDevice): GPUBuffer {
  const f = new Float32Array(ViewLayout.size / 4);
  for (let c = 0; c < 4; c++) {
    f[ViewLayout.viewProj / 4 + c * 4 + c] = 1;
  }
  f.set([W, H, 1 / W, 1 / H], ViewLayout.viewport / 4);
  return buffer(device, f, GPUBufferUsage.UNIFORM);
}

const IMAGERY = 256;
/** As GlobeImagery's `globe.imagery.composite` layout. */
const IMAGERY_LAYOUT: GPUBindGroupLayoutEntry[][] = [
  [
    { binding: 0, visibility: COMPUTE, texture: { sampleType: "float" } },
    { binding: 1, visibility: COMPUTE, sampler: { type: "filtering" } },
    {
      binding: 2,
      visibility: COMPUTE,
      storageTexture: { access: "write-only", format: "rgba8unorm" },
    },
    uniform(3),
  ],
];

/** One imagery entry: a 256² source tile into a 256² slice (or a mip). */
function imageryInputs(device: GPUDevice, size: number): Resources {
  const random = randoms(5);
  const source = texture(
    device,
    { size: [IMAGERY, IMAGERY], format: "rgba8unorm" },
    () => Math.floor(random() * 256),
  );
  const destination = texture(device, {
    size: [size, size],
    format: "rgba8unorm",
    usage: T.STORAGE_BINDING,
  });
  const params = new Float32Array(4 + 4 + 256);
  // A source tile covering most of the slice, offset (as a neighbor's).
  params.set([-0.1, 1.2 / size, size, 0], 0);
  params.set([0.2, 0.4, 0.6, 1], 4);
  for (let y = 0; y < 256; y++) {
    params[8 + y] = -0.05 + (1.1 * (y + 0.5)) / size + 0.02 * Math.sin(y / 9);
  }
  return {
    groups: [
      [
        { binding: 0, resource: source.createView() },
        {
          binding: 1,
          resource: device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
          }),
        },
        { binding: 2, resource: destination.createView() },
        {
          binding: 3,
          resource: { buffer: buffer(device, params, GPUBufferUsage.UNIFORM) },
        },
      ],
    ],
    dispatch: [size / 8, size / 8],
    outputs: [{ texture: destination, element: "unorm8" }],
  };
}

/** The adaptation grid's cells (16 px) over the gate's view. */
const GRID = [Math.ceil(W / 16), Math.ceil(H / 16), 16] as const;

/** A random HDR image (rgba16float), log-spread over 8 decades. */
function hdrImage(device: GPUDevice, w: number, h: number, d = 1): GPUTexture {
  const random = randoms(9);
  return texture(
    device,
    { size: [w, h, d], format: "rgba16float" },
    (i) => (i % 4 === 3 ? toHalf(1) : toHalf(10 ** (random() * 8 - 4))),
    8,
  );
}

/** The adaptation reduce: the gate's HDR view into its grid. */
function adaptReduceInputs(device: GPUDevice): Resources {
  const grid = texture(device, {
    size: [...GRID],
    format: "rgba16float",
    usage: T.STORAGE_BINDING,
  });
  return {
    groups: [
      [
        { binding: 0, resource: hdrImage(device, W, H).createView() },
        {
          binding: 1,
          resource: {
            buffer: buffer(
              device,
              new Float32Array([1, 0.5, 0, 0]),
              GPUBufferUsage.UNIFORM,
            ),
          },
        },
        { binding: 2, resource: grid.createView() },
      ],
    ],
    dispatch: [Math.ceil(GRID[0] / 8), Math.ceil(GRID[1] / 8)],
    // A workgroup a cell (adapt.slang `reduce`).
    slangDispatch: [GRID[0], GRID[1]],
    outputs: [{ texture: grid, texelBytes: 8, element: "f16", ulps: 2 }],
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
    name: "overlay",
    reference: `${commonReference}\n${overlayReference}`,
    slang: overlaySlang,
    render: {
      vertex: "vs",
      fragment: "fs",
      targets: [{ format: "rgba8unorm" }],
      vertexBuffers: [
        {
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
        },
      ],
    },
    setup(device) {
      // Large triangles over the view (the engine draws lines; the
      // shader is the same).
      const random = randoms(2);
      const positions = new Float32Array(300 * 9).map(() => random() * 3 - 1.5);
      const color = texture(device, {
        size: [W, H],
        format: "rgba8unorm",
        usage: T.RENDER_ATTACHMENT,
      });
      return {
        groups: [
          [{ binding: 0, resource: { buffer: viewUniform(device) } }],
          [
            {
              binding: 0,
              resource: {
                buffer: buffer(
                  device,
                  new Float32Array([0.3, 0.6, 0.9, 1]),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
          ],
        ],
        dispatch: [positions.length / 3],
        outputs: [{ texture: color, element: "unorm8" }],
        colors: [color],
        vertexBuffers: [buffer(device, positions, GPUBufferUsage.VERTEX)],
      };
    },
  },
  {
    name: "splat",
    reference: `${commonReference}\n${splatReference}`,
    slang: splatSlang,
    render: {
      vertex: "vs",
      fragment: "fs",
      targets: [
        { format: "rgba16float", writeMask: 0 },
        { format: "rg16uint" },
        {
          format: "rgba8unorm-srgb",
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          },
        },
      ],
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
    },
    setup(device) {
      // A third of the pixels splatted, at random depths and colors.
      const random = randoms(4);
      const n = W * H;
      const depth = new Float32Array(n).map(() =>
        random() < 0.33 ? 0.01 + random() * 0.98 : 0,
      );
      const words = (f: () => number) => Uint32Array.from({ length: n }, f);
      const S = GPUBufferUsage.STORAGE;
      const attachment = (format: GPUTextureFormat) =>
        texture(device, { size: [W, H], format, usage: T.RENDER_ATTACHMENT });
      const colors = [
        attachment("rgba16float"),
        attachment("rg16uint"),
        attachment("rgba8unorm-srgb"),
      ];
      const depthTarget = attachment("depth32float");
      return {
        groups: [
          [{ binding: 0, resource: { buffer: viewUniform(device) } }],
          [
            { binding: 0, resource: { buffer: buffer(device, depth, S) } },
            {
              binding: 1,
              resource: {
                buffer: buffer(
                  device,
                  words(() => (random() * 2 ** 32) >>> 0),
                  S,
                ),
              },
            },
            {
              binding: 2,
              resource: {
                buffer: buffer(
                  device,
                  words(() => (random() * 2 ** 32) >>> 0),
                  S,
                ),
              },
            },
          ],
        ],
        dispatch: [3],
        outputs: [
          { texture: colors[1]! },
          { texture: colors[2]!, element: "unorm8" },
          { texture: depthTarget, element: "f32" },
        ],
        colors,
        depth: depthTarget,
      };
    },
  },
  {
    name: "imagery.fill",
    reference: imageryReference,
    slang: imagerySlang,
    entry: "fill",
    layout: IMAGERY_LAYOUT,
    setup: (device) => imageryInputs(device, IMAGERY),
  },
  {
    name: "imagery.composite",
    reference: imageryReference,
    slang: imagerySlang,
    entry: "composite",
    layout: IMAGERY_LAYOUT,
    setup: (device) => imageryInputs(device, IMAGERY),
  },
  {
    name: "imagery.downsample",
    reference: imageryReference,
    slang: imagerySlang,
    entry: "downsample",
    layout: IMAGERY_LAYOUT,
    setup: (device) => imageryInputs(device, IMAGERY / 2),
  },
  {
    name: "adapt.reduce",
    reference: adaptReference,
    slang: adaptSlang,
    entry: "reduce",
    setup: adaptReduceInputs,
  },
  {
    name: "adapt.blur",
    reference: adaptReference,
    slang: adaptSlang,
    entry: "blur",
    setup(device) {
      const blurred = texture(device, {
        size: [...GRID],
        format: "rgba16float",
        usage: T.STORAGE_BINDING,
      });
      return {
        groups: [
          [
            { binding: 3, resource: hdrImage(device, ...GRID).createView() },
            { binding: 4, resource: blurred.createView() },
          ],
        ],
        dispatch: [Math.ceil(GRID[0] / 8), Math.ceil(GRID[1] / 8), GRID[2]],
        outputs: [{ texture: blurred, texelBytes: 8, element: "f16", ulps: 2 }],
      };
    },
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

type Pipeline = GPUComputePipeline | GPURenderPipeline;

/** One pass of `repeat` dispatches or draws, optionally timed. */
function encodePass(
  encoder: GPUCommandEncoder,
  c: Case,
  resources: Resources,
  pipeline: Pipeline,
  groups: GPUBindGroup[],
  repeat: number,
  which: number,
  timestampWrites?: GPUComputePassTimestampWrites,
): void {
  const dispatch =
    which === 1 && resources.slangDispatch
      ? resources.slangDispatch
      : resources.dispatch;
  if (!c.render) {
    const pass = encoder.beginComputePass({ timestampWrites });
    pass.setPipeline(pipeline as GPUComputePipeline);
    groups.forEach((g, k) => pass.setBindGroup(k, g));
    for (let n = 0; n < repeat; n++) {
      pass.dispatchWorkgroups(...(dispatch as [number, number, number]));
    }
    pass.end();
    return;
  }
  const pass = encoder.beginRenderPass({
    colorAttachments: (resources.colors ?? []).map((t) => ({
      view: t.createView(),
      loadOp: "clear",
      storeOp: "store",
      clearValue: [0, 0, 0, 0],
    })),
    depthStencilAttachment: resources.depth
      ? {
          view: resources.depth.createView(),
          depthLoadOp: "clear",
          depthStoreOp: "store",
          depthClearValue: 0,
        }
      : undefined,
    timestampWrites,
  });
  pass.setPipeline(pipeline as GPURenderPipeline);
  groups.forEach((g, k) => pass.setBindGroup(k, g));
  resources.vertexBuffers?.forEach((b, k) => pass.setVertexBuffer(k, b));
  for (let n = 0; n < repeat; n++) {
    pass.draw(dispatch[0]);
  }
  pass.end();
}

/** A texture's bytes per row, as a copy to a buffer needs them. */
const paddedRow = (bytes: number) => Math.ceil(bytes / 256) * 256;

/** One pass from reset outputs; each output's bytes (rows unpadded). */
async function outputs(
  device: GPUDevice,
  c: Case,
  resources: Resources,
  pipeline: Pipeline,
  groups: GPUBindGroup[],
  which: number,
): Promise<Uint8Array[]> {
  const encoder = device.createCommandEncoder();
  const reads = resources.outputs.map((o) => {
    if (o.buffer) {
      device.queue.writeBuffer(
        o.buffer,
        0,
        o.initial ?? new Uint32Array(o.buffer.size / 4),
      );
      return device.createBuffer({
        size: o.buffer.size,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
    }
    const t = o.texture!;
    const row = paddedRow(t.width * (o.texelBytes ?? 4));
    if (!c.render) {
      // Storage textures: zeros first (attachments are cleared).
      device.queue.writeTexture(
        { texture: t },
        new Uint8Array(row * t.height * t.depthOrArrayLayers),
        { bytesPerRow: row, rowsPerImage: t.height },
        [t.width, t.height, t.depthOrArrayLayers],
      );
    }
    return device.createBuffer({
      size: row * t.height * t.depthOrArrayLayers,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  });
  encodePass(encoder, c, resources, pipeline, groups, 1, which);
  resources.outputs.forEach((o, k) => {
    if (o.buffer) {
      encoder.copyBufferToBuffer(o.buffer, 0, reads[k]!, 0, o.buffer.size);
    } else {
      const t = o.texture!;
      encoder.copyTextureToBuffer(
        { texture: t },
        {
          buffer: reads[k]!,
          bytesPerRow: paddedRow(t.width * (o.texelBytes ?? 4)),
          rowsPerImage: t.height,
        },
        [t.width, t.height, t.depthOrArrayLayers],
      );
    }
  });
  device.queue.submit([encoder.finish()]);
  const out: Uint8Array[] = [];
  for (const [k, read] of reads.entries()) {
    await read.mapAsync(GPUMapMode.READ);
    const bytes = new Uint8Array(read.getMappedRange().slice(0));
    read.unmap();
    read.destroy();
    const o = resources.outputs[k]!;
    if (o.buffer) {
      out.push(bytes);
      continue;
    }
    // Drop each row's padding.
    const t = o.texture!;
    const rowBytes = t.width * (o.texelBytes ?? 4);
    const row = paddedRow(rowBytes);
    const packed = new Uint8Array(rowBytes * t.height * t.depthOrArrayLayers);
    for (let y = 0; y < t.height * t.depthOrArrayLayers; y++) {
      packed.set(bytes.subarray(y * row, y * row + rowBytes), y * rowBytes);
    }
    out.push(packed);
  }
  return out;
}

/** An element's bits as an integer that orders as the value does. */
function ordered(bytes: Uint8Array, element: Element): Int32Array | Uint8Array {
  if (element === "unorm8") {
    return bytes;
  }
  if (element === "f16") {
    const h = new Uint16Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength / 2,
    );
    return Int32Array.from(h, (b) => (b & 0x8000 ? -(b & 0x7fff) : b));
  }
  const w = new Uint32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 4,
  );
  if (element === "u32") {
    return Int32Array.from(w, (b) => b | 0);
  }
  return Int32Array.from(w, (b) => (b & 0x80000000 ? -(b & 0x7fffffff) : b));
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
  c: Case,
  resources: Resources,
  pipelines: [Pipeline, Pipeline],
  groups: [GPUBindGroup[], GPUBindGroup[]],
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
      encodePass(
        encoder,
        c,
        resources,
        pipelines[which]!,
        groups[which]!,
        REPEAT,
        which,
        {
          querySet,
          beginningOfPassWriteIndex: q,
          endOfPassWriteIndex: q + 1,
        },
      );
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

/** The pipeline for a case's code. */
function pipelineFor(
  device: GPUDevice,
  c: Case,
  layouts: GPUBindGroupLayout[] | undefined,
  code: string,
): Pipeline {
  const module = device.createShaderModule({ code });
  const layout = layouts
    ? device.createPipelineLayout({ bindGroupLayouts: layouts })
    : "auto";
  if (!c.render) {
    return device.createComputePipeline({
      layout,
      compute: { module, entryPoint: c.entry ?? "main" },
    });
  }
  return device.createRenderPipeline({
    layout,
    vertex: {
      module,
      entryPoint: c.render.vertex,
      buffers: c.render.vertexBuffers,
    },
    fragment: {
      module,
      entryPoint: c.render.fragment,
      targets: c.render.targets,
    },
    depthStencil: c.render.depthStencil,
    primitive: { topology: "triangle-list" },
  });
}

async function runKernels(): Promise<Row[]> {
  const status = root.querySelector<HTMLElement>(".status")!;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter?.features.has("timestamp-query")) {
    throw new Error("Needs timestamp queries.");
  }
  const device = await adapter.requestDevice({
    requiredFeatures: ["timestamp-query"],
    requiredLimits: {
      maxStorageBuffersPerShaderStage:
        adapter.limits.maxStorageBuffersPerShaderStage,
    },
  });
  // `?only=a,b`: just those cases (by name prefix).
  const only = new URLSearchParams(location.search).get("only")?.split(",");
  const cases = only
    ? CASES.filter((c) => only.some((o) => c.name.startsWith(o)))
    : CASES;
  const rows: Row[] = [];
  for (const c of cases) {
    status.textContent = `Timing ${c.name}…`;
    const resources = c.setup(device);
    const layouts = c.layout?.map((entries) =>
      device.createBindGroupLayout({ entries }),
    );
    const pipelines: [Pipeline, Pipeline] = [
      pipelineFor(device, c, layouts, c.reference),
      pipelineFor(device, c, layouts, c.slang),
    ];
    const groups = pipelines.map((p) =>
      resources.groups.map((entries, k) =>
        device.createBindGroup({
          layout: layouts ? layouts[k]! : p.getBindGroupLayout(k),
          entries,
        }),
      ),
    ) as [GPUBindGroup[], GPUBindGroup[]];
    // The same outputs from the same inputs, element for element.
    const a = await outputs(device, c, resources, pipelines[0], groups[0], 0);
    const b = await outputs(device, c, resources, pipelines[1], groups[1], 1);
    let differ = 0;
    let beyond = 0;
    let worst = 0;
    a.forEach((bytes, k) => {
      const o = resources.outputs[k]!;
      const element = o.element ?? "u32";
      const x = ordered(bytes, element);
      const y = ordered(b[k]!, element);
      for (let i = 0; i < x.length; i++) {
        if (x[i] !== y[i]) {
          const d = Math.abs(x[i]! - y[i]!);
          differ += 1;
          beyond += d > (o.ulps ?? 0) ? 1 : 0;
          worst = Math.max(worst, d);
        }
      }
    });
    const same =
      differ === 0
        ? "identical"
        : beyond === 0
          ? `${differ} within ${worst} ulp`
          : `${beyond} differ (up to ${worst})`;
    // Warm both, then measure.
    await time(device, c, resources, pipelines, groups, 10);
    const [wgsl, slang] = await time(
      device,
      c,
      resources,
      pipelines,
      groups,
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
