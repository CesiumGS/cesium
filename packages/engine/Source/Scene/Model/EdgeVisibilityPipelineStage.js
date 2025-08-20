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

  console.log("EdgeVisibilityPipelineStage: Starting shader builder setup");

  // Step 3: Add basic functionality to create edge rendering
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );

  // Must add EdgeVisibilityStageFS when HAS_EDGE_VISIBILITY is defined
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);

  console.log(
    "EdgeVisibilityPipelineStage: Added HAS_EDGE_VISIBILITY define and fragment shader",
  );

  // Add edge type attribute and varying for color coding
  const edgeTypeLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  shaderBuilder.addVarying("float", "v_edgeType");

  // Add vertex shader code to pass edge type to fragment shader
  shaderBuilder.addFunctionLines("setDynamicVaryingsVS", [
    "#ifdef HAS_EDGE_VISIBILITY",
    "v_edgeType = a_edgeType;",
    "#endif",
  ]);

  console.log(
    "EdgeVisibilityPipelineStage: Added edge type attribute and varying",
  );

  // Extract visible edges as line indices (pairs of vertex indices)
  const edgeResult = extractVisibleEdgesAsLineIndices(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.lineIndices) ||
    edgeResult.lineIndices.length === 0
  ) {
    console.log("EdgeVisibilityPipelineStage: No visible edges found");
    return;
  }

  console.log(
    `EdgeVisibilityPipelineStage: Found ${edgeResult.lineIndices.length / 2} edges to render`,
  );

  // Create edge geometry with edge type data
  const edgeGeometry = createEdgeGeometryWithTypes(
    edgeResult.lineIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeTypeLocation,
  );

  if (!defined(edgeGeometry)) {
    console.log("EdgeVisibilityPipelineStage: Failed to create edge geometry");
    return;
  }

  // Store edge geometry for ModelDrawCommand to create edge commands
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
  };

  console.log(
    "EdgeVisibilityPipelineStage: Created edge geometry with type data",
  );
};

/**
 * Extracts visible edge segments from EXT_mesh_primitive_edge_visibility data
 * and converts them to line indices for GL_LINES rendering.
 * Only includes edges that need to be processed: silhouette (1) and hard (2).
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {{lineIndices:number[], edgeData:Object[], silhouetteEdgeCount:number}}
 * @private
 */
