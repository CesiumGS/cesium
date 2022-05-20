import {
  combine,
  GltfLoader,
  PrimitiveType,
  Resource,
  ResourceCache,
  WireframePipelineStage,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/WireframePipelineStage",
  function () {
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";

    const resources = [];
    const gltfLoaders = [];

    let scene;
    let sceneWithWebgl2;
    beforeAll(function () {
      scene = createScene();
      sceneWithWebgl2 = createScene({
        contextOptions: {
          requestWebgl2: true,
        },
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
      sceneWithWebgl2.destroyForSpecs();
    });

    function cleanup(resourcesArray) {
      for (let i = 0; i < resourcesArray.length; i++) {
        const resource = resourcesArray[i];
        if (!resource.isDestroyed()) {
          resource.destroy();
        }
      }
      resourcesArray.length = 0;
    }

    afterEach(function () {
      cleanup(resources);
      cleanup(gltfLoaders);
      ResourceCache.clearForSpecs();
    });

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, scene, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources(primitive) {
      return {
        indices: primitive.indices,
        count: primitive.indices.count,
        primitiveType: primitive.primitiveType,
        wireframeIndexBuffer: undefined,
        model: {
          _resources: resources,
        },
      };
    }

    it("Creates wireframe indices from buffer (WebGL 2)", function () {
      if (!sceneWithWebgl2.context.webgl2) {
        return;
      }

      return loadGltf(boxTexturedBinary, sceneWithWebgl2).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = sceneWithWebgl2.frameState;

        const renderResources = mockRenderResources(primitive);

        expect(renderResources.count).toBe(36);
        expect(renderResources.primitiveType).toBe(PrimitiveType.TRIANGLES);

        WireframePipelineStage.process(renderResources, primitive, frameState);
        expect(renderResources.wireframeIndexBuffer).toBeDefined();
        expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
        expect(renderResources.count).toBe(72);
      });
    });

    it("Creates wireframe indices from typedArray (WebGL 1)", function () {
      const options = {
        loadAsTypedArray: true,
      };
      return loadGltf(boxTexturedBinary, scene, options).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;

        const renderResources = mockRenderResources(primitive);

        expect(renderResources.count).toBe(36);
        expect(renderResources.primitiveType).toBe(PrimitiveType.TRIANGLES);

        WireframePipelineStage.process(renderResources, primitive, frameState);
        expect(renderResources.wireframeIndexBuffer).toBeDefined();
        expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
        expect(renderResources.count).toBe(72);
      });
    });
  },
  "WebGL"
);
