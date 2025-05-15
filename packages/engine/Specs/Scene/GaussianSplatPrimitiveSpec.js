import Cartesian3 from "../../Source/Core/Cartesian3.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import BoundingSphere from "../../Source/Core/BoundingSphere.js";
import GaussianSplatPrimitive from "../../Source/Scene/GaussianSplatPrimitive.js";
import GaussianSplatRenderResources from "../../Source/Scene/GaussianSplatRenderResources.js";
import BlendingState from "../../Source/Scene/BlendingState.js";
import ShaderDestination from "../../Source/Renderer/ShaderDestination.js";
import PrimitiveType from "../../Source/Core/PrimitiveType.js";
import RenderState from "../../Source/Renderer/RenderState.js";
import GeometryAttribute from "../../Source/Core/GeometryAttribute.js";
import VertexArray from "../../Source/Renderer/VertexArray.js";
import DrawCommand from "../../Source/Renderer/DrawCommand.js";

describe("Scene/GaussianSplatPrimitive", function () {
  describe("buildGSplatDrawCommand", function () {
    let primitive, frameState;

    beforeEach(function () {
      primitive = {
        _tileset: {
          modelMatrix: Matrix4.IDENTITY,
          boundingSphere: new BoundingSphere(Cartesian3.ZERO, 1.0),
        },
        splatScale: 1.0,
        gaussianSplatTexture: {},
        debugShowBoundingVolume: false,
        _numSplats: 10,
        _indexes: [0, 1, 2, 3],
        _modelMatrix: Matrix4.IDENTITY,
      };

      frameState = {
        context: {},
      };

      spyOn(
        GaussianSplatRenderResources.ShaderBuilder,
        "buildShaderProgram",
      ).and.returnValue({});
      spyOn(RenderState, "fromCache").and.returnValue({});
      spyOn(VertexArray, "fromGeometry").and.returnValue({});
    });

    it("creates a DrawCommand with correct properties", function () {
      GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);

      expect(primitive._drawCommand).toBeInstanceOf(DrawCommand);
      expect(primitive._drawCommand.boundingVolume).toBe(
        primitive._tileset.boundingSphere,
      );
      expect(primitive._drawCommand.modelMatrix).toBe(primitive._modelMatrix);
      expect(primitive._drawCommand.uniformMap.u_splatScale()).toBe(
        primitive.splatScale,
      );
      expect(primitive._drawCommand.uniformMap.u_splatAttributeTexture()).toBe(
        primitive.gaussianSplatTexture,
      );
      expect(primitive._drawCommand.primitiveType).toBe(
        PrimitiveType.TRIANGLE_STRIP,
      );
    });

    it("configures shaderBuilder with correct defines and attributes", function () {
      const shaderBuilder = new GaussianSplatRenderResources(primitive)
        .shaderBuilder;

      GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);

      expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
        "HAS_GAUSSIAN_SPLATS",
        undefined,
        ShaderDestination.BOTH,
      );
      expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
        "HAS_SPLAT_TEXTURE",
        undefined,
        ShaderDestination.BOTH,
      );
      expect(shaderBuilder.addAttribute).toHaveBeenCalledWith(
        "float",
        "a_splatIndex",
      );
    });

    it("configures renderStateOptions correctly", function () {
      const renderResources = new GaussianSplatRenderResources(primitive);

      GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);

      expect(renderResources.renderStateOptions.cull.enabled).toBe(false);
      expect(renderResources.renderStateOptions.depthMask).toBe(true);
      expect(renderResources.renderStateOptions.depthTest.enabled).toBe(true);
      expect(renderResources.renderStateOptions.blending).toBe(
        BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
      );
    });

    it("handles debugShowBoundingVolume correctly", function () {
      primitive.debugShowBoundingVolume = true;

      GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);

      const shaderBuilder = new GaussianSplatRenderResources(primitive)
        .shaderBuilder;
      expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
        "DEBUG_BOUNDING_VOLUMES",
        undefined,
        ShaderDestination.BOTH,
      );
    });

    it("creates geometry with correct attributes", function () {
      GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);

      const geometry =
        VertexArray.fromGeometry.calls.mostRecent().args[0].geometry;
      expect(geometry.attributes.screenQuadPosition).toBeInstanceOf(
        GeometryAttribute,
      );
      expect(geometry.attributes.splatIndex).toBeInstanceOf(GeometryAttribute);
      expect(geometry.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
    });
  });
});
