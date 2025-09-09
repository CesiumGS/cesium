import EdgeDetectionStageFS from "../../Shaders/Model/EdgeDetectionStageFS.js";

/**
 * A pipeline stage for edge visibility control and feature ID matching.
 * This stage adds shader code to control when edges are displayed by comparing
 * fragment depth with globe depth texture and matching feature IDs between edges
 * and underlying geometry.
 *
 * @namespace EdgeDetectionPipelineStage
 *
 * @private
 */
const EdgeDetectionPipelineStage = {
  name: "EdgeDetectionPipelineStage",
};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *  <li>Adds shader code to read from edge color and ID textures</li>
 *  <li>Implements edge visibility control based on depth and feature ID comparison</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @private
 */
EdgeDetectionPipelineStage.process = function (renderResources) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addFragmentLines([EdgeDetectionStageFS]);
};

export default EdgeDetectionPipelineStage;
