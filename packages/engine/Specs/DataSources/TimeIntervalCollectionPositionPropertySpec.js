import {
  Cartesian3,
  JulianDate,
  ReferenceFrame,
  TimeInterval,
  TimeIntervalCollection,
  PositionProperty,
  TimeIntervalCollectionPositionProperty,
} from "../../index.js";;

describe("DataSources/TimeIntervalCollectionPositionProperty", function () {
  it("default constructor has expected values", function () {
    const property = new TimeIntervalCollectionPositionProperty();
    expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
    expect(property.getValue(JulianDate.now())).toBeUndefined();
    expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
  });

  it("getValue works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    const property = new TimeIntervalCollectionPositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const result1 = property.getValue(interval1.start);
    expect(result1).not.toBe(interval1.data);
    expect(result1).toEqual(interval1.data);

    const result2 = property.getValue(interval2.stop);
    expect(result2).not.toBe(interval2.data);
    expect(result2).toEqual(interval2.data);
  });

  it("getValue works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    const property = new TimeIntervalCollectionPositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const expected = new Cartesian3();
    const result1 = property.getValue(interval1.start, expected);
    expect(result1).toBe(expected);
    expect(result1).toEqual(interval1.data);

    const result2 = property.getValue(interval2.stop, expected);
    expect(result2).toBe(expected);
    expect(result2).toEqual(interval2.data);
  });

  it("getValue returns in fixed frame", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });

    const property = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.INERTIAL
    );
    property.intervals.addInterval(interval1);

    const valueInertial = new Cartesian3(1, 2, 3);
    const valueFixed = PositionProperty.convertToReferenceFrame(
      interval1.start,
      valueInertial,
      ReferenceFrame.INERTIAL,
      ReferenceFrame.FIXED
    );

    const result = property.getValue(interval1.start);
    expect(result).toEqual(valueFixed);
  });

  it("getValueInReferenceFrame works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    const property = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.FIXED
    );
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const valueInertial = PositionProperty.convertToReferenceFrame(
      interval1.start,
      interval1.data,
      ReferenceFrame.FIXED,
      ReferenceFrame.INERTIAL
    );

    const expected = new Cartesian3();
    const result1 = property.getValueInReferenceFrame(
      interval1.start,
      ReferenceFrame.INERTIAL,
      expected
    );
    expect(result1).toBe(expected);
    expect(result1).toEqual(valueInertial);

    const result2 = property.getValueInReferenceFrame(
      interval2.stop,
      ReferenceFrame.FIXED,
      expected
    );
    expect(result2).toBe(expected);
    expect(result2).toEqual(interval2.data);
  });

  it("getValueInReferenceFrame works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    const property = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.FIXED
    );
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const valueInertial = PositionProperty.convertToReferenceFrame(
      interval1.start,
      interval1.data,
      ReferenceFrame.FIXED,
      ReferenceFrame.INERTIAL
    );

    const result1 = property.getValueInReferenceFrame(
      interval1.start,
      ReferenceFrame.INERTIAL
    );
    expect(result1).toEqual(valueInertial);

    const result2 = property.getValueInReferenceFrame(
      interval2.stop,
      ReferenceFrame.FIXED
    );
    expect(result2).toEqual(interval2.data);
  });

  it("returns undefined for valid interval without data", function () {
    const property = new TimeIntervalCollectionPositionProperty();

    const interval = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
    });
    property.intervals.addInterval(interval);

    const result = property.getValue(interval.start);
    expect(result).toBeUndefined();
  });

  it("throws with no time parameter", function () {
    const property = new TimeIntervalCollectionPositionProperty();
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });

  it("throws with no reference frame parameter", function () {
    const property = new TimeIntervalCollectionPositionProperty();
    const time = JulianDate.now();
    expect(function () {
      property.getValueInReferenceFrame(time, undefined);
    }).toThrowDeveloperError();
  });

  it("equals works for differing referenceFrames", function () {
    const left = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.FIXED
    );
    let right = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.INERTIAL
    );
    expect(left.equals(right)).toEqual(false);

    right = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
    expect(left.equals(right)).toEqual(true);
  });

  it("equals works for differing intervals", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new Cartesian3(4, 5, 6),
    });

    const left = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.FIXED
    );
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    const right = new TimeIntervalCollectionPositionProperty(
      ReferenceFrame.FIXED
    );
    right.intervals.addInterval(interval1);

    expect(left.equals(right)).toEqual(false);
    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged event", function () {
    const interval = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new Cartesian3(1, 2, 3),
    });

    const property = new TimeIntervalCollectionPositionProperty();
    const listener = jasmine.createSpy("listener");
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
