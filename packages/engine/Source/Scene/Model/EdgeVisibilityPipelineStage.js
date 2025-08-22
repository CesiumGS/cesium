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

  // Add a uniform to distinguish between original geometry pass and edge pass
  shaderBuilder.addUniform("bool", "u_isEdgePass", ShaderDestination.BOTH);

  // Add edge type attribute and varying
  const edgeTypeLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  shaderBuilder.addVarying("float", "v_edgeType", "flat");

  // Add silhouette normal attribute and varying for silhouette edges
  const silhouetteNormalLocation = shaderBuilder.addAttribute(
    "vec3",
    "a_silhouetteNormal",
  );
  shaderBuilder.addVarying("vec3", "v_silhouetteNormalView", "flat");

  // Add face normal attributes for silhouette detection
  const faceNormalALocation = shaderBuilder.addAttribute(
    "vec3",
    "a_faceNormalA",
  );
  const faceNormalBLocation = shaderBuilder.addAttribute(
    "vec3",
    "a_faceNormalB",
  );
  shaderBuilder.addVarying("vec3", "v_faceNormalAView", "flat");
  shaderBuilder.addVarying("vec3", "v_faceNormalBView", "flat");

  // Add varying for view space position for perspective-correct silhouette detection
  shaderBuilder.addVarying("vec3", "v_positionView", "");

  // Pass edge type, silhouette normal, and face normals from vertex to fragment shader
  shaderBuilder.addFunctionLines("setDynamicVaryingsVS", [
    "#ifdef HAS_EDGE_VISIBILITY",
    "  v_edgeType = a_edgeType;",
    "  // Transform normals from model space to view space",
    "  v_silhouetteNormalView = czm_normal * a_silhouetteNormal;",
    "  v_faceNormalAView = czm_normal * a_faceNormalA;",
    "  v_faceNormalBView = czm_normal * a_faceNormalB;",
    "  // Pass view space position for perspective-correct silhouette detection",
    "  // Use the edge position from attributes (edge domain VAO provides correct positions)",
    "  v_positionView = (czm_modelView * vec4(attributes.positionMC, 1.0)).xyz;",
    "#endif",
  ]);

  // Build triangle adjacency and compute face normals
  const adjacencyData = buildTriangleAdjacency(primitive);

  const edgeResult = extractVisibleEdges(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.edgeIndices) ||
    edgeResult.edgeIndices.length === 0
  ) {
    return;
  }

  // Generate face normals for edges
  const edgeFaceNormals = generateEdgeFaceNormals(
    adjacencyData,
    edgeResult.edgeIndices,
  );

  // Create edge geometry
  const edgeGeometry = createCPULineEdgeGeometry(
    edgeResult.edgeIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeTypeLocation,
    silhouetteNormalLocation,
    faceNormalALocation,
    faceNormalBLocation,
    primitive.edgeVisibility,
    edgeFaceNormals,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Set default value for u_isEdgePass uniform (false for original geometry pass)
  renderResources.uniformMap.u_isEdgePass = function () {
    return false;
  };

  // Store edge geometry for rendering
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
  };
};

/**
 * Builds triangle adjacency and face normals for silhouette detection
 * @param {ModelComponents.Primitive} primitive The primitive containing triangle data
 * @returns {{edgeMap:Map, faceNormals:Float32Array, triangleCount:number}}
 * @private
 */
function buildTriangleAdjacency(primitive) {
  const indices = primitive.indices;
  if (!defined(indices)) {
    return {
      edgeMap: new Map(),
      faceNormals: new Float32Array(0),
      triangleCount: 0,
    };
  }

  const triangleIndexArray = indices.typedArray;
  const triangleCount = Math.floor(triangleIndexArray.length / 3);

  // Get vertex positions for face normal calculation
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );

  const positions = defined(positionAttribute.typedArray)
    ? positionAttribute.typedArray
    : ModelReader.readAttributeAsTypedArray(positionAttribute);

  // Build edge map: key = "min,max", value = [triangleA, triangleB?]
  const edgeMap = new Map();

  // Calculate face normals for each triangle (model space)
  const faceNormals = new Float32Array(triangleCount * 3);

  for (let t = 0; t < triangleCount; t++) {
    const i0 = triangleIndexArray[t * 3];
    const i1 = triangleIndexArray[t * 3 + 1];
    const i2 = triangleIndexArray[t * 3 + 2];

    // Get triangle vertices
    const p0 = [
      positions[i0 * 3],
      positions[i0 * 3 + 1],
      positions[i0 * 3 + 2],
    ];
    const p1 = [
      positions[i1 * 3],
      positions[i1 * 3 + 1],
      positions[i1 * 3 + 2],
    ];
    const p2 = [
      positions[i2 * 3],
      positions[i2 * 3 + 1],
      positions[i2 * 3 + 2],
    ];

    // Calculate face normal: normalize(cross(e1, e2))
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

    // Cross product: e1 × e2
    const cross = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];

    // Normalize
    const length = Math.sqrt(
      cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2],
    );
    if (length > 0) {
      cross[0] /= length;
      cross[1] /= length;
      cross[2] /= length;
    }

    // Store face normal
    faceNormals[t * 3] = cross[0];
    faceNormals[t * 3 + 1] = cross[1];
    faceNormals[t * 3 + 2] = cross[2];

    // Add triangle to edge map for each edge
    const edges = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ];

    for (const [a, b] of edges) {
      const edgeKey = `${Math.min(a, b)},${Math.max(a, b)}`;

      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, []);
      }

      const triangleList = edgeMap.get(edgeKey);
      if (triangleList.length < 2) {
        triangleList.push(t);
      }
    }
  }

  return { edgeMap, faceNormals, triangleCount };
}

