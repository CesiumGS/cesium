import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
// import AttributeType from "../AttributeType.js"; // Unused import
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";
// import Texture from "../../Renderer/Texture.js";
// import PixelFormat from "../../Core/PixelFormat.js";
// import PixelDatatype from "../../Renderer/PixelDatatype.js";
// import Sampler from "../../Renderer/Sampler.js";
// import TextureWrap from "../../Renderer/TextureWrap.js";
// import TextureMinificationFilter from "../../Renderer/TextureMinificationFilter.js";
// import TextureMagnificationFilter from "../../Renderer/TextureMagnificationFilter.js";
import ModelUtility from "./ModelUtility.js";
import ModelReader from "./ModelReader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * Utility class for handling 24-bit vertex indices in edge data.
 * Based on iTwin.js VertexIndices implementation.
 * @private
 */
// class VertexIndices {
//   constructor(data) {
//     this.data = data;
//     if (this.data.length % 3 !== 0) {
//       throw new Error("VertexIndices data length must be a multiple of 3");
//     }
//   }

//   get length() {
//     return this.data.length / 3;
//   }

//   static encodeIndex(index, bytes, byteIndex) {
//     if (byteIndex + 2 >= bytes.length) {
//       throw new Error("Byte index out of bounds");
//     }
//     bytes[byteIndex + 0] = index & 0x000000ff;
//     bytes[byteIndex + 1] = (index & 0x0000ff00) >> 8;
//     bytes[byteIndex + 2] = (index & 0x00ff0000) >> 16;
//   }

//   setNthIndex(n, value) {
//     VertexIndices.encodeIndex(value, this.data, n * 3);
//   }

//   getNthIndex(n) {
//     return this.decodeIndex(n);
//   }

//   decodeIndex(index) {
//     if (index >= this.length) {
//       throw new Error("Index out of bounds");
//     }
//     const byteIndex = index * 3;
//     return (
//       this.data[byteIndex] |
//       (this.data[byteIndex + 1] << 8) |
//       (this.data[byteIndex + 2] << 16)
//     );
//   }
// }

// setUint24 function removed - now using VertexIndices.encodeIndex instead

const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

/**
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
  // eslint-disable-next-line no-unused-vars
  const uniformMap = renderResources.uniformMap;

  // Add HAS_EDGE_VISIBILITY define
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );

  // Must add EdgeVisibilityStageFS when HAS_EDGE_VISIBILITY is defined
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);

  // Add edge LUT uniform for accessing edge endpoint data
  shaderBuilder.addUniform("sampler2D", "u_edgeLUT", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("vec4", "u_edgeParams", ShaderDestination.VERTEX); // [width, height, numSegments, padding]

  // Add edge type attribute (simplified - no LUT lookup needed)
  const edgeIndexLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  // Add quad index attribute (which vertex in the quad: 0-5)
  const quadIndexLocation = shaderBuilder.addAttribute("float", "a_quadIndex");
  // Add varying for edge type (flat to avoid interpolation)
  shaderBuilder.addVarying("float", "v_edgeType", "flat");

  // Add iTwin.js style edge expansion shader functions
  shaderBuilder.addVertexLines([
    "#ifdef HAS_EDGE_VISIBILITY",
    "// Decode 24-bit index from vec3",
    "float decodeUInt24(vec3 rgb) {",
    "  return rgb.x + rgb.y * 256.0 + rgb.z * 65536.0;",
    "}",
    "",
    "// Get edge LUT coordinates for texel access",
    "vec2 getEdgeLUTCoords(float edgeIndex) {",
    "  float texelIndex = edgeIndex * 1.5; // Each edge takes 1.5 texels (6 bytes / 4 bytes per texel)",
    "  float y = floor(texelIndex / u_edgeParams.x);",
    "  float x = texelIndex - y * u_edgeParams.x;",
    "  return vec2((x + 0.5) / u_edgeParams.x, (y + 0.5) / u_edgeParams.y);",
    "}",
    "",
    "// Expand edge to screen-space quad",
    "vec3 expandEdgeToScreenQuad(vec3 basePos, float quadIndex, float edgeIndex) {",
    "  // For now, return base position - will implement screen-space expansion later",
    "  return basePos;",
    "}",
    "#endif",
  ]);

  // Override setDynamicVaryingsVS to set varyings (CPU quad style)
  shaderBuilder.addFunctionLines("setDynamicVaryingsVS", [
    "#ifdef HAS_EDGE_VISIBILITY",
    "  // Pass edge type from attribute to varying (flat interpolation)",
    "  v_edgeType = a_edgeType;",
    "  // Position is already set up on CPU side - no need to modify here",
    "#endif",
  ]);

  const edgeResult = extractVisibleEdges(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.edgeIndices) ||
    edgeResult.edgeIndices.length === 0
  ) {
    console.log(
      "EdgeVisibilityPipelineStage: No visible edges found - EARLY EXIT",
    );
    return;
  }

  // Only log for test cases (small edge counts)
  if (edgeResult.edgeIndices.length <= 20) {
    console.log(
      `EdgeVisibilityPipelineStage: TEST CASE - Found ${edgeResult.edgeIndices.length / 2} edges to render`,
    );
  }

  // Use CPU-side quad creation for thick edge rendering
  const edgeGeometry = createCPUQuadEdgeGeometry(
    edgeResult.edgeIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeIndexLocation,
    quadIndexLocation,
  );

  if (!defined(edgeGeometry)) {
    console.log(
      "EdgeVisibilityPipelineStage: Failed to create edge geometry - EARLY EXIT",
    );
    return;
  }

  // Store edge geometry for ModelDrawCommand to create edge commands
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.TRIANGLES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
  };

  return;

  // TODO: Unreachable code - remove or implement proper conditional logic
  /*
  // Add uniform for camera position in view space (for silhouette calculation)
  shaderBuilder.addUniform(
    "vec3",
    "czm_edgeViewerPositionWC",
    ShaderDestination.VERTEX,
  );
  uniformMap.czm_edgeViewerPositionWC = function () {
    return frameState.camera.positionWC;
  };

  // Add uniform for view matrix
  shaderBuilder.addUniform(
    "mat4",
    "czm_edgeViewMatrix",
    ShaderDestination.VERTEX,
  );
  uniformMap.czm_edgeViewMatrix = function () {
    return frameState.context.uniformState.view;
  };

  // Add uniform for normal matrix
  shaderBuilder.addUniform(
    "mat3",
    "czm_edgeNormalMatrix",
    ShaderDestination.VERTEX,
  );
  uniformMap.czm_edgeNormalMatrix = function () {
    return frameState.context.uniformState.normal;
  };

  // Add uniform for model-view matrix
  shaderBuilder.addUniform(
    "mat4",
    "czm_edgeModelViewMatrix",
    ShaderDestination.VERTEX,
  );
  uniformMap.czm_edgeModelViewMatrix = function () {
    return frameState.context.uniformState.modelView;
  };

  // Check if orthographic projection
  const isOrthographic =
    frameState.camera.frustum instanceof OrthographicOffCenterFrustum;

  // Add uniform for orthographic flag
  shaderBuilder.addUniform(
    "bool",
    "czm_edgeIsOrthographic",
    ShaderDestination.VERTEX,
  );
  uniformMap.czm_edgeIsOrthographic = function () {
    return isOrthographic;
  };
  */
};

