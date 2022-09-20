import {
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  BoxGraphics,
  ColorMaterialProperty,
  ConstantProperty,
  ShadowMode,
} from "../../../Source/Cesium.js";

import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/BoxGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      show: true,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 1,
      dimensions: new Cartesian3(2, 3, 4),
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
    };

    const box = new BoxGraphics(options);
    expect(box.material).toBeInstanceOf(ColorMaterialProperty);
    expect(box.show).toBeInstanceOf(ConstantProperty);
    expect(box.fill).toBeInstanceOf(ConstantProperty);
    expect(box.outline).toBeInstanceOf(ConstantProperty);
    expect(box.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(box.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(box.dimensions).toBeInstanceOf(ConstantProperty);
    expect(box.shadows).toBeInstanceOf(ConstantProperty);
    expect(box.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

    expect(box.material.color.getValue()).toEqual(options.material);
    expect(box.show.getValue()).toEqual(options.show);
    expect(box.fill.getValue()).toEqual(options.fill);
    expect(box.outline.getValue()).toEqual(options.outline);
    expect(box.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(box.outlineWidth.getValue()).toEqual(options.outlineWidth);
    expect(box.dimensions.getValue()).toEqual(options.dimensions);
    expect(box.shadows.getValue()).toEqual(options.shadows);
    expect(box.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
  });

  it("merge assigns unassigned properties", function () {
    const source = new BoxGraphics();
    source.material = new ColorMaterialProperty();
    source.show = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.dimensions = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition(10.0, 100.0)
    );

    const target = new BoxGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.show).toBe(source.show);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.dimensions).toBe(source.dimensions);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge does not assign assigned properties", function () {
    const source = new BoxGraphics();

    const material = new ColorMaterialProperty();
    const show = new ConstantProperty();
    const fill = new ConstantProperty();
    const outline = new ConstantProperty();
    const outlineColor = new ConstantProperty();
    const outlineWidth = new ConstantProperty();
    const dimensions = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();

    const target = new BoxGraphics();
    target.material = material;
    target.show = show;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.dimensions = dimensions;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;

    target.merge(source);

    expect(target.material).toBe(material);
    expect(target.show).toBe(show);
    expect(target.fill).toBe(fill);
    expect(target.outline).toBe(outline);
    expect(target.outlineColor).toBe(outlineColor);
    expect(target.outlineWidth).toBe(outlineWidth);
    expect(target.dimensions).toBe(dimensions);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
  });

  it("clone works", function () {
    const source = new BoxGraphics();
    source.material = new ColorMaterialProperty();
    source.show = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.dimensions = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.show).toBe(source.show);
    expect(result.fill).toBe(source.fill);
    expect(result.outline).toBe(source.outline);
    expect(result.outlineColor).toBe(source.outlineColor);
    expect(result.outlineWidth).toBe(source.outlineWidth);
    expect(result.dimensions).toBe(source.dimensions);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge throws if source undefined", function () {
    const target = new BoxGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new BoxGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "fill", false, true);
    testDefinitionChanged(property, "outline", true, false);
    testDefinitionChanged(property, "outlineColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "outlineWidth", 2, 3);
    testDefinitionChanged(
      property,
      "dimensions",
      new Cartesian3(0, 0, 0),
      new Cartesian3(1, 1, 1)
    );
    testDefinitionChanged(
      property,
      "shadows",
      ShadowMode.ENABLED,
      ShadowMode.DISABLED
    );
    testDefinitionChanged(
      property,
      "distanceDisplayCondition",
      new DistanceDisplayCondition(),
      new DistanceDisplayCondition(10.0, 100.0)
    );
  });
});
