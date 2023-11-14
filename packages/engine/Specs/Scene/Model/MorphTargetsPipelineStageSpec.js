import {
  combine,
  ComponentDatatype,
  GltfLoader,
  ModelStatistics,
  ModelType,
  MorphTargetsPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersMorphTargetsStageVS,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/MorphTargetsPipelineStage",
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

    function verifyMorphTargetAttribute(
      attribute,
      expectedIndex,
      expectedOffset,
      expectedStride
    ) {
      expect(attribute.index).toEqual(expectedIndex);
      expect(attribute.vertexBuffer).toBeDefined();
      expect(attribute.componentsPerAttribute).toEqual(3);
      expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
      expect(attribute.offsetInBytes).toBe(expectedOffset);
      expect(attribute.strideInBytes).toBe(expectedStride);
    }

    const morphPrimitivesTestUrl =
      "./Data/Models/glTF-2.0/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf";
    const animatedMorphCubeUrl =
      "./Data/Models/glTF-2.0/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf";

    it("processes morph target with POSITION", function () {
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          statistics: new ModelStatistics(),
          type: ModelType.TILE_GLTF,
        },
        runtimeNode: {
          morphWeights: undefined,
        },
      };

      return loadGltf(morphPrimitivesTestUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];

        renderResources.runtimeNode.morphWeights = [1.0];

        MorphTargetsPipelineStage.process(renderResources, primitive);

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(1);

        const positionAttribute = attributes[0];
        const expectedIndex = 1;
        const expectedByteOffset = 0;
        const expectedStride = 12;
        verifyMorphTargetAttribute(
          positionAttribute,
          expectedIndex,
          expectedByteOffset,
          expectedStride
        );

        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION,
          MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_POSITION,
          [
            "    vec3 morphedPosition = position;",
            "    morphedPosition += u_morphWeights[0] * a_targetPosition_0;",
            "    return morphedPosition;",
          ]
        );

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_MORPH_TARGETS",
        ]);

        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "in vec3 a_targetPosition_0;",
        ]);

        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersMorphTargetsStageVS,
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform float u_morphWeights[1];",
        ]);

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_morphWeights()).toBe(
          renderResources.runtimeNode.morphWeights
        );
      });
    });

    it("processes morph target with POSITION, NORMAL, and TANGENT", function () {
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          statistics: new ModelStatistics(),
          type: ModelType.TILE_GLTF,
        },
        runtimeNode: {
          morphWeights: undefined,
        },
      };

      return loadGltf(animatedMorphCubeUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        renderResources.runtimeNode.morphWeights = [0.5, 0.5];
        MorphTargetsPipelineStage.process(renderResources, primitive);

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        const length = attributes.length;
        expect(length).toEqual(6);

        // These values happen to be the same for all attributes
        const expectedByteOffset = 0;
        const expectedStride = 12;
        for (let i = 0; i < length; i++) {
          const attribute = attributes[i];
          verifyMorphTargetAttribute(
            attribute,
            i + 1,
            expectedByteOffset,
            expectedStride
          );
        }

        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION,
          MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_POSITION,
          [
            "    vec3 morphedPosition = position;",
            "    morphedPosition += u_morphWeights[0] * a_targetPosition_0;",
            "    morphedPosition += u_morphWeights[1] * a_targetPosition_1;",
            "    return morphedPosition;",
          ]
        );

        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL,
          MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_NORMAL,
          [
            "    vec3 morphedNormal = normal;",
            "    morphedNormal += u_morphWeights[0] * a_targetNormal_0;",
            "    morphedNormal += u_morphWeights[1] * a_targetNormal_1;",
            "    return morphedNormal;",
          ]
        );

        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT,
          MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_TANGENT,
          [
            "    vec3 morphedTangent = tangent;",
            "    morphedTangent += u_morphWeights[0] * a_targetTangent_0;",
            "    morphedTangent += u_morphWeights[1] * a_targetTangent_1;",
            "    return morphedTangent;",
          ]
        );

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_MORPH_TARGETS",
        ]);

        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "in vec3 a_targetPosition_0;",
          "in vec3 a_targetPosition_1;",
          "in vec3 a_targetNormal_0;",
          "in vec3 a_targetNormal_1;",
          "in vec3 a_targetTangent_0;",
          "in vec3 a_targetTangent_1;",
        ]);

        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersMorphTargetsStageVS,
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform float u_morphWeights[2];",
        ]);

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_morphWeights()).toBe(
          renderResources.runtimeNode.morphWeights
        );
      });
    });
  },
  "WebGL"
);