/**
 * Extracts visible edge segments from EXT_mesh_primitive_edge_visibility data.
 * Returns edge endpoint pairs and metadata for edge rendering (lines, quads, etc.).
 * Only includes edges that need to be processed: silhouette (1) and hard (2).
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
  const edgeIndices = []; // Edge endpoint pairs (v0,v1, v2,v3, ...)
  const edgeData = []; // Store additional edge data for shader
  const seenEdgeHashes = new Set();
  let silhouetteEdgeCount = 0; // Track silhouette edges for silhouetteMates mapping

  // 2 bits per edge in order (v0:v1, v1:v2, v2:v0)
  let edgeIndex = 0; // Track absolute edge index across all triangles
  const totalIndices = triangleIndexArray.length;

  for (let i = 0; i + 2 < totalIndices; i += 3) {
    const v0 = triangleIndexArray[i];
    const v1 = triangleIndexArray[i + 1];
    const v2 = triangleIndexArray[i + 2];

    // Iterate the 3 edges in order
    const edgeVertices = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ];

    for (let e = 0; e < 3; e++) {
      // Calculate which byte and bit pair this edge belongs to
      const byteIndex = Math.floor(edgeIndex / 4); // 4 edges per byte (2 bits each)
      const bitPairOffset = (edgeIndex % 4) * 2; // 0, 2, 4, 6 for the 4 edges in a byte

      if (byteIndex >= visibility.length) {
        break;
      }

      const byte = visibility[byteIndex];
      const visibility2Bit = (byte >> bitPairOffset) & 0x3;
      edgeIndex++; // Move to next edge

      // Only include edges that need processing
      let shouldIncludeEdge = false;
      // let edgeTypeName = ""; // Unused variable
      switch (visibility2Bit) {
        case 0: // HIDDEN - never rendered
          shouldIncludeEdge = false;
          // edgeTypeName = "HIDDEN"; // Unused variable
          break;
        case 1: // SILHOUETTE - always show as red for now
          shouldIncludeEdge = true;
          // edgeTypeName = "SILHOUETTE"; // Unused variable
          break;
        case 2: // HARD - always rendered
          shouldIncludeEdge = true;
          // edgeTypeName = "HARD"; // Unused variable
          break;
        case 3: // REPEATED - TEMP: include for testing blue color
          shouldIncludeEdge = true; // TEMP: was false
          // edgeTypeName = "REPEATED"; // Unused variable
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
          edgeIndices.push(a, b); // Add edge endpoint pair

          // For silhouette edges, we need to track the mate vertex index
          let mateVertexIndex = -1;
          if (visibility2Bit === 1) {
            // SILHOUETTE
            // silhouetteMates[silhouetteEdgeCount] gives the third vertex of the adjacent triangle
            mateVertexIndex = silhouetteEdgeCount;
            silhouetteEdgeCount++;
          }

          edgeData.push({
            edgeType: visibility2Bit, // Store edge type for shader
            triangleIndex: Math.floor(i / 3),
            edgeIndex: e,
            mateVertexIndex: mateVertexIndex, // Index into silhouetteMates array (-1 if not silhouette)
            currentTriangleVertices: [v0, v1, v2], // Store for silhouette calculation
          });
        }
      }
    }
  }

  return { edgeIndices, edgeData, silhouetteEdgeCount };
}

// /**
//  * Creates line edge geometry with per-edge data for silhouette calculation.
//  * This creates a separate VAO for edge domain rendering with edge-local indices.
//  * @param {number[]} edgeIndices The line indices (pairs of vertex indices from original mesh)
//  * @param {Object[]} edgeData Edge metadata (type, triangle info, mate indices)
//  * @param {Object} edgeVisibility The edge visibility data containing silhouetteMates
//  * @param {PrimitiveRenderResources} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @returns {Object|undefined} Edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createLineEdgeGeometry(
//   edgeIndices,
//   edgeData,
//   edgeVisibility,
//   renderResources,
//   context,
//   edgeTypeLocation,
// ) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   // Get original vertex positions from primitive
//   const positionAttribute = renderResources.attributes.find(
//     (attr) => attr.semantic === "POSITION" || attr.index === 0,
//   );
//   if (!defined(positionAttribute)) {
//     console.error("No position attribute found for edge geometry");
//     return undefined;
//   }

//   const edgeCount = edgeIndices.length / 2;

//   // Create edge-local indices: [0,1, 2,3, 4,5, ...] for GL_LINES
//   // This matches the edge domain attribute layout (2 vertices per edge)
//   const edgeLocalIndices = new Array(edgeIndices.length);
//   for (let i = 0; i < edgeLocalIndices.length; i++) {
//     edgeLocalIndices[i] = i;
//   }

//   // Determine appropriate index datatype based on edge vertex count
//   const useUint32 = edgeLocalIndices.length > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(edgeLocalIndices)
//     : new Uint16Array(edgeLocalIndices);

//   // Create index buffer for edge-local line indices
//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // Helper to get vertex position from buffer
//   function getVertexPosition(vertexIndex, positionBuffer, componentDatatype) {
//     const bytesPerComponent =
//       ComponentDatatype.getSizeInBytes(componentDatatype);
//     const componentsPerVertex = 3; // vec3
//     const offset = vertexIndex * componentsPerVertex * bytesPerComponent;

//     if (componentDatatype === ComponentDatatype.FLOAT) {
//       const view = new Float32Array(positionBuffer, offset, 3);
//       return [view[0], view[1], view[2]];
//     }
//     // Add other datatypes if needed
//     return [0, 0, 0];
//   }

//   // Read position data from original mesh
//   const positionBuffer = positionAttribute.vertexBuffer._buffer;
//   const positionComponentDatatype = positionAttribute.componentDatatype;

//   // Create edge domain attribute arrays (length = edgeIndices.length = 2 * edgeCount)
//   const edgeVertexCount = edgeIndices.length; // Total vertices in edge domain

//   // Edge domain position buffer: each edge endpoint gets its own position
//   const edgePositionArray = new Float32Array(edgeVertexCount * 3);
//   const edgeTypeArray = new Float32Array(edgeVertexCount);
//   const edgePos0Array = new Float32Array(edgeVertexCount * 3);
//   const edgePos1Array = new Float32Array(edgeVertexCount * 3);
//   const currentTriThirdArray = new Float32Array(edgeVertexCount * 3);

//   let mateTriThirdArray = null;
//   if (defined(edgeVisibility.silhouetteMates)) {
//     mateTriThirdArray = new Float32Array(edgeVertexCount * 3);
//   }

//   // Fill edge domain attributes
//   for (let i = 0; i < edgeCount; i++) {
//     const edgeInfo = edgeData[i];
//     const edgeType = edgeInfo.edgeType;

//     // Original mesh vertex indices for this edge
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];

//     // Get positions from original mesh
//     const v0Pos = getVertexPosition(
//       v0Index,
//       positionBuffer,
//       positionComponentDatatype,
//     );
//     const v1Pos = getVertexPosition(
//       v1Index,
//       positionBuffer,
//       positionComponentDatatype,
//     );

//     // Current triangle third vertex position
//     const currentTriVertices = edgeInfo.currentTriangleVertices;
//     let thirdVertexIndex = -1;
//     for (let j = 0; j < 3; j++) {
//       if (
//         currentTriVertices[j] !== v0Index &&
//         currentTriVertices[j] !== v1Index
//       ) {
//         thirdVertexIndex = currentTriVertices[j];
//         break;
//       }
//     }
//     const thirdPos =
//       thirdVertexIndex >= 0
//         ? getVertexPosition(
//             thirdVertexIndex,
//             positionBuffer,
//             positionComponentDatatype,
//           )
//         : [0, 0, 0];

//     // Get mate position for silhouette edges
//     let matePos = [0, 0, 0];
//     if (
//       edgeType === 1 &&
//       defined(edgeVisibility.silhouetteMates) &&
//       edgeInfo.mateVertexIndex >= 0
//     ) {
//       const silhouetteMates = edgeVisibility.silhouetteMates.typedArray;
//       const mateVertexIndex = silhouetteMates[edgeInfo.mateVertexIndex];
//       matePos = getVertexPosition(
//         mateVertexIndex,
//         positionBuffer,
//         positionComponentDatatype,
//       );
//     }

//     // Fill data for both edge endpoints (edge domain vertices)
//     const edgeVertex0Index = i * 2; // First endpoint of edge i
//     const edgeVertex1Index = i * 2 + 1; // Second endpoint of edge i

//     // First edge endpoint (corresponds to v0 in original mesh)
//     edgePositionArray[edgeVertex0Index * 3] = v0Pos[0];
//     edgePositionArray[edgeVertex0Index * 3 + 1] = v0Pos[1];
//     edgePositionArray[edgeVertex0Index * 3 + 2] = v0Pos[2];

//     edgeTypeArray[edgeVertex0Index] = edgeType;

//     edgePos0Array[edgeVertex0Index * 3] = v0Pos[0];
//     edgePos0Array[edgeVertex0Index * 3 + 1] = v0Pos[1];
//     edgePos0Array[edgeVertex0Index * 3 + 2] = v0Pos[2];

//     edgePos1Array[edgeVertex0Index * 3] = v1Pos[0];
//     edgePos1Array[edgeVertex0Index * 3 + 1] = v1Pos[1];
//     edgePos1Array[edgeVertex0Index * 3 + 2] = v1Pos[2];

//     currentTriThirdArray[edgeVertex0Index * 3] = thirdPos[0];
//     currentTriThirdArray[edgeVertex0Index * 3 + 1] = thirdPos[1];
//     currentTriThirdArray[edgeVertex0Index * 3 + 2] = thirdPos[2];

//     if (mateTriThirdArray) {
//       mateTriThirdArray[edgeVertex0Index * 3] = matePos[0];
//       mateTriThirdArray[edgeVertex0Index * 3 + 1] = matePos[1];
//       mateTriThirdArray[edgeVertex0Index * 3 + 2] = matePos[2];
//     }

//     // Second edge endpoint (corresponds to v1 in original mesh)
//     edgePositionArray[edgeVertex1Index * 3] = v1Pos[0];
//     edgePositionArray[edgeVertex1Index * 3 + 1] = v1Pos[1];
//     edgePositionArray[edgeVertex1Index * 3 + 2] = v1Pos[2];

//     edgeTypeArray[edgeVertex1Index] = edgeType;

//     edgePos0Array[edgeVertex1Index * 3] = v0Pos[0];
//     edgePos0Array[edgeVertex1Index * 3 + 1] = v0Pos[1];
//     edgePos0Array[edgeVertex1Index * 3 + 2] = v0Pos[2];

//     edgePos1Array[edgeVertex1Index * 3] = v1Pos[0];
//     edgePos1Array[edgeVertex1Index * 3 + 1] = v1Pos[1];
//     edgePos1Array[edgeVertex1Index * 3 + 2] = v1Pos[2];

//     currentTriThirdArray[edgeVertex1Index * 3] = thirdPos[0];
//     currentTriThirdArray[edgeVertex1Index * 3 + 1] = thirdPos[1];
//     currentTriThirdArray[edgeVertex1Index * 3 + 2] = thirdPos[2];

//     if (mateTriThirdArray) {
//       mateTriThirdArray[edgeVertex1Index * 3] = matePos[0];
//       mateTriThirdArray[edgeVertex1Index * 3 + 1] = matePos[1];
//       mateTriThirdArray[edgeVertex1Index * 3 + 2] = matePos[2];
//     }
//   }

//   // Create vertex buffers for edge domain
//   const createBuffer = (data) =>
//     Buffer.createVertexBuffer({
//       context: context,
//       typedArray: data,
//       usage: BufferUsage.STATIC_DRAW,
//     });

//   const edgePositionBuffer = createBuffer(edgePositionArray);
//   const edgeTypeBuffer = createBuffer(edgeTypeArray);
//   // const edgePos0Buffer = createBuffer(edgePos0Array); // Unused variable
//   // const edgePos1Buffer = createBuffer(edgePos1Array); // Unused variable
//   // const currentTriThirdBuffer = createBuffer(currentTriThirdArray); // Unused variable

//   // Create edge domain VAO attributes (completely separate from mesh domain)
//   // const shaderBuilder = renderResources.shaderBuilder; // Unused variable

//   // Find the position attribute location (usually 0)
//   const positionLocation =
//     renderResources.attributes.find(
//       (attr) => attr.semantic === "POSITION" || attr.index === 0,
//     )?.index || 0;

//   // Create edge domain attributes with all necessary basic attributes
//   const edgeAttributes = [
//     // Edge domain position (location 0 - replaces mesh position)
//     {
//       index: positionLocation,
//       vertexBuffer: edgePositionBuffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//     // Edge type attribute for color coding
//     {
//       index: edgeTypeLocation,
//       vertexBuffer: edgeTypeBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   // Add minimal required attributes for Cesium shader compatibility
//   // Find original normal attribute if it exists
//   const originalNormalAttr = renderResources.attributes.find(
//     (attr) => attr.semantic === "NORMAL" || attr.index === 1,
//   );

//   if (originalNormalAttr) {
//     // Create dummy normal data for edge domain (all normals pointing up)
//     const edgeNormalArray = new Float32Array(edgeVertexCount * 3);
//     for (let j = 0; j < edgeVertexCount; j++) {
//       edgeNormalArray[j * 3] = 0; // x
//       edgeNormalArray[j * 3 + 1] = 0; // y
//       edgeNormalArray[j * 3 + 2] = 1; // z (up)
//     }

//     const edgeNormalBuffer = createBuffer(edgeNormalArray);
//     edgeAttributes.push({
//       index: originalNormalAttr.index,
//       vertexBuffer: edgeNormalBuffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     });
//   }

//   // Keep only essential attributes for edge domain VAO

//   // Create edge domain VAO - completely separate from mesh domain
//   const edgeVertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   return {
//     vertexArray: edgeVertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: edgeLocalIndices.length,
//     edgePositionBuffer: edgePositionBuffer,
//     edgeTypeBuffer: edgeTypeBuffer,
//     // TEMP: Skip returning optional buffers for simplified version
//     // edgePos0Buffer: edgePos0Buffer,
//     // edgePos1Buffer: edgePos1Buffer,
//     // currentTriThirdBuffer: currentTriThirdBuffer,
//     // mateTriThirdBuffer: mateTriThirdBuffer,
//   };
// }

// /**
//  * Creates edge geometry with edge type data for color coding
//  * This version adds edge type information while using original mesh positions
//  * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
//  * @param {Object[]} edgeData Edge metadata including edge types
//  * @param {PrimitiveRenderResources} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @param {number} edgeTypeLocation The shader location for edge type attribute
//  * @returns {Object|undefined} Edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createEdgeGeometryWithTypes(
//   edgeIndices,
//   edgeData,
//   renderResources,
//   context,
//   edgeTypeLocation,
// ) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   // Use original mesh vertex indices directly
//   // Find max index without spread operator to avoid stack overflow
//   let maxIndex = 0;
//   for (let i = 0; i < edgeIndices.length; i++) {
//     if (edgeIndices[i] > maxIndex) {
//       maxIndex = edgeIndices[i];
//     }
//   }
//   const useUint32 = maxIndex > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(edgeIndices)
//     : new Uint16Array(edgeIndices);

//   // Create index buffer for line indices
//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // Get original vertex count from position attribute
//   const positionAttribute = renderResources.attributes.find(
//     (attr) => attr.semantic === "POSITION" || attr.index === 0,
//   );
//   const vertexCount = positionAttribute.count;

//   // Create edge type array - one value per original mesh vertex
//   const edgeTypeArray = new Float32Array(vertexCount);
//   edgeTypeArray.fill(0); // Default to HIDDEN (0)

//   // Fill edge type data based on which edges use each vertex
//   for (let i = 0; i < edgeData.length; i++) {
//     const edgeInfo = edgeData[i];
//     const edgeType = edgeInfo.edgeType;
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];

//     // Set edge type for both vertices of this edge
//     edgeTypeArray[v0Index] = edgeType;
//     edgeTypeArray[v1Index] = edgeType;
//   }

//   // Create edge type buffer
//   const edgeTypeBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgeTypeArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Combine original mesh attributes with edge type attribute
//   const edgeAttributes = [
//     ...renderResources.attributes, // Keep all original mesh attributes
//     {
//       index: edgeTypeLocation,
//       vertexBuffer: edgeTypeBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   const vertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   return {
//     vertexArray: vertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: edgeIndices.length,
//     edgeTypeBuffer: edgeTypeBuffer,
//   };
// }

// /**
//  * Creates simple line edge geometry using original mesh attributes
//  * This is a simplified version that avoids the complex edge domain VAO issues
//  * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
//  * @param {PrimitiveRenderResources} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @returns {Object|undefined} Simple edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createSimpleLineEdgeGeometry(edgeIndices, renderResources, context) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   // Use original mesh vertex indices directly
//   // Find max index without spread operator to avoid stack overflow
//   let maxIndex = 0;
//   for (let i = 0; i < edgeIndices.length; i++) {
//     if (edgeIndices[i] > maxIndex) {
//       maxIndex = edgeIndices[i];
//     }
//   }
//   const useUint32 = maxIndex > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(edgeIndices)
//     : new Uint16Array(edgeIndices);

//   // Create index buffer for line indices
//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // Use original mesh attributes directly - no edge domain complications
//   const vertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: renderResources.attributes, // Use original mesh attributes
//   });

//   return {
//     vertexArray: vertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: edgeIndices.length,
//   };
// }

// /**
//  * Creates an edge LUT (lookup table) texture for storing edge type data
//  * @param {Object[]} edgeData Array of edge metadata including edge types
//  * @param {Context} context The rendering context
//  * @returns {Object|undefined} Object with texture, width, and height properties
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createEdgeLUTTexture(edgeIndices, edgeData, context) {
//   if (!defined(edgeData) || edgeData.length === 0) {
//     return undefined;
//   }

//   const edgeCount = edgeData.length;

//   // Each edge needs 2 texels: first for v0 + edge type, second for v1
//   const texelsPerEdge = 2;
//   const totalTexels = edgeCount * texelsPerEdge;

//   // Calculate texture dimensions
//   const textureWidth = Math.max(1, Math.ceil(Math.sqrt(totalTexels)));
//   const textureHeight = Math.max(1, Math.ceil(totalTexels / textureWidth));
//   const actualTexels = textureWidth * textureHeight;

//   // Create texture data array (RGBA format, 4 bytes per texel)
//   const textureData = new Uint8Array(actualTexels * 4);

//   // Debug: Count edge types (only for test cases)
//   const edgeTypeCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
//   for (let i = 0; i < edgeCount; i++) {
//     const edgeType = edgeData[i].edgeType;
//     if (edgeTypeCounts.hasOwnProperty(edgeType)) {
//       edgeTypeCounts[edgeType]++;
//     }
//   }

//   // Fill texture with edge data (iTwin.js style)
//   for (let i = 0; i < edgeCount; i++) {
//     const edgeInfo = edgeData[i];
//     const v0Index = edgeIndices[i * 2]; // First endpoint
//     const v1Index = edgeIndices[i * 2 + 1]; // Second endpoint

//     // First texel: v0 endpoint indices (24-bit) + edge type
//     const texel0Index = i * texelsPerEdge * 4;

//     // Pack v0Index (24-bit) into RGB of first texel using VertexIndices helper
//     VertexIndices.encodeIndex(v0Index, textureData, texel0Index);
//     textureData[texel0Index + 3] = edgeInfo.edgeType; // Edge type in alpha (0-255 range)

//     // Second texel: v1 endpoint indices (24-bit)
//     const texel1Index = texel0Index + 4;

//     // Pack v1Index (24-bit) into RGB of second texel using VertexIndices helper
//     VertexIndices.encodeIndex(v1Index, textureData, texel1Index);
//     textureData[texel1Index + 3] = 255; // Alpha channel: opaque
//   }

//   // Fill remaining texels with default values
//   for (let i = edgeCount * texelsPerEdge; i < actualTexels; i++) {
//     const texelIndex = i * 4;
//     textureData[texelIndex] = 0;
//     textureData[texelIndex + 1] = 0;
//     textureData[texelIndex + 2] = 0;
//     textureData[texelIndex + 3] = 255;
//   }

//   // Create texture
//   const texture = new Texture({
//     context: context,
//     width: textureWidth,
//     height: textureHeight,
//     pixelFormat: PixelFormat.RGBA,
//     pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
//     source: {
//       arrayBufferView: textureData,
//     },
//     sampler: new Sampler({
//       wrapS: TextureWrap.CLAMP_TO_EDGE,
//       wrapT: TextureWrap.CLAMP_TO_EDGE,
//       minificationFilter: TextureMinificationFilter.NEAREST,
//       magnificationFilter: TextureMagnificationFilter.NEAREST,
//     }),
//   });

//   return {
//     texture: texture,
//     width: textureWidth,
//     height: textureHeight,
//     edgeCount: edgeCount,
//   };
// }

// /**
//  * Creates edge geometry with LUT-based edge index attributes
//  * This version uses the original mesh VAO but adds edge index attributes for LUT lookup
//  * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
//  * @param {Object[]} edgeData Edge metadata including edge types
//  * @param {PrimitiveRenderResources} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @param {number} edgeIndexLocation The shader location for edge index attribute
//  * @returns {Object|undefined} Edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createEdgeGeometryWithLUT(
//   edgeIndices,
//   edgeData,
//   renderResources,
//   context,
//   edgeIndexLocation,
//   primitive,
// ) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   const edgeCount = edgeData.length;
//   // const vertexCountPerEdge = 2; // Unused variable
//   // const totalVertices = edgeCount * vertexCountPerEdge; // Unused variable

//   // Use original mesh vertex indices directly for the index buffer
//   // Find max index without spread operator to avoid stack overflow
//   let maxIndex = 0;
//   for (let i = 0; i < edgeIndices.length; i++) {
//     if (edgeIndices[i] > maxIndex) {
//       maxIndex = edgeIndices[i];
//     }
//   }
//   const useUint32 = maxIndex > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(edgeIndices)
//     : new Uint16Array(edgeIndices);

//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // For edge domain approach, we don't need to copy position data
//   // Instead, we'll use the original mesh VAO with edge index attribute
//   // This is simpler and avoids the need to access raw position data

//   // Get position location from renderResources for VAO creation
//   const renderPositionAttribute = renderResources.attributes.find(
//     (attr) => attr.semantic === "POSITION" || attr.index === 0,
//   );
//   // const positionLocation = renderPositionAttribute ? renderPositionAttribute.index : 0; // Unused variable

//   // Use original mesh vertex indices directly for the index buffer (back to original approach)
//   // But create a proper edge index mapping to handle the domain mismatch

//   // Get vertex count from render resources
//   const vertexCount = renderPositionAttribute
//     ? renderPositionAttribute.count
//     : 0;
//   if (vertexCount === 0) {
//     console.error("EdgeVisibilityPipelineStage: Cannot determine vertex count");
//     return undefined;
//   }

//   // Create edge index buffer: map each vertex to its edge index
//   const edgeIndexArray = new Float32Array(vertexCount);
//   edgeIndexArray.fill(-1); // Default to -1 for vertices not part of any edge

//   // Assign edge indices to vertices
//   for (let i = 0; i < edgeCount; i++) {
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];

//     // Validate indices
//     if (
//       v0Index < 0 ||
//       v0Index >= vertexCount ||
//       v1Index < 0 ||
//       v1Index >= vertexCount
//     ) {
//       console.error(
//         `EdgeVisibilityPipelineStage: Invalid vertex indices for edge ${i}: v0=${v0Index}, v1=${v1Index}, vertexCount=${vertexCount}`,
//       );
//       continue; // Skip this edge instead of failing completely
//     }

//     // For shared vertices, the last edge wins (this is the limitation we accept)
//     edgeIndexArray[v0Index] = i;
//     edgeIndexArray[v1Index] = i;
//   }

//   const edgeIndexBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgeIndexArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Create VAO attributes: original mesh attributes + edge index
//   const edgeAttributes = [
//     ...renderResources.attributes, // Keep all original mesh attributes
//     {
//       index: edgeIndexLocation,
//       vertexBuffer: edgeIndexBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   const vertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   return {
//     vertexArray: vertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: edgeIndices.length, // Use original edge indices count
//     edgeIndexBuffer: edgeIndexBuffer,
//   };
// }

// /**
//  * Creates edge geometry using iTwin.js quad approach with edge domain vertices
//  * Each edge is rendered as a quad (2 triangles = 6 vertices)
//  * @param {number[]} edgeIndices Array of edge vertex indices
//  * @param {Object[]} edgeData Array of edge metadata including edge types
//  * @param {Object} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @param {number} edgeIndexLocation The shader location for edge index attribute
//  * @returns {Object|undefined} Edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createEdgeQuadGeometry(
//   edgeIndices,
//   edgeData,
//   renderResources,
//   context,
//   edgeIndexLocation,
// ) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   const edgeCount = edgeData.length;
//   const verticesPerEdge = 2; // 2 vertices per edge (line endpoints)
//   const totalVertices = edgeCount * verticesPerEdge;
//   const indicesPerEdge = 2; // 1 line × 2 indices
//   const totalIndices = edgeCount * indicesPerEdge;

//   // Create edge domain index buffer for lines
//   // Each edge uses 2 vertices to form 1 line: [0,1]
//   const edgeLocalIndices = new Array(totalIndices);
//   for (let i = 0; i < edgeCount; i++) {
//     const baseVertex = i * verticesPerEdge;
//     const baseIndex = i * indicesPerEdge;

//     // Line: [0, 1]
//     edgeLocalIndices[baseIndex] = baseVertex;
//     edgeLocalIndices[baseIndex + 1] = baseVertex + 1;
//   }

//   const useUint32 = totalVertices > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(edgeLocalIndices)
//     : new Uint16Array(edgeLocalIndices);

//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // Create edge index buffer: each vertex gets the index of its edge in the LUT
//   // 2 vertices per edge, all get the same edge index
//   const edgeIndexArray = new Float32Array(totalVertices);
//   for (let i = 0; i < edgeCount; i++) {
//     const edgeIndex = i;
//     for (let v = 0; v < verticesPerEdge; v++) {
//       edgeIndexArray[i * verticesPerEdge + v] = edgeIndex;
//     }
//   }

//   const edgeIndexBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgeIndexArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Create edge domain VAO: only edge index attribute
//   // Position will be computed in shader from edge index via LUT
//   // Create edge domain position buffer - use real edge endpoint positions
//   const edgePositionArray = new Float32Array(totalVertices * 3);

//   // Get original vertex positions
//   const positionAttribute = ModelUtility.getAttributeBySemantic(
//     renderResources.runtimePrimitive.primitive,
//     VertexAttributeSemantic.POSITION,
//   );

//   let originalPositions;
//   if (defined(positionAttribute.typedArray)) {
//     originalPositions = positionAttribute.typedArray;
//   } else {
//     try {
//       originalPositions =
//         ModelReader.readAttributeAsTypedArray(positionAttribute);
//     } catch (error) {
//       console.error(
//         "EdgeVisibilityPipelineStage: Cannot access position data, using test positions",
//       );
//       // Fallback to test positions
//       let posIdx = 0;
//       for (let i = 0; i < edgeCount; i++) {
//         for (let v = 0; v < verticesPerEdge; v++) {
//           edgePositionArray[posIdx++] = i * 0.01 + (v === 0 ? 0 : 0.01);
//           edgePositionArray[posIdx++] = 0.0;
//           edgePositionArray[posIdx++] = 0.0;
//         }
//       }
//       return { edgePositionArray, edgePositionBuffer: null };
//     }
//   }

//   let posIdx = 0;
//   for (let i = 0; i < edgeCount; i++) {
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];

//     // For each edge, create 2 vertices (line endpoints)
//     for (let v = 0; v < verticesPerEdge; v++) {
//       const vertexIndex = v === 0 ? v0Index : v1Index;
//       const baseIdx = vertexIndex * 3;

//       // Copy the real vertex position
//       edgePositionArray[posIdx++] = originalPositions[baseIdx]; // X
//       edgePositionArray[posIdx++] = originalPositions[baseIdx + 1]; // Y
//       edgePositionArray[posIdx++] = originalPositions[baseIdx + 2]; // Z
//     }
//   }

//   const edgePositionBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgePositionArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Create attributes for edge domain geometry
//   const edgeAttributes = [
//     {
//       index: 0, // Position attribute (location 0)
//       vertexBuffer: edgePositionBuffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//     {
//       index: edgeIndexLocation,
//       vertexBuffer: edgeIndexBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   const vertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   return {
//     vertexArray: vertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: totalIndices,
//     edgeIndexBuffer: edgeIndexBuffer,
//   };
// }

/**
 * Creates CPU-side quad edge geometry with flat interpolation (working version)
 * Each edge is rendered as a quad (2 triangles = 6 vertices) created on CPU
 * @param {number[]} edgeIndices Array of edge vertex indices
 * @param {Object[]} edgeData Array of edge metadata including edge types
 * @param {Object} renderResources The render resources
 * @param {Context} context The rendering context
 * @param {number} edgeIndexLocation The shader location for edge index attribute
 * @param {number} quadIndexLocation The shader location for quad index attribute
 * @returns {Object|undefined} Edge geometry with vertex array and index buffer
 * @private
 */
