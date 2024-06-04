import defined from "../../Core/defined.js";

/**
 * The node statistics update stage updates memory usage statistics for a Model
 * on the node level. This counts the binary resources that exist for the
 * lifetime of the Model (e.g. attributes loaded by GltfLoader). It does not
 * count resources that are created every time the pipeline is run.
 * The individual pipeline stages are responsible for keeping track of any
 * additional memory they allocate.
 *
 * @namespace NodeStatisticsPipelineStage
 *
 * @private
 */
const NodeStatisticsPipelineStage = {
  name: "NodeStatisticsPipelineStage", // Helps with debugging

  // Expose some methods for testing
  _countInstancingAttributes: countInstancingAttributes,
  _countGeneratedBuffers: countGeneratedBuffers,
};

NodeStatisticsPipelineStage.process = function (
  renderResources,
  node,
  frameState
) {
  const statistics = renderResources.model.statistics;
  const instances = node.instances;
  const runtimeNode = renderResources.runtimeNode;

  countInstancingAttributes(statistics, instances);
  countGeneratedBuffers(statistics, runtimeNode);
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
      // Any typed arrays should have been unloaded before this stage.
      const hasCpuCopy = false;
      statistics.addBuffer(attribute.buffer, hasCpuCopy);
    }
  }
}

function countGeneratedBuffers(statistics, runtimeNode) {
  if (defined(runtimeNode.instancingTransformsBuffer)) {
    // The typed array containing the computed transforms isn't saved
    // after the buffer is created.
    const hasCpuCopy = false;
    statistics.addBuffer(runtimeNode.instancingTransformsBuffer, hasCpuCopy);
  }
  if (defined(runtimeNode.instancingTransformsBuffer2D)) {
    // The typed array containing the computed 2D transforms isn't saved
    // after the buffer is created.
    const hasCpuCopy = false;
    statistics.addBuffer(runtimeNode.instancingTransformsBuffer2D, hasCpuCopy);
  }

  if (defined(runtimeNode.instancingTranslationBuffer2D)) {
    // The typed array containing the computed 2D translations isn't saved
    // after the buffer is created.
    const hasCpuCopy = false;
    statistics.addBuffer(runtimeNode.instancingTranslationBuffer2D, hasCpuCopy);
  }
}

export default NodeStatisticsPipelineStage;
