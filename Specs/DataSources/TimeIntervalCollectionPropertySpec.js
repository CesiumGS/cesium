import { Cartesian3 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";

describe("DataSources/TimeIntervalCollectionProperty", function () {
  it("default constructor has expected values", function () {
    var property = new TimeIntervalCollectionProperty();
    expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
    expect(property.getValue(JulianDate.now())).toBeUndefined();
    expect(property.isConstant).toBe(true);
  });

  it("works with basic types", function () {
    var interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: 5,
    });
    var interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: 6,
    });

    var property = new TimeIntervalCollectionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    expect(property.getValue(interval1.start)).toBe(interval1.data);
    expect(property.getValue(interval2.stop)).toBe(interval2.data);
    expect(property.isConstant).toBe(false);
  });

  it("works with clonable objects", function () {
    var interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    var interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    var property = new TimeIntervalCollectionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    var result1 = property.getValue(interval1.start);
    expect(result1).not.toBe(interval1.data);
    expect(result1).toEqual(interval1.data);

    var result2 = property.getValue(interval2.stop);
    expect(result2).not.toBe(interval2.data);
    expect(result2).toEqual(interval2.data);
  });

  it("works with a result parameter", function () {
    var interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    var interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    var property = new TimeIntervalCollectionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    var expected = new Cartesian3();
    var result1 = property.getValue(interval1.start, expected);
    expect(result1).toBe(expected);
    expect(result1).toEqual(interval1.data);

    var result2 = property.getValue(interval2.stop, expected);
    expect(result2).toBe(expected);
    expect(result2).toEqual(interval2.data);
  });

  it("throws with no time parameter", function () {
    var property = new TimeIntervalCollectionProperty();
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });

  it("equals works for differing basic type intervals", function () {
    var interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: 5,
    });
    var interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: 6,
    });

    var left = new TimeIntervalCollectionProperty();
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    var right = new TimeIntervalCollectionProperty();
    right.intervals.addInterval(interval1);

    expect(left.equals(right)).toEqual(false);
    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);
  });

  it("equals works for differing complex type intervals", function () {
    var interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    var interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    var left = new TimeIntervalCollectionProperty();
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    var right = new TimeIntervalCollectionProperty();
    right.intervals.addInterval(interval1);

    expect(left.equals(right)).toEqual(false);
    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged event", function () {
    var interval = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });

    var property = new TimeIntervalCollectionProperty();
    var listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.intervals.addInterval(interval);
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();

    property.intervals.removeInterval(interval);
    expect(listener).toHaveBeenCalledWith(property);

    property.intervals.addInterval(interval);
    listener.calls.reset();
    property.intervals.removeAll();
    expect(listener).toHaveBeenCalledWith(property);
  });
});
