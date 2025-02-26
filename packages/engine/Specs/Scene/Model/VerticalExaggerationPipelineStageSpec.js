import {
  _shadersVerticalExaggerationStageVS,
  Cartesian2,
  RenderState,
  ShaderBuilder,
  VerticalExaggerationPipelineStage,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/VerticalExaggerationPipelineStage",
  function () {
    const mockModel = {};
    const mockPrimitive = {};
    const mockFrameState = {
      verticalExaggeration: 2.0,
      verticalExaggerationRelativeHeight: 100.0,
    };

    function mockRenderResources() {
      return {
        model: mockModel,
        shaderBuilder: new ShaderBuilder(),
        uniformMap: {},
        renderStateOptions: RenderState.getState(RenderState.fromCache()),
      };
    }

    it("adds shader lines, defines, and uniforms", function () {
      const renderResources = mockRenderResources();
      VerticalExaggerationPipelineStage.process(
        renderResources,
        mockPrimitive,
        mockFrameState,
      );

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersVerticalExaggerationStageVS,
      ]);
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_VERTICAL_EXAGGERATION",
      ]);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform vec2 u_verticalExaggerationAndRelativeHeight;",
      ]);
      const expectedUniform = Cartesian2.fromElements(
        mockFrameState.verticalExaggeration,
        mockFrameState.verticalExaggerationRelativeHeight,
      );
      expect(
        renderResources.uniformMap.u_verticalExaggerationAndRelativeHeight(),
      ).toEqual(expectedUniform);
    });
  },
  "WebGL",
);
