import {
  combine,
  GltfLoader,
  Matrix4,
  ModelType,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersSkinningStageVS,
  SkinningPipelineStage,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/SkinningPipelineStage",
  function () {
    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
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

    async function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    const simpleSkinUrl =
      "./Data/Models/glTF-2.0/SimpleSkin/glTF/SimpleSkin.gltf";
    const cesiumManUrl =
      "./Data/Models/glTF-2.0/CesiumMan/glTF-Draco/CesiumMan.gltf";

    it("processes skin with two joints", function () {
      const mockJointMatrices = [
        new Matrix4(),
        Matrix4.clone(Matrix4.IDENTITY),
      ];
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelType.TILE_GLTF,
        },
        runtimeNode: {
          computedJointMatrices: mockJointMatrices,
        },
      };

      return loadGltf(simpleSkinUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        SkinningPipelineStage.process(renderResources, primitive);

        const shaderBuilder = renderResources.shaderBuilder;

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_SKINNING",
        ]);

        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
          SkinningPipelineStage.FUNCTION_SIGNATURE_GET_SKINNING_MATRIX,
          [
            "    mat4 skinnedMatrix = mat4(0);",
            "    skinnedMatrix += a_weights_0.x * u_jointMatrices[int(a_joints_0.x)];",
            "    skinnedMatrix += a_weights_0.y * u_jointMatrices[int(a_joints_0.y)];",
            "    skinnedMatrix += a_weights_0.z * u_jointMatrices[int(a_joints_0.z)];",
            "    skinnedMatrix += a_weights_0.w * u_jointMatrices[int(a_joints_0.w)];",
            "    return skinnedMatrix;",
          ]
        );
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSkinningStageVS,
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform mat4 u_jointMatrices[2];",
        ]);

        const runtimeNode = renderResources.runtimeNode;
        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_jointMatrices()).toBe(
          runtimeNode.computedJointMatrices
        );
      });
    });

    it("processes skin with many joints", function () {
      const jointCount = 19; // Counted from model
      const mockJointMatrices = new Array(jointCount);
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelType.TILE_GLTF,
        },
        runtimeNode: {
          computedJointMatrices: mockJointMatrices,
        },
      };

      return loadGltf(cesiumManUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];

        SkinningPipelineStage.process(renderResources, primitive);

        const shaderBuilder = renderResources.shaderBuilder;

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_SKINNING",
        ]);

        // Even though the skin has many joints, the mesh only has one joints / weights attribute
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
          SkinningPipelineStage.FUNCTION_SIGNATURE_GET_SKINNING_MATRIX,
          [
            "    mat4 skinnedMatrix = mat4(0);",
            "    skinnedMatrix += a_weights_0.x * u_jointMatrices[int(a_joints_0.x)];",
            "    skinnedMatrix += a_weights_0.y * u_jointMatrices[int(a_joints_0.y)];",
            "    skinnedMatrix += a_weights_0.z * u_jointMatrices[int(a_joints_0.z)];",
            "    skinnedMatrix += a_weights_0.w * u_jointMatrices[int(a_joints_0.w)];",
            "    return skinnedMatrix;",
          ]
        );
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSkinningStageVS,
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          `uniform mat4 u_jointMatrices[${jointCount}];`,
        ]);

        const runtimeNode = renderResources.runtimeNode;
        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_jointMatrices()).toBe(
          runtimeNode.computedJointMatrices
        );
      });
    });
  },
  "WebGL"
);
