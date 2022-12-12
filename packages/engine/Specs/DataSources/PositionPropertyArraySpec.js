import {
  Cartesian3,
  JulianDate,
  ReferenceFrame,
  ConstantPositionProperty,
  PositionPropertyArray,
  SampledPositionProperty,
} from "../../index.js";

describe("DataSources/PositionPropertyArray", function () {
  const time = JulianDate.now();

  it("default constructor sets expected values", function () {
    const property = new PositionPropertyArray();
    expect(property.isConstant).toBe(true);
    expect(property.getValue(time)).toBeUndefined();
  });

  it("constructor sets expected values", function () {
    const expected = [Cartesian3.UNIT_X, Cartesian3.UNIT_Z];
    const value = [
      new ConstantPositionProperty(Cartesian3.UNIT_X),
      new ConstantPositionProperty(Cartesian3.UNIT_Z),
    ];
    const property = new PositionPropertyArray(value);
    expect(property.getValue(time)).toEqual(expected);
  });

  it("setValue raises definitionChanged event", function () {
    const property = new PositionPropertyArray();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    property.setValue([]);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("changing array member raises definitionChanged event", function () {
    const property = new PositionPropertyArray();
    const item = new ConstantPositionProperty(Cartesian3.UNIT_X);
    property.setValue([item]);
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);
    item.setValue(Cartesian3.UNIT_Z);
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("works with result parameter", function () {
    const expected = [Cartesian3.UNIT_X, Cartesian3.UNIT_Z];
    const expectedResult = [];
    const value = [
      new ConstantPositionProperty(Cartesian3.UNIT_X),
      new ConstantPositionProperty(Cartesian3.UNIT_Z),
    ];
    const property = new PositionPropertyArray(value);
    const result = property.getValue(time, expectedResult);
    expect(result).toEqual(expected);
    expect(result).toBe(expectedResult);
  });

  it("works with  reference frame parameter", function () {
    const value = [
      new ConstantPositionProperty(Cartesian3.UNIT_X, ReferenceFrame.INERTIAL),
      new ConstantPositionProperty(Cartesian3.UNIT_Z, ReferenceFrame.FIXED),
    ];
    const expected = [
      value[0].getValueInReferenceFrame(time, ReferenceFrame.INERTIAL),
      value[1].getValueInReferenceFrame(time, ReferenceFrame.INERTIAL),
    ];
    const property = new PositionPropertyArray(value);
    const result = property.getValueInReferenceFrame(
      time,
      ReferenceFrame.INERTIAL
    );
    expect(result).toEqual(expected);
  });

  it("works with undefined value", function () {
    const property = new PositionPropertyArray();
    property.setValue(undefined);
    expect(property.getValue(time)).toBeUndefined();
  });

  it("works with undefined propertyvalue", function () {
    const property = new PositionPropertyArray();
    property.setValue([new ConstantPositionProperty()]);
    expect(property.getValue(time)).toEqual([]);
  });

  it("works with empty array", function () {
    const property = new PositionPropertyArray();
    property.setValue([]);
    expect(property.getValue(time)).toEqual([]);
  });

  it("equals works", function () {
    let left = new PositionPropertyArray([
      new ConstantPositionProperty(Cartesian3.UNIT_X),
    ]);
    let right = new PositionPropertyArray([
      new ConstantPositionProperty(Cartesian3.UNIT_X),
    ]);

    expect(left.equals(right)).toEqual(true);

    right = new PositionPropertyArray([
      new ConstantPositionProperty(Cartesian3.UNIT_Z),
    ]);
    expect(left.equals(right)).toEqual(false);

    left = new PositionPropertyArray();
    right = new PositionPropertyArray();
    expect(left.equals(right)).toEqual(true);
  });

  it("isConstant is true only if all members are constant", function () {
    const property = new PositionPropertyArray();

    property.setValue([new ConstantPositionProperty(Cartesian3.UNIT_X)]);
    expect(property.isConstant).toBe(true);

    const sampledProperty = new SampledPositionProperty();
    sampledProperty.addSample(time, Cartesian3.UNIT_X);
    property.setValue([
      new ConstantPositionProperty(Cartesian3.UNIT_Z),
      sampledProperty,
    ]);

    expect(property.isConstant).toBe(false);
  });
});
