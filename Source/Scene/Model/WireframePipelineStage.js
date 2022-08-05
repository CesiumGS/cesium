import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ModelUtility from "./ModelUtility.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import WireframeIndexGenerator from "../../Core/WireframeIndexGenerator.js";

/**
 * The wireframe pipeline stage generates a new index buffer for rendering the
 * structure of the mesh with gl.LINES.
 *
 * @namespace WireframePipelineStage
 * @private
 */
const WireframePipelineStage = {};
WireframePipelineStage.name = "WireframePipelineStage"; // Helps with debugging

/**
 * Process a primitive. This modifies the render resources as follows:
 * <ul>
 *   <li>Adds a define to the fragment shader to prevent extra shading of the lines.</li>
 *   <li>Adds a separate index buffer for wireframe indices</li>
 *   <li>Updates the primitive type and count for rendering with gl.LINES</li>
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
  // Applying normal mapping to the lines will result in rendering
  // errors on Linux. This define is added to disable normal
  // mapping in the shader.
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine(
    "HAS_WIREFRAME",
    undefined,
    ShaderDestination.FRAGMENT
  );

  const model = renderResources.model;
  const wireframeIndexBuffer = createWireframeIndexBuffer(
    primitive,
    renderResources.indices,
    frameState
  );
  model._pipelineResources.push(wireframeIndexBuffer);
  renderResources.wireframeIndexBuffer = wireframeIndexBuffer;

  // We only need to count memory for the generated buffer. In WebGL 1, the CPU
  // copy of the original indices is already counted in the geometry stage,
  // and in WebGL 2, the CPU copy of the original indices (generated from the
  // data of the original buffer) is discarded after generating the wireframe
  // indices.
  const hasCpuCopy = false;
  model.statistics.addBuffer(wireframeIndexBuffer, hasCpuCopy);

  // Update render resources so we render LINES with the correct index count
  const originalPrimitiveType = renderResources.primitiveType;
  const originalCount = renderResources.count;
  renderResources.primitiveType = PrimitiveType.LINES;
  renderResources.count = WireframeIndexGenerator.getWireframeIndicesCount(
    originalPrimitiveType,
    originalCount
  );
};

function createWireframeIndexBuffer(primitive, indices, frameState) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );
  const vertexCount = positionAttribute.count;
  const webgl2 = frameState.context.webgl2;

  let originalIndices;
  if (defined(indices)) {
    const indicesBuffer = indices.buffer;
    const indicesCount = indices.count;
    if (defined(indicesBuffer) && webgl2) {
      const useUint8Array = indicesBuffer.sizeInBytes === indicesCount;
      originalIndices = useUint8Array
        ? new Uint8Array(indicesCount)
        : IndexDatatype.createTypedArray(vertexCount, indicesCount);

      indicesBuffer.getBufferData(originalIndices);
    } else {
      originalIndices = indices.typedArray;
    }
  }

  const primitiveType = primitive.primitiveType;
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
