import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import StencilConstants from "../StencilConstants.js";

/**
 * The tileset pipeline stage is responsible for updating the model with 3D Tiles
 * specific behavior.
 *
 * @namespace TilesetPipelineStage
 *
 * @private
 */
const TilesetPipelineStage = {};
TilesetPipelineStage.name = "TilesetPipelineStage"; // Helps with debugging

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model uses polygon offset for the skipLevelOfDetail optimization</li>
 *  <li>adds a uniform to the fragment shader to supply polygon offset values for the skipLevelOfDetail optimization</li>
 *  <li>sets stencil values that enable classification on 3D Tiles</li>
 * </ul>
 *
 * <p>
 * See {@link ModelExperimentalDrawCommand} for the corresponding skipLevelOfDetail derived commands.
 * </p>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {ModelExperimental} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
TilesetPipelineStage.process = function (renderResources, model, frameState) {
  if (model.hasSkipLevelOfDetail(frameState)) {
    // Make the log depth depth fragment write account for the polygon offset, too.
    // Otherwise, the back face commands will cause the higher resolution
    // tiles to disappear.
    const shaderBuilder = renderResources.shaderBuilder;
    shaderBuilder.addDefine(
      "POLYGON_OFFSET",
      undefined,
      ShaderDestination.FRAGMENT
    );

    shaderBuilder.addUniform(
      "vec2",
      "u_polygonOffset",
      ShaderDestination.FRAGMENT
    );

    // The depth-only back face derived command will override the polygon offset
    // uniform value, we just prepare it in advance so we don't have to recompile
    // the shader.
    const uniformMap = {
      u_polygonOffset: function () {
        return Cartesian2.ZERO;
      },
    };

    renderResources.uniformMap = combine(
      uniformMap,
      renderResources.uniformMap
    );
  }

  // Set stencil values for classification on 3D Tiles
  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.stencilTest = StencilConstants.setCesium3DTileBit();
  renderStateOptions.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
};

export default TilesetPipelineStage;
