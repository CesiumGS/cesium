import {
  AlphaMode,
  AlphaPipelineStage,
  BlendingState,
  ModelAlphaOptions,
  Pass,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/AlphaPipelineStage", function () {
  var mockModel = {
    opaquePass: Pass.CESIUM_3D_TILE,
  };
  var mockPrimitive = {};
  var mockFrameState = {};

  it("Defaults to the model's pass if not specified", function () {
    var renderResources = {
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
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
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
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
      renderStateOptions: {},
    };
    var cutoff = 0.6;
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
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
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
