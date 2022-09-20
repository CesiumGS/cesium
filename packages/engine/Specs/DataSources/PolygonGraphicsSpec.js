import {
  ArcType,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  PolygonHierarchy,
  ColorMaterialProperty,
  ConstantProperty,
  PolygonGraphics,
  ClassificationType,
  ShadowMode,
} from "../../index.js";;

import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/PolygonGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.BLUE,
      show: true,
      hierarchy: new PolygonHierarchy(),
      height: 2,
      extrudedHeight: 3,
      granularity: 4,
      stRotation: 5,
      perPositionHeight: false,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 7,
      closeTop: true,
      closeBottom: true,
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(),
      classificationType: ClassificationType.TERRAIN,
      arcType: ArcType.GEODESIC,
      zIndex: 22,
      textureCoordinates: [],
    };

    const polygon = new PolygonGraphics(options);
    expect(polygon.material).toBeInstanceOf(ColorMaterialProperty);
    expect(polygon.show).toBeInstanceOf(ConstantProperty);
    expect(polygon.hierarchy).toBeInstanceOf(ConstantProperty);
    expect(polygon.height).toBeInstanceOf(ConstantProperty);
    expect(polygon.extrudedHeight).toBeInstanceOf(ConstantProperty);
    expect(polygon.granularity).toBeInstanceOf(ConstantProperty);
    expect(polygon.stRotation).toBeInstanceOf(ConstantProperty);
    expect(polygon.perPositionHeight).toBeInstanceOf(ConstantProperty);
    expect(polygon.fill).toBeInstanceOf(ConstantProperty);
    expect(polygon.outline).toBeInstanceOf(ConstantProperty);
    expect(polygon.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(polygon.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(polygon.closeTop).toBeInstanceOf(ConstantProperty);
    expect(polygon.closeBottom).toBeInstanceOf(ConstantProperty);
    expect(polygon.shadows).toBeInstanceOf(ConstantProperty);
    expect(polygon.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
    expect(polygon.classificationType).toBeInstanceOf(ConstantProperty);
    expect(polygon.arcType).toBeInstanceOf(ConstantProperty);
    expect(polygon.zIndex).toBeInstanceOf(ConstantProperty);
    expect(polygon.textureCoordinates).toBeInstanceOf(ConstantProperty);

    expect(polygon.material.color.getValue()).toEqual(options.material);
    expect(polygon.show.getValue()).toEqual(options.show);
    expect(polygon.hierarchy.getValue()).toEqual(options.hierarchy);
    expect(polygon.height.getValue()).toEqual(options.height);
    expect(polygon.extrudedHeight.getValue()).toEqual(options.extrudedHeight);
    expect(polygon.granularity.getValue()).toEqual(options.granularity);
    expect(polygon.stRotation.getValue()).toEqual(options.stRotation);
    expect(polygon.perPositionHeight.getValue()).toEqual(
      options.perPositionHeight
    );
    expect(polygon.fill.getValue()).toEqual(options.fill);
    expect(polygon.outline.getValue()).toEqual(options.outline);
    expect(polygon.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(polygon.outlineWidth.getValue()).toEqual(options.outlineWidth);
    expect(polygon.closeTop.getValue()).toEqual(options.closeTop);
    expect(polygon.closeBottom.getValue()).toEqual(options.closeBottom);
    expect(polygon.shadows.getValue()).toEqual(options.shadows);
    expect(polygon.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
    expect(polygon.classificationType.getValue()).toEqual(
      options.classificationType
    );
    expect(polygon.arcType.getValue()).toEqual(options.arcType);
    expect(polygon.zIndex.getValue()).toEqual(22);
    expect(polygon.textureCoordinates.getValue()).toEqual(
      options.textureCoordinates
    );
  });

  it("merge assigns unassigned properties", function () {
    const source = new PolygonGraphics();
    source.material = new ColorMaterialProperty();
    source.hierarchy = new ConstantProperty();
    source.show = new ConstantProperty();
    source.height = new ConstantProperty();
    source.extrudedHeight = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.stRotation = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.perPositionHeight = new ConstantProperty();
    source.closeTop = new ConstantProperty();
    source.closeBottom = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );
    source.classificationType = new ConstantProperty(
      ClassificationType.TERRAIN
    );
    source.arcType = new ConstantProperty(ArcType.RHUMB);
    source.zIndex = new ConstantProperty(30);
    source.textureCoordinates = new ConstantProperty();

    const target = new PolygonGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.hierarchy).toBe(source.hierarchy);
    expect(target.show).toBe(source.show);
    expect(target.height).toBe(source.height);
    expect(target.extrudedHeight).toBe(source.extrudedHeight);
    expect(target.granularity).toBe(source.granularity);
    expect(target.stRotation).toBe(source.stRotation);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.perPositionHeight).toBe(source.perPositionHeight);
    expect(target.closeTop).toBe(source.closeTop);
    expect(target.closeBottom).toBe(source.closeBottom);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(target.classificationType).toBe(source.classificationType);
    expect(target.arcType).toBe(source.arcType);
    expect(target.zIndex).toBe(source.zIndex);
    expect(target.textureCoordinates).toBe(source.textureCoordinates);
  });

  it("merge does not assign assigned properties", function () {
    const source = new PolygonGraphics();

    const material = new ColorMaterialProperty();
    const positions = new ConstantProperty();
    const show = new ConstantProperty();
    const height = new ConstantProperty();
    const extrudedHeight = new ConstantProperty();
    const granularity = new ConstantProperty();
    const stRotation = new ConstantProperty();
    const fill = new ConstantProperty();
    const outline = new ConstantProperty();
    const outlineColor = new ConstantProperty();
    const outlineWidth = new ConstantProperty();
    const perPositionHeight = new ConstantProperty();
    const closeTop = new ConstantProperty();
    const closeBottom = new ConstantProperty();
    const shadows = new ConstantProperty();
    const distanceDisplayCondition = new ConstantProperty();
    const classificationType = new ConstantProperty();
    const arcType = new ConstantProperty();
    const zIndex = new ConstantProperty();
    const textureCoordinates = new ConstantProperty();

    const target = new PolygonGraphics();
    target.material = material;
    target.hierarchy = positions;
    target.show = show;
    target.height = height;
    target.extrudedHeight = extrudedHeight;
    target.granularity = granularity;
    target.stRotation = stRotation;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.perPositionHeight = perPositionHeight;
    target.closeTop = closeTop;
    target.closeBottom = closeBottom;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;
    target.classificationType = classificationType;
    target.arcType = arcType;
    target.zIndex = zIndex;
    target.textureCoordinates = textureCoordinates;

    target.merge(source);

    expect(target.material).toBe(material);
    expect(target.hierarchy).toBe(positions);
    expect(target.show).toBe(show);
    expect(target.height).toBe(height);
    expect(target.extrudedHeight).toBe(extrudedHeight);
    expect(target.granularity).toBe(granularity);
    expect(target.stRotation).toBe(stRotation);
    expect(target.fill).toBe(fill);
    expect(target.outline).toBe(outline);
    expect(target.outlineColor).toBe(outlineColor);
    expect(target.outlineWidth).toBe(outlineWidth);
    expect(target.perPositionHeight).toBe(perPositionHeight);
    expect(target.closeTop).toBe(closeTop);
    expect(target.closeBottom).toBe(closeBottom);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    expect(target.classificationType).toBe(classificationType);
    expect(target.arcType).toBe(arcType);
    expect(target.zIndex).toBe(zIndex);
    expect(target.textureCoordinates).toBe(textureCoordinates);
  });

  it("clone works", function () {
    const source = new PolygonGraphics();
    source.material = new ColorMaterialProperty();
    source.hierarchy = new ConstantProperty();
    source.show = new ConstantProperty();
    source.height = new ConstantProperty();
    source.extrudedHeight = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.stRotation = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.perPositionHeight = new ConstantProperty();
    source.closeTop = new ConstantProperty();
    source.closeBottom = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();
    source.classificationType = new ConstantProperty();
    source.arcType = new ConstantProperty();
    source.zIndex = new ConstantProperty();
    source.textureCoordinates = new ConstantProperty();

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.hierarchy).toBe(source.hierarchy);
    expect(result.show).toBe(source.show);
    expect(result.height).toBe(source.height);
    expect(result.extrudedHeight).toBe(source.extrudedHeight);
    expect(result.granularity).toBe(source.granularity);
    expect(result.stRotation).toBe(source.stRotation);
    expect(result.fill).toBe(source.fill);
    expect(result.outline).toBe(source.outline);
    expect(result.outlineColor).toBe(source.outlineColor);
    expect(result.outlineWidth).toBe(source.outlineWidth);
    expect(result.perPositionHeight).toBe(source.perPositionHeight);
    expect(result.closeTop).toBe(source.closeTop);
    expect(result.closeBottom).toBe(source.closeBottom);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
    expect(result.classificationType).toBe(source.classificationType);
    expect(result.arcType).toBe(source.arcType);
    expect(result.zIndex).toBe(source.zIndex);
    expect(result.textureCoordinates).toBe(source.textureCoordinates);
  });

  it("merge throws if source undefined", function () {
    const target = new PolygonGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new PolygonGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "hierarchy", [0.0], [1.0]);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "height", 3, 4);
    testDefinitionChanged(property, "extrudedHeight", 4, 3);
    testDefinitionChanged(property, "granularity", 1, 2);
    testDefinitionChanged(property, "stRotation", 5, 6);
    testDefinitionChanged(property, "fill", false, true);
    testDefinitionChanged(property, "outline", true, false);
    testDefinitionChanged(property, "outlineColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "outlineWidth", 2, 3);
    testDefinitionChanged(property, "perPositionHeight", false, true);
    testDefinitionChanged(property, "closeTop", true, false);
    testDefinitionChanged(property, "closeBottom", true, false);
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
    testDefinitionChanged(property, "arcType", ArcType.GEODESIC, ArcType.RHUMB);
    testDefinitionChanged(property, "zIndex", 54, 3);
    testDefinitionChanged(property, "textureCoordinates", [0.0], [1.0]);
  });

  it("converts an array of positions to a PolygonHierarchy", function () {
    const positions = [
      new Cartesian3(1, 2, 3),
      new Cartesian3(4, 5, 6),
      new Cartesian3(7, 8, 9),
    ];

    let graphics = new PolygonGraphics({
      hierarchy: positions,
    });

    expect(graphics.hierarchy).toBeInstanceOf(ConstantProperty);
    let hierarchy = graphics.hierarchy.getValue();
    expect(hierarchy).toBeInstanceOf(PolygonHierarchy);
    expect(hierarchy.positions).toEqual(positions);

    graphics = new PolygonGraphics();
    graphics.hierarchy = positions;

    expect(graphics.hierarchy).toBeInstanceOf(ConstantProperty);
    hierarchy = graphics.hierarchy.getValue();
    expect(hierarchy).toBeInstanceOf(PolygonHierarchy);
    expect(hierarchy.positions).toEqual(positions);
  });
});
