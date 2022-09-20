import {
  Cartesian3,
  ClippingPlane,
  ClippingPlaneCollection,
  Color,
  Matrix4,
  ModelClippingPlanesPipelineStage,
  ShaderBuilder,
  _shadersModelClippingPlanesStageFS,
} from "../../index.js";;
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/ModelClippingPlanesPipelineStage", function () {
  let plane;
  let clippingPlanes;

  beforeEach(function () {
    plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
    clippingPlanes = new ClippingPlaneCollection({
      planes: [plane],
    });
    clippingPlanes._clippingPlanesTexture = {
      width: 1,
      height: 1,
    };
  });

  it("configures the render resources for default clipping planes", function () {
    const mockFrameState = {
      context: {},
    };

    const mockModel = {
      clippingPlanes: clippingPlanes,
      _clippingPlanesMatrix: Matrix4.clone(Matrix4.IDENTITY),
    };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    ModelClippingPlanesPipelineStage.process(
      renderResources,
      mockModel,
      mockFrameState
    );

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLIPPING_PLANES",
      "CLIPPING_PLANES_LENGTH 1",
      "CLIPPING_PLANES_TEXTURE_WIDTH 1",
      "CLIPPING_PLANES_TEXTURE_HEIGHT 1",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingPlanes;",
      "uniform vec4 model_clippingPlanesEdgeStyle;",
      "uniform mat4 model_clippingPlanesMatrix;",
    ]);

    const uniformMap = renderResources.uniformMap;

    expect(uniformMap.model_clippingPlanes()).toBeDefined();

    const edgeColor = clippingPlanes.edgeColor;
    const expectedStyle = new Color(
      edgeColor.r,
      edgeColor.g,
      edgeColor.b,
      clippingPlanes.edgeWidth
    );
    expect(
      Color.equals(uniformMap.model_clippingPlanesEdgeStyle(), expectedStyle)
    ).toBe(true);

    expect(
      Matrix4.equals(
        uniformMap.model_clippingPlanesMatrix(),
        mockModel._clippingPlanesMatrix
      )
    ).toBe(true);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelClippingPlanesStageFS,
    ]);
  });

  it("configures the render resources for unioned clipping planes", function () {
    const mockFrameState = {
      context: {},
    };
    const mockModel = {
      clippingPlanes: clippingPlanes,
      _clippingPlanesMatrix: Matrix4.clone(Matrix4.IDENTITY),
    };

    clippingPlanes.unionClippingRegions = true;

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    ModelClippingPlanesPipelineStage.process(
      renderResources,
      mockModel,
      mockFrameState
    );

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLIPPING_PLANES",
      "CLIPPING_PLANES_LENGTH 1",
      "UNION_CLIPPING_REGIONS",
      "CLIPPING_PLANES_TEXTURE_WIDTH 1",
      "CLIPPING_PLANES_TEXTURE_HEIGHT 1",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingPlanes;",
      "uniform vec4 model_clippingPlanesEdgeStyle;",
      "uniform mat4 model_clippingPlanesMatrix;",
    ]);
  });

  it("configures the render resources for float texture clipping planes", function () {
    const mockFrameState = {
      context: {
        floatingPointTexture: true,
      },
    };
    const mockModel = {
      clippingPlanes: clippingPlanes,
      _clippingPlanesMatrix: Matrix4.clone(Matrix4.IDENTITY),
    };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    ModelClippingPlanesPipelineStage.process(
      renderResources,
      mockModel,
      mockFrameState
    );

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CLIPPING_PLANES",
      "CLIPPING_PLANES_LENGTH 1",
      "USE_CLIPPING_PLANES_FLOAT_TEXTURE",
      "CLIPPING_PLANES_TEXTURE_WIDTH 1",
      "CLIPPING_PLANES_TEXTURE_HEIGHT 1",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform sampler2D model_clippingPlanes;",
      "uniform vec4 model_clippingPlanesEdgeStyle;",
      "uniform mat4 model_clippingPlanesMatrix;",
    ]);
  });
});
