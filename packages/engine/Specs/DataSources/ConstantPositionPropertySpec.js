import {
  Cartesian3,
  JulianDate,
  ReferenceFrame,
  ConstantPositionProperty,
  PositionProperty,
} from "../../index.js";;

describe("DataSources/ConstantPositionProperty", function () {
  const time = JulianDate.now();

  it("Constructor sets expected defaults", function () {
    let property = new ConstantPositionProperty();
    expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);

    property = new ConstantPositionProperty(
      new Cartesian3(1, 2, 3),
      ReferenceFrame.INERTIAL
    );
    expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
  });

  it("getValue works without a result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantPositionProperty(value);

    const result = property.getValue(time);
    expect(result).not.toBe(value);
    expect(result).toEqual(value);
  });

  it("getValue works with a result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantPositionProperty(value);

    const expected = new Cartesian3();
    const result = property.getValue(time, expected);
    expect(result).toBe(expected);
    expect(expected).toEqual(value);
  });

  it("getValue returns in fixed frame", function () {
    const valueInertial = new Cartesian3(1, 2, 3);
    const valueFixed = PositionProperty.convertToReferenceFrame(
      time,
      valueInertial,
      ReferenceFrame.INERTIAL,
      ReferenceFrame.FIXED
    );
    const property = new ConstantPositionProperty(
      valueInertial,
      ReferenceFrame.INERTIAL
    );

    const result = property.getValue(time);
    expect(result).toEqual(valueFixed);
  });

  it("getValue works with undefined fixed value", function () {
    const property = new ConstantPositionProperty(undefined);
    expect(property.getValue(time)).toBeUndefined();
  });

  it("getValue work swith undefined inertial value", function () {
    const property = new ConstantPositionProperty(
      undefined,
      ReferenceFrame.INERTIAL
    );
    expect(property.getValue(time)).toBeUndefined();
  });

  it("getValueInReferenceFrame works without a result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantPositionProperty(value);

    const result = property.getValueInReferenceFrame(
      time,
      ReferenceFrame.INERTIAL
    );
    expect(result).not.toBe(value);
    expect(result).toEqual(
      PositionProperty.convertToReferenceFrame(
        time,
        value,
        ReferenceFrame.FIXED,
        ReferenceFrame.INERTIAL
      )
    );
  });

  it("getValueInReferenceFrame works with a result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantPositionProperty(
      value,
      ReferenceFrame.INERTIAL
    );

    const expected = new Cartesian3();
    const result = property.getValueInReferenceFrame(
      time,
      ReferenceFrame.FIXED,
      expected
    );
    expect(result).toBe(expected);
    expect(expected).toEqual(
      PositionProperty.convertToReferenceFrame(
        time,
        value,
        ReferenceFrame.INERTIAL,
        ReferenceFrame.FIXED
      )
    );
  });

  it("setValue raises definitionChanged event", function () {
    const property = new ConstantPositionProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue(new Cartesian3(1, 2, 3));
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("setValue does not raise definitionChanged event with equal data", function () {
    const property = new ConstantPositionProperty(new Cartesian3(0, 0, 0));
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue(new Cartesian3(0, 0, 0));
    expect(listener.calls.count()).toBe(0);
  });

  it("setValue raises definitionChanged when referenceFrame changes", function () {
    const property = new ConstantPositionProperty(
      new Cartesian3(0, 0, 0),
      ReferenceFrame.FIXED
    );
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue(new Cartesian3(0, 0, 0), ReferenceFrame.INERTIAL);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("equals works", function () {
    const left = new ConstantPositionProperty(
      new Cartesian3(1, 2, 3),
      ReferenceFrame.INERTIAL
    );
    let right = new ConstantPositionProperty(
      new Cartesian3(1, 2, 3),
      ReferenceFrame.INERTIAL
    );

    expect(left.equals(right)).toEqual(true);

    right = new ConstantPositionProperty(
      new Cartesian3(1, 2, 3),
      ReferenceFrame.FIXED
    );
    expect(left.equals(right)).toEqual(false);

    right = new ConstantPositionProperty(
      new Cartesian3(1, 2, 4),
      ReferenceFrame.INERTIAL
    );
    expect(left.equals(right)).toEqual(false);
  });

  it("getValue throws without time parameter", function () {
    const property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
    expect(function () {
      property.getValue(undefined);
    }).toThrowDeveloperError();
  });

  it("getValueInReferenceFrame throws with no referenceFrame parameter", function () {
    const property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
    expect(function () {
      property.getValueInReferenceFrame(time, undefined);
    }).toThrowDeveloperError();
  });
});
