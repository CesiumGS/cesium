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
import meterReference from "./slang/reference/meter.wgsl?raw";
import aoReference from "./slang/reference/ao.wgsl?raw";
import presentReference from "./slang/reference/present.wgsl?raw";
import fxaaReference from "./slang/reference/fxaa.wgsl?raw";
import compositeReference from "./slang/reference/composite.wgsl?raw";
import scatterReference from "./slang/reference/scatter.wgsl?raw";
import iblReference from "./slang/reference/ibl.wgsl?raw";
import iblMonteCarloReference from "./slang/reference/iblReference.wgsl?raw";
import pointsReference from "./slang/reference/points.wgsl?raw";
import modelPoolReference from "./slang/reference/modelPool.wgsl?raw";
import cullSlang from "../src/shaders/generated/cull.wgsl?raw";
import depthRangeSlang from "../src/shaders/generated/depthRange.wgsl?raw";
import lightsSlang from "../src/shaders/generated/lights.wgsl?raw";
import raycastSlang from "../src/shaders/generated/raycast.wgsl?raw";
import overlaySlang from "../src/shaders/generated/overlay.wgsl?raw";
import splatSlang from "../src/shaders/generated/splat.wgsl?raw";
import imagerySlang from "../src/shaders/generated/imagery.wgsl?raw";
import adaptSlang from "../src/shaders/generated/adapt.wgsl?raw";
import meterSlang from "../src/shaders/generated/meter.wgsl?raw";
import aoSlang from "../src/shaders/generated/ao.wgsl?raw";
import presentSlang from "../src/shaders/generated/present.wgsl?raw";
import fxaaSlang from "../src/shaders/generated/fxaa.wgsl?raw";
import compositeSlang from "../src/shaders/generated/composite.wgsl?raw";
import scatterSlang from "../src/shaders/generated/scatter.wgsl?raw";
import iblSlang from "../src/shaders/generated/ibl.wgsl?raw";
import iblMonteCarloSlang from "../src/shaders/generated/iblReference.wgsl?raw";
import pointsSlang from "../src/shaders/generated/points.wgsl?raw";
import modelPoolSlang from "../src/shaders/generated/modelPool.wgsl?raw";

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
  /**
   * f32 only: how far apart two elements may be, as well (or instead).
   * For sums that cancel: a coefficient near zero is many ulps from its
   * twin while both are 1e-7 from the truth.
   */
  absolute?: number;
  /**
   * Compared as a set of rows of this many 32-bit words, sorted, where
   * which row a result lands in depends on the threads' order (slots
   * claimed by atomics).
   */
  sortedRows?: number;
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
  /** The Slang's draw's groups, where they differ (`slangFragment`). */
  slangGroups?: GPUBindGroupEntry[][];
  /** The Slang's compute pass before the draw (`slangPrepass`). */
  prepass?: {
    groups: GPUBindGroupEntry[][];
    dispatch: [number, number?, number?];
  };
  /** Set by the runner: the prepass's pipeline and bound groups. */
  prepassBound?: { pipeline: GPUComputePipeline; groups: GPUBindGroup[] };
}
interface Case {
  name: string;
  reference: string;
  slang: string;
  /** The entry point (default `main`; compute only). */
  entry?: string;
  /** A render pipeline instead of a compute one. */
  render?: RenderSetup;
  /**
   * Where the port split the work: the Slang's own fragment entry, and a
   * compute pass (its entry) before the draw, timed together with it.
   */
  slangFragment?: string;
  slangPrepass?: string;
  /** The engine's bind group layouts, by group (default: `auto`). */
  layout?: GPUBindGroupLayoutEntry[][];
  /**
   * Dispatches or draws per timed pass (default REPEAT): fewer for a
   * heavy case, so a submission stays within the GPU's watchdog.
   */
  repeat?: number;
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

/**
 * A view's depth (reverse-Z, as the prepass writes it): a rolling surface
 * about 10 m away with steps in it (edges for the AO's depth weights), and
 * sky (0) across the top. Rendered: a depth texture can't be written.
 */
function sceneDepth(device: GPUDevice): GPUTexture {
  const depth = texture(device, {
    size: [W, H],
    format: "depth32float",
    usage: T.RENDER_ATTACHMENT,
  });
  const module = device.createShaderModule({
    code: `
@vertex fn vs(@builtin(vertex_index) v: u32) -> @builtin(position) vec4f {
  let uv = vec2f(f32((v << 1u) & 2u), f32(v & 2u));
  return vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fs(@builtin(position) p: vec4f) -> @builtin(frag_depth) f32 {
  if (p.y < ${H * 0.15}) { discard; }
  let distance = 10.0 + 3.0 * sin(p.x / 37.0) * cos(p.y / 23.0) + floor(p.x / 160.0) * 0.4;
  return 0.1 / distance;
}`,
  });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [] },
    depthStencil: {
      format: "depth32float",
      depthWriteEnabled: true,
      depthCompare: "always",
    },
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [],
    depthStencilAttachment: {
      view: depth.createView(),
      depthLoadOp: "clear",
      depthStoreOp: "store",
      depthClearValue: 0,
    },
  });
  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);
  return depth;
}

