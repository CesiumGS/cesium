import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { WallGraphics } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import testDefinitionChanged from "../testDefinitionChanged.js";
import testMaterialDefinitionChanged from "../testMaterialDefinitionChanged.js";

describe("DataSources/WallGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    var options = {
      material: Color.BLUE,
      positions: [],
      show: true,
      granularity: 1,
      fill: false,
      outline: false,
      outlineColor: Color.RED,
      outlineWidth: 2,
      minimumHeights: [3, 4, 5],
      maximumHeights: [6, 7, 8],
      shadows: ShadowMode.DISABLED,
      distanceDisplayCondition: new DistanceDisplayCondition(),
    };

    var wall = new WallGraphics(options);
    expect(wall.material).toBeInstanceOf(ColorMaterialProperty);
    expect(wall.positions).toBeInstanceOf(ConstantProperty);
    expect(wall.show).toBeInstanceOf(ConstantProperty);
    expect(wall.granularity).toBeInstanceOf(ConstantProperty);
    expect(wall.granularity).toBeInstanceOf(ConstantProperty);
    expect(wall.fill).toBeInstanceOf(ConstantProperty);
    expect(wall.outline).toBeInstanceOf(ConstantProperty);
    expect(wall.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(wall.outlineWidth).toBeInstanceOf(ConstantProperty);
    expect(wall.minimumHeights).toBeInstanceOf(ConstantProperty);
    expect(wall.maximumHeights).toBeInstanceOf(ConstantProperty);
    expect(wall.shadows).toBeInstanceOf(ConstantProperty);
    expect(wall.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

    expect(wall.material.color.getValue()).toEqual(options.material);
    expect(wall.positions.getValue()).toEqual(options.positions);
    expect(wall.show.getValue()).toEqual(options.show);
    expect(wall.granularity.getValue()).toEqual(options.granularity);
    expect(wall.granularity.getValue()).toEqual(options.granularity);
    expect(wall.fill.getValue()).toEqual(options.fill);
    expect(wall.outline.getValue()).toEqual(options.outline);
    expect(wall.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(wall.outlineWidth.getValue()).toEqual(options.outlineWidth);
    expect(wall.minimumHeights.getValue()).toEqual(options.minimumHeights);
    expect(wall.maximumHeights.getValue()).toEqual(options.maximumHeights);
    expect(wall.shadows.getValue()).toEqual(options.shadows);
    expect(wall.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
  });

  it("merge assigns unassigned properties", function () {
    var source = new WallGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.minimumHeights = new ConstantProperty();
    source.maximumHeights = new ConstantProperty();
    source.shadows = new ConstantProperty(ShadowMode.ENABLED);
    source.distanceDisplayCondition = new ConstantProperty();

    var target = new WallGraphics();
    target.merge(source);

    expect(target.material).toBe(source.material);
    expect(target.positions).toBe(source.positions);
    expect(target.show).toBe(source.show);
    expect(target.granularity).toBe(source.granularity);
    expect(target.fill).toBe(source.fill);
    expect(target.outline).toBe(source.outline);
    expect(target.outlineColor).toBe(source.outlineColor);
    expect(target.outlineWidth).toBe(source.outlineWidth);
    expect(target.minimumHeights).toBe(source.minimumHeights);
    expect(target.maximumHeights).toBe(source.maximumHeights);
    expect(target.shadows).toBe(source.shadows);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge does not assign assigned properties", function () {
    var source = new WallGraphics();

    var material = new ColorMaterialProperty();
    var positions = new ColorMaterialProperty();
    var show = new ConstantProperty();
    var granularity = new ConstantProperty();
    var fill = new ConstantProperty();
    var outline = new ConstantProperty();
    var outlineColor = new ConstantProperty();
    var outlineWidth = new ConstantProperty();
    var minimumHeights = new ConstantProperty();
    var maximumHeights = new ConstantProperty();
    var shadows = new ConstantProperty();
    var distanceDisplayCondition = new ConstantProperty();

    var target = new WallGraphics();
    target.material = material;
    target.positions = positions;
    target.show = show;
    target.granularity = granularity;
    target.fill = fill;
    target.outline = outline;
    target.outlineColor = outlineColor;
    target.outlineWidth = outlineWidth;
    target.minimumHeights = minimumHeights;
    target.maximumHeights = maximumHeights;
    target.shadows = shadows;
    target.distanceDisplayCondition = distanceDisplayCondition;

    target.merge(source);

    expect(target.material).toBe(material);
    expect(target.positions).toBe(positions);
    expect(target.show).toBe(show);
    expect(target.granularity).toBe(granularity);
    expect(target.fill).toBe(fill);
    expect(target.outline).toBe(outline);
    expect(target.outlineColor).toBe(outlineColor);
    expect(target.outlineWidth).toBe(outlineWidth);
    expect(target.minimumHeights).toBe(minimumHeights);
    expect(target.maximumHeights).toBe(maximumHeights);
    expect(target.shadows).toBe(shadows);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
  });

  it("clone works", function () {
    var source = new WallGraphics();
    source.material = new ColorMaterialProperty();
    source.positions = new ConstantProperty();
    source.show = new ConstantProperty();
    source.granularity = new ConstantProperty();
    source.fill = new ConstantProperty();
    source.outline = new ConstantProperty();
    source.outlineColor = new ConstantProperty();
    source.outlineWidth = new ConstantProperty();
    source.minimumHeights = new ConstantProperty();
    source.maximumHeights = new ConstantProperty();
    source.shadows = new ConstantProperty();
    source.distanceDisplayCondition = new ConstantProperty();

    var result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.positions).toBe(source.positions);
    expect(result.show).toBe(source.show);
    expect(result.granularity).toBe(source.granularity);
    expect(result.fill).toBe(source.fill);
    expect(result.outline).toBe(source.outline);
    expect(result.outlineColor).toBe(source.outlineColor);
    expect(result.outlineWidth).toBe(source.outlineWidth);
    expect(result.minimumHeights).toBe(source.minimumHeights);
    expect(result.maximumHeights).toBe(source.maximumHeights);
    expect(result.shadows).toBe(source.shadows);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge throws if source undefined", function () {
    var target = new WallGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    var property = new WallGraphics();
    testMaterialDefinitionChanged(property, "material", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "show", true, false);
    testDefinitionChanged(property, "positions", [], []);
    testDefinitionChanged(property, "granularity", 3, 4);
    testDefinitionChanged(property, "fill", false, true);
    testDefinitionChanged(property, "outline", true, false);
    testDefinitionChanged(property, "outlineColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "outlineWidth", 2, 3);
    testDefinitionChanged(property, "minimumHeights", [0, 1], [2, 3]);
    testDefinitionChanged(property, "maximumHeights", [3, 5], [7, 8]);
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
