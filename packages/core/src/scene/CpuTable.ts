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
 * A table of fixed-size rows of 32-bit words on the CPU, renderer-neutral,
 * with a change log: the rows changed since a device last drained it
 * (`mark`, `changed`, `drained`). The rows grow as entries are used
 * (`reserve`, doubling up to the capacity). A device's copy (a WebGPU
 * `MirroredTable`) reads the changed rows and drains the log once a tick.
 */
export class CpuTable {
  f32: Float32Array;
  u32: Uint32Array;
  private flags: Uint8Array;
  private readonly dirty: number[] = [];

  constructor(
    readonly words: number,
    readonly capacity: number,
  ) {
    const rows = Math.min(capacity, INITIAL_ROWS);
    const data = new ArrayBuffer(rows * words * 4);
    this.f32 = new Float32Array(data);
    this.u32 = new Uint32Array(data);
    this.flags = new Uint8Array(rows);
  }

  /** Rows on the CPU. */
  get rows(): number {
    return this.flags.length;
  }

  /**
   * Room for rows below `count` (doubling, up to the capacity); true when
   * `f32` and `u32` were replaced.
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

  /** Logs a row as changed (once until the log is drained). */
  mark(index: number): void {
    if (this.flags[index] === 0) {
      this.flags[index] = 1;
      this.dirty.push(index);
    }
  }

  /** The rows changed since the log was last drained, in the order marked. */
  get changed(): readonly number[] {
    return this.dirty;
  }

  /** The changed rows were copied: the log starts empty again. */
  drained(): void {
    for (const i of this.dirty) {
      this.flags[i] = 0;
    }
    this.dirty.length = 0;
  }
}