/** AoParams for the gate's view: 60° vertical, near 0.1 m, radius 1 m. */
function aoParams(device: GPUDevice): GPUBuffer {
  const tanY = Math.tan(Math.PI / 6);
  return buffer(
    device,
    new Float32Array([
      1,
      0,
      0,
      tanY * (W / H),
      0,
      1,
      0,
      tanY,
      0,
      0,
      -1,
      0.1,
      W,
      H,
      1,
      64,
    ]),
    GPUBufferUsage.UNIFORM,
  );
}

const HALF = [Math.ceil(W / 2), Math.ceil(H / 2)] as const;

const fullscreen = (fragment: string, formats: GPUTextureFormat[]) => ({
  vertex: "vs",
  fragment,
  targets: formats.map((format) => ({ format })),
});

/** A present pass's inputs: tone mapping, encoding, and the eye or not. */
function presentInputs(
  device: GPUDevice,
  toneMapping: number,
  encoding: number,
  eye: boolean,
): Resources {
  const random = randoms(21);
  const hdr = texture(
    device,
    { size: [W, H], format: "rgba16float" },
    (i) => toHalf(i % 4 === 3 ? 1 : 10 ** (random() * 5 - 3)),
    8,
  );
  // A fifth of the pixels partly display-referred (unlit) color.
  const display = texture(
    device,
    { size: [W, H], format: "rgba16float" },
    (i) => toHalf(random() < 0.2 ? random() * 0.5 : 0),
    8,
  );
  const params = new ArrayBuffer(48);
  const f = new Float32Array(params);
  const u = new Uint32Array(params);
  u[2] = toneMapping;
  u[3] = encoding;
  f[4] = eye ? 1 : 0.7;
  u[5] = eye ? 1 : 0;
  f[6] = 0.5; // cones, log10 cd/m²
  f[7] = -0.5; // rods
  f[8] = 0.3; // compensation, stops
  const color = texture(device, {
    size: [W, H],
    format: "rgba8unorm",
    usage: T.RENDER_ATTACHMENT,
  });
  return {
    groups: [
      [
        { binding: 0, resource: hdr.createView() },
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
        { binding: 2, resource: display.createView() },
        // The adaptation's grid: log2 luminance sums and weights.
        {
          binding: 3,
          resource: texture(
            device,
            { size: [...GRID], format: "rgba16float" },
            (i) => toHalf(i % 4 === 2 ? 0.5 + random() : random() * 4 - 2),
            8,
          ).createView(),
        },
        {
          binding: 4,
          resource: device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
          }),
        },
      ],
    ],
    dispatch: [3],
    outputs: [{ texture: color, element: "unorm8", ulps: 1 }],
    colors: [color],
  };
}

/** Translucency's per-pixel lists (TranslucentLists), at a quarter size. */
const LISTS = [W / 2, H / 2] as const;
function compositeInputs(device: GPUDevice, exact: boolean): Resources {
  const random = randoms(23);
  const [w, h] = LISTS;
  const half2 = (a: number, b: number) => toHalf(a) | (toHalf(b) << 16);
  const S = GPUBufferUsage.STORAGE;
  const attachment = () =>
    texture(device, {
      size: [w, h],
      format: "rgba16float",
      usage: T.RENDER_ATTACHMENT,
    });
  const colors = [attachment(), attachment()];
  const params = new ArrayBuffer(32);
  new Uint32Array(params).set([w, h, 4 + w * h, 0]);
  const uniform = {
    binding: 0,
    resource: {
      buffer: buffer(device, new Uint8Array(params), GPUBufferUsage.UNIFORM),
    },
  };
  const outputs: Output[] = colors.map((t) => ({
    texture: t,
    texelBytes: 8,
    element: "f16",
    ulps: 2,
  }));
  if (exact) {
    // Most pixels 0–3 layers; a few hundred over MAX_LAYERS (32).
    const heads = new Uint32Array(w * h);
    const nodes: number[] = [];
    for (let p = 0; p < w * h; p++) {
      const r = random();
      const layers = r < 0.0005 ? 40 : Math.floor(r * 4);
      for (let k = 0; k < layers; k++) {
        const alpha = 0.1 + random() * 0.6;
        const depth = new Uint32Array(new Float32Array([random()]).buffer)[0]!;
        nodes.push(
          half2(random(), random()),
          half2(random(), random() < 0.3 ? -alpha : alpha),
          depth,
          heads[p]!,
        );
        heads[p] = nodes.length / 4;
      }
    }
    const lists = new Uint32Array(4 + w * h + nodes.length);
    lists.set(heads, 4);
    lists.set(nodes, 4 + w * h);
    const blended = () =>
      texture(device, {
        size: [w, h],
        format: "rgba16float",
        usage: T.STORAGE_BINDING,
      });
    const lit = blended();
    const unlit = blended();
    const listBuffer = buffer(device, lists, S);
    // The port's nodes carry the samples they cover (`next`'s top four
    // bits, translucent.wgsl `appendNode`), all four here: the reference
    // predates them.
    const covered = lists.slice();
    for (let n = 4 + w * h + 3; n < covered.length; n += 4) {
      covered[n] = (covered[n]! | (0xf << 28)) >>> 0;
    }
    const coveredBuffer = buffer(device, covered, S);
    return {
      groups: [[uniform, { binding: 1, resource: { buffer: listBuffer } }]],
      dispatch: [3],
      outputs,
      colors,
      prepass: {
        groups: [
          [
            uniform,
            { binding: 1, resource: { buffer: coveredBuffer } },
            { binding: 5, resource: lit.createView() },
            { binding: 6, resource: unlit.createView() },
          ],
        ],
        dispatch: [Math.ceil(w / 8), Math.ceil(h / 4)],
      },
      slangGroups: [
        [
          { binding: 3, resource: lit.createView() },
          { binding: 4, resource: unlit.createView() },
        ],
      ],
    };
  }
  const moments = (fill: (i: number) => number) =>
    texture(
      device,
      { size: [w, h], format: "rgba16float" },
      fill,
      8,
    ).createView();
  return {
    groups: [
      [
        // fsMoments reads no uniform: its layout has no binding 0.
        {
          binding: 2,
          resource: moments(() => toHalf(random() < 0.3 ? 0 : random() * 3)),
        },
        { binding: 3, resource: moments(() => toHalf(random())) },
        { binding: 4, resource: moments(() => toHalf(random())) },
      ],
    ],
    dispatch: [3],
    outputs,
    colors,
  };
}

