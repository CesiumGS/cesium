import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import Texture from "../../Renderer/Texture.js";
import PixelFormat from "../../Core/PixelFormat.js";
import PixelDatatype from "../../Renderer/PixelDatatype.js";
import Sampler from "../../Renderer/Sampler.js";
import TextureMinificationFilter from "../../Renderer/TextureMinificationFilter.js";
import TextureMagnificationFilter from "../../Renderer/TextureMagnificationFilter.js";
import ModelReader from "./ModelReader.js";

/**
 * Holds an array of indices into a VertexTable. Each index is a 24-bit unsigned integer.
 * Similar to iTwin.js VertexIndices class - private helper for EdgeVisibilityPipelineStage.
 * @private
 */
class VertexIndices {
  constructor(data) {
    this.data = data;
    if (this.data.length % 3 !== 0) {
      throw new Error("VertexIndices data length must be a multiple of 3");
    }
  }

  get length() {
    return this.data.length / 3;
  }

  static encodeIndex(index, bytes, byteIndex) {
    if (byteIndex + 2 >= bytes.length) {
      throw new Error("Byte index out of bounds");
    }
    bytes[byteIndex + 0] = index & 0x000000ff;
    bytes[byteIndex + 1] = (index & 0x0000ff00) >> 8;
    bytes[byteIndex + 2] = (index & 0x00ff0000) >> 16;
  }

  setNthIndex(n, value) {
    VertexIndices.encodeIndex(value, this.data, n * 3);
  }

  getNthIndex(n) {
    return this.decodeIndex(n);
  }

  decodeIndex(index) {
    if (index >= this.length) {
      throw new Error("Index out of bounds");
    }
    const byteIndex = index * 3;
    return (
      this.data[byteIndex] |
      (this.data[byteIndex + 1] << 8) |
      (this.data[byteIndex + 2] << 16)
    );
  }
}

/**
 * Utility function to set a 24-bit unsigned integer in a byte array.
 * Private helper for EdgeVisibilityPipelineStage.
 * @private
 */
function setUint24(array, byteIndex, value) {
  array[byteIndex + 0] = value & 0xff;
  array[byteIndex + 1] = (value >> 8) & 0xff;
  array[byteIndex + 2] = (value >> 16) & 0xff;
}

/**
 * Pipeline stage for generating edge geometry from EXT_mesh_primitive_edge_visibility data.
 *
 * @namespace EdgeVisibilityPipelineStage
 *
 * @private
 */
const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

// Update Function -----------------------------------------------------------------------------------------------------------------------
/**
 *
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
  console.log("=== EdgeVisibilityPipelineStage.process called ===");
  console.log("primitive.edgeVisibility:", primitive.edgeVisibility);

  if (!defined(primitive.edgeVisibility)) {
    console.log("No edge visibility data found, returning");
    return;
  }

  // Check if we have the required edge visibility data
  if (!defined(primitive.edgeVisibility.visibility)) {
    return;
  }

  // Create a simple edge geometry that doesn't require typed array access
  // This approach uses the edge visibility buffer directly in shaders
  const edgeGeometry = createEdgeGeometryFromVisibilityBuffer(
    primitive,
    renderResources,
    frameState.context,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Store edge geometry for ModelDrawCommand to create edge commands
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.TRIANGLES, // Use triangles for quad-based edges
    pass: Pass.CESIUM_3D_TILE,
    edgeLUT: edgeGeometry.edgeLUT, // Edge lookup texture
    edgeCount: edgeGeometry.edgeCount,
    // Uniforms for shader
    edgeParams: [
      edgeGeometry.lutWidth,
      edgeGeometry.lutHeight,
      edgeGeometry.edgeCount, // numSegments (all edges are segments for hard edges)
      0, // silhouettePadding (not used for hard edges)
    ],
    // Reference to original indices for GPU lookup
    originalIndicesBuffer: primitive.indices,
  };

  // Track resources for cleanup
  const model = renderResources.model;
  model._pipelineResources.push(
    edgeGeometry.indexBuffer,
    edgeGeometry.vertexArray,
    edgeGeometry.edgeLUT,
  );
};

// Buffer & LUT creation -------------------------------------------------------------------------------------------------------------------
/**
 * Creates edge geometry from EXT_mesh_primitive_edge_visibility data using texture LUT.
 * Uses RGBA8 texture for edge lookup table with 24-bit edge indices.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @returns {Object} Edge geometry with vertex array and texture LUT
 * @private
 */
