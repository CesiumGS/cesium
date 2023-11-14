import Uri from "../ThirdParty/Uri.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defer from "./defer.js";
import defined from "./defined.js";
import Event from "./Event.js";
import Heap from "./Heap.js";
import isBlobUri from "./isBlobUri.js";
import isDataUri from "./isDataUri.js";
import RequestState from "./RequestState.js";

function sortRequests(a, b) {
  return a.priority - b.priority;
}

const statistics = {
  numberOfAttemptedRequests: 0,
  numberOfActiveRequests: 0,
  numberOfCancelledRequests: 0,
  numberOfCancelledActiveRequests: 0,
  numberOfFailedRequests: 0,
  numberOfActiveRequestsEver: 0,
  lastNumberOfActiveRequests: 0,
};

let priorityHeapLength = 20;
const requestHeap = new Heap({
  comparator: sortRequests,
});
requestHeap.maximumLength = priorityHeapLength;
requestHeap.reserve(priorityHeapLength);

const activeRequests = [];
let numberOfActiveRequestsByServer = {};

const pageUri =
  typeof document !== "undefined" ? new Uri(document.location.href) : new Uri();

const requestCompletedEvent = new Event();

/**
 * The request scheduler is used to track and constrain the number of active requests in order to prioritize incoming requests. The ability
 * to retain control over the number of requests in CesiumJS is important because due to events such as changes in the camera position,
 * a lot of new requests may be generated and a lot of in-flight requests may become redundant. The request scheduler manually constrains the
 * number of requests so that newer requests wait in a shorter queue and don't have to compete for bandwidth with requests that have expired.
 *
 * @namespace RequestScheduler
 *
 */
function RequestScheduler() {}

/**
 * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
 * @type {Number}
 * @default 50
 */
RequestScheduler.maximumRequests = 50;

/**
 * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
 * listed in {@link requestsByServer} do not observe this limit.
 * @type {Number}
 * @default 6
 */
RequestScheduler.maximumRequestsPerServer = 6;

/**
 * A per server key list of overrides to use for throttling instead of <code>maximumRequestsPerServer</code>
 * @type {Object}
 *
 * @example
 * RequestScheduler.requestsByServer = {
 *   'api.cesium.com:443': 18,
 *   'assets.cesium.com:443': 18
 * };
 */
RequestScheduler.requestsByServer = {
  "api.cesium.com:443": 18,
  "assets.cesium.com:443": 18,
};

/**
 * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
 * @type {Boolean}
 * @default true
 */
RequestScheduler.throttleRequests = true;

/**
 * When true, log statistics to the console every frame
 * @type {Boolean}
 * @default false
 * @private
 */
RequestScheduler.debugShowStatistics = false;

/**
 * An event that's raised when a request is completed.  Event handlers are passed
 * the error object if the request fails.
 *
 * @type {Event}
 * @default Event()
 * @private
 */
RequestScheduler.requestCompletedEvent = requestCompletedEvent;

Object.defineProperties(RequestScheduler, {
  /**
   * Returns the statistics used by the request scheduler.
   *
   * @memberof RequestScheduler
   *
   * @type Object
   * @readonly
   * @private
   */
  statistics: {
    get: function () {
      return statistics;
    },
  },

  /**
   * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
   *
   * @memberof RequestScheduler
   *
   * @type {Number}
   * @default 20
   * @private
   */
  priorityHeapLength: {
    get: function () {
      return priorityHeapLength;
    },
    set: function (value) {
      // If the new length shrinks the heap, need to cancel some of the requests.
      // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
      if (value < priorityHeapLength) {
        while (requestHeap.length > value) {
          const request = requestHeap.pop();
          cancelRequest(request);
        }
      }
      priorityHeapLength = value;
      requestHeap.maximumLength = value;
      requestHeap.reserve(value);
    },
  },
});

function updatePriority(request) {
  if (defined(request.priorityFunction)) {
    request.priority = request.priorityFunction();
  }
}

/**
 * Check if there are open slots for a particular server key. If desiredRequests is greater than 1, this checks if the queue has room for scheduling multiple requests.
 * @param {String} serverKey The server key returned by {@link RequestScheduler.getServerKey}.
 * @param {Number} [desiredRequests=1] How many requests the caller plans to request
 * @return {Boolean} True if there are enough open slots for <code>desiredRequests</code> more requests.
 * @private
 */
RequestScheduler.serverHasOpenSlots = function (serverKey, desiredRequests) {
  desiredRequests = defaultValue(desiredRequests, 1);

  const maxRequests = defaultValue(
    RequestScheduler.requestsByServer[serverKey],
    RequestScheduler.maximumRequestsPerServer
  );
  const hasOpenSlotsServer =
    numberOfActiveRequestsByServer[serverKey] + desiredRequests <= maxRequests;

  return hasOpenSlotsServer;
};

