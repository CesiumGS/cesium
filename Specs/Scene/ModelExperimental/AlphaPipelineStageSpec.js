import {
  AlphaMode,
  AlphaPipelineStage,
  BlendingState,
  ModelAlphaOptions,
  Pass,
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
      renderStateOptions: {},
    };

    expect(renderResources.alphaOptions.pass).not.toBeDefined();

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(renderResources.alphaOptions.pass).toBe(mockModel.opaquePass);
  });

  it("handles alphaMode = OPAQUE", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: {},
    };
    renderResources.alphaOptions.pass = Pass.OPAQUE;
    renderResources.alphaOptions.alphaMode = AlphaMode.OPAQUE;

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "ALPHA_MODE_OPAQUE",
    ]);
    expect(renderResources.uniformMap).toEqual({});
    expect(renderResources.renderStateOptions.blending).toEqual(
      BlendingState.DISABLED
    );
  });

  it("handles alphaMode = MASK", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: {},
    };
    const cutoff = 0.6;
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
    renderResources.alphaOptions.alphaCutoff = cutoff;
    renderResources.alphaOptions.alphaMode = AlphaMode.MASK;

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "ALPHA_MODE_MASK",
    ]);

    expect(shaderBuilder._fragmentShaderParts.uniformLines).toEqual([
      "uniform float u_alphaCutoff;",
    ]);

    expect(renderResources.uniformMap.u_alphaCutoff()).toBe(cutoff);
    expect(renderResources.renderStateOptions.blending).toEqual(
      BlendingState.ALPHA_BLEND
    );
  });

  it("handles alphaMode = BLEND", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: {},
    };
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
    renderResources.alphaOptions.alphaMode = AlphaMode.BLEND;

    AlphaPipelineStage.process(renderResources, mockPrimitive, mockFrameState);

    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "ALPHA_MODE_BLEND",
    ]);
    expect(renderResources.uniformMap).toEqual({});
    expect(renderResources.renderStateOptions.blending).toEqual(
      BlendingState.ALPHA_BLEND
    );
  });
});
