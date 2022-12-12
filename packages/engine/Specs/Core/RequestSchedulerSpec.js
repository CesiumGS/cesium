import { defer, Request, RequestScheduler, RequestState } from "../../index.js";

describe("Core/RequestScheduler", function () {
  let originalMaximumRequests;
  let originalMaximumRequestsPerServer;
  let originalPriorityHeapLength;
  let originalRequestsByServer;

  beforeAll(function () {
    originalMaximumRequests = RequestScheduler.maximumRequests;
    originalMaximumRequestsPerServer =
      RequestScheduler.maximumRequestsPerServer;
    originalPriorityHeapLength = RequestScheduler.priorityHeapLength;
    originalRequestsByServer = RequestScheduler.requestsByServer;
  });

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    RequestScheduler.requestsByServer = {};
  });

  afterEach(function () {
    RequestScheduler.maximumRequests = originalMaximumRequests;
    RequestScheduler.maximumRequestsPerServer = originalMaximumRequestsPerServer;
    RequestScheduler.priorityHeapLength = originalPriorityHeapLength;
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
    const server = RequestScheduler.getServerKey("https://test.invalid/1");
    expect(server).toEqual("test.invalid:443");
  });

  it("getServer with http", function () {
    const server = RequestScheduler.getServerKey("http://test.invalid/1");
    expect(server).toEqual("test.invalid:80");
  });

  it("honors maximumRequests", function () {
    RequestScheduler.maximumRequests = 2;
    const statistics = RequestScheduler.statistics;

    const deferreds = [];

    function requestFunction() {
      const deferred = defer();
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

    const promise1 = RequestScheduler.request(createRequest());
    const promise2 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    // Scheduler is full, promise3 will be undefined
    const promise3 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(statistics.numberOfActiveRequests).toBe(2);
    expect(promise1).toBeDefined();
    expect(promise2).toBeDefined();
    expect(promise3).not.toBeDefined();

    // Scheduler now has an empty slot, promise4 goes through
    deferreds[0].resolve();
    return promise1.then(function () {
      RequestScheduler.update();

      expect(statistics.numberOfActiveRequests).toBe(1);

      const promise4 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(statistics.numberOfActiveRequests).toBe(2);
      expect(promise4).toBeDefined();

      // Scheduler is full, promise5 will be undefined
      const promise5 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(statistics.numberOfActiveRequests).toBe(2);
      expect(promise5).not.toBeDefined();

      // maximumRequests increases, promise6 goes through
      RequestScheduler.maximumRequests = 3;
      const promise6 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(statistics.numberOfActiveRequests).toBe(3);
      expect(promise6).toBeDefined();

      RequestScheduler.update();

      const length = deferreds.length;
      for (let i = 0; i < length; ++i) {
        deferreds[i].resolve();
      }
      return Promise.all([promise2, promise4, promise6]);
    });
  });

  it("honors maximumRequestsPerServer", function () {
    RequestScheduler.maximumRequestsPerServer = 2;

    const deferreds = [];

    function requestFunction() {
      const deferred = defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    const url = "http://test.invalid/1";
    const server = RequestScheduler.getServerKey(url);

    function createRequest() {
      return new Request({
        url: url,
        requestFunction: requestFunction,
        throttleByServer: true,
      });
    }

    const promise1 = RequestScheduler.request(createRequest());
    const promise2 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    // Scheduler is full, promise3 will be undefined
    const promise3 = RequestScheduler.request(createRequest());
    RequestScheduler.update();

    expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
    expect(promise1).toBeDefined();
    expect(promise2).toBeDefined();
    expect(promise3).not.toBeDefined();

    // Scheduler now has an empty slot, promise4 goes through
    deferreds[0].resolve();
    return promise1.then(function () {
      RequestScheduler.update();

      expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(1);

      const promise4 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
      expect(promise4).toBeDefined();

      // Scheduler is full, promise5 will be undefined
      const promise5 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
      expect(promise5).not.toBeDefined();

      // maximumRequests increases, promise6 goes through
      RequestScheduler.maximumRequestsPerServer = 3;
      const promise6 = RequestScheduler.request(createRequest());
      RequestScheduler.update();

      expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(3);
      expect(promise6).toBeDefined();

      const length = deferreds.length;
      for (let i = 0; i < length; ++i) {
        deferreds[i].resolve();
      }
      RequestScheduler.update();
      return Promise.all([promise2, promise3, promise4, promise5, promise6]);
    });
  });

  it("honors priorityHeapLength", function () {
    const deferred = defer();
    const requests = [];

    function requestFunction() {
      return deferred.promise;
    }

    function createRequest(priority) {
      const request = new Request({
        url: "http://test.invalid/1",
        requestFunction: requestFunction,
        throttle: true,
        priority: priority,
      });
      requests.push(request);
      return request;
    }

    RequestScheduler.priorityHeapLength = 1;
    const firstRequest = createRequest(0.0);
    const promise = RequestScheduler.request(firstRequest).catch(function (
      error
    ) {
      // Request will be cancelled
      expect(error).toBeUndefined();
    });
    expect(promise).toBeDefined();
    const promise2 = RequestScheduler.request(createRequest(1.0));
    expect(promise2).toBeUndefined();

    RequestScheduler.priorityHeapLength = 3;
    const promise3 = RequestScheduler.request(createRequest(2.0));
    const promise4 = RequestScheduler.request(createRequest(3.0));
    expect(promise4).toBeDefined();
    const promise5 = RequestScheduler.request(createRequest(4.0));
    expect(promise5).toBeUndefined();

    // A request is cancelled to accommodate the new heap length
    RequestScheduler.priorityHeapLength = 2;
    expect(firstRequest.state).toBe(RequestState.CANCELLED);

    deferred.resolve();
    RequestScheduler.update();
    return Promise.all([promise, promise2, promise3, promise4, promise5]);
  });

  function testImmediateRequest(url, dataOrBlobUri) {
    const statistics = RequestScheduler.statistics;
    const deferred = defer();

    function requestFunction() {
      return deferred.promise;
    }

    const request = new Request({
      url: url,
      requestFunction: requestFunction,
    });

    const promise = RequestScheduler.request(request);
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

    deferred.resolve();

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
    const dataUri = "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D";
    return testImmediateRequest(dataUri, true);
  });

  it("blob uri goes through immediately", function () {
    const uint8Array = new Uint8Array(4);
    const blob = new Blob([uint8Array], {
      type: "application/octet-stream",
    });

    const blobUrl = window.URL.createObjectURL(blob);
    return testImmediateRequest(blobUrl, true);
  });

  it("request goes through immediately when throttle is false", function () {
    const url = "https://test.invalid/1";
    return testImmediateRequest(url, false);
  });

  it("makes a throttled request", function () {
    const deferreds = [];

    function requestFunction() {
      const deferred = defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    const request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    expect(request.state).toBe(RequestState.UNISSUED);

    const promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();
    expect(request.state).toBe(RequestState.ISSUED);

    RequestScheduler.update();
    expect(request.state).toBe(RequestState.ACTIVE);

    deferreds[0].resolve();
    return promise.then(function () {
      expect(request.state).toBe(RequestState.RECEIVED);
    });
  });

  it("cancels an issued request", function () {
    const statistics = RequestScheduler.statistics;

    function requestFunction() {
      return Promise.resolve();
    }

    const request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    const promise = RequestScheduler.request(request);
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
      .catch(function (error) {
        expect(request.state).toBe(RequestState.CANCELLED);
      });
  });

  it("cancels an active request", function () {
    const statistics = RequestScheduler.statistics;
    const cancelFunction = jasmine.createSpy("cancelFunction");

    function requestFunction() {
      return defer().promise;
    }

    const request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
      cancelFunction: cancelFunction,
    });

    const promise = RequestScheduler.request(request);
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
      .catch(function (error) {
        expect(request.state).toBe(RequestState.CANCELLED);
      });
  });

  it("handles request failure", function () {
    const statistics = RequestScheduler.statistics;
    const deferreds = [];

    function requestFunction() {
      const deferred = defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    const request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    const promise = RequestScheduler.request(request);
    expect(request.state).toBe(RequestState.ACTIVE);
    expect(statistics.numberOfActiveRequests).toBe(1);

    deferreds[0].reject("Request failed");
    return promise
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(error).toBe("Request failed");
      })
      .finally(function () {
        RequestScheduler.update();
        expect(statistics.numberOfActiveRequests).toBe(0);
      });
  });

  it("prioritizes requests", function () {
    let currentPriority = 0.0;

    function getRequestFunction(priority) {
      return function () {
        expect(priority).toBeGreaterThan(currentPriority);
        currentPriority = priority;
        return Promise.resolve();
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

    const length = RequestScheduler.priorityHeapLength;
    const promises = [];
    for (let i = 0; i < length; ++i) {
      const priority = Math.random();
      RequestScheduler.request(createRequest(priority));
    }

    RequestScheduler.update();
    expect(currentPriority).toBeGreaterThan(0.0); // Ensures that the expect in getRequestFunction is actually called
    return Promise.all(promises);
  });

  it("updates priority", function () {
    let invertPriority = false;

    function getPriorityFunction(priority) {
      return function () {
        if (invertPriority) {
          return 1.0 - priority;
        }
        return priority;
      };
    }

    function requestFunction() {
      return Promise.resolve();
    }

    function createRequest(priority) {
      return new Request({
        throttle: true,
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
        priorityFunction: getPriorityFunction(priority),
      });
    }

    let i;
    let request;
    const length = RequestScheduler.priorityHeapLength;
    for (i = 0; i < length; ++i) {
      const priority = i / (length - 1);
      request = createRequest(priority);
      request.testId = i;
      RequestScheduler.request(request);
    }

    // Update priorities while not letting any requests go through
    RequestScheduler.maximumRequests = 0;
    RequestScheduler.update();

    const requestHeap = RequestScheduler.requestHeap;
    const requests = [];
    let currentTestId = 0;
    while (requestHeap.length > 0) {
      request = requestHeap.pop();
      requests.push(request);
      expect(request.testId).toBeGreaterThanOrEqual(currentTestId);
      currentTestId = request.testId;
    }

    for (i = 0; i < length; ++i) {
      requestHeap.insert(requests[i]);
    }

    invertPriority = true;
    RequestScheduler.update();

    while (requestHeap.length > 0) {
      request = requestHeap.pop();
      expect(request.testId).toBeLessThanOrEqual(currentTestId);
      currentTestId = request.testId;
    }
  });

  it("handles low priority requests", function () {
    function requestFunction() {
      return Promise.resolve();
    }

    function createRequest(priority) {
      return new Request({
        throttle: true,
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
        priority: priority,
      });
    }

    const highPriority = 0.0;
    const mediumPriority = 0.5;
    const lowPriority = 1.0;

    const length = RequestScheduler.priorityHeapLength;
    const promises = [];
    for (let i = 0; i < length; ++i) {
      promises.push(RequestScheduler.request(createRequest(mediumPriority)));
    }

    // Heap is full so low priority request is not even issued
    let promise = RequestScheduler.request(createRequest(lowPriority));
    expect(promise).toBeUndefined();
    expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(0);

    // Heap is full so high priority request bumps off lower priority request
    promise = RequestScheduler.request(createRequest(highPriority));
    expect(promise).toBeDefined();
    expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(1);

    RequestScheduler.update();
    return Promise.all(promises)
      .catch(function (error) {
        // Ignore error from cancelled request
      })
      .then(function () {
        // High priority promise should successfully resolve
        return promise;
      });
  });

  it("unthrottled requests starve throttled requests", function () {
    const deferreds = [];

    function requestFunction() {
      const deferred = defer();
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

    const promises = [];
    const throttledRequest = createRequest(true);
    promises.push(RequestScheduler.request(throttledRequest));

    for (let i = 0; i < RequestScheduler.maximumRequests; ++i) {
      promises.push(RequestScheduler.request(createRequest(false)));
    }
    RequestScheduler.update();

    expect(throttledRequest.state).toBe(RequestState.ISSUED);

    // Resolve one of the unthrottled requests
    deferreds[0].resolve();
    return deferreds[0].promise.then(function () {
      RequestScheduler.update();
      expect(throttledRequest.state).toBe(RequestState.ACTIVE);

      const length = deferreds.length;
      for (let i = 0; i < length; ++i) {
        deferreds[i].resolve();
      }
      return Promise.all(deferreds).catch(function (error) {
        expect(error).toBe(true);
      });
    });
  });

  it("request throttled by server is cancelled", function () {
    const deferreds = [];
    const promises = [];

    function requestFunction() {
      const deferred = defer();
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

    for (let i = 0; i < RequestScheduler.maximumRequestsPerServer - 1; ++i) {
      promises.push(RequestScheduler.request(createRequest(false)));
    }

    const throttledRequest = createRequest(true);
    promises.push(RequestScheduler.request(throttledRequest));
    promises.push(RequestScheduler.request(createRequest(false)));

    RequestScheduler.update();
    expect(throttledRequest.state).toBe(RequestState.CANCELLED);

    const length = deferreds.length;
    for (let i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
    return Promise.all(promises).catch(function (e) {
      // Ignore cancelled request errors
    });
  });

  it("does not throttle requests when throttleRequests is false", function () {
    RequestScheduler.maximumRequests = 0;

    function requestFunction() {
      return Promise.resolve();
    }

    RequestScheduler.throttleRequests = true;
    let request = new Request({
      throttle: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    let promise = RequestScheduler.request(request);
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
    return promise;
  });

  it("does not throttle requests by server when throttleRequests is false", function () {
    RequestScheduler.maximumRequestsPerServer = 0;

    function requestFunction() {
      return Promise.resolve();
    }

    RequestScheduler.throttleRequests = true;
    let request = new Request({
      throttleByServer: true,
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });
    let promise = RequestScheduler.request(request);
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
    return promise;
  });

  it("debugShowStatistics", function () {
    spyOn(console, "log");
    RequestScheduler.debugShowStatistics = true;

    const deferreds = [];
    const promises = [];

    function requestFunction() {
      const deferred = defer();
      deferreds.push(deferred);
      return deferred.promise;
    }

    function createRequest() {
      return new Request({
        url: "https://test.invalid/1",
        requestFunction: requestFunction,
      });
    }

    const requests = [createRequest(), createRequest(), createRequest()];
    promises.push(RequestScheduler.request(requests[0]));
    promises.push(RequestScheduler.request(requests[1]));
    promises.push(RequestScheduler.request(requests[2]));
    RequestScheduler.update();

    deferreds[0].reject();
    requests[0].cancel();
    requests[1].cancel();
    requests[2].cancel();

    return Promise.all(
      requests.map(function (request) {
        return request.deferred;
      })
    ).finally(function () {
      RequestScheduler.update();

      expect(console.log).toHaveBeenCalledWith(
        "Number of attempted requests: 3"
      );
      expect(console.log).toHaveBeenCalledWith(
        "Number of cancelled requests: 3"
      );
      expect(console.log).toHaveBeenCalledWith(
        "Number of cancelled active requests: 2"
      );
      expect(console.log).toHaveBeenCalledWith("Number of failed requests: 1");

      RequestScheduler.debugShowStatistics = false;

      const length = deferreds.length;
      for (let i = 0; i < length; ++i) {
        deferreds[i].resolve();
      }
      return Promise.all(promises).catch(function (e) {
        // Ignore the canceled and rejected failures
      });
    });
  });

  it("successful request causes requestCompletedEvent to be raised", function () {
    let deferred;

    function requestFunction() {
      deferred = defer();
      return deferred.promise;
    }

    const request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    const promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    let eventRaised = false;
    const removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    deferred.resolve();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("successful data request causes requestCompletedEvent to be raised", function () {
    let deferred;

    function requestFunction() {
      deferred = defer();
      return deferred.promise;
    }

    const request = new Request({
      url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D",
      requestFunction: requestFunction,
    });

    let eventRaised = false;
    const removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    const promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.resolve();
    RequestScheduler.update();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("successful blob request causes requestCompletedEvent to be raised", function () {
    let deferred;

    function requestFunction() {
      deferred = defer();
      return deferred.promise;
    }

    const uint8Array = new Uint8Array(4);
    const blob = new Blob([uint8Array], {
      type: "application/octet-stream",
    });

    const blobUrl = window.URL.createObjectURL(blob);

    const request = new Request({
      url: blobUrl,
      requestFunction: requestFunction,
    });

    let eventRaised = false;
    const removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    const promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.resolve();
    RequestScheduler.update();

    return promise
      .then(function () {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("unsuccessful requests raise requestCompletedEvent with error", function () {
    let deferred;
    function requestFunction() {
      deferred = defer();
      return deferred.promise;
    }

    const request = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestFunction,
    });

    let eventRaised = false;
    const removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function (error) {
        eventRaised = true;
        expect(error).toBeDefined();
      }
    );

    const promise = RequestScheduler.request(request);
    expect(promise).toBeDefined();

    deferred.reject({
      error: "error",
    });
    RequestScheduler.update();

    return promise
      .then(function () {
        fail();
      })
      .catch(function (e) {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("canceled requests do not cause requestCompletedEvent to be raised", function () {
    let cancelDeferred;
    function requestCancelFunction() {
      cancelDeferred = defer();
      return cancelDeferred.promise;
    }

    const requestToCancel = new Request({
      url: "https://test.invalid/1",
      requestFunction: requestCancelFunction,
    });

    const promise = RequestScheduler.request(requestToCancel);

    const removeListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
      function () {
        fail("should not be called");
      }
    );

    requestToCancel.cancel();
    RequestScheduler.update();
    cancelDeferred.resolve();
    removeListenerCallback();
    return promise
      .then(function () {
        fail();
      })
      .catch(function (error) {
        expect(error).toBeUndefined();
      });
  });

  it("RequestScheduler.requestsByServer allows for custom maximum requests", function () {
    let promise;
    const promises = [];

    RequestScheduler.requestsByServer["test.invalid:80"] = 23;

    const deferred = defer();
    for (let i = 0; i < 23; i++) {
      promise = RequestScheduler.request(
        new Request({
          url: "http://test.invalid/1",
          throttle: true,
          throttleByServer: true,
          requestFunction: function () {
            return deferred.promise;
          },
        })
      );
      RequestScheduler.update();
      expect(promise).toBeDefined();
      promises.push(promise);
    }

    promise = RequestScheduler.request(
      new Request({
        url: "http://test.invalid/1",
        throttle: true,
        throttleByServer: true,
        requestFunction: function () {
          return defer();
        },
      })
    );
    expect(promise).toBeUndefined();

    deferred.resolve();
    return Promise.all(promises);
  });

  it("serverHasOpenSlots works for single requests", function () {
    const deferreds = [];
    const promises = [];

    function requestFunction() {
      const deferred = defer();
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
    promises.push(RequestScheduler.request(createRequest()));
    promises.push(RequestScheduler.request(createRequest()));
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80")).toBe(true);

    promises.push(RequestScheduler.request(createRequest()));
    promises.push(RequestScheduler.request(createRequest()));
    promises.push(RequestScheduler.request(createRequest()));
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80")).toBe(false);

    const length = deferreds.length;
    for (let i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
    return Promise.all(promises).catch(function (e) {
      expect(e).toBe(true);
    });
  });

  it("serverHasOpenSlots works for multiple requests on a single server", function () {
    const deferreds = [];
    const promises = [];

    function requestFunction() {
      const deferred = defer();
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
    promises.push(RequestScheduler.request(createRequest()));
    promises.push(RequestScheduler.request(createRequest()));
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80", 3)).toBe(
      true
    );
    expect(RequestScheduler.serverHasOpenSlots("test.invalid:80", 4)).toBe(
      false
    );

    const length = deferreds.length;
    for (let i = 0; i < length; ++i) {
      deferreds[i].resolve();
    }
    return Promise.all(promises);
  });
});
