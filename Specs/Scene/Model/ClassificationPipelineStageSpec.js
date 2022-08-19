import {
  Cartesian2,
  ClassificationPipelineStage,
  PrimitiveType,
  ShaderBuilder,
  StencilConstants,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/ClassificationPipelineStage", function () {
  const mockFrameState = {};

  function mockPrimitive(batchLengths, indices) {
    const positionAttribute = {};

    const featureIds = [];
    for (let id = 0; id < batchLengths; id++) {
      const length = batchLengths[id];
      const batch = new Array(length);
      batch.fill(id);
      featureIds.push.apply(featureIds, batch);
    }

    const featureIdAttribute = {
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
      model: {
        _modelResources: [],
      },
      primitive: primitive,
      runtimePrimitive: {
        batchLengths: undefined,
        batchOffsets: undefined,
      },
    };
  }

  it("adds classification define to the shader", function () {
    const primitive = mockPrimitive();
    const renderResources = mockRenderResources();
    ClassificationPipelineStage.process(
      renderResources,
      primitive,
      mockFrameState
    );

    const shaderBuilder = renderResources.shaderBuilder;
    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "POLYGON_OFFSET",
    ]);

    // No uniform declarations should have been added.
    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

    const uniformMap = renderResources.uniformMap;
    expect(uniformMap.u_polygonOffset()).toEqual(Cartesian2.ZERO);

    expect(renderResources.hasSkipLevelOfDetail).toBe(true);
  });

  it("sets stencil test and mask", function () {
    const renderResources = mockRenderResources();
    const model = renderResources.model;
    ClassificationPipelineStage.process(renderResources, model, mockFrameState);

    const renderStateOptions = renderResources.renderStateOptions;
    expect(renderStateOptions.stencilTest).toEqual(
      StencilConstants.setCesium3DTileBit()
    );
    expect(renderStateOptions.stencilMask).toEqual(
      StencilConstants.CESIUM_3D_TILE_MASK
    );
  });
});
