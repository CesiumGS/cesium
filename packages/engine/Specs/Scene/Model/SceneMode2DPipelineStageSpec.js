import {
  Cartesian3,
  combine,
  GltfLoader,
  Matrix4,
  ModelStatistics,
  ModelType,
  ModelUtility,
  Resource,
  ResourceCache,
  SceneMode2DPipelineStage,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../index.js";;
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/Model/SceneMode2DPipelineStage",
  function () {
    const scratchMatrix = new Matrix4();

    const boxTexturedUrl =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const dracoBoxWithTangentsUrl =
      "./Data/Models/glTF-2.0/BoxWithTangents/glTF-Draco/BoxWithTangents.gltf";
    const boxInstancedTranslationUrl =
      "./Data/Models/glTF-2.0/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";

    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
      scene.morphTo2D(0.0);
      scene.updateFrameState();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      const gltfLoadersLength = gltfLoaders.length;
      for (let i = 0; i < gltfLoadersLength; ++i) {
        const gltfLoader = gltfLoaders[i];
        if (!gltfLoader.isDestroyed()) {
          gltfLoader.destroy();
        }
      }
      gltfLoaders.length = 0;
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

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources() {
      return {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelType.TILE_GLTF,
          statistics: new ModelStatistics(),
          sceneGraph: {
            computedModelMatrix: Matrix4.IDENTITY,
          },
          _modelResources: [],
        },
        runtimeNode: {
          computedTransform: Matrix4.IDENTITY,
        },
        runtimePrimitive: {},
        positionMin: new Cartesian3(-0.5, -0.5, -0.5),
        positionMax: new Cartesian3(0.5, 0.5, 0.5),
      };
    }

    it("processes resources for 2D for primitive", function () {
      const renderResources = mockRenderResources();

      return loadGltf(boxTexturedUrl, {
        loadAttributesFor2D: true,
      }).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        renderResources.runtimeNode.node = node;
        const primitive = node.primitives[0];

        SceneMode2DPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const model = renderResources.model;

        const runtimePrimitive = renderResources.runtimePrimitive;
        expect(runtimePrimitive.boundingSphere2D).toBeDefined();

        const positions2D = runtimePrimitive.positionBuffer2D;
        expect(positions2D).toBeDefined();
        expect(model._modelResources).toEqual([positions2D]);

        // Check that the position attribute's typed array has been unloaded.
        const positionAttribute = ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.typedArray).toBeUndefined();

        const shaderBuilder = renderResources.shaderBuilder;

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "USE_2D_POSITIONS",
        ]);

        const translationMatrix = Matrix4.fromTranslation(
          runtimePrimitive.boundingSphere2D.center,
          scratchMatrix
        );
        const expected = Matrix4.multiplyTransformation(
          scene.frameState.context.uniformState.view,
          translationMatrix,
          translationMatrix
        );
        expect(renderResources.uniformMap.u_modelView2D()).toEqual(expected);
      });
    });

    it("processes resources for 2D for primitive with draco compression", function () {
      const renderResources = mockRenderResources();

      return loadGltf(dracoBoxWithTangentsUrl, {
        loadAttributesFor2D: true,
      }).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        renderResources.runtimeNode.node = node;
        const primitive = node.primitives[0];

        SceneMode2DPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const model = renderResources.model;

        const runtimePrimitive = renderResources.runtimePrimitive;
        expect(runtimePrimitive.boundingSphere2D).toBeDefined();

        const positions2D = runtimePrimitive.positionBuffer2D;
        expect(positions2D).toBeDefined();
        expect(model._modelResources).toEqual([positions2D]);

        // Check that the position attribute's typed array has been unloaded.
        const positionAttribute = ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.typedArray).toBeUndefined();

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "USE_2D_POSITIONS",
        ]);

        const translationMatrix = Matrix4.fromTranslation(
          runtimePrimitive.boundingSphere2D.center,
          scratchMatrix
        );
        const expected = Matrix4.multiplyTransformation(
          scene.frameState.context.uniformState.view,
          translationMatrix,
          translationMatrix
        );
        expect(renderResources.uniformMap.u_modelView2D()).toEqual(expected);
      });
    });

    it("processes resources for instanced model in 2D", function () {
      const renderResources = mockRenderResources();

      return loadGltf(boxInstancedTranslationUrl, {
        loadAttributesFor2D: true,
      }).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        renderResources.runtimeNode.node = node;
        const primitive = node.primitives[0];

        SceneMode2DPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        // Only the 2D bounding sphere will be computed for the primitive.
        const runtimePrimitive = renderResources.runtimePrimitive;
        expect(runtimePrimitive.boundingSphere2D).toBeDefined();
        expect(runtimePrimitive.positionBuffer2D).toBeUndefined();

        // Check that the position attribute's typed array has been unloaded.
        const positionAttribute = ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.typedArray).toBeUndefined();

        // The 2D instancing flag will be added in InstancingPipelineStage
        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);

        // The u_modelView2D uniform will be added in InstancingPipelineStage
        expect(renderResources.uniformMap).toBeUndefined();
      });
    });
  },
  "WebGL"
);