function extractVisibleEdgesAsLineIndices(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;

  if (!defined(visibility) || !defined(indices)) {
    return [];
  }

  const triangleIndexArray = indices.typedArray;
  const vertexCount = primitive.attributes[0].count;
  const lineIndices = [];
  const edgeData = []; // Store additional edge data for shader
  const seenEdgeHashes = new Set();
  let silhouetteEdgeCount = 0; // Track silhouette edges for silhouetteMates mapping

  // 2 bits per edge in order (v0:v1, v1:v2, v2:v0)
  let bitOffset = 0;
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
      const byteIndex = Math.floor(bitOffset / 4);
      const bitPairOffset = (bitOffset % 4) * 2;
      if (byteIndex >= visibility.length) {
        break;
      }

      const byte = visibility[byteIndex];
      const visibility2Bit = (byte >> bitPairOffset) & 0x3;
      bitOffset++;

      // Only include edges that need processing
      let shouldIncludeEdge = false;
      switch (visibility2Bit) {
        case 0: // HIDDEN - never rendered
          shouldIncludeEdge = false;
          break;
        case 1: // SILHOUETTE - needs shader visibility calculation
          shouldIncludeEdge = true;
          break;
        case 2: // HARD - always rendered
          shouldIncludeEdge = true;
          break;
        case 3: // REPEATED - TEMP: include for testing blue color
          shouldIncludeEdge = true; // TEMP: was false
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
          lineIndices.push(a, b); // Add line segment

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

  return { lineIndices, edgeData, silhouetteEdgeCount };
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
// function createLineEdgeGeometry(
//   edgeIndices,
//   edgeData,
//   edgeVisibility,
//   renderResources,
//   context,
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
//     if (edgeType === 1 && defined(edgeVisibility.silhouetteMates) && edgeInfo.mateVertexIndex >= 0) {
//       const silhouetteMates = edgeVisibility.silhouetteMates.typedArray;
//       const mateVertexIndex = silhouetteMates[edgeInfo.mateVertexIndex];
//       matePos = getVertexPosition(
//         mateVertexIndex,
//         positionBuffer,
//         positionComponentDatatype,
//       );
//     }

//     // Fill data for both edge endpoints (edge domain vertices)
//     const edgeVertex0Index = i * 2;     // First endpoint of edge i
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
//   const edgePos0Buffer = createBuffer(edgePos0Array);
//   const edgePos1Buffer = createBuffer(edgePos1Array);
//   const currentTriThirdBuffer = createBuffer(currentTriThirdArray);

//   // Create edge domain VAO attributes (completely separate from mesh domain)
//   const shaderBuilder = renderResources.shaderBuilder;

//   // Find the position attribute location (usually 0)
//   const positionLocation = renderResources.attributes.find(
//     (attr) => attr.semantic === "POSITION" || attr.index === 0,
//   )?.index || 0;

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
//       index: shaderBuilder._attributeLocations.a_edgeType,
//       vertexBuffer: edgeTypeBuffer,
//       componentsPerAttribute: 1,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     },
//   ];

//   // Add basic attributes that Cesium's shader pipeline might require
//   // Find original attributes and create dummy versions for edge domain
//   const originalAttributes = renderResources.attributes;
//   for (let i = 0; i < originalAttributes.length; i++) {
//     const attr = originalAttributes[i];

//     // Skip position (already handled) and edge-specific attributes
//     if (attr.index === positionLocation ||
//         attr.index === shaderBuilder._attributeLocations.a_edgeType) {
//       continue;
//     }

//     // Create dummy buffer with same structure but for edge domain
//     let dummyData;
//     if (attr.componentsPerAttribute === 3) {
//       dummyData = new Float32Array(edgeVertexCount * 3);
//       // Fill with default values (e.g., normal = [0,0,1])
//       if (attr.semantic === "NORMAL") {
//         for (let j = 0; j < edgeVertexCount; j++) {
//           dummyData[j * 3] = 0;
//           dummyData[j * 3 + 1] = 0;
//           dummyData[j * 3 + 2] = 1;
//         }
//       }
//     } else if (attr.componentsPerAttribute === 4) {
//       dummyData = new Float32Array(edgeVertexCount * 4);
//       // Fill with default values (e.g., color = [1,1,1,1])
//       for (let j = 0; j < edgeVertexCount; j++) {
//         dummyData[j * 4] = 1;
//         dummyData[j * 4 + 1] = 1;
//         dummyData[j * 4 + 2] = 1;
//         dummyData[j * 4 + 3] = 1;
//       }
//     } else if (attr.componentsPerAttribute === 1) {
//       dummyData = new Float32Array(edgeVertexCount);
//       // Fill with default values (e.g., featureId = 0)
//       dummyData.fill(0);
//     } else {
//       // Skip unknown attribute types
//       continue;
//     }

//     const dummyBuffer = createBuffer(dummyData);
//     edgeAttributes.push({
//       index: attr.index,
//       vertexBuffer: dummyBuffer,
//       componentsPerAttribute: attr.componentsPerAttribute,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: attr.normalize || false,
//     });

//     console.log(`Added dummy attribute for location ${attr.index} (${attr.semantic || 'unknown'}) to edge VAO`);
//   }

//   // Add additional edge attributes only if needed for silhouette calculation
//   if (shaderBuilder._attributeLocations.a_edgePos0) {
//     edgeAttributes.push({
//       index: shaderBuilder._attributeLocations.a_edgePos0,
//       vertexBuffer: edgePos0Buffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     });
//   }

//   if (shaderBuilder._attributeLocations.a_edgePos1) {
//     edgeAttributes.push({
//       index: shaderBuilder._attributeLocations.a_edgePos1,
//       vertexBuffer: edgePos1Buffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     });
//   }

//   if (shaderBuilder._attributeLocations.a_currentTriThird) {
//     edgeAttributes.push({
//       index: shaderBuilder._attributeLocations.a_currentTriThird,
//       vertexBuffer: currentTriThirdBuffer,
//       componentsPerAttribute: 3,
//       componentDatatype: ComponentDatatype.FLOAT,
//       normalize: false,
//     });
//   }

//   let mateTriThirdBuffer = null;
//   if (mateTriThirdArray) {
//     mateTriThirdBuffer = createBuffer(mateTriThirdArray);
//     const mateLocation = shaderBuilder._attributeLocations.a_mateTriThird;
//     if (defined(mateLocation)) {
//       edgeAttributes.push({
//         index: mateLocation,
//         vertexBuffer: mateTriThirdBuffer,
//         componentsPerAttribute: 3,
//         componentDatatype: ComponentDatatype.FLOAT,
//         normalize: false,
//       });
//     }
//     console.log("Silhouette mate positions prepared for", edgeCount, "edges");
//   }

//   // Create edge domain VAO - completely separate from mesh domain
//   const edgeVertexArray = new VertexArray({
//     context: context,
//     indexBuffer: indexBuffer,
//     attributes: edgeAttributes,
//   });

//   console.log(`Created edge domain VAO with ${edgeVertexCount} vertices and ${edgeLocalIndices.length} indices`);
//   console.log(`Edge domain uses local indices [0,1, 2,3, 4,5, ...] instead of mesh indices`);

//   return {
//     vertexArray: edgeVertexArray,
//     indexBuffer: indexBuffer,
//     indexCount: edgeLocalIndices.length,
//     edgePositionBuffer: edgePositionBuffer,
//     edgeTypeBuffer: edgeTypeBuffer,
//     edgePos0Buffer: edgePos0Buffer,
//     edgePos1Buffer: edgePos1Buffer,
//     currentTriThirdBuffer: currentTriThirdBuffer,
//     mateTriThirdBuffer: mateTriThirdBuffer,
//   };
// }

/**
 * Creates edge geometry with edge type data for color coding
 * This version adds edge type information while using original mesh positions
 * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
 * @param {Object[]} edgeData Edge metadata including edge types
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @param {number} edgeTypeLocation The shader location for edge type attribute
 * @returns {Object|undefined} Edge geometry with vertex array and index buffer
 * @private
 */
function createEdgeGeometryWithTypes(
  edgeIndices,
  edgeData,
  renderResources,
  context,
  edgeTypeLocation,
) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  // Use original mesh vertex indices directly
  const useUint32 = Math.max(...edgeIndices) > 65535;
  const indexDatatype = useUint32
    ? IndexDatatype.UNSIGNED_INT
    : IndexDatatype.UNSIGNED_SHORT;
  const indexTypedArray = useUint32
    ? new Uint32Array(edgeIndices)
    : new Uint16Array(edgeIndices);

  // Create index buffer for line indices
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: indexTypedArray,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });

  // Get original vertex count from position attribute
  const positionAttribute = renderResources.attributes.find(
    (attr) => attr.semantic === "POSITION" || attr.index === 0,
  );
  const vertexCount = positionAttribute.count;

  // Create edge type array - one value per original mesh vertex
  const edgeTypeArray = new Float32Array(vertexCount);
  edgeTypeArray.fill(0); // Default to HIDDEN (0)

  // Fill edge type data based on which edges use each vertex
  for (let i = 0; i < edgeData.length; i++) {
    const edgeInfo = edgeData[i];
    const edgeType = edgeInfo.edgeType;
    const v0Index = edgeIndices[i * 2];
    const v1Index = edgeIndices[i * 2 + 1];

    // Set edge type for both vertices of this edge
    edgeTypeArray[v0Index] = edgeType;
    edgeTypeArray[v1Index] = edgeType;
  }

  console.log(
    `Created edge type array with ${vertexCount} vertices, found ${edgeData.length} edges`,
  );

  // Create edge type buffer
  const edgeTypeBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: edgeTypeArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Combine original mesh attributes with edge type attribute
  const edgeAttributes = [
    ...renderResources.attributes, // Keep all original mesh attributes
    {
      index: edgeTypeLocation,
      vertexBuffer: edgeTypeBuffer,
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

  return {
    vertexArray: vertexArray,
    indexBuffer: indexBuffer,
    indexCount: edgeIndices.length,
    edgeTypeBuffer: edgeTypeBuffer,
  };
}

// /**
//  * Creates simple line edge geometry using original mesh attributes
//  * This is a simplified version that avoids the complex edge domain VAO issues
//  * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
//  * @param {PrimitiveRenderResources} renderResources The render resources
//  * @param {Context} context The rendering context
//  * @returns {Object|undefined} Simple edge geometry with vertex array and index buffer
//  * @private
//  */
// function createSimpleLineEdgeGeometry(edgeIndices, renderResources, context) {
//   if (!defined(edgeIndices) || edgeIndices.length === 0) {
//     return undefined;
//   }

//   // Use original mesh vertex indices directly
//   const useUint32 = Math.max(...edgeIndices) > 65535;
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

export default EdgeVisibilityPipelineStage;
