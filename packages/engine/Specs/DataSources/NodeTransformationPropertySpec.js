import {
  Cartesian3,
  JulianDate,
  Quaternion,
  TimeInterval,
  ConstantProperty,
  NodeTransformationProperty,
  TimeIntervalCollectionProperty,
} from "../../../Source/Cesium.js";

import testDefinitionChanged from "../testDefinitionChanged.js";

describe("DataSources/NodeTransformationProperty", function () {
  it("default constructor sets expected values", function () {
    const property = new NodeTransformationProperty();
    expect(property.isConstant).toBe(true);
    expect(property.translation).toBeUndefined();
    expect(property.rotation).toBeUndefined();
    expect(property.scale).toBeUndefined();

    const result = property.getValue();
    expect(result.translation).toEqual(Cartesian3.ZERO);
    expect(result.rotation).toEqual(Quaternion.IDENTITY);
    expect(result.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
  });

  it("constructor sets options and allows raw assignment", function () {
    const options = {
      translation: Cartesian3.UNIT_Y,
      rotation: new Quaternion(0.5, 0.5, 0.5, 0.5),
      scale: Cartesian3.UNIT_X,
    };

    const property = new NodeTransformationProperty(options);
    expect(property.translation).toBeInstanceOf(ConstantProperty);
    expect(property.rotation).toBeInstanceOf(ConstantProperty);
    expect(property.scale).toBeInstanceOf(ConstantProperty);

    expect(property.translation.getValue()).toEqual(options.translation);
    expect(property.rotation.getValue()).toEqual(options.rotation);
    expect(property.scale.getValue()).toEqual(options.scale);
  });

  it("works with constant values", function () {
    const property = new NodeTransformationProperty();
    property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
    property.rotation = new ConstantProperty(
      new Quaternion(0.5, 0.5, 0.5, 0.5)
    );
    property.scale = new ConstantProperty(Cartesian3.UNIT_X);

    const result = property.getValue(JulianDate.now());
    expect(result.translation).toEqual(Cartesian3.UNIT_Y);
    expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    expect(result.scale).toEqual(Cartesian3.UNIT_X);
  });

  it("works with dynamic values", function () {
    const property = new NodeTransformationProperty();
    property.translation = new TimeIntervalCollectionProperty();
    property.rotation = new TimeIntervalCollectionProperty();
    property.scale = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.translation.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Cartesian3.UNIT_Y,
      })
    );
    property.rotation.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: new Quaternion(0.5, 0.5, 0.5, 0.5),
      })
    );
    property.scale.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Cartesian3.UNIT_X,
      })
    );

    expect(property.isConstant).toBe(false);

    const result = property.getValue(start);
    expect(result.translation).toEqual(Cartesian3.UNIT_Y);
    expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    expect(result.scale).toEqual(Cartesian3.UNIT_X);
  });

  it("works with a result parameter", function () {
    const property = new NodeTransformationProperty();
    property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
    property.rotation = new ConstantProperty(
      new Quaternion(0.5, 0.5, 0.5, 0.5)
    );
    property.scale = new ConstantProperty(Cartesian3.UNIT_X);

    const translation = new Cartesian3();
    const rotation = new Quaternion();
    const scale = new Cartesian3();
    const result = {
      translation: translation,
      rotation: rotation,
      scale: scale,
    };

    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(returnedResult).toBe(result);
    expect(returnedResult.translation).toBe(translation);
    expect(returnedResult.translation).toEqual(Cartesian3.UNIT_Y);
    expect(returnedResult.rotation).toBe(rotation);
    expect(returnedResult.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    expect(returnedResult.scale).toBe(scale);
    expect(returnedResult.scale).toEqual(Cartesian3.UNIT_X);
  });

  it("equals works", function () {
    const left = new NodeTransformationProperty();
    left.translation = new ConstantProperty(Cartesian3.UNIT_Y);
    left.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
    left.scale = new ConstantProperty(Cartesian3.UNIT_X);

    const right = new NodeTransformationProperty();
    right.translation = new ConstantProperty(Cartesian3.UNIT_Y);
    right.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
    right.scale = new ConstantProperty(Cartesian3.UNIT_X);
    expect(left.equals(right)).toEqual(true);

    right.scale = new ConstantProperty(Cartesian3.ZERO);
    expect(left.equals(right)).toEqual(false);

    right.scale = new ConstantProperty(Cartesian3.UNIT_X);
    right.translation = new ConstantProperty(Cartesian3.ZERO);
    expect(left.equals(right)).toEqual(false);

    right.translation = new ConstantProperty(Cartesian3.UNIT_Y);
    right.rotation = new ConstantProperty(Quaternion.ZERO);
    expect(left.equals(right)).toEqual(false);
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new NodeTransformationProperty();
    testDefinitionChanged(
      property,
      "rotation",
      Cartesian3.UNIT_X,
      Cartesian3.ZERO
    );
    testDefinitionChanged(
      property,
      "translation",
      new Quaternion(0.5, 0.5, 0.5, 0.5),
      Quaternion.ZERO
    );
    testDefinitionChanged(
      property,
      "scale",
      Cartesian3.UNIT_X,
      Cartesian3.ZERO
    );
  });
});
