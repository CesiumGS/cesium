import type { CpuTable } from "./CpuTable.ts";
import type { RenderContext } from "./RenderContext.ts";

/**
 * A CPU table's copy in a GPU storage buffer (`CpuTable`). Changed entries
 * upload once per frame, draining the table's change log: a contiguous run
 * with one write, entries spread across the table as packed (index, data)
 * pairs that a compute pass scatters (`scatter.slang`), instead of the whole
 * span between them. The GPU buffer holds `gpuRows`, the full capacity
 * unless given fewer, and grows by `growGpu`.
 */
export class MirroredTable {
  buffer: GPUBuffer;
  gpuRows: number;
  private readonly params: GPUBuffer;
  private readonly paramsData = new Uint32Array(4);
  private staging?: GPUBuffer;
  private scratch = new Uint32Array(0);
  private bindGroup?: GPUBindGroup;

  constructor(
    private readonly ctx: RenderContext,
    private readonly label: string,
    /** The CPU rows it mirrors. */
    readonly table: CpuTable,
    gpuRows = table.capacity,
  ) {
    this.gpuRows = gpuRows;
    this.buffer = this.createBuffer(gpuRows);
    this.params = ctx.device.createBuffer({
      label: `world.${label}.scatter`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.paramsData[1] = table.words;
  }

  /** The table's words as floats (`CpuTable.f32`). */
  get f32(): Float32Array {
    return this.table.f32;
  }

  /** The table's words as unsigned integers (`CpuTable.u32`). */
  get u32(): Uint32Array {
    return this.table.u32;
  }

  get words(): number {
    return this.table.words;
  }

  get capacity(): number {
    return this.table.capacity;
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

  /** Rows on the CPU (`CpuTable.rows`). */
  get rows(): number {
    return this.table.rows;
  }

  /** `CpuTable.reserve`. */
  reserve(count: number): boolean {
    return this.table.reserve(count);
  }

  /** `CpuTable.mark`. */
  mark(index: number): void {
    this.table.mark(index);
  }

  /** Uploads the changes; a scatter is encoded into `pass`. */
  upload(pass: GPUComputePassEncoder): void {
    const dirty = this.table.changed;
    const n = dirty.length;
    if (n === 0) {
      return;
    }
    const queue = this.ctx.device.queue;
    const bytes = this.words * 4;
    let min = Number.POSITIVE_INFINITY;
    let max = -1;
    for (const i of dirty) {
      min = Math.min(min, i);
      max = Math.max(max, i);
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
      this.table.drained();
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
      const i = dirty[k]!;
      out[k] = i;
      out.set(
        this.u32.subarray(i * this.words, (i + 1) * this.words),
        n + k * this.words,
      );
    }
    this.table.drained();
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
