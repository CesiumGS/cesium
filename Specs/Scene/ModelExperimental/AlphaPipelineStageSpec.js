import {
  AlphaPipelineStage,
  ModelAlphaOptions,
  Pass,
  RenderState,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/AlphaPipelineStage", function () {
  const mockModel = {
    opaquePass: Pass.CESIUM_3D_TILE,
  };
  const mockPrimitive = {};
  const mockFrameState = {};

  it("Defaults to the model's pass if not specified", function () {
    const renderResources = {
      model: mockModel,
      shaderBuilder: new ShaderBuilder(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: RenderState.getState(RenderState.fromCache()),
    };

    expect(renderResources.alphaOptions.pass).not.toBeDefined();

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(renderResources.alphaOptions.pass).toBe(mockModel.opaquePass);
  });

  it("handles alphaCutoff", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: RenderState.getState(RenderState.fromCache()),
    };
    const cutoff = 0.6;
    renderResources.alphaOptions.alphaCutoff = cutoff;

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "ALPHA_MODE_MASK",
    ]);

    expect(shaderBuilder._fragmentShaderParts.uniformLines).toEqual([
      "uniform float u_alphaCutoff;",
    ]);

    expect(renderResources.uniformMap.u_alphaCutoff()).toBe(cutoff);
  });
});
