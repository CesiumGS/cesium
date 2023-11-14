import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { PathGraphics } from "../../Source/Cesium.js";

describe("DataSources/PathGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      material: Color.RED,
      width: 1,
      show: false,
      leadTime: 2,
      trailTime: 3,
      resolution: 4,
      distanceDisplayCondition: new DistanceDisplayCondition(10.0, 20.0),
    };

    const path = new PathGraphics(options);
    expect(path.material).toBeInstanceOf(ColorMaterialProperty);
    expect(path.width).toBeInstanceOf(ConstantProperty);
    expect(path.show).toBeInstanceOf(ConstantProperty);
    expect(path.leadTime).toBeInstanceOf(ConstantProperty);
    expect(path.trailTime).toBeInstanceOf(ConstantProperty);
    expect(path.resolution).toBeInstanceOf(ConstantProperty);
    expect(path.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

    expect(path.material.color.getValue()).toEqual(options.material);
    expect(path.width.getValue()).toEqual(options.width);
    expect(path.show.getValue()).toEqual(options.show);
    expect(path.leadTime.getValue()).toEqual(options.leadTime);
    expect(path.trailTime.getValue()).toEqual(options.trailTime);
    expect(path.resolution.getValue()).toEqual(options.resolution);
    expect(path.distanceDisplayCondition.getValue()).toEqual(
      options.distanceDisplayCondition
    );
  });

  it("merge assigns unassigned properties", function () {
    const source = new PathGraphics();
    source.material = new ColorMaterialProperty();
    source.width = new ConstantProperty(1);
    source.show = new ConstantProperty(true);
    source.leadTime = new ConstantProperty(1);
    source.trailTime = new ConstantProperty(1);
    source.resolution = new ConstantProperty(1);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition(10.0, 20.0)
    );

    const target = new PathGraphics();
    target.merge(source);
    expect(target.material).toBe(source.material);
    expect(target.width).toBe(source.width);
    expect(target.show).toBe(source.show);
    expect(target.leadTime).toBe(source.leadTime);
    expect(target.trailTime).toBe(source.trailTime);
    expect(target.resolution).toBe(source.resolution);
    expect(target.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge does not assign assigned properties", function () {
    const source = new PathGraphics();
    source.material = new ColorMaterialProperty();
    source.width = new ConstantProperty(1);
    source.show = new ConstantProperty(true);
    source.leadTime = new ConstantProperty(1);
    source.trailTime = new ConstantProperty(1);
    source.resolution = new ConstantProperty(1);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );

    const color = new ColorMaterialProperty();
    const width = new ConstantProperty(1);
    const show = new ConstantProperty(true);
    const leadTime = new ConstantProperty(1);
    const trailTime = new ConstantProperty(1);
    const resolution = new ConstantProperty(1);
    const distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );

    const target = new PathGraphics();
    target.material = color;
    target.width = width;
    target.show = show;
    target.leadTime = leadTime;
    target.trailTime = trailTime;
    target.resolution = resolution;
    target.distanceDisplayCondition = distanceDisplayCondition;

    target.merge(source);
    expect(target.material).toBe(color);
    expect(target.width).toBe(width);
    expect(target.show).toBe(show);
    expect(target.leadTime).toBe(leadTime);
    expect(target.trailTime).toBe(trailTime);
    expect(target.resolution).toBe(resolution);
    expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
  });

  it("clone works", function () {
    const source = new PathGraphics();
    source.material = new ColorMaterialProperty();
    source.width = new ConstantProperty(1);
    source.show = new ConstantProperty(true);
    source.leadTime = new ConstantProperty(1);
    source.trailTime = new ConstantProperty(1);
    source.resolution = new ConstantProperty(1);
    source.distanceDisplayCondition = new ConstantProperty(
      new DistanceDisplayCondition()
    );

    const result = source.clone();
    expect(result.material).toBe(source.material);
    expect(result.width).toBe(source.width);
    expect(result.show).toBe(source.show);
    expect(result.leadTime).toBe(source.leadTime);
    expect(result.trailTime).toBe(source.trailTime);
    expect(result.resolution).toBe(source.resolution);
    expect(result.distanceDisplayCondition).toBe(
      source.distanceDisplayCondition
    );
  });

  it("merge throws if source undefined", function () {
    const target = new PathGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });
});
