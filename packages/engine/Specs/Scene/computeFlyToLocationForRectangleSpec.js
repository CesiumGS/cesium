import {
  Rectangle,
  computeFlyToLocationForRectangle,
  Globe,
  SceneMode,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;
import MockTerrainProvider from "../MockTerrainProvider.js";

describe("Scene/computeFlyToLocationForRectangle", function () {
  let scene;

  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  function sampleTest(sceneMode) {
    //Pretend we have terrain with availability.
    const terrainProvider = new MockTerrainProvider();
    terrainProvider.availability = {};

    scene.globe = new Globe();
    scene.terrainProvider = terrainProvider;
    scene.mode = sceneMode;

    const rectangle = new Rectangle(0.2, 0.4, 0.6, 0.8);
    const cartographics = [
      Rectangle.center(rectangle),
      Rectangle.southeast(rectangle),
      Rectangle.southwest(rectangle),
      Rectangle.northeast(rectangle),
      Rectangle.northwest(rectangle),
    ];

    // Mock sampleTerrainMostDetailed with same positions but with heights.
    const maxHeight = 1234;
    const sampledResults = [
      Rectangle.center(rectangle),
      Rectangle.southeast(rectangle),
      Rectangle.southwest(rectangle),
      Rectangle.northeast(rectangle),
      Rectangle.northwest(rectangle),
    ];
    sampledResults[0].height = 145;
    sampledResults[1].height = 1211;
    sampledResults[2].height = -123;
    sampledResults[3].height = maxHeight;

    spyOn(
      computeFlyToLocationForRectangle,
      "_sampleTerrainMostDetailed"
    ).and.returnValue(Promise.resolve(sampledResults));

    // Basically do the computation ourselves with our known values;
    let expectedResult;
    if (sceneMode === SceneMode.SCENE3D) {
      expectedResult = scene.mapProjection.ellipsoid.cartesianToCartographic(
        scene.camera.getRectangleCameraCoordinates(rectangle)
      );
    } else {
      expectedResult = scene.mapProjection.unproject(
        scene.camera.getRectangleCameraCoordinates(rectangle)
      );
    }
    expectedResult.height += maxHeight;

    return computeFlyToLocationForRectangle(rectangle, scene).then(function (
      result
    ) {
      expect(result).toEqual(expectedResult);
      expect(
        computeFlyToLocationForRectangle._sampleTerrainMostDetailed
      ).toHaveBeenCalledWith(terrainProvider, cartographics);
    });
  }

  it("samples terrain and returns expected result in 3D", function () {
    return sampleTest(SceneMode.SCENE3D);
  });

  it("samples terrain and returns expected result in CV", function () {
    return sampleTest(SceneMode.COLUMBUS_VIEW);
  });

  it("returns height above ellipsoid when in 2D", function () {
    const terrainProvider = new MockTerrainProvider();
    terrainProvider.availability = {};

    scene.globe = new Globe();
    scene.terrainProvider = terrainProvider;
    scene.mode = SceneMode.SCENE2D;

    const rectangle = new Rectangle(0.2, 0.4, 0.6, 0.8);
    const expectedResult = scene.mapProjection.unproject(
      scene.camera.getRectangleCameraCoordinates(rectangle)
    );

    spyOn(computeFlyToLocationForRectangle, "_sampleTerrainMostDetailed");
    return computeFlyToLocationForRectangle(rectangle, scene).then(function (
      result
    ) {
      expect(result).toEqual(expectedResult);
      expect(
        computeFlyToLocationForRectangle._sampleTerrainMostDetailed
      ).not.toHaveBeenCalled();
    });
  });

  it("returns height above ellipsoid when terrain not available", function () {
    scene.globe = new Globe();
    scene.terrainProvider = new MockTerrainProvider();

    const rectangle = new Rectangle(0.2, 0.4, 0.6, 0.8);
    spyOn(computeFlyToLocationForRectangle, "_sampleTerrainMostDetailed");

    const expectedResult = scene.mapProjection.ellipsoid.cartesianToCartographic(
      scene.camera.getRectangleCameraCoordinates(rectangle)
    );
    return computeFlyToLocationForRectangle(rectangle, scene).then(function (
      result
    ) {
      expect(result).toEqual(expectedResult);
      expect(
        computeFlyToLocationForRectangle._sampleTerrainMostDetailed
      ).not.toHaveBeenCalled();
    });
  });

  it("waits for terrain to become ready", function () {
    const terrainProvider = new MockTerrainProvider();
    spyOn(terrainProvider.readyPromise, "then").and.callThrough();

    scene.globe = new Globe();
    scene.terrainProvider = terrainProvider;

    const rectangle = new Rectangle(0.2, 0.4, 0.6, 0.8);
    const expectedResult = scene.mapProjection.ellipsoid.cartesianToCartographic(
      scene.camera.getRectangleCameraCoordinates(rectangle)
    );
    return computeFlyToLocationForRectangle(rectangle, scene).then(function (
      result
    ) {
      expect(result).toEqual(expectedResult);
      expect(terrainProvider.readyPromise.then).toHaveBeenCalled();
    });
  });

  it("returns height above ellipsoid when terrain undefined", function () {
    scene.terrainProvider = undefined;
    const rectangle = new Rectangle(0.2, 0.4, 0.6, 0.8);
    spyOn(computeFlyToLocationForRectangle, "_sampleTerrainMostDetailed");

    const expectedResult = scene.mapProjection.ellipsoid.cartesianToCartographic(
      scene.camera.getRectangleCameraCoordinates(rectangle)
    );
    return computeFlyToLocationForRectangle(rectangle, scene).then(function (
      result
    ) {
      expect(result).toEqual(expectedResult);
      expect(
        computeFlyToLocationForRectangle._sampleTerrainMostDetailed
      ).not.toHaveBeenCalled();
    });
  });
});
