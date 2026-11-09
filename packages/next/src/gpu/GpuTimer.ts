/**
 * Measures GPU time per frame with timestamp queries. Results arrive a few
 * frames late through `mapAsync`; while every readback buffer is in flight,
 * frames are simply not measured. A no-op when `timestamp-query` is missing.
 *
 * Chrome quantizes timestamps to 100 µs unless developer features are
 * enabled, so treat values as benchmark data, not a product feature. The
 * frame time is the union of the passes' intervals, not their sum, so it
 * isn't comparable with numbers from before `version` 2.
 */
export class GpuTimer {
  /**
   * What `milliseconds` means, as benchmark results record it
   * (`RunMetrics.gpuTimer`; bench/suite/gpuTimer.mjs): 1, every pass's
   * interval summed (before 2026-11-07); 2, overlapping passes counted
   * once (`passTimes`). The two aren't comparable on a GPU whose passes
   * overlap (an Apple tiler: 1 read about three opaque passes too many
   * with translucency on).
   */
  static readonly version = 2;
  private static readonly maxPasses = 48;
  /**
   * Smoothed GPU frame time in milliseconds, or NaN when unsupported: the
   * time any measured pass ran, passes that overlap counted once
   * (`passTimes`).
   */
  milliseconds = Number.NaN;
  /**
   * Smoothed span from the first measured pass's start to the last one's end.
   * Unlike `milliseconds`, it includes work the implementation inserts
   * between passes (e.g. indirect-draw validation) and idle gaps.
   */
  spanMilliseconds = Number.NaN;
  /**
   * Smoothed GPU time per pass label (`passWrites`), ms; passes sharing a
   * label (the shadow cascades) add up. For benchmarks: where the time goes.
   * A pass's time is what no earlier pass overlapped (`passTimes`): on a
   * tiler a pass begins while the last one's fragments still run, so its
   * own interval would count the last one's time again; they add up to
   * `milliseconds`.
   * In the order frames run them, kept stable: a pass a frame skips (the
   * cull on a frame that draws nothing new) keeps its place instead of
   * dropping to the end, and a new pass goes after the one it followed.
   */
  get passes(): Record<string, number> {
    const labels = [...this.labelIndex.keys()];
    const out: Record<string, number> = {};
    for (const i of this.order) {
      out[labels[i]!] = this.labelMs[i]!;
    }
    this.labelIndex.forEach((i, label) => {
      out[label] ??= this.labelMs[i]!;
    });
    return out;
  }
  /** Label indices in run order, stable across frames (`mergeOrder`). */
  private order: number[] = [];
  private readonly querySet?: GPUQuerySet;
  private readonly resolveBuffer?: GPUBuffer;
  private readonly readbacks: GPUBuffer[] = [];
  private readonly idle: GPUBuffer[] = [];
  private readonly handlers = new Map<
    GPUBuffer,
    {
      count: number;
      /** Each pass's label index, as of `afterSubmit`. */
      labels: Uint8Array;
      mapped: () => void;
      failed: () => void;
    }
  >();
  /** Label to index into `labelMs`, interned once. */
  private readonly labelIndex = new Map<string, number>();
  private readonly labelMs = new Float64Array(GpuTimer.maxPasses);
  /** A measured frame's times (`frameTimes`), reused. */
  private readonly scratch = frameScratch(GpuTimer.maxPasses);
  /** This frame's passes' label indices. */
  private readonly frameLabels = new Uint8Array(GpuTimer.maxPasses);
  /** Per-pass timestamp-write descriptors, created once. */
  private readonly writes: GPUComputePassTimestampWrites[] = [];
  private pending?: GPUBuffer;
  private nextIndex = 0;

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
        labels: new Uint8Array(GpuTimer.maxPasses),
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

  /**
   * Timestamp writes for one pass, or undefined when not measuring. `label`
   * names it in `passes`.
   */
  passWrites(label: string): GPUComputePassTimestampWrites | undefined {
    if (
      !this.querySet ||
      !this.pending ||
      this.nextIndex >= GpuTimer.maxPasses * 2
    ) {
      return undefined;
    }
    let index = this.labelIndex.get(label);
    if (index === undefined) {
      if (this.labelIndex.size >= GpuTimer.maxPasses) {
        return undefined;
      }
      index = this.labelIndex.size;
      this.labelIndex.set(label, index);
      this.labelMs[index] = Number.NaN;
    }
    this.frameLabels[this.nextIndex / 2] = index;
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
    handler.labels.set(this.frameLabels);
    void buffer
      .mapAsync(GPUMapMode.READ, 0, count * 8)
      .then(handler.mapped, handler.failed);
  }

