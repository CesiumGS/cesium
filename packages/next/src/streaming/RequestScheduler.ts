/**
 * Content request concurrency per origin, shared by every tileset on that
 * origin (plan §13.2). 1.x caps each tileset at 18, an HTTP/1.1-era limit;
 * here the window starts from the negotiated protocol and then adapts.
 *
 * - **Seed:** HTTP/1.1 about 6 (the browser's per-host connection limit:
 *   beyond it requests queue inside the browser, where they can be neither
 *   reprioritized nor cancelled); HTTP/2 and HTTP/3 about 24; unknown 16
 *   until a response reports its protocol (Resource Timing, which
 *   cross-origin servers may hide without `Timing-Allow-Origin`).
 * - **Model the link** (as TCP BBR): the highest delivered throughput and
 *   the lowest request latency seen recently. By Little's law the requests
 *   needed to keep the link busy are throughput × latency / request size,
 *   plus one; anything beyond that only queues (on a saturated link, more
 *   parallel requests split the bandwidth and everything arrives later).
 *   The window cycles a little above and below that target to keep
 *   measuring. Periods where demand didn't fill the window don't count
 *   toward throughput (they say nothing about the link).
 * - **Start up** by doubling while throughput still grows 25% per period.
 * - **Backpressure:** hold while decoded content backs up behind the
 *   upload: the network isn't the bottleneck then.
 * - HTTP/1.1 never exceeds 6: beyond it the browser queues.
 *
 * A tileset created with `maximumRequests` pins its origin's window instead
 * (parity runs and fixed-window comparisons).
 */

/** One origin's request window, for diagnostics. */
export interface OriginStats {
  origin: string;
  /** Negotiated protocol ("http/1.1", "h2", "h3"), when reported. */
  protocol?: string;
  /** Requests allowed in flight now, and in flight. */
  window: number;
  inFlight: number;
  /** False when a tileset pinned the window (`maximumRequests`). */
  adaptive: boolean;
  /** Bytes per second delivered over the last full period. */
  throughput: number;
  /** Requests cancelled because no view needed them any more. */
  cancelled: number;
}

/** What a finished request reports back. */
export interface RequestSample {
  bytes: number;
  /** Request start to last byte, ms; omitted for cache hits. */
  latencyMs?: number;
  protocol?: string;
}

const PERIOD_MS = 1000;
const MIN_WINDOW = 4;
const MAX_WINDOW = 128;
/** Decoded contents waiting for upload beyond which the window holds. */
const BACKLOG_LIMIT = 32;
/** Periods of history for the max-throughput and min-latency filters. */
const HISTORY = 10;
/** Probe cycle: a period above target, one below to drain, then cruise. */
const GAINS = [1.25, 0.75, 1, 1, 1, 1, 1, 1];

interface Origin {
  users: number;
  window: number;
  fixed: boolean;
  inFlight: number;
  protocol?: string;
  seeded: boolean;
  periodStart: number;
  periodBytes: number;
  periodMinLatency: number;
  peakInFlight: number;
  /** Delivered throughput of recent full periods, and latency minima. */
  throughputs: number[];
  latencies: number[];
  meanBytes: number;
  throughput: number;
  startup: boolean;
  stalls: number;
  cycle: number;
  backlog: number;
  cancelled: number;
}

export class RequestScheduler {
  private readonly origins = new Map<string, Origin>();

  /**
   * Registers a user (a tileset) of `origin`. The origin's state lives while
   * it has users, so a new tileset after all others are gone starts fresh.
   */
  register(origin: string, fixedWindow?: number): void {
    let o = this.origins.get(origin);
    if (!o) {
      o = {
        users: 0,
        window: fixedWindow ?? 16,
        fixed: fixedWindow !== undefined,
        inFlight: 0,
        seeded: false,
        periodStart: performance.now(),
        periodBytes: 0,
        periodMinLatency: Infinity,
        peakInFlight: 0,
        throughputs: [],
        latencies: [],
        meanBytes: 0,
        throughput: 0,
        startup: true,
        stalls: 0,
        cycle: 0,
        backlog: 0,
        cancelled: 0,
      };
      this.origins.set(origin, o);
    }
    o.users++;
  }

  unregister(origin: string): void {
    const o = this.origins.get(origin);
    if (o && --o.users <= 0) {
      this.origins.delete(origin);
    }
  }

