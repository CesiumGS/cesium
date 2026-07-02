import {
  Cartesian3,
  ClippingPlane,
  ClippingPlaneCollection,
  Color,
  Matrix4,
  ModelClippingPlanesPipelineStage,
  ShaderBuilder,
  _shadersModelClippingPlanesStageFS,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

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
      context: {
        uniformState: { inverseView3D: Matrix4.IDENTITY },
      },
    };

    const mockModel = {
      clippingPlanes: clippingPlanes,
      modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
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
      mockFrameState,
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
      clippingPlanes.edgeWidth,
    );
    expect(
      Color.equals(uniformMap.model_clippingPlanesEdgeStyle(), expectedStyle),
    ).toBe(true);

    // inverseView3D and the cached _clippingPlanesMatrix are both IDENTITY,
    // so transpose(I) × I = IDENTITY.
    expect(
      Matrix4.equals(uniformMap.model_clippingPlanesMatrix(), Matrix4.IDENTITY),
    ).toBe(true);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelClippingPlanesStageFS,
    ]);
  });

  it("model_clippingPlanesMatrix equals the unfactored inverseTranspose(view * reference * clipping)", function () {
    // Non-identity view, reference and clipping matrices to exercise the
    // factorization transpose(inverseView3D) * inverseTranspose(reference * clipping).
    const view = Matrix4.fromTranslation(new Cartesian3(2.0, -3.0, 5.0));
    const referenceMatrix = Matrix4.fromTranslation(
      new Cartesian3(7.0, 1.0, -4.0),
    );
    const clippingMatrix = Matrix4.fromTranslation(
      new Cartesian3(-1.0, 6.0, 2.0),
    );

    // inverseView3D is the inverse of the active view, as maintained on UniformState.
    const inverseView3D = Matrix4.inverseTransformation(view, new Matrix4());

    // The view-independent part cached in Model.updateReferenceMatrices.
    const referenceTimesClipping = Matrix4.multiply(
      referenceMatrix,
      clippingMatrix,
      new Matrix4(),
    );
    const clippingPlanesMatrix = Matrix4.inverseTranspose(
      referenceTimesClipping,
      new Matrix4(),
    );

    const mockFrameState = {
      context: {
        uniformState: { inverseView3D: inverseView3D },
      },
    };
    const mockModel = {
      clippingPlanes: clippingPlanes,
      modelMatrix: referenceMatrix,
      _clippingPlanesMatrix: clippingPlanesMatrix,
    };
    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };

    ModelClippingPlanesPipelineStage.process(
      renderResources,
      mockModel,
      mockFrameState,
    );

    // Expected value from the original, unfactored computation.
    const expected = Matrix4.inverseTranspose(
      Matrix4.multiply(view, referenceTimesClipping, new Matrix4()),
      new Matrix4(),
    );

    const actual = renderResources.uniformMap.model_clippingPlanesMatrix();
    expect(Matrix4.equalsEpsilon(actual, expected, 1e-10)).toBe(true);
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
      mockFrameState,
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
      mockFrameState,
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
