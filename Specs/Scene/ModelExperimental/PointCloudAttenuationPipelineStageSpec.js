import {
  Camera,
  ModelExperimentalType,
  OrthographicFrustum,
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

    beforeEach(function () {
      scene.morphTo3D(0.0);
      scene.camera = new Camera(scene);
      scene.renderForSpecs();
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

    it("uses tileset.pointCloudShading for 3D Tiles", function () {
      var uniformMap = {};
      var pointCloudShading1dp = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: 1,
      });
      var pointCloudShading4dp = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: 4,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          content: {
            tile: {
              geometricError: 3,
            },
            tileset: {
              pointCloudShading: pointCloudShading1dp,
            },
          },
          pointCloudShading: pointCloudShading4dp,
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(1 * frameState.pixelRatio);
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

    it("computes depth multiplier from drawing buffer and frustum", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
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
      var expected =
        scene.context.drawingBufferHeight / scene.camera.frustum.sseDenominator;
      expect(attenuation.z).toEqual(expected);
    });

    it("depth multiplier is set to positive infinity when in 2D mode", function () {
      scene.morphTo2D(0.0);
      scene.renderForSpecs();
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
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
      expect(attenuation.z).toEqual(Number.POSITIVE_INFINITY);
    });

    it("depth multiplier is set to positive infinity when the camera uses orthographic projection", function () {
      var camera = scene.camera;
      camera.frustum = new OrthographicFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.width = camera.positionCartographic.height;
      scene.renderForSpecs();
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
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
      expect(attenuation.z).toBe(Number.POSITIVE_INFINITY);
    });
  },
  "WebGL"
);
