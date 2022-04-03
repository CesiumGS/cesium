import { defaultValue, getTimestamp } from "../Source/Cesium.js";

function pollToPromise(f, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const pollInterval = defaultValue(options.pollInterval, 1);
  const timeout = defaultValue(options.timeout, 5000);

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
          new Error(`Timeout - function did not complete within ${timeout}ms`)
        );
      } else {
        setTimeout(poller, pollInterval);
      }
    }

    poller();
  });
}
export default pollToPromise;
