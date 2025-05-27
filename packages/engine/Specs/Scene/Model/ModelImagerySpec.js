import {
  Cartesian3,
  Math as CesiumMath,
  Matrix4,
  ResourceCache,
  Transforms,
  ModelImagery,
  ImageryLayer,
  Cesium3DTileset,
  TileCoordinatesImageryProvider,
  HeadingPitchRoll,
  WebMercatorTilingScheme,
} from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";
import Cesium3DTilesTester from "../../../../../Specs/Cesium3DTilesTester.js";

const tileset_unitSquare_fourPrimitives_plain_url =
  "./Data/Models/glTF-2.0/unitSquare/tileset_unitSquare_fourPrimitives_plain.json";

/**
 * Fit the camera to show a tileset where the tile content
 * occupies a unit square
 *
 * @param {Camera} camera The camera
 */
function fitCameraToUnitSquare(camera) {
  const fov = CesiumMath.PI_OVER_THREE;
  camera.frustum.fov = fov;
  camera.frustum.near = 0.01;
  camera.frustum.far = 100.0;
  const distance = 1.0 / (2.0 * Math.tan(fov * 0.5));
  camera.position = new Cartesian3(0.5, -distance * 2.0, 0.5);
  camera.direction = Cartesian3.clone(Cartesian3.UNIT_Y, new Cartesian3());
  camera.up = Cartesian3.clone(Cartesian3.UNIT_Z, new Cartesian3());
  camera.right = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
  camera.lookAtTransform(Matrix4.IDENTITY);
}

/**
 * Wait until the root tile of the given tileset is loaded
 *
 * @param {Cesium3DTileset} tileset The tileset
 * @param {Scene} scene The scene
 */
async function waitForRootLoaded(tileset, scene) {
  scene.renderForSpecs();
  const root = tileset.root;
  await pollToPromise(() => {
    scene.renderForSpecs();
    return root.contentFailed || root.contentReady;
  });
}

describe("Scene/Model/ModelImagery", function () {
  let scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    scene.primitives.removeAll();
    ResourceCache.clearForSpecs();
  });

  it("constructor throws without model", function () {
    expect(function () {
      // eslint-disable-next-line no-new
      new ModelImagery(undefined);
    }).toThrowDeveloperError();
  });

  it("properly reports _hasImagery", async function () {
    const url = tileset_unitSquare_fourPrimitives_plain_url;
    const tileset = await Cesium3DTileset.fromUrl(url);

    scene.primitives.add(tileset);
    fitCameraToUnitSquare(scene.camera);
    await waitForRootLoaded(tileset, scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // Initially, there is no imagery
    expect(modelImagery._hasImagery).toBeFalse();

    // Add one imagery provider
    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);
    tileset.imageryLayers.add(imageryLayer);

    // Expect imagery to be present
    expect(modelImagery._hasImagery).toBeTrue();

    // Clear the set of imagery layers
    tileset.imageryLayers.removeAll();

    // Now there is no imagery again
    expect(modelImagery._hasImagery).toBeFalse();
  });

  it("properly reports _allImageryLayersReady", async function () {
    const url = tileset_unitSquare_fourPrimitives_plain_url;
    const tileset = await Cesium3DTileset.fromUrl(url);

    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);
    tileset.imageryLayers.add(imageryLayer);

    scene.primitives.add(tileset);
    fitCameraToUnitSquare(scene.camera);
    await waitForRootLoaded(tileset, scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // All imagery layers should be ready now (we just waited for them)
    expect(modelImagery._allImageryLayersReady).toBeTrue();

    // For spec: This causes the imagery layer to not count as "ready"
    imageryLayer._imageryProvider = undefined;

    // Now, it should report the imagery layers to not be ready
    expect(modelImagery._allImageryLayersReady).toBeFalse();
  });

  it("properly handles modifications of the imageryConfigurations", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const url = tileset_unitSquare_fourPrimitives_plain_url;
    const tileset = await Cesium3DTileset.fromUrl(url);

    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);
    tileset.imageryLayers.add(imageryLayer);

    scene.primitives.add(tileset);
    fitCameraToUnitSquare(scene.camera);
    await waitForRootLoaded(tileset, scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // Initially, _imageryConfigurationsModified is false (it was just updated)
    expect(modelImagery._imageryConfigurationsModified()).toBeFalse();

    // For spec: Modify imagery configuration
    imageryLayer.alpha = 0.5;

    // Now, _imageryConfigurationsModified is true
    expect(modelImagery._imageryConfigurationsModified()).toBeTrue();

    // Trigger an update
    modelImagery._checkForModifiedImageryConfigurations();

    // Now, _imageryConfigurationsModified is false again
    expect(modelImagery._imageryConfigurationsModified()).toBeFalse();
  });

  it("creates one ModelPrimitiveImagery for each primitive", async function () {
    const url = tileset_unitSquare_fourPrimitives_plain_url;
    const tileset = await Cesium3DTileset.fromUrl(url);

    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);
    tileset.imageryLayers.add(imageryLayer);

    scene.primitives.add(tileset);
    fitCameraToUnitSquare(scene.camera);
    await waitForRootLoaded(tileset, scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // The model has four primitives
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    expect(modelPrimitiveImageries.length).toBe(4);
  });

  // XXX_DRAPING Work in progress
  it("works", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    // XXX_DRAPING http://localhost:8080/Specs/SpecRunner.html?category=none&spec=Scene%2FModel%2FModelImagery%20works&debugCanvasWidth=400&debugCanvasHeight=400
    const url = tileset_unitSquare_fourPrimitives_plain_url;
    const tileset = await Cesium3DTilesTester.loadTileset(scene, url);

    // Create a non-trivial transform for the tileset
    const transform = Transforms.eastNorthUpToFixedFrame(
      Cartesian3.fromDegrees(-120.0, 40.0, 1.0),
    );
    tileset.modelMatrix = transform;

    // Set a view that fully shows the tile content
    // (a unit square at the position given above)
    scene.camera.setView({
      destination: new Cartesian3(
        -2446354.452726738,
        -4237211.248955036,
        4077988.0921552004,
      ),
      orientation: new HeadingPitchRoll(Math.PI * 2, -Math.PI / 2, 0),
    });

    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);
    tileset.imageryLayers.add(imageryLayer);

    await waitForRootLoaded(tileset, scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    console.log("Looks like we got some tileset here", tileset);
    console.log("  modelImagery ", modelImagery);
    console.log("  modelImagery has imagery ", modelImagery._hasImagery);
    console.log(
      "  _modelPrimitiveImageries",
      modelImagery._modelPrimitiveImageries,
    );
  });
});
