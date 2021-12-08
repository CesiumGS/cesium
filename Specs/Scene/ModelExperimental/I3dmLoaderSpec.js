import {
  I3dmLoader,
  I3dmParser,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/I3dmLoader", function () {
  var InstancedGltfExternalUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedGltfExternal/instancedGltfExternal.i3dm";
  var InstancedWithBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/instancedWithBatchTable.i3dm";
  var InstancedWithBatchTableBinaryUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/instancedWithBatchTableBinary.i3dm";
  var InstancedWithoutBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/instancedWithoutBatchTable.i3dm";
  var InstancedOrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm";
  var InstancedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/instancedOct32POrientation.i3dm";
  var InstancedScaleUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScale/instancedScale.i3dm";
  var InstancedScaleNonUniformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/instancedScaleNonUniform.i3dm";
  var InstancedRTCUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedRTC/instancedRTC.i3dm";
  var InstancedQuantizedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantized/instancedQuantized.i3dm";
  var InstancedQuantizedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/instancedQuantizedOct32POrientation.i3dm";
  var InstancedWithTransformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithTransform/instancedWithTransform.i3dm";
  var InstancedWithBatchIdsUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/instancedWithBatchIds.i3dm";
  var InstancedTexturedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedTextured/instancedTextured.i3dm";

  var scene;
  var i3dmLoaders = [];

  beforeAll(function () {
    scene = createScene();
    // Keep the error from logging to the console when running tests.
    spyOn(I3dmParser, "_deprecationWarning");
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (var i = 0; i < i3dmLoaders.length; i++) {
      var loader = i3dmLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    i3dmLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadI3dm(path) {
    var resource = Resource.createIfNeeded(path);

    return Resource.fetchArrayBuffer({
      url: path,
    }).then(function (arrayBuffer) {
      var loader = new I3dmLoader({
        i3dmResource: resource,
        arrayBuffer: arrayBuffer,
      });
      i3dmLoaders.push(loader);
      loader.load();

      return waitForLoaderProcess(loader, scene);
    });
  }

  it("loads InstancedGltfExternalUrl", function () {
    return loadI3dm(InstancedGltfExternalUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;

      expect(instances).toBeDefined();
    });
  });

  it("loads InstancedWithBatchTableUrl", function () {
    return loadI3dm(InstancedWithBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedWithBatchTableBinaryUrl", function () {
    return loadI3dm(InstancedWithBatchTableBinaryUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedWithoutBatchTableUrl", function () {
    return loadI3dm(InstancedWithoutBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedOrientationUrl", function () {
    return loadI3dm(InstancedOrientationUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedOct32POrientationUrl", function () {
    return loadI3dm(InstancedOct32POrientationUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedScaleUrl", function () {
    return loadI3dm(InstancedScaleUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedScaleNonUniformUrl", function () {
    return loadI3dm(InstancedScaleNonUniformUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedRTCUrl", function () {
    return loadI3dm(InstancedRTCUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedQuantizedUrl", function () {
    return loadI3dm(InstancedQuantizedUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedQuantizedOct32POrientationUrl", function () {
    return loadI3dm(InstancedQuantizedOct32POrientationUrl).then(function (
      loader
    ) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedWithTransformUrl", function () {
    return loadI3dm(InstancedWithTransformUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedWithBatchIdsUrl", function () {
    return loadI3dm(InstancedWithBatchIdsUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });

  it("loads InstancedTexturedUrl", function () {
    return loadI3dm(InstancedTexturedUrl).then(function (loader) {
      var components = loader.components;
      var instances = components.scene.nodes[0].instances;
      var featureMetadata = components.featureMetadata;

      expect(instances).toBeDefined();
      expect(featureMetadata).toBeDefined();
    });
  });
});
