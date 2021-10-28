import {
  AlphaPipelineStage,
  CustomShader,
  CustomShaderMode,
  FeatureIdPipelineStage,
  DequantizationPipelineStage,
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  PickingPipelineStage,
  VertexAttributeSemantic,
  BatchTexturePipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  var mockPrimitive = {
    featureIdAttributes: [],
    featureIdTextures: [],
    attributes: [],
  };
  var mockNode = {};
  var mockModel = {
    allowPicking: true,
    featureIdAttributeIndex: 0,
  };

  var emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 position) {}";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";

  function verifyExpectedStages(stages, expectedStages) {
    expect(stages.length, expectedStages.stages);
    for (var i = 0; i < stages.length; i++) {
      expect(expectedStages[i].name).toEqual(stages[i].name);
    }
  }

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: undefined,
        node: mockNode,
        model: mockModel,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined node", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: mockPrimitive,
        node: undefined,
        model: mockModel,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: mockPrimitive,
        node: mockNode,
        model: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: mockModel,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
    expect(primitive.node).toBe(mockNode);
    expect(primitive.model).toBe(mockModel);
  });

  it("configures the pipeline stages for model picking", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: mockModel,
    });

    var expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);

    primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        allowPicking: false,
        content: {},
      },
    });

    expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for instance feature picking", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: {
        instances: {
          featureIdAttributes: [{}],
        },
      },
      model: mockModel,
    });

    var expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      FeatureIdPipelineStage,
      BatchTexturePipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for feature picking", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [{}, {}],
        featureIdTextures: [],
        attributes: [
          {
            semantic: VertexAttributeSemantic.FEATURE_ID,
          },
        ],
      },
      node: {},
      model: {
        allowPicking: true,
        featureIdAttributeIndex: 1,
        content: {},
      },
    });

    var expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      FeatureIdPipelineStage,
      BatchTexturePipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);

    primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [{}, {}],
        attributes: [],
      },
      node: {},
      model: {
        allowPicking: true,
        featureIdTextureIndex: 1,
        content: {},
      },
    });

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures dequantization", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [],
        attributes: [
          {
            semantic: "POSITION",
          },
          {
            semantic: "NORMAL",
            quantization: {},
          },
        ],
      },
      node: mockNode,
      model: mockModel,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      DequantizationPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ]);
  });

  it("configures the pipeline stages for custom shaders", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        content: {},
        customShader: new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    var expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("disables the material stage if the custom shader mode is REPLACE_MATERIAL", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        content: {},
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    var expectedStages = [
      GeometryPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not disable the material stage if the custom shader has no fragment shader", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        content: {},
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
        }),
        allowPicking: false,
      },
    });

    var expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });
});
