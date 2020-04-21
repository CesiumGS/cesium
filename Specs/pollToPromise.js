import { defaultValue } from "../Source/Cesium.js";
import { getTimestamp } from "../Source/Cesium.js";
import { when } from "../Source/Cesium.js";

function pollToPromise(f, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var pollInterval = defaultValue(options.pollInterval, 1);
  var timeout = defaultValue(options.timeout, 5000);

  var deferred = when.defer();

  var startTimestamp = getTimestamp();
  var endTimestamp = startTimestamp + timeout;

  function poller() {
    var result = false;
    try {
      result = f();
    } catch (e) {
      deferred.reject(e);
      return;
    }

    if (result) {
      deferred.resolve();
    } else if (getTimestamp() > endTimestamp) {
      deferred.reject();
    } else {
      setTimeout(poller, pollInterval);
    }
  }

  poller();

  return deferred.promise;
}
export default pollToPromise;
