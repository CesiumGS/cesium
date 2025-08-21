import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";
import ModelUtility from "./ModelUtility.js";
import ModelReader from "./ModelReader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

/**
 * Processes edge visibility for a primitive by extracting visible edges and creating edge geometry.
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state
 * @private
 */
EdgeVisibilityPipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  if (!defined(primitive.edgeVisibility)) {
    return;
  }

  const shaderBuilder = renderResources.shaderBuilder;

  // Add shader defines and fragment code
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);

  // Add edge type attribute and varying
  const edgeTypeLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  shaderBuilder.addVarying("float", "v_edgeType", "flat");

  // Pass edge type from vertex to fragment shader
  shaderBuilder.addFunctionLines("setDynamicVaryingsVS", [
    "#ifdef HAS_EDGE_VISIBILITY",
    "  v_edgeType = a_edgeType;",
    "#endif",
  ]);

  const edgeResult = extractVisibleEdges(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.edgeIndices) ||
    edgeResult.edgeIndices.length === 0
  ) {
    return;
  }

  // Create edge geometry
  const edgeGeometry = createCPULineEdgeGeometry(
    edgeResult.edgeIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeTypeLocation,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Store edge geometry for rendering
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
  };
};

/**
 * Extracts visible edges from EXT_mesh_primitive_edge_visibility data.
 * Only includes silhouette (1) and hard (2) edges that need rendering.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {{edgeIndices:number[], edgeData:Object[], silhouetteEdgeCount:number}}
 * @private
 */
function extractVisibleEdges(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;

  if (!defined(visibility) || !defined(indices)) {
    return [];
  }

  const triangleIndexArray = indices.typedArray;
  const vertexCount = primitive.attributes[0].count;
  const edgeIndices = [];
  const edgeData = [];
  const seenEdgeHashes = new Set();
  let silhouetteEdgeCount = 0;

  // Process triangles and extract edges (2 bits per edge)
  let edgeIndex = 0;
  const totalIndices = triangleIndexArray.length;

  for (let i = 0; i + 2 < totalIndices; i += 3) {
    const v0 = triangleIndexArray[i];
    const v1 = triangleIndexArray[i + 1];
    const v2 = triangleIndexArray[i + 2];

    const edgeVertices = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ];

    for (let e = 0; e < 3; e++) {
      const byteIndex = Math.floor(edgeIndex / 4);
      const bitPairOffset = (edgeIndex % 4) * 2;
      edgeIndex++;

      if (byteIndex >= visibility.length) {
        break;
      }

      const byte = visibility[byteIndex];
      const visibility2Bit = (byte >> bitPairOffset) & 0x3;

      // Only include visible edge types
      let shouldIncludeEdge = false;
      switch (visibility2Bit) {
        case 0: // HIDDEN
          shouldIncludeEdge = false;
          break;
        case 1: // SILHOUETTE
          shouldIncludeEdge = true;
          break;
        case 2: // HARD
          shouldIncludeEdge = true;
          break;
        case 3: // REPEATED
          shouldIncludeEdge = false;
          break;
      }

      if (shouldIncludeEdge) {
        const a = edgeVertices[e][0];
        const b = edgeVertices[e][1];
        const small = Math.min(a, b);
        const big = Math.max(a, b);
        const hash = small * vertexCount + big;

        if (!seenEdgeHashes.has(hash)) {
          seenEdgeHashes.add(hash);
          edgeIndices.push(a, b);

          let mateVertexIndex = -1;
          if (visibility2Bit === 1) {
            mateVertexIndex = silhouetteEdgeCount;
            silhouetteEdgeCount++;
          }

          edgeData.push({
            edgeType: visibility2Bit,
            triangleIndex: Math.floor(i / 3),
            edgeIndex: e,
            mateVertexIndex: mateVertexIndex,
            currentTriangleVertices: [v0, v1, v2],
          });
        }
      }
    }
  }

  return { edgeIndices, edgeData, silhouetteEdgeCount };
}