/**
 * Check if the priority heap has open slots, regardless of which server they
 * are from. This is used in {@link Multiple3DTileContent} for determining when
 * all requests can be scheduled
 * @param {Number} desiredRequests The number of requests the caller intends to make
 * @return {Boolean} <code>true</code> if the heap has enough available slots to meet the desiredRequests. <code>false</code> otherwise.
 *
 * @private
 */
RequestScheduler.heapHasOpenSlots = function (desiredRequests) {
  const hasOpenSlotsHeap =
    requestHeap.length + desiredRequests <= priorityHeapLength;
  return hasOpenSlotsHeap;
};

function issueRequest(request) {
  if (request.state === RequestState.UNISSUED) {
    request.state = RequestState.ISSUED;
    request.deferred = defer();
  }
  return request.deferred.promise;
}

function getRequestReceivedFunction(request) {
  return function (results) {
    if (request.state === RequestState.CANCELLED) {
      // If the data request comes back but the request is cancelled, ignore it.
      return;
    }
    // explicitly set to undefined to ensure GC of request response data. See #8843
    const deferred = request.deferred;

    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    requestCompletedEvent.raiseEvent();
    request.state = RequestState.RECEIVED;
    request.deferred = undefined;

    deferred.resolve(results);
  };
}

function getRequestFailedFunction(request) {
  return function (error) {
    if (request.state === RequestState.CANCELLED) {
      // If the data request comes back but the request is cancelled, ignore it.
      return;
    }
    ++statistics.numberOfFailedRequests;
    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    requestCompletedEvent.raiseEvent(error);
    request.state = RequestState.FAILED;
    request.deferred.reject(error);
  };
}

function startRequest(request) {
  const promise = issueRequest(request);
  request.state = RequestState.ACTIVE;
  activeRequests.push(request);
  ++statistics.numberOfActiveRequests;
  ++statistics.numberOfActiveRequestsEver;
  ++numberOfActiveRequestsByServer[request.serverKey];
  request
    .requestFunction()
    .then(getRequestReceivedFunction(request))
    .catch(getRequestFailedFunction(request));
  return promise;
}

function cancelRequest(request) {
  const active = request.state === RequestState.ACTIVE;
  request.state = RequestState.CANCELLED;
  ++statistics.numberOfCancelledRequests;
  // check that deferred has not been cleared since cancelRequest can be called
  // on a finished request, e.g. by clearForSpecs during tests
  if (defined(request.deferred)) {
    const deferred = request.deferred;
    request.deferred = undefined;
    deferred.reject();
  }

  if (active) {
    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    ++statistics.numberOfCancelledActiveRequests;
  }

  if (defined(request.cancelFunction)) {
    request.cancelFunction();
  }
}

/**
 * Sort requests by priority and start requests.
 * @private
 */
RequestScheduler.update = function () {
  let i;
  let request;

  // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
  let removeCount = 0;
  const activeLength = activeRequests.length;
  for (i = 0; i < activeLength; ++i) {
    request = activeRequests[i];
    if (request.cancelled) {
      // Request was explicitly cancelled
      cancelRequest(request);
    }
    if (request.state !== RequestState.ACTIVE) {
      // Request is no longer active, remove from array
      ++removeCount;
      continue;
    }
    if (removeCount > 0) {
      // Shift back to fill in vacated slots from completed requests
      activeRequests[i - removeCount] = request;
    }
  }
  activeRequests.length -= removeCount;

  // Update priority of issued requests and resort the heap
  const issuedRequests = requestHeap.internalArray;
  const issuedLength = requestHeap.length;
  for (i = 0; i < issuedLength; ++i) {
    updatePriority(issuedRequests[i]);
  }
  requestHeap.resort();

  // Get the number of open slots and fill with the highest priority requests.
  // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
  const openSlots = Math.max(
    RequestScheduler.maximumRequests - activeRequests.length,
    0
  );
  let filledSlots = 0;
  while (filledSlots < openSlots && requestHeap.length > 0) {
    // Loop until all open slots are filled or the heap becomes empty
    request = requestHeap.pop();
    if (request.cancelled) {
      // Request was explicitly cancelled
      cancelRequest(request);
      continue;
    }

    if (
      request.throttleByServer &&
      !RequestScheduler.serverHasOpenSlots(request.serverKey)
    ) {
      // Open slots are available, but the request is throttled by its server. Cancel and try again later.
      cancelRequest(request);
      continue;
    }

    startRequest(request);
    ++filledSlots;
  }

  updateStatistics();
};

/**
 * Get the server key from a given url.
 *
 * @param {String} url The url.
 * @returns {String} The server key.
 * @private
 */
