import {
  AlphaPipelineStage,
  BatchTexturePipelineStage,
  CustomShader,
  CustomShaderMode,
  CustomShaderPipelineStage,
  FeatureIdPipelineStage,
  CPUStylingPipelineStage,
  DequantizationPipelineStage,
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  MetadataPipelineStage,
  ModelExperimentalPrimitive,
  ModelExperimentalType,
  MorphTargetsPipelineStage,
  PickingPipelineStage,
  PointCloudAttenuationPipelineStage,
  PointCloudShading,
  PrimitiveType,
  SceneMode,
  SceneMode2DPipelineStage,
  SelectedFeatureIdPipelineStage,
  SkinningPipelineStage,
  VertexAttributeSemantic,
  WireframePipelineStage,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  const mockPrimitive = {
    featureIds: [],
    attributes: [],
  };
  const mockNode = {};
  const mockModel = {
    type: ModelExperimentalType.GLTF,
    allowPicking: true,
    featureIdLabel: "featureId_0",
  };
  const mockFrameState = {
    context: {
      webgl2: false,
    },
    mode: SceneMode.SCENE3D,
  };

  const mockFrameStateWebgl2 = {
    context: {
      webgl2: true,
    },
  };

  const mockFrameState2D = {
    context: {
      webgl2: false,
    },
    mode: SceneMode.SCENE2D,
  };

  const mockFrameState3DOnly = {
    context: {
      webgl2: false,
    },
    mode: SceneMode.SCENE3D,
    scene3DOnly: true,
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for instance feature picking", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      node: {
        instances: {
          featureIds: [
            {
              label: "defaultIds",
              positionalLabel: "instanceFeatureId_0",
            },
            {
              propertyTableId: 0,
              positionalLabel: "instanceFeatureId_1",
            },
          ],
        },
      },
      model: {
        type: ModelExperimentalType.GLTF,
        allowPicking: true,
        instanceFeatureIdLabel: "instanceFeatureId_1",
        content: {},
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      SelectedFeatureIdPipelineStage,
      BatchTexturePipelineStage,
      CPUStylingPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for feature picking", function () {
    let primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [
          {
            label: "defaultIds",
            positionalLabel: "featureId_0",
          },
          {
            propertyTableId: 0,
            label: "pickingIds",
          },
        ],
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
        featureIdLabel: "pickingIds",
        content: {},
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      SelectedFeatureIdPipelineStage,
      BatchTexturePipelineStage,
      CPUStylingPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);

    primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [
          { positionalLabel: "featureId_0" },
          { propertyTableId: 0, positionalLabel: "featureId_1" },
        ],
        attributes: [],
      },
      node: {},
      model: {
        type: ModelExperimentalType.GLTF,
        allowPicking: true,
        featureIdLabel: "featureId_1",
        content: {},
      },
    });

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures dequantization", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
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

    primitive.configurePipeline(mockFrameState);
    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      DequantizationPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      CustomShaderPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures point cloud attenuation stage for 3D Tiles point clouds", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: true,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.TILE_PNTS,
        featureIdLabel: "featureId_0",
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
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures point cloud attenuation stage for point clouds", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: true,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
        pointCloudShading: pointCloudShading,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      PointCloudAttenuationPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("skips point cloud attenuation if attenuation is false", function () {
    const pointCloudShading = new PointCloudShading({
      attenuation: false,
    });
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
        pointCloudShading: pointCloudShading,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("skips point cloud attenuation if point cloud shading is not set", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
        pointCloudShading: undefined,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for morph targets", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        morphTargets: [{}],
        morphWeights: [0.0],
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MorphTargetsPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures the pipeline stages for skinning", function () {
    const mockSkin = {
      index: 0,
      inverseBindMatrices: [],
      joints: [],
    };

    const mockNode = {
      skin: mockSkin,
    };

    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
        pointCloudShading: undefined,
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      SkinningPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures pipeline for debugWireframe (WebGL 1)", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        debugWireframe: true,
        _enableDebugWireframe: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      WireframePipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not include wireframe stage if model.enableDebugWireframe is false (WebGL 1)", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        debugWireframe: true,
        _enableDebugWireframe: false,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures pipeline for debugWireframe (WebGL 2)", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        debugWireframe: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      WireframePipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameStateWebgl2);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not include wireframe stage for non-triangle primitives", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.POINTS,
      },
      node: mockNode,
      model: {
        debugWireframe: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameStateWebgl2);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("configures pipeline for projectTo2D", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        _projectTo2D: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      SceneMode2DPipelineStage,
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState2D);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not add scenemode 2D stage if scene is 3D", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        _projectTo2D: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });

  it("does not add scenemode 2D stage if scene is 3D only", function () {
    const primitive = new ModelExperimentalPrimitive({
      primitive: {
        featureIds: [],
        featureIdTextures: [],
        attributes: [],
        primitiveType: PrimitiveType.TRIANGLES,
      },
      node: mockNode,
      model: {
        _projectTo2D: true,
        type: ModelExperimentalType.GLTF,
        featureIdLabel: "featureId_0",
      },
    });

    const expectedStages = [
      GeometryPipelineStage,
      MaterialPipelineStage,
      FeatureIdPipelineStage,
      MetadataPipelineStage,
      LightingPipelineStage,
      AlphaPipelineStage,
    ];

    primitive.configurePipeline(mockFrameState3DOnly);
    verifyExpectedStages(primitive.pipelineStages, expectedStages);
  });
});
