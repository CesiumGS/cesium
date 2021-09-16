import {
  BatchTexturePipelineStage,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/BatchTexturePipelineStage", function () {
  function expectUniformMap(uniformMap, expected) {
    for (var key in expected) {
      if (expected.hasOwnProperty(key)) {
        var expectedValue = expected[key];
        var uniformFunction = uniformMap[key];
        expect(uniformFunction).toBeDefined();
        expect(uniformFunction()).toEqual(expectedValue);
      }
    }
  }

  function verifyBatchTextureUniforms(featureTable, uniformMap) {
    var expectedUniforms = {
      model_featuresLength: featureTable.featuresLength,
      model_batchTexture: featureTable.batchTexture.batchTexture,
      model_textureDimensions: featureTable.batchTexture.textureDimensions,
      model_textureStep: featureTable.batchTexture.textureStep,
    };

    expectUniformMap(uniformMap, expectedUniforms);
  }

  function verifyBatchTextureShaders(shaderBuilder) {
    var vertexDefineLines = shaderBuilder._vertexShaderParts.defineLines;
    var vertexUniformLines = shaderBuilder._vertexShaderParts.uniformLines;
    var fragmentUniformLines = shaderBuilder._fragmentShaderParts.uniformLines;

    expect(vertexDefineLines[0]).toEqual("MULTILINE_BATCH_TEXTURE");

    expect(vertexUniformLines[0]).toEqual(
      "uniform float model_featuresLength;"
    );
    expect(fragmentUniformLines[0]).toEqual(
      "uniform float model_featuresLength;"
    );

    expect(vertexUniformLines[1]).toEqual(
      "uniform sampler2D model_batchTexture;"
    );
    expect(vertexUniformLines[2]).toEqual("uniform vec4 model_textureStep;");
    expect(vertexUniformLines[3]).toEqual(
      "uniform vec2 model_textureDimensions;"
    );
  }

  it("sets up batch textures from ModelExperimental", function () {
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      featureTableId: "mockFeatureTable",
      model: {
        featureTables: {
          mockFeatureTable: {
            featuresLength: 10,
            batchTexture: {
              batchTexture: 0,
              textureDimensions: {
                y: 2,
              },
              textureStep: 2,
            },
          },
        },
      },
    };

    BatchTexturePipelineStage.process(renderResources, {}, {});
    verifyBatchTextureShaders(renderResources.shaderBuilder);
    verifyBatchTextureUniforms(
      renderResources.model.featureTables.mockFeatureTable,
      renderResources.uniformMap
    );
  });

  it("sets up batch textures from Cesium3DTileContent", function () {
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      featureTableId: "mockFeatureTable",
      model: {
        content: {
          featureTables: {
            mockFeatureTable: {
              featuresLength: 10,
              batchTexture: {
                batchTexture: 0,
                textureDimensions: {
                  y: 2,
                },
                textureStep: 2,
              },
            },
          },
        },
      },
    };

    BatchTexturePipelineStage.process(renderResources, {}, {});
    verifyBatchTextureShaders(renderResources.shaderBuilder);
    verifyBatchTextureUniforms(
      renderResources.model.content.featureTables.mockFeatureTable,
      renderResources.uniformMap
    );
  });
});
