import {
  Cartesian3,
  JulianDate,
  ConstantProperty,
} from "../../../Source/Cesium.js";

describe("DataSources/ConstantProperty", function () {
  const time = JulianDate.now();

  it("works with basic types", function () {
    const expected = 5;
    const property = new ConstantProperty(expected);
    expect(property.getValue(time)).toBe(expected);

    expect(property.valueOf()).toBe(expected);
    expect(property.toString()).toBe(expected.toString());
    expect(0 + property).toBe(expected);
    expect(`0${property}`).toBe(`0${expected}`);
  });

  it("works with objects", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantProperty(value);

    const result = property.getValue(time);
    expect(result).not.toBe(value);
    expect(result).toEqual(value);

    expect(property.valueOf()).toEqual(value);
    expect(property.toString()).toEqual(value.toString());
  });

  it("works with objects without clone", function () {
    const value = {};
    const property = new ConstantProperty(value);

    const result = property.getValue(time);
    expect(result).toBe(value);
    expect(result).toEqual(value);

    expect(property.valueOf()).toEqual(value);
    expect(property.toString()).toEqual(value.toString());
  });

  it("setValue raises definitionChanged event", function () {
    const property = new ConstantProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue(5);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("setValue does not raise definitionChanged event with equal data", function () {
    const property = new ConstantProperty(new Cartesian3(0, 0, 0));
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue(new Cartesian3(0, 0, 0));
    expect(listener.calls.count()).toBe(0);
  });

  it("works with objects with result parameter", function () {
    const value = new Cartesian3(1, 2, 3);
    const property = new ConstantProperty(value);

    const expected = new Cartesian3();
    const result = property.getValue(time, expected);
    expect(result).toBe(expected);
    expect(expected).toEqual(value);
  });

  it("works with undefined value", function () {
    const property = new ConstantProperty(undefined);
    expect(property.getValue()).toBeUndefined();

    expect(property.valueOf()).toBeUndefined();
    expect(0 + property).toBeNaN();
    expect(`0${property}`).toBe("0" + "undefined");
  });

  it('equals works for object types with "equals" function', function () {
    const left = new ConstantProperty(new Cartesian3(1, 2, 3));
    let right = new ConstantProperty(new Cartesian3(1, 2, 3));

    expect(left.equals(right)).toEqual(true);

    right = new ConstantProperty(new Cartesian3(1, 2, 4));
    expect(left.equals(right)).toEqual(false);
  });

  it('equals works for object types without "equals" function', function () {
    const value = {};
    const left = new ConstantProperty(value);
    let right = new ConstantProperty(value);

    expect(left.equals(right)).toEqual(true);

    right = new ConstantProperty({});
    expect(left.equals(right)).toEqual(false);
  });

  it("equals works for simple types", function () {
    const left = new ConstantProperty(1);
    let right = new ConstantProperty(1);

    expect(left.equals(right)).toEqual(true);

    right = new ConstantProperty(2);
    expect(left.equals(right)).toEqual(false);
  });
});
