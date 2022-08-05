import {
  clone,
  Color,
  ColorBlendMode,
  CPUStylingPipelineStage,
  ModelAlphaOptions,
  Pass,
  ShaderBuilder,
  StyleCommandsNeeded,
  _shadersCPUStylingStageFS,
  _shadersCPUStylingStageVS,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/CPUStylingPipelineStage", function () {
  const defaultRenderResources = {
    alphaOptions: new ModelAlphaOptions(),
    model: {
      colorBlendMode: ColorBlendMode.HIGHLIGHT,
      colorBlendAmount: 0.5,
      featureTableId: 0,
      featureTables: [
        {
          featuresLength: 10,
          batchTexture: {
            translucentFeaturesLength: 0,
          },
        },
      ],
    },
    shaderBuilder: new ShaderBuilder(),
    uniformMap: {},
  };

  it("adds shader functions", function () {
    const renderResources = clone(defaultRenderResources, true);
    const shaderBuilder = renderResources.shaderBuilder;

    CPUStylingPipelineStage.process(renderResources);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersCPUStylingStageFS,
    ]);
    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      _shadersCPUStylingStageVS,
    ]);
  });

  it("adds color blend uniform", function () {
    const renderResources = clone(defaultRenderResources, true);
    renderResources.model.colorBlendAmount = 0.75;
    renderResources.model.colorBlendMode = ColorBlendMode.MIX;
    const colorBlend = ColorBlendMode.getColorBlend(
      renderResources.model.colorBlendMode,
      renderResources.model.colorBlendAmount
    );

    CPUStylingPipelineStage.process(renderResources);

    const shaderBuilder = renderResources.shaderBuilder;
    const uniformMap = renderResources.uniformMap;

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform bool model_commandTranslucent;",
      "uniform float model_colorBlend;",
    ]);

    expect(uniformMap.model_colorBlend()).toEqual(colorBlend);
    expect(uniformMap.model_commandTranslucent()).toBe(false);
  });

  it("doesn't add color blend uniform if model color is present", function () {
    const renderResources = clone(defaultRenderResources, true);
    renderResources.model.color = Color.RED;
    renderResources.model.colorBlendAmount = 0.75;
    renderResources.model.colorBlendMode = ColorBlendMode.MIX;

    CPUStylingPipelineStage.process(renderResources);

    const shaderBuilder = renderResources.shaderBuilder;
    const uniformMap = renderResources.uniformMap;

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform bool model_commandTranslucent;",
    ]);

    expect(uniformMap.model_colorBlend).toBeUndefined();
    expect(uniformMap.model_commandTranslucent()).toBe(false);
  });

  it("adds command translucent uniform", function () {
    const renderResources = clone(defaultRenderResources, true);
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;

    CPUStylingPipelineStage.process(renderResources);

    const shaderBuilder = renderResources.shaderBuilder;
    const uniformMap = renderResources.uniformMap;

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform bool model_commandTranslucent;",
      "uniform float model_colorBlend;",
    ]);

    expect(uniformMap.model_commandTranslucent()).toEqual(true);
  });

  it("model_commandTranslucent accounts for changes from later pipeline stages", function () {
    const renderResources = clone(defaultRenderResources, true);
    renderResources.model.color = Color.RED;
    renderResources.model.colorBlendAmount = 0.75;
    renderResources.model.colorBlendMode = ColorBlendMode.MIX;

    CPUStylingPipelineStage.process(renderResources);

    const uniformMap = renderResources.uniformMap;

    expect(uniformMap.model_commandTranslucent()).toBe(false);

    // Simulate applying a custom shader with isTranslucent = true;
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;

    expect(uniformMap.model_commandTranslucent()).toBe(true);
  });

  it("sets the style commands needed when only opaque commands are needed", function () {
    const renderResources = clone(defaultRenderResources, true);
    const batchTexture = {
      translucentFeaturesLength: 0,
      featuresLength: 10,
    };
    renderResources.model.featureTables[0].batchTexture = batchTexture;

    CPUStylingPipelineStage.process(renderResources);

    expect(renderResources.styleCommandsNeeded).toEqual(
      StyleCommandsNeeded.ALL_OPAQUE
    );
  });

  it("sets the style commands needed when only translucent commands are needed", function () {
    const renderResources = clone(defaultRenderResources, true);
    const batchTexture = {
      translucentFeaturesLength: 10,
    };
    renderResources.model.featureTables[0].batchTexture = batchTexture;

    CPUStylingPipelineStage.process(renderResources);

    expect(renderResources.styleCommandsNeeded).toEqual(
      StyleCommandsNeeded.ALL_TRANSLUCENT
    );
    expect(renderResources.alphaOptions.pass).toEqual(Pass.TRANSLUCENT);
  });

  it("sets the style commands needed when both opaque and translucent commands are needed", function () {
    const renderResources = clone(defaultRenderResources, true);
    const batchTexture = {
      translucentFeaturesLength: 5,
    };
    renderResources.model.featureTables[0].batchTexture = batchTexture;

    CPUStylingPipelineStage.process(renderResources);

    expect(renderResources.styleCommandsNeeded).toEqual(
      StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
    );
    expect(renderResources.alphaOptions.pass).toBeUndefined();
  });
});
