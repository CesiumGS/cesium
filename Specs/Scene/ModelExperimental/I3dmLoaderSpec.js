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
  const InstancedGltfExternalUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedGltfExternal/instancedGltfExternal.i3dm";
  const InstancedWithBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/instancedWithBatchTable.i3dm";
  const InstancedWithBatchTableBinaryUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/instancedWithBatchTableBinary.i3dm";
  const InstancedWithoutBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/instancedWithoutBatchTable.i3dm";
  const InstancedOrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm";
  const InstancedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/instancedOct32POrientation.i3dm";
  const InstancedScaleUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScale/instancedScale.i3dm";
  const InstancedScaleNonUniformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/instancedScaleNonUniform.i3dm";
  const InstancedRTCUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedRTC/instancedRTC.i3dm";
  const InstancedQuantizedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantized/instancedQuantized.i3dm";
  const InstancedQuantizedOct32POrientationUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/instancedQuantizedOct32POrientation.i3dm";
  const InstancedWithTransformUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithTransform/instancedWithTransform.i3dm";
  const InstancedWithBatchIdsUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/instancedWithBatchIds.i3dm";
  const InstancedTexturedUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedTextured/instancedTextured.i3dm";

  let scene;
  const i3dmLoaders = [];

  beforeAll(function () {
    scene = createScene();
    // Keep the error from logging to the console when running tests.
    spyOn(I3dmParser, "_deprecationWarning");
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (let i = 0; i < i3dmLoaders.length; i++) {
      const loader = i3dmLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    i3dmLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadI3dm(path) {
    const resource = Resource.createIfNeeded(path);

    return Resource.fetchArrayBuffer({
      url: path,
    }).then(function (arrayBuffer) {
      const loader = new I3dmLoader({
        i3dmResource: resource,
        arrayBuffer: arrayBuffer,
      });
      i3dmLoaders.push(loader);
      loader.load();

      return waitForLoaderProcess(loader, scene);
    });
  }

  function verifyInstances(components, expectedSemantics, instancesLength) {
    for (let i = 0; i < components.nodes.length; i++) {
      const node = components.nodes[i];
      // Every node that has a primitive should have an ModelComponents.Instances object.
      if (node.primitives.length > 0) {
        expect(node.instances).toBeDefined();
        const attributesLength = node.instances.attributes.length;
        expect(attributesLength).toEqual(expectedSemantics.length);
        // Iterate through the attributes of the node with instances and check for all expected semantics.
        for (let j = 0; j < attributesLength; j++) {
          const attribute = node.instances.attributes[j];
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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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

      const transform = loader.components.transform;
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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
      const components = loader.components;
      const featureMetadata = components.featureMetadata;

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
