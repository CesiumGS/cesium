import {
  Cartesian3,
  ResourceCache,
  Transforms,
  ModelImagery,
  ImageryLayer,
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

/**
 * Load and return a test tileset that defines an imagery layer,
 * waiting until the root of that tileset is loaded.
 *
 * This means that the resulting <code>tileset.root.content._model._modelImagery</code>
 * (including the <code>ModelPrimitiveImagery</code> instances) will be defined and ready.
 *
 * @param {Scene} scene The scene
 * @returns {Cesium3DTileset} The tileset
 */
async function loadTestTilesetWithImagery(scene) {
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
  return tileset;
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
    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // Expect imagery to be present
    expect(modelImagery._hasImagery).toBeTrue();

    // Clear the set of imagery layers
    tileset.imageryLayers.removeAll();

    // Now there is no imagery again
    expect(modelImagery._hasImagery).toBeFalse();
  });

  it("properly reports _allImageryLayersReady", async function () {
    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const imageryLayer = tileset.imageryLayers.get(0);

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

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const imageryLayer = tileset.imageryLayers.get(0);

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
    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // The model has four primitives
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    expect(modelPrimitiveImageries.length).toBe(4);
  });
});