/**
 * Generates computed face normals for edges based on triangle adjacency
 * @param {Object} adjacencyData The adjacency data from buildTriangleAdjacency
 * @param {number[]} edgeIndices Array of edge vertex indices
 * @returns {Float32Array} Array of face normal pairs for each edge
 * @private
 */
function generateEdgeFaceNormals(adjacencyData, edgeIndices) {
  const { edgeMap, faceNormals } = adjacencyData;
  const numEdges = edgeIndices.length / 2;

  // Each edge needs 2 face normals (left and right side)
  const edgeFaceNormals = new Float32Array(numEdges * 6); // 2 normals * 3 components each

  for (let i = 0; i < numEdges; i++) {
    const a = edgeIndices[i * 2];
    const b = edgeIndices[i * 2 + 1];
    const edgeKey = `${Math.min(a, b)},${Math.max(a, b)}`;

    const triangleList = edgeMap.get(edgeKey);

    let normalA;
    let normalB;

    if (triangleList && triangleList.length > 0) {
      const tA = triangleList[0];
      normalA = [
        faceNormals[tA * 3],
        faceNormals[tA * 3 + 1],
        faceNormals[tA * 3 + 2],
      ];

      if (triangleList.length > 1) {
        const tB = triangleList[1];
        normalB = [
          faceNormals[tB * 3],
          faceNormals[tB * 3 + 1],
          faceNormals[tB * 3 + 2],
        ];
      } else {
        // Boundary edge: use negative of first normal
        normalB = [-normalA[0], -normalA[1], -normalA[2]];
      }
    }

    // Store face normal pair for this edge
    const baseIdx = i * 6;
    edgeFaceNormals[baseIdx] = normalA[0];
    edgeFaceNormals[baseIdx + 1] = normalA[1];
    edgeFaceNormals[baseIdx + 2] = normalA[2];
    edgeFaceNormals[baseIdx + 3] = normalB[0];
    edgeFaceNormals[baseIdx + 4] = normalB[1];
    edgeFaceNormals[baseIdx + 5] = normalB[2];
  }

  return edgeFaceNormals;
}

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

      // Only include visible edge types according to EXT_mesh_primitive_edge_visibility spec
      let shouldIncludeEdge = false;
      switch (visibility2Bit) {
        case 0: // HIDDEN - never draw
          shouldIncludeEdge = false;
          break;
        case 1: // SILHOUETTE - conditionally visible (front-facing vs back-facing)
          shouldIncludeEdge = true;
          break;
        case 2: // HARD - always draw (primary encoding)
          shouldIncludeEdge = true;
          break;
        case 3: // REPEATED - always draw (secondary encoding of a hard edge already encoded as 2)
          shouldIncludeEdge = true;
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
 * @param {number} silhouetteNormalLocation The shader location for silhouette normal attribute
 * @param {number} faceNormalALocation The shader location for face normal A attribute
 * @param {number} faceNormalBLocation The shader location for face normal B attribute
 * @param {Object} edgeVisibility The edge visibility data containing silhouette normals
 * @param {Float32Array} edgeFaceNormals The computed face normals for each edge
 * @returns {Object|undefined} Edge geometry with vertex array and index buffer
 * @private
 */
function createCPULineEdgeGeometry(
  edgeIndices,
  edgeData,
  renderResources,
  context,
  edgeTypeLocation,
  silhouetteNormalLocation,
  faceNormalALocation,
  faceNormalBLocation,
  edgeVisibility,
  edgeFaceNormals,
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
  const silhouetteNormalArray = new Float32Array(totalVerts * 3);
  const faceNormalAArray = new Float32Array(totalVerts * 3);
  const faceNormalBArray = new Float32Array(totalVerts * 3);
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
      // Fill with default values
      const normalIdx = i * 2;
      silhouetteNormalArray[normalIdx * 3] = 0;
      silhouetteNormalArray[normalIdx * 3 + 1] = 0;
      silhouetteNormalArray[normalIdx * 3 + 2] = 1;
      silhouetteNormalArray[(normalIdx + 1) * 3] = 0;
      silhouetteNormalArray[(normalIdx + 1) * 3 + 1] = 0;
      silhouetteNormalArray[(normalIdx + 1) * 3 + 2] = 1;

      // Fill face normals with default values
      faceNormalAArray[normalIdx * 3] = 0;
      faceNormalAArray[normalIdx * 3 + 1] = 0;
      faceNormalAArray[normalIdx * 3 + 2] = 1;
      faceNormalAArray[(normalIdx + 1) * 3] = 0;
      faceNormalAArray[(normalIdx + 1) * 3 + 1] = 0;
      faceNormalAArray[(normalIdx + 1) * 3 + 2] = 1;

      faceNormalBArray[normalIdx * 3] = 0;
      faceNormalBArray[normalIdx * 3 + 1] = 0;
      faceNormalBArray[normalIdx * 3 + 2] = 1;
      faceNormalBArray[(normalIdx + 1) * 3] = 0;
      faceNormalBArray[(normalIdx + 1) * 3 + 1] = 0;
      faceNormalBArray[(normalIdx + 1) * 3 + 2] = 1;
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

    // Add silhouette normal for silhouette edges (type 1)
    let normalX = 0,
      normalY = 0,
      normalZ = 1; // Default normal pointing up

    if (rawType === 1 && defined(edgeVisibility.silhouetteNormals)) {
      const mateVertexIndex = edgeData[i].mateVertexIndex;
      if (
        mateVertexIndex >= 0 &&
        mateVertexIndex < edgeVisibility.silhouetteNormals.length
      ) {
        const silhouetteNormals = edgeVisibility.silhouetteNormals;
        const normal = silhouetteNormals[mateVertexIndex];

        if (defined(normal)) {
          normalX = normal.x;
          normalY = normal.y;
          normalZ = normal.z;
        }
      }
    }

    // Set silhouette normal for both edge endpoints
    const normalIdx = i * 2;
    silhouetteNormalArray[normalIdx * 3] = normalX;
    silhouetteNormalArray[normalIdx * 3 + 1] = normalY;
    silhouetteNormalArray[normalIdx * 3 + 2] = normalZ;
    silhouetteNormalArray[(normalIdx + 1) * 3] = normalX;
    silhouetteNormalArray[(normalIdx + 1) * 3 + 1] = normalY;
    silhouetteNormalArray[(normalIdx + 1) * 3 + 2] = normalZ;

    // Set face normals for both edge endpoints
    const faceNormalIdx = i * 6; // 6 floats per edge (2 normals * 3 components)
    const normalAX = edgeFaceNormals[faceNormalIdx];
    const normalAY = edgeFaceNormals[faceNormalIdx + 1];
    const normalAZ = edgeFaceNormals[faceNormalIdx + 2];
    const normalBX = edgeFaceNormals[faceNormalIdx + 3];
    const normalBY = edgeFaceNormals[faceNormalIdx + 4];
    const normalBZ = edgeFaceNormals[faceNormalIdx + 5];

    // Face normal A for both endpoints
    faceNormalAArray[normalIdx * 3] = normalAX;
    faceNormalAArray[normalIdx * 3 + 1] = normalAY;
    faceNormalAArray[normalIdx * 3 + 2] = normalAZ;
    faceNormalAArray[(normalIdx + 1) * 3] = normalAX;
    faceNormalAArray[(normalIdx + 1) * 3 + 1] = normalAY;
    faceNormalAArray[(normalIdx + 1) * 3 + 2] = normalAZ;

    // Face normal B for both endpoints
    faceNormalBArray[normalIdx * 3] = normalBX;
    faceNormalBArray[normalIdx * 3 + 1] = normalBY;
    faceNormalBArray[normalIdx * 3 + 2] = normalBZ;
    faceNormalBArray[(normalIdx + 1) * 3] = normalBX;
    faceNormalBArray[(normalIdx + 1) * 3 + 1] = normalBY;
    faceNormalBArray[(normalIdx + 1) * 3 + 2] = normalBZ;
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
  const silhouetteNormalBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: silhouetteNormalArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  const faceNormalABuffer = Buffer.createVertexBuffer({
    context,
    typedArray: faceNormalAArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  const faceNormalBBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: faceNormalBArray,
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

  // Create vertex array with position, edge type, silhouette normal, and face normal attributes
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
    {
      index: silhouetteNormalLocation,
      vertexBuffer: silhouetteNormalBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: faceNormalALocation,
      vertexBuffer: faceNormalABuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: faceNormalBLocation,
      vertexBuffer: faceNormalBBuffer,
      componentsPerAttribute: 3,
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
