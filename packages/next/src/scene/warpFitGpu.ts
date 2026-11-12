// Fitting warps on the GPU (plan 13.26: warps fast enough to animate at 60
// fps). The host side of shaders/warpFitGpu.slang: a batch of tiles whose
// lattices (scene/placementTable.ts, a block's body of rows) are refit in
// place, in the world's placements buffer, by one compute dispatch, from a
// closed-form warp (`GpuWarpForm`, scene/warpForms.ts). The kernel does what
// `fitLatticeAt` does on the CPU, cell for cell, at the same samples and with
// the same solve, and the CPU fit is its reference and fallback. Nothing is
// read back to draw: the vertex and cull stages read the rows the next frame.
// `check` adds a residual estimate per tile (the CPU fit's 9³ check points)
// and `readErrors` brings it back, a frame or two late, for adaptivity.
//
// Limits: the draws are translation-only (the model origin's position in
// the form's frame is the one float64 triple the draw has), a lattice carries
// no clip field (the kernel writes 0 in each row's w), and a form is a
// closed form from `scene/warpForms.ts`.
import warpFitWgsl from "../shaders/generated/warpFitGpu.wgsl?raw";
import {
  FORM_KINDS,
  FORM_SLOTS,
  formWords,
  splitDf64,
  type GpuWarpForm,
} from "./warpForms.ts";
import { PLACEMENT_TERMS } from "./placement.ts";
import { fitSolveOperator } from "./warpFit.ts";

/** Rows of a lattice body before its cells (scene/placementTable.ts `LATTICE_HEAD_ROWS`). */
const HEAD_ROWS = 3;
const FIT_POINTS = 125;
/** Groups a dispatch row holds (the kernel's `GROUP_ROW`). */
const GROUP_ROW = 65535;
const JOB_BYTES = 64;
const PARAMS_BYTES = 16 + 16 * FORM_SLOTS;

/** One lattice to fit. */
export interface GpuFitTile {
  /** The lattice's center in model space (as its head row holds it). */
  readonly center: ArrayLike<number>;
  /** Its radius, model units (> 0). */
  readonly scale: number;
  /** Cells per axis: 1, 2, 4 or 8 (`LATTICE_CELLS`). */
  readonly cells: number;
  /** The row of the lattice body in the placements buffer (`LATTICE_HEAD_ROWS` rows, then cells³ × 20). */
  readonly bodyRow: number;
  /** The model origin's position in the form's frame, float64: a translation-only draw. */
  readonly origin: ArrayLike<number>;
}

/** Tiles prepared for fitting: their jobs and cells on the GPU. Rebuild it when the set or its cells change. */
export class GpuFitBatch {
  readonly #groups = new WeakMap<GPUBuffer, GPUBindGroup>();
  /** @internal */
  constructor(
    readonly tiles: readonly GpuFitTile[],
    readonly cellCount: number,
    readonly jobs: GPUBuffer,
    readonly cellList: GPUBuffer,
    readonly params: GPUBuffer,
    readonly errors: GPUBuffer,
  ) {}

  /** @internal */
  group(target: GPUBuffer, make: () => GPUBindGroup): GPUBindGroup {
    let group = this.#groups.get(target);
    if (!group) {
      group = make();
      this.#groups.set(target, group);
    }
    return group;
  }

  destroy(): void {
    this.jobs.destroy();
    this.cellList.destroy();
    this.params.destroy();
    this.errors.destroy();
  }
}

export interface GpuFitOptions {
  /** Also measure each tile's residual (`GpuWarpFitter.readErrors`). */
  readonly check?: boolean;
  /** Timestamps around the passes (`timestamp-query`). */
  readonly timestampWrites?: GPUComputePassTimestampWrites;
}

export class GpuWarpFitter {
  readonly #device: GPUDevice;
  readonly #layout: GPUBindGroupLayout;
  readonly #solve: GPUBuffer;
  readonly #fit: GPUComputePipeline;
  readonly #check: GPUComputePipeline;
  readonly #direct: GPUComputePipeline;
  readonly #scratch = new Float32Array(PARAMS_BYTES / 4);
  readonly #spare: GPUBuffer[];

