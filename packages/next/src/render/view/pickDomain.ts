// The pick variant's pass (CESIUM2_WEBGPU_PLAN.md §13.26, increment 5): what
// the opaque pass drew under a pixel, drawn again into a few pixels' targets
// (`PICK_SIZE` square) around it, with the same cull, vertex stage,
// placement and discards, writing the draw, the triangle and barycentrics or
// the patch draw's face and (u, v) (shaders/surface.slang, "the pick
// variant"). A kernel then reads the middle pixel and the hit triangle's
// stored positions (shaders/pickDomain.slang), and the CPU turns that into
// the content's own point (scene/pickDomain.ts).
//
// The pass is the world's cull and a bundle (`World.pickBundle`) over a view
// block made for the window: the view's block as last written, with the
// planes of the window's frustum and the window itself (`writePickBlock`).
import type { Camera } from "../../scene/Camera.ts";
import {
  PICK_DEPTH_FORMAT,
  PICK_FORMATS,
  PICK_RESULT_WORDS,
  PICK_SIZE,
  RECORD_WORDS,
  TERRAIN_CLIP_WORD,
  VIEW_STRIDE,
  writePickBlock,
} from "../layout.ts";
import {
  NO_DRAW,
  readSample,
  type DomainSample,
} from "../../scene/pickDomain.ts";
import type { View } from "../../scene/View.ts";
import type { World } from "../../scene/World.ts";
import type { PickEngine } from "./picks.ts";
import type { ViewFrame } from "./viewFrameData.ts";

/** A device's pick-variant resources: its targets, result and kernels' bind groups. */
export interface PickDomainResources {
  readonly ids: GPUTextureView;
  readonly values: GPUTextureView;
  readonly depth: GPUTextureView;
  readonly textures: readonly GPUTexture[];
  readonly result: GPUBuffer;
  readonly gather: GPUBindGroup;
  readonly readback: GPUBuffer[];
}

/** A pick variant's pass encoded, awaiting its readback. */
export interface PendingDomain {
  readonly readback: GPUBuffer;
  /** Buffers made for this pick alone, destroyed once it is read. */
  readonly disposables: readonly GPUBuffer[];
  /**
   * The terrain regions the pass stops at: set only for globes placed across
   * a warp, where the CPU can't trace the drawn terrain (`terrainStops`):
   * the pass's hit then stands in for the CPU's.
   */
  readonly stopsTerrain: boolean;
  readonly world: World;
}

const RESULT_BYTES = PICK_RESULT_WORDS * 4;
const NONE = 0xffffffff;

/** The device's pick-variant resources, made when first asked for. */
export function pickDomainResources(engine: PickEngine): PickDomainResources {
  const raster = engine.raster;
  if (raster.pickDomain) {
    return raster.pickDomain;
  }
  const { device, pipelines } = engine.ctx;
  const size = { width: PICK_SIZE, height: PICK_SIZE };
  const usage =
    GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
  const ids = device.createTexture({
    label: "pick.domain.ids",
    size,
    format: PICK_FORMATS[0],
    usage,
  });
  const values = device.createTexture({
    label: "pick.domain.values",
    size,
    format: PICK_FORMATS[1],
    usage,
  });
  const depth = device.createTexture({
    label: "pick.domain.depth",
    size,
    format: PICK_DEPTH_FORMAT,
    usage,
  });
  const result = device.createBuffer({
    label: "pick.domain.result",
    size: RESULT_BYTES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const views = [ids, values, depth].map((t) => t.createView());
  const resources: PickDomainResources = {
    ids: views[0]!,
    values: views[1]!,
    depth: views[2]!,
    textures: [ids, values, depth],
    result,
    gather: device.createBindGroup({
      label: "pick.domain.gather",
      layout: pipelines.pickGather.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: views[0]! },
        { binding: 1, resource: views[1]! },
        { binding: 2, resource: views[2]! },
        { binding: 3, resource: { buffer: result } },
      ],
    }),
    readback: [],
  };
  raster.pickDomain = resources;
  return resources;
}

