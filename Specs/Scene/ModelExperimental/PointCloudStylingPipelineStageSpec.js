import {
  Camera,
  Cartesian3,
  Cesium3DTileRefine,
  defaultValue,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalType,
  OrthographicFrustum,
  PointCloudStylingPipelineStage,
  PointCloudShading,
  ShaderBuilder,
  _shadersPointCloudStylingStageVS,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/PointCloudStylingPipelineStage",
  function () {
    let scene;
    const mockPrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          min: new Cartesian3(0, 0, 0),
          max: new Cartesian3(1, 1, 1),
          count: 64,
        },
      ],
    };

    const mockRuntimeNode = {
      // prettier-ignore
      transform: new Matrix4(2, 0, 0, 1,
                             0, 2, 0, 0,
                             0, 0, 2, 0,
                             0, 0, 0, 1),
    };

    function mockRenderResources(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const mockModel = {
        type: ModelExperimentalType.GLTF,
        style: options.style,
        pointCloudShading: options.pointCloudShading,
      };

      return {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: mockModel,
      };
    }

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

    it("adds common uniform and code to the shader", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudAttenuation;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudAttenuation).toBeDefined();

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPointCloudStylingStageVS,
      ]);
    });

    it("adds attenuation define to the shader", function () {
      const renderResources = mockRenderResources({
        pointCloudShading: new PointCloudShading({
          attenuation: true,
        }),
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_ATTENUATION",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudAttenuation;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudAttenuation).toBeDefined();

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPointCloudStylingStageVS,
      ]);
    });

    it("point size is determined by maximumAttenuation", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: 4,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(4 * frameState.pixelRatio);
    });

    it("point size defaults to 5dp for 3D Tiles with additive refinement", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = {
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

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(5 * frameState.pixelRatio);
    });

    it("point size defaults to tileset.maximumScreenSpaceError for 3D Tiles with replace refinement", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = {
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

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(16 * frameState.pixelRatio);
    });

    it("point size defaults to 1dp when maximumAttenuation is not defined", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.x).toEqual(frameState.pixelRatio);
    });

    it("scales geometricError", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 2,
      });
      const renderResources = {
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

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(6);
    });

    it("uses tile geometric error when available", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
      });
      const renderResources = {
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

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(3);
    });

    it("uses baseResolution when tile geometric error is 0", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      const renderResources = {
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

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(4);
    });

    it("uses baseResolution for glTF models", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.y).toEqual(4);
    });

    it("estimates geometric error when baseResolution is not available", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: undefined,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      const volume = 8;
      const pointsLength = 64;
      const expected = CesiumMath.cbrt(volume / pointsLength);
      expect(attenuation.y).toEqual(expected);
    });

    it("computes depth multiplier from drawing buffer and frustum", function () {
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      const expected =
        scene.context.drawingBufferHeight / scene.camera.frustum.sseDenominator;
      expect(attenuation.z).toEqual(expected);
    });

    it("depth multiplier is set to positive infinity when in 2D mode", function () {
      scene.morphTo2D(0.0);
      scene.renderForSpecs();
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.z).toEqual(Number.POSITIVE_INFINITY);
    });

    it("depth multiplier is set to positive infinity when the camera uses orthographic projection", function () {
      const camera = scene.camera;
      camera.frustum = new OrthographicFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.width = camera.positionCartographic.height;
      scene.renderForSpecs();
      const uniformMap = {};
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: {
          type: ModelExperimentalType.GLTF,
          pointCloudShading: pointCloudShading,
        },
      };

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudAttenuation();
      expect(attenuation.z).toBe(Number.POSITIVE_INFINITY);
    });
  },
  "WebGL"
);
