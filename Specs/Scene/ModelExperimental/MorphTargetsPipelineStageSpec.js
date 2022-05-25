import {
  combine,
  ComponentDatatype,
  GltfLoader,
  ModelExperimentalStatistics,
  ModelExperimentalType,
  MorphTargetsPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersMorphTargetsStageVS,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/MorphTargetsPipelineStage",
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
      "./Data/Models/GltfLoader/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf";
    const animatedMorphCubeUrl =
      "./Data/Models/GltfLoader/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf";

    it("processes morph target with POSITION", function () {
      const renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          statistics: new ModelExperimentalStatistics(),
          type: ModelExperimentalType.TILE_GLTF,
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
        expect(renderResources.model.statistics.geometryByteLength).toBe(
          positionAttribute.vertexBuffer.sizeInBytes
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
          "attribute vec3 a_targetPosition_0;",
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
          statistics: new ModelExperimentalStatistics(),
          type: ModelExperimentalType.TILE_GLTF,
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
        let totalSize = 0;
        for (let i = 0; i < length; i++) {
          const attribute = attributes[i];
          verifyMorphTargetAttribute(
            attribute,
            i + 1,
            expectedByteOffset,
            expectedStride
          );
          totalSize += attribute.vertexBuffer.sizeInBytes;
        }
        expect(renderResources.model.statistics.geometryByteLength).toBe(
          totalSize
        );

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
          "attribute vec3 a_targetPosition_0;",
          "attribute vec3 a_targetPosition_1;",
          "attribute vec3 a_targetNormal_0;",
          "attribute vec3 a_targetNormal_1;",
          "attribute vec3 a_targetTangent_0;",
          "attribute vec3 a_targetTangent_1;",
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
