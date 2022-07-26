import {
  Camera,
  Cartesian3,
  Cesium3DTileRefine,
  Cesium3DTileStyle,
  defined,
  defaultValue,
  Math as CesiumMath,
  Matrix4,
  ModelType,
  OrthographicFrustum,
  Pass,
  PointCloudStylingPipelineStage,
  PointCloudShading,
  RuntimeError,
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

    const mockPrimitiveWithNormals = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          min: new Cartesian3(0, 0, 0),
          max: new Cartesian3(1, 1, 1),
          count: 64,
        },
        {
          semantic: VertexAttributeSemantic.NORMAL,
          min: new Cartesian3(-1, -1, -1),
          max: new Cartesian3(1, 1, 1),
          count: 64,
        },
      ],
    };

    const mockRuntimeNode = {
      // prettier-ignore
      transform: new Matrix4(
        2, 0, 0, 1,
        0, 2, 0, 0,
        0, 0, 2, 0,
        0, 0, 0, 1
      ),
    };

    function mockGltfRenderResources(pointCloudShading) {
      const attenuation = defined(pointCloudShading)
        ? pointCloudShading.attenuation
        : false;

      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const mockModel = {
        type: ModelType.GLTF,
        pointCloudShading: pointCloudShading,
        _attenuation: attenuation,
      };

      return {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: mockModel,
      };
    }

    function mockPntsRenderResources(options) {
      const pointCloudShading = defaultValue(
        options.pointCloudShading,
        new PointCloudShading()
      );
      const attenuation = defined(pointCloudShading)
        ? pointCloudShading.attenuation
        : false;

      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const mockModel = {
        type: ModelType.TILE_PNTS,
        content: options.content,
        style: options.style,
        pointCloudShading: pointCloudShading,
        _attenuation: attenuation,
        structuralMetadata: options.structuralMetadata,
        featureTableId: options.featureTableId,
        featureTables: options.featureTables,
      };

      return {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        runtimeNode: mockRuntimeNode,
        model: mockModel,
        alphaOptions: {},
      };
    }

    const functionParameterList =
      "(" +
      "ProcessedAttributes attributes, " +
      "Metadata metadata, " +
      "float tiles3d_tileset_time" +
      ")";

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
      const renderResources = mockGltfRenderResources();
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
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPointCloudStylingStageVS,
      ]);
    });

    it("applies color style in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: 'color("red")',
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec4 v_pointCloudColor;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );
    });

    it("adjusts render options for translucent color style", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "rgba(255, 0, 0, 0.005)",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec4 v_pointCloudColor;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );

      expect(renderResources.alphaOptions.pass).toEqual(Pass.TRANSLUCENT);
    });

    it("applies point size style in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          pointSize: 5.0,
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_POINT_SIZE_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `float getPointSizeFromStyle${functionParameterList}`
      );
    });

    it("applies show style in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          show: false,
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_SHOW_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `bool getShowFromStyle${functionParameterList}`
      );
    });

    it("substitutes position name in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          show: "${POSITION}[0] > 0.5",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_SHOW_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `bool getShowFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "attributes.positionMC"
      );
    });

    it("substitutes absolute position name in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(${POSITION_ABSOLUTE} / 100000.0, 1.0)",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "v_positionWC"
      );
    });

    it("substitutes normal name in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(${NORMAL}, 1.0)",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitiveWithNormals,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "attributes.normalMC"
      );
    });

    it("substitutes color name in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(${COLOR}[0], 0.0, 1.0, 1.0)",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "attributes.color_0"
      );
    });

    it("throws if style uses normals but primitive has none", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(${NORMAL}, 1.0)",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });

      expect(function () {
        PointCloudStylingPipelineStage.process(
          renderResources,
          mockPrimitive,
          scene.frameState
        );
      }).toThrowError(RuntimeError);
    });

    it("substitutes metadata name in shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(${temperature}, 0.0, 0.0, 1.0)",
          show: "${id} > 5",
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
        structuralMetadata: {
          propertyAttributes: [
            {
              properties: { temperature: {}, id: {} },
            },
          ],
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "HAS_POINT_CLOUD_SHOW_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `bool getShowFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        `vec4 getColorFromStyle${functionParameterList}`
      );

      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "metadata.temperature"
      );
      ShaderBuilderTester.expectVertexLinesContains(
        shaderBuilder,
        "metadata.id"
      );
    });

    it("propogates tileset time to the shader", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          color: "vec4(fract(${tiles3d_tileset_time}), 0.0, 0.0, 1.0)",
          pointSize: 5.0,
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
            timeSinceLoad: 5.0,
          },
        },
      });
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        scene.frameState
      );

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_POINT_CLOUD_COLOR_STYLE",
        "HAS_POINT_CLOUD_POINT_SIZE_STYLE",
        "COMPUTE_POSITION_WC_STYLE",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec4 model_pointCloudParameters;",
      ]);

      const parameters = uniformMap.model_pointCloudParameters();
      expect(parameters.w).toBe(5.0);
    });

    it("does not apply style if model has feature table", function () {
      const renderResources = mockPntsRenderResources({
        style: new Cesium3DTileStyle({
          show: false,
        }),
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
        featureTableId: 0,
        featureTables: [
          {
            featuresLength: 1,
          },
        ],
      });
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
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      // No additional functions from the style should have been added.
      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPointCloudStylingStageVS,
      ]);
    });

    it("adds attenuation define to the shader", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
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
        "uniform vec4 model_pointCloudParameters;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap.model_pointCloudParameters).toBeDefined();

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPointCloudStylingStageVS,
      ]);
    });

    it("point size is determined by maximumAttenuation", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: 4,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.x).toEqual(4 * frameState.pixelRatio);
    });

    it("point size defaults to 5dp for 3D Tiles with additive refinement", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = mockPntsRenderResources({
        pointCloudShading: pointCloudShading,
        content: {
          tile: {
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.x).toEqual(5 * frameState.pixelRatio);
    });

    it("point size defaults to tileset.maximumScreenSpaceError for 3D Tiles with replace refinement", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = mockPntsRenderResources({
        pointCloudShading: pointCloudShading,
        content: {
          tile: {
            refine: Cesium3DTileRefine.REPLACE,
          },
          tileset: {
            maximumScreenSpaceError: 16,
          },
        },
      });
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.x).toEqual(16 * frameState.pixelRatio);
    });

    it("point size defaults to 1dp when maximumAttenuation is not defined", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        maximumAttenuation: undefined,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.x).toEqual(frameState.pixelRatio);
    });

    it("scales geometricError", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 2,
      });
      const renderResources = mockPntsRenderResources({
        pointCloudShading: pointCloudShading,
        content: {
          tile: {
            geometricError: 3,
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {},
        },
      });
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.y).toEqual(6);
    });

    it("uses tile geometric error when available", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
      });
      const renderResources = mockPntsRenderResources({
        pointCloudShading: pointCloudShading,
        content: {
          tile: {
            geometricError: 3,
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {},
        },
      });
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.y).toEqual(3);
    });

    it("uses baseResolution when tile geometric error is 0", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      const renderResources = mockPntsRenderResources({
        pointCloudShading: pointCloudShading,
        content: {
          tile: {
            geometricError: 0,
            refine: Cesium3DTileRefine.ADD,
          },
          tileset: {},
        },
      });
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.y).toEqual(4);
    });

    it("uses baseResolution for glTF models", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: 4,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.y).toEqual(4);
    });

    it("estimates geometric error when baseResolution is not available", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
        geometricErrorScale: 1,
        baseResolution: undefined,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      const volume = 8;
      const pointsLength = 64;
      const expected = CesiumMath.cbrt(volume / pointsLength);
      expect(attenuation.y).toEqual(expected);
    });

    it("computes depth multiplier from drawing buffer and frustum", function () {
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });

      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      const expected =
        scene.context.drawingBufferHeight / scene.camera.frustum.sseDenominator;
      expect(attenuation.z).toEqual(expected);
    });

    it("depth multiplier is set to positive infinity when in 2D mode", function () {
      scene.morphTo2D(0.0);
      scene.renderForSpecs();
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.z).toEqual(Number.POSITIVE_INFINITY);
    });

    it("depth multiplier is set to positive infinity when the camera uses orthographic projection", function () {
      const camera = scene.camera;
      camera.frustum = new OrthographicFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.width = camera.positionCartographic.height;
      scene.renderForSpecs();
      const pointCloudShading = new PointCloudShading({
        attenuation: true,
      });
      const renderResources = mockGltfRenderResources(pointCloudShading);
      const uniformMap = renderResources.uniformMap;

      const frameState = scene.frameState;
      PointCloudStylingPipelineStage.process(
        renderResources,
        mockPrimitive,
        frameState
      );

      const attenuation = uniformMap.model_pointCloudParameters();
      expect(attenuation.z).toBe(Number.POSITIVE_INFINITY);
    });
  },
  "WebGL"
);
