import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import WireframeIndexGenerator from "../../Core/WireframeIndexGenerator.js";

/**
 * The wireframe pipeline stage generates a new index buffer for rendering the
 * outline of the mesh with gl.LINES.
 *
 * @namespace WireframePipelineStage
 * @private
 */
const WireframePipelineStage = {};
WireframePipelineStage.name = "WireframePipelineStage"; // Helps with debugging

/**
 * Process a primitive. This modifies the render resources as follows:
 * <ul>
 *   <li>Adds a separate index buffer for wireframe indices</li>
 *   <li>Updates the primitive type and count for rendering gl.LINES</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this node
 * @param {ModelComponents.primitive} primitive The primitive
 * @param {FrameState} frameState The frame state
 */
WireframePipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const wireframeIndexBuffer = createWireframeIndexBuffer(
    renderResources,
    frameState
  );
  renderResources.model._resources.push(wireframeIndexBuffer);
  renderResources.wireframeIndexBuffer = wireframeIndexBuffer;

  // Update state so we render LINES with the correct index count
  const originalPrimitiveType = renderResources.primitiveType;
  const originalCount = renderResources.count;
  renderResources.primitiveType = PrimitiveType.LINES;
  renderResources.count = WireframeIndexGenerator.getWireframeIndicesCount(
    originalPrimitiveType,
    originalCount
  );
};

function createWireframeIndexBuffer(renderResources, frameState) {
  let positionAttribute;
  const attributes = renderResources.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    if (attributes[i].index === 0) {
      positionAttribute = attributes[i];
      break;
    }
  }

  const vertexCount = positionAttribute.count;
  const indices = renderResources.indices;

  let originalIndices;
  if (defined(indices)) {
    const indicesBuffer = indices.buffer;
    const indicesCount = indices.count;
    if (defined(indicesBuffer)) {
      const useUint8Array = indicesBuffer.sizeInBytes === indicesCount;
      originalIndices = useUint8Array
        ? new Uint8Array(indicesCount)
        : IndexDatatype.createTypedArray(vertexCount, indicesCount);

      indicesBuffer.getBufferData(originalIndices);
    } else {
      originalIndices = indices.typedArray;
    }
  }

  const primitiveType = renderResources.primitiveType;
  const wireframeIndices = WireframeIndexGenerator.createWireframeIndices(
    primitiveType,
    vertexCount,
    originalIndices
  );
  const indexDatatype = IndexDatatype.fromSizeInBytes(
    wireframeIndices.BYTES_PER_ELEMENT
  );

  return Buffer.createIndexBuffer({
    context: frameState.context,
    typedArray: wireframeIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
}

export default WireframePipelineStage;
