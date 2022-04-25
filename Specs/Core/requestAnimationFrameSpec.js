import {
  cancelAnimationFrame,
  defer,
  requestAnimationFrame,
} from "../../Source/Cesium.js";

describe("Core/requestAnimationFrame", function () {
  it("calls the callback", function () {
    const promise = new Promise(requestAnimationFrame);
    return promise.then(function (requestId) {
      expect(requestId).toBeDefined();
    });
  });

  it("provides a timestamp that increases each frame", function () {
    const deferred = defer();

    const callbackTimestamps = [];

    function callback(timestamp) {
      callbackTimestamps.push(timestamp);

      if (callbackTimestamps.length < 3) {
        requestAnimationFrame(callback);
      } else {
        expect(callbackTimestamps[0]).toBeLessThanOrEqual(
          callbackTimestamps[1]
        );
        expect(callbackTimestamps[1]).toBeLessThanOrEqual(
          callbackTimestamps[2]
        );
        deferred.resolve();
      }
    }

    requestAnimationFrame(callback);

    return deferred.promise;
  });

  it("can cancel a callback", function () {
    const deferred = defer();

    const shouldNotBeCalled = jasmine.createSpy("shouldNotBeCalled");

    const requestID = requestAnimationFrame(shouldNotBeCalled);
    cancelAnimationFrame(requestID);

    // schedule and wait for another callback
    requestAnimationFrame(function () {
      // make sure cancelled callback didn't run
      expect(shouldNotBeCalled).not.toHaveBeenCalled();
      deferred.resolve();
    });

    return deferred.promise;
  });
});
