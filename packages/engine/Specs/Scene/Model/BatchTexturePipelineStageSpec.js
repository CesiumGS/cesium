import {
  BatchTexturePipelineStage,
  ShaderBuilder,
} from "../../index.js";;
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/BatchTexturePipelineStage", function () {
  function expectUniformMap(uniformMap, expected) {
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const expectedValue = expected[key];
        const uniformFunction = uniformMap[key];
        expect(uniformFunction).toBeDefined();
        expect(uniformFunction()).toEqual(expectedValue);
      }
    }
  }

  function verifyBatchTextureUniforms(featureTable, uniformMap) {
    const expectedUniforms = {
      model_featuresLength: featureTable.featuresLength,
      model_batchTexture: featureTable.batchTexture.batchTexture,
      model_textureDimensions: featureTable.batchTexture.textureDimensions,
      model_textureStep: featureTable.batchTexture.textureStep,
    };

    expectUniformMap(uniformMap, expectedUniforms);
  }

  function verifyBatchTextureShaders(shaderBuilder) {
    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "MULTILINE_BATCH_TEXTURE",
    ]);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "MULTILINE_BATCH_TEXTURE",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform int model_featuresLength;",
      "uniform sampler2D model_batchTexture;",
      "uniform vec4 model_textureStep;",
      "uniform vec2 model_textureDimensions;",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform int model_featuresLength;",
      "uniform sampler2D model_batchTexture;",
      "uniform vec4 model_textureStep;",
      "uniform vec2 model_textureDimensions;",
    ]);
  }

  it("sets up batch textures from Model", function () {
    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureTableId: 0,
        featureTables: [
          {
            featuresLength: 10,
            batchTexture: {
              batchTexture: 0,
              textureDimensions: {
                y: 2,
              },
              textureStep: 2,
            },
          },
        ],
      },
    };

    BatchTexturePipelineStage.process(renderResources, {}, {});
    verifyBatchTextureShaders(renderResources.shaderBuilder);
    verifyBatchTextureUniforms(
      renderResources.model.featureTables[0],
      renderResources.uniformMap
    );
  });
});
