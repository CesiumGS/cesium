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
  const withBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/batchedWithBatchTable.b3dm";
  const withBatchTableBinaryUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/batchedWithBatchTableBinary.b3dm";
  const withoutBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/batchedWithoutBatchTable.b3dm";
  const withRtcCenterUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithRtcCenter/batchedWithRtcCenter.b3dm";
  const withBatchTableHierarchy =
    "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tile.b3dm";
  const noBatchIdsUrl =
    "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/batchedNoBatchIds.b3dm";

  let scene;
  const b3dmLoaders = [];

  beforeAll(function () {
    scene = createScene();
    // Keep the error from logging to the console when running tests
    spyOn(B3dmParser, "_deprecationWarning");
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (let i = 0; i < b3dmLoaders.length; i++) {
      const loader = b3dmLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    b3dmLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadB3dmArrayBuffer(resource, arrayBuffer) {
    const loader = new B3dmLoader({
      b3dmResource: resource,
      arrayBuffer: arrayBuffer,
    });
    b3dmLoaders.push(loader);
    loader.load();

    return waitForLoaderProcess(loader, scene);
  }

  function loadB3dm(b3dmPath) {
    const resource = Resource.createIfNeeded(b3dmPath);

    return Resource.fetchArrayBuffer({
      url: b3dmPath,
    }).then(function (arrayBuffer) {
      return loadB3dmArrayBuffer(resource, arrayBuffer);
    });
  }

  function expectLoadError(arrayBuffer) {
    const resource = new Resource("http://example.com/test.b3dm");
    expect(function () {
      return loadB3dmArrayBuffer(resource, arrayBuffer);
    }).toThrowRuntimeError();
  }

  it("loads BatchedNoBatchIds", function () {
    return loadB3dm(noBatchIdsUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      const structuralMetadata = components.structuralMetadata;
      expect(structuralMetadata).toBeUndefined();
    });
  });

  it("loads BatchedWithBatchTable", function () {
    return loadB3dm(withBatchTableUrl).then(function (loader) {
      const components = loader.components;
      const structuralMetadata = components.structuralMetadata;
      const propertyTable = structuralMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeDefined();
    });
  });

  it("loads BatchedWithBatchTableBinary", function () {
    return loadB3dm(withBatchTableBinaryUrl).then(function (loader) {
      const components = loader.components;
      const structuralMetadata = components.structuralMetadata;
      const propertyTable = structuralMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeDefined();
    });
  });

  it("loads BatchedWithoutBatchTableUrl", function () {
    return loadB3dm(withoutBatchTableUrl).then(function (loader) {
      const components = loader.components;
      const structuralMetadata = components.structuralMetadata;
      const propertyTable = structuralMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);
      expect(propertyTable.class).toBeUndefined();
    });
  });

  it("loads BatchedWithRtcCenterUrl", function () {
    return loadB3dm(withRtcCenterUrl).then(function (loader) {
      const components = loader.components;
      const structuralMetadata = components.structuralMetadata;
      const propertyTable = structuralMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(10);

      expect(loader.components.transform).toEqual(
        Matrix4.fromTranslation(new Cartesian3(0.1, 0.2, 0.3))
      );
    });
  });

  it("loads BatchTableHierarchy", function () {
    return loadB3dm(withBatchTableHierarchy).then(function (loader) {
      const components = loader.components;
      const structuralMetadata = components.structuralMetadata;
      const propertyTable = structuralMetadata.getPropertyTable(0);
      expect(propertyTable).toBeDefined();
      expect(propertyTable.count).toEqual(30);
      expect(propertyTable._batchTableHierarchy).toBeDefined();
    });
  });

  it("throws with invalid version", function () {
    const arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
      version: 2,
    });
    expectLoadError(arrayBuffer);
  });

  it("throws with empty gltf", function () {
    // Expect to throw DeveloperError in Model due to invalid gltf magic
    const arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
    expectLoadError(arrayBuffer);
  });

  it("destroys b3dm loader", function () {
    const unloadGltfLoader = spyOn(
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
