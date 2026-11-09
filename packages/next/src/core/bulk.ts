// Bulk work in one shape (frames 5b, Task 9; spec section 9.6): an operation
// over many inputs runs in slices, so one task never holds the thread past
// its budget, with an `AbortSignal` to cancel it and a progress callback.
// Neutral: it knows nothing of the engine, the frames or measurement.

/** How far a bulk operation has come. */
export interface BulkProgress {
  readonly done: number;
  readonly total: number;
}

/**
 * Runs slices of work. `run` calls `slice(deadline)` until it returns true
 * (finished); `deadline` is a `performance.now()` time the slice should stop
 * by. Rejects with the signal's reason when it aborts first.
 */
export interface SliceScheduler {
  run(
    slice: (deadline: number) => boolean,
    signal?: AbortSignal,
  ): Promise<void>;
}

/** What every bulk operation takes. */
export interface BulkOptions {
  /** Aborting rejects with its reason, and no further step or progress runs. */
  readonly signal?: AbortSignal;
  /** Called after each slice and at the end. */
  readonly onProgress?: (progress: BulkProgress) => void;
  /** Where the slices run (default `timeSlices()`). */
  readonly scheduler?: SliceScheduler;
}

const abortReason = (signal: AbortSignal | undefined): unknown =>
  signal?.reason ?? new DOMException("The operation was aborted", "AbortError");

/** The next macrotask: a `MessageChannel` where there is one, else `setTimeout(0)`. */
function nextTask(): (callback: () => void) => void {
  if (typeof MessageChannel !== "undefined") {
    const channel = new MessageChannel();
    let pending: (() => void) | undefined;
    channel.port1.onmessage = () => {
      const callback = pending;
      pending = undefined;
      callback?.();
    };
    return (callback) => {
      pending = callback;
      channel.port2.postMessage(0);
    };
  }
  return (callback) => void setTimeout(callback, 0);
}

/**
 * Slices on macrotasks of their own: one `slice` call per task, `budgetMs`
 * (default 8) from its start to its deadline, so input and rendering
 * between slices are not starved (plan's call 35).
 */
export function timeSlices(budgetMs = 8): SliceScheduler {
  let post: ((callback: () => void) => void) | undefined;
  return {
    run(slice, signal) {
      post ??= nextTask();
      return new Promise<void>((resolve, reject) => {
        const step = (): void => {
          if (signal?.aborted) {
            reject(abortReason(signal));
            return;
          }
          let finished: boolean;
          try {
            finished = slice(performance.now() + budgetMs);
          } catch (error) {
            reject(error);
            return;
          }
          if (finished) {
            resolve();
          } else {
            post!(step);
          }
        };
        post!(step);
      });
    },
  };
}

/**
 * Runs `step(0)` to `step(total - 1)` in order, in slices, and returns their
 * results. `signal` is checked after every step: aborting rejects with its
 * reason (an `AbortError` by default) and calls no further `step` or
 * `onProgress`. Progress is reported after each slice and at the end. A
 * step that throws rejects the whole run.
 */
export function runBulk<T>(
  total: number,
  step: (index: number) => T,
  options: BulkOptions = {},
): Promise<T[]> {
  const { signal, onProgress } = options;
  const scheduler = options.scheduler ?? timeSlices();
  if (signal?.aborted) {
    return Promise.reject(abortReason(signal));
  }
  const results: T[] = [];
  let i = 0;
  return scheduler
    .run((deadline) => {
      while (i < total) {
        results.push(step(i++));
        if (signal?.aborted) {
          throw abortReason(signal);
        }
        if (i < total && performance.now() >= deadline) {
          break;
        }
      }
      onProgress?.({ done: i, total });
      return i >= total;
    }, signal)
    .then(() => results);
}

/** A scheduler that slices inside a loop's ticks (`Engine.bulk`), and what stops it. */
export interface TickSlices extends SliceScheduler {
  /** Rejects whatever is queued with an `AbortError` and unregisters the tick listener. */
  dispose(): void;
}

/**
 * Slices inside the ticks of a loop: `onTick` registers a listener that
 * returns true while it is busy (as `Engine.onTick`). Each tick spends up to
 * `budgetMs` (default 4, plan's call 35) across the queued work, round
 * robin. The listener exists only while work is queued: an idle scheduler
 * registers nothing.
 */
export function tickSlices(
  onTick: (listener: (now: number) => boolean) => () => void,
  budgetMs = 4,
): TickSlices {
  interface Job {
    slice: (deadline: number) => boolean;
    resolve: () => void;
    reject: (error: unknown) => void;
    signal: AbortSignal | undefined;
    onAbort: (() => void) | undefined;
  }
  let queue: Job[] = [];
  let off: (() => void) | undefined;
  let disposed = false;

  const finish = (job: Job): void => {
    if (job.onAbort) {
      job.signal?.removeEventListener("abort", job.onAbort);
    }
    queue = queue.filter((j) => j !== job);
    if (queue.length === 0) {
      off?.();
      off = undefined;
    }
  };
  const listener = (): boolean => {
    const deadline = performance.now() + budgetMs;
    for (const job of queue.slice()) {
      if (!queue.includes(job)) {
        continue;
      }
      if (job.signal?.aborted) {
        finish(job);
        job.reject(abortReason(job.signal));
        continue;
      }
      try {
        if (job.slice(deadline)) {
          finish(job);
          job.resolve();
        }
      } catch (error) {
        finish(job);
        job.reject(error);
      }
      if (performance.now() >= deadline) {
        break;
      }
    }
    return queue.length > 0;
  };
  return {
    run(slice, signal) {
      if (disposed) {
        return Promise.reject(abortReason(undefined));
      }
      if (signal?.aborted) {
        return Promise.reject(abortReason(signal));
      }
      return new Promise<void>((resolve, reject) => {
        const job: Job = {
          slice,
          resolve,
          reject,
          signal,
          onAbort: undefined,
        };
        if (signal) {
          job.onAbort = () => {
            if (queue.includes(job)) {
              finish(job);
              reject(abortReason(signal));
            }
          };
          signal.addEventListener("abort", job.onAbort, { once: true });
        }
        queue.push(job);
        off ??= onTick(listener);
      });
    },
    dispose() {
      disposed = true;
      const jobs = queue;
      for (const job of jobs) {
        finish(job);
        job.reject(abortReason(undefined));
      }
    },
  };
}
