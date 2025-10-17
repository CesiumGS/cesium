import { Frozen, getTimestamp } from "@cesium/engine";

function pollToPromise(f, options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const pollInterval = options.pollInterval ?? 1;
  const timeout = options.timeout ?? 5000;

  return new Promise(function (resolve, reject) {
    const startTimestamp = getTimestamp();
    const endTimestamp = startTimestamp + timeout;

    function poller() {
      let result = false;
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