/** A blocky image (FXAA's edges): 7-pixel squares of random colors. */
function blocks(device: GPUDevice): GPUTexture {
  const random = randoms(29);
  const colors = Array.from({ length: 4096 }, () => Math.floor(random() * 256));
  return texture(device, { size: [W, H], format: "rgba8unorm" }, (i) => {
    const t = i >> 2;
    const x = Math.floor((t % W) / 7);
    const y = Math.floor(Math.floor(t / W) / 7);
    return i % 4 === 3 ? 255 : colors[(x * 31 + y * 17 + (i % 4) * 7) % 4096]!;
  });
}

/** ibl's parameters: the sky's four colors, then size, level, levels, samples. */
function skyParams(
  device: GPUDevice,
  size: number,
  level = 0,
  levels = 1,
  samples = 0,
): GPUBuffer {
  const data = new ArrayBuffer(80);
  new Float32Array(data, 0, 16).set([
    0.2, 0.4, 0.9, 1, 0.8, 0.85, 0.9, 1, 0.3, 0.25, 0.2, 1, 0.5, 0.45, 0.4, 1,
  ]);
  new Uint32Array(data, 64, 4).set([size, level, levels, samples]);
  return buffer(device, new Uint8Array(data), GPUBufferUsage.UNIFORM);
}

/** A cube's six faces, `size` square, random HDR texels (rgba16float). */
function cubeFaces(
  device: GPUDevice,
  size: number,
  seed: number,
  usage = 0,
  mipLevelCount = 1,
): GPUTexture {
  const random = randoms(seed);
  return texture(
    device,
    {
      size: [size, size, 6],
      dimension: "2d",
      format: "rgba16float",
      usage,
      mipLevelCount,
    },
    (i) => toHalf(i % 4 === 3 ? 1 : random() * random() * 8),
    8,
  );
}

/** An rgba16float target of six faces (or one plane), for storage writes. */
function faceTarget(device: GPUDevice, size: number, layers = 6): GPUTexture {
  return texture(device, {
    size: [size, size, layers],
    dimension: "2d",
    format: "rgba16float",
    usage: T.STORAGE_BINDING,
  });
}

const arrayView = (t: GPUTexture, mip = 0) =>
  t.createView({ dimension: "2d-array", baseMipLevel: mip, mipLevelCount: 1 });

