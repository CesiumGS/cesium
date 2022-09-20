import {
  DepthFunction,
  ModelRenderResources,
  RenderState,
} from "../../index.js";;
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/Model/ModelRenderResources",
  function () {
    const mockModel = {};

    it("throws for undefined model", function () {
      expect(function () {
        return new ModelRenderResources(undefined);
      }).toThrowDeveloperError();
    });

    it("constructs", function () {
      const modelResources = new ModelRenderResources(mockModel);

      const defaultRenderState = RenderState.getState(
        RenderState.fromCache({
          depthTest: {
            enabled: true,
            func: DepthFunction.LESS_OR_EQUAL,
          },
        })
      );

      expect(modelResources.model).toBe(mockModel);
      expect(modelResources.shaderBuilder).toBeDefined();
      expect(modelResources.renderStateOptions).toEqual(defaultRenderState);
      expect(modelResources.hasSilhouette).toBe(false);
      expect(modelResources.hasSkipLevelOfDetail).toBe(false);
      ShaderBuilderTester.expectHasFragmentDefines(
        modelResources.shaderBuilder,
        []
      );
    });
  },
  "WebGL"
);
