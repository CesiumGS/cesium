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
  private readonly querySet?: GPUQuerySet;
  private readonly resolveBuffer?: GPUBuffer;
  private readonly readbacks: GPUBuffer[] = [];
  private readonly idle: GPUBuffer[] = [];
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
    const writes = {
      querySet: this.querySet,
      beginningOfPassWriteIndex: this.nextIndex,
      endOfPassWriteIndex: this.nextIndex + 1,
    };
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
    void buffer.mapAsync(GPUMapMode.READ, 0, count * 8).then(
      () => {
        const times = new BigUint64Array(buffer.getMappedRange(0, count * 8));
        let total = 0n;
        for (let i = 0; i < count; i += 2) {
          const begin = times[i]!,
            end = times[i + 1]!;
          if (end > begin) {
            total += end - begin;
          }
        }
        buffer.unmap();
        this.idle.push(buffer);
        const ms = Number(total) / 1e6;
        this.milliseconds = Number.isNaN(this.milliseconds)
          ? ms
          : this.milliseconds * 0.9 + ms * 0.1;
      },
      () => this.idle.push(buffer),
    );
  }

  destroy(): void {
    this.querySet?.destroy();
    this.resolveBuffer?.destroy();
    for (const buffer of this.readbacks) {
      buffer.destroy();
    }
  }
}
