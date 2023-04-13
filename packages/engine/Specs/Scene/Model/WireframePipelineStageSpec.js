import {
  combine,
  GltfLoader,
  ModelStatistics,
  PrimitiveType,
  Resource,
  ResourceCache,
  ShaderBuilder,
  WireframePipelineStage,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";

describe(
  "Scene/Model/WireframePipelineStage",
  function () {
    const boxTexturedBinary =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";

    const resources = [];
    const gltfLoaders = [];

    let scene;
    let sceneWithWebgl2;
    beforeAll(function () {
      scene = createScene({
        contextOptions: {
          sceneWithWebgl1: true,
        },
      });
      sceneWithWebgl2 = createScene();
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

    async function loadGltf(gltfPath, scene, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    function mockRenderResources(primitive) {
      return {
        indices: primitive.indices,
        count: primitive.indices.count,
        primitiveType: primitive.primitiveType,
        wireframeIndexBuffer: undefined,
        model: {
          _pipelineResources: resources,
          statistics: new ModelStatistics(),
        },
        shaderBuilder: new ShaderBuilder(),
      };
    }

    it("adds define to shader", function () {
      return loadGltf(boxTexturedBinary, sceneWithWebgl2).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = sceneWithWebgl2.frameState;

        const renderResources = mockRenderResources(primitive);
        const shaderBuilder = renderResources.shaderBuilder;

        WireframePipelineStage.process(renderResources, primitive, frameState);

        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_WIREFRAME",
        ]);
      });
    });

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

        const wireframeIndexBuffer = renderResources.wireframeIndexBuffer;
        const model = renderResources.model;
        expect(wireframeIndexBuffer).toBeDefined();
        expect(model._pipelineResources).toEqual([wireframeIndexBuffer]);
        expect(model.statistics.geometryByteLength).toBe(
          wireframeIndexBuffer.sizeInBytes
        );
        expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
        expect(renderResources.count).toBe(72);
      });
    });

    it("Creates wireframe indices from typedArray (WebGL 1)", function () {
      const options = {
        loadIndicesForWireframe: true,
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

        const wireframeIndexBuffer = renderResources.wireframeIndexBuffer;
        const model = renderResources.model;
        expect(wireframeIndexBuffer).toBeDefined();
        expect(model._pipelineResources).toEqual([wireframeIndexBuffer]);
        expect(model.statistics.geometryByteLength).toBe(
          wireframeIndexBuffer.sizeInBytes
        );

        expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
        expect(renderResources.count).toBe(72);
      });
    });
  },
  "WebGL"
);
