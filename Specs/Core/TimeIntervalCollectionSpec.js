import { defaultValue } from "../../Source/Cesium.js";
import { Iso8601 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { TimeStandard } from "../../Source/Cesium.js";

describe("Core/TimeIntervalCollection", function () {
  function defaultDataCallback(interval, index) {
    return index;
  }

  function iso8601ToJulianDateArray(iso8601Dates) {
    const julianDates = [];
    for (let i = 0; i < iso8601Dates.length; ++i) {
      julianDates[i] = JulianDate.fromIso8601(iso8601Dates[i]);
    }

    return julianDates;
  }

  function checkIntervals(
    intervals,
    julianDates,
    isStartIncluded,
    isStopIncluded,
    dataCallback
  ) {
    dataCallback = defaultValue(dataCallback, defaultDataCallback);
    const length = intervals.length;
    expect(length).toEqual(julianDates.length - 1);
    for (let i = 0; i < length; ++i) {
      const interval = intervals.get(i);
      expect(JulianDate.compare(interval.start, julianDates[i])).toEqual(0);
      expect(JulianDate.compare(interval.stop, julianDates[i + 1])).toEqual(0);
      expect(interval.isStartIncluded).toBe(i === 0 ? isStartIncluded : true);
      expect(interval.isStopIncluded).toBe(
        i === length - 1 ? isStopIncluded : false
      );
      expect(interval.data).toEqual(dataCallback(interval, i));
    }
  }

  function TestObject(value) {
    this.value = value;
  }

  TestObject.equals = function (left, right) {
    return left.value === right.value;
  };

  TestObject.merge = function (left, right) {
    return new TestObject(left.value + right.value);
  };

  it("constructing a default interval collection has expected property values.", function () {
    const intervals = new TimeIntervalCollection();
    expect(intervals.length).toEqual(0);
    expect(intervals.start).toBeUndefined();
    expect(intervals.stop).toBeUndefined();
    expect(intervals.isStartIncluded).toEqual(false);
    expect(intervals.isStopIncluded).toEqual(false);
    expect(intervals.isEmpty).toEqual(true);
    expect(intervals.changedEvent).toBeDefined();
  });

  it("constructing an interval collection from array.", function () {
    const arg = [
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: true,
        isStopIncluded: false,
      }),
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: true,
      }),
    ];
    const intervals = new TimeIntervalCollection(arg);
    expect(intervals.length).toEqual(2);
    expect(intervals.start).toEqual(arg[0].start);
    expect(intervals.stop).toEqual(arg[1].stop);
    expect(intervals.isStartIncluded).toEqual(true);
    expect(intervals.isStopIncluded).toEqual(true);
    expect(intervals.isEmpty).toEqual(false);
    expect(intervals.changedEvent).toBeDefined();
  });

  it("isStartIncluded/isStopIncluded works.", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });

    expect(intervals.isStartIncluded).toBe(false);
    expect(intervals.isStopIncluded).toBe(false);

    intervals.addInterval(interval1);

    expect(intervals.isStartIncluded).toBe(true);
    expect(intervals.isStopIncluded).toBe(false);

    intervals.addInterval(interval2);

    expect(intervals.isStartIncluded).toBe(true);
    expect(intervals.isStopIncluded).toBe(true);
  });

  it("contains works for a simple interval collection.", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    expect(intervals.contains(new JulianDate(0.5))).toEqual(false);
    expect(intervals.contains(new JulianDate(1.5))).toEqual(true);
    expect(intervals.contains(new JulianDate(2.0))).toEqual(false);
    expect(intervals.contains(new JulianDate(2.5))).toEqual(true);
    expect(intervals.contains(new JulianDate(3.0))).toEqual(true);
    expect(intervals.contains(new JulianDate(3.5))).toEqual(false);
  });

  it("contains works for a endpoints of a closed interval collection.", function () {
    const intervals = new TimeIntervalCollection();
    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: true,
    });
    intervals.addInterval(interval);
    expect(intervals.contains(interval.start)).toEqual(true);
    expect(intervals.contains(interval.stop)).toEqual(true);
  });

  it("contains works for a endpoints of an open interval collection.", function () {
    const intervals = new TimeIntervalCollection();
    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: false,
      isStopIncluded: false,
    });
    intervals.addInterval(interval);
    expect(intervals.contains(interval.start)).toEqual(false);
    expect(intervals.contains(interval.stop)).toEqual(false);
  });

  it("indexOf finds the correct interval for a valid date", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });

    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    expect(intervals.indexOf(new JulianDate(2.5))).toEqual(1);
  });

  it("indexOf returns complement of index of the interval that a missing date would come before", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    expect(intervals.indexOf(new JulianDate(2))).toEqual(~1);
  });

  it("indexOf returns complement of collection length if the date is after all intervals.", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    expect(intervals.indexOf(new JulianDate(4))).toEqual(~2);
  });

  it("get returns the interval at the correct index", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: false,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: false,
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(4),
      stop: new JulianDate(5),
      isStartIncluded: false,
      isStopIncluded: false,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    intervals.addInterval(interval3);
    expect(intervals.get(1)).toEqual(interval2);
  });

  it("get is undefined for a out of range index", function () {
    const intervals = new TimeIntervalCollection();
    expect(intervals.get(1)).toBeUndefined();
  });

  it("findInterval works when looking for an exact interval", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(0),
      stop: new JulianDate(1),
      isStartIncluded: false,
      isStopIncluded: false,
      data: 1,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
      data: 2,
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: false,
      data: 3,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    intervals.addInterval(interval3);
    expect(
      intervals.findInterval({
        start: interval2.start,
        stop: interval2.stop,
        isStartIncluded: true,
        isStopIncluded: false,
      })
    ).toEqual(interval2);
  });

  it("findInterval works when you do not care about end points", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(0),
      stop: new JulianDate(1),
      isStartIncluded: false,
      isStopIncluded: false,
      data: 1,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
      data: 2,
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: false,
      data: 3,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    intervals.addInterval(interval3);
    expect(
      intervals.findInterval({
        start: interval2.start,
        stop: interval2.stop,
      })
    ).toEqual(interval2);
  });

  it("getStart & getStop return expected values.", function () {
    const intervals = new TimeIntervalCollection();
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    intervals.addInterval(interval1);
    intervals.addInterval(interval2);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval2.stop);
  });

  it("isEmpty and clear return expected values", function () {
    const intervals = new TimeIntervalCollection();
    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: false,
        isStopIncluded: true,
      })
    );
    expect(intervals.isEmpty).toEqual(false);
    intervals.removeAll();
    expect(intervals.isEmpty).toEqual(true);
  });

  it("length returns the correct interval length when adding intervals with different data", function () {
    const intervals = new TimeIntervalCollection();
    expect(intervals.length).toEqual(0);

    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(4),
        isStartIncluded: true,
        isStopIncluded: true,
        data: 1,
      })
    );
    expect(intervals.length).toEqual(1);

    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: true,
        isStopIncluded: true,
        data: 2,
      })
    );
    expect(intervals.length).toEqual(3);

    intervals.removeAll();
    expect(intervals.length).toEqual(0);
  });

  it("length returns the correct length after two intervals with the same data are merged.", function () {
    const intervals = new TimeIntervalCollection();

    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(4),
        isStartIncluded: true,
        isStopIncluded: true,
        data: 1,
      })
    );
    expect(intervals.length).toEqual(1);

    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: true,
        isStopIncluded: true,
        data: 1,
      })
    );
    expect(intervals.length).toEqual(1);

    intervals.removeAll();
    expect(intervals.length).toEqual(0);
  });

  it("addInterval and findIntervalContainingDate work when using non-overlapping intervals", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: true,
      data: 1,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
      data: 2,
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(4),
      stop: new JulianDate(5),
      isStartIncluded: true,
      isStopIncluded: true,
      data: 3,
    });

    const intervals = new TimeIntervalCollection();

    intervals.addInterval(interval1);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(
      interval1
    );
    expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(
      interval1
    );

    intervals.addInterval(interval2);

    expect(intervals.length).toEqual(2);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval2.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(
      interval1
    );
    expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(
      interval1
    );
    expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(
      interval2
    );

    intervals.addInterval(interval3);
    expect(intervals.length).toEqual(3);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval3.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(
      interval1
    );
    expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(
      interval1
    );
    expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(
      interval2
    );
    expect(intervals.findIntervalContainingDate(interval3.start)).toEqual(
      interval3
    );
    expect(intervals.findIntervalContainingDate(interval3.stop)).toEqual(
      interval3
    );
  });

  it("addInterval and findIntervalContainingDate work when using overlapping intervals", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2.5),
      isStartIncluded: true,
      isStopIncluded: true,
      data: 1,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
      data: 2,
    });
    const interval3 = new TimeInterval({
      start: interval1.start,
      stop: interval2.stop,
      isStartIncluded: true,
      isStopIncluded: true,
      data: 3,
    });

    const intervals = new TimeIntervalCollection();

    intervals.addInterval(interval1);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(
      1
    );
    expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(
      1
    );

    intervals.addInterval(interval2);

    expect(intervals.length).toEqual(2);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval2.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(
      1
    );
    expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(
      2
    );
    expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(
      2
    );

    intervals.addInterval(interval3);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval3.start);
    expect(intervals.stop).toEqual(interval3.stop);
    expect(intervals.isEmpty).toEqual(false);

    expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(
      3
    );
    expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(
      3
    );
    expect(intervals.findIntervalContainingDate(interval2.start).data).toEqual(
      3
    );
    expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(
      3
    );
    expect(intervals.findIntervalContainingDate(interval3.start).data).toEqual(
      3
    );
    expect(intervals.findIntervalContainingDate(interval3.stop).data).toEqual(
      3
    );
  });

  it("findDataForIntervalContainingDate works", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2.5),
      isStartIncluded: true,
      isStopIncluded: true,
      data: 1,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
      data: 2,
    });

    const intervals = new TimeIntervalCollection();
    intervals.addInterval(interval1);
    expect(
      intervals.findDataForIntervalContainingDate(interval1.start)
    ).toEqual(1);
    expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(
      1
    );

    intervals.addInterval(interval2);
    expect(
      intervals.findDataForIntervalContainingDate(interval1.start)
    ).toEqual(1);
    expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(
      2
    );
    expect(intervals.findDataForIntervalContainingDate(interval2.stop)).toEqual(
      2
    );

    expect(
      intervals.findDataForIntervalContainingDate(new JulianDate(5))
    ).toBeUndefined();
  });

  it("addInterval correctly intervals that have the same data when using equalsCallback", function () {
    const intervals = new TimeIntervalCollection();

    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: true,
      data: new TestObject(2),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(3),
      isStartIncluded: true,
      isStopIncluded: false,
      data: new TestObject(2),
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(3),
      stop: new JulianDate(4),
      isStartIncluded: false,
      isStopIncluded: true,
      data: new TestObject(2),
    });
    const interval4 = new TimeInterval({
      start: new JulianDate(3),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: true,
      data: new TestObject(3),
    });

    intervals.addInterval(interval1, TestObject.equals);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.get(0).data.value).toEqual(2);

    intervals.addInterval(interval2, TestObject.equals);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.get(0).data.value).toEqual(2);

    intervals.addInterval(interval3, TestObject.equals);
    expect(intervals.length).toEqual(1);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.get(0).data.value).toEqual(2);

    intervals.addInterval(interval4, TestObject.equals);
    expect(intervals.length).toEqual(2);
    expect(intervals.start).toEqual(interval1.start);
    expect(intervals.stop).toEqual(interval1.stop);
    expect(intervals.get(0).start).toEqual(interval1.start);
    expect(intervals.get(0).stop).toEqual(interval4.start);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(false);
    expect(intervals.get(0).data.value).toEqual(2);

    expect(intervals.get(1).start).toEqual(interval4.start);
    expect(intervals.get(1).stop).toEqual(interval4.stop);
    expect(intervals.get(1).isStartIncluded).toEqual(true);
    expect(intervals.get(1).isStopIncluded).toEqual(true);
    expect(intervals.get(1).data.value).toEqual(3);
  });

  it("removeInterval works correctly", function () {
    // test cases derived from STK Components test suite

    function createTimeInterval(
      startDays,
      stopDays,
      isStartIncluded,
      isStopIncluded
    ) {
      return new TimeInterval({
        start: new JulianDate(startDays, 0.0, TimeStandard.TAI),
        stop: new JulianDate(stopDays, 0.0, TimeStandard.TAI),
        isStartIncluded: isStartIncluded,
        isStopIncluded: isStopIncluded,
      });
    }

    const intervals = new TimeIntervalCollection();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));

    // Empty
    expect(intervals.removeInterval(TimeInterval.EMPTY)).toEqual(false);
    expect(intervals.length).toEqual(2);

    // Before first
    expect(intervals.removeInterval(createTimeInterval(1.0, 5.0))).toEqual(
      false
    );
    expect(intervals.length).toEqual(2);

    // After last
    expect(intervals.removeInterval(createTimeInterval(50.0, 60.0))).toEqual(
      false
    );
    expect(intervals.length).toEqual(2);

    // Inside hole
    expect(intervals.removeInterval(createTimeInterval(22.0, 28.0))).toEqual(
      false
    );
    expect(intervals.length).toEqual(2);

    // From beginning
    expect(intervals.removeInterval(createTimeInterval(5.0, 15.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(0).start)).toEqual(15.0);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);

    // From end
    expect(intervals.removeInterval(createTimeInterval(35.0, 45.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(30.0);
    expect(JulianDate.totalDays(intervals.get(1).stop)).toEqual(35.0);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));

    // From middle of single interval
    expect(intervals.removeInterval(createTimeInterval(12.0, 18.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(3);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(12.0);
    expect(intervals.get(0).isStopIncluded).toEqual(false);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(18.0);
    expect(intervals.get(1).isStartIncluded).toEqual(false);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));
    intervals.addInterval(createTimeInterval(45.0, 50.0));

    // Span an entire interval and into part of next
    expect(intervals.removeInterval(createTimeInterval(25.0, 46.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(46.0);
    expect(intervals.get(1).isStartIncluded).toEqual(false);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));
    intervals.addInterval(createTimeInterval(45.0, 50.0));

    // Interval ends at same date as an existing interval
    expect(intervals.removeInterval(createTimeInterval(25.0, 40.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(45.0);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));
    intervals.addInterval(createTimeInterval(45.0, 50.0));

    // Interval ends at same date as an existing interval and single point of existing
    // interval survives.
    expect(
      intervals.removeInterval(createTimeInterval(25.0, 40.0, true, false))
    ).toEqual(true);
    expect(intervals.length).toEqual(3);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(40.0);
    expect(JulianDate.totalDays(intervals.get(1).stop)).toEqual(40.0);
    expect(intervals.get(1).isStartIncluded).toEqual(true);
    expect(intervals.get(1).isStopIncluded).toEqual(true);
    expect(JulianDate.totalDays(intervals.get(2).start)).toEqual(45.0);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));
    intervals.addInterval(createTimeInterval(30.0, 40.0));
    intervals.addInterval(createTimeInterval(40.0, 50.0, false, true));

    // Interval ends at same date as an existing interval, single point of existing
    // interval survives, and single point can be combined with the next interval.
    expect(
      intervals.removeInterval(createTimeInterval(25.0, 40.0, true, false))
    ).toEqual(true);
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(40.0);
    expect(intervals.get(1).isStartIncluded).toEqual(true);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));

    // End point of removal interval overlaps first point of existing interval.
    expect(intervals.removeInterval(createTimeInterval(0.0, 10.0))).toEqual(
      true
    );
    expect(intervals.length).toEqual(1);
    expect(JulianDate.totalDays(intervals.get(0).start)).toEqual(10.0);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);
    expect(intervals.get(0).isStartIncluded).toEqual(false);
    expect(intervals.get(0).isStopIncluded).toEqual(true);

    intervals.removeAll();
    intervals.addInterval(createTimeInterval(10.0, 20.0));

    // Start point of removal interval does NOT overlap last point of existing interval
    // because the start point is not included.
    expect(
      intervals.removeInterval(createTimeInterval(20.0, 30.0, false, true))
    ).toEqual(false);
    expect(intervals.length).toEqual(1);
    expect(JulianDate.totalDays(intervals.get(0).start)).toEqual(10.0);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(20.0);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(true);

    // Removing an open interval from an otherwise identical closed interval
    intervals.removeAll();
    intervals.addInterval(createTimeInterval(0.0, 20.0));
    expect(
      intervals.removeInterval(createTimeInterval(0.0, 20.0, false, false))
    ).toEqual(true);
    expect(intervals.length).toEqual(2);
    expect(JulianDate.totalDays(intervals.get(0).start)).toEqual(0.0);
    expect(JulianDate.totalDays(intervals.get(0).stop)).toEqual(0.0);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(true);
    expect(JulianDate.totalDays(intervals.get(1).start)).toEqual(20.0);
    expect(JulianDate.totalDays(intervals.get(1).stop)).toEqual(20.0);
    expect(intervals.get(1).isStartIncluded).toEqual(true);
    expect(intervals.get(1).isStopIncluded).toEqual(true);
  });

  it("removeInterval removes the first interval correctly", function () {
    const intervals = new TimeIntervalCollection();
    const from1To3 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(3),
      isStopIncluded: true,
      isStartIncluded: true,
      data: "1-to-3",
    });
    const from3To6 = new TimeInterval({
      start: new JulianDate(3),
      stop: new JulianDate(6),
      isStopIncluded: true,
      isStartIncluded: true,
      data: "3-to-6",
    });

    intervals.addInterval(from1To3);
    intervals.addInterval(from3To6);

    expect(intervals.length).toEqual(2);
    expect(intervals.get(0).isStartIncluded).toBeTruthy();
    expect(intervals.get(0).isStopIncluded).toBeFalsy(); // changed to false because 3-6 overlaps it
    expect(intervals.get(0).start.dayNumber).toEqual(1);
    expect(intervals.get(0).stop.dayNumber).toEqual(3);
    expect(intervals.get(0).data).toEqual("1-to-3");
    expect(intervals.get(1).isStartIncluded).toBeTruthy();
    expect(intervals.get(1).isStopIncluded).toBeTruthy();
    expect(intervals.get(1).start.dayNumber).toEqual(3);
    expect(intervals.get(1).stop.dayNumber).toEqual(6);
    expect(intervals.get(1).data).toEqual("3-to-6");

    const toRemove = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(3),
      isStopIncluded: true,
      isStartIncluded: true,
      data: undefined,
    });

    expect(intervals.removeInterval(toRemove)).toEqual(true);
    expect(intervals.length).toEqual(1);
    expect(intervals.start.dayNumber).toEqual(3);
    expect(intervals.stop.dayNumber).toEqual(6);
    expect(intervals.get(0).start.dayNumber).toEqual(3);
    expect(intervals.get(0).stop.dayNumber).toEqual(6);
    expect(intervals.get(0).isStartIncluded).toEqual(false);
    expect(intervals.get(0).isStopIncluded).toEqual(true);
    expect(intervals.get(0).data).toEqual("3-to-6");
  });

  it("should add and remove intervals correctly (some kind of integration test)", function () {
    // about the year 3000
    const CONST_DAY_NUM = 3000000;

    function intervalFromSeconds(seconds, data) {
      // make all intervals a few seconds in length
      return new TimeInterval({
        start: new JulianDate(CONST_DAY_NUM, seconds),
        stop: new JulianDate(CONST_DAY_NUM, seconds + 4),
        isStartIncluded: true,
        isStopIncluded: true,
        data: data,
      });
    }

    function addIntervals(collection, specs) {
      specs.forEach(function (spec) {
        collection.addInterval(intervalFromSeconds(spec.sec, spec.data));
      });
    }

    function removeInterval(collection, fromSecond, toSecond) {
      collection.removeInterval(
        new TimeInterval({
          start: new JulianDate(CONST_DAY_NUM, fromSecond),
          stop: new JulianDate(CONST_DAY_NUM, toSecond),
          isStartIncluded: true,
          isStopIncluded: true,
          data: undefined,
        })
      );
    }

    function expectCollection(collection, count, expectation) {
      expectation.forEach(function (item) {
        const interval = collection.findIntervalContainingDate(
          new JulianDate(CONST_DAY_NUM, item.sec)
        );
        if (item.data === null) {
          // expect the interval at this time not to exist
          if (interval !== undefined) {
            throw new Error(
              "expected undefined at " +
                item.sec +
                " seconds but it was " +
                interval.data
            );
          }
          expect(interval).toBeUndefined();
        } else if (interval === undefined) {
          throw new Error(
            "expected " +
              item.data +
              " at " +
              item.sec +
              " seconds, but it was undefined"
          );
        } else if (interval.data !== item.data) {
          throw new Error(
            "expected " +
              item.data +
              " at " +
              item.sec +
              " seconds, but it was " +
              interval.data
          );
        }
      });

      if (collection.length !== count) {
        throw new Error(
          "Expected interval to have " +
            count +
            " elements but it had " +
            collection.length
        );
      }
    }

    const collection = new TimeIntervalCollection();

    addIntervals(collection, [
      { sec: 0, data: 0 },
      { sec: 2, data: 2 },
      { sec: 4, data: 4 },
      { sec: 6, data: 6 },
    ]);
    expectCollection(collection, 4, [
      { sec: 0, data: 0 },
      { sec: 1, data: 0 },
      { sec: 2, data: 2 },
      { sec: 3, data: 2 },
      { sec: 4, data: 4 },
      { sec: 5, data: 4 },
      { sec: 6, data: 6 },
      { sec: 7, data: 6 },
      { sec: 8, data: 6 },
      { sec: 9, data: 6 },
      { sec: 10, data: 6 },
      { sec: 11, data: null },
    ]);

    addIntervals(collection, [
      { sec: 1, data: 1 },
      { sec: 3, data: 3 },
    ]);
    expectCollection(collection, 4, [
      { sec: 0, data: 0 },
      { sec: 1, data: 1 },
      { sec: 2, data: 1 },
      { sec: 3, data: 3 },
      { sec: 4, data: 3 },
      { sec: 5, data: 3 },
      { sec: 6, data: 3 },
      { sec: 7, data: 3 },
      { sec: 8, data: 6 },
      { sec: 9, data: 6 },
      { sec: 10, data: 6 },
      { sec: 11, data: null },
    ]);

    addIntervals(collection, [{ sec: 3, data: 31 }]);
    expectCollection(collection, 4, [
      { sec: 0, data: 0 },
      { sec: 1, data: 1 },
      { sec: 2, data: 1 },
      { sec: 3, data: 31 },
      { sec: 4, data: 31 },
      { sec: 5, data: 31 },
      { sec: 6, data: 31 },
      { sec: 7, data: 31 },
      { sec: 8, data: 6 },
      { sec: 9, data: 6 },
      { sec: 10, data: 6 },
      { sec: 11, data: null },
    ]);

    removeInterval(collection, 3, 8);
    expectCollection(collection, 3, [
      { sec: 0, data: 0 },
      { sec: 1, data: 1 },
      { sec: 2, data: 1 },
      { sec: 3, data: null },
      { sec: 4, data: null },
      { sec: 5, data: null },
      { sec: 6, data: null },
      { sec: 7, data: null },
      { sec: 8, data: null },
      { sec: 9, data: 6 },
      { sec: 10, data: 6 },
      { sec: 11, data: null },
    ]);

    removeInterval(collection, 0, 1);
    expectCollection(collection, 2, [
      { sec: 0, data: null },
      { sec: 1, data: null },
      { sec: 2, data: 1 },
      { sec: 3, data: null },
      { sec: 4, data: null },
      { sec: 5, data: null },
      { sec: 6, data: null },
      { sec: 7, data: null },
      { sec: 8, data: null },
      { sec: 9, data: 6 },
      { sec: 10, data: 6 },
      { sec: 11, data: null },
    ]);

    removeInterval(collection, 0, 11);
    expectCollection(collection, 0, [
      { sec: 0, data: null },
      { sec: 11, data: null },
    ]);

    addIntervals(collection, [
      { sec: 1, data: 1 },
      { sec: 12, data: 12 },
    ]);
    expectCollection(collection, 2, [
      { sec: 0, data: null },
      { sec: 1, data: 1 },
      { sec: 2, data: 1 },
      { sec: 3, data: 1 },
      { sec: 4, data: 1 },
      { sec: 5, data: 1 },
      { sec: 6, data: null },
      { sec: 7, data: null },
      { sec: 8, data: null },
      { sec: 9, data: null },
      { sec: 10, data: null },
      { sec: 11, data: null },
      { sec: 12, data: 12 },
      { sec: 13, data: 12 },
      { sec: 14, data: 12 },
      { sec: 15, data: 12 },
      { sec: 16, data: 12 },
      { sec: 17, data: null },
    ]);

    removeInterval(collection, 0, 3);
    expectCollection(collection, 2, [
      { sec: 0, data: null },
      { sec: 1, data: null },
      { sec: 2, data: null },
      { sec: 3, data: null },
      { sec: 4, data: 1 },
      { sec: 5, data: 1 },
      { sec: 6, data: null },
      { sec: 7, data: null },
      { sec: 8, data: null },
      { sec: 12, data: 12 },
      { sec: 16, data: 12 },
      { sec: 17, data: null },
    ]);
  });

  it("removeInterval leaves a hole", function () {
    const intervals = new TimeIntervalCollection();
    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: true,
    });
    const removedInterval = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: true,
      isStopIncluded: false,
    });
    intervals.addInterval(interval);
    expect(intervals.removeInterval(removedInterval)).toEqual(true);

    expect(intervals.length).toEqual(2);
    expect(intervals.get(0).start).toEqual(interval.start);
    expect(intervals.get(0).stop).toEqual(removedInterval.start);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(false);

    expect(intervals.get(1).start).toEqual(removedInterval.stop);
    expect(intervals.get(1).stop).toEqual(interval.stop);
    expect(intervals.get(1).isStartIncluded).toEqual(true);
    expect(intervals.get(1).isStopIncluded).toEqual(true);
  });

  it("removeInterval with an interval of the exact same size works.", function () {
    const intervals = new TimeIntervalCollection();
    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: false,
    });

    intervals.addInterval(interval);
    expect(intervals.length).toEqual(1);
    expect(intervals.get(0).start).toEqual(interval.start);
    expect(intervals.get(0).stop).toEqual(interval.stop);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(false);

    intervals.removeInterval(interval);
    expect(intervals.length).toEqual(0);
  });

  it("removeInterval with an empty interval has no affect.", function () {
    const intervals = new TimeIntervalCollection();
    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: true,
    });
    intervals.addInterval(interval);

    expect(intervals.length).toEqual(1);
    expect(intervals.get(0).start).toEqual(interval.start);
    expect(intervals.get(0).stop).toEqual(interval.stop);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(true);

    expect(intervals.removeInterval(TimeInterval.EMPTY)).toEqual(false);

    expect(intervals.length).toEqual(1);
    expect(intervals.get(0).start).toEqual(interval.start);
    expect(intervals.get(0).stop).toEqual(interval.stop);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(true);
  });

  it("removeInterval takes isStartIncluded and isStopIncluded into account", function () {
    const intervals = new TimeIntervalCollection();

    const interval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: true,
      isStopIncluded: true,
    });
    const removedInterval = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(4),
      isStartIncluded: false,
      isStopIncluded: false,
    });
    intervals.addInterval(interval);
    expect(intervals.removeInterval(removedInterval)).toEqual(true);

    expect(intervals.length).toEqual(2);
    expect(intervals.get(0).start).toEqual(interval.start);
    expect(intervals.get(0).stop).toEqual(interval.start);
    expect(intervals.get(0).isStartIncluded).toEqual(true);
    expect(intervals.get(0).isStopIncluded).toEqual(true);

    expect(intervals.get(1).start).toEqual(interval.stop);
    expect(intervals.get(1).stop).toEqual(interval.stop);
    expect(intervals.get(1).isStartIncluded).toEqual(true);
    expect(intervals.get(1).isStopIncluded).toEqual(true);
  });

  it("removeInterval removes overlapped intervals", function () {
    const intervals = new TimeIntervalCollection();

    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: true,
        isStopIncluded: false,
      })
    );
    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: false,
      })
    );
    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(3),
        stop: new JulianDate(4),
        isStartIncluded: false,
        isStopIncluded: false,
      })
    );
    intervals.addInterval(
      new TimeInterval({
        start: new JulianDate(4),
        stop: new JulianDate(5),
        isStartIncluded: false,
        isStopIncluded: true,
      })
    );

    const removedInterval = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(4),
      isStartIncluded: false,
      isStopIncluded: false,
    });

    expect(intervals.length).toEqual(4);
    expect(intervals.removeInterval(removedInterval)).toEqual(true);

    expect(intervals.length).toEqual(2);
  });

  it("intersect works with an empty collection", function () {
    const left = new TimeIntervalCollection();
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(4),
        isStartIncluded: true,
        isStopIncluded: true,
      })
    );
    expect(left.intersect(new TimeIntervalCollection()).length).toEqual(0);
  });

  it("intersect works non-overlapping intervals", function () {
    const left = new TimeIntervalCollection();
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: true,
        isStopIncluded: false,
      })
    );

    const right = new TimeIntervalCollection();
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: true,
        isStopIncluded: true,
      })
    );
    expect(left.intersect(right).length).toEqual(0);
  });

  it("intersect works with intersecting intervals and no merge callback", function () {
    const left = new TimeIntervalCollection();
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(4),
        isStartIncluded: true,
        isStopIncluded: true,
      })
    );

    const right = new TimeIntervalCollection();
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: false,
      })
    );

    const intersectedIntervals = left.intersect(right);

    expect(intersectedIntervals.length).toEqual(1);
    expect(intersectedIntervals.get(0).start).toEqual(right.get(0).start);
    expect(intersectedIntervals.get(0).stop).toEqual(right.get(0).stop);
    expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
    expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
  });

  it("intersect works with intersecting intervals an a merge callback", function () {
    const left = new TimeIntervalCollection();
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(4),
        isStartIncluded: true,
        isStopIncluded: true,
        data: new TestObject(1),
      })
    );

    const right = new TimeIntervalCollection();
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: false,
        data: new TestObject(2),
      })
    );

    const intersectedIntervals = left.intersect(
      right,
      TestObject.equals,
      TestObject.merge
    );

    expect(intersectedIntervals.length).toEqual(1);
    expect(intersectedIntervals.get(0).start).toEqual(right.start);
    expect(intersectedIntervals.get(0).stop).toEqual(right.stop);
    expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
    expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
    expect(intersectedIntervals.get(0).data.value).toEqual(3);
  });

  it("equals works without data", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(1),
      stop: new JulianDate(2),
      isStartIncluded: true,
      isStopIncluded: true,
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(2),
      stop: new JulianDate(3),
      isStartIncluded: false,
      isStopIncluded: true,
    });
    const interval3 = new TimeInterval({
      start: new JulianDate(4),
      stop: new JulianDate(5),
      isStartIncluded: true,
      isStopIncluded: true,
    });

    const left = new TimeIntervalCollection();
    left.addInterval(interval1);
    left.addInterval(interval2);
    left.addInterval(interval3);

    const right = new TimeIntervalCollection();
    right.addInterval(interval1);
    right.addInterval(interval2);
    right.addInterval(interval3);
    expect(left.equals(right)).toEqual(true);
  });

  it("equals works with data", function () {
    const left = new TimeIntervalCollection();
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: true,
        isStopIncluded: true,
        data: {},
      })
    );
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: true,
        data: {},
      })
    );
    left.addInterval(
      new TimeInterval({
        start: new JulianDate(4),
        stop: new JulianDate(5),
        isStartIncluded: true,
        isStopIncluded: true,
        data: {},
      })
    );

    const right = new TimeIntervalCollection();
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(1),
        stop: new JulianDate(2),
        isStartIncluded: true,
        isStopIncluded: true,
        data: {},
      })
    );
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(2),
        stop: new JulianDate(3),
        isStartIncluded: false,
        isStopIncluded: true,
        data: {},
      })
    );
    right.addInterval(
      new TimeInterval({
        start: new JulianDate(4),
        stop: new JulianDate(5),
        isStartIncluded: true,
        isStopIncluded: true,
        data: {},
      })
    );

    expect(left.equals(right)).toEqual(false);

    expect(
      left.equals(right, function () {
        return true;
      })
    ).toEqual(true);

    expect(
      left.equals(right, function () {
        return false;
      })
    ).toEqual(false);
  });

  it("get throws with undefined", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.get(undefined);
    }).toThrowDeveloperError();
  });

  it("findIntervalContainingDate throws with undefined date", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.findIntervalContainingDate(undefined);
    }).toThrowDeveloperError();
  });

  it("findDataForIntervalContainingDate throws with undefined date", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.findDataForIntervalContainingDate(undefined);
    }).toThrowDeveloperError();
  });

  it("contains throws with undefined date", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.contains(undefined);
    }).toThrowDeveloperError();
  });

  it("indexOf throws with undefined date", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.indexOf(undefined);
    }).toThrowDeveloperError();
  });

  it("addInterval throws with undefined interval", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.addInterval(undefined, TestObject.equals);
    }).toThrowDeveloperError();
  });

  it("removeInterval throws with undefined", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.removeInterval(undefined);
    }).toThrowDeveloperError();
  });

  it("intersect throws with undefined interval", function () {
    const intervals = new TimeIntervalCollection();
    expect(function () {
      intervals.intersect(undefined);
    }).toThrowDeveloperError();
  });

  it("changed event is raised as expected", function () {
    const interval = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
    });

    const intervals = new TimeIntervalCollection();

    const listener = jasmine.createSpy("listener");
    intervals.changedEvent.addEventListener(listener);

    intervals.addInterval(interval);
    expect(listener).toHaveBeenCalledWith(intervals);
    listener.calls.reset();

    intervals.removeInterval(interval);
    expect(listener).toHaveBeenCalledWith(intervals);

    intervals.addInterval(interval);
    listener.calls.reset();
    intervals.removeAll();
    expect(listener).toHaveBeenCalledWith(intervals);
  });

  it("fromIso8601 throws without options", function () {
    expect(function () {
      TimeIntervalCollection.fromIso8601(undefined);
    }).toThrowDeveloperError();
  });

  it("fromIso8601 throws without options.iso8601", function () {
    expect(function () {
      TimeIntervalCollection.fromIso8601({});
    }).toThrowDeveloperError();
  });

  it("fromIso8601 return single interval if no duration", function () {
    const start = "2017-01-01T00:00:00Z";
    const stop = "2017-01-02T00:00:00Z";
    const julianDates = iso8601ToJulianDateArray([start, stop]);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601: start + "/" + stop,
      isStartIncluded: false,
      isStopIncluded: false,
    });

    checkIntervals(intervals, julianDates, false, false);
  });

  it("fromIso8601 works with just year", function () {
    const iso8601Dates = [
      "2017-01-01T00:00:00Z",
      "2018-01-01T00:00:00Z",
      "2019-01-01T00:00:00Z",
      "2020-01-01T00:00:00Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/P1Y",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  it("fromIso8601 works with just month", function () {
    const iso8601Dates = [
      "2016-12-02T10:00:01.5Z",
      "2017-01-02T10:00:01.5Z",
      "2017-02-02T10:00:01.5Z",
      "2017-03-02T10:00:01.5Z",
      "2017-04-02T10:00:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/P1M",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  it("fromIso8601 works with just day", function () {
    const iso8601Dates = [
      "2016-12-31T10:01:01.5Z",
      "2017-01-01T10:01:01.5Z",
      "2017-01-02T10:01:01.5Z",
      "2017-01-03T10:01:01.5Z",
      "2017-01-04T10:01:01.5Z",
      "2017-01-05T10:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/P1D",
      isStartIncluded: false,
    });

    checkIntervals(intervals, julianDates, false, true);
  });

  it("fromIso8601 works with just all date components", function () {
    const iso8601Dates = [
      "2017-01-01T10:01:01.5Z",
      "2018-03-04T10:01:01.5Z",
      "2019-05-07T10:01:01.5Z",
      "2020-07-10T10:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/P1Y2M3D",
      isStopIncluded: false,
    });

    checkIntervals(intervals, julianDates, true, false);
  });

  it("fromIso8601 works with just just hour", function () {
    const iso8601Dates = [
      "2017-01-01T22:01:01.5Z",
      "2017-01-01T23:01:01.5Z",
      "2017-01-02T00:01:01.5Z",
      "2017-01-02T01:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1H",
      isStartIncluded: false,
    });

    checkIntervals(intervals, julianDates, false, true);
  });

  it("fromIso8601 works with just just minute", function () {
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1M",
      isStopIncluded: false,
    });

    checkIntervals(intervals, julianDates, true, false);
  });

  it("fromIso8601 works with just just second", function () {
    const iso8601Dates = [
      "2016-12-31T23:59:58.5Z",
      "2016-12-31T23:59:59.5Z",
      "2017-01-01T00:00:00.5Z",
      "2017-01-01T00:00:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1S",
      isStartIncluded: false,
      isStopIncluded: false,
    });

    checkIntervals(intervals, julianDates, false, false);
  });

  it("fromIso8601 works with just just millisecond", function () {
    const iso8601Dates = [
      "2016-12-31T23:59:58.5Z",
      "2016-12-31T23:59:59Z",
      "2016-12-31T23:59:59.5Z",
      "2017-01-01T00:00:00Z",
      "2017-01-01T00:00:00.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/PT0.5S",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  it("fromIso8601 works with just all time components", function () {
    const iso8601Dates = [
      "2017-01-01T10:01:01.5Z",
      "2017-01-01T11:03:05Z",
      "2017-01-01T12:05:08.5Z",
      "2017-01-01T13:07:12Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/PT1H2M3.5S",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  it("fromIso8601 works with just all date and time components", function () {
    const iso8601Dates = [
      "2017-01-01T10:01:01.5Z",
      "2018-03-04T11:03:05Z",
      "2019-05-07T12:05:08.5Z",
      "2020-07-10T13:07:12Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/P1Y2M3DT1H2M3.5S",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  it("fromIso8601 works with just all date and time components with date string for duration", function () {
    const iso8601Dates = [
      "2017-01-01T10:01:01.5Z",
      "2018-03-04T11:03:05Z",
      "2019-05-07T12:05:08.5Z",
      "2020-07-10T13:07:12Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/0001-02-03T01:02:03.5",
    });

    checkIntervals(intervals, julianDates, true, true);
  });

  function dataCallback(interval, index) {
    if (JulianDate.compare(Iso8601.MINIMUM_VALUE, interval.start) === 0) {
      return "default";
    }
    return JulianDate.toIso8601(interval.start);
  }

  it("fromIso8601 calls the dataCallback on interval create", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2017-01-01T10:01:01.5Z",
      "2018-03-04T11:03:05Z",
      "2019-05-07T12:05:08.5Z",
      "2020-07-10T13:07:12Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] +
        "/" +
        iso8601Dates[iso8601Dates.length - 1] +
        "/P1Y2M3DT1H2M3.5S",
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(3);
    for (let i = 0; i < 3; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    checkIntervals(intervals, julianDates, true, true, dataCallback);
  });

  it("fromIso8601 handles leadingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1M",
      isStartIncluded: true,
      isStopIncluded: false,
      leadingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(4);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(false);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    checkIntervals(intervals, julianDates, true, false, dataCallback);
  });

  it("fromIso8601 handles trailingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1M",
      isStartIncluded: false,
      isStopIncluded: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(4);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(false);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    checkIntervals(intervals, julianDates, false, true, dataCallback);
  });

  it("fromIso8601 handles leadingInterval and trailingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601({
      iso8601:
        iso8601Dates[0] + "/" + iso8601Dates[iso8601Dates.length - 1] + "/PT1M",
      isStartIncluded: false,
      isStopIncluded: false,
      leadingInterval: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(5);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(true);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(true);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    // Remove leading interval and check the rest
    checkIntervals(intervals, julianDates, false, false, dataCallback);
  });

  it("fromIso8601DateArray handles leadingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601DateArray({
      iso8601Dates: iso8601Dates,
      isStartIncluded: true,
      isStopIncluded: false,
      leadingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(4);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(false);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    checkIntervals(intervals, julianDates, true, false, dataCallback);
  });

  it("fromIso8601DateArray handles trailingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601DateArray({
      iso8601Dates: iso8601Dates,
      isStartIncluded: false,
      isStopIncluded: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(4);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(false);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    checkIntervals(intervals, julianDates, false, true, dataCallback);
  });

  it("fromIso8601DateArray handles leadingInterval and trailingInterval option", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);

    const intervals = TimeIntervalCollection.fromIso8601DateArray({
      iso8601Dates: iso8601Dates,
      isStartIncluded: false,
      isStopIncluded: false,
      leadingInterval: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(5);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(true);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(true);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    // Remove leading interval and check the rest
    checkIntervals(intervals, julianDates, false, false, dataCallback);
  });

  it("fromIso8601DurationArray handles relativeToPrevious set to false", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);
    const iso8601Durations = ["PT0M", "PT1M", "PT2M", "PT3M"];

    const intervals = TimeIntervalCollection.fromIso8601DurationArray({
      epoch: julianDates[0],
      iso8601Durations: iso8601Durations,
      relativeToPrevious: false,
      isStartIncluded: false,
      isStopIncluded: false,
      leadingInterval: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(5);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(true);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(true);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    // Remove leading interval and check the rest
    checkIntervals(intervals, julianDates, false, false, dataCallback);
  });

  it("fromIso8601DurationArray handles relativeToPrevious set to true", function () {
    const dataSpy = jasmine.createSpy("data").and.callFake(dataCallback);
    const iso8601Dates = [
      "2016-12-31T23:58:01.5Z",
      "2016-12-31T23:59:01.5Z",
      "2017-01-01T00:00:01.5Z",
      "2017-01-01T00:01:01.5Z",
    ];
    const julianDates = iso8601ToJulianDateArray(iso8601Dates);
    const iso8601Durations = ["PT0M", "PT1M", "PT1M", "PT1M"];

    const intervals = TimeIntervalCollection.fromIso8601DurationArray({
      epoch: julianDates[0],
      iso8601Durations: iso8601Durations,
      relativeToPrevious: true,
      isStartIncluded: false,
      isStopIncluded: false,
      leadingInterval: true,
      trailingInterval: true,
      dataCallback: dataSpy,
    });

    expect(dataSpy.calls.count()).toEqual(5);
    for (let i = 0; i < 4; ++i) {
      expect(dataSpy).toHaveBeenCalledWith(intervals.get(i), i);
    }

    // Check leading interval
    const leading = intervals._intervals.shift();
    expect(JulianDate.compare(leading.start, Iso8601.MINIMUM_VALUE)).toEqual(0);
    expect(JulianDate.compare(leading.stop, julianDates[0])).toEqual(0);
    expect(leading.isStartIncluded).toBe(true);
    expect(leading.isStopIncluded).toBe(true);
    expect(leading.data).toEqual(dataCallback(leading, 0));

    // Check trailing interval
    const trailing = intervals._intervals.pop();
    expect(
      JulianDate.compare(trailing.start, julianDates[iso8601Dates.length - 1])
    ).toEqual(0);
    expect(JulianDate.compare(trailing.stop, Iso8601.MAXIMUM_VALUE)).toEqual(0);
    expect(trailing.isStartIncluded).toBe(true);
    expect(trailing.isStopIncluded).toBe(true);
    expect(trailing.data).toEqual(dataCallback(trailing, 4));

    // Remove leading interval and check the rest
    checkIntervals(intervals, julianDates, false, false, dataCallback);
  });
});
