import defined from "../../Core/defined.js";

/**
 * The node statistics update stage updates memory usage statistics for
 * ModelExperimental on the node level. This counts the binary resources
 * that exist for the lifetime of the ModelExperimental (e.g. attributes
 * loaded by GltfLoader). It does not count resources that are created
 * every time the pipeline is run. The individual pipeline stages are
 * responsible for keeping track of additional memory they allocate.
 *
 * @namespace NodeStatisticsPipelineStage
 *
 * @private
 */
const NodeStatisticsPipelineStage = {};
NodeStatisticsPipelineStage.name = "NodeStatisticsPipelineStage"; // Helps with debugging

NodeStatisticsPipelineStage.process = function (
  renderResources,
  node,
  frameState
) {
  const model = renderResources.model;
  const statistics = model.statistics;
  const runtimeNode = renderResources.runtimeNode;

  countInstancingAttributes(statistics, node.instances);
  countInstancing2DBuffers(statistics, runtimeNode);
};

function countInstancingAttributes(statistics, instances) {
  if (!defined(instances)) {
    return;
  }

  const attributes = instances.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.buffer)) {
      // Packed typed arrays are not counted
      const hasCpuCopy = false;
      statistics.addBuffer(attribute.buffer, hasCpuCopy);
    }
  }
}

function countInstancing2DBuffers(statistics, runtimeNode) {
  if (defined(runtimeNode.instancingTransformsBuffer2D)) {
    // The typed array containing the computed 2D transforms
    // isn't saved after the buffer is created.
    const hasCpuCopy = false;
    statistics.addBuffer(runtimeNode.instancingTransformsBuffer2D, hasCpuCopy);
  }

  if (defined(runtimeNode.instancingTranslationBuffer2D)) {
    // The typed array containing the computed 2D translations
    // isn't saved after the buffer is created.
    const hasCpuCopy = false;
    statistics.addBuffer(runtimeNode.instancingTranslationBuffer2D, hasCpuCopy);
  }
}

// Exposed for testing
NodeStatisticsPipelineStage._countInstancingAttributes = countInstancingAttributes;
NodeStatisticsPipelineStage._countInstancing2DBuffers = countInstancing2DBuffers;

export default NodeStatisticsPipelineStage;
