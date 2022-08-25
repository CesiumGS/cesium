import {
  AlphaPipelineStage,
  BlendingState,
  defaultValue,
  ModelAlphaOptions,
  Pass,
  RenderState,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe(
  "Scene/Model/AlphaPipelineStage",
  function () {
    const mockModel = {
      opaquePass: Pass.CESIUM_3D_TILE,
    };
    const mockPrimitive = {};
    const mockFrameState = {};

    function mockRenderResources(alphaOptions) {
      return {
        model: mockModel,
        shaderBuilder: new ShaderBuilder(),
        alphaOptions: defaultValue(alphaOptions, new ModelAlphaOptions()),
        uniformMap: {},
        renderStateOptions: RenderState.getState(RenderState.fromCache()),
      };
    }

    it("defaults to the model's pass if not specified", function () {
      const renderResources = mockRenderResources();
      expect(renderResources.alphaOptions.pass).not.toBeDefined();

      AlphaPipelineStage.process(
        renderResources,
        mockPrimitive,
        mockFrameState
      );
      expect(renderResources.alphaOptions.pass).toBe(mockModel.opaquePass);
    });

    it("sets render state options when given translucent pass", function () {
      const alphaOptions = new ModelAlphaOptions();
      alphaOptions.pass = Pass.TRANSLUCENT;

      const renderResources = mockRenderResources(alphaOptions);
      expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);

      AlphaPipelineStage.process(
        renderResources,
        mockPrimitive,
        mockFrameState
      );

      const renderStateOptions = renderResources.renderStateOptions;
      expect(renderStateOptions.cull.enabled).toBe(false);
      expect(renderStateOptions.depthMask).toBe(false);
      expect(renderStateOptions.blending).toBe(BlendingState.ALPHA_BLEND);
    });

    it("handles alphaCutoff", function () {
      const cutoff = 0.6;
      const alphaOptions = new ModelAlphaOptions();
      alphaOptions.alphaCutoff = cutoff;
      alphaOptions.pass = Pass.TRANSLUCENT;
      const renderResources = mockRenderResources(alphaOptions);

      AlphaPipelineStage.process(
        renderResources,
        mockPrimitive,
        mockFrameState
      );

      const shaderBuilder = renderResources.shaderBuilder;
      expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
        "ALPHA_MODE_MASK",
      ]);
      expect(shaderBuilder._fragmentShaderParts.uniformLines).toEqual([
        "uniform float u_alphaCutoff;",
      ]);
      expect(renderResources.uniformMap.u_alphaCutoff()).toBe(cutoff);
    });
  },
  "WebGL"
);
