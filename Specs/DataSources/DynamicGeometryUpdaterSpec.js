import { DynamicGeometryUpdater } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { GeometryUpdater } from "../../Source/Cesium.js";
import { PrimitiveCollection } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe("DataSources/DynamicGeometryUpdater", function () {
  let scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("Constructor throws with no updater", function () {
    expect(function () {
      return new DynamicGeometryUpdater(
        undefined,
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
    }).toThrowDeveloperError();
  });

  it("Constructor throws with no primitives", function () {
    const updater = new GeometryUpdater({
      entity: new Entity(),
      scene: scene,
      geometryOptions: {},
      geometryPropertyName: "box",
      observedPropertyNames: ["availability", "box"],
    });
    expect(function () {
      return new DynamicGeometryUpdater(
        updater,
        undefined,
        new PrimitiveCollection()
      );
    }).toThrowDeveloperError();
  });

  it("Constructor throws with no groundPrimitives", function () {
    const updater = new GeometryUpdater({
      entity: new Entity(),
      scene: scene,
      geometryOptions: {},
      geometryPropertyName: "box",
      observedPropertyNames: ["availability", "box"],
    });
    expect(function () {
      return new DynamicGeometryUpdater(
        updater,
        undefined,
        new PrimitiveCollection()
      );
    }).toThrowDeveloperError();
  });

  it("update throws with no time", function () {
    const updater = new GeometryUpdater({
      entity: new Entity(),
      scene: scene,
      geometryOptions: {},
      geometryPropertyName: "box",
      observedPropertyNames: ["availability", "box"],
    });
    const dynamicUpdater = new DynamicGeometryUpdater(
      updater,
      new PrimitiveCollection(),
      new PrimitiveCollection()
    );
    expect(function () {
      return dynamicUpdater.update();
    }).toThrowDeveloperError();
  });
});
