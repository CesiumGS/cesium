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
 * - **Smallest window that keeps the throughput.** Measured each period
 *   that demand filled the window (other periods say nothing about the
 *   link). Startup doubles while throughput grows 25%, and on the first
 *   stall steps back to the last good window. Then a hill climb that prefers
 *   smaller windows: step down while throughput stays within 5% of the best
 *   seen (a smaller window that keeps the link full means less queueing, so
 *   the nearest tiles arrive first; on a saturated link more parallel
 *   requests only split the bandwidth), step back up and hold once it
 *   drops, and probe upward every few seconds in case the link got faster.
 *   It needs no latency measurements, so it works where servers hide them.
 *   (A latency model as in TCP BBR never sees a clean round trip on a
 *   saturated link: its own queue is always in front.)
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
  protocol?: string;
}

const PERIOD_MS = 1000;
const MIN_WINDOW = 2;
const MAX_WINDOW = 128;
/** Decoded contents waiting for upload beyond which the window holds. */
const BACKLOG_LIMIT = 32;
/** Periods of history for the best-throughput filter. */
const HISTORY = 10;
/** Periods to hold after settling before probing upward again. */
const HOLD = 6;

interface Origin {
  users: number;
  window: number;
  fixed: boolean;
  inFlight: number;
  protocol?: string;
  seeded: boolean;
  periodStart: number;
  periodBytes: number;
  peakInFlight: number;
  /** Delivered throughput of recent full periods. */
  throughputs: number[];
  throughput: number;
  lastThroughput: number;
  phase: "startup" | "up" | "down" | "hold";
  hold: number;
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
        peakInFlight: 0,
        throughputs: [],
        throughput: 0,
        lastThroughput: 0,
        phase: "startup",
        hold: 0,
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
    const h1 = o.protocol !== undefined && /^http\/1/.test(o.protocol);
    const max = h1 ? 6 : MAX_WINDOW;
    if (o.peakInFlight === 0 && !o.fixed) {
      // Idle (as TCP's slow-start restart): the next burst starts up again
      // from the protocol's seed rather than trusting stale measurements.
      o.phase = "startup";
      o.throughputs.length = 0;
      o.lastThroughput = 0;
      o.window = h1 ? Math.min(o.window, 6) : Math.max(o.window, 16);
    }
    if (full) {
      o.throughputs.push(throughput);
      if (o.throughputs.length > HISTORY) {
        o.throughputs.shift();
      }
      o.throughput = throughput;
    }
    if (!o.fixed && full && o.backlog < BACKLOG_LIMIT) {
      const best = Math.max(...o.throughputs);
      const up = () =>
        Math.min(max, Math.max(o.window + 1, Math.ceil(o.window * 1.25)));
      const down = () =>
        Math.max(
          MIN_WINDOW,
          Math.min(o.window - 1, Math.floor(o.window * 0.8)),
        );
      switch (o.phase) {
        case "startup":
          if (o.lastThroughput === 0 || throughput >= o.lastThroughput * 1.25) {
            o.window = Math.min(max, o.window * 2);
          } else {
            // The last doubling bought nothing: back to the window before.
            o.window = Math.max(MIN_WINDOW, Math.round(o.window / 2));
            o.phase = "down";
          }
          break;
        case "up":
          if (throughput > o.lastThroughput * 1.1) {
            o.window = up();
          } else {
            o.window = down();
            o.phase = "down";
          }
          break;
        case "down":
          if (throughput >= best * 0.95) {
            o.window = down(); // still full: less queue, same throughput
          } else {
            o.window = up(); // too small: back up one step and hold
            o.phase = "hold";
            o.hold = HOLD;
          }
          break;
        case "hold":
          if (--o.hold <= 0) {
            o.window = up();
            o.phase = "up";
          }
          break;
      }
      o.lastThroughput = throughput;
    }
    o.periodStart = now;
    o.periodBytes = 0;
    o.peakInFlight = o.inFlight;
  }
}
