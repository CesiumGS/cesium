import { ComponentDatatype } from "../../Source/Cesium.js";
import { GeometryInstanceAttribute } from "../../Source/Cesium.js";

describe("Core/GeometryInstanceAttribute", function () {
  it("constructor", function () {
    var color = new GeometryInstanceAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      normalize: true,
      value: new Uint8Array([255, 255, 0, 255]),
    });

    expect(color.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
    expect(color.componentsPerAttribute).toEqual(4);
    expect(color.normalize).toEqual(true);
    expect(color.value).toEqual([255, 255, 0, 255]);
  });

  it("constructor throws without componentDatatype", function () {
    expect(function () {
      return new GeometryInstanceAttribute({
        componentsPerAttribute: 4,
        value: new Uint8Array([255, 255, 0, 255]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without componentsPerAttribute", function () {
    expect(function () {
      return new GeometryInstanceAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        value: new Uint8Array([255, 255, 0, 255]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when componentsPerAttribute is less than 1 or greater than 4", function () {
    expect(function () {
      return new GeometryInstanceAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 7,
        value: new Uint8Array([255, 255, 0, 255]),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without values", function () {
    expect(function () {
      return new GeometryInstanceAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
      });
    }).toThrowDeveloperError();
  });
});
