import { JulianDate, CallbackProperty } from "../../index.js";;

describe("DataSources/CallbackProperty", function () {
  const time = JulianDate.now();

  it("callback received proper parameters", function () {
    const result = {};
    const callback = jasmine.createSpy("callback");
    const property = new CallbackProperty(callback, true);
    property.getValue(time, result);
    expect(callback).toHaveBeenCalledWith(time, result);
  });

  it("getValue returns callback result", function () {
    const result = {};
    const callback = function (time, result) {
      return result;
    };
    const property = new CallbackProperty(callback, true);
    expect(property.getValue(time, result)).toBe(result);
  });

  it("isConstant returns correct value", function () {
    const property = new CallbackProperty(function () {}, true);
    expect(property.isConstant).toBe(true);
    property.setCallback(function () {}, false);
    expect(property.isConstant).toBe(false);
  });

  it("setCallback raises definitionChanged event", function () {
    const property = new CallbackProperty(function () {}, true);
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setCallback(function () {}, false);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("constructor throws with undefined isConstant", function () {
    expect(function () {
      return new CallbackProperty(function () {}, undefined);
    }).toThrowDeveloperError();
  });

  it("constructor throws with undefined callback", function () {
    expect(function () {
      return new CallbackProperty(undefined, true);
    }).toThrowDeveloperError();
  });

  it("equals works", function () {
    const callback = function () {};
    const left = new CallbackProperty(callback, true);
    const right = new CallbackProperty(callback, true);

    expect(left.equals(right)).toEqual(true);

    right.setCallback(callback, false);
    expect(left.equals(right)).toEqual(false);

    right.setCallback(function () {
      return undefined;
    }, true);
    expect(left.equals(right)).toEqual(false);
  });
});
