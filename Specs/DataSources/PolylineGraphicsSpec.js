import { ArcType } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { PolylineGraphics } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/PolylineGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      depthFailMaterial: Color.RED,
      positions: [],
      show: true,
      width: 1,
      clampToGround: true,
      granularity: 2,
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(),
      classificationType: ClassificationType.TERRAIN,
      arcType: ArcType.GEODESIC,
      zIndex: 0,
    };

    const polyline = new PolylineGraphics(options);
    expect(polyline.material).toBeInstanceOf(ColorMaterialProperty);
    expect(polyline.depthFailMaterial).toBeInstanceOf(ColorMaterialProperty);
    expect(polyline.positions).toBeInstanceOf(ConstantProperty);
    expect(polyline.show).toBeInstanceOf(ConstantProperty);
    expect(polyline.width).toBeInstanceOf(ConstantProperty);
    expect(polyline.clampToGround).toBeInstanceOf(ConstantProperty);
    expect(polyline.granularity).toBeInstanceOf(ConstantProperty);
    expect(polyline.shadows).toBeInstanceOf(ConstantProperty);
    expect(polyline.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
    expect(polyline.classificationType).toBeInstanceOf(ConstantProperty);
    expect(polyline.arcType).toBeInstanceOf(ConstantProperty);
    expect(polyline.zIndex).toBeInstanceOf(ConstantProperty);

    expect(polyline.material.color.getValue()).toEqual(options.material);
    expect(polyline.depthFailMaterial.color.getValue()).toEqual(
      options.depthFailMaterial
    );
    expect(polyline.positions.getValue()).toEqual(options.positions);
    expect(polyline.show.getValue()).toEqual(options.show);
    expect(polyline.width.getValue()).toEqual(options.width);
    expect(polyline.clampToGround.getValue()).toEqual(options.clampToGround);
    expect(polyline.granularity.getValue()).toEqual(options.granularity);
    expect(polyline.shadows.getValue()).toEqual(options.shadows);
    expect(polyline.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
    expect(polyline.classificationType.getValue()).toEqual(
      options.classificationType
    );
    expect(polyline.arcType.getValue()).toEqual(options.arcType);
    expect(polyline.zIndex.getValue()).toEqual(options.zIndex);
  });

  it("merge assigns unassigned properties", function () {
    const source = new PolylineGraphics();
    source.material = new ColorMaterialProperty();
    source.depthFailMaterial = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.width = new ConstantProperty();
    source.show = new ConstantProperty();
    source.clampToGround = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );
    source.classificationType = new ConstantProperty(
      ClassificationType.TERRAIN
    );
    source.arcType = new ConstantProperty(ArcType.GEODESIC);
    source.zIndex = new ConstantProperty();

    const target = new PolylineGraphics();
    target.merge(source);
    expect(target.material).toBe(source.material);
    expect(target.depthFailMaterial).toBe(source.depthFailMaterial);
    expect(target.positions).toBe(source.positions);
    expect(target.width).toBe(source.width);
    expect(target.show).toBe(source.show);
    expect(target.clampToGround).toBe(source.clampToGround);
    expect(target.granularity).toBe(source.granularity);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(target.classificationType).toBe(source.classificationType);
    expect(target.arcType).toBe(source.arcType);
    expect(target.zIndex).toBe(source.zIndex);
  });

  it("merge does not assign assigned properties", function () {
    const source = new PolylineGraphics();
    source.material = new ColorMaterialProperty();
    source.depthFailMaterial = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.width = new ConstantProperty();
    source.show = new ConstantProperty();
    source.clampToGround = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();
    source.classificationType = new ConstantProperty();
    source.arcType = new ConstantProperty();
    source.zIndex = new ConstantProperty();

    const color = new ColorMaterialProperty();
    const depthFailColor = new ColorMaterialProperty();
    const positions = new ConstantProperty();
    const width = new ConstantProperty();
    const show = new ConstantProperty();
    const clampToGround = new ConstantProperty();
    const granularity = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();
    const classificationType = new ConstantProperty();
    const arcType = new ConstantProperty();
    const zIndex = new ConstantProperty();

    const target = new PolylineGraphics();
    target.material = color;
    target.depthFailMaterial = depthFailColor;
    target.positions = positions;
    target.width = width;
    target.show = show;
    target.clampToGround = clampToGround;
    target.granularity = granularity;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;
    target.classificationType = classificationType;
    target.arcType = arcType;
    target.zIndex = zIndex;

    target.merge(source);
    expect(target.material).toBe(color);
    expect(target.depthFailMaterial).toBe(depthFailColor);
    expect(target.positions).toBe(positions);
    expect(target.width).toBe(width);
    expect(target.show).toBe(show);
    expect(target.clampToGround).toBe(clampToGround);
    expect(target.granularity).toBe(granularity);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    expect(target.classificationType).toBe(classificationType);
    expect(target.arcType).toBe(arcType);
    expect(target.zIndex).toBe(zIndex);
  });

  it("clone works", function () {
    const source = new PolylineGraphics();
    source.material = new ColorMaterialProperty();
    source.depthFailMaterial = new ColorMaterialProperty();
    source.width = new ConstantProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.clampToGround = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();
    source.classificationType = new ConstantProperty();
    source.arcType = new ConstantProperty();
    source.zIndex = new ConstantProperty();

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.depthFailMaterial).toBe(source.depthFailMaterial);
    expect(result.positions).toBe(source.positions);
    expect(result.width).toBe(source.width);
    expect(result.show).toBe(source.show);
    expect(result.clampToGround).toBe(source.clampToGround);
    expect(result.granularity).toBe(source.granularity);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(result.classificationType).toBe(source.classificationType);
    expect(result.arcType).toBe(source.arcType);
    expect(result.zIndex).toBe(source.zIndex);
  });

  it("merge throws if source undefined", function () {
    const target = new PolylineGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new PolylineGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testMaterialDefinitionChanged(
      property,
      "depthFailMaterial",
      Color.RED,
      Color.BLUE
    );
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "positions", [], []);
    testDefinitionChanged(property, "width", 3, 4);
    testDefinitionChanged(property, "clampToGround", false, true);
    testDefinitionChanged(property, "granularity", 2, 1);
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
      new DistanceDisplayCondition(10.0, 20.0)
    );
    testDefinitionChanged(
      property,
      "classificationType",
      ClassificationType.TERRAIN
    );
    testDefinitionChanged(property, "arcType", ArcType.GEODESIC, ArcType.RHUMB);
    testDefinitionChanged(property, "zIndex", 20, 5);
  });
});