/**
 * The planes of the frustum of a window of the view, inward normals and
 * camera-relative (as `Camera.frustumPlanes`: left, right, bottom, top, near),
 * for the cull: `x0` to `x1` and `y0` to `y1` in NDC, `tanX` and `tanY` the
 * tangents of the view's half angles.
 */
export function windowPlanes(
  out: Float32Array | Float64Array,
  camera: Pick<Camera, "direction" | "right" | "up" | "near">,
  tanX: number,
  tanY: number,
  [x0, x1, y0, y1]: readonly [number, number, number, number],
): void {
  const d = camera.direction;
  const r = camera.right;
  const u = camera.up;
  for (let k = 0; k < 3; k++) {
    out[k] = r[k]! - x0 * tanX * d[k]!;
    out[4 + k] = -r[k]! + x1 * tanX * d[k]!;
    out[8 + k] = u[k]! - y0 * tanY * d[k]!;
    out[12 + k] = -u[k]! + y1 * tanY * d[k]!;
    out[16 + k] = d[k]!;
  }
  out[3] = out[7] = out[11] = out[15] = 0;
  out[19] = -camera.near;
  for (let i = 0; i < 16; i += 4) {
    const length = Math.hypot(out[i]!, out[i + 1]!, out[i + 2]!);
    out[i] = out[i]! / length;
    out[i + 1] = out[i + 1]! / length;
    out[i + 2] = out[i + 2]! / length;
  }
}

/**
 * Encodes the pick variant for the pixel (`x`, `y`) of the view's frame, and
 * its readback. Undefined when the world has nothing to draw it with (no
 * frame prepared). `inTick`: the pass is one of a view's, after which the
 * view's block is put back for the passes that follow. `terrain`: the
 * terrain regions the pass stops at and goes through (picks.ts `terrainStops`).
 */
