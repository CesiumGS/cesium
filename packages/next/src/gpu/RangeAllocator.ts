/**
 * Sub-allocates ranges of a fixed-size space (a geometry arena buffer).
 * First-fit over a sorted free list with coalescing on free. Good enough for
 * M0; a TLSF allocator replaces it when streaming churn is measurable.
 */
export class RangeAllocator {
  /** Sorted, non-overlapping, non-adjacent free ranges as [offset, size]. */
  private free: Array<[number, number]>;
  private _used = 0;

  constructor(
    public capacity: number,
    private readonly alignment = 4,
  ) {
    this.free = [[0, capacity]];
  }

  /**
   * Extends the space to `capacity` (its buffer grew, scene/Slabs.ts): the
   * new tail is free, joined to a free range ending at the old end.
   */
  grow(capacity: number): void {
    if (capacity <= this.capacity) {
      return;
    }
    const last = this.free.at(-1);
    if (last && last[0] + last[1] === this.capacity) {
      last[1] += capacity - this.capacity;
    } else {
      this.free.push([this.capacity, capacity - this.capacity]);
    }
    this.capacity = capacity;
  }

  /** The free range ending at the space's end (0 when the end is used). */
  get tailFree(): number {
    const last = this.free.at(-1);
    return last && last[0] + last[1] === this.capacity ? last[1] : 0;
  }

  /** The largest range `allocate` could return now. */
  get largestFree(): number {
    let largest = 0;
    for (const range of this.free) {
      largest = Math.max(largest, range[1]);
    }
    return largest;
  }

  get used(): number {
    return this._used;
  }

  /** Returns an offset, or `undefined` when no free range is large enough. */
  allocate(size: number): number | undefined {
    const aligned = Math.ceil(size / this.alignment) * this.alignment;
    for (let i = 0; i < this.free.length; i++) {
      const range = this.free[i]!;
      if (range[1] < aligned) {
        continue;
      }
      const offset = range[0];
      if (range[1] === aligned) {
        this.free.splice(i, 1);
      } else {
        range[0] += aligned;
        range[1] -= aligned;
      }
      this._used += aligned;
      return offset;
    }
    return undefined;
  }

  release(offset: number, size: number): void {
    const aligned = Math.ceil(size / this.alignment) * this.alignment;
    this._used -= aligned;
    let i = 0;
    while (i < this.free.length && this.free[i]![0] < offset) {
      i++;
    }
    this.free.splice(i, 0, [offset, aligned]);
    // Coalesce with the next and previous neighbors.
    const next = this.free[i + 1];
    if (next && offset + aligned === next[0]) {
      this.free[i]![1] += next[1];
      this.free.splice(i + 1, 1);
    }
    const prev = this.free[i - 1];
    if (prev && prev[0] + prev[1] === offset) {
      prev[1] += this.free[i]![1];
      this.free.splice(i, 1);
    }
  }
}
