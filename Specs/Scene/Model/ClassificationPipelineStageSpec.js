import {
  ClassificationPipelineStage,
  PrimitiveType,
  RuntimeError,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/ClassificationPipelineStage", function () {
  const mockFrameState = {};

  function generateFeatureIds(batchLengths) {
    // Generates contiguous feature IDs based on the desired output
    // batch lengths.
    const featureIds = [];
    const length = batchLengths.length;
    for (let id = 0; id < length; id++) {
      const batchLength = batchLengths[id];
      const batch = new Array(batchLength);
      batch.fill(id);
      featureIds.push.apply(featureIds, batch);
    }

    return featureIds;
  }

  function mockPrimitive(featureIds, indices) {
    const positionAttribute = {
      semantic: VertexAttributeSemantic.POSITION,
      count: featureIds.length,
    };

    const featureIdAttribute = {
      semantic: VertexAttributeSemantic.FEATURE_ID,
      setIndex: 0,
      typedArray: featureIds,
      count: featureIds.length,
    };

    const primitive = {
      primitiveType: PrimitiveType.TRIANGLES,
      attributes: [positionAttribute, featureIdAttribute],
      indices: indices,
    };

    return primitive;
  }

  function mockRenderResources(primitive) {
    return {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: {},
      primitive: primitive,
      runtimePrimitive: {
        batchLengths: undefined,
        batchOffsets: undefined,
      },
    };
  }

  it("throws for primitive with no position attribute", function () {
    const inputBatchLengths = [6];
    const featureIds = generateFeatureIds(inputBatchLengths);

    const primitive = mockPrimitive(featureIds);
    const positionAttribute = primitive.attributes[0];
    positionAttribute.semantic = VertexAttributeSemantic.NORMAL;
    const renderResources = mockRenderResources(primitive);

    expect(function () {
      ClassificationPipelineStage.process(
        renderResources,
        primitive,
        mockFrameState
      );
    }).toThrowError(RuntimeError);
  });

  it("adds classification define to the shader", function () {
    const inputBatchLengths = [6];
    const featureIds = generateFeatureIds(inputBatchLengths);
    const primitive = mockPrimitive(featureIds);
    const renderResources = mockRenderResources(primitive);

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const shaderBuilder = renderResources.shaderBuilder;
    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_CLASSIFICATION",
    ]);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLASSIFICATION",
    ]);
  });

  it("computes single batch for primitive without feature IDs", function () {
    const inputBatchLengths = [6];
    const featureIds = generateFeatureIds(inputBatchLengths);
    const primitive = mockPrimitive(featureIds);
    primitive.attributes.length = 1; // Removes the feature ID attribute.
    const renderResources = mockRenderResources(primitive);

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const runtimePrimitive = renderResources.runtimePrimitive;
    const batchLengths = runtimePrimitive.batchLengths;
    const batchOffsets = runtimePrimitive.batchOffsets;

    expect(batchLengths).toEqual(inputBatchLengths);
    expect(batchOffsets).toEqual([0]);
  });

  it("computes single batch for primitive with feature IDs", function () {
    const inputBatchLengths = [6];
    const featureIds = generateFeatureIds(inputBatchLengths);
    const primitive = mockPrimitive(featureIds);
    const renderResources = mockRenderResources(primitive);

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const runtimePrimitive = renderResources.runtimePrimitive;
    const batchLengths = runtimePrimitive.batchLengths;
    const batchOffsets = runtimePrimitive.batchOffsets;

    expect(batchLengths).toEqual(inputBatchLengths);
    expect(batchOffsets).toEqual([0]);
  });

  it("computes multiple batches for primitive with feature IDs", function () {
    const inputBatchLengths = [6, 3, 9, 12];
    const featureIds = generateFeatureIds(inputBatchLengths);
    const primitive = mockPrimitive(featureIds);
    const renderResources = mockRenderResources(primitive);

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const runtimePrimitive = renderResources.runtimePrimitive;
    const batchLengths = runtimePrimitive.batchLengths;
    const batchOffsets = runtimePrimitive.batchOffsets;

    expect(batchLengths).toEqual(inputBatchLengths);
    expect(batchOffsets).toEqual([0, 6, 9, 18]);
  });

  it("computes multiple batches for primitive with feature IDs and indices", function () {
    // The feature IDs are intentionally scrambled to demonstrate that only
    // the indices that correspond to the same feature ID need to be contiguous.
    const featureIds = [2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 2];
    const indices = {
      // prettier-ignore
      typedArray: [
        2, 3, 8, 2, 8, 9,  // Two triangles with feature ID 0
        1, 4, 7,           // One triangle with feature ID 1
        0, 5, 6, 0, 6, 10  // Two triangles with feature ID 2
      ],
      count: 15,
    };

    const primitive = mockPrimitive(featureIds, indices);
    const renderResources = mockRenderResources(primitive);

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const runtimePrimitive = renderResources.runtimePrimitive;
    const batchLengths = runtimePrimitive.batchLengths;
    const batchOffsets = runtimePrimitive.batchOffsets;

    expect(batchLengths).toEqual([6, 3, 6]);
    expect(batchOffsets).toEqual([0, 6, 9]);
  });

  it("doesn't recompute batches for primitive if they are already defined", function () {
    const inputBatchLengths = [6];
    const featureIds = generateFeatureIds(inputBatchLengths);
    const primitive = mockPrimitive(featureIds);
    const renderResources = mockRenderResources(primitive);

    const runtimePrimitive = renderResources.runtimePrimitive;
    runtimePrimitive.batchLengths = [];
    runtimePrimitive.batchOffsets = [];

    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const batchLengths = runtimePrimitive.batchLengths;
    const batchOffsets = runtimePrimitive.batchOffsets;

    expect(batchLengths).toEqual([]);
    expect(batchOffsets).toEqual([]);
  });
});
