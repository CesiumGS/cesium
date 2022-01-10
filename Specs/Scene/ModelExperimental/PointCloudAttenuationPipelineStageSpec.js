import {
  ModelExperimentalType,
  PointCloudAttenuationPipelineStage,
  PointCloudShading,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/PointCloudAttenuationPipelineStage",
  function () {
    var scene;
    var mockPrimitive = {};

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("adds uniform and define to the shader", function () {
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var renderResources = {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        model: {
          type: ModelExperimentalType.GLTF,
        },
      };

      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "USE_POINT_CLOUD_ATTENUATION",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec3 model_pointCloudAttenuation;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudAttenuation).toBeDefined();
    });

    it("point size is determined by maximumAttenuation", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: 4,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(4 * frameState.pixelRatio);
    });

    it("point size defaults to 1dp when maximumAttenuation is not defined", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(frameState.pixelRatio);
    });
  },
  "WebGL"
);