/**
 * Creates CPU-side line edge geometry with separate vertex domain.
 * Each edge generates 2 vertices to avoid attribute conflicts with original mesh.
 * @param {number[]} edgeIndices Array of edge vertex indices from original mesh
 * @param {Object[]} edgeData Array of edge metadata including edge types
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @param {number} edgeTypeLocation The shader location for edge type attribute
 * @returns {Object|undefined} Edge geometry with vertex array and index buffer
 * @private
 */
function createCPULineEdgeGeometry(
  edgeIndices,
  edgeData,
  renderResources,
  context,
  edgeTypeLocation,
) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  const numEdges = edgeData.length;
  const vertsPerEdge = 2;
  const totalVerts = numEdges * vertsPerEdge;

  // Always use location 0 for position to avoid conflicts
  const positionLocation = 0;

  // Get original vertex positions
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    renderResources.runtimePrimitive.primitive,
    VertexAttributeSemantic.POSITION,
  );
  const srcPos = defined(positionAttribute.typedArray)
    ? positionAttribute.typedArray
    : ModelReader.readAttributeAsTypedArray(positionAttribute);

  // Create edge-domain vertices (2 per edge)
  const edgePosArray = new Float32Array(totalVerts * 3);
  const edgeTypeArray = new Float32Array(totalVerts);
  let p = 0;

  const maxSrcVertex = srcPos.length / 3 - 1;

  for (let i = 0; i < numEdges; i++) {
    const a = edgeIndices[i * 2];
    const b = edgeIndices[i * 2 + 1];

    // Validate vertex indices
    if (a < 0 || b < 0 || a > maxSrcVertex || b > maxSrcVertex) {
      // Fill with zeros to maintain indexing
      edgePosArray[p++] = 0;
      edgePosArray[p++] = 0;
      edgePosArray[p++] = 0;
      edgePosArray[p++] = 0;
      edgePosArray[p++] = 0;
      edgePosArray[p++] = 0;
      edgeTypeArray[i * 2] = 0;
      edgeTypeArray[i * 2 + 1] = 0;
      continue;
    }

    const ax = srcPos[a * 3];
    const ay = srcPos[a * 3 + 1];
    const az = srcPos[a * 3 + 2];
    const bx = srcPos[b * 3];
    const by = srcPos[b * 3 + 1];
    const bz = srcPos[b * 3 + 2];

    // Add edge endpoints
    edgePosArray[p++] = ax;
    edgePosArray[p++] = ay;
    edgePosArray[p++] = az;
    edgePosArray[p++] = bx;
    edgePosArray[p++] = by;
    edgePosArray[p++] = bz;

    const rawType = edgeData[i].edgeType;
    const t = rawType / 255.0;

    edgeTypeArray[i * 2] = t;
    edgeTypeArray[i * 2 + 1] = t;
  }

  // Create vertex buffers
  const edgePosBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: edgePosArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  const edgeTypeBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: edgeTypeArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Create sequential indices for line pairs
  const useU32 = totalVerts > 65535;
  const idx = new Array(totalVerts);
  for (let i = 0; i < totalVerts; i++) {
    idx[i] = i;
  }

  const indexBuffer = Buffer.createIndexBuffer({
    context,
    typedArray: useU32 ? new Uint32Array(idx) : new Uint16Array(idx),
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: useU32
      ? IndexDatatype.UNSIGNED_INT
      : IndexDatatype.UNSIGNED_SHORT,
  });

  // Create vertex array with position and edge type attributes
  const attributes = [
    {
      index: positionLocation,
      vertexBuffer: edgePosBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: edgeTypeLocation,
      vertexBuffer: edgeTypeBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
  ];

  const vertexArray = new VertexArray({ context, indexBuffer, attributes });

  if (!vertexArray || totalVerts === 0 || totalVerts % 2 !== 0) {
    return undefined;
  }

  return { vertexArray, indexBuffer, indexCount: totalVerts };
}

export default EdgeVisibilityPipelineStage;
