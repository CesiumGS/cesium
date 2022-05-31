import {
  DrawCommand,
  ModelExperimentalDrawCommand,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalDrawCommands", function () {
  it("throws for undefined command", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        command: undefined,
        primitiveRenderResources: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        command: new DrawCommand(),
        primitiveRenderResources: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const mockRenderResources = {};
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: mockRenderResources,
      command: new DrawCommand(),
    });
  });
});
