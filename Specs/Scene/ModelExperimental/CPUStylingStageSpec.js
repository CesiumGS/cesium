import {
  Color,
  ColorBlendMode,
  CPUStylingStage,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";

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
      _hasStyle: true,
    };
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
    };

    var frameState = scene.frameState;
    CPUStylingStage.process(renderResources, mockModel, frameState);

    var fragmentDefineLines =
      renderResources.shaderBuilder._fragmentShaderParts.defineLines;

    expect(fragmentDefineLines[0]).toEqual("USE_CPU_STYLING");
    expect(fragmentDefineLines[1]).toEqual("USE_FEATURE_STYLING");
  });

  it("sets the define if model has color", function () {
    var mockModel = {
      _hasStyle: false,
      _color: Color.RED,
      _colorBlendMode: ColorBlendMode.REPLACE,
      _colorBlendAmount: 0.25,
    };
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
    };

    var frameState = scene.frameState;
    CPUStylingStage.process(renderResources, mockModel, frameState);

    var fragmentDefineLines =
      renderResources.shaderBuilder._fragmentShaderParts.defineLines;
    var fragmentUniformLines =
      renderResources.shaderBuilder._fragmentShaderParts.uniformLines;

    expect(fragmentDefineLines[0]).toEqual("USE_CPU_STYLING");
    expect(fragmentUniformLines[0]).toEqual("uniform vec4 model_color;");
    expect(fragmentUniformLines[1]).toEqual("uniform float model_colorBlend;");

    var uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_color()).toEqual(mockModel._color);
    expect(uniformMap.model_colorBlend()).toEqual(
      ColorBlendMode.getColorBlend(
        mockModel._colorBlendMode,
        mockModel._colorBlendAmount
      )
    );
  });
});
