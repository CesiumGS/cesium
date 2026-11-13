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
  /** Timed intervals in one measured frame: its own passes plus groups. */
  private static readonly maxPasses = 48;
  /**
   * Groups (`groupWrites`) a frame can carry: work encoded outside the
   * frame's encoder (the imagery compositor's, the environment's), one
   * interval each, however many passes it ran.
   */
  private static readonly groupSlots = 8;
  /** Passes (`passWrites`) a measured frame can time itself. */
  private static readonly framePasses =
    GpuTimer.maxPasses - GpuTimer.groupSlots;
  /** Where the groups' queries start in the query set. */
  private static readonly groupBase = GpuTimer.framePasses * 2;
  /** A resolved group's place in the resolve buffer (256-aligned). */
  private static readonly groupStride = 256;
  private static readonly groupOffset = 1024;
  /**
   * Frame markers: two empty compute passes, one first and one last in the
   * frame's encoder, whose timestamps bound it. Four queries after the
   * passes' and groups'; resolved at `markerOffset`, read back after them.
   */
  private static readonly markerBase = GpuTimer.maxPasses * 2;
  private static readonly markerOffset =
    GpuTimer.groupOffset + GpuTimer.groupSlots * GpuTimer.groupStride;
  private static readonly markerBytes = 32;
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
   * Smoothed latency of a measured frame, ms: the CPU clock from its
   * `queue.submit` to `onSubmittedWorkDone`. It includes any wait behind
   * earlier frames' work, so it says how late the image is, not what the
   * frame costs. NaN until one arrives.
   */
  wallMilliseconds = Number.NaN;
  /**
   * Smoothed time inside the frame's encoder (first marker to last) that no
   * timed pass covered, ms: copies, clears, the implementation's own work
   * between passes. NaN until a marked frame arrives.
   */
  inFrameUntimedMilliseconds = Number.NaN;
  /**
   * Smoothed gap from the previous frame's last marker to this one's first,
   * ms, less timed passes in it (a group's), counted when the previous
   * frame was still unfinished at this one's submit. It can't tell the GPU
   * waiting for the next submit from untimed work in other submits.
   */
  betweenFramesMilliseconds = Number.NaN;
  /**
   * Smoothed GPU frame interval while the GPU is busy, ms: the time between
   * two frames' `onSubmittedWorkDone` resolutions, counted only when the
   * later frame was submitted before the earlier one finished (the GPU never
   * idled between them). Then it is what a frame costs the GPU, untimed
   * work (uploads, copies, presenting) included. NaN when the latest
   * measured frame followed an idle GPU, or none has arrived.
   */
  intervalMilliseconds = Number.NaN;
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
      tag: number;
      /** Each pass's label index, as of `afterSubmit`. */
      labels: Uint8Array;
      /** Latency of this frame's submit, ms (NaN if unknown). */
      wall: number;
      /** Busy interval (`intervalMilliseconds`), ms; NaN if the GPU idled. */
      interval: number;
      /** Submit order of the frame (`submitSeq`), and whether it has markers. */
      seq: number;
      markers: boolean;
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
  /** Group slot to label index (`groupWrites`). */
  private readonly groupLabels: number[] = [];
  /** Group slots written since the last measured submit. */
  private readonly groupDirty: boolean[] = [];
  /** Per group slot: first pass of a run (begin and end), later ones (end). */
  private readonly groupFirst: GPUComputePassTimestampWrites[] = [];
  private readonly groupRest: GPUComputePassTimestampWrites[] = [];
  /** The dirty groups this frame carries, as slots (`endFrame`). */
  private readonly frameGroups = new Uint8Array(GpuTimer.groupSlots);
  private frameGroupCount = 0;
  private pending?: GPUBuffer;
  private nextIndex = 0;
  /**
   * What the next measured frame is tagged with (the engine's tick index):
   * the recorder files its late result under the tick it belongs to.
   */
  tag = 0;
  /** The latest measured frame, unsmoothed (a recorder's; `samples` counts them). */
  readonly lastSample: {
    tag: number;
    ms: number;
    /** First pass start to last pass end, ms. */
    spanMs: number;
    /** Submit to `onSubmittedWorkDone`, ms (NaN if it hadn't arrived). */
    wallMs: number;
    /** Busy interval, ms; NaN when the GPU idled before this frame. */
    intervalMs: number;
    /** Inside the frame's markers, not covered by a timed pass, ms (NaN: no markers). */
    inFrameUntimedMs: number;
    /** Since the previous frame's last marker, ms; NaN when the GPU idled. */
    betweenFramesMs: number;
    /** The two markers' span, ms (NaN: no markers). */
    markerSpanMs: number;
    passes: Record<string, number>;
  } = {
    tag: 0,
    ms: Number.NaN,
    spanMs: Number.NaN,
    wallMs: Number.NaN,
    intervalMs: Number.NaN,
    inFrameUntimedMs: Number.NaN,
    betweenFramesMs: Number.NaN,
    markerSpanMs: Number.NaN,
    passes: {},
  };
  samples = 0;

  constructor(private readonly device: GPUDevice) {
    if (!device.features.has("timestamp-query")) {
      return;
    }
    GpuTimer.timers.set(device, this);
    const count = GpuTimer.maxPasses * 2;
    this.querySet = device.createQuerySet({
      type: "timestamp",
      count: count + 4,
    });
    this.resolveBuffer = device.createBuffer({
      size: GpuTimer.markerOffset + GpuTimer.markerBytes,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    for (let i = 0; i < 3; i++) {
      const buffer = device.createBuffer({
        size: count * 8 + GpuTimer.markerBytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      this.readbacks.push(buffer);
      this.idle.push(buffer);
      this.handlers.set(buffer, {
        count: 0,
        tag: 0,
        labels: new Uint8Array(GpuTimer.maxPasses),
        wall: Number.NaN,
        interval: Number.NaN,
        seq: 0,
        markers: false,
        mapped: () => this.onMapped(buffer),
        failed: () => this.idle.push(buffer),
      });
    }
    for (let i = 0; i < GpuTimer.framePasses; i++) {
      this.writes.push({
        querySet: this.querySet,
        beginningOfPassWriteIndex: i * 2,
        endOfPassWriteIndex: i * 2 + 1,
      });
    }
    for (let i = 0; i < GpuTimer.groupSlots; i++) {
      const begin = GpuTimer.groupBase + i * 2;
      this.groupFirst.push({
        querySet: this.querySet,
        beginningOfPassWriteIndex: begin,
        endOfPassWriteIndex: begin + 1,
      });
      this.groupRest.push({
        querySet: this.querySet,
        endOfPassWriteIndex: begin + 1,
      });
      this.groupDirty.push(false);
    }
  }

  /**
   * Timestamp writes for a pass of group `label` on `device`'s timer
   * (`groupWrites`), for code that has the device but not the engine. A
   * pass run before the frame's own submit, any time the same tick.
   */
  static groupWrites(
    device: GPUDevice,
    label: string,
  ): GPUComputePassTimestampWrites | undefined {
    return GpuTimer.timers.get(device)?.groupWrites(label);
  }

  private static readonly timers = new WeakMap<GPUDevice, GpuTimer>();

  /** Starts a frame. Returns false when this frame won't be measured. */
  beginFrame(): boolean {
    this.nextIndex = 0;
    this.pending = this.idle.pop();
    return this.pending !== undefined;
  }

  /**
   * Writes the frame's first marker (an empty pass) into `encoder`: call
   * right after `beginFrame`, before any other pass or copy. Does nothing
   * when the frame isn't measured.
   */
  startMarker(encoder: GPUCommandEncoder): void {
    if (!this.querySet || !this.pending) {
      return;
    }
    this.markerStarted = true;
    this.markerPass(encoder, "frame.start", 0);
  }

  private markerStarted = false;

  /**
   * An empty pass gets no timestamps from the driver (both read 0), so a
   * marker dispatches one workgroup of a kernel that does nothing.
   */
  private markerPipeline?: GPUComputePipeline;

  private markerPass(
    encoder: GPUCommandEncoder,
    label: string,
    slot: number,
  ): void {
    this.markerPipeline ??= this.device.createComputePipeline({
      label: "frame.marker",
      layout: "auto",
      compute: {
        module: this.device.createShaderModule({
          code: "@compute @workgroup_size(1) fn main() {}",
        }),
        entryPoint: "main",
      },
    });
    const pass = encoder.beginComputePass({
      label,
      timestampWrites: {
        querySet: this.querySet!,
        beginningOfPassWriteIndex: GpuTimer.markerBase + slot * 2,
        endOfPassWriteIndex: GpuTimer.markerBase + slot * 2 + 1,
      },
    });
    pass.setPipeline(this.markerPipeline);
    pass.dispatchWorkgroups(1);
    pass.end();
  }

  /**
   * Timestamp writes for one pass, or undefined when not measuring. `label`
   * names it in `passes`.
   */
  passWrites(label: string): GPUComputePassTimestampWrites | undefined {
    if (
      !this.querySet ||
      !this.pending ||
      this.nextIndex >= GpuTimer.framePasses * 2
    ) {
      return undefined;
    }
    const index = this.intern(label);
    if (index === undefined) {
      return undefined;
    }
    this.frameLabels[this.nextIndex / 2] = index;
    const writes = this.writes[this.nextIndex / 2];
    this.nextIndex += 2;
    return writes;
  }

  /**
   * Timestamp writes for one pass of a group: work that runs outside the
   * frame's encoder (the imagery compositor, environment maps), in as many
   * passes as it takes. All of a group's passes since the last measured
   * frame add up to one interval, from the first pass's start to the last
   * pass's end (gaps between them included), reported under `label`. Call
   * it for every pass of the group, in the order they run. Undefined
   * without `timestamp-query`, or when the groups are full. The passes
   * must be submitted before the frame's (`endFrame`).
   */
  groupWrites(label: string): GPUComputePassTimestampWrites | undefined {
    if (!this.querySet) {
      return undefined;
    }
    const index = this.intern(label);
    if (index === undefined) {
      return undefined;
    }
    let slot = this.groupLabels.indexOf(index);
    if (slot < 0) {
      if (this.groupLabels.length >= GpuTimer.groupSlots) {
        return undefined;
      }
      slot = this.groupLabels.length;
      this.groupLabels.push(index);
    }
    const first = !this.groupDirty[slot];
    this.groupDirty[slot] = true;
    return first ? this.groupFirst[slot] : this.groupRest[slot];
  }

  /** The label's index (new ones interned), or undefined when full. */
  private intern(label: string): number | undefined {
    let index = this.labelIndex.get(label);
    if (index === undefined) {
      if (this.labelIndex.size >= GpuTimer.maxPasses) {
        return undefined;
      }
      index = this.labelIndex.size;
      this.labelIndex.set(label, index);
      this.labelMs[index] = Number.NaN;
    }
    return index;
  }

  /** Resolves this frame's queries; call before `encoder.finish()`. */
  endFrame(encoder: GPUCommandEncoder): void {
    this.frameGroupCount = 0;
    for (let slot = 0; slot < this.groupLabels.length; slot++) {
      if (this.groupDirty[slot]) {
        this.frameGroups[this.frameGroupCount++] = slot;
      }
    }
    const groups = this.frameGroupCount;
    if (!this.querySet || !this.resolveBuffer || !this.pending) {
      if (this.pending) {
        this.idle.push(this.pending);
        this.pending = undefined;
      }
      return;
    }
    if (this.markerStarted) {
      this.markerPass(encoder, "frame.end", 1);
    }
    // The readback holds the groups' intervals first, then the passes'.
    // Each group resolves alone: only the queries written are resolved.
    for (let k = 0; k < groups; k++) {
      const slot = this.frameGroups[k]!;
      const at = GpuTimer.groupOffset + k * GpuTimer.groupStride;
      encoder.resolveQuerySet(
        this.querySet,
        GpuTimer.groupBase + slot * 2,
        2,
        this.resolveBuffer,
        at,
      );
      encoder.copyBufferToBuffer(
        this.resolveBuffer,
        at,
        this.pending,
        k * 16,
        16,
      );
    }
    if (this.nextIndex > 0) {
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
        groups * 16,
        this.nextIndex * 8,
      );
    }
    if (this.markerStarted) {
      encoder.resolveQuerySet(
        this.querySet,
        GpuTimer.markerBase,
        4,
        this.resolveBuffer,
        GpuTimer.markerOffset,
      );
      encoder.copyBufferToBuffer(
        this.resolveBuffer,
        GpuTimer.markerOffset,
        this.pending,
        (groups * 2 + this.nextIndex) * 8,
        GpuTimer.markerBytes,
      );
    }
  }

  /**
   * Starts the async readback and the wall-time measure of this frame's
   * submit; call after `queue.submit`, every frame (it ends the frame's
   * groups).
   */
  afterSubmit(): void {
    const buffer = this.pending;
    const groups = this.frameGroupCount;
    const count = groups * 2 + this.nextIndex;
    this.pending = undefined;
    this.frameGroupCount = 0;
    const slots = this.frameGroups.slice(0, groups);
    this.groupDirty.fill(false);
    const markers = this.markerStarted;
    this.markerStarted = false;
    const seq = ++this.submitSeq;
    // Every submitted frame is watched, measured or not: the next one needs
    // to know whether this one was still running when it was submitted.
    const handler = buffer ? this.handlers.get(buffer) : undefined;
    const done = this.watchSubmit(
      handler && count > 0 ? handler : { wall: 0, interval: 0 },
    );
    if (!buffer) {
      return;
    }
    if (!handler || (count === 0 && !markers)) {
      this.idle.push(buffer);
      return;
    }
    handler.count = count;
    handler.tag = this.tag;
    handler.wall = Number.NaN;
    handler.interval = Number.NaN;
    handler.seq = seq;
    handler.markers = markers;
    for (let k = 0; k < groups; k++) {
      handler.labels[k] = this.groupLabels[slots[k]!]!;
    }
    handler.labels.set(
      this.frameLabels.subarray(0, this.nextIndex / 2),
      groups,
    );
    void buffer
      .mapAsync(
        GPUMapMode.READ,
        0,
        count * 8 + (markers ? GpuTimer.markerBytes : 0),
      )
      .then(() => done)
      .then(handler.mapped, handler.failed);
  }

  /** Frames submitted and not yet done, and when the last one finished. */
  private inflight = 0;
  private lastDoneAt = Number.NaN;
  /** Most frames watched at once; past it the chain of intervals restarts. */
  private static readonly maxInflight = 4;

  /**
   * Watches the frame just submitted: fills `into` with its latency and,
   * if the GPU was busy back to back (an earlier frame still ran when this
   * one was submitted), the interval since that frame finished. Frames
   * finish in submit order.
   */
  private watchSubmit(into: { wall: number; interval: number }): Promise<void> {
    if (!this.querySet || this.inflight >= GpuTimer.maxInflight) {
      this.lastDoneAt = Number.NaN;
      return Promise.resolve();
    }
    const busy = this.inflight > 0;
    const start = performance.now();
    this.inflight++;
    const finish = () => {
      const now = performance.now();
      this.inflight--;
      into.wall = now - start;
      into.interval = busy ? now - this.lastDoneAt : Number.NaN;
      this.lastDoneAt = now;
    };
    return this.device.queue.onSubmittedWorkDone().then(finish, () => {
      this.inflight--;
      this.lastDoneAt = Number.NaN;
    });
  }

  /** Frames submitted so far; a measured frame's place among them. */
  private submitSeq = 0;
  /** The last frame's closing marker (ns) and its `submitSeq`. */
  private lastMarkerEnd = Number.NaN;
  private lastMarkerSeq = -1;
  private readonly clippedBegin = new Float64Array(GpuTimer.maxPasses);
  private readonly clippedEnd = new Float64Array(GpuTimer.maxPasses);
  private readonly clippedOwn = new Float64Array(GpuTimer.maxPasses);

  private onMapped(buffer: GPUBuffer): void {
    const { count, labels, tag, wall, interval, seq, markers } =
      this.handlers.get(buffer)!;
    const words = new Uint32Array(
      count > 0 ? buffer.getMappedRange(0, count * 8) : new ArrayBuffer(0),
    );
    const marks = markers
      ? new Uint32Array(buffer.getMappedRange(count * 8, GpuTimer.markerBytes))
      : undefined;
    const order: number[] = [];
    for (let i = 0; i < count / 2; i++) {
      if (!order.includes(labels[i]!)) {
        order.push(labels[i]!);
      }
    }
    const times = frameTimes(words, count / 2, labels, this.scratch);
    let inFrame = Number.NaN;
    let between = Number.NaN;
    if (marks) {
      // The span between the markers, less what timed passes ran inside it
      // (clipped: a group's passes ran before the frame's encoder).
      const from = timestamp(marks, 1);
      const to = timestamp(marks, 2);
      const n = count / 2;
      for (let i = 0; i < n; i++) {
        this.clippedBegin[i] = Math.min(
          Math.max(this.scratch.begins[i]!, from),
          to,
        );
        this.clippedEnd[i] = Math.min(
          Math.max(this.scratch.ends[i]!, from),
          to,
        );
      }
      const covered = passTimes(
        this.clippedBegin,
        this.clippedEnd,
        n,
        this.clippedOwn,
      );
      inFrame = Math.max(0, to - from - covered) / 1e6;
      if (!Number.isNaN(interval) && this.lastMarkerSeq === seq - 1) {
        // The gap between the frames, less the timed passes in it (a
        // group's: imagery, environment, run in their own submits).
        const gapFrom = this.lastMarkerEnd;
        const gapTo = timestamp(marks, 0);
        for (let i = 0; i < n; i++) {
          this.clippedBegin[i] = Math.min(
            Math.max(this.scratch.begins[i]!, gapFrom),
            gapTo,
          );
          this.clippedEnd[i] = Math.min(
            Math.max(this.scratch.ends[i]!, gapFrom),
            gapTo,
          );
        }
        const inGap = passTimes(
          this.clippedBegin,
          this.clippedEnd,
          n,
          this.clippedOwn,
        );
        between = Math.max(0, gapTo - gapFrom - inGap) / 1e6;
      }
      this.lastMarkerEnd = timestamp(marks, 3);
      this.lastMarkerSeq = seq;
    }
    buffer.unmap();
    this.idle.push(buffer);
    this.order = mergeOrder(this.order, order);
    const sample = this.lastSample;
    sample.tag = tag;
    sample.ms = times.total / 1e6;
    sample.spanMs = times.span / 1e6;
    sample.wallMs = wall;
    sample.intervalMs = interval;
    sample.inFrameUntimedMs = inFrame;
    sample.markerSpanMs = marks
      ? (timestamp(marks, 2) - timestamp(marks, 1)) / 1e6
      : Number.NaN;
    sample.betweenFramesMs = between;
    if (marks) {
      this.inFrameUntimedMilliseconds = smooth(
        this.inFrameUntimedMilliseconds,
        inFrame,
      );
      this.betweenFramesMilliseconds = Number.isNaN(between)
        ? Number.NaN
        : smooth(this.betweenFramesMilliseconds, between);
    }
    sample.passes = {};
    const names = [...this.labelIndex.keys()];
    for (const i of order) {
      sample.passes[names[i]!] = times.perLabel[i]! / 1e6;
    }
    this.samples++;
    this.milliseconds = smooth(this.milliseconds, times.total / 1e6);
    for (let i = 0; i < this.labelIndex.size; i++) {
      this.labelMs[i] = smooth(this.labelMs[i]!, times.perLabel[i]! / 1e6);
    }
    if (times.span > 0) {
      this.spanMilliseconds = smooth(this.spanMilliseconds, times.span / 1e6);
    }
    this.intervalMilliseconds = Number.isNaN(interval)
      ? Number.NaN
      : smooth(this.intervalMilliseconds, interval);
    if (!Number.isNaN(wall)) {
      this.wallMilliseconds = smooth(this.wallMilliseconds, wall);
    }
  }

  destroy(): void {
    if (GpuTimer.timers.get(this.device) === this) {
      GpuTimer.timers.delete(this.device);
    }
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
    // A query never written reads 0 (a group's pass whose command buffer
    // was submitted after the frame's): the pass counts for nothing.
    const written = begin > 0 && end > 0;
    out.begins[i] = written ? begin : 0;
    out.ends[i] = written ? end : 0;
    if (written) {
      first = begin < first ? begin : first;
      last = end > last ? end : last;
    }
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
