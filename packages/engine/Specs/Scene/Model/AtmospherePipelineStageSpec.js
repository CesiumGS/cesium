import {
  _shadersAtmosphereStageFS,
  _shadersAtmosphereStageVS,
  Cartesian3,
  AtmospherePipelineStage,
  ShaderBuilder,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/AtmospherePipelineStage",
  function () {
    const mockModel = {
      boundingSphere: {
        center: Cartesian3.fromDegrees(0, 0, 0),
      },
    };

    function mockFrameState() {
      return {
        camera: {
          // position the camera a little bit east of the model
          // and slightly above
          positionWC: Cartesian3.fromDegrees(0.01, 0, 1),
        },
        fog: {
          density: 2e-4,
        },
      };
    }

    function mockRenderResources() {
      return {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: {},
      };
    }

    it("configures shader", function () {
      const renderResources = mockRenderResources();
      const frameState = mockFrameState();

      AtmospherePipelineStage.process(renderResources, mockModel, frameState);

      const shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_ATMOSPHERE",
        "COMPUTE_POSITION_WC_ATMOSPHERE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_ATMOSPHERE",
        "COMPUTE_POSITION_WC_ATMOSPHERE",
      ]);

      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "vec3 v_atmosphereRayleighColor;",
        "vec3 v_atmosphereMieColor;",
        "float v_atmosphereOpacity;",
      ]);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersAtmosphereStageVS,
      ]);
      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersAtmosphereStageFS,
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform bool u_isInFog;",
      ]);
    });

    it("u_isInFog() is false if the camera is at the model center", function () {
      const renderResources = mockRenderResources();
      const frameState = mockFrameState();

      frameState.camera.positionWC = Cartesian3.clone(
        mockModel.boundingSphere.center,
        frameState.camera.positionWC
      );

      AtmospherePipelineStage.process(renderResources, mockModel, frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(false);
    });

    it("u_isInFog() is false if the camera is in space", function () {
      const renderResources = mockRenderResources();
      const frameState = mockFrameState();

      // For this case, the fact that Fog decreases the density to 0 when
      // the camera is far above the model is what causes u_isInFog to
      // be false.
      frameState.camera.positionWC = Cartesian3.fromDegrees(0.001, 0, 100000);
      frameState.fog.density = 0;

      AtmospherePipelineStage.process(renderResources, mockModel, frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(false);
    });

    it("u_isInFog() is true when the tile is in fog", function () {
      const renderResources = mockRenderResources();
      const frameState = mockFrameState();

      AtmospherePipelineStage.process(renderResources, mockModel, frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(true);
    });
  },
  "WebGL"
);
