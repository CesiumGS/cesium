import {
  combine,
  GltfLoader,
  ModelExperimentalType,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersSkinningStageVS,
  SkinningPipelineStage,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/SkinningPipelineStage",
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

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    const simpleSkinUrl =
      "./Data/Models/GltfLoader/SimpleSkin/glTF/SimpleSkin.gltf";

    /*it("processes simple skin", function () {
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(simpleSkinUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];

        SkinningPipelineStage.process(renderResources, node, scene.frameState);

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
            "    return skinnedMatrix;",
          ]
        );
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSkinningStageVS,
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform mat4 u_jointMatrices[2];",
        ]);

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_jointMatrices()).toBe(node.computedJointMatrices);
      });
    });*/
  },
  "WebGL"
);
