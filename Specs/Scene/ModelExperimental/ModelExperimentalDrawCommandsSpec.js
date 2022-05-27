import {
  DrawCommand,
  ModelExperimentalDrawCommands,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalDrawCommands", function () {
  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ModelExperimentalDrawCommands({
        primitiveRenderResources: undefined,
        command: new DrawCommand(),
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined command", function () {
    expect(function () {
      return new ModelExperimentalDrawCommands({
        primitiveRenderResources: {},
        command: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const mockRenderResources = {};
    const drawCommands = new ModelExperimentalDrawCommands({
      primitiveRenderResources: mockRenderResources,
      command: new DrawCommand(),
    });
  });
});
