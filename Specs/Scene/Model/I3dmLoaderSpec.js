import {
  I3dmLoader,
  I3dmParser,
  InstanceAttributeSemantic,
  Math as CesiumMath,
  Matrix4,
  Resource,
  ResourceCache,
  RuntimeError,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/Model/I3dmLoader",
  function () {
    const instancedGltfExternalUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedGltfExternal/instancedGltfExternal.i3dm";
    const instancedWithBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/instancedWithBatchTable.i3dm";
    const instancedWithBatchTableBinaryUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/instancedWithBatchTableBinary.i3dm";
    const instancedWithoutBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/instancedWithoutBatchTable.i3dm";
    const instancedOrientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm";
    const instancedOct32POrientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/instancedOct32POrientation.i3dm";
    const instancedScaleUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedScale/instancedScale.i3dm";
    const instancedScaleNonUniformUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/instancedScaleNonUniform.i3dm";
    const instancedRTCUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedRTC/instancedRTC.i3dm";
    const instancedQuantizedUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedQuantized/instancedQuantized.i3dm";
    const instancedQuantizedOct32POrientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/instancedQuantizedOct32POrientation.i3dm";
    const instancedWithTransformUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithTransform/instancedWithTransform.i3dm";
    const instancedWithBatchIdsUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/instancedWithBatchIds.i3dm";
    const instancedTexturedUrl =
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

    function expectLoadError(arrayBuffer) {
      expect(function () {
        const resource = Resource.createIfNeeded(
          "http://example.com/content.i3dm"
        );
        const loader = new I3dmLoader({
          i3dmResource: resource,
          arrayBuffer: arrayBuffer,
        });
        i3dmLoaders.push(loader);
        loader.load();

        return waitForLoaderProcess(loader, scene);
      }).toThrowError(RuntimeError);
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

    it("releases array buffer when finished loading", function () {
      return loadI3dm(instancedWithBatchTableUrl).then(function (loader) {
        expect(loader.components).toBeDefined();
        expect(loader._arrayBuffer).not.toBeDefined();
      });
    });

    it("loads InstancedGltfExternalUrl", function () {
      return loadI3dm(instancedGltfExternalUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();

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
      return loadI3dm(instancedWithBatchTableUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();

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
      return loadI3dm(instancedWithBatchTableBinaryUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();

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
      return loadI3dm(instancedWithoutBatchTableUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();

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
      return loadI3dm(instancedOrientationUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedOct32POrientationUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedScaleUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedScaleNonUniformUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedRTCUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
        // prettier-ignore
        expect(transform).toEqualEpsilon(new Matrix4(
        1.0, 0.0, 0.0, 1215013.8340490046,
        0.0, 1.0, 0.0, -4736316.75897742,
        0.0, 0.0, 1.0, 4081608.4380407534,
        0.0, 0.0, 0.0, 1.0
      ), CesiumMath.EPSILON8);
      });
    });

    it("loads InstancedQuantizedUrl", function () {
      return loadI3dm(instancedQuantizedUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
        verifyInstances(
          components,
          [
            InstanceAttributeSemantic.TRANSLATION,
            InstanceAttributeSemantic.ROTATION,
            InstanceAttributeSemantic.FEATURE_ID,
          ],
          25
        );
        // The transform is computed from the quantized positions
        // prettier-ignore
        expect(components.transform).toEqualEpsilon(new Matrix4(
        1, 0, 0, 1215013.8125,
        0, 1, 0, -4736316.75,
        0, 0, 1, 4081608.5,
        0, 0, 0, 1
      ), CesiumMath.EPSILON8);
      });
    });

    it("loads InstancedQuantizedOct32POrientationUrl", function () {
      return loadI3dm(instancedQuantizedOct32POrientationUrl).then(function (
        loader
      ) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedWithTransformUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedWithBatchIdsUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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
      return loadI3dm(instancedTexturedUrl).then(function (loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;

        expect(structuralMetadata).toBeDefined();
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

    it("throws with invalid format", function () {
      const arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        gltfFormat: 2,
      });
      expectLoadError(arrayBuffer);
    });

    it("throws with invalid version", function () {
      const arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        version: 2,
      });
      expectLoadError(arrayBuffer);
    });
  },
  "WebGL"
);