function createEdgeGeometryFromVisibilityBuffer(
  primitive,
  renderResources,
  context,
) {
  const edgeVisibility = primitive.edgeVisibility;
  if (!defined(edgeVisibility.visibility)) {
    return undefined;
  }

  // Extract visible edges by decoding the visibility bitfield
  const visibleEdges = extractVisibleEdges(primitive);
  if (!visibleEdges || visibleEdges.length === 0) {
    return undefined;
  }

  const numTotalEdges = visibleEdges.length;

  console.log("=== EdgeVisibilityPipelineStage Debug ===");
  console.log(`Total visible edges: ${numTotalEdges}`);
  console.log("Visible edges data:", visibleEdges);

  const vertexIndices = new VertexIndices(
    new Uint8Array(numTotalEdges * 6 * 3),
  );
  for (let i = 0; i < numTotalEdges; i++) {
    for (let j = 0; j < 6; j++) {
      const vertexIndex = i * 6 + j;
      console.log(`Setting vertex ${vertexIndex} to edge index ${i}`);
      vertexIndices.setNthIndex(vertexIndex, i); // Each vertex of the quad stores the same edge index
      // Verify it was set correctly
      const readBack = vertexIndices.getNthIndex(vertexIndex);
      console.log(
        `  Verification: vertex ${vertexIndex} now has value ${readBack}`,
      );
    }
  }

  console.log(
    `VertexIndices created: ${vertexIndices.length} vertices (${numTotalEdges} edges × 6 vertices/edge)`,
  );

  // Debug: Show decoded vertex indices (not raw bytes)
  const decodedIndices = [];
  for (let i = 0; i < Math.min(18, vertexIndices.length); i++) {
    decodedIndices.push(`${i}:${vertexIndices.decodeIndex(i)}`);
  }
  console.log("First few vertex indices (decoded):", decodedIndices.join(", "));

  // Also show raw bytes for verification
  console.log(
    "Raw vertex index bytes (first 18):",
    Array.from(vertexIndices.data.slice(0, 18))
      .map((b, i) => `${i}:${b}`)
      .join(", "),
  );

  // Create edge LUT texture data
  // Each edge occupies 6 bytes: triangleIndex(3) + edgeInTriangle(1) + padding(2)
  const bytesPerEdge = 6;
  const totalBytes = numTotalEdges * bytesPerEdge;

  // Calculate texture dimensions with row alignment
  // Width must be multiple of 3 to avoid cross-row sampling (width % 3 == 0)
  // Since each texel is 4 bytes (RGBA), and we need 6 bytes per edge (1.5 texels),
  // we need width * 4 to be multiple of 12 (LCM of 6 and 4)
  let width = Math.ceil(Math.sqrt(totalBytes / 4));
  while (width % 3 !== 0) {
    width++;
  }

  const texelsNeeded = Math.ceil(totalBytes / 4);
  const height = Math.ceil(texelsNeeded / width);
  const textureSize = width * height * 4; // RGBA8

  const lutData = new Uint8Array(textureSize);
  lutData.fill(0); // Initialize with zeros

  console.log(
    `LUT dimensions: ${width}x${height}, total bytes: ${textureSize}`,
  );
  console.log(`Bytes per edge: ${bytesPerEdge}, total edges: ${numTotalEdges}`);

  // Fill edge LUT data using iTwin.js pattern
  // Store index0 and index1 (actual vertex indices) in LUT for GPU lookup
  for (let i = 0; i < numTotalEdges; i++) {
    const edge = visibleEdges[i];

    // Store vertex indices in LUT following iTwin.js pattern
    const byteOffset = i * bytesPerEdge;

    // index0 (24-bit) using setUint24 - first vertex of edge
    setUint24(lutData, byteOffset, edge.index0);

    // index1 (24-bit) using setUint24 - second vertex of edge
    setUint24(lutData, byteOffset + 3, edge.index1);

    // Verify 24-bit encoding by decoding both indices back
    const decodedIndex0 =
      lutData[byteOffset] |
      (lutData[byteOffset + 1] << 8) |
      (lutData[byteOffset + 2] << 16);
    const decodedIndex1 =
      lutData[byteOffset + 3] |
      (lutData[byteOffset + 4] << 8) |
      (lutData[byteOffset + 5] << 16);

    console.log(
      `Edge ${i}: triangle=${edge.triangleIndex}, edgeInTriangle=${edge.edgeInTriangle}, vertices=${edge.index0}→${edge.index1}, visibility=${edge.visibility}`,
    );
    console.log(
      `  Stored at byte offset ${byteOffset}: [${lutData[byteOffset]}, ${lutData[byteOffset + 1]}, ${lutData[byteOffset + 2]}, ${lutData[byteOffset + 3]}, ${lutData[byteOffset + 4]}, ${lutData[byteOffset + 5]}]`,
    );
    console.log(
      `  Verification: decoded indices = ${decodedIndex0}, ${decodedIndex1} (should be ${edge.index0}, ${edge.index1})`,
    );
  }

  // Print the complete LUT data for verification
  console.log("Complete LUT data (first 64 bytes):");
  const lutPreview = Array.from(lutData.slice(0, Math.min(64, lutData.length)));
  console.log(lutPreview.map((b, i) => `${i}:${b}`).join(", "));

  // Create edge LUT texture
  const edgeLUT = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    source: {
      width: width,
      height: height,
      arrayBufferView: lutData,
    },
    sampler: new Sampler({
      minificationFilter: TextureMinificationFilter.NEAREST,
      magnificationFilter: TextureMagnificationFilter.NEAREST,
    }),
  });

  // Create vertex buffer for edge indices using VertexIndices data
  const edgeIndexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: vertexIndices.data, // Use the 24-bit encoded data directly
    usage: BufferUsage.STATIC_DRAW,
  });

  // Create vertex array with 24-bit edge index attribute
  const attributes = [
    {
      index: 0, // a_pos attribute (24-bit edge index)
      vertexBuffer: edgeIndexBuffer,
      componentsPerAttribute: 3, // 3 bytes for 24-bit index
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      offsetInBytes: 0,
      strideInBytes: 3, // 3 bytes per vertex
    },
  ];

  // Create render index buffer with: each edge forms 2 triangles (6 vertices)
  // Each edge: 0,2,1, 1,2,3 pattern for quad triangulation
  const renderIndices = new Uint32Array(numTotalEdges * 6);
  for (let i = 0; i < numTotalEdges; i++) {
    const baseVertex = i * 6;

    // First triangle: 0,2,1
    renderIndices[i * 6 + 0] = baseVertex + 0;
    renderIndices[i * 6 + 1] = baseVertex + 2;
    renderIndices[i * 6 + 2] = baseVertex + 1;

    // Second triangle: 1,2,3
    renderIndices[i * 6 + 3] = baseVertex + 1;
    renderIndices[i * 6 + 4] = baseVertex + 2;
    renderIndices[i * 6 + 5] = baseVertex + 3;
  }

  const renderIndexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: renderIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_INT,
  });

  const vertexArray = new VertexArray({
    context: context,
    attributes: attributes,
    indexBuffer: renderIndexBuffer,
  });

  console.log("=== Edge Geometry Summary ===");
  console.log(
    `Created ${numTotalEdges} edges with ${numTotalEdges * 6} total vertices`,
  );
  console.log(`LUT texture: ${width}x${height} (${width * height * 4} bytes)`);
  console.log(`Vertex indices buffer: ${vertexIndices.data.length} bytes`);
  console.log(`Render indices buffer: ${renderIndices.length * 4} bytes`);
  console.log("=====================================");

  return {
    vertexArray: vertexArray,
    indexBuffer: renderIndexBuffer,
    indexCount: numTotalEdges * 6, // 6 indices per edge
    edgeLUT: edgeLUT,
    edgeCount: numTotalEdges,
    lutWidth: width,
    lutHeight: height,
  };
}

