import { Cartesian3 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { TerrainOffsetProperty } from "../../Source/Cesium.js";
import createGlobe from "../createGlobe.js";
import createScene from "../createScene.js";

describe("DataSources/TerrainOffsetProperty", function () {
  let scene;
  const time = JulianDate.now();
  beforeAll(function () {
    scene = createScene();
    scene.globe = createGlobe();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("can construct and destroy", function () {
    const position = new CallbackProperty(jasmine.createSpy(), false);
    const height = new ConstantProperty(30);
    const extrudedHeight = new ConstantProperty(0);
    const property = new TerrainOffsetProperty(
      scene,
      position,
      height,
      extrudedHeight
    );
    expect(property.isConstant).toBe(false);
    expect(property.getValue(time)).toEqual(Cartesian3.ZERO);
    property.destroy();
    expect(property.isDestroyed()).toBe(true);
  });

  it("throws without scene", function () {
    const position = new CallbackProperty(jasmine.createSpy(), false);
    const height = new ConstantProperty(30);
    const extrudedHeight = new ConstantProperty(0);
    expect(function () {
      return new TerrainOffsetProperty(
        undefined,
        position,
        height,
        extrudedHeight
      );
    }).toThrowDeveloperError();
  });

  it("throws without position", function () {
    const height = new ConstantProperty(30);
    const extrudedHeight = new ConstantProperty(0);
    expect(function () {
      return new TerrainOffsetProperty(
        scene,
        undefined,
        height,
        extrudedHeight
      );
    }).toThrowDeveloperError();
  });
});
