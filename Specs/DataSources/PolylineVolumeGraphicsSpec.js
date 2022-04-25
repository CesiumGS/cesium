import { Color } from "../../Source/Cesium.js";
import { CornerType } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { PolylineVolumeGraphics } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/PolylineVolumeGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      positions: [],
      shape: [],
      show: true,
      granularity: 1,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 2,
      cornerType: CornerType.BEVELED,
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(),
    };

    const polylineVolume = new PolylineVolumeGraphics(options);
    expect(polylineVolume.material).toBeInstanceOf(ColorMaterialProperty);
    expect(polylineVolume.positions).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.show).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.shape).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.granularity).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.fill).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.outline).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.cornerType).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.shadows).toBeInstanceOf(ConstantProperty);
    expect(polylineVolume.distanceDisplayCondition).toBeInstanceOf(
      ConstantProperty
    );

    expect(polylineVolume.material.color.getValue()).toEqual(options.material);
    expect(polylineVolume.positions.getValue()).toEqual(options.positions);
    expect(polylineVolume.show.getValue()).toEqual(options.show);
    expect(polylineVolume.shape.getValue()).toEqual(options.shape);
    expect(polylineVolume.granularity.getValue()).toEqual(options.granularity);
    expect(polylineVolume.fill.getValue()).toEqual(options.fill);
    expect(polylineVolume.outline.getValue()).toEqual(options.outline);
    expect(polylineVolume.outlineColor.getValue()).toEqual(
      options.outlineColor
    );
    expect(polylineVolume.outlineWidth.getValue()).toEqual(
      options.outlineWidth
    );
    expect(polylineVolume.cornerType.getValue()).toEqual(options.cornerType);
    expect(polylineVolume.shadows.getValue()).toEqual(options.shadows);
    expect(polylineVolume.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
  });

  it("merge assigns unassigned properties", function () {
    const source = new PolylineVolumeGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.shape = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.cornerType = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );

    const target = new PolylineVolumeGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.positions).toBe(source.positions);
    expect(target.show).toBe(source.show);
    expect(target.shape).toBe(source.shape);
    expect(target.granularity).toBe(source.granularity);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.cornerType).toBe(source.cornerType);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge does not assign assigned properties", function () {
    const source = new PolylineVolumeGraphics();

    const material = new ColorMaterialProperty();
    const positions = new ConstantProperty();
    const show = new ConstantProperty();
    const shape = new ConstantProperty();
    const granularity = new ConstantProperty();
    const fill = new ConstantProperty();
    const outline = new ConstantProperty();
    const outlineColor = new ConstantProperty();
    const outlineWidth = new ConstantProperty();
    const cornerType = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();

    const target = new PolylineVolumeGraphics();
    target.material = material;
    target.positions = positions;
    target.show = show;
    target.shape = shape;
    target.granularity = granularity;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.cornerType = cornerType;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;

    target.merge(source);

    expect(target.material).toBe(material);
    expect(target.positions).toBe(positions);
    expect(target.show).toBe(show);
    expect(target.shape).toBe(shape);
    expect(target.granularity).toBe(granularity);
    expect(target.fill).toBe(fill);
    expect(target.outline).toBe(outline);
    expect(target.outlineColor).toBe(outlineColor);
    expect(target.outlineWidth).toBe(outlineWidth);
    expect(target.cornerType).toBe(cornerType);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
  });

  it("clone works", function () {
    const source = new PolylineVolumeGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.shape = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.cornerType = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.positions).toBe(source.positions);
    expect(result.show).toBe(source.show);
    expect(result.shape).toBe(source.shape);
    expect(result.granularity).toBe(source.granularity);
    expect(result.fill).toBe(source.fill);
    expect(result.outline).toBe(source.outline);
    expect(result.outlineColor).toBe(source.outlineColor);
    expect(result.outlineWidth).toBe(source.outlineWidth);
    expect(result.cornerType).toBe(source.cornerType);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge throws if source undefined", function () {
    const target = new PolylineVolumeGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new PolylineVolumeGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "positions", [], []);
    testDefinitionChanged(property, "shape", [], []);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "granularity", 1, 2);
    testDefinitionChanged(property, "fill", false, true);
    testDefinitionChanged(property, "outline", true, false);
    testDefinitionChanged(property, "outlineColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "outlineWidth", 2, 3);
    testDefinitionChanged(
      property,
      "cornerType",
      CornerType.BEVELED,
      CornerType.MITERED
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
