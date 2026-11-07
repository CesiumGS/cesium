// What the page and the worker say about an error (the final review,
// finding 5): one home for the message and the missing-data test. No
// imports, so both threads can read it.

/** An error's message, or the thrown value in words. */
export const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

/**
 * Data the frames store doesn't have (R5): the worker's `MissingDataError`,
 * which the protocol rebuilds on the page with its name.
 */
export const isMissing = (e: unknown): boolean =>
  e instanceof Error && e.name === "MissingDataError";
