import {
  AlphaPipelineStage,
  CustomShader,
  CustomShaderMode,
  CustomShaderPipelineStage,
  FeatureIdPipelineStage,
  CPUStylingPipelineStage,
  DequantizationPipelineStage,
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  ModelExperimentalType,
  PickingPipelineStage,
  PointCloudAttenuationPipelineStage,
  PointCloudShading,
  PrimitiveType,
  VertexAttributeSemantic,
  BatchTexturePipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  const mockPrimitive = {
    featureIdAttributes: [],
    featureIdTextures: [],
    attributes: [],
  };
  const mockNode = {};
  const mockModel = {
    type: ModelExperimentalType.GLTF,
    allowPicking: true,
    featureIdAttributeIndex: 0,
  };

  const emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 position) {}";
  const emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";

  function verifyExpectedStages(stages, expectedStages) {
    expect(stages.length, expectedStages.stages);
    for (let i = 0; i < stages.length; i++) {
      expect(stages[i].name).toEqual(expectedStages[i].name);
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
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: mockModel,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
    expect(primitive.node).toBe(mockNode);
    expect(primitive.model).toBe(mockModel);
  });

  it("configures the pipeline stages for model picking", function () {
    let primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: mockModel,
    });

    let expectedStages = [
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
        type: ModelExperimentalType.GLTF,
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
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: {
        instances: {
          featureIdAttributes: [{}],
        },
      },
      model: mockModel,
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      FeatureIdPipelineStage,
      BatchTexturePipelineStage,
      CPUStylingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for feature picking", function () {
    let primitive = new ModelExperimentalPrimitive({
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
        type: ModelExperimentalType.GLTF,
        allowPicking: true,
        featureIdAttributeIndex: 1,
        content: {},
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      FeatureIdPipelineStage,
      BatchTexturePipelineStage,
      CPUStylingPipelineStage,
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
        type: ModelExperimentalType.GLTF,
        allowPicking: true,
        featureIdTextureIndex: 1,
        content: {},
      },
    });

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures dequantization", function () {
    const primitive = new ModelExperimentalPrimitive({
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
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        content: {},
        customShader: new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("disables the material stage if the custom shader mode is REPLACE_MATERIAL", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        content: {},
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
        }),
        allowPicking: false,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not disable the material stage if the custom shader has no fragment shader", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        content: {},
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          vertexShaderText: emptyVertexShader,
        }),
        allowPicking: false,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures point cloud attenuation stage for 3D Tiles point clouds", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: true,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.TILE_PNTS,
        featureIdAttributeIndex: 0,
        pointCloudShading: pointCloudShading,
        content: {
          tileset: {
            pointCloudShading: pointCloudShading,
          },
        },
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      PointCloudAttenuationPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures point cloud attenuation stage for point clouds", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: true,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdAttributeIndex: 0,
        pointCloudShading: pointCloudShading,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      PointCloudAttenuationPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("skips point cloud attenuation if attenuation is false", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: false,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdAttributeIndex: 0,
        pointCloudShading: pointCloudShading,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("skips point cloud attenuation if point cloud shading is not set", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIdAttributes: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdAttributeIndex: 0,
        pointCloudShading: undefined,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });
});
