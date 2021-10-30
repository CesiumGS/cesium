import { ComponentDatatype } from "../../Source/Cesium.js";
import { GeometryAttribute } from "../../Source/Cesium.js";

describe("Core/GeometryAttribute", function () {
  it("constructor", function () {
    var color = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      normalize: true,
      values: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
    });

    expect(color.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
    expect(color.componentsPerAttribute).toEqual(4);
    expect(color.normalize).toEqual(true);
    expect(color.values).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255,
      0,
      0,
      255,
      255,
    ]);
  });

  it("constructor throws without componentDatatype", function () {
    expect(function () {
      return new GeometryAttribute({
        componentsPerAttribute: 4,
        values: new Uint8Array([
          255,
          0,
          0,
          255,
          0,
          255,
          0,
          255,
          0,
          0,
          255,
          255,
        ]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without componentsPerAttribute", function () {
    expect(function () {
      return new GeometryAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        values: new Uint8Array([
          255,
          0,
          0,
          255,
          0,
          255,
          0,
          255,
          0,
          0,
          255,
          255,
        ]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when componentsPerAttribute is less than 1 or greater than 4", function () {
    expect(function () {
      return new GeometryAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 7,
        values: new Uint8Array([
          255,
          0,
          0,
          255,
          0,
          255,
          0,
          255,
          0,
          0,
          255,
          255,
        ]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without values", function () {
    expect(function () {
      return new GeometryAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
      });
    }).toThrowDeveloperError();
  });
});
