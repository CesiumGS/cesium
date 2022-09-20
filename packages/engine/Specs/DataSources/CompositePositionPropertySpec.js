import {
  Cartesian3,
  JulianDate,
  ReferenceFrame,
  TimeInterval,
  TimeIntervalCollection,
  CompositePositionProperty,
  ConstantPositionProperty,
  PositionProperty,
} from "../../../Source/Cesium.js";

describe("DataSources/CompositePositionProperty", function () {
  it("default constructor has expected values", function () {
    const property = new CompositePositionProperty();
    expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
    expect(property.getValue(JulianDate.now())).toBeUndefined();
    expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
    expect(property.isConstant).toBe(true);
  });

  it("constructor sets expected values", function () {
    const property = new CompositePositionProperty(ReferenceFrame.INERTIAL);
    expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
  });

  it("can modify reference frame", function () {
    const property = new CompositePositionProperty();
    expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
    property.referenceFrame = ReferenceFrame.INERTIAL;
    expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
  });

  it("works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositePositionProperty();
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

  it("getValue works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositePositionProperty();
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

  it("getValue works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositePositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const result1 = property.getValue(interval1.start);
    expect(result1).toEqual(interval1.data.getValue(interval1.start));

    const result2 = property.getValue(interval2.stop);
    expect(result2).toEqual(interval2.data.getValue(interval2.stop));
  });

  it("getValue returns in fixed frame", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(
        new Cartesian3(1, 2, 3),
        ReferenceFrame.INERTIAL
      ),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(
        new Cartesian3(4, 5, 6),
        ReferenceFrame.FIXED
      ),
    });

    const property = new CompositePositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const valueInertial = new Cartesian3(1, 2, 3);
    const valueFixed = PositionProperty.convertToReferenceFrame(
      interval1.start,
      valueInertial,
      ReferenceFrame.INERTIAL,
      ReferenceFrame.FIXED
    );

    const result1 = property.getValue(interval1.start);
    expect(result1).toEqual(valueFixed);

    const result2 = property.getValue(interval2.stop);
    expect(result2).toEqual(interval2.data.getValue(interval2.stop));
  });

  it("getValueInReferenceFrame works with a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(
        new Cartesian3(1, 2, 3),
        ReferenceFrame.INERTIAL
      ),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(
        new Cartesian3(4, 5, 6),
        ReferenceFrame.FIXED
      ),
    });

    const property = new CompositePositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const expected = new Cartesian3();
    const result1 = property.getValueInReferenceFrame(
      interval1.start,
      ReferenceFrame.INERTIAL,
      expected
    );
    expect(result1).toBe(expected);
    expect(result1).toEqual(
      interval1.data.getValueInReferenceFrame(
        interval1.start,
        ReferenceFrame.INERTIAL
      )
    );

    const result2 = property.getValueInReferenceFrame(
      interval2.stop,
      ReferenceFrame.FIXED,
      expected
    );
    expect(result2).toBe(expected);
    expect(result2).toEqual(
      interval2.data.getValueInReferenceFrame(
        interval2.stop,
        ReferenceFrame.FIXED
      )
    );
  });

  it("getValueInReferenceFrame works without a result parameter", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(
        new Cartesian3(1, 2, 3),
        ReferenceFrame.INERTIAL
      ),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(
        new Cartesian3(4, 5, 6),
        ReferenceFrame.FIXED
      ),
    });

    const property = new CompositePositionProperty();
    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);

    const result1 = property.getValueInReferenceFrame(
      interval1.start,
      ReferenceFrame.INERTIAL
    );
    expect(result1).toEqual(
      interval1.data.getValueInReferenceFrame(
        interval1.start,
        ReferenceFrame.INERTIAL
      )
    );

    const result2 = property.getValueInReferenceFrame(
      interval2.stop,
      ReferenceFrame.FIXED
    );
    expect(result2).toEqual(
      interval2.data.getValueInReferenceFrame(
        interval2.stop,
        ReferenceFrame.FIXED
      )
    );
  });

  it("equals works", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const left = new CompositePositionProperty();
    left.intervals.addInterval(interval1);
    left.intervals.addInterval(interval2);

    const right = new CompositePositionProperty();
    right.intervals.addInterval(interval1);
    expect(left.equals(right)).toEqual(false);

    right.intervals.addInterval(interval2);
    expect(left.equals(right)).toEqual(true);

    right.referenceFrame = ReferenceFrame.INERTIAL;
    expect(left.equals(right)).toEqual(false);
  });

  it("getValue throws with no time parameter", function () {
    const property = new CompositePositionProperty();
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });

  it("getValueInReferenceFrame throws with no referenceFrame parameter", function () {
    const property = new CompositePositionProperty();
    const time = JulianDate.now();
    expect(function () {
      property.getValueInReferenceFrame(time, undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged event in all cases", function () {
    const interval1 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(12, 0),
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(12, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositePositionProperty();
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
      data: new ConstantPositionProperty(new Cartesian3(1, 2, 3)),
    });
    const interval2 = new TimeInterval({
      start: new JulianDate(10, 0),
      stop: new JulianDate(14, 0),
      isStartIncluded: false,
      data: new ConstantPositionProperty(new Cartesian3(4, 5, 6)),
    });

    const property = new CompositePositionProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.intervals.addInterval(interval1);
    property.intervals.addInterval(interval2);
    expect(listener.calls.count()).toBe(2);

    //interval2 overwrites interval1, so calls.count() should not increase.
    interval1.data.setValue(new Cartesian3());
    expect(listener.calls.count()).toBe(2);
  });
});
