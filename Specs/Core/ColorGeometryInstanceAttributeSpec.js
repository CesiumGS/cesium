import {
  Color,
  ColorGeometryInstanceAttribute,
  ComponentDatatype,
} from "../../../Source/Cesium.js";

describe("Core/ColorGeometryInstanceAttribute", function () {
  it("constructor", function () {
    const attribute = new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 0.5);
    expect(attribute.componentDatatype).toEqual(
      ComponentDatatype.UNSIGNED_BYTE
    );
    expect(attribute.componentsPerAttribute).toEqual(4);
    expect(attribute.normalize).toEqual(true);

    const value = new Uint8Array(new Color(1.0, 1.0, 0.0, 0.5).toBytes());
    expect(attribute.value).toEqual(value);
  });

  it("fromColor", function () {
    const color = Color.AQUA;
    const attribute = ColorGeometryInstanceAttribute.fromColor(color);
    expect(attribute.componentDatatype).toEqual(
      ComponentDatatype.UNSIGNED_BYTE
    );
    expect(attribute.componentsPerAttribute).toEqual(4);
    expect(attribute.normalize).toEqual(true);

    const value = new Uint8Array(color.toBytes());
    expect(attribute.value).toEqual(value);
  });

  it("fromColor throws without color", function () {
    expect(function () {
      ColorGeometryInstanceAttribute.fromColor();
    }).toThrowDeveloperError();
  });

  it("toValue", function () {
    const color = Color.AQUA;
    const expectedResult = new Uint8Array(color.toBytes());
    expect(ColorGeometryInstanceAttribute.toValue(color)).toEqual(
      expectedResult
    );
  });

  it("toValue works with result parameter", function () {
    const color = Color.AQUA;
    const expectedResult = new Uint8Array(color.toBytes());
    const result = new Uint8Array(4);
    const returnedResult = ColorGeometryInstanceAttribute.toValue(
      color,
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("toValue throws without a color", function () {
    expect(function () {
      ColorGeometryInstanceAttribute.toValue();
    }).toThrowDeveloperError();
  });

  it("equals", function () {
    const color = new ColorGeometryInstanceAttribute(0.1, 0.2, 0.3, 0.4);
    expect(ColorGeometryInstanceAttribute.equals(color, color)).toEqual(true);
    expect(
      ColorGeometryInstanceAttribute.equals(
        color,
        new ColorGeometryInstanceAttribute(0.1, 0.2, 0.3, 0.4)
      )
    ).toEqual(true);
    expect(
      ColorGeometryInstanceAttribute.equals(
        color,
        new ColorGeometryInstanceAttribute(0.5, 0.2, 0.3, 0.4)
      )
    ).toEqual(false);
    expect(
      ColorGeometryInstanceAttribute.equals(
        color,
        new ColorGeometryInstanceAttribute(0.1, 0.5, 0.3, 0.4)
      )
    ).toEqual(false);
    expect(
      ColorGeometryInstanceAttribute.equals(
        color,
        new ColorGeometryInstanceAttribute(0.1, 0.2, 0.5, 0.4)
      )
    ).toEqual(false);
    expect(
      ColorGeometryInstanceAttribute.equals(
        color,
        new ColorGeometryInstanceAttribute(0.1, 0.2, 0.3, 0.5)
      )
    ).toEqual(false);
    expect(ColorGeometryInstanceAttribute.equals(color, undefined)).toEqual(
      false
    );
    expect(ColorGeometryInstanceAttribute.equals(undefined, color)).toEqual(
      false
    );
  });
});
