import { Color } from "../../Source/Cesium.js";
import { Event } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { createMaterialPropertyDescriptor } from "../../Source/Cesium.js";
import { ImageMaterialProperty } from "../../Source/Cesium.js";

describe("DataSources/createMaterialPropertyDescriptor", function () {
  function MockGraphics() {
    this._definitionChanged = new Event();
  }
  Object.defineProperties(MockGraphics.prototype, {
    materialProperty: createMaterialPropertyDescriptor("materialProperty"),
  });

  it("defaults to undefined", function () {
    const instance = new MockGraphics();
    expect(instance.materialProperty).toBeUndefined();
  });

  it("creates ImageMaterialProperty from string ", function () {
    const instance = new MockGraphics();
    expect(instance.materialProperty).toBeUndefined();

    const value = "test.invalid";
    instance.materialProperty = value;
    expect(instance.materialProperty).toBeInstanceOf(ImageMaterialProperty);
    expect(instance.materialProperty.image.getValue()).toEqual(value);
  });

  it("creates ColorMaterialProperty from Color", function () {
    const instance = new MockGraphics();
    expect(instance.materialProperty).toBeUndefined();

    const value = Color.RED;
    instance.materialProperty = value;
    expect(instance.materialProperty).toBeInstanceOf(ColorMaterialProperty);
    expect(instance.materialProperty.color.getValue()).toEqual(value);
  });

  it("throws if type can not be infered", function () {
    const instance = new MockGraphics();
    expect(function () {
      instance.materialProperty = {};
    }).toThrowDeveloperError();
  });
});
