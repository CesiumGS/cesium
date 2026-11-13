import EdgeDetectionStageFS from "../../Shaders/Model/EdgeDetectionStageFS.js";

/**
 * Performs the screen-space edge visibility / composition pass. This stage does not
 * build edge geometry itself; that work is handled earlier by {@link EdgeVisibilityPipelineStage},
 * which extracts unique model edges and writes them during a dedicated edge render pass
 * into edge ID / color targets. The fragment logic added here then:
 * <ul>
 *  <li>Samples the edge render targets (edge color + per-edge feature ID)</li>
 *  <li>Compares per-edge feature IDs with underlying surface feature IDs to suppress
 *      edges that belong to filtered or hidden features</li>
 *  <li>Performs depth-based tests (e.g., against globe or scene depth) to discard
 *      occluded edges</li>
 * </ul>
 * In summary: EdgeVisibilityPipelineStage = generate & encode edges; this stage = decide which of
 * those encoded edges are actually visible in the final frame and composite them.
 *
 * @namespace EdgeDetectionPipelineStage
 * @private
 */
const EdgeDetectionPipelineStage = {
  name: "EdgeDetectionPipelineStage",
};

/**
 * Process a primitive by injecting the fragment shader logic that consumes the
 * intermediate edge buffers produced by the edge geometry pass. It adds code to:
 * <ul>
 *  <li>Read edge color / edge ID MRT outputs</li>
 *  <li>Apply depth & feature ID based rejection</li>
 *  <li>Emit final edge color for composition</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @private
 */
EdgeDetectionPipelineStage.process = function (renderResources) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addFragmentLines([EdgeDetectionStageFS]);
};

export default EdgeDetectionPipelineStage;
