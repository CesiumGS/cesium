import { Cartesian3 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { CompositeProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";

describe("DataSources/CompositeProperty", function () {
  it("default constructor has expected values", function () {
    const property = new CompositeProperty();
    expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
    expect(property.getValue(JulianDate.now())).toBeUndefined();
    expect(property.isConstant).toBe(true);
  });

  it("works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositeProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(property.isConstant).toBe(false);

    const result1 = property.getValue(interval1.start);
    expect(result1).not.toBe(interval1.data.getValue(interval1.start));
    expect(result1).toEqual(interval1.data.getValue(interval1.start));

    const result2 = property.getValue(interval2.stop);
    expect(result2).not.toBe(interval2.data.getValue(interval2.stop));
    expect(result2).toEqual(interval2.data.getValue(interval2.stop));
  });

  it("works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositeProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(property.isConstant).toBe(false);

    const expected = new Cartesian3();
    const result1 = property.getValue(interval1.start, expected);
    expect(result1).toBe(expected);
    expect(result1).toEqual(interval1.data.getValue(interval1.start));

    const result2 = property.getValue(interval2.stop, expected);
    expect(result2).toBe(expected);
    expect(result2).toEqual(interval2.data.getValue(interval2.stop));
  });

  it("equals works", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantProperty(new Cartesian3(4, 5, 6)),
    });

    const left = new CompositeProperty();
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    const right = new CompositeProperty();
    right.intervals.addInterval(interval1);
    expect(left.equals(right)).toEqual(false);

    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged event in all cases", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositeProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.intervals.addInterval(interval1);
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();

    property.intervals.addInterval(interval2);
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();

    property.intervals.removeInterval(interval2);
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();

    interval1.data.setValue(new Cartesian3());
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();

    property.intervals.removeAll();
    expect(listener).toHaveBeenCalledWith(property);
    listener.calls.reset();
  });

  it("does not raise definitionChanged for an overwritten interval", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(11, 0),
      stop: new JulianDate(13, 0),
      data: new ConstantProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(10),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositeProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(listener.calls.count()).toBe(2);

    //interval2 overwrites interval1, so calls.count() should not increase.
    interval1.data.setValue(new Cartesian3());
    expect(listener.calls.count()).toBe(2);
  });

  it("getValue throws with no time parameter", function () {
    const property = new CompositeProperty();
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });
});
