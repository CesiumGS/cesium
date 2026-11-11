// A world's b-rep patch draws (provisional, CESIUM2_WEBGPU_PLAN.md §13.33,
// "Step 5 redirected", part 1): a patch mesh puts a b-rep's span records and
// control points (src/brep/gpuPatches.ts) in a slab's arena, and a draw of it
// owns the per-view dice's parameters and chunk list. The dice and the vertex
// stage are shaders/dice.slang and surface.slang `patchVertex`.
import type { GpuPatchData } from "../../brep/gpuPatches.ts";
import {
  NO_STREAM,
  PATCH_CHUNK_CELLS,
  PATCH_ISO_SHIFT,
  RecordFlags,
} from "../../render/layout.ts";
import { CapacityError } from "../CapacityError.ts";
import { weightInterval } from "../warpBounds.ts";
import { termCurvatureBound, termDerivativeBound } from "../warpEvaluate.ts";
import type { World } from "../World.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";
import type { DrawPlacement, PatchDraw, PatchMesh } from "./types.ts";
import { queueUpload } from "./uploads.ts";

/** `PatchDice` (shaders/dice.slang): 8 words. */
export const PATCH_DICE_BYTES = 32;
/** A chunk: a record, a span, its cells' origin and counts, a spare word. */
export const CHUNK_BYTES = 16;
/** What a draw's dice counts (shaders/dice.slang `stats`): 4 words. */
export const PATCH_STATS_BYTES = 16;
/** The target error a cell may leave, pixels: half a pixel. */
export const DEFAULT_ERROR_PIXELS = 0.5;
/** Chunks of 4 × 4 cells a draw lists per view, at most (a million cells). */
export const DEFAULT_MAX_CHUNKS = 65536;

/** Scene side: a patch mesh's geometry into the world's slabs. */
export interface PatchMeshWorld extends Pick<World, "ctx" | "slabs"> {
  readonly raster: Pick<
    WorldRaster,
    "pendingUploads" | "uploadChunks" | "uploadsPending"
  >;
  readonly scene: Pick<WorldScene, "meshRanges" | "nextMeshId">;
}

/** Rasterizer side: a patch draw's buffers and group. */
export interface PatchDrawWorld extends Pick<World, "ctx" | "slabs"> {
  readonly raster: Pick<WorldRaster, "patchDraws">;
}

export interface PatchMeshOptions {
  /** The target error, pixels, draws of it start with (default half a pixel). */
  readonly errorPixels?: number;
  /** The most chunks of 4 × 4 cells a draw lists per view (default 65,536). */
  readonly maxChunks?: number;
}

/**
 * The packed patches (`packGpuPatches`) as a mesh: one range of the arena.
 * `faces` is the form's face count: the draw's local feature IDs.
 */
export function addPatchMesh(
  world: PatchMeshWorld,
  data: GpuPatchData,
  faces: number,
  options: PatchMeshOptions = {},
): PatchMesh {
  const errorPixels = options.errorPixels ?? DEFAULT_ERROR_PIXELS;
  const maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS;
  if (!(errorPixels > 0 && Number.isFinite(errorPixels))) {
    throw new RangeError(
      `addPatchMesh: errorPixels is ${errorPixels}; it is a positive number of pixels.`,
    );
  }
  if (!Number.isInteger(maxChunks) || maxChunks < 1) {
    throw new RangeError(
      `addPatchMesh: maxChunks is ${maxChunks}; it is a positive integer.`,
    );
  }
  if (data.spanCount === 0) {
    throw new RangeError("addPatchMesh: no spans.");
  }
  const bytes = data.words.byteLength;
  const slab = world.slabs.pick(bytes, 0);
  const offset = slab && world.slabs.allocateVertex(slab, bytes);
  if (!slab || offset === undefined) {
    throw new CapacityError(
      "vertex arena",
      `patches of ${bytes.toLocaleString("en-US")} bytes: ${world.slabs.refusal(bytes, 0) ?? "no slab has a range that size free"}`,
    );
  }
  queueUpload(world, slab.vertexBuffer, offset, data.words);
  const id = world.scene.nextMeshId++;
  world.scene.meshRanges.set(id, {
    slab: slab.id,
    vertex: [[offset, bytes]],
    index: [0, 0],
  });
  const [x, y, z, radius] = data.sphere;
  return {
    id,
    slab: slab.id,
    firstIndex: 0,
    // Non-zero so the cull draws it (cullTables `drawable`).
    indexCount: data.spanCount,
    vertexCount: 0,
    streams: {
      position: offset / 4,
      normal: NO_STREAM,
      uv: NO_STREAM,
      color: NO_STREAM,
      tangent: NO_STREAM,
      featureId: NO_STREAM,
      attributes: NO_STREAM,
    },
    featureCount: Math.max(1, faces),
    topology: "triangle-list",
    center: [x, y, z],
    radius,
    patches: {
      table: offset / 4,
      spans: data.spanCount,
      errorPixels,
      maxChunks,
      trimmed: data.trimmed,
    },
  };
}