function createCPUQuadEdgeGeometry(
  edgeIndices,
  edgeData,
  renderResources,
  context,
  edgeIndexLocation,
  quadIndexLocation,
) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  const numEdges = edgeData.length;
  const verticesPerEdge = 6; // 6 vertices per edge (2 triangles)
  const totalVertices = numEdges * verticesPerEdge;

  // Get original vertex positions from primitive
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    renderResources.runtimePrimitive.primitive,
    VertexAttributeSemantic.POSITION,
  );

  let originalPositions;
  if (defined(positionAttribute.typedArray)) {
    originalPositions = positionAttribute.typedArray;
  } else {
    try {
      originalPositions =
        ModelReader.readAttributeAsTypedArray(positionAttribute);
    } catch (error) {
      console.error("Cannot access position data:", error);
      return undefined;
    }
  }

  // Create actual quad vertices in CPU (not just endpoints)
  const edgePositionArray = new Float32Array(totalVertices * 3);
  // Create quad index array (identifies which vertex in the quad: 0-5)
  const quadIndexArray = new Float32Array(totalVertices);
  let posIdx = 0;

  for (let i = 0; i < numEdges; i++) {
    const v0Index = edgeIndices[i * 2];
    const v1Index = edgeIndices[i * 2 + 1];

    // Get positions for both endpoints
    const v0Pos = [
      originalPositions[v0Index * 3],
      originalPositions[v0Index * 3 + 1],
      originalPositions[v0Index * 3 + 2],
    ];
    const v1Pos = [
      originalPositions[v1Index * 3],
      originalPositions[v1Index * 3 + 1],
      originalPositions[v1Index * 3 + 2],
    ];

    // Calculate edge direction and perpendicular offset
    const edgeDir = [
      v1Pos[0] - v0Pos[0],
      v1Pos[1] - v0Pos[1],
      v1Pos[2] - v0Pos[2],
    ];

    // Calculate edge length for proper scaling
    const edgeLength = Math.sqrt(
      edgeDir[0] * edgeDir[0] +
        edgeDir[1] * edgeDir[1] +
        edgeDir[2] * edgeDir[2],
    );

    // Use a better perpendicular direction (try Y-axis if edge is mostly horizontal)
    let perpDir = [0.0, 1.0, 0.0]; // Default to Y-up
    if (
      Math.abs(edgeDir[1]) > Math.abs(edgeDir[0]) &&
      Math.abs(edgeDir[1]) > Math.abs(edgeDir[2])
    ) {
      // If edge is mostly Y-direction, use X-axis
      perpDir = [1.0, 0.0, 0.0];
    }

    const offset = Math.max(5.0, edgeLength * 0.02); // Adaptive line width
    const perpOffset = [
      perpDir[0] * offset,
      perpDir[1] * offset,
      perpDir[2] * offset,
    ];

    // Create quad vertices: v0_bottom, v0_top, v1_bottom, v1_top
    const v0Bottom = [
      v0Pos[0] - perpOffset[0],
      v0Pos[1] - perpOffset[1],
      v0Pos[2] - perpOffset[2],
    ];
    const v0Top = [
      v0Pos[0] + perpOffset[0],
      v0Pos[1] + perpOffset[1],
      v0Pos[2] + perpOffset[2],
    ];
    const v1Bottom = [
      v1Pos[0] - perpOffset[0],
      v1Pos[1] - perpOffset[1],
      v1Pos[2] - perpOffset[2],
    ];
    const v1Top = [
      v1Pos[0] + perpOffset[0],
      v1Pos[1] + perpOffset[1],
      v1Pos[2] + perpOffset[2],
    ];

    // Create 6 vertices for 2 triangles (quad)
    // Triangle 1: v0Bottom, v1Bottom, v0Top
    // Triangle 2: v0Top, v1Bottom, v1Top
    const quadVertices = [
      { p: v0Bottom, quadIndex: 0 }, // Triangle 1
      { p: v1Bottom, quadIndex: 1 },
      { p: v0Top, quadIndex: 2 },
      { p: v0Top, quadIndex: 2 }, // Triangle 2
      { p: v1Bottom, quadIndex: 1 },
      { p: v1Top, quadIndex: 3 },
    ];

    for (let j = 0; j < 6; j++) {
      const vertex = quadVertices[j];
      edgePositionArray[posIdx++] = vertex.p[0];
      edgePositionArray[posIdx++] = vertex.p[1];
      edgePositionArray[posIdx++] = vertex.p[2];

      // Update quad index
      quadIndexArray[i * 6 + j] = vertex.quadIndex;
    }
  }

  // Create position buffer
  const edgePositionBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: edgePositionArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  const quadIndexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: quadIndexArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Create edge type buffer (normalized 0-1 values for shader)
  // Shader expects normalized values and multiplies by 255
  const edgeTypeArray = new Float32Array(totalVertices);
  for (let i = 0; i < numEdges; i++) {
    const edgeType = edgeData[i].edgeType;
    const normalizedEdgeType = edgeType / 255.0; // Normalize to 0-1 range
    const baseVertex = i * verticesPerEdge;
    for (let j = 0; j < verticesPerEdge; j++) {
      edgeTypeArray[baseVertex + j] = normalizedEdgeType;
    }
  }

  const edgeTypeBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: edgeTypeArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Create index buffer for triangles (sequential indices)
  const triangleIndices = new Array(totalVertices);
  for (let i = 0; i < totalVertices; i++) {
    triangleIndices[i] = i;
  }

  const useUint32 = totalVertices > 65535;
  const indexDatatype = useUint32
    ? IndexDatatype.UNSIGNED_INT
    : IndexDatatype.UNSIGNED_SHORT;
  const indexTypedArray = useUint32
    ? new Uint32Array(triangleIndices)
    : new Uint16Array(triangleIndices);

  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: indexTypedArray,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });

  // Create attributes for CPU-side quad geometry
  const edgeAttributes = [
    // Real position attribute (3 components)
    {
      index: 0, // Use position attribute location
      vertexBuffer: edgePositionBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    // Edge type attribute (for shader - use edgeIndexLocation)
    {
      index: edgeIndexLocation,
      vertexBuffer: edgeTypeBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    // Quad index attribute
    {
      index: quadIndexLocation,
      vertexBuffer: quadIndexBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
  ];

  const vertexArray = new VertexArray({
    context: context,
    indexBuffer: indexBuffer,
    attributes: edgeAttributes,
  });

  // DEBUG: Log first few vertices for test cases
  if (numEdges <= 3) {
    for (let i = 0; i < Math.min(6, totalVertices); i++) {
      // eslint-disable-next-line no-unused-vars
      const x = edgePositionArray[i * 3];
      // eslint-disable-next-line no-unused-vars
      const y = edgePositionArray[i * 3 + 1];
      // eslint-disable-next-line no-unused-vars
      const z = edgePositionArray[i * 3 + 2];
    }
  }

  return {
    vertexArray: vertexArray,
    indexBuffer: indexBuffer,
    indexCount: totalVertices,
    edgeIndexBuffer: edgeTypeBuffer, // Reuse for debugging
    quadIndexBuffer: quadIndexBuffer,
  };
}

// /**
//  * Creates iTwin.js style edge geometry with quads for line rendering
//  * Each edge is rendered as a quad (2 triangles = 6 vertices) using VertexIndices
//  * @param {number[]} edgeIndices Array of edge vertex indices
//  * @param {Object[]} edgeData Array of edge metadata including edge types
//  * @param {Object} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @param {number} edgeIndexLocation The shader location for edge index attribute
//  * @returns {Object|undefined} Edge geometry with vertex array and index buffer
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createITwinStyleEdgeGeometry(
//   edgeIndices,
//   edgeData,
//   renderResources,
//   context,
//   edgeIndexLocation,
//   quadIndexLocation,
// ) {
//   console.log("createITwinStyleEdgeGeometry called:");
//   console.log("  - edgeIndices length:", edgeIndices?.length || 0);
//   console.log("  - edgeData length:", edgeData?.length || 0);

//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     console.log("  - EARLY EXIT: No edge indices");
//     return undefined;
//   }

//   const numEdges = edgeData.length;

//   // iTwin.js style: each edge becomes a quad (6 vertices forming 2 triangles)
//   const verticesPerEdge = 6; // 6 vertices per edge (2 triangles)
//   const totalVertices = numEdges * verticesPerEdge;

//   console.log("  - numEdges:", numEdges);
//   console.log("  - totalVertices:", totalVertices);

//   // SIMPLIFIED: Create position buffer directly with edge endpoint positions
//   // Get original vertex positions from primitive
//   const positionAttribute = ModelUtility.getAttributeBySemantic(
//     renderResources.runtimePrimitive.primitive,
//     VertexAttributeSemantic.POSITION,
//   );

//   let originalPositions;
//   if (defined(positionAttribute.typedArray)) {
//     originalPositions = positionAttribute.typedArray;
//   } else {
//     try {
//       originalPositions =
//         ModelReader.readAttributeAsTypedArray(positionAttribute);
//     } catch (error) {
//       console.error("Cannot access position data:", error);
//       return undefined;
//     }
//   }

//   // Create edge index buffer (each vertex stores the edge index for LUT lookup)
//   const edgeIndexArray = new Float32Array(totalVertices); // Edge index for each vertex
//   // Create quad index array (identifies which vertex in the quad: 0-3)
//   const quadIndexArray = new Float32Array(totalVertices);
//   // eslint-disable-next-line no-unused-vars, prefer-const
//   let posIdx = 0;

//   for (let i = 0; i < numEdges; i++) {
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];

//     // Get positions for both endpoints
//     // eslint-disable-next-line no-unused-vars
//     const v0Pos = [
//       originalPositions[v0Index * 3],
//       originalPositions[v0Index * 3 + 1],
//       originalPositions[v0Index * 3 + 2],
//     ];
//     // eslint-disable-next-line no-unused-vars
//     const v1Pos = [
//       originalPositions[v1Index * 3],
//       originalPositions[v1Index * 3 + 1],
//       originalPositions[v1Index * 3 + 2],
//     ];

//     // iTwin.js style: All 6 vertices store the SAME edge endpoints
//     // The shader will use quadIndex to determine screen-space offset
//     // This creates a proper rectangle in screen space, not model space

//     for (let j = 0; j < 6; j++) {
//       const vertexIndex = i * 6 + j;

//       // All 6 vertices store the same edge index (for LUT lookup)
//       edgeIndexArray[vertexIndex] = i; // Edge index in the LUT

//       // Set quadIndex following iTwin.js pattern (derived from gl_VertexID % 6)
//       if (j === 0) {
//         quadIndexArray[vertexIndex] = 0.0; // First triangle, first vertex
//       } else if (j === 2 || j === 3) {
//         quadIndexArray[vertexIndex] = 1.0; // Middle vertices
//       } else if (j === 1 || j === 4) {
//         quadIndexArray[vertexIndex] = 2.0; // Side vertices
//       } else {
//         // j === 5
//         quadIndexArray[vertexIndex] = 3.0; // Last vertex
//       }
//     }
//   }

//   // Create edge index buffer (for LUT lookup)
//   const edgeIndexBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgeIndexArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // quadIndexArray already filled in the loop above

//   const quadIndexBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: quadIndexArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Create edge type buffer (normalized 0-1 values for shader)
//   // Shader expects normalized values and multiplies by 255
//   const edgeTypeArray = new Float32Array(totalVertices);
//   for (let i = 0; i < numEdges; i++) {
//     const edgeType = edgeData[i].edgeType;
//     const normalizedEdgeType = edgeType / 255.0; // Normalize to 0-1 range
//     const baseVertex = i * verticesPerEdge;
//     for (let j = 0; j < verticesPerEdge; j++) {
//       edgeTypeArray[baseVertex + j] = normalizedEdgeType;
//     }
//   }

//   const edgeTypeBuffer = Buffer.createVertexBuffer({
//     context: context,
//     typedArray: edgeTypeArray,
//     usage: BufferUsage.STATIC_DRAW,
//   });

//   // Create index buffer for triangles (sequential indices)
//   const triangleIndices = new Array(totalVertices);
//   for (let i = 0; i < totalVertices; i++) {
//     triangleIndices[i] = i;
//   }

//   const useUint32 = totalVertices > 65535;
//   const indexDatatype = useUint32
//     ? IndexDatatype.UNSIGNED_INT
//     : IndexDatatype.UNSIGNED_SHORT;
//   const indexTypedArray = useUint32
//     ? new Uint32Array(triangleIndices)
//     : new Uint16Array(triangleIndices);

//   const indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: indexTypedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: indexDatatype,
//   });

//   // Create attributes for iTwin.js style LUT-based edge geometry
//   const edgeAttributes = [
//     // Edge index attribute (for LUT lookup - replaces position)
//     {
//       index: 0, // Use position attribute location for edge index
//       vertexBuffer: edgeIndexBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//     // Edge type attribute (for shader - use edgeIndexLocation)
//     {
//       index: edgeIndexLocation,
//       vertexBuffer: edgeTypeBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//     // Quad index attribute
//     {
//       index: quadIndexLocation,
//       vertexBuffer: quadIndexBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   const vertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   // DEBUG: Log first few vertices for test cases
//   if (numEdges <= 3) {
//     console.log("DEBUG: First few edge indices:");
//     for (let i = 0; i < Math.min(6, totalVertices); i++) {
//       console.log(
//         `  Vertex ${i}: edgeIndex = ${edgeIndexArray[i]}, quadIndex = ${quadIndexArray[i]}`,
//       );
//     }

//     console.log("DEBUG: First few edge types:");
//     for (let i = 0; i < Math.min(6, totalVertices); i++) {
//       console.log(
//         `  Vertex ${i}: edgeType = ${edgeTypeArray[i]}, quadIndex = ${quadIndexArray[i]}`,
//       );
//     }
//   }

//   console.log("createITwinStyleEdgeGeometry SUCCESS:");
//   console.log("  - totalVertices:", totalVertices);
//   console.log("  - indexCount:", totalVertices);

//   return {
//     vertexArray: vertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: totalVertices,
//     edgeIndexBuffer: edgeTypeBuffer, // Reuse for debugging
//     quadIndexBuffer: quadIndexBuffer,
//   };
// }

// /**
//  * Creates iTwin.js style edge LUT data with endpoint indices and normals
//  * @param {number[]} edgeIndices Array of edge vertex indices
//  * @param {Object[]} edgeData Array of edge metadata
//  * @returns {Uint8Array} Edge LUT data in iTwin.js format
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createITwinStyleEdgeLUT(edgeIndices, edgeData) {
//   const numEdges = edgeData.length;

//   // iTwin.js format: 6 bytes per segment edge (2 × 24-bit indices)
//   // For silhouette edges: 10 bytes (2 × 24-bit indices + 4 bytes normals)
//   let totalBytes = 0;
//   // eslint-disable-next-line no-unused-vars
//   // let numSilhouettes = 0;

//   for (let i = 0; i < numEdges; i++) {
//     if (edgeData[i].edgeType === 1) {
//       // Silhouette
//       totalBytes += 10;
//       // numSilhouettes++;
//     } else {
//       // Segment edge
//       totalBytes += 6;
//     }
//   }

//   const lutData = new Uint8Array(totalBytes);
//   let byteOffset = 0;

//   for (let i = 0; i < numEdges; i++) {
//     const v0Index = edgeIndices[i * 2];
//     const v1Index = edgeIndices[i * 2 + 1];
//     const edgeType = edgeData[i].edgeType;

//     // Set first endpoint (24-bit) using VertexIndices helper
//     VertexIndices.encodeIndex(v0Index, lutData, byteOffset);
//     byteOffset += 3;

//     // Set second endpoint (24-bit) using VertexIndices helper
//     VertexIndices.encodeIndex(v1Index, lutData, byteOffset);
//     byteOffset += 3;

//     // For silhouette edges, add normal pair data
//     if (edgeType === 1) {
//       // Add 4 bytes of normal data (placeholder for now)
//       // TODO: Extract actual normal pair data from glTF extension
//       lutData[byteOffset++] = 0; // Normal pair data byte 0
//       lutData[byteOffset++] = 0; // Normal pair data byte 1
//       lutData[byteOffset++] = 0; // Normal pair data byte 2
//       lutData[byteOffset++] = 0; // Normal pair data byte 3
//     }
//   }

//   return lutData;
// }

// /**
//  * Creates a vertex LUT texture containing vertex position data
//  * @param {Object} primitive The primitive containing vertex data
//  * @param {Context} context The rendering context
//  * @returns {Object|undefined} Object with texture and dimensions
//  * @private
//  */
// // eslint-disable-next-line no-unused-vars
// function createVertexLUTTexture(primitive, context) {
//   // Find the position attribute using ModelUtility
//   const positionAttribute = ModelUtility.getAttributeBySemantic(
//     primitive,
//     VertexAttributeSemantic.POSITION,
//   );

//   if (!defined(positionAttribute)) {
//     console.error("EdgeVisibilityPipelineStage: No position attribute found");
//     return undefined;
//   }

//   // Try multiple ways to access position data
//   let positionData;

//   // Method 1: Direct typedArray access (as used in pickModel.js)
//   if (defined(positionAttribute.typedArray)) {
//     positionData = positionAttribute.typedArray;
//   }
//   // Method 2: Use ModelReader for robust data access
//   else {
//     try {
//       positionData = ModelReader.readAttributeAsTypedArray(positionAttribute);
//     } catch (error) {
//       console.error(
//         "EdgeVisibilityPipelineStage: Cannot access position data for vertex LUT:",
//         error,
//       );
//       return undefined;
//     }
//   }

//   if (!defined(positionData)) {
//     console.error("EdgeVisibilityPipelineStage: Position data is undefined");
//     return undefined;
//   }

//   const vertexCount = positionAttribute.count;
//   const componentsPerVertex = 3; // Assuming VEC3 positions

//   // Calculate texture dimensions
//   const textureWidth = Math.max(1, Math.ceil(Math.sqrt(vertexCount)));
//   const textureHeight = Math.max(1, Math.ceil(vertexCount / textureWidth));
//   const totalTexels = textureWidth * textureHeight;

//   // Create texture data array (RGBA format, but we only use RGB for position)
//   const textureData = new Float32Array(totalTexels * 4);

//   // Fill texture with vertex position data
//   for (let i = 0; i < vertexCount; i++) {
//     const texelIndex = i * 4;
//     const vertexIndex = i * componentsPerVertex;

//     // Copy position data (XYZ)
//     textureData[texelIndex] = positionData[vertexIndex]; // X
//     textureData[texelIndex + 1] = positionData[vertexIndex + 1]; // Y
//     textureData[texelIndex + 2] = positionData[vertexIndex + 2]; // Z
//     textureData[texelIndex + 3] = 1.0; // W component
//   }

//   // Fill remaining texels with zeros
//   for (let i = vertexCount; i < totalTexels; i++) {
//     const texelIndex = i * 4;
//     textureData[texelIndex] = 0.0;
//     textureData[texelIndex + 1] = 0.0;
//     textureData[texelIndex + 2] = 0.0;
//     textureData[texelIndex + 3] = 1.0;
//   }

//   // Create texture
//   const texture = new Texture({
//     context: context,
//     width: textureWidth,
//     height: textureHeight,
//     pixelFormat: PixelFormat.RGBA,
//     pixelDatatype: PixelDatatype.FLOAT,
//     source: {
//       arrayBufferView: textureData,
//     },
//     sampler: new Sampler({
//       wrapS: TextureWrap.CLAMP_TO_EDGE,
//       wrapT: TextureWrap.CLAMP_TO_EDGE,
//       minificationFilter: TextureMinificationFilter.NEAREST,
//       magnificationFilter: TextureMagnificationFilter.NEAREST,
//     }),
//   });

//   return {
//     texture: texture,
//     width: textureWidth,
//     height: textureHeight,
//   };
// }

export default EdgeVisibilityPipelineStage;