const IBL_CASES: Case[] = [
  {
    name: "ibl.sky",
    reference: iblReference,
    slang: iblSlang,
    entry: "sky",
    setup(device) {
      const target = faceTarget(device, 128);
      return {
        groups: [
          [{ binding: 0, resource: { buffer: skyParams(device, 128) } }],
          [{ binding: 0, resource: arrayView(target) }],
        ],
        dispatch: [16, 16, 6],
        outputs: [{ texture: target, texelBytes: 8, element: "f16", ulps: 1 }],
      };
    },
  },
  {
    name: "ibl.downsample",
    reference: iblReference,
    slang: iblSlang,
    entry: "downsample",
    setup(device) {
      const target = faceTarget(device, 64);
      return {
        groups: [
          [],
          [
            { binding: 10, resource: arrayView(cubeFaces(device, 128, 41)) },
            { binding: 11, resource: arrayView(target) },
          ],
        ],
        dispatch: [8, 8, 6],
        outputs: [{ texture: target, texelBytes: 8, element: "f16", ulps: 1 }],
      };
    },
  },
  {
    name: "ibl.prefilter",
    reference: iblReference,
    slang: iblSlang,
    entry: "prefilter",
    setup(device) {
      // Level 2 of 6 from a 128² cube: 32 GGX samples a texel.
      const source = cubeFaces(device, 128, 43, 0, 8);
      const target = faceTarget(device, 32);
      return {
        groups: [
          [
            {
              binding: 0,
              resource: { buffer: skyParams(device, 32, 2, 6, 32) },
            },
          ],
          [
            { binding: 1, resource: source.createView({ dimension: "cube" }) },
            {
              binding: 2,
              resource: device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
                mipmapFilter: "linear",
              }),
            },
            { binding: 3, resource: arrayView(target) },
          ],
        ],
        dispatch: [4, 4, 6],
        outputs: [{ texture: target, texelBytes: 8, element: "f16", ulps: 2 }],
      };
    },
  },
  {
    name: "ibl.shFace",
    reference: iblReference,
    slang: iblSlang,
    entry: "shFace",
    setup(device) {
      const partial = buffer(device, 6 * 9 * 16, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [],
          [
            { binding: 4, resource: arrayView(cubeFaces(device, 32, 47)) },
            { binding: 5, resource: { buffer: partial } },
          ],
        ],
        dispatch: [6],
        // Sums of 1,024 texels that partly cancel: within 1e-6 (the
        // largest coefficients ~2, one ulp 1.2e-7).
        outputs: [{ buffer: partial, element: "f32", ulps: 4, absolute: 1e-6 }],
      };
    },
  },
  {
    name: "ibl.shFinal",
    reference: iblReference,
    slang: iblSlang,
    entry: "shFinal",
    setup(device) {
      const random = randoms(53);
      const partial = buffer(
        device,
        Float32Array.from({ length: 6 * 9 * 4 }, () => random() * 2 - 0.5),
        GPUBufferUsage.STORAGE,
      );
      const out = buffer(device, 9 * 16, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [],
          [
            { binding: 5, resource: { buffer: partial } },
            { binding: 6, resource: { buffer: out } },
          ],
        ],
        dispatch: [1],
        outputs: [{ buffer: out, element: "f32", ulps: 2 }],
      };
    },
  },
  {
    name: "ibl.irradianceCube",
    reference: iblReference,
    slang: iblSlang,
    entry: "irradianceCube",
    setup(device) {
      const target = faceTarget(device, 16);
      return {
        groups: [
          [],
          [
            { binding: 8, resource: arrayView(cubeFaces(device, 16, 59)) },
            { binding: 9, resource: arrayView(target) },
          ],
        ],
        dispatch: [2, 2, 6],
        outputs: [{ texture: target, texelBytes: 8, element: "f16", ulps: 1 }],
      };
    },
  },
  {
    name: "ibl.brdf",
    reference: iblReference,
    slang: iblSlang,
    entry: "brdf",
    setup(device) {
      const target = texture(device, {
        size: [64, 64],
        format: "rgba16float",
        usage: T.STORAGE_BINDING,
      });
      return {
        groups: [[], [{ binding: 7, resource: target.createView() }]],
        dispatch: [8, 8, 1],
        outputs: [{ texture: target, texelBytes: 8, element: "f16", ulps: 1 }],
      };
    },
  },
  {
    name: "ibl.reference",
    reference: iblMonteCarloReference,
    slang: iblMonteCarloSlang,
    setup(device) {
      const [w, h] = [256, 160];
      const p = new ArrayBuffer(112);
      const u = new Uint32Array(p);
      const f = new Float32Array(p);
      u.set([w, h, 16, 3]);
      f.set([0, 0, 1, Math.tan(0.6)], 4); // direction, tanX
      f.set([0, 1, 0, Math.tan(0.6) * (h / w)], 8); // up, tanY
      f.set([1, 0, 0], 12); // right
      u[15] = 3; // spheres
      f.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], 16); // env rows
      const spheres = new Float32Array([
        // center, radius, baseColor, metallic, roughness, pad ×3
        -1.2, 0, 5, 1, 0.9, 0.2, 0.1, 0, 0.6, 0, 0, 0, 1.2, 0, 5, 1, 0.9, 0.9,
        0.9, 1, 0.25, 0, 0, 0, 0, 0.9, 7, 1.4, 0.2, 0.5, 0.9, 0.5, 0.05, 0, 0,
        0,
      ]);
      const accum = buffer(device, w * h * 16, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [
            {
              binding: 0,
              resource: {
                buffer: buffer(
                  device,
                  new Uint8Array(p),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
            {
              binding: 1,
              resource: {
                buffer: buffer(device, spheres, GPUBufferUsage.STORAGE),
              },
            },
            {
              binding: 2,
              resource: cubeFaces(device, 64, 61).createView({
                dimension: "cube",
              }),
            },
            {
              binding: 3,
              resource: device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
              }),
            },
            { binding: 4, resource: { buffer: accum } },
          ],
        ],
        dispatch: [w / 8, h / 8],
        // Sums of 32 samples a pixel, up to 84. On the near-mirror sphere
        // (roughness 0.05) a direction a rounding apart lands elsewhere
        // on the GGX peak: 119 pixels there differ by up to 0.02 (8e-4
        // of their value; 1e-6 on average). Equally good estimates.
        outputs: [{ buffer: accum, element: "f32", ulps: 16, absolute: 0.05 }],
      };
    },
  },
];

// --- vector: live points and model pools ------------------------------------

