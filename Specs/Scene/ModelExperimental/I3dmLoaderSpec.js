import {
  I3dmLoader,
  I3dmParser,
  InstanceAttributeSemantic,
  Matrix4,
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

  function verifyInstances(components, expectedSemantics, instancesLength) {
    for (var i = 0; i < components.nodes.length; i++) {
      var node = components.nodes[i];
      // Every node that has a primitive should have an ModelComponents.Instances object.
      if (node.primitives.length > 0) {
        expect(node.instances).toBeDefined();
        var attributesLength = node.instances.attributes.length;
        expect(attributesLength).toEqual(expectedSemantics.length);
        // Iterate through the attributes of the node with instances and check for all expected semantics.
        for (var j = 0; j < attributesLength; j++) {
          var attribute = node.instances.attributes[j];
          expect(expectedSemantics.indexOf(attribute.semantic) > -1).toEqual(
            true
          );
          expect(attribute.count).toEqual(instancesLength);
        }
      }
    }
  }

  it("loads InstancedGltfExternalUrl", function () {
    return loadI3dm(InstancedGltfExternalUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();

      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedWithBatchTableUrl", function () {
    return loadI3dm(InstancedWithBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();

      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedWithBatchTableBinaryUrl", function () {
    return loadI3dm(InstancedWithBatchTableBinaryUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();

      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedWithoutBatchTableUrl", function () {
    return loadI3dm(InstancedWithoutBatchTableUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();

      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedOrientationUrl", function () {
    return loadI3dm(InstancedOrientationUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedOct32POrientationUrl", function () {
    return loadI3dm(InstancedOct32POrientationUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedScaleUrl", function () {
    return loadI3dm(InstancedScaleUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.SCALE,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedScaleNonUniformUrl", function () {
    return loadI3dm(InstancedScaleNonUniformUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.SCALE,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedRTCUrl", function () {
    return loadI3dm(InstancedRTCUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );

      var transform = loader.components.transform;
      expect(transform[Matrix4.COLUMN0ROW0]).toEqual(1.0);
      expect(transform[Matrix4.COLUMN1ROW0]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN2ROW0]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN3ROW0]).toEqual(1215013.8340490046);
      expect(transform[Matrix4.COLUMN0ROW1]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN1ROW1]).toEqual(1.0);
      expect(transform[Matrix4.COLUMN2ROW1]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN3ROW1]).toEqual(-4736316.75897742);
      expect(transform[Matrix4.COLUMN0ROW2]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN1ROW2]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN2ROW2]).toEqual(1.0);
      expect(transform[Matrix4.COLUMN3ROW2]).toEqual(4081608.4380407534);
      expect(transform[Matrix4.COLUMN0ROW3]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN1ROW3]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN2ROW3]).toEqual(0.0);
      expect(transform[Matrix4.COLUMN3ROW3]).toEqual(1.0);
    });
  });

  it("loads InstancedQuantizedUrl", function () {
    return loadI3dm(InstancedQuantizedUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedQuantizedOct32POrientationUrl", function () {
    return loadI3dm(InstancedQuantizedOct32POrientationUrl).then(function (
      loader
    ) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedWithTransformUrl", function () {
    return loadI3dm(InstancedWithTransformUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedWithBatchIdsUrl", function () {
    return loadI3dm(InstancedWithBatchIdsUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });

  it("loads InstancedTexturedUrl", function () {
    return loadI3dm(InstancedTexturedUrl).then(function (loader) {
      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      expect(featureMetadata).toBeDefined();
      verifyInstances(
        components,
        [
          InstanceAttributeSemantic.TRANSLATION,
          InstanceAttributeSemantic.ROTATION,
          InstanceAttributeSemantic.FEATURE_ID,
        ],
        25
      );
    });
  });
});