RequestScheduler.getServerKey = function (url) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("url", url);
  //>>includeEnd('debug');

  let uri = new Uri(url);
  if (uri.scheme() === "") {
    uri = new Uri(url).absoluteTo(pageUri);
    uri.normalize();
  }

  let serverKey = uri.authority();
  if (!/:/.test(serverKey)) {
    // If the authority does not contain a port number, add port 443 for https or port 80 for http
    serverKey = `${serverKey}:${uri.scheme() === "https" ? "443" : "80"}`;
  }

  const length = numberOfActiveRequestsByServer[serverKey];
  if (!defined(length)) {
    numberOfActiveRequestsByServer[serverKey] = 0;
  }

  return serverKey;
};

/**
 * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
 * queued and sorted by priority before being sent.
 *
 * @param {Request} request The request object.
 *
 * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
 *
 * @private
 */
RequestScheduler.request = function (request) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("request", request);
  Check.typeOf.string("request.url", request.url);
  Check.typeOf.func("request.requestFunction", request.requestFunction);
  //>>includeEnd('debug');

  if (isDataUri(request.url) || isBlobUri(request.url)) {
    requestCompletedEvent.raiseEvent();
    request.state = RequestState.RECEIVED;
    return request.requestFunction();
  }

  ++statistics.numberOfAttemptedRequests;

  if (!defined(request.serverKey)) {
    request.serverKey = RequestScheduler.getServerKey(request.url);
  }

  if (
    RequestScheduler.throttleRequests &&
    request.throttleByServer &&
    !RequestScheduler.serverHasOpenSlots(request.serverKey)
  ) {
    // Server is saturated. Try again later.
    return undefined;
  }

  if (!RequestScheduler.throttleRequests || !request.throttle) {
    return startRequest(request);
  }

  if (activeRequests.length >= RequestScheduler.maximumRequests) {
    // Active requests are saturated. Try again later.
    return undefined;
  }

  // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
  // priority it will be returned.
  updatePriority(request);
  const removedRequest = requestHeap.insert(request);

  if (defined(removedRequest)) {
    if (removedRequest === request) {
      // Request does not have high enough priority to be issued
      return undefined;
    }
    // A previously issued request has been bumped off the priority heap, so cancel it
    cancelRequest(removedRequest);
  }

  return issueRequest(request);
};

function updateStatistics() {
  if (!RequestScheduler.debugShowStatistics) {
    return;
  }

  if (
    statistics.numberOfActiveRequests === 0 &&
    statistics.lastNumberOfActiveRequests > 0
  ) {
    if (statistics.numberOfAttemptedRequests > 0) {
      console.log(
        `Number of attempted requests: ${statistics.numberOfAttemptedRequests}`
      );
      statistics.numberOfAttemptedRequests = 0;
    }

    if (statistics.numberOfCancelledRequests > 0) {
      console.log(
        `Number of cancelled requests: ${statistics.numberOfCancelledRequests}`
      );
      statistics.numberOfCancelledRequests = 0;
    }

    if (statistics.numberOfCancelledActiveRequests > 0) {
      console.log(
        `Number of cancelled active requests: ${statistics.numberOfCancelledActiveRequests}`
      );
      statistics.numberOfCancelledActiveRequests = 0;
    }

    if (statistics.numberOfFailedRequests > 0) {
      console.log(
        `Number of failed requests: ${statistics.numberOfFailedRequests}`
      );
      statistics.numberOfFailedRequests = 0;
    }
  }

  statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests;
}

/**
 * For testing only. Clears any requests that may not have completed from previous tests.
 *
 * @private
 */
RequestScheduler.clearForSpecs = function () {
  while (requestHeap.length > 0) {
    const request = requestHeap.pop();
    cancelRequest(request);
  }
  const length = activeRequests.length;
  for (let i = 0; i < length; ++i) {
    cancelRequest(activeRequests[i]);
  }
  activeRequests.length = 0;
  numberOfActiveRequestsByServer = {};

  // Clear stats
  statistics.numberOfAttemptedRequests = 0;
  statistics.numberOfActiveRequests = 0;
  statistics.numberOfCancelledRequests = 0;
  statistics.numberOfCancelledActiveRequests = 0;
  statistics.numberOfFailedRequests = 0;
  statistics.numberOfActiveRequestsEver = 0;
  statistics.lastNumberOfActiveRequests = 0;
};

/**
 * For testing only.
 *
 * @private
 */
RequestScheduler.numberOfActiveRequestsByServer = function (serverKey) {
  return numberOfActiveRequestsByServer[serverKey];
};

/**
 * For testing only.
 *
 * @private
 */
RequestScheduler.requestHeap = requestHeap;
export default RequestScheduler;