const POINTS = 200_000;
const depthEntry = (binding: number): GPUBindGroupLayoutEntry => ({
  binding,
  visibility: GPUShaderStage.COMPUTE,
  texture: { sampleType: "depth" },
});
// PointSource's layouts: the state, then the samples.
const POINTS_LAYOUT: GPUBindGroupLayoutEntry[][] = [
  [uniform(0), storage(1, false), storage(2, false), depthEntry(3)],
  [uniform(0), storage(1, true)],
];
// ModelPool's one layout, the style's uniforms at 6.
const POOL_LAYOUT: GPUBindGroupLayoutEntry[][] = [
  [
    uniform(0),
    storage(1, true),
    storage(2, true),
    storage(3, false),
    storage(4, false),
    storage(5, false),
    uniform(6),
  ],
];

/** Points' states: two samples each, nine in ten sampled. */
function pointStates(seed: number): Float32Array {
  const random = randoms(seed);
  const f = new Float32Array(POINTS * 12);
  for (let i = 0; i < POINTS; i++) {
    const o = i * 12;
    const at = () => (random() - 0.5) * 9000;
    f.set([at(), at(), random() * 50, 10 + random()], o);
    f.set([at(), at(), random() * 50, 11.5 + random()], o + 4);
    f.set(
      [random() * 360, random() * 720 - 360, random() < 0.9 ? 1 : 0],
      o + 8,
    );
  }
  return f;
}

function pointsInputs(device: GPUDevice) {
  const params = new ArrayBuffer(64);
  const u = new Uint32Array(params);
  const f = new Float32Array(params);
  const groupsX = Math.ceil(POINTS / 64);
  f.set([12, 0.5]);
  u.set([POINTS - 1000, POINTS, 0, POINTS * 4, 3, 1, 1], 2);
  f.set([5000, 3000, -1000], 9);
  u[12] = groupsX * 64;
  const state = buffer(device, pointStates(71), GPUBufferUsage.STORAGE);
  const vertices = buffer(device, POINTS * 7 * 4, GPUBufferUsage.STORAGE);
  const group0 = [
    {
      binding: 0,
      resource: {
        buffer: buffer(device, new Uint8Array(params), GPUBufferUsage.UNIFORM),
      },
    },
    { binding: 1, resource: { buffer: state } },
    { binding: 2, resource: { buffer: vertices } },
    { binding: 3, resource: sceneDepth(device).createView() },
  ];
  return { group0, state, vertices, groupsX };
}

// A style, as VectorStyle compiles one: the pool's boundary both ways.
const POOL_STYLE = `
struct Uniforms { near: f32 };
@group(0) @binding(6) var<uniform> uniforms: Uniforms;
fn styleShow(i: u32, distance: f32) -> bool {
  return pointF32(i, 0u) > 0.3 && distance < uniforms.near;
}
fn styleHeading(i: u32, distance: f32) -> f32 {
  return pointF32(i, 1u) * 360.0 + styleTime();
}
fn styleScale(i: u32, distance: f32) -> f32 {
  return 1.0 + f32(pointU32(i, 2u) & 7u);
}`;

const SLOTS = 4096;
const PARTS = 3;

/** A pool's inputs: anchors and properties, three parts, its counters. */
function poolInputs(device: GPUDevice, stage: "bin" | "claim") {
  const random = randoms(73);
  // Anchors (x, y, z, heading), then three property words a point.
  const vertices = new Float32Array(POINTS * 7);
  const words = new Uint32Array(vertices.buffer);
  for (let i = 0; i < POINTS; i++) {
    const x = random() < 0.05 ? 3e38 : (random() - 0.5) * 9000;
    vertices.set([x, (random() - 0.5) * 9000, random() * 30, 0], i * 4);
    const p = POINTS * 4 + i * 3;
    vertices[p] = random();
    vertices[p + 1] = random();
    words[p + 2] = Math.floor(random() * 1000);
  }
  const params = new ArrayBuffer(128);
  const u = new Uint32Array(params);
  const f = new Float32Array(params);
  const groupsX = Math.ceil(POINTS / 64);
  u.set([POINTS, SLOTS, PARTS, groupsX * 64, 0, POINTS * 4, 3, 2]);
  f[8] = 7.5;
  f.set([100, -200, 400, 0, -3000, 1500, 600, 0], 16);
  // Parts: an affine local and its inverse (any matrices will do), each
  // part's slots in their own rows.
  const parts = new Float32Array(PARTS * 36);
  for (let k = 0; k < PARTS; k++) {
    const m = Array.from({ length: 16 }, (_, j) =>
      j % 5 === 0
        ? 1 + random() * 0.2
        : j >= 12 && j < 15
          ? random() * 4
          : random() * 0.1,
    );
    m[15] = 1;
    m[3] = m[7] = m[11] = 0;
    parts.set(m, k * 36);
    parts.set(
      m.map((v, j) => (j % 5 === 0 ? 1 / v : -v)),
      k * 36 + 16,
    );
    new Uint32Array(parts.buffer)[k * 36 + 32] = k * SLOTS;
  }
  // Instance rows (16 words each): 3 parts × slots, flags 0.
  const instances = buffer(device, PARTS * SLOTS * 64, GPUBufferUsage.STORAGE);
  // Counters: for `claim`, as `binPoints` and `cutPool` left them.
  const counters = new Uint32Array(132);
  const bins = new Uint32Array(POINTS).fill(0xffffffff);
  if (stage === "claim") {
    for (let i = 0; i < POINTS; i++) {
      // Visible points only, as `binPoints` bins them.
      if (random() < 0.4 && vertices[i * 4]! < 1e37) {
        const b = Math.floor(random() * 128);
        bins[i] = b;
        counters[b]! += 1;
      }
    }
    // The cut as `cutPool` finds it: every point below it gets a slot,
    // so which points do doesn't depend on the threads' order.
    let sum = 0;
    let cut = 128;
    for (let b = 0; b < 128; b++) {
      if (sum + counters[b]! > SLOTS) {
        cut = b;
        break;
      }
      sum += counters[b]!;
    }
    counters[128] = cut;
  }
  const counterBuffer = buffer(device, counters, GPUBufferUsage.STORAGE);
  const binBuffer = buffer(device, bins, GPUBufferUsage.STORAGE);
  const group = [
    {
      binding: 0,
      resource: {
        buffer: buffer(device, new Uint8Array(params), GPUBufferUsage.UNIFORM),
      },
    },
    {
      binding: 1,
      resource: { buffer: buffer(device, vertices, GPUBufferUsage.STORAGE) },
    },
    {
      binding: 2,
      resource: { buffer: buffer(device, parts, GPUBufferUsage.STORAGE) },
    },
    { binding: 3, resource: { buffer: instances } },
    { binding: 4, resource: { buffer: counterBuffer } },
    { binding: 5, resource: { buffer: binBuffer } },
    {
      binding: 6,
      resource: {
        buffer: buffer(
          device,
          new Float32Array([2500, 0, 0, 0]),
          GPUBufferUsage.UNIFORM,
        ),
      },
    },
  ];
  return {
    group,
    instances,
    counters,
    counterBuffer,
    bins,
    binBuffer,
    groupsX,
  };
}

