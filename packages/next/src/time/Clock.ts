import { Emitter } from "../core/Emitter.ts";

/**
 * Paused: time stands still. Playing: it advances at `rate`. Live: it
 * follows the wall clock.
 */
export type ClockMode = "paused" | "playing" | "live";

interface ClockEvents {
  /** The time, rate or mode changed (by a tick or a setter). */
  change: Clock;
}

/**
 * The time a scene shows (plan §13.13): what the sun, the sky, the stars
 * and time-dynamic content follow. 1.x's `Clock` without its ranges and
 * steps for now; views share one (per-view clocks, for comparing two
 * times side by side, come with time on views).
 */
export class Clock {
  /** Milliseconds since 1970, UTC. */
  private time_: number;
  private rate_: number;
  private mode_: ClockMode;
  private lastTick: number | undefined;
  readonly events = new Emitter<ClockEvents>();

  constructor(
    options: { time?: number; rate?: number; mode?: ClockMode } = {},
  ) {
    this.time_ = options.time ?? Date.now();
    this.rate_ = options.rate ?? 1;
    this.mode_ = options.mode ?? "paused";
  }

  get time(): number {
    return this.time_;
  }

  set time(ms: number) {
    if (ms === this.time_) {
      return;
    }
    this.time_ = ms;
    // Setting a time leaves live (it no longer follows the wall clock).
    if (this.mode_ === "live") {
      this.mode_ = "paused";
    }
    this.events.emit("change", this);
  }

  /** Scene seconds per real second while playing. */
  get rate(): number {
    return this.rate_;
  }

  set rate(rate: number) {
    if (rate !== this.rate_) {
      this.rate_ = rate;
      this.events.emit("change", this);
    }
  }

  get mode(): ClockMode {
    return this.mode_;
  }

  set mode(mode: ClockMode) {
    if (mode === this.mode_) {
      return;
    }
    this.mode_ = mode;
    this.lastTick = undefined;
    if (mode === "live") {
      this.time_ = Date.now();
    }
    this.events.emit("change", this);
  }

  /**
   * Advances the time to `now` (a `performance.now()`-like timestamp, ms)
   * when playing or live. Returns whether it changed.
   */
  tick(now: number): boolean {
    const last = this.lastTick;
    this.lastTick = now;
    if (this.mode_ === "paused" || last === undefined) {
      return false;
    }
    const before = this.time_;
    if (this.mode_ === "live") {
      this.time_ = Date.now();
    } else {
      this.time_ += (now - last) * this.rate_;
    }
    if (this.time_ === before) {
      return false;
    }
    this.events.emit("change", this);
    return true;
  }
}