  /** Takes a request slot on `origin`, or returns false when it is full. */
  tryAcquire(origin: string): boolean {
    const o = this.origins.get(origin);
    if (!o) {
      return true; // not registered (one-off loads): unlimited
    }
    this.adapt(o, performance.now());
    if (o.inFlight >= o.window) {
      o.peakInFlight = o.window; // demand reached the window this period
      return false;
    }
    o.inFlight++;
    o.peakInFlight = Math.max(o.peakInFlight, o.inFlight);
    return true;
  }

  /** Returns a slot; `sample` when the request completed. */
  release(origin: string, sample?: RequestSample): void {
    const o = this.origins.get(origin);
    if (!o) {
      return;
    }
    o.inFlight = Math.max(0, o.inFlight - 1);
    if (!sample) {
      return;
    }
    o.periodBytes += sample.bytes;
    // Cache hits (and anything faster than a network round trip could be)
    // say nothing about the link.
    if (sample.latencyMs !== undefined && sample.latencyMs >= 5) {
      o.periodMinLatency = Math.min(o.periodMinLatency, sample.latencyMs);
    }
    o.meanBytes = o.meanBytes
      ? o.meanBytes * 0.9 + sample.bytes * 0.1
      : sample.bytes;
    if (sample.protocol && !o.seeded) {
      o.protocol = sample.protocol;
      o.seeded = true;
      if (!o.fixed) {
        o.window = /^http\/1/.test(sample.protocol)
          ? Math.min(o.window, 6)
          : Math.max(o.window, 24);
      }
    }
  }

  /** Counts a cancelled request (its slot is returned by `release`). */
  cancelled(origin: string): void {
    const o = this.origins.get(origin);
    if (o) {
      o.cancelled++;
    }
  }

  /** Decoded contents from this origin waiting for upload. */
  backlog(origin: string, waiting: number): void {
    const o = this.origins.get(origin);
    if (o) {
      o.backlog = waiting;
    }
  }

  stats(origin: string): OriginStats | undefined {
    const o = this.origins.get(origin);
    return o
      ? {
          origin,
          ...(o.protocol ? { protocol: o.protocol } : {}),
          window: o.window,
          inFlight: o.inFlight,
          adaptive: !o.fixed,
          throughput: o.throughput,
          cancelled: o.cancelled,
        }
      : undefined;
  }

  private adapt(o: Origin, now: number): void {
    if (now - o.periodStart < PERIOD_MS) {
      return;
    }
    const throughput = (o.periodBytes * 1000) / (now - o.periodStart);
    const full = o.peakInFlight >= o.window;
    if (o.peakInFlight === 0 && !o.fixed) {
      // Idle (as TCP's slow-start restart): the next burst starts up again
      // instead of trusting estimates from a window it no longer fills.
      o.startup = true;
      o.stalls = 0;
      const h1 = o.protocol !== undefined && /^http\/1/.test(o.protocol);
      o.window = h1 ? Math.min(o.window, 6) : Math.max(o.window, 24);
    }
    const push = (list: number[], v: number) => {
      list.push(v);
      if (list.length > HISTORY) {
        list.shift();
      }
    };
    if (Number.isFinite(o.periodMinLatency)) {
      push(o.latencies, o.periodMinLatency);
    }
    if (full) {
      push(o.throughputs, throughput);
      o.throughput = throughput;
    }
    const h1 = o.protocol !== undefined && /^http\/1/.test(o.protocol);
    const max = h1 ? 6 : MAX_WINDOW;
    if (!o.fixed && full && o.backlog < BACKLOG_LIMIT) {
      const best = Math.max(...o.throughputs);
      if (o.startup) {
        // Double while throughput still grows; two stalls end startup.
        const previous = o.throughputs[o.throughputs.length - 2] ?? 0;
        o.stalls = throughput >= previous * 1.25 ? 0 : o.stalls + 1;
        if (o.stalls >= 2) {
          o.startup = false;
        } else {
          o.window = Math.min(max, o.window * 2);
        }
      }
      if (!o.startup && o.meanBytes > 0 && o.latencies.length > 0) {
        const latency = Math.min(...o.latencies) / 1000;
        const target = (best * latency) / o.meanBytes + 1;
        const gain = GAINS[o.cycle++ % GAINS.length]!;
        o.window = Math.round(
          Math.min(max, Math.max(MIN_WINDOW, target * gain)),
        );
      }
    }
    o.periodStart = now;
    o.periodBytes = 0;
    o.periodMinLatency = Infinity;
    o.peakInFlight = o.inFlight;
  }
}