const VECTOR_CASES: Case[] = [
  {
    name: "points.applySamples",
    reference: pointsReference,
    slang: pointsSlang,
    entry: "applySamples",
    layout: POINTS_LAYOUT,
    setup(device) {
      const { group0, state } = pointsInputs(device);
      const random = randoms(79);
      const n = POINTS - 200;
      const samples = Float32Array.from({ length: n * 4 }, (_, j) =>
        j % 4 === 3 ? random() * 360 : (random() - 0.5) * 9000,
      );
      const update = new ArrayBuffer(32);
      const groupsX = Math.ceil(n / 64);
      new Uint32Array(update).set([100, n, 0, 0, groupsX * 64]);
      new Float32Array(update).set([12.25, 0.75], 2);
      return {
        groups: [
          group0,
          [
            {
              binding: 0,
              resource: {
                buffer: buffer(
                  device,
                  new Uint8Array(update),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
            {
              binding: 1,
              resource: {
                buffer: buffer(device, samples, GPUBufferUsage.STORAGE),
              },
            },
          ],
        ],
        dispatch: [groupsX],
        outputs: [
          {
            buffer: state,
            initial: new Uint32Array(pointStates(71).buffer),
            element: "f32",
            ulps: 1,
          },
        ],
      };
    },
  },
  {
    name: "points.placePoints",
    reference: pointsReference,
    slang: pointsSlang,
    entry: "placePoints",
    layout: [POINTS_LAYOUT[0]!],
    setup(device) {
      const { group0, vertices, groupsX } = pointsInputs(device);
      return {
        groups: [group0],
        dispatch: [groupsX],
        outputs: [{ buffer: vertices, element: "f32", ulps: 1 }],
      };
    },
  },
  {
    name: "modelPool.binPoints",
    reference: `${commonReference}\n${modelPoolReference}\n${POOL_STYLE}`,
    slang: `${modelPoolSlang}\n${POOL_STYLE}`,
    entry: "binPoints",
    layout: POOL_LAYOUT,
    setup(device) {
      const { group, counterBuffer, counters, binBuffer, bins, groupsX } =
        poolInputs(device, "bin");
      return {
        groups: [group],
        dispatch: [groupsX],
        outputs: [
          { buffer: counterBuffer, initial: counters },
          { buffer: binBuffer, initial: bins },
        ],
      };
    },
  },
  {
    name: "modelPool.claimSlots",
    reference: `${commonReference}\n${modelPoolReference}\n${POOL_STYLE}`,
    slang: `${modelPoolSlang}\n${POOL_STYLE}`,
    entry: "claimSlots",
    layout: POOL_LAYOUT,
    setup(device) {
      // Which point gets which slot depends on the threads' order: one
      // slot a point, so the rows are compared as a set (sorted), and
      // the count exactly.
      const { group, counterBuffer, counters, instances, groupsX } = poolInputs(
        device,
        "claim",
      );
      return {
        groups: [group],
        dispatch: [groupsX],
        outputs: [
          { buffer: counterBuffer, initial: counters },
          { buffer: instances, element: "f32", ulps: 1, sortedRows: 16 },
        ],
      };
    },
  },
  {
    name: "modelPool.hideRest",
    reference: `${commonReference}\n${modelPoolReference}\n${POOL_STYLE}`,
    slang: `${modelPoolSlang}\n${POOL_STYLE}`,
    entry: "hideRest",
    layout: POOL_LAYOUT,
    setup(device) {
      const { group, counterBuffer, counters, instances } = poolInputs(
        device,
        "bin",
      );
      counters[129] = 1234;
      device.queue.writeBuffer(counterBuffer, 0, counters);
      return {
        groups: [group],
        dispatch: [Math.ceil((SLOTS * PARTS) / 64)],
        outputs: [{ buffer: instances }],
      };
    },
  },
];

const CASES: Case[] = [
  ...IBL_CASES,
  ...VECTOR_CASES,
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
    name: "meter",
    reference: meterReference,
    slang: meterSlang,
    setup(device) {
      // A tenth of the pixels without scene light (alpha 0).
      const random = randoms(13);
      const image = texture(
        device,
        { size: [W, H], format: "rgba16float" },
        (i) =>
          i % 4 === 3
            ? toHalf(random() < 0.1 ? 0 : 1)
            : toHalf(10 ** (random() * 8 - 4)),
        8,
      );
      const result = buffer(device, 16, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [
            { binding: 0, resource: image.createView() },
            {
              binding: 1,
              resource: {
                buffer: buffer(
                  device,
                  new Uint32Array([
                    new Uint32Array(new Float32Array([1]).buffer)[0]!,
                    W,
                    H,
                    0,
                  ]),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
            { binding: 2, resource: { buffer: result } },
          ],
        ],
        dispatch: [1],
        outputs: [{ buffer: result, element: "f32", ulps: 4 }],
      };
    },
  },
  {
    name: "ao.gtao",
    reference: aoReference,
    slang: aoSlang,
    entry: "gtao",
    setup(device) {
      const normals = texture(
        device,
        { size: [W, H], format: "rgba16float" },
        (i) => {
          const t = i >> 2;
          const x = t % W;
          const y = Math.floor(t / W);
          const n = [0.3 * Math.sin(x / 37), 0.3 * Math.cos(y / 23), 1, 0];
          const l = Math.hypot(n[0]!, n[1]!, n[2]!);
          return toHalf(n[i & 3]! / l);
        },
        8,
      );
      const raw = texture(device, {
        size: [...HALF],
        format: "r32float",
        usage: T.STORAGE_BINDING,
      });
      return {
        groups: [
          [
            { binding: 0, resource: { buffer: aoParams(device) } },
            { binding: 1, resource: sceneDepth(device).createView() },
            { binding: 2, resource: normals.createView() },
            { binding: 3, resource: raw.createView() },
          ],
        ],
        dispatch: [Math.ceil(HALF[0] / 8), Math.ceil(HALF[1] / 8)],
        outputs: [{ texture: raw, element: "f32", ulps: 8 }],
      };
    },
  },
  {
    name: "ao.denoise",
    reference: aoReference,
    slang: aoSlang,
    entry: "denoise",
    setup(device) {
      const random = randoms(17);
      const raw = texture(
        device,
        { size: [...HALF], format: "r32float" },
        () => 0,
      );
      const values = new Float32Array(HALF[0] * HALF[1]).map(() => random());
      device.queue.writeTexture(
        { texture: raw },
        values,
        { bytesPerRow: HALF[0] * 4 },
        [...HALF],
      );
      const words = Math.ceil(W / 4);
      const packed = buffer(device, words * H * 4, GPUBufferUsage.STORAGE);
      return {
        groups: [
          [
            { binding: 0, resource: { buffer: aoParams(device) } },
            { binding: 1, resource: sceneDepth(device).createView() },
            { binding: 4, resource: raw.createView() },
            { binding: 5, resource: { buffer: packed } },
          ],
        ],
        dispatch: [Math.ceil(words / 8), Math.ceil(H / 8)],
        // Four 8-bit values a word: compared as bytes.
        outputs: [{ buffer: packed, element: "unorm8", ulps: 1 }],
      };
    },
  },
  {
    name: "present.neutral",
    reference: presentReference,
    slang: presentSlang,
    render: fullscreen("fs", ["rgba8unorm"]),
    setup: (device) => presentInputs(device, 0, 1, false),
  },
  {
    name: "present.agx-eye",
    reference: presentReference,
    slang: presentSlang,
    render: fullscreen("fs", ["rgba8unorm"]),
    setup: (device) => presentInputs(device, 1, 2, true),
  },
  {
    name: "present.aces",
    reference: presentReference,
    slang: presentSlang,
    render: fullscreen("fs", ["rgba8unorm"]),
    setup: (device) => presentInputs(device, 2, 0, false),
  },
  {
    name: "fxaa",
    reference: fxaaReference,
    slang: fxaaSlang,
    render: fullscreen("fs", ["rgba8unorm"]),
    setup(device) {
      const color = texture(device, {
        size: [W, H],
        format: "rgba8unorm",
        usage: T.RENDER_ATTACHMENT,
      });
      return {
        groups: [
          [
            { binding: 0, resource: blocks(device).createView() },
            {
              binding: 1,
              resource: device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
              }),
            },
            {
              binding: 2,
              resource: {
                buffer: buffer(
                  device,
                  new Float32Array([0, 0, 1 / W, 1 / H, 0, 0, 0, 0]),
                  GPUBufferUsage.UNIFORM,
                ),
              },
            },
          ],
        ],
        dispatch: [3],
        outputs: [{ texture: color, element: "unorm8", ulps: 1 }],
        colors: [color],
      };
    },
  },
  {
    name: "composite.exact",
    reference: compositeReference,
    slang: compositeSlang,
    render: fullscreen("fsExact", ["rgba16float", "rgba16float"]),
    // The port sorts in a compute pass, then draws what it blended.
    slangPrepass: "sortLists",
    slangFragment: "fsSorted",
    repeat: 4,
    setup: (device) => compositeInputs(device, true),
  },
  {
    name: "composite.moments",
    reference: compositeReference,
    slang: compositeSlang,
    render: fullscreen("fsMoments", ["rgba16float", "rgba16float"]),
    setup: (device) => compositeInputs(device, false),
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
  const prepass = which === 1 ? resources.prepassBound : undefined;
  if (prepass) {
    const compute = encoder.beginComputePass({
      timestampWrites: timestampWrites && {
        querySet: timestampWrites.querySet,
        beginningOfPassWriteIndex: timestampWrites.beginningOfPassWriteIndex,
      },
    });
    compute.setPipeline(prepass.pipeline);
    prepass.groups.forEach((g, k) => compute.setBindGroup(k, g));
    for (let n = 0; n < repeat; n++) {
      compute.dispatchWorkgroups(
        ...(resources.prepass!.dispatch as [number, number, number]),
      );
    }
    compute.end();
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
    timestampWrites:
      prepass && timestampWrites
        ? {
            querySet: timestampWrites.querySet,
            endOfPassWriteIndex: timestampWrites.endOfPassWriteIndex,
          }
        : timestampWrites,
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
        c.repeat ?? REPEAT,
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
      durations[which]!.push(
        Number(t[q + 1]! - t[q]!) / 1000 / (c.repeat ?? REPEAT),
      );
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
  which: number,
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
      entryPoint:
        which === 1 && c.slangFragment ? c.slangFragment : c.render.fragment,
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
  void device.lost.then((info) => {
    if (info.reason !== "destroyed") {
      console.error(`Device lost: ${info.message}`);
    }
  });
  device.addEventListener("uncapturederror", (e) =>
    console.error((e as GPUUncapturedErrorEvent).error.message),
  );
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
      pipelineFor(device, c, layouts, c.reference, 0),
      pipelineFor(device, c, layouts, c.slang, 1),
    ];
    if (c.slangPrepass && resources.prepass) {
      const pipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
          module: device.createShaderModule({ code: c.slang }),
          entryPoint: c.slangPrepass,
        },
      });
      resources.prepassBound = {
        pipeline,
        groups: resources.prepass.groups.map((entries, k) =>
          device.createBindGroup({
            layout: pipeline.getBindGroupLayout(k),
            entries,
          }),
        ),
      };
    }
    const groups = pipelines.map((p, which) =>
      (which === 1 && resources.slangGroups
        ? resources.slangGroups
        : resources.groups
      ).map((entries, k) =>
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
    let absolute: number | undefined;
    const sortRows = (bytes: Uint8Array, words: number): Uint8Array => {
      const f = new Float32Array(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength / 4,
      );
      const rows = Array.from({ length: f.length / words }, (_, r) =>
        f.slice(r * words, (r + 1) * words),
      );
      // By the row's translation (its fourth, eighth and twelfth words):
      // a rounding apart doesn't reorder rows that far apart.
      rows.sort((x, y) => x[3]! - y[3]! || x[7]! - y[7]! || x[11]! - y[11]!);
      const out = new Float32Array(f.length);
      rows.forEach((row, r) => out.set(row, r * words));
      return new Uint8Array(out.buffer);
    };
    a.forEach((bytes0, k) => {
      const o = resources.outputs[k]!;
      const bytes = o.sortedRows ? sortRows(bytes0, o.sortedRows) : bytes0;
      if (o.sortedRows) {
        b[k] = sortRows(b[k]!, o.sortedRows);
      }
      const element = o.element ?? "u32";
      const x = ordered(bytes, element);
      const y = ordered(b[k]!, element);
      const fx = new Float32Array(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength / 4,
      );
      const fy = new Float32Array(
        b[k]!.buffer,
        b[k]!.byteOffset,
        b[k]!.byteLength / 4,
      );
      for (let i = 0; i < x.length; i++) {
        if (x[i] !== y[i]) {
          const d = Math.abs(x[i]! - y[i]!);
          const near =
            o.absolute !== undefined &&
            element === "f32" &&
            Math.abs(fx[i]! - fy[i]!) <= o.absolute;
          differ += 1;
          beyond += d > (o.ulps ?? 0) && !near ? 1 : 0;
          worst = Math.max(worst, d);
          if (near && d > (o.ulps ?? 0)) {
            absolute = o.absolute;
          }
        }
      }
    });
    // Outputs all zeros compare equal and prove nothing: a case's inputs
    // must make its kernel write.
    const empty = a.every((bytes) => bytes.every((x) => x === 0));
    const same = empty
      ? "all zero"
      : differ === 0
        ? "identical"
        : beyond === 0
          ? absolute !== undefined
            ? `${differ} within ${absolute}`
            : `${differ} within ${worst} ulp`
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
      gate: empty
        ? "✗ no output"
        : beyond > 0
          ? "✗ differs"
          : ratio <= 1.05
            ? "✓"
            : "✗ slower",
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
