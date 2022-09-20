import {
  Color,
  JulianDate,
  TimeInterval,
  TimeIntervalCollection,
  ColorMaterialProperty,
  CompositeMaterialProperty,
  GridMaterialProperty,
} from "../../index.js";;

describe("DataSources/CompositeMaterialProperty", function () {
  it("default constructor has expected values", function () {
    const property = new CompositeMaterialProperty();
    expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
    expect(property.isConstant).toBe(true);
    expect(property.getType(JulianDate.now())).toBeUndefined();
    expect(property.getValue(JulianDate.now())).toBeUndefined();
  });

  it("works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ColorMaterialProperty(),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new GridMaterialProperty(),
    });

    const property = new CompositeMaterialProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(property.isConstant).toBe(false);

    const result1 = property.getValue(interval1.start);
    expect(property.getType(interval1.start)).toEqual("Color");
    expect(result1).not.toBe(interval1.data.getValue(interval1.start));
    expect(result1).toEqual(interval1.data.getValue(interval1.start));

    const result2 = property.getValue(interval2.stop);
    expect(property.getType(interval2.stop)).toEqual("Grid");
    expect(result2).not.toBe(interval2.data.getValue(interval2.stop));
    expect(result2).toEqual(interval2.data.getValue(interval2.stop));
  });

  it("works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ColorMaterialProperty(),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new GridMaterialProperty(),
    });

    const property = new CompositeMaterialProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(property.isConstant).toBe(false);

    const expected = {};
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
      data: new ColorMaterialProperty(),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new GridMaterialProperty(),
    });

    const left = new CompositeMaterialProperty();
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    const right = new CompositeMaterialProperty();
    right.intervals.addInterval(interval1);

    expect(left.equals(right)).toEqual(false);

    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged event in all cases", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ColorMaterialProperty(Color.RED),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ColorMaterialProperty(Color.YELLOW),
    });

    const property = new CompositeMaterialProperty();
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

    interval1.data.color.setValue(Color.BLUE);
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
      data: new ColorMaterialProperty(Color.RED),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ColorMaterialProperty(Color.YELLOW),
    });

    const property = new CompositeMaterialProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(listener.calls.count()).toBe(2);

    //interval2 overwrites interval1, so calls.count() should not increase.
    interval1.data.color.setValue(Color.BLUE);
    expect(listener.calls.count()).toBe(2);
  });

  it("getValue throws with no time parameter", function () {
    const property = new CompositeMaterialProperty();
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });

  it("getType throws with no time parameter", function () {
    const property = new CompositeMaterialProperty();
    expect(function () {
      property.getType(undefined);
    }).toThrowDeveloperError();
  });
});
