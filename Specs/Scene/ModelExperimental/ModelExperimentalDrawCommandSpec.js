import {
  DrawCommand,
  ModelExperimentalDrawCommand,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalDrawCommands", function () {
  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        primitiveRenderResources: undefined,
        command: new DrawCommand(),
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined command", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        primitiveRenderResources: {},
        command: undefined,
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
