import {
  Cartesian2,
  ShaderBuilder,
  StencilConstants,
  TilesetPipelineStage,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/TilesetPipelineStage", function () {
  const mockFrameState = {};

  function mockRenderResources() {
    return {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: {
        hasSkipLevelOfDetail: function () {
          return false;
        },
      },
      renderStateOptions: {},
    };
  }

  it("configures the render resources for skipping level of detail", function () {
    const renderResources = mockRenderResources();
    const model = renderResources.model;
    model.hasSkipLevelOfDetail = function () {
      return true;
    };
    TilesetPipelineStage.process(renderResources, model, mockFrameState);

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
    TilesetPipelineStage.process(renderResources, model, mockFrameState);

    const renderStateOptions = renderResources.renderStateOptions;
    expect(renderStateOptions.stencilTest).toEqual(
      StencilConstants.setCesium3DTileBit()
    );
    expect(renderStateOptions.stencilMask).toEqual(
      StencilConstants.CESIUM_3D_TILE_MASK
    );
  });
});
