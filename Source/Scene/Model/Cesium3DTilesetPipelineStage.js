import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import StencilConstants from "../StencilConstants.js";

/**
 * The tileset pipeline stage is responsible for updating the model with behavior
 * specific to 3D Tiles.
 *
 * @namespace Cesium3DTilesetPipelineStage
 *
 * @private
 */
const Cesium3DTilesetPipelineStage = {};
Cesium3DTilesetPipelineStage.name = "Cesium3DTilesetPipelineStage"; // Helps with debugging

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model uses polygon offset for the skipLevelOfDetail optimization</li>
 *  <li>adds a function to the uniform map to supply polygon offset values for the skipLevelOfDetail optimization</li>
 *  <li>sets stencil values that enable classification on 3D Tiles</li>
 * </ul>
 *
 * <p>
 * See {@link ModelDrawCommand} for the corresponding skipLevelOfDetail derived commands.
 * </p>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {ModelExperimental} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
Cesium3DTilesetPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  if (model.hasSkipLevelOfDetail(frameState)) {
    // Make the log-depth depth fragment write account for the polygon offset, too.
    // Otherwise, the back face commands will cause the higher resolution
    // tiles to disappear.
    const shaderBuilder = renderResources.shaderBuilder;
    shaderBuilder.addDefine(
      "POLYGON_OFFSET",
      undefined,
      ShaderDestination.FRAGMENT
    );

    // This value will be overriden by the depth-only back face derived command.
    // We just prepare it in advance so we don't have to recompile the shader.
    const uniformMap = {
      u_polygonOffset: function () {
        return Cartesian2.ZERO;
      },
    };

    renderResources.uniformMap = combine(
      uniformMap,
      renderResources.uniformMap
    );
    renderResources.hasSkipLevelOfDetail = true;
  }

  // Set stencil values for classification on 3D Tiles. This is applied to all
  // of the derived commands, not just the back-face derived command.
  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.stencilTest = StencilConstants.setCesium3DTileBit();
  renderStateOptions.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
};

export default Cesium3DTilesetPipelineStage;
