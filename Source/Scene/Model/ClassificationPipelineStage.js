import defined from "../../Core/defined.js";
import RuntimeError from "../../Core/RuntimeError.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

/**
 * The classification pipeline stage is responsible for batching features
 * together to properly create draw commands in the
 *
 * @namespace ClassificationPipelineStage
 *
 * @private
 */
const ClassificationPipelineStage = {};
ClassificationPipelineStage.name = "ClassificationPipelineStage"; // Helps with debugging

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the shader to indicate that the model classifies other assets</li>
 *  <li>adds arrays containing batch lengths and offsets to the model's resources
 * </ul>
 *
 * <p>
 * See {@link ClassificationModelDrawCommand} for the use of the batch offsets / lengths.
 * </p>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
ClassificationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_CLASSIFICATION",
    undefined,
    ShaderDestination.BOTH
  );

  const runtimePrimitive = renderResources.runtimePrimitive;

  if (!defined(runtimePrimitive.batchLengths)) {
    const batchInfo = getClassificationBatchInfo(primitive);
    const batchLengths = batchInfo.batchLengths;
    const batchOffsets = batchInfo.batchOffsets;

    runtimePrimitive.batchLengths = batchLengths;
    runtimePrimitive.batchOffsets = batchOffsets;
  }
};

function getClassificationBatchInfo(primitive) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );

  if (!defined(positionAttribute)) {
    throw new RuntimeError(
      "Primitives must have a position attribute to be used for classification."
    );
  }

  let indicesArray;
  const indices = primitive.indices;
  const hasIndices = defined(indices);
  if (hasIndices) {
    indicesArray = indices.typedArray;
    // Unload the typed array. This is just a pointer to the array in
    // the index buffer loader.
    indices.typedArray = undefined;
  }

  const count = hasIndices ? indices.count : positionAttribute.count;
  const featureIdAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.FEATURE_ID,
    0
  );

  // If there are no feature IDs, render the primitive in a single batch.
  if (!defined(featureIdAttribute)) {
    return {
      batchLengths: [count],
      batchOffsets: [0],
    };
  }

  const featureIds = featureIdAttribute.typedArray;
  // Unload the typed array. This is just a pointer to the array in
  // the vertex buffer loader, so if the typed array is shared by
  // multiple primitives (i.e. multiple instances of the same mesh),
  // this will not affect the other primitives.
  featureIdAttribute.typedArray = undefined;

  const batchLengths = [];
  const batchOffsets = [0];

  const firstIndex = hasIndices ? indicesArray[0] : 0;
  let currentBatchId = featureIds[firstIndex];
  let currentOffset = 0;

  for (let i = 1; i < count; i++) {
    const index = hasIndices ? indicesArray[i] : i;
    const batchId = featureIds[index];

    if (batchId !== currentBatchId) {
      // Store the length of this batch and begin counting the next one.
      const batchLength = i - currentOffset;
      const newOffset = i;

      batchLengths.push(batchLength);
      batchOffsets.push(newOffset);

      currentOffset = newOffset;
      currentBatchId = batchId;
    }
  }

  const finalBatchLength = count - currentOffset;
  batchLengths.push(finalBatchLength);

  return {
    batchLengths: batchLengths,
    batchOffsets: batchOffsets,
  };
}

export default ClassificationPipelineStage;