// Decode edge visibility information from the primitive ------------------------------------------------------------------------------------
/**
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {Array} Array of edge visibility information with actual vertex indices
 * @private
 */
function extractVisibleEdges(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibilityBuffer = edgeVisibility.visibility;

  // Get triangle count from indices
  const indices = primitive.indices;
  if (!defined(indices) || !defined(indices.count)) {
    return undefined;
  }

  const triangleCount = indices.count / 3;

  // Read the actual vertex indices from the index buffer
  const indexArray = ModelReader.readIndicesAsTypedArray(indices);

  console.log("=== extractVisibleEdges Debug ===");
  console.log(`Triangle count: ${triangleCount}`);
  console.log(`Index array length: ${indexArray.length}`);
  console.log(`Index array type: ${indexArray.constructor.name}`);
  console.log("First few indices:", Array.from(indexArray.slice(0, 12)));

  // Get visibility data - this is a packed bitfield with 2 bits per edge
  const visibilityData = visibilityBuffer.buffer;
  const visibilityBytes = new Uint8Array(visibilityData);

  const edges = [];

  // Process each triangle's edges
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
    // Get the three vertex indices for this triangle
    const vertexA = indexArray[triangleIndex * 3 + 0];
    const vertexB = indexArray[triangleIndex * 3 + 1];
    const vertexC = indexArray[triangleIndex * 3 + 2];

    // Three edges per triangle: AB, BC, CA
    const triangleEdges = [
      { a: vertexA, b: vertexB, edgeInTriangle: 0 },
      { a: vertexB, b: vertexC, edgeInTriangle: 1 },
      { a: vertexC, b: vertexA, edgeInTriangle: 2 },
    ];

    for (let edgeInTriangle = 0; edgeInTriangle < 3; edgeInTriangle++) {
      const globalEdgeIndex = triangleIndex * 3 + edgeInTriangle;

      // Extract 2-bit visibility value from packed data
      const byteIndex = Math.floor(globalEdgeIndex / 4); // 4 edges per byte (2 bits each)
      const bitOffset = (globalEdgeIndex % 4) * 2;

      if (byteIndex < visibilityBytes.length) {
        const visibilityByte = visibilityBytes[byteIndex];
        const visibility = (visibilityByte >> bitOffset) & 0x03;

        // Only include hard edges (VISIBLE=2)
        // Skip HIDDEN=0, SILHOUETTE=1, VISIBLE_DUPLICATE=3
        if (visibility === 2) {
          const edge = triangleEdges[edgeInTriangle];

          // Store actual vertex indices following iTwin.js pattern
          // index0 = min, index1 = max for consistent edge orientation
          const index0 = Math.min(edge.a, edge.b);
          const index1 = Math.max(edge.a, edge.b);

          edges.push({
            index0: index0,
            index1: index1,
            triangleIndex: triangleIndex,
            edgeInTriangle: edgeInTriangle,
            visibility: visibility,
          });

          console.log(
            `Visible edge ${edges.length - 1}: triangle=${triangleIndex}, edge=${edgeInTriangle}, vertices=${edge.a},${edge.b} → indices=${index0},${index1}, visibility=${visibility}`,
          );
        }
      }
    }
  }

  console.log(`Total visible edges extracted: ${edges.length}`);
  console.log("===================================");

  return edges;
}

export default EdgeVisibilityPipelineStage;
