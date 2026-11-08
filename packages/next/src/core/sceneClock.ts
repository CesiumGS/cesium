/**
 * How the scene's time last changed: `"steady"` for an ordinary tick
 * forward, `"jump"` for a time that was set (or a switch to live), and
 * `"reverse"` for a tick that ran backward.
 */
export type ClockChange = "steady" | "jump" | "reverse";

/**
 * What the camera layer and the animation core read of the scene's clock,
 * so they need not depend on the time library. Scene seconds are UTC
 * seconds since 1970.
 */
export interface SceneClock {
  /** The scene time: UTC seconds since 1970. */
  readonly seconds: number;
  /** Scene seconds per real second while playing. */
  readonly rate: number;
  /** Whether time stands still. */
  readonly paused: boolean;
  /**
   * The kind of the most recent change; it stays until the next change.
   * Read it inside `watch`, or against a time you remembered, never as a
   * per-tick flag.
   */
  readonly change: ClockChange;
  /** Calls `listener` once per change in time, rate or mode. Returns a remover. */
  watch(listener: () => void): () => void;
}
