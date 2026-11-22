import { IndexDatatype, PrimitiveType, combine } from "@cesium/core";
import {
  Buffer,
  BufferUsage,
  GltfLoader,
  ModelStatistics,
  Resource,
  ResourceCache,
  ShaderBuilder,
  VertexAttributeSemantic,
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
      return loadGltf(boxTexturedBinary, sceneWithWebgl2).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[1];
          const primitive = node.primitives[0];
          const frameState = sceneWithWebgl2.frameState;

          const renderResources = mockRenderResources(primitive);
          const shaderBuilder = renderResources.shaderBuilder;

          WireframePipelineStage.process(
            renderResources,
            primitive,
            frameState,
          );

          ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
            "HAS_WIREFRAME",
          ]);
        },
      );
    });

    it("Creates wireframe indices from buffer (WebGL 2)", function () {
      if (!sceneWithWebgl2.context.webgl2) {
        return;
      }

      return loadGltf(boxTexturedBinary, sceneWithWebgl2).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[1];
          const primitive = node.primitives[0];
          const frameState = sceneWithWebgl2.frameState;

          const renderResources = mockRenderResources(primitive);

          expect(renderResources.count).toBe(36);
          expect(renderResources.primitiveType).toBe(PrimitiveType.TRIANGLES);

          WireframePipelineStage.process(
            renderResources,
            primitive,
            frameState,
          );

          const wireframeIndexBuffer = renderResources.wireframeIndexBuffer;
          const model = renderResources.model;
          expect(wireframeIndexBuffer).toBeDefined();
          expect(model._pipelineResources).toEqual([wireframeIndexBuffer]);
          expect(model.statistics.geometryByteLength).toBe(
            wireframeIndexBuffer.sizeInBytes,
          );
          expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
          expect(renderResources.count).toBe(72);
        },
      );
    });

    [Uint8Array, Uint16Array, Uint32Array].forEach(function (ArrayType) {
      [4, 65536].forEach(function (vertexCount) {
        it(`reads ${ArrayType.name} indices with ${vertexCount} vertices (WebGL 2)`, function () {
          const context = sceneWithWebgl2.context;
          if (!context.webgl2 || window.webglStub) {
            return;
          }

          const indices = new ArrayType([0, 2, 1, 0, 3, 2]);
          const indexDatatype = IndexDatatype.fromSizeInBytes(
            indices.BYTES_PER_ELEMENT,
          );
          const indexBuffer = Buffer.createIndexBuffer({
            context: context,
            typedArray: indices,
            usage: BufferUsage.STATIC_DRAW,
            indexDatatype: indexDatatype,
          });
          resources.push(indexBuffer);
          const primitive = {
            attributes: [
              {
                semantic: VertexAttributeSemantic.POSITION,
                count: vertexCount,
              },
            ],
            primitiveType: PrimitiveType.TRIANGLES,
            indices: {
              buffer: indexBuffer,
              count: indices.length,
              indexDatatype: indexDatatype,
            },
          };
          const renderResources = mockRenderResources(primitive);
          WireframePipelineStage.process(
            renderResources,
            primitive,
            sceneWithWebgl2.frameState,
          );

          const wireframeIndexBuffer = renderResources.wireframeIndexBuffer;
          const ResultArray = vertexCount < 65536 ? Uint16Array : Uint32Array;
          const result = new ResultArray(12);
          wireframeIndexBuffer.getBufferData(result);
          expect(Array.from(result)).toEqual([
            0, 2, 2, 1, 1, 0, 0, 3, 3, 2, 2, 0,
          ]);
        });
      });
    });

    it("Creates wireframe indices from typedArray (WebGL 1)", function () {
      const options = {
        loadIndicesForWireframe: true,
      };
      return loadGltf(boxTexturedBinary, scene, options).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[1];
          const primitive = node.primitives[0];
          const frameState = scene.frameState;

          const renderResources = mockRenderResources(primitive);

          expect(renderResources.count).toBe(36);
          expect(renderResources.primitiveType).toBe(PrimitiveType.TRIANGLES);

          WireframePipelineStage.process(
            renderResources,
            primitive,
            frameState,
          );

          const wireframeIndexBuffer = renderResources.wireframeIndexBuffer;
          const model = renderResources.model;
          expect(wireframeIndexBuffer).toBeDefined();
          expect(model._pipelineResources).toEqual([wireframeIndexBuffer]);
          expect(model.statistics.geometryByteLength).toBe(
            wireframeIndexBuffer.sizeInBytes,
          );

          expect(renderResources.primitiveType).toBe(PrimitiveType.LINES);
          expect(renderResources.count).toBe(72);
        },
      );
    });
  },
  "WebGL",
);