  private onMapped(buffer: GPUBuffer): void {
    const { count, labels } = this.handlers.get(buffer)!;
    const words = new Uint32Array(buffer.getMappedRange(0, count * 8));
    const order: number[] = [];
    for (let i = 0; i < count / 2; i++) {
      if (!order.includes(labels[i]!)) {
        order.push(labels[i]!);
      }
    }
    const times = frameTimes(words, count / 2, labels, this.scratch);
    buffer.unmap();
    this.idle.push(buffer);
    this.order = mergeOrder(this.order, order);
    this.milliseconds = smooth(this.milliseconds, times.total / 1e6);
    for (let i = 0; i < this.labelIndex.size; i++) {
      this.labelMs[i] = smooth(this.labelMs[i]!, times.perLabel[i]! / 1e6);
    }
    if (times.span > 0) {
      this.spanMilliseconds = smooth(this.spanMilliseconds, times.span / 1e6);
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

/** `frameTimes`'s output and working arrays, for up to `passes` passes. */
export interface FrameTimes {
  begins: Float64Array;
  ends: Float64Array;
  /** Each pass's own time (`passTimes`), ns. */
  own: Float64Array;
  /** Own time by label index, ns; labels sharing passes add up. */
  perLabel: Float64Array;
  /** The time any pass ran, ns: the sum of `own` and of `perLabel`. */
  total: number;
  /** First begin to last end, ns (0 when the end isn't after the begin). */
  span: number;
}

export function frameScratch(passes: number): FrameTimes {
  return {
    begins: new Float64Array(passes),
    ends: new Float64Array(passes),
    own: new Float64Array(passes),
    perLabel: new Float64Array(passes),
    total: 0,
    span: 0,
  };
}

/**
 * One measured frame from its resolved timestamps (`words`: 64-bit values
 * as pairs of 32-bit words, each pass's begin then end) and each pass's
 * label index: the time any pass ran, each label's share of it, and the
 * span. Fills and returns `out` (`frameScratch`).
 */
export function frameTimes(
  words: Uint32Array,
  passes: number,
  labels: ArrayLike<number>,
  out: FrameTimes,
): FrameTimes {
  let first = Infinity;
  let last = -Infinity;
  for (let i = 0; i < passes; i++) {
    const begin = timestamp(words, i * 2);
    const end = timestamp(words, i * 2 + 1);
    out.begins[i] = begin;
    out.ends[i] = end;
    first = begin < first ? begin : first;
    last = end > last ? end : last;
  }
  // Passes overlap on a tiler (an Apple GPU starts a pass's vertex stage
  // while the last one's fragments run): each pass counts only its time
  // no earlier pass covered, so the total is the time any pass ran.
  out.total = passTimes(out.begins, out.ends, passes, out.own);
  out.perLabel.fill(0);
  for (let i = 0; i < passes; i++) {
    const k = labels[i]!;
    out.perLabel[k] = out.perLabel[k]! + out.own[i]!;
  }
  out.span = last > first ? last - first : 0;
  return out;
}

/**
 * The union so far of `passTimes`'s intervals: sorted, disjoint. Shared by
 * every timer; `passTimes` is synchronous, so no two calls interleave.
 */
let unionBegin = new Float64Array(64);
let unionEnd = new Float64Array(64);

/**
 * Each of `count` passes' own time (into `own`): the part of its interval,
 * `begin[i]` to `end[i]`, that no earlier pass's covers. Returns their sum,
 * the time any pass ran (overlap counted once, gaps not at all). A pass
 * whose end isn't after its begin has none.
 */
export function passTimes(
  begin: ArrayLike<number>,
  end: ArrayLike<number>,
  count: number,
  own: Float64Array,
): number {
  if (unionBegin.length < count + 1) {
    unionBegin = new Float64Array(count + 1);
    unionEnd = new Float64Array(count + 1);
  }
  let n = 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    const b = begin[i]!;
    const e = end[i]!;
    if (!(e > b)) {
      own[i] = 0;
      continue;
    }
    // The union's intervals before it stay; those it touches merge with it.
    let first = 0;
    while (first < n && unionEnd[first]! < b) {
      first++;
    }
    let after = first;
    let covered = 0;
    let lo = b;
    let hi = e;
    while (after < n && unionBegin[after]! <= e) {
      covered +=
        Math.min(unionEnd[after]!, e) - Math.max(unionBegin[after]!, b);
      lo = Math.min(lo, unionBegin[after]!);
      hi = Math.max(hi, unionEnd[after]!);
      after++;
    }
    // Those `first` to `after` become one, at `first`.
    unionBegin.copyWithin(first + 1, after, n);
    unionEnd.copyWithin(first + 1, after, n);
    n += 1 - (after - first);
    unionBegin[first] = lo;
    unionEnd[first] = hi;
    own[i] = e - b - covered;
    total += own[i]!;
  }
  return total;
}

/**
 * `known` with the labels of `frame` (one frame's run order) it lacks, each
 * inserted after the label it followed in that frame (or first): labels
 * already known keep their places, so the order never jumps when a frame
 * skips or reorders a pass.
 */
export function mergeOrder(
  known: number[],
  frame: readonly number[],
): number[] {
  const out = [...known];
  frame.forEach((label, i) => {
    if (out.includes(label)) {
      return;
    }
    const before = i > 0 ? out.indexOf(frame[i - 1]!) : -1;
    out.splice(before + 1, 0, label);
  });
  return out;
}
