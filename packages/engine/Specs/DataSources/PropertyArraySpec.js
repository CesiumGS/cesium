import {
  JulianDate,
  ConstantProperty,
  PropertyArray,
  SampledProperty,
} from "../../index.js";

describe("DataSources/PropertyArray", function () {
  const time = JulianDate.now();

  it("default constructor sets expected values", function () {
    const property = new PropertyArray();
    expect(property.isConstant).toBe(true);
    expect(property.getValue(time)).toBeUndefined();
  });

  it("constructor sets expected values", function () {
    const expected = [1, 2];
    const value = [new ConstantProperty(1), new ConstantProperty(2)];
    const property = new PropertyArray(value);
    expect(property.getValue(time)).toEqual(expected);
  });

  it("setValue raises definitionChanged event", function () {
    const property = new PropertyArray();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue([]);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("changing array member raises definitionChanged event", function () {
    const property = new PropertyArray();
    const item = new ConstantProperty(1);
    property.setValue([item]);
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    item.setValue(2);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("works with result parameter", function () {
    const expected = [1, 2];
    const expectedResult = [];
    const value = [new ConstantProperty(1), new ConstantProperty(2)];
    const property = new PropertyArray(value);
    const result = property.getValue(time, expectedResult);
    expect(result).toEqual(expected);
    expect(result).toBe(expectedResult);
  });

  it("works with undefined value", function () {
    const property = new PropertyArray();
    property.setValue(undefined);
    expect(property.getValue(time)).toBeUndefined();
  });

  it("ignores undefined property values", function () {
    const property = new PropertyArray();
    property.setValue([new ConstantProperty()]);
    expect(property.getValue(time)).toEqual([]);
  });

  it("works with empty array", function () {
    const property = new PropertyArray();
    property.setValue([]);
    expect(property.getValue(time)).toEqual([]);
  });

  it("equals works", function () {
    let left = new PropertyArray([new ConstantProperty(1)]);
    let right = new PropertyArray([new ConstantProperty(1)]);

    expect(left.equals(right)).toEqual(true);

    right = new PropertyArray([new ConstantProperty(2)]);
    expect(left.equals(right)).toEqual(false);

    left = new PropertyArray();
    right = new PropertyArray();
    expect(left.equals(right)).toEqual(true);
  });

  it("isConstant is true only if all members are constant", function () {
    const property = new PropertyArray();

    property.setValue([new ConstantProperty(2)]);
    expect(property.isConstant).toBe(true);

    const sampledProperty = new SampledProperty(Number);
    sampledProperty.addSample(time, 1);
    property.setValue([new ConstantProperty(2), sampledProperty]);

    expect(property.isConstant).toBe(false);
  });
});
