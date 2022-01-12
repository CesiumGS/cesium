import {
  Camera,
  Cartesian3,
  Cesium3DTileRefine,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalType,
  OrthographicFrustum,
  PointCloudAttenuationPipelineStage,
  PointCloudShading,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/PointCloudAttenuationPipelineStage",
  function () {
    var scene;
    var mockPrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          min: new Cartesian3(0, 0, 0),
          max: new Cartesian3(1, 1, 1),
          count: 64,
        },
      ],
    };

    var mockRuntimeNode = {
      transform: new Matrix4(2, 0, 0, 1, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1),
    };

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
        runtimeNode: mockRuntimeNode,
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
        runtimeNode: mockRuntimeNode,
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

    it("point size defaults to 5dp for 3D Tiles with additive refinement", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          pointCloudShading: pointCloudShading,
          content: {
            tile: {
              refine: Cesium3DTileRefine.ADD,
            },
            tileset: {
              maximumScreenSpaceError: 16,
            },
          },
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(5 * frameState.pixelRatio);
    });

    it("point size defaults to tileset.maximumScreenSpaceError for 3D Tiles with replace refinement", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          pointCloudShading: pointCloudShading,
          content: {
            tile: {
              refine: Cesium3DTileRefine.REPLACE,
            },
            tileset: {
              maximumScreenSpaceError: 16,
            },
          },
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(16 * frameState.pixelRatio);
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
        runtimeNode: mockRuntimeNode,
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

    it("scales geometricError", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 2,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          pointCloudShading: pointCloudShading,
          content: {
            tile: {
              geometricError: 3,
              refine: Cesium3DTileRefine.ADD,
            },
          },
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(6);
    });

    it("uses tile geometric error when available", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          pointCloudShading: pointCloudShading,
          content: {
            tile: {
              geometricError: 3,
              refine: Cesium3DTileRefine.ADD,
            },
          },
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(3);
    });

    it("uses baseResolution when tile geometric error is 0", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
          pointCloudShading: pointCloudShading,
          content: {
            tile: {
              geometricError: 0,
              refine: Cesium3DTileRefine.ADD,
            },
          },
        },
      };

      var frameState = scene.frameState;
      PointCloudAttenuationPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      var attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(4);
    });

    it("uses baseResolution for glTF models", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
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
      expect(attenuation.y).toEqual(4);
    });

    it("estimates geometric error when baseResolution is not available", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: undefined,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
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
      var volume = 8;
      var pointsLength = 64;
      var expected = CesiumMath.cbrt(volume / pointsLength);
      expect(attenuation.y).toEqual(expected);
    });

    it("computes depth multiplier from drawing buffer and frustum", function () {
      var uniformMap = {};
      var pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      var renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
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
        runtimeNode: mockRuntimeNode,
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
        runtimeNode: mockRuntimeNode,
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
