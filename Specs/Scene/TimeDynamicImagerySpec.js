import { Clock } from "../../Source/Cesium.js";
import { ClockStep } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { RequestType } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { TimeDynamicImagery } from "../../Source/Cesium.js";

describe("Scene/TimeDynamicImagery", function () {
  const clock = new Clock({
    clockStep: ClockStep.TICK_DEPENDENT,
    shouldAnimate: true,
  });

  const times = TimeIntervalCollection.fromIso8601({
    iso8601: "2017-04-26/2017-04-30/P1D",
    dataCallback: function (interval, index) {
      return {
        Time: JulianDate.toIso8601(interval.start),
      };
    },
  });

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    clock.currentTime = JulianDate.fromIso8601("2017-04-26");
  });

  it("clock is required", function () {
    expect(function () {
      return new TimeDynamicImagery({
        times: times,
        requestImageFunction: function () {},
        reloadFunction: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("times is required", function () {
    expect(function () {
      return new TimeDynamicImagery({
        clock: clock,
        requestImageFunction: function () {},
        reloadFunction: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("requestImageFunction is required", function () {
    expect(function () {
      return new TimeDynamicImagery({
        clock: clock,
        times: times,
        reloadFunction: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("reloadFunction is required", function () {
    expect(function () {
      return new TimeDynamicImagery({
        clock: clock,
        times: times,
        requestImageFunction: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("initialization", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: function () {},
      reloadFunction: function () {},
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);

    expect(timeDynamicImagery._tileCache).toEqual({});
    expect(timeDynamicImagery._tilesRequestedForInterval).toEqual([]);

    expect(timeDynamicImagery._clock).toBe(options.clock);
    expect(timeDynamicImagery._times).toBe(options.times);
    expect(timeDynamicImagery._requestImageFunction).toBe(
      options.requestImageFunction
    );
    expect(timeDynamicImagery._reloadFunction).toBe(options.reloadFunction);
    expect(timeDynamicImagery._currentIntervalIndex).toEqual(0);
  });

  it("changing clock causes reload", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: function () {},
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);
    timeDynamicImagery.clock = new Clock();
    expect(options.reloadFunction).toHaveBeenCalled();
  });

  it("changing times causes reload", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: function () {},
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);
    timeDynamicImagery.times = new TimeIntervalCollection();
    expect(options.reloadFunction).toHaveBeenCalled();
  });

  it("clock.tick() causes reload", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: jasmine.createSpy(),
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);
    const request = new Request();
    timeDynamicImagery.checkApproachingInterval(0, 1, 2, request);

    clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:59Z");
    clock.tick();

    expect(options.requestImageFunction).not.toHaveBeenCalled();
    expect(options.reloadFunction).toHaveBeenCalled();
  });

  it("clock.tick() causes preload", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve()),
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);
    options.reloadFunction.calls.reset(); // Constructor calls reload

    const request = new Request({
      throttle: false,
      throttleByServer: true,
      type: RequestType.IMAGERY,
    });
    timeDynamicImagery.checkApproachingInterval(0, 1, 2, request);

    clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:56Z");
    clock.tick();

    expect(options.requestImageFunction).toHaveBeenCalledWith(
      0,
      1,
      2,
      request,
      times.get(1)
    );
    expect(timeDynamicImagery._tileCache[1]["0-1-2"]).toBeDefined();
    expect(options.reloadFunction).not.toHaveBeenCalled();
  });

  it("checkApproachingInterval causes preload", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve()),
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);
    options.reloadFunction.calls.reset(); // Constructor calls reload

    const request = new Request({
      throttle: false,
      throttleByServer: true,
      type: RequestType.IMAGERY,
    });

    clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:56Z");
    timeDynamicImagery.checkApproachingInterval(0, 1, 2, request);

    expect(options.requestImageFunction).toHaveBeenCalledWith(
      0,
      1,
      2,
      request,
      times.get(1)
    );
    expect(timeDynamicImagery._tileCache[1]["0-1-2"]).toBeDefined();
    expect(options.reloadFunction).not.toHaveBeenCalled();
  });

  it("checkApproachingInterval limits number of requests", function () {
    const options = {
      clock: clock,
      times: times,
      requestImageFunction: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve()),
      reloadFunction: jasmine.createSpy(),
    };
    const timeDynamicImagery = new TimeDynamicImagery(options);

    const request = new Request({
      throttle: true,
      throttleByServer: true,
      type: RequestType.IMAGERY,
    });

    let count = 0;
    for (let level = 0; level < 15; ++level) {
      for (let x = 0; x < level + 1; ++x) {
        for (let y = 0; y < level + 1; ++y) {
          timeDynamicImagery.checkApproachingInterval(x, y, level, request);
          ++count;

          if (count === 512) {
            count = 256;
          }

          expect(timeDynamicImagery._tilesRequestedForInterval.length).toEqual(
            count
          );
          expect(
            timeDynamicImagery._tilesRequestedForInterval[count - 1].key
          ).toEqual(`${x}-${y}-${level}`);
        }
      }
    }
  });
});
