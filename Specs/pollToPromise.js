// @ts-check

import { defined, getTimestamp } from "@cesium/core";

/**
 * Calls a function repeatedly until it returns a truthy value.
 *
 * @param {function(): any} f The function to call on each poll. Polling stops once it returns a truthy value.
 * @param {object} [options] Object with the following properties:
 * @param {number} [options.pollInterval=1] The time in milliseconds between polls.
 * @param {number} [options.timeout=5000] The time in milliseconds after which the promise is rejected.
 * @param {function(): boolean} [options.isCanceled] Called before each poll. Once it returns <code>true</code>, polling stops and the promise is never settled, so code waiting on it never continues.
 * @returns {Promise<void>} A promise that resolves when <code>f</code> returns a truthy value, and is rejected if <code>f</code> throws or the timeout is reached.
 */
function pollToPromise(f, options) {
  const pollInterval = options?.pollInterval ?? 1;
  const timeout = options?.timeout ?? 5000;
  const isCanceled = options?.isCanceled;

  return new Promise(function (resolve, reject) {
    const startTimestamp = getTimestamp();
    const endTimestamp = startTimestamp + timeout;

    function poller() {
      if (defined(isCanceled) && isCanceled()) {
        return;
      }

      let result;
      try {
        result = f();
      } catch (e) {
        reject(e);
        return;
      }

      if (result) {
        resolve();
      } else if (getTimestamp() > endTimestamp) {
        reject(
          new Error(`Timeout - function did not complete within ${timeout}ms`),
        );
      } else {
        setTimeout(poller, pollInterval);
      }
    }

    poller();
  });
}
export default pollToPromise;
