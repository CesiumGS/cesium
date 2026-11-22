/**
 * Which pacing a benchmark result was measured with
 * (`RunMetrics.uploadPacing`): absent, 1, per tick; 2, by elapsed time.
 * Requests, bytes and the tick count shift with it on a slow GPU, so
 * results of the two aren't compared blindly.
 */
export const UPLOAD_PACING_VERSION = 2;

/** One 60 Hz tick, ms: what the per-tick upload limits are written for. */
export const REFERENCE_TICK_MS = 1000 / 60;
/** The most a slow tick scales the upload limits by. */
export const MAXIMUM_UPLOAD_SCALE = 8;
/** The most CPU time a tick spends on uploads once scaled, ms. */
export const MAXIMUM_UPLOAD_CPU_MS = 8;

/**
 * How much of the per-tick upload limits (count, bytes, ms) this tick gets.
 *
 * The limits are for a 60 Hz tick. A slow GPU ticks far less often, and
 * pacing uploads per tick left decoded tiles waiting seconds with the CPU
 * idle. So a tick that is `queuedMs` after the last one gets that much more,
 * up to 8×. A faster tick gets its proportional share, below 1, as before.
 *
 * `queuedMs` is the time since the previous tick only if uploads were
 * waiting through all of it. After an idle gap it is 0 (no burst), so the
 * scale is then at most 1 and the limits are as they were.
 */
export function uploadScale(intervalMs: number, queueWasWaiting: boolean) {
  const share = intervalMs / REFERENCE_TICK_MS;
  return queueWasWaiting
    ? Math.min(MAXIMUM_UPLOAD_SCALE, share)
    : Math.min(1, share);
}

/** The CPU cap for uploads in a tick of this scale: none at 1× or less. */
export function uploadCpuMs(scale: number, perTickMs: number): number {
  return scale > 1
    ? Math.min(MAXIMUM_UPLOAD_CPU_MS, perTickMs * scale)
    : Infinity;
}