/** A patch draw's dice group 2: its parameters, its slab's arena, its chunks and its counts. */
export function patchGroup(
  world: PatchDrawWorld,
  draw: PatchDraw,
): GPUBindGroup {
  return world.ctx.device.createBindGroup({
    label: "world.patchDice",
    layout: world.ctx.pipelines.patchDiceLayout,
    entries: [
      draw.params,
      world.slabs.get(draw.mesh.slab).vertexBuffer,
      draw.chunks,
      draw.stats,
    ].map((buffer, binding) => ({ binding, resource: { buffer } })),
  });
}

/** A patch draw's buffers and group, for the record `record` in `batch`. */
export function createPatchDraw(
  world: PatchDrawWorld,
  mesh: PatchMesh,
  batch: PatchDraw["batch"],
  record: number,
): PatchDraw {
  const { device } = world.ctx;
  const capacity = mesh.patches.maxChunks;
  const draw: PatchDraw = {
    mesh,
    batch,
    params: device.createBuffer({
      label: "world.patchDice.params",
      size: PATCH_DICE_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    chunks: device.createBuffer({
      label: "world.patchDice.chunks",
      size: capacity * CHUNK_BYTES,
      // COPY_SRC: checks read the chunks the dice listed.
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.VERTEX |
        GPUBufferUsage.COPY_SRC,
    }),
    stats: device.createBuffer({
      label: "world.patchDice.stats",
      size: PATCH_STATS_BYTES,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    }),
    diced: false,
    capacity,
    group: undefined as never,
    errorPixels: mesh.patches.errorPixels,
    jacobian: 1,
    curvature: 0,
  };
  draw.group = patchGroup(world, draw);
  world.raster.patchDraws.set(record, draw);
  writePatchParams(world, draw, record);
  return draw;
}

/** A patch draw's `PatchDice` parameters. */
export function writePatchParams(
  world: Pick<World, "ctx">,
  draw: PatchDraw,
  record: number,
): void {
  const data = new Uint32Array(PATCH_DICE_BYTES / 4);
  const f32 = new Float32Array(data.buffer);
  data[0] = record;
  data[1] = draw.batch.index;
  data[2] = draw.mesh.patches.spans;
  data[3] = draw.capacity;
  f32[4] = draw.errorPixels;
  f32[5] = draw.jacobian;
  f32[6] = draw.curvature;
  world.ctx.device.queue.writeBuffer(draw.params, 0, data);
}

/** Frees a patch draw's buffers. */
export function releasePatchDraw(draw: PatchDraw): void {
  draw.params.destroy();
  draw.chunks.destroy();
  draw.stats.destroy();
}

/** What a view's dice made of one patch draw (`World.readPatchStats`). */
export interface PatchDrawStats {
  /** The draw's record (`DrawHandle.index`). */
  readonly record: number;
  /**
   * Whether the counts are a view's: false while no frame has been encoded
   * since the draw was added (the counts are zero then, not measured), or
   * when no view shows it.
   */
  readonly diced: boolean;
  /** The draw's spans, and those the dice kept in the view. */
  readonly spans: number;
  readonly spansDiced: number;
  /** Cells diced, and the chunks they need and the draw lists (fewer when the list's capacity binds). */
  readonly cells: number;
  readonly chunksAsked: number;
  readonly chunks: number;
  /** Triangles drawn: two a cell. */
  readonly triangles: number;
  /** Vertex-stage invocations: (n + 1)² a chunk, n the chunk's side in cells. */
  readonly vertices: number;
  /** Vertex invocations per cell: 1.56 at the least, for a span of whole chunks. */
  readonly verticesPerCell: number;
}

/**
 * The last view's dice counts for every patch draw, read back (the buffers
 * the dice kernel wrote, copied after the frames submitted so far). For
 * measurements, not frames: it submits a copy and waits for the map.
 */
export async function readPatchStats(
  world: PatchDrawWorld,
): Promise<PatchDrawStats[]> {
  const { device } = world.ctx;
  const draws = [...world.raster.patchDraws.entries()];
  if (draws.length === 0) {
    return [];
  }
  const readback = device.createBuffer({
    label: "world.patchDice.readback",
    size: draws.length * PATCH_STATS_BYTES,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder({ label: "patchStats" });
  // What the buffers hold is what the frames encoded so far made of them.
  const diced = draws.map(([, draw]) => draw.diced);
  draws.forEach(([, draw], i) => {
    encoder.copyBufferToBuffer(
      draw.stats,
      0,
      readback,
      i * PATCH_STATS_BYTES,
      PATCH_STATS_BYTES,
    );
  });
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const words = new Uint32Array(readback.getMappedRange().slice(0));
  readback.destroy();
  const side = PATCH_CHUNK_CELLS + 1;
  return draws.map(([record, draw], i) => {
    const cells = words[i * 4 + 1]!;
    const chunks = words[i * 4 + 3]!;
    const vertices = chunks * side * side;
    return {
      record,
      diced: diced[i]!,
      spans: draw.mesh.patches.spans,
      spansDiced: words[i * 4]!,
      cells,
      chunksAsked: words[i * 4 + 2]!,
      chunks,
      triangles: 2 * cells,
      vertices,
      verticesPerCell: cells > 0 ? vertices / cells : 0,
    };
  });
}

/**
 * What a placement adds to a patch's error, as bounds over the whole draw:
 * `jacobian`, the norm of the placement's Jacobian (1 plus each term's
 * largest weight times its derivative's bound), which scales the error the
 * surface leaves, and `curvature`, the placement's second derivative's
 * bound, which adds `curvature · speed² / 8` to each constant (dice.slang).
 * Weights take the largest value their parameters' ranges allow. Without a
 * placement: 1 and 0.
 */
export function placementBounds(
  placed: Pick<DrawPlacement, "terms" | "center" | "base"> | undefined,
): { jacobian: number; curvature: number } {
  let jacobian = 1;
  let curvature = 0;
  for (const { term, weight } of placed?.terms ?? []) {
    const [lo, hi] = weightInterval(weight);
    const w = Math.max(Math.abs(lo), Math.abs(hi));
    // How far the draw's points are from the lattice's centre, in its units.
    const reach =
      term.kind === "cubic"
        ? (Math.hypot(
            placed!.center[0] - term.center[0]!,
            placed!.center[1] - term.center[1]!,
            placed!.center[2] - term.center[2]!,
          ) +
            placed!.base) /
          term.scale
        : 1;
    const d = termDerivativeBound(term, reach);
    const c = termCurvatureBound(term, reach);
    // An attribute has no derivative to bound: the cell cap takes over.
    jacobian += w * (Number.isNaN(d) ? 1e6 : d);
    curvature += w * (Number.isNaN(c) ? 1e6 : c);
  }
  return { jacobian, curvature };
}

/** What a patch draw shows of its tessellation (`World.setPatchDisplay`). */
export interface PatchDisplay {
  /** The dice grid's cell edges and triangle diagonals, drawn in the fragment stage at a constant width on screen: they change with the view's dice. */
  readonly wire?: boolean;
  /** Iso lines in (u, v): this many divisions of each face's parameter rect (true: 8). */
  readonly iso?: boolean | number;
  /** Each triangle shaded by its own normal. */
  readonly flat?: boolean;
  /** Only the lines are drawn (in every pass: nothing else of the faces hides or shades what is behind them). */
  readonly linesOnly?: boolean;
}

const DISPLAY_MASK =
  RecordFlags.patchWire |
  RecordFlags.patchIso |
  RecordFlags.patchFlat |
  RecordFlags.patchLinesOnly |
  (255 << PATCH_ISO_SHIFT);

/** A draw's record flags with `display` in place of its display bits. */
export function withPatchDisplay(flags: number, display: PatchDisplay): number {
  const divisions =
    display.iso === true
      ? 8
      : display.iso === false || display.iso === undefined
        ? 0
        : Math.floor(display.iso);
  if (!(divisions >= 0 && divisions <= 255)) {
    throw new RangeError(
      `setPatchDisplay: ${String(display.iso)} iso divisions; 2 to 255 (or a boolean).`,
    );
  }
  return (
    ((flags & ~DISPLAY_MASK) |
      (display.wire ? RecordFlags.patchWire : 0) |
      (divisions > 1
        ? RecordFlags.patchIso | (divisions << PATCH_ISO_SHIFT)
        : 0) |
      (display.flat ? RecordFlags.patchFlat : 0) |
      (display.linesOnly ? RecordFlags.patchLinesOnly : 0)) >>>
    0
  );
}

/** Sets a patch draw's target error, pixels. */
export function setPatchErrorPixels(
  world: PatchDrawWorld,
  record: number,
  errorPixels: number,
): void {
  const draw = world.raster.patchDraws.get(record);
  if (!draw) {
    throw new Error("setPatchErrorPixels: not a patch draw");
  }
  if (!(errorPixels > 0 && Number.isFinite(errorPixels))) {
    throw new RangeError(
      `setPatchErrorPixels: ${errorPixels} is not a positive number of pixels.`,
    );
  }
  draw.errorPixels = errorPixels;
  writePatchParams(world, draw, record);
}

/** A patch draw's placement changed: its bounds follow. */
export function updatePatchPlacement(
  world: Pick<World, "ctx"> & {
    readonly raster: Pick<WorldRaster, "patchDraws">;
  },
  record: number,
  placed: Pick<DrawPlacement, "terms" | "center" | "base"> | undefined,
): void {
  const draw = world.raster.patchDraws.get(record);
  if (!draw) {
    return;
  }
  Object.assign(draw, placementBounds(placed));
  writePatchParams(world, draw, record);
}
