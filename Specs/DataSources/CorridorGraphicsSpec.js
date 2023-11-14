import { Color } from "../../Source/Cesium.js";
import { CornerType } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { CorridorGraphics } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/CorridorGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      positions: [],
      show: true,
      height: 1,
      extrudedHeight: 2,
      granularity: 3,
      width: 4,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 5,
      cornerType: CornerType.BEVELED,
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
      classificationType: ClassificationType.TERRAIN,
      zIndex: 3,
    };

    const corridor = new CorridorGraphics(options);
    expect(corridor.material).toBeInstanceOf(ColorMaterialProperty);
    expect(corridor.positions).toBeInstanceOf(ConstantProperty);
    expect(corridor.show).toBeInstanceOf(ConstantProperty);
    expect(corridor.height).toBeInstanceOf(ConstantProperty);
    expect(corridor.extrudedHeight).toBeInstanceOf(ConstantProperty);
    expect(corridor.granularity).toBeInstanceOf(ConstantProperty);
    expect(corridor.width).toBeInstanceOf(ConstantProperty);
    expect(corridor.fill).toBeInstanceOf(ConstantProperty);
    expect(corridor.outline).toBeInstanceOf(ConstantProperty);
    expect(corridor.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(corridor.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(corridor.cornerType).toBeInstanceOf(ConstantProperty);
    expect(corridor.shadows).toBeInstanceOf(ConstantProperty);
    expect(corridor.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
    expect(corridor.classificationType).toBeInstanceOf(ConstantProperty);
    expect(corridor.zIndex).toBeInstanceOf(ConstantProperty);

    expect(corridor.material.color.getValue()).toEqual(options.material);
    expect(corridor.positions.getValue()).toEqual(options.positions);
    expect(corridor.show.getValue()).toEqual(options.show);
    expect(corridor.height.getValue()).toEqual(options.height);
    expect(corridor.extrudedHeight.getValue()).toEqual(options.extrudedHeight);
    expect(corridor.granularity.getValue()).toEqual(options.granularity);
    expect(corridor.width.getValue()).toEqual(options.width);
    expect(corridor.fill.getValue()).toEqual(options.fill);
    expect(corridor.outline.getValue()).toEqual(options.outline);
    expect(corridor.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(corridor.outlineWidth.getValue()).toEqual(options.outlineWidth);
    expect(corridor.cornerType.getValue()).toEqual(options.cornerType);
    expect(corridor.shadows.getValue()).toEqual(options.shadows);
    expect(corridor.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
    expect(corridor.classificationType.getValue()).toEqual(
      options.classificationType
    );
    expect(corridor.zIndex.getValue()).toEqual(options.zIndex);
  });

  it("merge assigns unassigned properties", function () {
    const source = new CorridorGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.height = new ConstantProperty();
    source.extrudedHeight = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.width = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.cornerType = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition(10.0, 100.0)
    );
    source.classificationType = new ConstantProperty(
      ClassificationType.TERRAIN
    );
    source.zIndex = new ConstantProperty(3);

    const target = new CorridorGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.positions).toBe(source.positions);
    expect(target.show).toBe(source.show);
    expect(target.height).toBe(source.height);
    expect(target.extrudedHeight).toBe(source.extrudedHeight);
    expect(target.granularity).toBe(source.granularity);
    expect(target.width).toBe(source.width);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.cornerType).toBe(source.cornerType);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(target.classificationType).toBe(source.classificationType);
    expect(target.zIndex).toBe(source.zIndex);
  });

  it("merge does not assign assigned properties", function () {
    const source = new CorridorGraphics();

    const material = new ColorMaterialProperty();
    const positions = new ConstantProperty();
    const show = new ConstantProperty();
    const height = new ConstantProperty();
    const extrudedHeight = new ConstantProperty();
    const granularity = new ConstantProperty();
    const width = new ConstantProperty();
    const fill = new ConstantProperty();
    const outline = new ConstantProperty();
    const outlineColor = new ConstantProperty();
    const outlineWidth = new ConstantProperty();
    const cornerType = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();
    const classificationType = new ConstantProperty();
    const zIndex = new ConstantProperty();

    const target = new CorridorGraphics();
    target.material = material;
    target.positions = positions;
    target.show = show;
    target.height = height;
    target.extrudedHeight = extrudedHeight;
    target.granularity = granularity;
    target.width = width;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.cornerType = cornerType;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;
    target.classificationType = classificationType;
    target.zIndex = zIndex;

    target.merge(source);

    expect(target.material).toBe(material);
    expect(target.positions).toBe(positions);
    expect(target.show).toBe(show);
    expect(target.height).toBe(height);
    expect(target.extrudedHeight).toBe(extrudedHeight);
    expect(target.granularity).toBe(granularity);
    expect(target.width).toBe(width);
    expect(target.fill).toBe(fill);
    expect(target.outline).toBe(outline);
    expect(target.outlineColor).toBe(outlineColor);
    expect(target.outlineWidth).toBe(outlineWidth);
    expect(target.cornerType).toBe(cornerType);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    expect(target.classificationType).toBe(classificationType);
    expect(target.zIndex).toBe(zIndex);
  });

  it("clone works", function () {
    const source = new CorridorGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.height = new ConstantProperty();
    source.extrudedHeight = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.width = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.cornerType = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();
    source.classificationType = new ConstantProperty();
    source.zIndex = new ConstantProperty();

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.positions).toBe(source.positions);
    expect(result.show).toBe(source.show);
    expect(result.height).toBe(source.height);
    expect(result.extrudedHeight).toBe(source.extrudedHeight);
    expect(result.granularity).toBe(source.granularity);
    expect(result.width).toBe(source.width);
    expect(result.fill).toBe(source.fill);
    expect(result.outline).toBe(source.outline);
    expect(result.outlineColor).toBe(source.outlineColor);
    expect(result.outlineWidth).toBe(source.outlineWidth);
    expect(result.cornerType).toBe(source.cornerType);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(result.classificationType).toBe(source.classificationType);
    expect(result.zIndex).toBe(source.zIndex);
  });

  it("merge throws if source undefined", function () {
    const target = new CorridorGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new CorridorGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "positions", [], []);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "height", 3, 4);
    testDefinitionChanged(property, "extrudedHeight", 4, 3);
    testDefinitionChanged(property, "granularity", 1, 2);
    testDefinitionChanged(property, "width", 5, 6);
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
    testDefinitionChanged(
      property,
      "classificationType",
      ClassificationType.TERRAIN,
      ClassificationType.BOTH
    );
    testDefinitionChanged(property, "zIndex", 3, 0);
  });
});
