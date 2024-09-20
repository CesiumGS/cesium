import {
  JulianDate,
  CallbackPositionProperty,
  Cartesian3,
  PositionProperty,
  ReferenceFrame,
} from "../../index.js";

describe("DataSources/CallbackPositionProperty", function () {
  const time = JulianDate.now();

  it("constructor throws with undefined isConstant", function () {
    expect(function () {
      return new CallbackPositionProperty(function () {}, undefined);
    }).toThrowDeveloperError();
  });

  it("constructor throws with undefined callback", function () {
    expect(function () {
      return new CallbackPositionProperty(undefined, true);
    }).toThrowDeveloperError();
  });

  it("constructor sets expected defaults", function () {
    const callback = jasmine.createSpy("callback");
    let property = new CallbackPositionProperty(callback, true);
    expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);

    property = new CallbackPositionProperty(
      callback,
      true,
      ReferenceFrame.INERTIAL
    );
    expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
  });

  it("callback received proper parameters", function () {
    const result = {};
    const callback = jasmine.createSpy("callback");
    const property = new CallbackPositionProperty(callback, true);
    property.getValue(time, result);
    expect(callback).toHaveBeenCalledWith(time, result);
  });

  it("getValue returns callback result", function () {
    const value = new Cartesian3(1, 2, 3);
    const callback = function (_time, result) {
      return value.clone(result);
    };
    const property = new CallbackPositionProperty(callback, true);
    const result = property.getValue(time);
    expect(result).not.toBe(value);
    expect(result).toEqual(value);

    const value2 = new Cartesian3();
    expect(property.getValue(time, value2)).toBe(value2);
  });

  it("getValue returns in fixed frame", function () {
    const valueInertial = new Cartesian3(1, 2, 3);
    const valueFixed = PositionProperty.convertToReferenceFrame(
      time,
      valueInertial,
      ReferenceFrame.INERTIAL,
      ReferenceFrame.FIXED
    );
    const callback = function (_time, result) {
      return valueInertial.clone(result);
    };
    const property = new CallbackPositionProperty(
      callback,
      true,
      ReferenceFrame.INERTIAL
    );

    const result = property.getValue(time);
    expect(result).toEqual(valueFixed);
  });

  it("getValue uses JulianDate.now() if time parameter is undefined", function () {
    spyOn(JulianDate, "now").and.callThrough();

    const value = new Cartesian3(1, 2, 3);
    const callback = function (_time, result) {
      return value.clone(result);
    };
    const property = new CallbackPositionProperty(callback, true);
    const actualResult = property.getValue();
    expect(JulianDate.now).toHaveBeenCalled();
    expect(actualResult).toEqual(value);
  });

  it("getValueInReferenceFrame works without a result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const callback = function (_time, result) {
      return value.clone(result);
    };
    const property = new CallbackPositionProperty(callback, true);

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
    const callback = function (_time, result) {
      return value.clone(result);
    };
    const property = new CallbackPositionProperty(
      callback,
      true,
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

  it("getValueInReferenceFrame throws with undefined time", function () {
    const property = new CallbackPositionProperty(function () {}, true);

    expect(function () {
      property.getValueInReferenceFrame(undefined, ReferenceFrame.FIXED);
    }).toThrowDeveloperError();
  });

  it("getValueInReferenceFrame throws with undefined reference frame", function () {
    const property = new CallbackPositionProperty(function () {}, true);

    expect(function () {
      property.getValueInReferenceFrame(time, undefined);
    }).toThrowDeveloperError();
  });

  it("isConstant returns correct value", function () {
    const property = new CallbackPositionProperty(function () {}, true);
    expect(property.isConstant).toBe(true);
    property.setCallback(function () {}, false);
    expect(property.isConstant).toBe(false);
  });

  it("setCallback raises definitionChanged event", function () {
    const property = new CallbackPositionProperty(function () {}, true);
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setCallback(function () {}, false);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("equals works", function () {
    const callback = function () {};
    const left = new CallbackPositionProperty(callback, true);
    let right = new CallbackPositionProperty(callback, true);

    expect(left.equals(right)).toEqual(true);

    right.setCallback(callback, false);
    expect(left.equals(right)).toEqual(false);

    right.setCallback(function () {
      return undefined;
    }, true);
    expect(left.equals(right)).toEqual(false);

    right = new CallbackPositionProperty(
      callback,
      true,
      ReferenceFrame.INERTIAL
    );
    expect(left.equals(right)).toEqual(false);
  });
});
