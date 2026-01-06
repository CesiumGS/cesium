import { ResourceCache, ModelImagery } from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import loadTilesetWithImagery from "./loadTilesetWithImagery.js";

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
    const tileset = await loadTilesetWithImagery(scene);

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
    const tileset = await loadTilesetWithImagery(scene);

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

    const tileset = await loadTilesetWithImagery(scene);

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

  it("considers the show flag as part of the imageryConfigurations", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const imageryLayer = tileset.imageryLayers.get(0);

    // Initially, _imageryConfigurationsModified is false (it was just updated)
    expect(modelImagery._imageryConfigurationsModified()).toBeFalse();

    // For spec: Modify imagery configuration
    imageryLayer.show = false;

    // Now, _imageryConfigurationsModified is true
    expect(modelImagery._imageryConfigurationsModified()).toBeTrue();

    // Trigger an update
    modelImagery._checkForModifiedImageryConfigurations();

    // Now, _imageryConfigurationsModified is false again
    expect(modelImagery._imageryConfigurationsModified()).toBeFalse();
  });

  it("creates one ModelPrimitiveImagery for each primitive", async function () {
    const tileset = await loadTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // The model has four primitives
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    expect(modelPrimitiveImageries.length).toBe(4);
  });

  it("removes ModelPrimitiveImagery objects when imagery layers are removed", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;

    // The model has four primitives
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    expect(modelPrimitiveImageries.length).toBe(4);

    // Remove the imagery layer from the tileset, and trigger an update
    tileset.imageryLayers.removeAll(false);
    scene.renderForSpecs();

    // The model imagery should no longer contain any
    // modelPrimitiveImagery objects now
    const newModelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    expect(newModelPrimitiveImageries).toBeUndefined();
  });
});
