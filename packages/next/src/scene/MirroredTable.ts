import type { RenderContext } from "./RenderContext.ts";

/** CPU rows a growable table starts with (fewer when its capacity is). */
export const INITIAL_ROWS = 1024;

/** Rows after growing from `rows` to hold `count`: doubling, capped. */
export function grownSize(
  rows: number,
  count: number,
  capacity: number,
): number {
  return Math.min(capacity, Math.max(count, rows * 2));
}

/** A copy of `array` with `length` elements, the new ones `fill`. */
export function resized<
  T extends Uint8Array | Uint32Array | Int32Array | Float64Array,
>(array: T, length: number, fill = 0): T {
  const out = new (array.constructor as new (length: number) => T)(length);
  out.set(array);
  if (fill !== 0) {
    out.fill(fill, array.length);
  }
  return out;
}

/**
 * A CPU table mirrored to a GPU storage buffer. Changed entries upload once
 * per frame: a contiguous run with one write, entries spread across the
 * table as packed (index, data) pairs that a compute pass scatters
 * (`scatter.slang`), instead of the whole span between them. The CPU rows
 * grow as entries are used (`reserve`); the GPU buffer holds `gpuRows`,
 * the full capacity unless given fewer, and grows by `growGpu`.
 */
export class MirroredTable {
  f32: Float32Array;
  u32: Uint32Array;
  buffer: GPUBuffer;
  gpuRows: number;
  private flags: Uint8Array;
  private readonly dirty: number[] = [];
  private readonly params: GPUBuffer;
  private readonly paramsData = new Uint32Array(4);
  private staging?: GPUBuffer;
  private scratch = new Uint32Array(0);
  private bindGroup?: GPUBindGroup;

  constructor(
    private readonly ctx: RenderContext,
    private readonly label: string,
    readonly words: number,
    readonly capacity: number,
    gpuRows = capacity,
  ) {
    const rows = Math.min(capacity, INITIAL_ROWS);
    const data = new ArrayBuffer(rows * words * 4);
    this.f32 = new Float32Array(data);
    this.u32 = new Uint32Array(data);
    this.flags = new Uint8Array(rows);
    this.gpuRows = gpuRows;
    this.buffer = this.createBuffer(gpuRows);
    this.params = ctx.device.createBuffer({
      label: `world.${label}.scatter`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.paramsData[1] = words;
  }

  private createBuffer(rows: number): GPUBuffer {
    return this.ctx.device.createBuffer({
      label: `world.${this.label}`,
      size: Math.max(1, rows) * this.words * 4,
      // COPY_SRC: tests compare the GPU copy with the CPU table, and the
      // table copies itself when it grows.
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
  }

  /** A larger GPU buffer holding the old one's rows (queued after its writes). */
  growGpu(rows: number): void {
    const old = this.buffer;
    this.buffer = this.createBuffer(rows);
    this.gpuRows = rows;
    const { device } = this.ctx;
    const encoder = device.createCommandEncoder({ label: "world.grow" });
    encoder.copyBufferToBuffer(old, 0, this.buffer, 0, old.size);
    device.queue.submit([encoder.finish()]);
    old.destroy();
    // The scatter's group binds the table.
    this.bindGroup = undefined;
  }

  /** Rows on the CPU. */
  get rows(): number {
    return this.flags.length;
  }

  /**
   * Room for rows below `count` on the CPU (doubling, up to the capacity);
   * true when `f32` and `u32` were replaced.
   */
  reserve(count: number): boolean {
    if (count <= this.rows) {
      return false;
    }
    const rows = grownSize(this.rows, count, this.capacity);
    const data = new ArrayBuffer(rows * this.words * 4);
    new Uint32Array(data).set(this.u32);
    this.f32 = new Float32Array(data);
    this.u32 = new Uint32Array(data);
    this.flags = resized(this.flags, rows);
    return true;
  }

  mark(index: number): void {
    if (this.flags[index] === 0) {
      this.flags[index] = 1;
      this.dirty.push(index);
    }
  }

  /** Uploads the changes; a scatter is encoded into `pass`. */
  upload(pass: GPUComputePassEncoder): void {
    const n = this.dirty.length;
    if (n === 0) {
      return;
    }
    const queue = this.ctx.device.queue;
    const bytes = this.words * 4;
    let min = Number.POSITIVE_INFINITY;
    let max = -1;
    for (const i of this.dirty) {
      min = Math.min(min, i);
      max = Math.max(max, i);
      this.flags[i] = 0;
    }
    const span = max - min + 1;
    if (span <= 2 * n + 16) {
      queue.writeBuffer(
        this.buffer,
        min * bytes,
        this.f32.buffer,
        min * bytes,
        span * bytes,
      );
      this.dirty.length = 0;
      return;
    }
    const total = n * (1 + this.words);
    if (this.scratch.length < total) {
      const size = 1 << Math.ceil(Math.log2(total));
      this.scratch = new Uint32Array(size);
      this.staging?.destroy();
      this.staging = this.ctx.device.createBuffer({
        label: "world.scatter.staging",
        size: size * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.bindGroup = undefined;
    }
    if (!this.bindGroup) {
      this.bindGroup = this.ctx.device.createBindGroup({
        label: "world.scatter",
        layout: this.ctx.pipelines.scatterLayout,
        entries: [
          { binding: 0, resource: { buffer: this.params } },
          { binding: 1, resource: { buffer: this.staging! } },
          { binding: 2, resource: { buffer: this.buffer } },
        ],
      });
    }
    const out = this.scratch;
    for (let k = 0; k < n; k++) {
      const i = this.dirty[k]!;
      out[k] = i;
      out.set(
        this.u32.subarray(i * this.words, (i + 1) * this.words),
        n + k * this.words,
      );
    }
    this.dirty.length = 0;
    queue.writeBuffer(this.staging!, 0, out.buffer, 0, total * 4);
    this.paramsData[0] = n;
    queue.writeBuffer(this.params, 0, this.paramsData);
    pass.setPipeline(this.ctx.pipelines.scatter);
    pass.setBindGroup(0, this.bindGroup!);
    pass.dispatchWorkgroups(Math.ceil((n * this.words) / 64));
  }

  destroy(): void {
    this.buffer.destroy();
    this.params.destroy();
    this.staging?.destroy();
  }
}
