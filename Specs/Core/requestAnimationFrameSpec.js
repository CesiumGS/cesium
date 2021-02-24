import { cancelAnimationFrame } from "../../Source/Cesium.js";
import { requestAnimationFrame } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Core/requestAnimationFrame", function () {
  it("calls the callback", function () {
    var deferred = when.defer();
    var requestID = requestAnimationFrame(function () {
      deferred.resolve();
    });
    expect(requestID).toBeDefined();
    return deferred.promise;
  });

  it("provides a timestamp that increases each frame", function () {
    var deferred = when.defer();

    var callbackTimestamps = [];

    function callback(timestamp) {
      callbackTimestamps.push(timestamp);

      if (callbackTimestamps.length < 3) {
        requestAnimationFrame(callback);
      } else {
        expect(callbackTimestamps[0]).toBeLessThanOrEqualTo(
          callbackTimestamps[1]
        );
        expect(callbackTimestamps[1]).toBeLessThanOrEqualTo(
          callbackTimestamps[2]
        );
        deferred.resolve();
      }
    }

    requestAnimationFrame(callback);

    return deferred.promise;
  });

  it("can cancel a callback", function () {
    var deferred = when.defer();

    var shouldNotBeCalled = jasmine.createSpy("shouldNotBeCalled");

    var requestID = requestAnimationFrame(shouldNotBeCalled);
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
