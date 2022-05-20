import {
  Cartesian3,
  combine,
  GltfLoader,
  Matrix4,
  ModelExperimentalType,
  ModelExperimentalUtility,
  Resource,
  ResourceCache,
  SceneMode2DPipelineStage,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/SceneMode2DPipelineStage", function () {
  const scratchMatrix = new Matrix4();

  const boxTexturedUrl =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
  const dracoBoxWithTangentsUrl =
    "./Data/Models/DracoCompression/BoxWithTangents/BoxWithTangents.gltf";

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
        type: ModelExperimentalType.TILE_GLTF,
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
      loadPositionsFor2D: true,
    }).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      SceneMode2DPipelineStage.process(
        renderResources,
        primitive,
        scene.frameState
      );

      const runtimePrimitive = renderResources.runtimePrimitive;
      expect(runtimePrimitive.boundingSphere2D).toBeDefined();
      expect(runtimePrimitive.positionBuffer2D).toBeDefined();

      // Check that the position attribute's typed array has been unloaded.
      const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
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
        scene.frameState.camera.viewMatrix,
        translationMatrix,
        translationMatrix
      );
      expect(renderResources.uniformMap.u_modelView2D()).toEqual(expected);
    });
  });

  it("processes resources for 2D for primitive with draco compression", function () {
    const renderResources = mockRenderResources();

    return loadGltf(dracoBoxWithTangentsUrl, {
      loadPositionsFor2D: true,
    }).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      SceneMode2DPipelineStage.process(
        renderResources,
        primitive,
        scene.frameState
      );

      const runtimePrimitive = renderResources.runtimePrimitive;
      expect(runtimePrimitive.boundingSphere2D).toBeDefined();
      expect(runtimePrimitive.positionBuffer2D).toBeDefined();

      // Check that the position attribute's typed array has been unloaded.
      const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
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
        scene.frameState.camera.viewMatrix,
        translationMatrix,
        translationMatrix
      );
      expect(renderResources.uniformMap.u_modelView2D()).toEqual(expected);
    });
  });
});
