import { defaultValue, getTimestamp } from "@cesium/engine";

function pollWhilePromise(promise, f, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const pollInterval = defaultValue(options.pollInterval, 1);
  const timeout = defaultValue(options.timeout, 5000);

  return new Promise(function (resolve, reject) {
    const startTimestamp = getTimestamp();
    const endTimestamp = startTimestamp + timeout;
    let resolvedOrRejected = false;

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        resolvedOrRejected = true;
      });

    function poller() {
      if (resolvedOrRejected) {
        return;
      }

      try {
        f();
      } catch (e) {
        reject(e);
        resolvedOrRejected = true;
        return;
      }

      if (getTimestamp() > endTimestamp) {
        reject(
          new Error(`Timeout - function did not complete within ${timeout}ms`),
        );
        resolvedOrRejected = true;
        return;
      }

      setTimeout(poller, pollInterval);
    }

    poller();
  });
}
export default pollWhilePromise;
