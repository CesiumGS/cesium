import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";
import EdgeVisibilityStageVS from "../../Shaders/Model/EdgeVisibilityStageVS.js";
import ModelUtility from "./ModelUtility.js";
import ModelReader from "./ModelReader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import AttributeType from "../AttributeType.js";

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

  // Fallback request: mark that edge visibility is needed this frame.
  frameState.edgeVisibilityRequested = true;

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
  shaderBuilder.addVertexLines(EdgeVisibilityStageVS);

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

  // Add attributes and varyings for quad-based wide line rendering
  const edgeOtherPosLocation = shaderBuilder.addAttribute(
    "vec3",
    "a_edgeOtherPos",
  );
  const edgeOffsetLocation = shaderBuilder.addAttribute(
    "float",
    "a_edgeOffset",
  );
  shaderBuilder.addVarying("float", "v_edgeOffset");

  // Add varying for view space position for perspective-correct silhouette detection

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

  const runtimePrimitive = renderResources.runtimePrimitive.primitive;
  const vertexColorInfo = collectVertexColors(runtimePrimitive);
  const hasEdgeColorOverride = edgeResult.edgeData.some(function (edge) {
    return defined(edge.color);
  });

  const needsEdgeColorAttribute =
    hasEdgeColorOverride || defined(vertexColorInfo);

  let edgeColorLocation;
  if (needsEdgeColorAttribute) {
    edgeColorLocation = shaderBuilder.addAttribute("vec4", "a_edgeColor");
    shaderBuilder.addVarying("vec4", "v_edgeColor", "flat");
    shaderBuilder.addDefine(
      "HAS_EDGE_COLOR_ATTRIBUTE",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  // Generate paired face normals for each unique edge (used to classify silhouette edges in the shader).
  const edgeFaceNormals = generateEdgeFaceNormals(
    adjacencyData,
    edgeResult.edgeIndices,
  );

  // Create edge-domain quad geometry (4 vertices per edge) with all required attributes for wide line rendering.
  const edgeGeometry = createQuadEdgeGeometry(
    edgeResult.edgeIndices,
    edgeResult.edgeData,
    renderResources,
    frameState.context,
    edgeTypeLocation,
    silhouetteNormalLocation,
    faceNormalALocation,
    faceNormalBLocation,
    edgeFeatureIdLocation,
    edgeColorLocation,
    edgeOtherPosLocation,
    edgeOffsetLocation,
    vertexColorInfo,
    primitive.edgeVisibility,
    edgeFaceNormals,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  if (edgeGeometry.hasEdgeFeatureIds) {
    shaderBuilder.addDefine(
      "HAS_EDGE_FEATURE_ID",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  // Set default value for u_isEdgePass uniform (false for original geometry pass). A later pass overrides this.
  renderResources.uniformMap.u_isEdgePass = function () {
    return false;
  };

  // Set default line width uniform (will be overridden in edge pass)
  renderResources.uniformMap.u_lineWidth = function () {
    return 1.0;
  };

  // Get line width from primitive's material if available
  const material = primitive.material;
  const lineWidth =
    defined(material) && defined(material.lineWidth)
      ? material.lineWidth * frameState.pixelRatio
      : undefined;

  // Store edge geometry metadata so the renderer can issue a separate edges pass.
  // Use TRIANGLES instead of LINES to support wide lines via quad tessellation
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.TRIANGLES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
    lineWidth: lineWidth,
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

  // Retrieve raw (possibly quantized) position data. If the attribute is quantized
  // we must dequantize on the CPU here because we compute face normals and silhouette
  // classification data before the vertex shader's dequantization stage runs.
  let positions = defined(positionAttribute.typedArray)
    ? positionAttribute.typedArray
    : ModelReader.readAttributeAsTypedArray(positionAttribute);

  const quantization = positionAttribute.quantization;
  if (defined(quantization) && !quantization.octEncoded) {
    const count = positions.length; // length is 3 * vertexCount
    const dequantized = new Float32Array(count);
    const offset = quantization.quantizedVolumeOffset;
    const step = quantization.quantizedVolumeStepSize;
    for (let i = 0; i < count; i += 3) {
      dequantized[i] = offset.x + positions[i] * step.x;
      dequantized[i + 1] = offset.y + positions[i + 1] * step.y;
      dequantized[i + 2] = offset.z + positions[i + 2] * step.z;
    }
    positions = dequantized;
  }

  // Build edge map: key = "min,max", value = [triangleA, triangleB?]
  const edgeMap = new Map();

  // Calculate face normals for each triangle (model space)
  const faceNormals = new Float32Array(triangleCount * 3);

  // Scratch vectors to avoid heap allocations per triangle
  const scratchP0 = new Cartesian3();
  const scratchP1 = new Cartesian3();
  const scratchP2 = new Cartesian3();
  const scratchE1 = new Cartesian3();
  const scratchE2 = new Cartesian3();
  const scratchCross = new Cartesian3();

  function processEdge(a, b, triIndex) {
    const edgeKey = `${a < b ? a : b},${a < b ? b : a}`;
    let list = edgeMap.get(edgeKey);
    if (!defined(list)) {
      list = [];
      edgeMap.set(edgeKey, list);
    }
    if (list.length < 2) {
      list.push(triIndex);
    }
  }

  for (let t = 0; t < triangleCount; t++) {
    const base = t * 3;
    const i0 = triangleIndexArray[base];
    const i1 = triangleIndexArray[base + 1];
    const i2 = triangleIndexArray[base + 2];

    const i0o = i0 * 3;
    const i1o = i1 * 3;
    const i2o = i2 * 3;

    scratchP0.x = positions[i0o];
    scratchP0.y = positions[i0o + 1];
    scratchP0.z = positions[i0o + 2];
    scratchP1.x = positions[i1o];
    scratchP1.y = positions[i1o + 1];
    scratchP1.z = positions[i1o + 2];
    scratchP2.x = positions[i2o];
    scratchP2.y = positions[i2o + 1];
    scratchP2.z = positions[i2o + 2];

    Cartesian3.subtract(scratchP1, scratchP0, scratchE1);
    Cartesian3.subtract(scratchP2, scratchP0, scratchE2);
    Cartesian3.cross(scratchE1, scratchE2, scratchCross);
    Cartesian3.normalize(scratchCross, scratchCross);

    faceNormals[base] = scratchCross.x;
    faceNormals[base + 1] = scratchCross.y;
    faceNormals[base + 2] = scratchCross.z;

    // Edges
    processEdge(i0, i1, t);
    processEdge(i1, i2, t);
    processEdge(i2, i0, t);
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
    const edgeKey = `${a < b ? a : b},${a < b ? b : a}`;
    const triangleList = edgeMap.get(edgeKey);

    // Expect at least one triangle; silently skip if not found (defensive)
    if (!defined(triangleList) || triangleList.length === 0) {
      continue;
    }

    const tA = triangleList[0];
    const aBase = tA * 3;
    const nAx = faceNormals[aBase];
    const nAy = faceNormals[aBase + 1];
    const nAz = faceNormals[aBase + 2];

    let nBx;
    let nBy;
    let nBz;
    if (triangleList.length > 1) {
      const tB = triangleList[1];
      const bBase = tB * 3;
      nBx = faceNormals[bBase];
      nBy = faceNormals[bBase + 1];
      nBz = faceNormals[bBase + 2];
    } else {
      // Boundary edge – synthesize opposite normal
      nBx = -nAx;
      nBy = -nAy;
      nBz = -nAz;
    }

    const baseIdx = i * 6;
    edgeFaceNormals[baseIdx] = nAx;
    edgeFaceNormals[baseIdx + 1] = nAy;
    edgeFaceNormals[baseIdx + 2] = nAz;
    edgeFaceNormals[baseIdx + 3] = nBx;
    edgeFaceNormals[baseIdx + 4] = nBy;
    edgeFaceNormals[baseIdx + 5] = nBz;
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
  if (!defined(edgeVisibility)) {
    return [];
  }

  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;
  const lineStrings = edgeVisibility.lineStrings;

  const attributes = primitive.attributes;
  const vertexCount =
    defined(attributes) && attributes.length > 0 ? attributes[0].count : 0;

  const hasVisibilityData =
    defined(visibility) &&
    defined(indices) &&
    defined(indices.typedArray) &&
    indices.typedArray.length > 0;
  const hasLineStrings = defined(lineStrings) && lineStrings.length > 0;

  if (!hasVisibilityData && !hasLineStrings) {
    return [];
  }

  const triangleIndexArray = hasVisibilityData ? indices.typedArray : undefined;
  const edgeIndices = [];
  const edgeData = [];
  const seenEdgeHashes = new Set();
  let silhouetteEdgeCount = 0;
  const globalColor = edgeVisibility.materialColor;

  if (hasVisibilityData) {
    let edgeIndex = 0;
    const totalIndices = triangleIndexArray.length;
    const visibilityArray = visibility;

    for (let i = 0; i + 2 < totalIndices; i += 3) {
      const v0 = triangleIndexArray[i];
      const v1 = triangleIndexArray[i + 1];
      const v2 = triangleIndexArray[i + 2];
      for (let e = 0; e < 3; e++) {
        let a;
        let b;
        if (e === 0) {
          a = v0;
          b = v1;
        } else if (e === 1) {
          a = v1;
          b = v2;
        } else {
          a = v2;
          b = v0;
        }

        const byteIndex = Math.floor(edgeIndex / 4);
        const bitPairOffset = (edgeIndex % 4) * 2;
        edgeIndex++;

        if (byteIndex >= visibilityArray.length) {
          break;
        }

        const byte = visibilityArray[byteIndex];
        const visibility2Bit = (byte >> bitPairOffset) & 0x3;

        if (visibility2Bit === 0) {
          continue;
        }

        const small = Math.min(a, b);
        const big = Math.max(a, b);
        const edgeKey = `${small},${big}`;

        if (seenEdgeHashes.has(edgeKey)) {
          continue;
        }
        seenEdgeHashes.add(edgeKey);
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
          color: globalColor,
        });
      }
    }
  }

  if (hasLineStrings) {
    for (let i = 0; i < lineStrings.length; i++) {
      const lineString = lineStrings[i];
      if (!defined(lineString) || !defined(lineString.indices)) {
        continue;
      }

      const indicesArray = lineString.indices;
      if (!defined(indicesArray) || indicesArray.length < 2) {
        continue;
      }

      const restartValue = lineString.restartIndex;
      const lineColor = defined(lineString.materialColor)
        ? lineString.materialColor
        : globalColor;

      let previous;
      for (let j = 0; j < indicesArray.length; j++) {
        const currentIndex = indicesArray[j];
        if (defined(restartValue) && currentIndex === restartValue) {
          previous = undefined;
          continue;
        }

        if (!defined(previous)) {
          previous = currentIndex;
          continue;
        }

        const a = previous;
        const b = currentIndex;
        previous = currentIndex;

        if (a === b) {
          continue;
        }

        if (
          vertexCount > 0 &&
          (a < 0 || a >= vertexCount || b < 0 || b >= vertexCount)
        ) {
          continue;
        }

        const small = Math.min(a, b);
        const big = Math.max(a, b);
        const edgeKey = `${small},${big}`;

        if (seenEdgeHashes.has(edgeKey)) {
          continue;
        }

        seenEdgeHashes.add(edgeKey);
        edgeIndices.push(a, b);
        edgeData.push({
          edgeType: 2,
          triangleIndex: -1,
          edgeIndex: -1,
          mateVertexIndex: -1,
          currentTriangleVertices: undefined,
          color: defined(lineColor) ? lineColor : undefined,
        });
      }
    }
  }

  return { edgeIndices, edgeData, silhouetteEdgeCount };
}

function collectVertexColors(runtimePrimitive) {
  if (!defined(runtimePrimitive)) {
    return undefined;
  }

  const colorAttribute = ModelUtility.getAttributeBySemantic(
    runtimePrimitive,
    VertexAttributeSemantic.COLOR,
  );
  if (!defined(colorAttribute)) {
    return undefined;
  }

  const components = AttributeType.getNumberOfComponents(colorAttribute.type);
  if (components !== 3 && components !== 4) {
    return undefined;
  }

  let colorData = colorAttribute.typedArray;
  if (!defined(colorData)) {
    colorData = ModelReader.readAttributeAsTypedArray(colorAttribute);
  }
  if (!defined(colorData)) {
    return undefined;
  }
  const count = colorAttribute.count;
  if (!defined(count) || count === 0) {
    return undefined;
  }

  if (colorData.length < count * components) {
    return undefined;
  }

  const isFloatArray =
    colorData instanceof Float32Array || colorData instanceof Float64Array;
  const isUint8Array = colorData instanceof Uint8Array;
  const isUint16Array = colorData instanceof Uint16Array;

  if (!isFloatArray && !isUint8Array && !isUint16Array) {
    return undefined;
  }

  const colors = new Float32Array(count * 4);

  const convertComponent = function (value) {
    let converted;
    if (isFloatArray) {
      converted = value;
    } else if (isUint8Array) {
      converted = value / 255.0;
    } else if (isUint16Array) {
      converted = value / 65535.0;
    }
    return Math.min(Math.max(converted, 0.0), 1.0);
  };

  for (let i = 0; i < count; i++) {
    const srcBase = i * components;
    const destBase = i * 4;
    colors[destBase] = convertComponent(colorData[srcBase]);
    colors[destBase + 1] = convertComponent(colorData[srcBase + 1]);
    colors[destBase + 2] = convertComponent(colorData[srcBase + 2]);
    if (components === 4) {
      colors[destBase + 3] = convertComponent(colorData[srcBase + 3]);
    } else {
      colors[destBase + 3] = 1.0;
    }
  }

  return {
    colors: colors,
    count: count,
  };
}

/**
 * @typedef {object} VertexColorInfo
 * @property {Float32Array} colors The packed per-vertex colors.
 * @property {number} count The number of vertices.
 */

/**
 * Create quad-based edge geometry for wide line rendering. Each edge becomes a quad (4 vertices, 2 triangles).
 * This allows proper line width rendering in the vertex shader by extruding perpendicular to the line direction.
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
 * @param {number} edgeColorLocation Shader attribute location for optional edge color data
 * @param {number} edgeOtherPosLocation Shader attribute location for the other endpoint position
 * @param {number} edgeOffsetLocation Shader attribute location for edge offset (-1 or +1)
 * @param {VertexColorInfo} [vertexColorInfo] Packed per-vertex colors (optional)
 * @param {Object} edgeVisibility Edge visibility extension object (may contain silhouetteNormals[])
 * @param {Float32Array} edgeFaceNormals Packed face normals (6 floats per edge)
 * @returns {Object|undefined} Object with {vertexArray, indexBuffer, indexCount} or undefined on failure
 * @private
 */
function createQuadEdgeGeometry(
  edgeIndices,
  edgeData,
  renderResources,
  context,
  edgeTypeLocation,
  silhouetteNormalLocation,
  faceNormalALocation,
  faceNormalBLocation,
  edgeFeatureIdLocation,
  edgeColorLocation,
  edgeOtherPosLocation,
  edgeOffsetLocation,
  vertexColorInfo,
  edgeVisibility,
  edgeFaceNormals,
) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  const numEdges = edgeData.length;
  const vertsPerEdge = 4; // Each edge becomes a quad (4 vertices)
  const totalVerts = numEdges * vertsPerEdge;

  // Always use location 0 for position
  const positionLocation = 0;

  // Get original vertex positions
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    renderResources.runtimePrimitive.primitive,
    VertexAttributeSemantic.POSITION,
  );
  const srcPos = defined(positionAttribute.typedArray)
    ? positionAttribute.typedArray
    : ModelReader.readAttributeAsTypedArray(positionAttribute);

  // Create arrays for quad vertices
  const edgePosArray = new Float32Array(totalVerts * 3);
  const edgeTypeArray = new Float32Array(totalVerts);
  const silhouetteNormalArray = new Float32Array(totalVerts * 3);
  const faceNormalAArray = new Float32Array(totalVerts * 3);
  const faceNormalBArray = new Float32Array(totalVerts * 3);
  const edgeOtherPosArray = new Float32Array(totalVerts * 3); // Position of the other endpoint
  const edgeOffsetArray = new Float32Array(totalVerts); // -1 or +1 for quad expansion

  const needsEdgeColorAttribute = defined(edgeColorLocation);
  const edgeColorArray = needsEdgeColorAttribute
    ? new Float32Array(totalVerts * 4)
    : undefined;
  const vertexColors = defined(vertexColorInfo)
    ? vertexColorInfo.colors
    : undefined;
  const vertexColorCount = defined(vertexColorInfo) ? vertexColorInfo.count : 0;

  function setNoColor(destVertexIndex) {
    if (!needsEdgeColorAttribute) {
      return;
    }
    const destOffset = destVertexIndex * 4;
    edgeColorArray[destOffset] = 0.0;
    edgeColorArray[destOffset + 1] = 0.0;
    edgeColorArray[destOffset + 2] = 0.0;
    edgeColorArray[destOffset + 3] = -1.0;
  }

  function setColorFromOverride(destVertexIndex, color) {
    if (!needsEdgeColorAttribute) {
      return;
    }
    const destOffset = destVertexIndex * 4;
    const r = defined(color.x) ? color.x : color[0];
    const g = defined(color.y) ? color.y : color[1];
    const b = defined(color.z) ? color.z : color[2];
    const a = defined(color.w) ? color.w : defined(color[3]) ? color[3] : 1.0;
    edgeColorArray[destOffset] = r;
    edgeColorArray[destOffset + 1] = g;
    edgeColorArray[destOffset + 2] = b;
    edgeColorArray[destOffset + 3] = a;
  }

  function assignVertexColor(destVertexIndex, srcVertexIndex) {
    if (!needsEdgeColorAttribute) {
      return;
    }
    if (srcVertexIndex >= vertexColorCount) {
      setNoColor(destVertexIndex);
      return;
    }
    const srcOffset = srcVertexIndex * 4;
    const destOffset = destVertexIndex * 4;
    edgeColorArray[destOffset] = vertexColors[srcOffset];
    edgeColorArray[destOffset + 1] = vertexColors[srcOffset + 1];
    edgeColorArray[destOffset + 2] = vertexColors[srcOffset + 2];
    edgeColorArray[destOffset + 3] = vertexColors[srcOffset + 3];
  }

  // Generate quad vertices for each edge
  for (let i = 0; i < numEdges; i++) {
    const a = edgeIndices[i * 2];
    const b = edgeIndices[i * 2 + 1];
    const rawType = edgeData[i].edgeType;
    const normalizedType = rawType / 255.0;

    // Get positions
    const ax = srcPos[a * 3];
    const ay = srcPos[a * 3 + 1];
    const az = srcPos[a * 3 + 2];
    const bx = srcPos[b * 3];
    const by = srcPos[b * 3 + 1];
    const bz = srcPos[b * 3 + 2];

    // Create 4 vertices for this edge: (A-, A+, B+, B-)
    // where +/- indicates offset perpendicular to the line
    // Store the other endpoint position for each vertex (iTwin approach)
    const baseVertexIndex = i * 4;

    // Vertex 0: position at A, other endpoint is B, offset -1
    edgePosArray[baseVertexIndex * 3] = ax;
    edgePosArray[baseVertexIndex * 3 + 1] = ay;
    edgePosArray[baseVertexIndex * 3 + 2] = az;
    edgeOtherPosArray[baseVertexIndex * 3] = bx;
    edgeOtherPosArray[baseVertexIndex * 3 + 1] = by;
    edgeOtherPosArray[baseVertexIndex * 3 + 2] = bz;
    edgeOffsetArray[baseVertexIndex] = -1.0;
    edgeTypeArray[baseVertexIndex] = normalizedType;

    // Vertex 1: position at A, other endpoint is B, offset +1
    edgePosArray[(baseVertexIndex + 1) * 3] = ax;
    edgePosArray[(baseVertexIndex + 1) * 3 + 1] = ay;
    edgePosArray[(baseVertexIndex + 1) * 3 + 2] = az;
    edgeOtherPosArray[(baseVertexIndex + 1) * 3] = bx;
    edgeOtherPosArray[(baseVertexIndex + 1) * 3 + 1] = by;
    edgeOtherPosArray[(baseVertexIndex + 1) * 3 + 2] = bz;
    edgeOffsetArray[baseVertexIndex + 1] = 1.0;
    edgeTypeArray[baseVertexIndex + 1] = normalizedType;

    // Vertex 2: position at B, other endpoint is A, offset +1
    edgePosArray[(baseVertexIndex + 2) * 3] = bx;
    edgePosArray[(baseVertexIndex + 2) * 3 + 1] = by;
    edgePosArray[(baseVertexIndex + 2) * 3 + 2] = bz;
    edgeOtherPosArray[(baseVertexIndex + 2) * 3] = ax;
    edgeOtherPosArray[(baseVertexIndex + 2) * 3 + 1] = ay;
    edgeOtherPosArray[(baseVertexIndex + 2) * 3 + 2] = az;
    edgeOffsetArray[baseVertexIndex + 2] = 1.0;
    edgeTypeArray[baseVertexIndex + 2] = normalizedType;

    // Vertex 3: position at B, other endpoint is A, offset -1
    edgePosArray[(baseVertexIndex + 3) * 3] = bx;
    edgePosArray[(baseVertexIndex + 3) * 3 + 1] = by;
    edgePosArray[(baseVertexIndex + 3) * 3 + 2] = bz;
    edgeOtherPosArray[(baseVertexIndex + 3) * 3] = ax;
    edgeOtherPosArray[(baseVertexIndex + 3) * 3 + 1] = ay;
    edgeOtherPosArray[(baseVertexIndex + 3) * 3 + 2] = az;
    edgeOffsetArray[baseVertexIndex + 3] = -1.0;
    edgeTypeArray[baseVertexIndex + 3] = normalizedType;

    // Handle edge colors
    const edgeOverrideColor = edgeData[i].color;
    if (defined(edgeOverrideColor)) {
      for (let v = 0; v < 4; v++) {
        setColorFromOverride(baseVertexIndex + v, edgeOverrideColor);
      }
    } else if (defined(vertexColors)) {
      for (let v = 0; v < 4; v++) {
        assignVertexColor(baseVertexIndex + v, a);
      }
    } else {
      for (let v = 0; v < 4; v++) {
        setNoColor(baseVertexIndex + v);
      }
    }

    // Set silhouette normal (same for all 4 vertices)
    let normalX = 0,
      normalY = 0,
      normalZ = 1;

    if (rawType === 1 && defined(edgeVisibility.silhouetteNormals)) {
      const mateVertexIndex = edgeData[i].mateVertexIndex;
      if (
        mateVertexIndex >= 0 &&
        mateVertexIndex < edgeVisibility.silhouetteNormals.length
      ) {
        const normal = edgeVisibility.silhouetteNormals[mateVertexIndex];
        if (defined(normal)) {
          normalX = normal.x;
          normalY = normal.y;
          normalZ = normal.z;
        }
      }
    }

    for (let v = 0; v < 4; v++) {
      silhouetteNormalArray[(baseVertexIndex + v) * 3] = normalX;
      silhouetteNormalArray[(baseVertexIndex + v) * 3 + 1] = normalY;
      silhouetteNormalArray[(baseVertexIndex + v) * 3 + 2] = normalZ;
    }

    // Set face normals (same for all 4 vertices)
    const faceNormalIdx = i * 6;
    const normalAX = edgeFaceNormals[faceNormalIdx];
    const normalAY = edgeFaceNormals[faceNormalIdx + 1];
    const normalAZ = edgeFaceNormals[faceNormalIdx + 2];
    const normalBX = edgeFaceNormals[faceNormalIdx + 3];
    const normalBY = edgeFaceNormals[faceNormalIdx + 4];
    const normalBZ = edgeFaceNormals[faceNormalIdx + 5];

    for (let v = 0; v < 4; v++) {
      faceNormalAArray[(baseVertexIndex + v) * 3] = normalAX;
      faceNormalAArray[(baseVertexIndex + v) * 3 + 1] = normalAY;
      faceNormalAArray[(baseVertexIndex + v) * 3 + 2] = normalAZ;
      faceNormalBArray[(baseVertexIndex + v) * 3] = normalBX;
      faceNormalBArray[(baseVertexIndex + v) * 3 + 1] = normalBY;
      faceNormalBArray[(baseVertexIndex + v) * 3 + 2] = normalBZ;
    }
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

  const edgeOtherPosBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: edgeOtherPosArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  const edgeOffsetBuffer = Buffer.createVertexBuffer({
    context,
    typedArray: edgeOffsetArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  const edgeColorBuffer = needsEdgeColorAttribute
    ? Buffer.createVertexBuffer({
        context,
        typedArray: edgeColorArray,
        usage: BufferUsage.STATIC_DRAW,
      })
    : undefined;

  // Create triangle indices for quads: (0,1,2, 0,2,3) for each quad
  const numTriangles = numEdges * 2;
  const numIndices = numTriangles * 3;
  const useU32 = totalVerts > 65534;
  const indices = useU32
    ? new Uint32Array(numIndices)
    : new Uint16Array(numIndices);

  for (let i = 0; i < numEdges; i++) {
    const baseVertex = i * 4;
    const baseIndex = i * 6;

    // Triangle 1: (v0, v1, v2)
    indices[baseIndex] = baseVertex;
    indices[baseIndex + 1] = baseVertex + 1;
    indices[baseIndex + 2] = baseVertex + 2;

    // Triangle 2: (v0, v2, v3)
    indices[baseIndex + 3] = baseVertex;
    indices[baseIndex + 4] = baseVertex + 2;
    indices[baseIndex + 5] = baseVertex + 3;
  }

  const indexBuffer = Buffer.createIndexBuffer({
    context,
    typedArray: indices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: useU32
      ? IndexDatatype.UNSIGNED_INT
      : IndexDatatype.UNSIGNED_SHORT,
  });

  // Create vertex array with all attributes
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
    {
      index: edgeOtherPosLocation,
      vertexBuffer: edgeOtherPosBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: edgeOffsetLocation,
      vertexBuffer: edgeOffsetBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
  ];

  if (needsEdgeColorAttribute) {
    attributes.push({
      index: edgeColorLocation,
      vertexBuffer: edgeColorBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    });
  }

  // Handle feature IDs (same logic as line geometry)
  const primitive = renderResources.runtimePrimitive.primitive;
  if (defined(primitive.featureIds) && primitive.featureIds.length > 0) {
    const firstFeatureIdSet = primitive.featureIds[0];

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

        const edgeFeatureIds = new Float32Array(totalVerts);
        for (let i = 0; i < numEdges; i++) {
          const a = edgeIndices[i * 2];
          const featureId = a < featureIds.length ? featureIds[a] : 0;
          // Set same feature ID for all 4 vertices of the quad
          for (let v = 0; v < 4; v++) {
            edgeFeatureIds[i * 4 + v] = featureId;
          }
        }

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
    }
  }

  const vertexArray = new VertexArray({
    context,
    attributes,
    indexBuffer,
  });

  return {
    vertexArray,
    indexCount: numIndices,
    hasEdgeFeatureIds:
      defined(primitive.featureIds) && primitive.featureIds.length > 0,
  };
}

export default EdgeVisibilityPipelineStage;
