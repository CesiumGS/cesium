/**
 * Measures GPU time per frame with timestamp queries. Results arrive a few
 * frames late through `mapAsync`; while every readback buffer is in flight,
 * frames are simply not measured. A no-op when `timestamp-query` is missing.
 *
 * Chrome quantizes timestamps to 100 µs unless developer features are
 * enabled, so treat values as benchmark data, not a product feature.
 */
export class GpuTimer {
  /** Smoothed GPU frame time in milliseconds, or NaN when unsupported. */
  milliseconds = Number.NaN;
  /**
   * Smoothed span from the first measured pass's start to the last one's end.
   * Unlike `milliseconds`, it includes work the implementation inserts
   * between passes (e.g. indirect-draw validation) and idle gaps.
   */
  spanMilliseconds = Number.NaN;
  private readonly querySet?: GPUQuerySet;
  private readonly resolveBuffer?: GPUBuffer;
  private readonly readbacks: GPUBuffer[] = [];
  private readonly idle: GPUBuffer[] = [];
  private readonly handlers = new Map<
    GPUBuffer,
    { count: number; mapped: () => void; failed: () => void }
  >();
  /** Per-pass timestamp-write descriptors, created once. */
  private readonly writes: GPUComputePassTimestampWrites[] = [];
  private pending?: GPUBuffer;
  private nextIndex = 0;
  private static readonly maxPasses = 32;

  constructor(private readonly device: GPUDevice) {
    if (!device.features.has("timestamp-query")) {
      return;
    }
    const count = GpuTimer.maxPasses * 2;
    this.querySet = device.createQuerySet({ type: "timestamp", count });
    this.resolveBuffer = device.createBuffer({
      size: count * 8,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    for (let i = 0; i < 3; i++) {
      const buffer = device.createBuffer({
        size: count * 8,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      this.readbacks.push(buffer);
      this.idle.push(buffer);
      this.handlers.set(buffer, {
        count: 0,
        mapped: () => this.onMapped(buffer),
        failed: () => this.idle.push(buffer),
      });
    }
    for (let i = 0; i < GpuTimer.maxPasses; i++) {
      this.writes.push({
        querySet: this.querySet,
        beginningOfPassWriteIndex: i * 2,
        endOfPassWriteIndex: i * 2 + 1,
      });
    }
  }

  /** Starts a frame. Returns false when this frame won't be measured. */
  beginFrame(): boolean {
    this.nextIndex = 0;
    this.pending = this.idle.pop();
    return this.pending !== undefined;
  }

  /** Timestamp writes for one pass, or undefined when not measuring. */
  passWrites(): GPUComputePassTimestampWrites | undefined {
    if (
      !this.querySet ||
      !this.pending ||
      this.nextIndex >= GpuTimer.maxPasses * 2
    ) {
      return undefined;
    }
    const writes = this.writes[this.nextIndex / 2];
    this.nextIndex += 2;
    return writes;
  }

  /** Resolves this frame's queries; call before `encoder.finish()`. */
  endFrame(encoder: GPUCommandEncoder): void {
    if (
      !this.querySet ||
      !this.resolveBuffer ||
      !this.pending ||
      this.nextIndex === 0
    ) {
      if (this.pending) {
        this.idle.push(this.pending);
        this.pending = undefined;
      }
      return;
    }
    encoder.resolveQuerySet(
      this.querySet,
      0,
      this.nextIndex,
      this.resolveBuffer,
      0,
    );
    encoder.copyBufferToBuffer(
      this.resolveBuffer,
      0,
      this.pending,
      0,
      this.nextIndex * 8,
    );
  }

  /** Starts the async readback; call after `queue.submit`. */
  afterSubmit(): void {
    const buffer = this.pending;
    const count = this.nextIndex;
    this.pending = undefined;
    if (!buffer) {
      return;
    }
    if (count === 0) {
      this.idle.push(buffer);
      return;
    }
    const handler = this.handlers.get(buffer)!;
    handler.count = count;
    void buffer
      .mapAsync(GPUMapMode.READ, 0, count * 8)
      .then(handler.mapped, handler.failed);
  }

  private onMapped(buffer: GPUBuffer): void {
    const count = this.handlers.get(buffer)!.count;
    const words = new Uint32Array(buffer.getMappedRange(0, count * 8));
    let total = 0;
    let first = timestamp(words, 0);
    let last = timestamp(words, 1);
    for (let i = 0; i < count; i += 2) {
      const begin = timestamp(words, i),
        end = timestamp(words, i + 1);
      if (end > begin) {
        total += end - begin;
      }
      first = begin < first ? begin : first;
      last = end > last ? end : last;
    }
    buffer.unmap();
    this.idle.push(buffer);
    this.milliseconds = smooth(this.milliseconds, total / 1e6);
    if (last > first) {
      this.spanMilliseconds = smooth(
        this.spanMilliseconds,
        (last - first) / 1e6,
      );
    }
  }

  destroy(): void {
    this.querySet?.destroy();
    this.resolveBuffer?.destroy();
    for (const buffer of this.readbacks) {
      buffer.destroy();
    }
  }
}

/**
 * Nanosecond timestamp `i` as a double: exact for 104 days of uptime, without
 * the BigInt allocations of a BigUint64Array.
 */
function timestamp(words: Uint32Array, i: number): number {
  return words[i * 2 + 1]! * 4294967296 + words[i * 2]!;
}

function smooth(previous: number, sample: number): number {
  return Number.isNaN(previous) ? sample : previous * 0.9 + sample * 0.1;
}
