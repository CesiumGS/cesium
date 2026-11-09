/**
 * A world pool had no room: a table at its ceiling, an arena without a
 * range that size. Unlike bad content, this failure is transient: streaming
 * retries the tile once eviction frees room (CESIUM2_WEBGPU_PLAN.md §13.15,
 * "Capacity in the residency budget"). Whatever threw it has already
 * released what it took.
 */
export class CapacityError extends Error {
  constructor(
    /** The pool: "materials", "draws", "vertex arena", and so on. */
    readonly pool: string,
    /** Why, with the bytes asked for and the limit, when known. */
    detail?: string,
  ) {
    super(`World ${pool} is full${detail ? `: ${detail}` : ""}.`);
    this.name = "CapacityError";
  }
}

export function isCapacityError(error: unknown): error is CapacityError {
  return error instanceof CapacityError;
}
