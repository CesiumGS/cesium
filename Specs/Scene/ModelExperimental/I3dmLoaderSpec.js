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
  /*
  var InstancedWithBatchTableBinaryUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/tileset.json";
  var InstancedWithoutBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/tileset.json";
  var InstancedOrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOrientation/tileset.json";
  var InstancedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/tileset.json";
  var InstancedScaleUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScale/tileset.json";
  var InstancedScaleNonUniformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/tileset.json";
  var InstancedRTCUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedRTC/tileset.json";
  var InstancedQuantizedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantized/tileset.json";
  var InstancedQuantizedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/tileset.json";
  var InstancedWithTransformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithTransform/tileset.json";
  var InstancedWithBatchIdsUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/tileset.json";
  var InstancedTexturedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedTextured/tileset.json";
    */

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
});
