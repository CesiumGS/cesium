import {
  ComponentDatatype,
  ShowGeometryInstanceAttribute,
} from "../../../Source/Cesium.js";

describe("Core/ShowGeometryInstanceAttribute", function () {
  it("constructor", function () {
    const attribute = new ShowGeometryInstanceAttribute(false);
    expect(attribute.componentDatatype).toEqual(
      ComponentDatatype.UNSIGNED_BYTE
    );
    expect(attribute.componentsPerAttribute).toEqual(1);
    expect(attribute.normalize).toEqual(false);

    expect(attribute.value).toEqual(new Uint8Array([false]));
  });

  it("toValue", function () {
    const expectedResult = new Uint8Array([true]);
    expect(ShowGeometryInstanceAttribute.toValue(true)).toEqual(expectedResult);
  });

  it("toValue works with a result parameter", function () {
    const expectedResult = new Uint8Array([true]);
    const result = new Uint8Array(1);
    const returnedResult = ShowGeometryInstanceAttribute.toValue(true, result);
    expect(returnedResult).toEqual(expectedResult);
    expect(returnedResult).toBe(result);
  });

  it("toValue throws without a color", function () {
    expect(function () {
      ShowGeometryInstanceAttribute.toValue();
    }).toThrowDeveloperError();
  });
});
