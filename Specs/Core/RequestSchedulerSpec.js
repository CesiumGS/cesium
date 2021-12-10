import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { RequestState } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Core/RequestScheduler", function () {
  var originalMaximumRequests;
  var originalMaximumRequestsPerServer;
  var originalPriorityQueueLength;
  var originalRequestsByServer;

  beforeAll(function () {
    originalMaximumRequests = RequestScheduler.maximumRequests;
    originalMaximumRequestsPerServer =
      RequestScheduler.maximumRequestsPerServer;
    originalPriorityQueueLength = RequestScheduler.priorityQueueLength;
    originalRequestsByServer = RequestScheduler.requestsByServer;
  });

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    RequestScheduler.requestsByServer = {};
  });

  afterEach(function () {
    RequestScheduler.maximumRequests = originalMaximumRequests;
    RequestScheduler.maximumRequestsPerServer = originalMaximumRequestsPerServer;
    RequestScheduler.priorityQueueLength = originalPriorityQueueLength;
    RequestScheduler.requestsByServer = originalRequestsByServer;
  });

  it("request throws when request is undefined", function () {
    expect(function () {
      RequestScheduler.request();
    }).toThrowDeveloperError();
  });

  it("request throws when request.url is undefined", function () {
    expect(function () {
      RequestScheduler.request(
        new Request({
          requestFunction: function (url) {
            return undefined;
          },
        })
      );
    }).toThrowDeveloperError();
  });

  it("request throws when request.requestFunction is undefined", function () {
    expect(function () {
      RequestScheduler.request(
        new Request({
          url: "file/path",
        })
      );
    }).toThrowDeveloperError();
  });

  it("getServer throws if url is undefined", function () {
    expect(function () {
      RequestScheduler.getServerKey();
    }).toThrowDeveloperError();
  });

  it("getServer with https", function () {
    var server = RequestScheduler.getServerKey("https://test.invalid/1");
    expect(server).toEqual("test.invalid:443");
  });

  it("getServer with http", function () {
    var server = RequestScheduler.getServerKey("http://test.invalid/1");
    expect(server).toEqual("test.invalid:80");
  });

  it("honors maximumRequests", function () {
    RequestScheduler.maximumRequests = 2;
    var statistics = RequestScheduler.statistics;

    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest() {
      return new Request({
        url: "http://test.invalid/1",
        requestFunction: requestFunction,
        throttle: true,
      });
    }

    var promise1 = RequestScheduler.request(createRequest());
    var promise2 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    // Scheduler is full, promise3 will be undefined
    var promise3 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(2);
    expect(promise1).toBeDefined();
    expect(promise2).toBeDefined();
    expect(promise3).not.toBeDefined();

    // Scheduler now has an empty slot, promise4 goes through
    deferreds[0].resolve();
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(1);

    var promise4 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(2);
    expect(promise4).toBeDefined();

    // Scheduler is full, promise5 will be undefined
    var promise5 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(2);
    expect(promise5).not.toBeDefined();

    // maximumRequests increases, promise6 goes through
    RequestScheduler.maximumRequests = 3;
    var promise6 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(3);
    expect(promise6).toBeDefined();

    var length = deferreds.length;
    for (var i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
  });

  it("honors maximumRequestsPerServer", function () {
    RequestScheduler.maximumRequestsPerServer = 2;

    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    var url = "http://test.invalid/1";
    var server = RequestScheduler.getServerKey(url);

    function createRequest() {
      return new Request({
        url: url,
        requestFunction: requestFunction,
        throttleByServer: true,
      });
    }

    var promise1 = RequestScheduler.request(createRequest());
    var promise2 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    // Scheduler is full, promise3 will be undefined
    var promise3 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
    expect(promise1).toBeDefined();
    expect(promise2).toBeDefined();
    expect(promise3).not.toBeDefined();

    // Scheduler now has an empty slot, promise4 goes through
    deferreds[0].resolve();
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(1);

    var promise4 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
    expect(promise4).toBeDefined();

    // Scheduler is full, promise5 will be undefined
    var promise5 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
    expect(promise5).not.toBeDefined();

    // maximumRequests increases, promise6 goes through
    RequestScheduler.maximumRequestsPerServer = 3;
    var promise6 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(3);
    expect(promise6).toBeDefined();

    var length = deferreds.length;
    for (var i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
  });

  it("honors priorityQueueLength", function () {
    var deferreds = [];
    var requests = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest(priority) {
      var request = new Request({
        url: "http://test.invalid/1",
        requestFunction: requestFunction,
        throttle: true,
        priority: priority,
      });
      requests.push(request);
      return request;
    }

    RequestScheduler.priorityQueueLength = 1;
    var firstRequest = createRequest(0.0);
    var promise = RequestScheduler.request(firstRequest);
    expect(promise).toBeDefined();
    promise = RequestScheduler.request(createRequest(1.0));
    expect(promise).toBeUndefined();

    RequestScheduler.priorityQueueLength = 3;
    promise = RequestScheduler.request(createRequest(2.0));
    var lastRequest = createRequest(3.0);
    promise = RequestScheduler.request(lastRequest);
    expect(promise).toBeDefined();
    promise = RequestScheduler.request(createRequest(4.0));
    expect(promise).toBeUndefined();

    // A request is cancelled to accommodate the new queue length
    RequestScheduler.priorityQueueLength = 2;
    expect(lastRequest.state).toBe(RequestState.CANCELLED);

    var length = deferreds.length;
    for (var i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
  });

  function testImmediateRequest(url, dataOrBlobUri) {
    var statistics = RequestScheduler.statistics;
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    var request = new Request({
      url: url,
      requestFunction: requestFunction,
    });

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    if (dataOrBlobUri) {
      expect(request.serverKey).toBeUndefined();
      expect(statistics.numberOfActiveRequests).toBe(0);
    } else {
      expect(statistics.numberOfActiveRequests).toBe(1);
      expect(
        RequestScheduler.numberOfActiveRequestsByServer(request.serverKey)
      ).toBe(1);
    }

    deferreds[0].resolve();

    return promise.then(function () {
      expect(request.state).toBe(RequestState.RECEIVED);
      expect(statistics.numberOfActiveRequests).toBe(0);
      if (!dataOrBlobUri) {
        expect(
          RequestScheduler.numberOfActiveRequestsByServer(request.serverKey)
        ).toBe(0);
      }
    });
  }

  it("data uri goes through immediately", function () {
    var dataUri = "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D";
    testImmediateRequest(dataUri, true);
  });

  it("blob uri goes through immediately", function () {
    var uint8Array = new Uint8Array(4);
    var blob = new Blob([uint8Array], {
      type: "application/octet-stream",
    });

    var blobUrl = window.URL.createObjectURL(blob);
    testImmediateRequest(blobUrl, true);
  });

  it("request goes through immediately when throttle is false", function () {
    var url = "https://test.invalid/1";
    testImmediateRequest(url, false);
  });

  it("makes a throttled request", function () {
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    var request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    expect(request.state).toBe(RequestState.UNISSUED);

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();
    expect(request.state).toBe(RequestState.ISSUED);

    RequestScheduler.update();
    expect(request.state).toBe(RequestState.ACTIVE);

    deferreds[0].resolve();
    expect(request.state).toBe(RequestState.RECEIVED);
  });

  it("cancels an issued request", function () {
    var statistics = RequestScheduler.statistics;

    function requestFunction() {
      return when.resolve();
    }

    var request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    var promise = RequestScheduler.request(request);
    expect(request.state).toBe(RequestState.ISSUED);

    request.cancel();
    RequestScheduler.update();

    expect(request.state).toBe(RequestState.CANCELLED);
    expect(statistics.numberOfCancelledRequests).toBe(1);
    expect(statistics.numberOfCancelledActiveRequests).toBe(0);

    return promise
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(request.state).toBe(RequestState.CANCELLED);
      });
  });

  it("cancels an active request", function () {
    var statistics = RequestScheduler.statistics;
    var cancelFunction = jasmine.createSpy("cancelFunction");

    function requestFunction() {
      return when.defer().promise;
    }

    var request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
      cancelFunction: cancelFunction,
    });

    var promise = RequestScheduler.request(request);
    RequestScheduler.update();
    expect(request.state).toBe(RequestState.ACTIVE);

    request.cancel();
    RequestScheduler.update();

    expect(request.state).toBe(RequestState.CANCELLED);
    expect(statistics.numberOfCancelledRequests).toBe(1);
    expect(statistics.numberOfCancelledActiveRequests).toBe(1);
    expect(
      RequestScheduler.numberOfActiveRequestsByServer(request.serverKey)
    ).toBe(0);
    expect(cancelFunction).toHaveBeenCalled();

    return promise
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(request.state).toBe(RequestState.CANCELLED);
      });
  });

  it("handles request failure", function () {
    var statistics = RequestScheduler.statistics;
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    var request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    var promise = RequestScheduler.request(request);
    expect(request.state).toBe(RequestState.ACTIVE);
    expect(statistics.numberOfActiveRequests).toBe(1);

    deferreds[0].reject("Request failed");
    RequestScheduler.update();
    expect(statistics.numberOfActiveRequests).toBe(0);

    return promise
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBe("Request failed");
      });
  });

  it("prioritizes requests", function () {
    var currentPriority = 0.0;

    function getRequestFunction(priority) {
      return function () {
        expect(priority).toBeGreaterThan(currentPriority);
        currentPriority = priority;
        return when.resolve();
      };
    }

    function createRequest(priority) {
      return new Request({
        throttle: true,
        url: "https://test.invalid/1",
        requestFunction: getRequestFunction(priority),
        priority: priority,
      });
    }

    var length = RequestScheduler.priorityQueueLength;
    for (var i = 0; i < length; ++i) {
      var priority = Math.random();
      RequestScheduler.request(createRequest(priority));
    }

    RequestScheduler.update();
    expect(currentPriority).toBeGreaterThan(0.0); // Ensures that the expect in getRequestFunction is actually called
  });

  it("updates priority", function () {
    var invertPriority = false;

    function getPriorityFunction(priority) {
      return function () {
        if (invertPriority) {
          return 1.0 - priority;
        }
        return priority;
      };
    }

    function requestFunction() {
      return when.resolve();
    }

    function createRequest(priority) {
      return new Request({
        throttle: true,
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
        priorityFunction: getPriorityFunction(priority),
      });
    }

    var i;
    var request;
    var length = RequestScheduler.priorityQueueLength;
    for (i = 0; i < length; ++i) {
      var priority = i / (length - 1);
      request = createRequest(priority);
      request.testId = i;
      RequestScheduler.request(request);
    }

    // Update priorities while not letting any requests go through
    RequestScheduler.maximumRequests = 0;
    RequestScheduler.update();

    var requestQueue = RequestScheduler.requestQueue;
    var requests = [];
    var currentTestId = 0;
    while (requestQueue.length > 0) {
      request = requestQueue.removeMaximum();
      requests.push(request);
      expect(request.testId).toBeGreaterThanOrEqualTo(currentTestId);
      currentTestId = request.testId;
    }

    for (i = 0; i < length; ++i) {
      requestQueue.insert(requests[i]);
    }

    invertPriority = true;
    RequestScheduler.update();

    while (requestQueue.length > 0) {
      request = requestQueue.removeMaximum();
      expect(request.testId).toBeLessThanOrEqualTo(currentTestId);
      currentTestId = request.testId;
    }
  });

  it("handles low priority requests", function () {
    function requestFunction() {
      return when.resolve();
    }

    function createRequest(priority) {
      return new Request({
        throttle: true,
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
        priority: priority,
      });
    }

    var highPriority = 0.0;
    var mediumPriority = 0.5;
    var lowPriority = 1.0;

    var length = RequestScheduler.priorityQueueLength;
    for (var i = 0; i < length; ++i) {
      RequestScheduler.request(createRequest(mediumPriority));
    }

    // Queue is full so low priority request is not even issued
    var promise = RequestScheduler.request(createRequest(lowPriority));
    expect(promise).toBeUndefined();
    expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(0);

    // Queue is full so high priority request bumps off lower priority request
    promise = RequestScheduler.request(createRequest(highPriority));
    expect(promise).toBeDefined();
    expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(1);
  });

  it("unthrottled requests starve throttled requests", function () {
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest(throttle) {
      return new Request({
        url: "http://test.invalid/1",
        requestFunction: requestFunction,
        throttle: throttle,
      });
    }

    var throttledRequest = createRequest(true);
    RequestScheduler.request(throttledRequest);

    for (var i = 0; i < RequestScheduler.maximumRequests; ++i) {
      RequestScheduler.request(createRequest(false));
    }
    RequestScheduler.update();

    expect(throttledRequest.state).toBe(RequestState.ISSUED);

    // Resolve one of the unthrottled requests
    deferreds[0].resolve();
    RequestScheduler.update();
    expect(throttledRequest.state).toBe(RequestState.ACTIVE);

    var length = deferreds.length;
    for (var j = 0; j < length; ++j) {
      deferreds[j].resolve();
    }
  });

  it("request throttled by server is cancelled", function () {
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest(throttleByServer) {
      return new Request({
        url: "http://test.invalid/1",
        requestFunction: requestFunction,
        throttle: throttleByServer,
        throttleByServer: throttleByServer,
      });
    }

    for (var i = 0; i < RequestScheduler.maximumRequestsPerServer - 1; ++i) {
      RequestScheduler.request(createRequest(false));
    }

    var throttledRequest = createRequest(true);
    RequestScheduler.request(throttledRequest);
    RequestScheduler.request(createRequest(false));

    RequestScheduler.update();
    expect(throttledRequest.state).toBe(RequestState.CANCELLED);

    var length = deferreds.length;
    for (var j = 0; j < length; ++j) {
      deferreds[j].resolve();
    }
  });

  it("does not throttle requests when throttleRequests is false", function () {
    RequestScheduler.maximumRequests = 0;

    function requestFunction() {
      return when.resolve();
    }

    RequestScheduler.throttleRequests = true;
    var request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    var promise = RequestScheduler.request(request);
    expect(promise).toBeUndefined();

    RequestScheduler.throttleRequests = false;
    request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    RequestScheduler.throttleRequests = true;
  });

  it("does not throttle requests by server when throttleRequests is false", function () {
    RequestScheduler.maximumRequestsPerServer = 0;

    function requestFunction() {
      return when.resolve();
    }

    RequestScheduler.throttleRequests = true;
    var request = new Request({
      throttleByServer: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    var promise = RequestScheduler.request(request);
    expect(promise).toBeUndefined();

    RequestScheduler.throttleRequests = false;
    request = new Request({
      throttleByServer: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    RequestScheduler.throttleRequests = true;
  });

  it("debugShowStatistics", function () {
    spyOn(console, "log");
    RequestScheduler.debugShowStatistics = true;

    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest() {
      return new Request({
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
      });
    }

    var requests = [createRequest(), createRequest(), createRequest()];
    RequestScheduler.request(requests[0]);
    RequestScheduler.request(requests[1]);
    RequestScheduler.request(requests[2]);
    RequestScheduler.update();

    deferreds[0].reject();
    requests[0].cancel();
    requests[1].cancel();
    requests[2].cancel();
    RequestScheduler.update();

    expect(console.log).toHaveBeenCalledWith("Number of attempted requests: 3");
    expect(console.log).toHaveBeenCalledWith("Number of cancelled requests: 3");
    expect(console.log).toHaveBeenCalledWith(
      "Number of cancelled active requests: 2"
    );
    expect(console.log).toHaveBeenCalledWith("Number of failed requests: 1");

    var length = deferreds.length;
    for (var i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }

    RequestScheduler.debugShowStatistics = false;
  });

  it("successful request causes requestCompletedEvent to be raised", function () {
    var deferred;

    function requestFunction() {
      deferred = when.defer();
      return deferred.promise;
    }

    var request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    var eventRaised = false;
    var removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    deferred.resolve();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .always(function () {
        removeListenerCallback();
      });
  });

  it("successful data request causes requestCompletedEvent to be raised", function () {
    var deferred;

    function requestFunction() {
      deferred = when.defer();
      return deferred.promise;
    }

    var request = new Request({
      url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D",
      requestFunction: requestFunction,
    });

    var eventRaised = false;
    var removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.resolve();
    RequestScheduler.update();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .always(function () {
        removeListenerCallback();
      });
  });

  it("successful blob request causes requestCompletedEvent to be raised", function () {
    var deferred;

    function requestFunction() {
      deferred = when.defer();
      return deferred.promise;
    }

    var uint8Array = new Uint8Array(4);
    var blob = new Blob([uint8Array], {
      type: "application/octet-stream",
    });

    var blobUrl = window.URL.createObjectURL(blob);

    var request = new Request({
      url: blobUrl,
      requestFunction: requestFunction,
    });

    var eventRaised = false;
    var removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.resolve();
    RequestScheduler.update();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .always(function () {
        removeListenerCallback();
      });
  });

  it("unsuccessful requests raise requestCompletedEvent with error", function () {
    var deferred;
    function requestFunction() {
      deferred = when.defer();
      return deferred.promise;
    }

    var request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    var eventRaised = false;
    var removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function (error) {
        eventRaised = true;
        expect(error).toBeDefined();
      }
    );

    var promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.reject({
      error: "error",
    });
    RequestScheduler.update();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .always(function () {
        removeListenerCallback();
      });
  });

  it("canceled requests do not cause requestCompletedEvent to be raised", function () {
    var cancelDeferred;
    function requestCancelFunction() {
      cancelDeferred = when.defer();
      return cancelDeferred.promise;
    }

    var requestToCancel = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestCancelFunction,
    });

    RequestScheduler.request(requestToCancel);

    var removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        fail("should not be called");
      }
    );

    requestToCancel.cancel();
    RequestScheduler.update();
    cancelDeferred.resolve();
    removeListenerCallback();
  });

  it("RequestScheduler.requestsByServer allows for custom maximum requests", function () {
    var promise;

    RequestScheduler.requestsByServer["test.invalid:80"] = 23;

    for (var i = 0; i < 23; i++) {
      promise = RequestScheduler.request(
        new Request({
          url: "http://test.invalid/1",
          throttle: true,
          throttleByServer: true,
          requestFunction: function () {
            return when.defer();
          },
        })
      );
      RequestScheduler.update();
      expect(promise).toBeDefined();
    }

    promise = RequestScheduler.request(
      new Request({
        url: "http://test.invalid/1",
        throttle: true,
        throttleByServer: true,
        requestFunction: function () {
          return when.defer();
        },
      })
    );
    expect(promise).toBeUndefined();
  });

  it("serverHasOpenSlots works for single requests", function () {
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest() {
      return new Request({
        url: "https://test.invalid:80/1",
        requestFunction: requestFunction,
      });
    }

    RequestScheduler.maximumRequestsPerServer = 5;
    RequestScheduler.request(createRequest());
    RequestScheduler.request(createRequest());
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80")).toBe(true);

    RequestScheduler.request(createRequest());
    RequestScheduler.request(createRequest());
    RequestScheduler.request(createRequest());
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80")).toBe(false);
  });

  it("serverHasOpenSlots works for multiple requests on a single server", function () {
    var deferreds = [];

    function requestFunction() {
      var deferred = when.defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest() {
      return new Request({
        url: "https://test.invalid:80/1",
        requestFunction: requestFunction,
      });
    }

    RequestScheduler.maximumRequestsPerServer = 5;
    RequestScheduler.request(createRequest());
    RequestScheduler.request(createRequest());
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80", 3)).toBe(
      true
    );
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80", 4)).toBe(
      false
    );
  });
});
