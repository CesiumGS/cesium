import {
  Color,
  ColorBlendMode,
  CPUStylingStage,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/CPUStylingStage", function () {
  var scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("sets the feature styling define if model has style", function () {
    var mockModel = {
      color: Color.RED,
      colorBlendMode: ColorBlendMode.REPLACE,
      colorBlendAmount: 0.25,
    };

    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      model: mockModel,
      uniformMap: {},
    };

    CPUStylingStage.process(renderResources);

    var shaderBuilder = renderResources.shaderBuilder;
    expect(
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "USE_CPU_STYLING",
      ])
    );
    expect(
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "USE_CPU_STYLING",
        "USE_FEATURE_STYLING",
      ])
    );
  });
});