export function encodeDomainPick(
  engine: PickEngine,
  enc: GPUCommandEncoder,
  view: View,
  frame: ViewFrame,
  x: number,
  y: number,
  inTick: boolean,
  terrain: { stops: number; through: number },
): PendingDomain | undefined {
  const world = view.world;
  const bundle = world.pickBundle();
  if (!bundle || !frame.block) {
    return undefined;
  }
  const { device, pipelines } = engine.ctx;
  const resources = pickDomainResources(engine);
  const { width, height } = frame;
  // The window, in NDC: its centre the pixel's, half a window's pixels each way.
  const cx = ((x + 0.5) / width) * 2 - 1;
  const cy = 1 - ((y + 0.5) / height) * 2;
  const hx = PICK_SIZE / width;
  const hy = PICK_SIZE / height;
  const camera = engine.bodyCamera(view);
  const tanY = Math.tan(camera.fovy(width / height) / 2);
  const tanX = tanY * (width / height);
  const planes = new Float32Array(20);
  windowPlanes(planes, camera, tanX, tanY, [
    cx - hx,
    cx + hx,
    cy - hy,
    cy + hy,
  ]);
  const { stops, through } = terrain;
  const block = frame.block.slice();
  writePickBlock(block, planes, [cx, cy, hx, hy], stops, through);
  const disposables: GPUBuffer[] = [];
  const own = (buffer: GPUBuffer) => {
    disposables.push(buffer);
    return buffer;
  };
  const staging = own(
    device.createBuffer({
      label: "pick.domain.block",
      size: block.byteLength,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    }),
  );
  device.queue.writeBuffer(staging, 0, block);
  enc.copyBufferToBuffer(
    staging,
    0,
    engine.ctx.currentViewBuffer,
    0,
    block.byteLength,
  );
  world.encodeCull(enc, undefined, false);
  const pass = enc.beginRenderPass({
    label: "pick.domain",
    colorAttachments: [
      {
        view: resources.ids,
        clearValue: { r: NONE, g: NONE, b: NONE, a: NONE },
        loadOp: "clear",
        storeOp: "store",
      },
      {
        view: resources.values,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: resources.depth,
      depthClearValue: 0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });
  pass.executeBundles([bundle]);
  pass.end();

  // The kernels: the middle pixel, then the hit triangle's corners from the
  // slab that holds its mesh (each slab with meshes is tried).
  const slabs = new Set<number>();
  const batches = world.raster.batchList;
  const owners = new Uint32Array(Math.max(1, batches.length));
  for (const batch of batches) {
    owners[batch.index] = batch.mesh.slab;
    if (!batch.patches && !batch.points) {
      slabs.add(batch.mesh.slab);
    }
  }
  const owned = own(
    device.createBuffer({
      label: "pick.domain.batchSlabs",
      size: owners.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );
  device.queue.writeBuffer(owned, 0, owners);
  const compute = enc.beginComputePass({ label: "pick.domain.read" });
  compute.setPipeline(pipelines.pickGather);
  compute.setBindGroup(0, resources.gather);
  compute.dispatchWorkgroups(1);
  compute.setPipeline(pipelines.pickTriangle);
  for (const id of slabs) {
    const slab = world.slabs.get(id);
    const params = own(
      device.createBuffer({
        label: "pick.domain.slab",
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
    );
    device.queue.writeBuffer(
      params,
      0,
      Uint32Array.of(id, 0, 0, 0, 0, 0, 0, 0),
    );
    compute.setBindGroup(
      0,
      device.createBindGroup({
        label: "pick.domain.triangle",
        layout: pipelines.pickTriangle.getBindGroupLayout(0),
        entries: [
          { binding: 2, resource: { buffer: world.recordBuffer } },
          { binding: 5, resource: { buffer: slab.vertexBuffer } },
          { binding: 6, resource: { buffer: slab.indexBuffer } },
          { binding: 8, resource: { buffer: resources.result } },
          { binding: 9, resource: { buffer: owned } },
          { binding: 10, resource: { buffer: params } },
        ],
      }),
    );
    compute.dispatchWorkgroups(1);
  }
  compute.end();
  const readback =
    resources.readback.pop() ??
    device.createBuffer({
      label: "pick.domain.readback",
      size: RESULT_BYTES,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  enc.copyBufferToBuffer(resources.result, 0, readback, 0, RESULT_BYTES);
  if (inTick) {
    // The passes after this one read the view's own block.
    enc.copyBufferToBuffer(
      engine.raster.viewStaging,
      frame.slot * VIEW_STRIDE,
      engine.ctx.currentViewBuffer,
      0,
      frame.viewBytes,
    );
  }
  return {
    readback,
    disposables,
    stopsTerrain: stops !== 0 || through !== 0,
    world,
  };
}

/**
 * What the pass read, once its readback is mapped: its sample, and the pool
 * and the buffers made for it given back.
 */
export function readDomain(
  engine: PickEngine,
  domain: PendingDomain,
): DomainSample {
  const words = new Uint32Array(domain.readback.getMappedRange().slice(0));
  domain.readback.unmap();
  pickDomainResources(engine).readback.push(domain.readback);
  for (const buffer of domain.disposables) {
    buffer.destroy();
  }
  return readSample(words);
}

/**
 * Whether a sample is a hit on terrain the pass stood in for the CPU on:
 * a hit, on a draw with terrain regions, nearer than what the image holds.
 */
export function standsInForTerrain(
  domain: PendingDomain,
  sample: DomainSample,
  imageDepth: number,
): boolean {
  if (
    !domain.stopsTerrain ||
    sample.draw === NO_DRAW ||
    !(sample.depth > imageDepth)
  ) {
    return false;
  }
  const { recordsU32 } = domain.world.raster;
  return recordsU32[sample.draw * RECORD_WORDS + TERRAIN_CLIP_WORD]! !== 0;
}
