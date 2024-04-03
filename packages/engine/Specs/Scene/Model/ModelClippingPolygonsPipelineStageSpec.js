import {
  Cartesian3,
  ClippingPolygon,
  ClippingPolygonCollection,
  ContextLimits,
  Model,
  ModelClippingPolygonsPipelineStage,
  ShaderBuilder,
  _shadersModelClippingPolygonsStageFS,
  _shadersModelClippingPolygonsStageVS,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import createContext from "../../../../../Specs/createContext.js";

describe("Scene/Model/ModelClippingPolygonsPipelineStage", function () {
  const positions = Cartesian3.fromRadiansArray([
    -1.3194369277314022,
    0.6988062530900625,
    -1.31941,
    0.69879,
    -1.3193931220959367,
    0.698743632490865,
  ]);
  let polygon, clippingPolygons, context, model;

  beforeEach(function () {
    polygon = new ClippingPolygon({ positions });
    clippingPolygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });
    clippingPolygons._clippingPolygonsTexture = {
      width: 1,
      height: 1,
    };

    model = new Model({
      loader: {},
      resource: {},
    });

    context = createContext();
    // Set this to the minimum possible value so texture sizes can be consistently tested
    ContextLimits._maximumTextureSize = 64;
  });

  afterEach(function () {
    context.destroyForSpecs();
  });

  it("configures the render resources for default clipping polygons", function () {
    const mockFrameState = {
      context: context,
    };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: model,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    model.clippingPolygons = clippingPolygons;
    clippingPolygons.update(mockFrameState);

    ModelClippingPolygonsPipelineStage.process(
      renderResources,
      model,
      mockFrameState
    );

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_CLIPPING_POLYGONS",
      "CLIPPING_POLYGON_REGIONS_LENGTH 1",
      "CLIPPING_EXTENTS_TEXTURE_WIDTH 1",
      "CLIPPING_EXTENTS_TEXTURE_HEIGHT 2",
    ]);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLIPPING_POLYGONS",
      "CLIPPING_POLYGON_REGIONS_LENGTH 1",
      "CLIPPING_DISTANCE_TEXTURE_WIDTH 64",
      "CLIPPING_DISTANCE_TEXTURE_HEIGHT 64",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingExtents;",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingDistance;",
    ]);

    ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
      "vec3 v_clippingPositionAndRegionIndex;",
    ]);

    const uniformMap = renderResources.uniformMap;

    expect(uniformMap.model_clippingDistance()).toBeDefined();
    expect(uniformMap.model_clippingExtents()).toBeDefined();

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      _shadersModelClippingPolygonsStageVS,
    ]);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelClippingPolygonsStageFS,
    ]);
  });

  it("configures the render resources for inverse clipping", function () {
    const mockFrameState = {
      context: context,
    };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: model,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    clippingPolygons.inverse = true;
    model.clippingPolygons = clippingPolygons;
    clippingPolygons.update(mockFrameState);

    ModelClippingPolygonsPipelineStage.process(
      renderResources,
      model,
      mockFrameState
    );

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_CLIPPING_POLYGONS",
      "CLIPPING_POLYGON_REGIONS_LENGTH 1",
      "CLIPPING_EXTENTS_TEXTURE_WIDTH 1",
      "CLIPPING_EXTENTS_TEXTURE_HEIGHT 2",
    ]);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLIPPING_POLYGONS",
      "CLIPPING_INVERSE",
      "CLIPPING_POLYGON_REGIONS_LENGTH 1",
      "CLIPPING_DISTANCE_TEXTURE_WIDTH 64",
      "CLIPPING_DISTANCE_TEXTURE_HEIGHT 64",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingExtents;",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingDistance;",
    ]);

    ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
      "vec2 v_clippingPositionAndPolygon;",
    ]);

    const uniformMap = renderResources.uniformMap;

    expect(uniformMap.model_clippingDistance()).toBeDefined();
    expect(uniformMap.model_clippingExtents()).toBeDefined();

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      _shadersModelClippingPolygonsStageVS,
    ]);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelClippingPolygonsStageFS,
    ]);
  });
});