  private constructor(
    device: GPUDevice,
    fit: GPUComputePipeline,
    check: GPUComputePipeline,
    direct: GPUComputePipeline,
    layout: GPUBindGroupLayout,
  ) {
    this.#device = device;
    this.#fit = fit;
    this.#check = check;
    this.#direct = direct;
    this.#layout = layout;
    const operator = fitSolveOperator();
    const solve = new Float32Array(operator.length * 2);
    operator.forEach((w, i) => {
      const [hi, lo] = splitDf64(w);
      solve[2 * i] = hi;
      solve[2 * i + 1] = lo;
    });
    this.#solve = device.createBuffer({
      label: "warpFit.solve",
      size: solve.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.#solve, 0, solve);
    // Bindings a kernel doesn't use still need buffers, distinct from the used ones.
    this.#spare = [0, 1, 2].map((i) =>
      device.createBuffer({
        label: `warpFit.spare${i}`,
        size: 16,
        usage: GPUBufferUsage.STORAGE,
      }),
    );
  }

  /** Compiles the kernels; rejects where WGSL or the device refuses them. */
  static async create(device: GPUDevice): Promise<GpuWarpFitter> {
    const module = device.createShaderModule({
      label: "warpFitGpu",
      code: warpFitWgsl,
    });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length > 0) {
      throw new Error(
        `warpFitGpu: ${errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join("; ")}`,
      );
    }
    const entry = (
      binding: number,
      type: GPUBufferBindingType,
    ): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    const layout = device.createBindGroupLayout({
      label: "warpFit.layout",
      entries: [
        entry(0, "uniform"),
        entry(1, "read-only-storage"),
        entry(2, "read-only-storage"),
        entry(3, "read-only-storage"),
        entry(4, "storage"),
        entry(5, "storage"),
        entry(6, "read-only-storage"),
        entry(7, "storage"),
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [layout],
    });
    const make = (entryPoint: string) =>
      device.createComputePipelineAsync({
        label: `warpFit.${entryPoint}`,
        layout: pipelineLayout,
        compute: { module, entryPoint },
      });
    const [fit, check, direct] = await Promise.all([
      make("fitCells"),
      make("checkCells"),
      make("evalDirect"),
    ]);
    return new GpuWarpFitter(device, fit, check, direct, layout);
  }

  /** Writes each tile's lattice head (center, 1 / scale) at its body row: what the placements table does for a block it allocates. */
  writeHeads(target: GPUBuffer, tiles: readonly GpuFitTile[]): void {
    const head = new Float32Array(4);
    for (const t of tiles) {
      head[0] = t.center[0]!;
      head[1] = t.center[1]!;
      head[2] = t.center[2]!;
      head[3] = 1 / t.scale;
      this.#device.queue.writeBuffer(target, t.bodyRow * 16, head);
    }
  }

  /** Prepares `tiles` (at most 65535) for `encodeFit`. */
  batch(tiles: readonly GpuFitTile[]): GpuFitBatch {
    if (tiles.length === 0 || tiles.length > GROUP_ROW) {
      throw new RangeError(
        `GpuWarpFitter.batch: ${tiles.length} tiles; it takes 1 to ${GROUP_ROW}`,
      );
    }
    const jobs = new ArrayBuffer(tiles.length * JOB_BYTES);
    const f32 = new Float32Array(jobs);
    const u32 = new Uint32Array(jobs);
    const cellList: number[] = [];
    tiles.forEach((t, i) => {
      if (![1, 2, 4, 8].includes(t.cells)) {
        throw new RangeError(`GpuWarpFitter.batch: cells is ${t.cells}`);
      }
      const at = (i * JOB_BYTES) / 4;
      for (let a = 0; a < 3; a++) {
        f32[at + a] = t.center[a]!;
        const [hi, lo] = splitDf64(t.origin[a]!);
        f32[at + 4 + a] = hi;
        f32[at + 8 + a] = lo;
      }
      f32[at + 3] = t.scale;
      u32[at + 12] = t.bodyRow;
      u32[at + 13] = t.cells;
      u32[at + 14] = i;
      for (let c = 0; c < t.cells ** 3; c++) {
        cellList.push(i, c);
      }
    });
    const device = this.#device;
    const jobBuffer = device.createBuffer({
      label: "warpFit.jobs",
      size: jobs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(jobBuffer, 0, jobs);
    const cellBuffer = device.createBuffer({
      label: "warpFit.cells",
      size: cellList.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cellBuffer, 0, new Uint32Array(cellList));
    const params = device.createBuffer({
      label: "warpFit.params",
      size: PARAMS_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const errors = device.createBuffer({
      label: "warpFit.errors",
      size: Math.max(16, tiles.length * 4),
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    return new GpuFitBatch(
      tiles,
      cellList.length / 2,
      jobBuffer,
      cellBuffer,
      params,
      errors,
    );
  }

  #writeParams(batch: GpuFitBatch, form: GpuWarpForm, count: number): void {
    const words = this.#scratch;
    const u32 = new Uint32Array(words.buffer);
    u32[0] = FORM_KINDS[form.kind];
    u32[1] = count;
    u32[2] = 0;
    u32[3] = 0;
    formWords(form, words.subarray(4));
    this.#device.queue.writeBuffer(batch.params, 0, words);
  }

  #bind(
    batch: GpuFitBatch,
    target: GPUBuffer,
    points: GPUBuffer,
    evaluated: GPUBuffer,
  ): GPUBindGroup {
    const buffer = (b: GPUBuffer): GPUBindingResource => ({ buffer: b });
    return this.#device.createBindGroup({
      layout: this.#layout,
      entries: [
        { binding: 0, resource: buffer(batch.params) },
        { binding: 1, resource: buffer(this.#solve) },
        { binding: 2, resource: buffer(batch.jobs) },
        { binding: 3, resource: buffer(batch.cellList) },
        { binding: 4, resource: buffer(target) },
        { binding: 5, resource: buffer(batch.errors) },
        { binding: 6, resource: buffer(points) },
        { binding: 7, resource: buffer(evaluated) },
      ],
    });
  }

  /**
   * Refits the batch's lattices to `form`, in `target` (the placements
   * buffer), in `encoder`: one dispatch of a workgroup per cell, then, with
   * `check`, a second measuring each tile's worst residual. The queue's
   * order puts it before the frame that reads the rows.
   */
  encodeFit(
    encoder: GPUCommandEncoder,
    batch: GpuFitBatch,
    target: GPUBuffer,
    form: GpuWarpForm,
    options: GpuFitOptions = {},
  ): void {
    this.#writeParams(batch, form, batch.cellCount);
    const group = batch.group(target, () =>
      this.#bind(batch, target, this.#spare[0]!, this.#spare[1]!),
    );
    const x = Math.min(batch.cellCount, GROUP_ROW);
    const y = Math.ceil(batch.cellCount / GROUP_ROW);
    const pass = encoder.beginComputePass({
      label: "warpFit.fit",
      ...(options.timestampWrites && {
        timestampWrites: options.timestampWrites,
      }),
    });
    pass.setBindGroup(0, group);
    pass.setPipeline(this.#fit);
    pass.dispatchWorkgroups(x, y);
    if (options.check) {
      pass.end();
      encoder.clearBuffer(batch.errors);
      const checking = encoder.beginComputePass({ label: "warpFit.check" });
      checking.setBindGroup(0, group);
      checking.setPipeline(this.#check);
      checking.dispatchWorkgroups(x, y);
      checking.end();
      return;
    }
    pass.end();
  }

  /**
   * Evaluates `form` at `count` points (float4 each, model space, of the
   * batch's first tile's draw) into `evaluated`, with no fit: what drawing a
   * closed-form warp straight in a vertex stage costs per vertex.
   */
  encodeDirect(
    encoder: GPUCommandEncoder,
    batch: GpuFitBatch,
    form: GpuWarpForm,
    points: GPUBuffer,
    evaluated: GPUBuffer,
    count: number,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void {
    this.#writeParams(batch, form, count);
    const group = this.#bind(batch, this.#spare[2]!, points, evaluated);
    const pass = encoder.beginComputePass({
      label: "warpFit.direct",
      ...(timestampWrites && { timestampWrites }),
    });
    pass.setPipeline(this.#direct);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
  }

  /** The worst residual of each tile's lattice at the last checked fit, m (async, a frame or two late). */
  async readErrors(batch: GpuFitBatch): Promise<Float32Array> {
    const bytes = batch.tiles.length * 4;
    const read = this.#device.createBuffer({
      label: "warpFit.errors.read",
      size: bytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = this.#device.createCommandEncoder();
    encoder.copyBufferToBuffer(batch.errors, 0, read, 0, bytes);
    this.#device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(read.getMappedRange().slice(0));
    read.unmap();
    read.destroy();
    return out;
  }

  destroy(): void {
    this.#solve.destroy();
    this.#spare.forEach((b) => b.destroy());
  }
}

/** Rows of a lattice body of `cells` per axis (`latticeRows`). */
export function gpuLatticeRows(cells: number): number {
  return HEAD_ROWS + cells ** 3 * PLACEMENT_TERMS;
}

/** The solve operator's size, for the spike's report. */
export const GPU_FIT_POINTS = FIT_POINTS;
