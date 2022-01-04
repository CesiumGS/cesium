import {
  B3dmLoader,
  B3dmParser,
  Cartesian3,
  GltfLoader,
  Matrix4,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/B3dmLoader", function () {
  var withBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/batchedWithBatchTable.b3dm";
  var withBatchTableBinaryUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/batchedWithBatchTableBinary.b3dm";
  var withoutBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/batchedWithoutBatchTable.b3dm";
  var withRtcCenterUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithRtcCenter/batchedWithRtcCenter.b3dm";
  var withBatchTableHierarchy =
    "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tile.b3dm";
  var noBatchIdsUrl =
    "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/batchedNoBatchIds.b3dm";

  var scene;
  var b3dmLoaders = [];

  beforeAll(function () {
    scene = createScene();
    // Keep the error from logging to the console when running tests
    spyOn(B3dmParser, "_deprecationWarning");
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (var i = 0; i < b3dmLoaders.length; i++) {
      var loader = b3dmLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    b3dmLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadB3dm(b3dmPath) {
    var resource = Resource.createIfNeeded(b3dmPath);

    return Resource.fetchArrayBuffer({
      url: b3dmPath,
    }).then(function (arrayBuffer) {
      var loader = new B3dmLoader({
        b3dmResource: resource,
        arrayBuffer: arrayBuffer,
      });
      b3dmLoaders.push(loader);
      loader.load();

      return waitForLoaderProcess(loader, scene);
    });
  }

  it("loads BatchedNoBatchIds", function () {
    return loadB3dm(noBatchIdsUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      var featureMetadata = components.featureMetadata;
      expect(featureMetadata).toBeUndefined();
    });
  });

  it("loads BatchedWithBatchTable", function () {
    return loadB3dm(withBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;
      var propertyTable = featureMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeDefined();
    });
  });

  it("loads BatchedWithBatchTableBinary", function () {
    return loadB3dm(withBatchTableBinaryUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;
      var propertyTable = featureMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeDefined();
    });
  });

  it("loads BatchedWithoutBatchTableUrl", function () {
    return loadB3dm(withoutBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;
      var propertyTable = featureMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeUndefined();
    });
  });

  it("loads BatchedWithRtcCenterUrl", function () {
    return loadB3dm(withRtcCenterUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;
      var propertyTable = featureMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);

      expect(loader.components.transform).toEqual(
        Matrix4.fromTranslation(new Cartesian3(0.1, 0.2, 0.3))
      );
    });
  });

  it("loads BatchTableHierarchy", function () {
    return loadB3dm(withBatchTableHierarchy).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;
      var propertyTable = featureMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(30);
      expect(propertyTable._batchTableHierarchy).toBeDefined();
    });
  });

  it("throws with invalid version", function () {
    var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
      version: 2,
    });
    Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "b3dm");
  });

  it("throws with empty gltf", function () {
    // Expect to throw DeveloperError in Model due to invalid gltf magic
    var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
    Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "b3dm");
  });

  it("destroys B3DM loader", function () {
    var unloadGltfLoader = spyOn(
      GltfLoader.prototype,
      "unload"
    ).and.callThrough();

    return loadB3dm(withBatchTableUrl).then(function (loader) {
      expect(loader.components).toBeDefined();
      expect(loader.isDestroyed()).toBe(false);

      loader.destroy();

      expect(loader.components).toBeUndefined();
      expect(loader.isDestroyed()).toBe(true);

      expect(unloadGltfLoader.calls.count()).toBe(1);
    });
  });
});
