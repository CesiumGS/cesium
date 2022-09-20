import {
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Plane,
  ColorMaterialProperty,
  ConstantProperty,
  PlaneGraphics,
  ShadowMode,
} from "../../../Source/Cesium.js";

import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/PlaneGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      show: true,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 1,
      plane: new Plane(Cartesian3.UNIT_X, 0.0),
      dimensions: new Cartesian2(2.0, 3.0),
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
    };

    const plane = new PlaneGraphics(options);
    expect(plane.material).toBeInstanceOf(ColorMaterialProperty);
    expect(plane.show).toBeInstanceOf(ConstantProperty);
    expect(plane.fill).toBeInstanceOf(ConstantProperty);
    expect(plane.outline).toBeInstanceOf(ConstantProperty);
    expect(plane.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(plane.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(plane.plane).toBeInstanceOf(ConstantProperty);
    expect(plane.dimensions).toBeInstanceOf(ConstantProperty);
    expect(plane.shadows).toBeInstanceOf(ConstantProperty);
    expect(plane.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

    expect(plane.material.color.getValue()).toEqual(options.material);
    expect(plane.show.getValue()).toEqual(options.show);
    expect(plane.fill.getValue()).toEqual(options.fill);
    expect(plane.outline.getValue()).toEqual(options.outline);
    expect(plane.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(plane.outlineWidth.getValue()).toEqual(options.outlineWidth);
    expect(plane.plane.getValue()).toEqual(options.plane);
    expect(plane.dimensions.getValue()).toEqual(options.dimensions);
    expect(plane.shadows.getValue()).toEqual(options.shadows);
    expect(plane.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
  });

  it("merge assigns unassigned properties", function () {
    const source = new PlaneGraphics();
    source.material = new ColorMaterialProperty();
    source.show = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.plane = new ConstantProperty();
    source.dimensions = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition(10.0, 100.0)
    );

    const target = new PlaneGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.show).toBe(source.show);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.plane).toBe(source.plane);
    expect(target.dimensions).toBe(source.dimensions);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge does not assign assigned properties", function () {
    const source = new PlaneGraphics();

    const material = new ColorMaterialProperty();
    const show = new ConstantProperty();
    const fill = new ConstantProperty();
    const outline = new ConstantProperty();
    const outlineColor = new ConstantProperty();
    const outlineWidth = new ConstantProperty();
    const plane = new ConstantProperty();
    const dimensions = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();

    const target = new PlaneGraphics();
    target.material = material;
    target.show = show;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.plane = plane;
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
    expect(target.plane).toBe(plane);
    expect(target.dimensions).toBe(dimensions);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
  });

  it("clone works", function () {
    const source = new PlaneGraphics();
    source.material = new ColorMaterialProperty();
    source.show = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.plane = new ConstantProperty();
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
    expect(result.plane).toBe(source.plane);
    expect(result.dimensions).toBe(source.dimensions);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge throws if source undefined", function () {
    const target = new PlaneGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new PlaneGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "fill", false, true);
    testDefinitionChanged(property, "outline", true, false);
    testDefinitionChanged(property, "outlineColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "outlineWidth", 2, 3);
    testDefinitionChanged(
      property,
      "plane",
      new Plane(Cartesian3.UNIT_X, 0.0),
      new Plane(Cartesian3.UNIT_Z, 1.0)
    );
    testDefinitionChanged(
      property,
      "dimensions",
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 1.0)
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
