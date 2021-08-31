import {
  AlphaPipelineStage,
  CustomShader,
  CustomShaderMode,
  CustomShaderStage,
  FeaturePipelineStage,
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  PickingPipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  var mockPrimitive = {};
  var mockModel = {
    allowPicking: true,
  };

  var emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 position) {}";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: undefined,
        model: mockModel,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: {},
        model: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
    expect(primitive.model).toBe(mockModel);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ]);

    primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        allowPicking: false,
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ]);
  });

  it("configures the pipeline stages for feature picking", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        customShader: new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: true,
        _featureTable: {},
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      CustomShaderStage,
      LightingPipelineStage,
      FeaturePipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ]);
  });

  it("configures the pipeline stages for custom shaders", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        customShader: new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      CustomShaderStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ]);
  });

  it("disables the material stage if the custom shader mode is REPLACE_MATERIAL", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      CustomShaderStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ]);
  });

  it("does not disable the material stage if the custom shader has no fragment shader", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
        }),
        allowPicking: false,
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      CustomShaderStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ]);
  });
});
