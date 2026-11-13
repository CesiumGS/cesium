/**
 * Promise based function to pause execution during async operations.
 * Meant to be used with `async/await`
 * @param ms milliseconds to wait for
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
