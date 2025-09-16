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

/**
 * Builds derived line geometry for model edges using EXT_mesh_primitive_edge_visibility data.
 * It parses the encoded edge visibility bits, creates a separate edge-domain vertex array with
 * per-edge attributes (edge type, optional feature ID, silhouette normal, adjacent face normals),
 * sets up the required shader defines / varyings, and stores the resulting line list geometry on
 * the render resources for a later edge rendering pass.
 *
 * @namespace EdgeVisibilityPipelineStage
 * @private
 */
const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

/**
 * Process a primitive to derive edge geometry and shader bindings. This modifies the render resources by:
 * <ul>
 *  <li>Adding shader defines (<code>HAS_EDGE_VISIBILITY</code>, <code>HAS_EDGE_VISIBILITY_MRT</code>)</li>
 *  <li>Injecting the fragment shader logic that outputs edge color / feature information</li>
 *  <li>Adding per-vertex attributes: edge type, optional feature ID, silhouette normal, and adjacent face normals</li>
 *  <li>Adding varyings to pass these attributes to the fragment stage</li>
 *  <li>Creating and storing a derived line list vertex array in <code>renderResources.edgeGeometry</code></li>
 * </ul>
 * If the primitive does not contain edge visibility data, the function returns early.
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
  if (!defined(primitive.edgeVisibility)) {
    return;
  }

  // Fallback auto-enable: If edge visibility is being processed but the scene flag
  // is still false (e.g., custom model loading path bypassed earlier auto-enable), turn it on.
  const scene = frameState?.scene || frameState?.context?.scene;
  if (defined(scene) && scene._enableEdgeVisibility === false) {
    scene._enableEdgeVisibility = true;
  }

  const shaderBuilder = renderResources.shaderBuilder;

  // Add shader defines and fragment code
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY_MRT",
    undefined,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);

  // Add a uniform to distinguish between original geometry pass and edge pass
  shaderBuilder.addUniform("bool", "u_isEdgePass", ShaderDestination.BOTH);

  // Add edge type attribute and varying
  const edgeTypeLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  shaderBuilder.addVarying("float", "v_edgeType", "flat");

  // Add edge feature ID attribute and varying
  const edgeFeatureIdLocation = shaderBuilder.addAttribute(
    "float",
    "a_edgeFeatureId",
  );

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
    "  if (u_isEdgePass) {",
    "    v_edgeType = a_edgeType;",
    "    v_featureId_0 = a_edgeFeatureId;",
    "    // Transform normals from model space to view space",
    "    v_silhouetteNormalView = czm_normal * a_silhouetteNormal;",
    "    v_faceNormalAView = czm_normal * a_faceNormalA;",
    "    v_faceNormalBView = czm_normal * a_faceNormalB;",
    "    // Pass view space position for perspective-correct silhouette detection",
    "    // Use the edge position from attributes (edge domain VAO provides correct positions)",
    "    v_positionView = (czm_modelView * vec4(attributes.positionMC, 1.0)).xyz;",
    "  }",
    "#endif",
  ]);

  // Build triangle adjacency (mapping edges to adjacent triangles) and compute per-triangle face normals.
  const adjacencyData = buildTriangleAdjacency(primitive);

  const edgeResult = extractVisibleEdges(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.edgeIndices) ||
    edgeResult.edgeIndices.length === 0
  ) {
    return;
  }

  // Generate paired face normals for each unique edge (used to classify silhouette edges in the shader).
  const edgeFaceNormals = generateEdgeFaceNormals(
    adjacencyData,
    edgeResult.edgeIndices,
  );

  // Create edge-domain line list geometry (2 vertices per edge) with all required attributes.
  const edgeGeometry = createCPULineEdgeGeometry(
    edgeResult.edgeIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeTypeLocation,
    silhouetteNormalLocation,
    faceNormalALocation,
    faceNormalBLocation,
    edgeFeatureIdLocation,
    primitive.edgeVisibility,
    edgeFaceNormals,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Set default value for u_isEdgePass uniform (false for original geometry pass). A later pass overrides this.
  renderResources.uniformMap.u_isEdgePass = function () {
    return false;
  };

  // Store edge geometry metadata so the renderer can issue a separate edges pass.
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
  };
};

/**
 * Build triangle adjacency information and per-triangle face normals in model space.
 * The adjacency map associates an undirected edge (minIndex,maxIndex) with the indices
 * of up to two adjacent triangles. Face normals are normalized and stored sequentially.
 *
 * @param {ModelComponents.Primitive} primitive The primitive containing triangle index + position data
 * @returns {{edgeMap:Map<string, number[]>, faceNormals:Float32Array, triangleCount:number}}
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
 * For each unique edge produce a pair of face normals (A,B). For boundary edges where only a single
 * adjacent triangle exists, the second normal is synthesized as the negation of the first to allow
 * the shader to reason about front/back facing transitions uniformly.
 *
 * @param {{edgeMap:Map<string,number[]>, faceNormals:Float32Array}} adjacencyData The adjacency data from buildTriangleAdjacency
 * @param {number[]} edgeIndices Packed array of 2 vertex indices per edge
 * @returns {Float32Array} Packed array: 6 floats per edge (normalA.xyz, normalB.xyz)
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
 * Parse the EXT_mesh_primitive_edge_visibility 2-bit edge encoding and extract
 * a unique set of edges that should be considered for rendering. Edge types:
 * <ul>
 *  <li>0 HIDDEN - skipped</li>
 *  <li>1 SILHOUETTE - candidates for conditional display based on facing</li>
 *  <li>2 HARD - always displayed</li>
 *  <li>3 REPEATED - secondary encoding for a hard edge (treated same as 2)</li>
 * </ul>
 * Deduplicates edges shared by adjacent triangles and records per-edge metadata.
 *
 * @param {ModelComponents.Primitive} primitive The primitive with EXT_mesh_primitive_edge_visibility data
 * @returns {{edgeIndices:number[], edgeData:Object[], silhouetteEdgeCount:number}} Edge extraction result
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
 * Create a derived line list geometry representing edges. A new vertex domain is used so we can pack
 * per-edge attributes (silhouette normal, face normal pair, edge type, optional feature ID) without
 * modifying or duplicating the original triangle mesh. Two vertices are generated per unique edge.
 *
 * @param {number[]} edgeIndices Packed array [a0,b0, a1,b1, ...] of vertex indices into the source mesh
 * @param {Object[]} edgeData Array of edge metadata including edge type and silhouette normal lookup index
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {Context} context The WebGL rendering context
 * @param {number} edgeTypeLocation Shader attribute location for the edge type
 * @param {number} silhouetteNormalLocation Shader attribute location for input silhouette normal
 * @param {number} faceNormalALocation Shader attribute location for face normal A
 * @param {number} faceNormalBLocation Shader attribute location for face normal B
 * @param {number} edgeFeatureIdLocation Shader attribute location for optional edge feature ID
 * @param {Object} edgeVisibility Edge visibility extension object (may contain silhouetteNormals[])
 * @param {Float32Array} edgeFaceNormals Packed face normals (6 floats per edge)
 * @returns {Object|undefined} Object with {vertexArray, indexBuffer, indexCount} or undefined on failure
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
  edgeFeatureIdLocation,
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

  // Get feature ID from original geometry
  const primitive = renderResources.runtimePrimitive.primitive;
  const getFeatureIdForEdge = function () {
    // Try to get the first feature ID from the original primitive
    if (defined(primitive.featureIds) && primitive.featureIds.length > 0) {
      const firstFeatureIdSet = primitive.featureIds[0];

      // Handle FeatureIdAttribute objects directly using setIndex
      if (defined(firstFeatureIdSet.setIndex)) {
        const featureIdAttribute = primitive.attributes.find(
          (attr) =>
            attr.semantic === VertexAttributeSemantic.FEATURE_ID &&
            attr.setIndex === firstFeatureIdSet.setIndex,
        );

        if (defined(featureIdAttribute)) {
          const featureIds = defined(featureIdAttribute.typedArray)
            ? featureIdAttribute.typedArray
            : ModelReader.readAttributeAsTypedArray(featureIdAttribute);

          // Create edge feature ID buffer based on edge indices
          const edgeFeatureIds = new Float32Array(totalVerts);
          for (let i = 0; i < numEdges; i++) {
            const a = edgeIndices[i * 2];
            const featureId = a < featureIds.length ? featureIds[a] : 0;
            edgeFeatureIds[i * 2] = featureId;
            edgeFeatureIds[i * 2 + 1] = featureId;
          }

          return edgeFeatureIds;
        }
      }
    }

    return null;
  };

  const edgeFeatureIds = getFeatureIdForEdge();

  if (defined(edgeFeatureIds)) {
    const edgeFeatureIdBuffer = Buffer.createVertexBuffer({
      context,
      typedArray: edgeFeatureIds,
      usage: BufferUsage.STATIC_DRAW,
    });

    attributes.push({
      index: edgeFeatureIdLocation,
      vertexBuffer: edgeFeatureIdBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    });
  }

  const vertexArray = new VertexArray({ context, indexBuffer, attributes });

  if (!vertexArray || totalVerts === 0 || totalVerts % 2 !== 0) {
    return undefined;
  }

  return { vertexArray, indexBuffer, indexCount: totalVerts };
}

export default EdgeVisibilityPipelineStage;
