import { ComponentDatatype } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { DistanceDisplayConditionGeometryInstanceAttribute } from "../../Source/Cesium.js";

describe("Core/DistanceDisplayConditionGeometryInstanceAttribute", function () {
  it("constructor", function () {
    const attribute = new DistanceDisplayConditionGeometryInstanceAttribute(
      10.0,
      100.0
    );
    expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(attribute.componentsPerAttribute).toEqual(2);
    expect(attribute.normalize).toEqual(false);

    const value = new Float32Array([10.0, 100.0]);
    expect(attribute.value).toEqual(value);
  });

  it("constructor throws with far > near", function () {
    expect(function () {
      return new DistanceDisplayConditionGeometryInstanceAttribute(100.0, 10.0);
    }).toThrowDeveloperError();
  });

  it("fromDistanceDisplayCondition", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const attribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
      dc
    );
    expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(attribute.componentsPerAttribute).toEqual(2);
    expect(attribute.normalize).toEqual(false);

    const value = new Float32Array([dc.near, dc.far]);
    expect(attribute.value).toEqual(value);
  });

  it("fromDistanceDisplayCondition throws without distanceDisplayCondition", function () {
    expect(function () {
      DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition();
    }).toThrowDeveloperError();
  });

  it("fromDistanceDisplayCondition throws with far >= near", function () {
    expect(function () {
      DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
        new DistanceDisplayCondition(100.0, 10.0)
      );
    }).toThrowDeveloperError();
  });

  it("toValue", function () {
    const dc = new DistanceDisplayCondition(10.0, 200.0);
    const expectedResult = new Float32Array([dc.near, dc.far]);
    expect(
      DistanceDisplayConditionGeometryInstanceAttribute.toValue(dc)
    ).toEqual(expectedResult);
  });

  it("toValue works with result parameter", function () {
    const dc = new DistanceDisplayCondition(10.0, 200.0);
    const expectedResult = new Float32Array([dc.near, dc.far]);
    const result = new Float32Array(2);
    const returnedResult = DistanceDisplayConditionGeometryInstanceAttribute.toValue(
      dc,
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("toValue throws without a distanceDisplayCondition", function () {
    expect(function () {
      DistanceDisplayConditionGeometryInstanceAttribute.toValue();
    }).toThrowDeveloperError();
  });
});
