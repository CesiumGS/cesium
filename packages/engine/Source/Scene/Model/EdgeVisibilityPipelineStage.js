import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
import OrthographicOffCenterFrustum from "../../Core/OrthographicOffCenterFrustum.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

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
  const uniformMap = renderResources.uniformMap;

  console.log("EdgeVisibilityPipelineStage: Starting shader builder setup");

  // Add define for edge visibility in both vertex and fragment shaders
  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );

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

  // Add edge type attribute for shader
  console.log("EdgeVisibilityPipelineStage: Adding attributes and varyings");
  const edgeTypeLocation = shaderBuilder.addAttribute("float", "a_edgeType");
  console.log(
    "EdgeVisibilityPipelineStage: a_edgeType location:",
    edgeTypeLocation,
  );

  // Add varying to pass edge type from vertex to fragment shader
  shaderBuilder.addVarying("float", "v_edgeType");
  console.log("EdgeVisibilityPipelineStage: Added v_edgeType varying");

  const edgePos0Location = shaderBuilder.addAttribute("vec3", "a_edgePos0");
  const edgePos1Location = shaderBuilder.addAttribute("vec3", "a_edgePos1");
  const currentTriThirdLocation = shaderBuilder.addAttribute(
    "vec3",
    "a_currentTriThird",
  );

  console.log("EdgeVisibilityPipelineStage: Position attribute locations:", {
    edgePos0: edgePos0Location,
    edgePos1: edgePos1Location,
    currentTriThird: currentTriThirdLocation,
  });

  // Add varyings to pass positions to fragment shader
  shaderBuilder.addVarying("vec3", "v_edgePos0");
  shaderBuilder.addVarying("vec3", "v_edgePos1");
  shaderBuilder.addVarying("vec3", "v_currentTriThird");
  console.log("EdgeVisibilityPipelineStage: Added position varyings");

  // Add silhouette mate
  if (defined(primitive.edgeVisibility.silhouetteMates)) {
    const mateTriThirdLocation = shaderBuilder.addAttribute(
      "vec3",
      "a_mateTriThird",
    );
    shaderBuilder.addVarying("vec3", "v_mateTriThird");

    console.log(
      "EdgeVisibilityPipelineStage: a_mateTriThird location:",
      mateTriThirdLocation,
    );

    shaderBuilder.addDefine(
      "HAS_SILHOUETTE_MATES",
      undefined,
      ShaderDestination.BOTH,
    );
    console.log(
      "EdgeVisibilityPipelineStage: Added HAS_SILHOUETTE_MATES define",
    );
  }

  // Add vertex/fragment shader functions for edge visibility
  console.log("EdgeVisibilityPipelineStage: Adding shader functions");
  shaderBuilder.addFunction(
    "isEdgeVisible",
    "bool isEdgeVisible(float edgeType)",
    ShaderDestination.BOTH, // Available in both vertex and fragment shaders
  );
  shaderBuilder.addFunctionLines("isEdgeVisible", [
    "// Edge types: 0=hidden, 1=silhouette, 2=hard, 3=repeated",
    "if (edgeType < 0.5) {", // HIDDEN
    "  return false;",
    "}",
    "if (edgeType > 1.5 && edgeType < 2.5) {", // HARD
    "  return false;",
    "}",
    "if (edgeType > 0.5 && edgeType < 1.5) {", // SILHOUETTE
    "  // For silhouette edges, we need proper face normal calculation",
    "  // TODO: Implement proper silhouette calculation with mate vertex data",
    "  // For now, assume visible - needs position lookup via mateVertexIndex",
    "  return false;",
    "}",
    "return false;", // REPEATED or unknown
  ]);

  // Debug: check ShaderBuilder state
  console.log(
    "EdgeVisibilityPipelineStage: ShaderBuilder attribute locations:",
    shaderBuilder._attributeLocations,
  );
  console.log(
    "EdgeVisibilityPipelineStage: ShaderBuilder vertex varyings:",
    shaderBuilder._vertexShaderParts.varyingLines,
  );
  console.log(
    "EdgeVisibilityPipelineStage: ShaderBuilder fragment varyings:",
    shaderBuilder._fragmentShaderParts.varyingLines,
  );

  // Add edge varying lines to the existing setDynamicVaryings function
  shaderBuilder.addFunctionLines("setDynamicVaryingsVS", [
    "#ifdef HAS_EDGE_VISIBILITY",
    "v_edgeType = a_edgeType;",
    "v_edgePos0 = (czm_edgeModelViewMatrix * vec4(a_edgePos0, 1.0)).xyz;",
    "v_edgePos1 = (czm_edgeModelViewMatrix * vec4(a_edgePos1, 1.0)).xyz;",
    "v_currentTriThird = (czm_edgeModelViewMatrix * vec4(a_currentTriThird, 1.0)).xyz;",
    "#ifdef HAS_SILHOUETTE_MATES",
    "v_mateTriThird = (czm_edgeModelViewMatrix * vec4(a_mateTriThird, 1.0)).xyz;",
    "#endif",
    "#endif",
  ]);

  // Create a shader stage file content for edge visibility with color coding
  const EdgeVisibilityStageFS =
    "void edgeVisibilityStage(inout vec4 color)\n" +
    "{\n" +
    "#ifdef HAS_EDGE_VISIBILITY\n" +
    "    // Color code different edge types\n" +
    "    if (v_edgeType < 0.5) { // HIDDEN (0)\n" +
    "        color = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for hidden edges\n" +
    "    }\n" +
    "    else if (v_edgeType > 0.5 && v_edgeType < 1.5) { // SILHOUETTE (1) - RED\n" +
    "        color = vec4(1.0, 0.0, 0.0, 1.0);\n" +
    "    }\n" +
    "    else if (v_edgeType > 1.5 && v_edgeType < 2.5) { // HARD (2) - GREEN\n" +
    "        color = vec4(0.0, 1.0, 0.0, 1.0);\n" +
    "    }\n" +
    "    else if (v_edgeType > 2.5 && v_edgeType < 3.5) { // REPEATED (3) - BLUE\n" +
    "        color = vec4(0.0, 0.0, 1.0, 1.0);\n" +
    "    }\n" +
    "    else { // Unknown - YELLOW\n" +
    "        color = vec4(1.0, 1.0, 0.0, 1.0);\n" +
    "    }\n" +
    "#endif\n" +
    "}\n";

  // Add the fragment shader stage like other pipeline stages
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);
  console.log(
    "EdgeVisibilityPipelineStage: Added processEdgeVisibility function to fragment shader",
  );

  // Helper function for silhouette calculation
  shaderBuilder.addFunction(
    "calculateTriangleFacing",
    "float calculateTriangleFacing(vec3 v0, vec3 v1, vec3 v2, vec3 viewDirection)",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addFunctionLines("calculateTriangleFacing", [
    "// Calculate triangle normal in view space",
    "vec3 edge1 = v1 - v0;",
    "vec3 edge2 = v2 - v0;",
    "vec3 normal = cross(edge1, edge2);",
    "float len = length(normal);",
    "if (len < 1e-10) {",
    "  return 0.0; // Degenerate triangle",
    "}",
    "normal = normalize(normal);",
    "// Return dot product with view direction",
    "// Positive = front-facing, negative = back-facing",
    "return dot(normal, viewDirection);",
  ]);

  // Function to check if silhouette edge should be rendered
  shaderBuilder.addFunction(
    "isSilhouetteVisible",
    "bool isSilhouetteVisible(vec3 v0, vec3 v1, vec3 v2, vec3 mateV, vec3 viewDirection)",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addFunctionLines("isSilhouetteVisible", [
    "// Calculate facing of current triangle (v0, v1, v2)",
    "float facing1 = calculateTriangleFacing(v0, v1, v2, viewDirection);",
    "// Calculate facing of adjacent triangle (v0, v1, mateV)",
    "// The mate vertex forms the other triangle sharing edge v0-v1",
    "float facing2 = calculateTriangleFacing(v0, v1, mateV, viewDirection);",
    "",
    "// Render silhouette only if one triangle is front-facing and other is back-facing",
    "// According to EXT_mesh_primitive_edge_visibility spec:",
    "// 'render unless both adjacent triangles are front-facing or both are back-facing'",
    "bool bothFrontFacing = (facing1 > 0.0) && (facing2 > 0.0);",
    "bool bothBackFacing = (facing1 <= 0.0) && (facing2 <= 0.0);",
    "",
    "return !(bothFrontFacing || bothBackFacing);",
  ]);

  // if (defined(primitive.edgeVisibility.silhouetteNormals)) {
  //   console.log("Silhouette normals available, enhanced calculation possible");
  // } else if (defined(primitive.edgeVisibility.silhouetteMates)) {
  //   console.log("Silhouette mates available, can compute normals dynamically");
  // } else {
  //   console.log("No silhouette data, using simplified edge visibility");
  // }

  // Extract visible edges as line indices (pairs of vertex indices)
  const edgeResult = extractVisibleEdgesAsLineIndices(primitive);

  if (
    !defined(edgeResult) ||
    !defined(edgeResult.lineIndices) ||
    edgeResult.lineIndices.length === 0
  ) {
    return;
  }

  // Create edge geometry using existing attributes and line indices
  const edgeGeometry = createLineEdgeGeometry(
    edgeResult.lineIndices,
    edgeResult.edgeData,
    primitive.edgeVisibility, // Pass edge visibility data for silhouette mates
    renderResources,
    frameState.context,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Build the shader program for edge rendering
  // NOTE: We don't build a separate shader program here because it causes
  // compilation issues with czm_log_depth_main. Comment for now
  // const edgeShaderProgram = shaderBuilder.buildShaderProgram(
  //   frameState.context,
  // );
  // renderResources.model._pipelineResources.push(edgeShaderProgram);

  console.log(
    "EdgeVisibilityPipelineStage: Edge shader program will use main model shader",
  );

  // Store edge geometry for ModelDrawCommand to create edge commands
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES,
    pass: Pass.CESIUM_3D_TILE_EDGES,
    // shaderProgram will be set by ModelDrawCommand from the main model
  };

  // Track resources for cleanup
  const model = renderResources.model;
  model._pipelineResources.push(
    edgeGeometry.indexBuffer,
    edgeGeometry.vertexArray,
  );
  if (defined(edgeGeometry.edgeTypeBuffer)) {
    model._pipelineResources.push(edgeGeometry.edgeTypeBuffer);
  }
  if (defined(edgeGeometry.edgePos0Buffer)) {
    model._pipelineResources.push(edgeGeometry.edgePos0Buffer);
  }
  if (defined(edgeGeometry.edgePos1Buffer)) {
    model._pipelineResources.push(edgeGeometry.edgePos1Buffer);
  }
  if (defined(edgeGeometry.currentTriThirdBuffer)) {
    model._pipelineResources.push(edgeGeometry.currentTriThirdBuffer);
  }
  if (defined(edgeGeometry.mateTriThirdBuffer)) {
    model._pipelineResources.push(edgeGeometry.mateTriThirdBuffer);
  }
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
        case 3: // REPEATED - ignore (duplicate of another edge)
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

/**
 * Creates line edge geometry with per-edge data for silhouette calculation.
 * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
 * @param {Object[]} edgeData Edge metadata (type, triangle info, mate indices)
 * @param {Object} edgeVisibility The edge visibility data containing silhouetteMates
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @returns {Object|undefined} Edge geometry with vertex array and index buffer
 * @private
 */
function createLineEdgeGeometry(
  edgeIndices,
  edgeData,
  edgeVisibility,
  renderResources,
  context,
) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  // Get original vertex positions from primitive
  const positionAttribute = renderResources.attributes.find(
    (attr) => attr.semantic === "POSITION" || attr.index === 0,
  );
  if (!defined(positionAttribute)) {
    console.error("No position attribute found for edge geometry");
    return undefined;
  }

  // Determine appropriate index datatype based on max vertex index
  let maxVertexIndex = 0;
  for (let i = 0; i < edgeIndices.length; i++) {
    if (edgeIndices[i] > maxVertexIndex) {
      maxVertexIndex = edgeIndices[i];
    }
  }

  const useUint32 = maxVertexIndex > 65535;
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

  // Create per-edge attributes for silhouette calculation
  const edgeCount = edgeIndices.length / 2;

  // Helper to get vertex position from buffer
  function getVertexPosition(vertexIndex, positionBuffer, componentDatatype) {
    const bytesPerComponent =
      ComponentDatatype.getSizeInBytes(componentDatatype);
    const componentsPerVertex = 3; // vec3
    const offset = vertexIndex * componentsPerVertex * bytesPerComponent;

    if (componentDatatype === ComponentDatatype.FLOAT) {
      const view = new Float32Array(positionBuffer, offset, 3);
      return [view[0], view[1], view[2]];
    }
    // Add other datatypes if needed
    return [0, 0, 0];
  }

  // Read position data
  const positionBuffer = positionAttribute.vertexBuffer._buffer;
  const positionComponentDatatype = positionAttribute.componentDatatype;

  // Create attribute arrays
  const edgeTypeArray = new Float32Array(edgeCount * 2);

  const edgePos0Array = new Float32Array(edgeCount * 2 * 3); // 2 vertices * 3 components
  const edgePos1Array = new Float32Array(edgeCount * 2 * 3);
  const currentTriThirdArray = new Float32Array(edgeCount * 2 * 3);

  let mateTriThirdArray = null;
  if (defined(edgeVisibility.silhouetteMates)) {
    mateTriThirdArray = new Float32Array(edgeCount * 2 * 3);
  }

  for (let i = 0; i < edgeCount; i++) {
    const edgeInfo = edgeData[i];
    const edgeType = edgeInfo.edgeType;

    // Edge vertices
    const v0Index = edgeIndices[i * 2];
    const v1Index = edgeIndices[i * 2 + 1];

    // Positions
    const v0Pos = getVertexPosition(
      v0Index,
      positionBuffer,
      positionComponentDatatype,
    );
    const v1Pos = getVertexPosition(
      v1Index,
      positionBuffer,
      positionComponentDatatype,
    );

    // Current triangle third vertex position
    const currentTriVertices = edgeInfo.currentTriangleVertices;
    let thirdVertexIndex = -1;
    for (let j = 0; j < 3; j++) {
      if (
        currentTriVertices[j] !== v0Index &&
        currentTriVertices[j] !== v1Index
      ) {
        thirdVertexIndex = currentTriVertices[j];
        break;
      }
    }
    const thirdPos =
      thirdVertexIndex >= 0
        ? getVertexPosition(
            thirdVertexIndex,
            positionBuffer,
            positionComponentDatatype,
          )
        : [0, 0, 0];

    // For both vertices of this edge, set the same data
    for (let vtx = 0; vtx < 2; vtx++) {
      const baseIndex = i * 2 + vtx;

      // Edge type
      edgeTypeArray[baseIndex] = edgeType;

      // Edge positions
      edgePos0Array[baseIndex * 3] = v0Pos[0];
      edgePos0Array[baseIndex * 3 + 1] = v0Pos[1];
      edgePos0Array[baseIndex * 3 + 2] = v0Pos[2];

      edgePos1Array[baseIndex * 3] = v1Pos[0];
      edgePos1Array[baseIndex * 3 + 1] = v1Pos[1];
      edgePos1Array[baseIndex * 3 + 2] = v1Pos[2];

      // Current triangle third vertex
      currentTriThirdArray[baseIndex * 3] = thirdPos[0];
      currentTriThirdArray[baseIndex * 3 + 1] = thirdPos[1];
      currentTriThirdArray[baseIndex * 3 + 2] = thirdPos[2];

      // Mate triangle third vertex (if available)
      if (
        mateTriThirdArray &&
        edgeType === 1 &&
        edgeInfo.mateVertexIndex >= 0
      ) {
        const silhouetteMates = edgeVisibility.silhouetteMates.typedArray;
        const mateVertexIndex = silhouetteMates[edgeInfo.mateVertexIndex];
        const matePos = getVertexPosition(
          mateVertexIndex,
          positionBuffer,
          positionComponentDatatype,
        );
        mateTriThirdArray[baseIndex * 3] = matePos[0];
        mateTriThirdArray[baseIndex * 3 + 1] = matePos[1];
        mateTriThirdArray[baseIndex * 3 + 2] = matePos[2];
      } else if (mateTriThirdArray) {
        // Default position for non-silhouette edges
        mateTriThirdArray[baseIndex * 3] = 0;
        mateTriThirdArray[baseIndex * 3 + 1] = 0;
        mateTriThirdArray[baseIndex * 3 + 2] = 0;
      }
    }
  }

  // Create vertex buffers and add to attributes
  const createBuffer = (data) =>
    Buffer.createVertexBuffer({
      context: context,
      typedArray: data,
      usage: BufferUsage.STATIC_DRAW,
    });

  const edgeTypeBuffer = createBuffer(edgeTypeArray);
  const edgePos0Buffer = createBuffer(edgePos0Array);
  const edgePos1Buffer = createBuffer(edgePos1Array);
  const currentTriThirdBuffer = createBuffer(currentTriThirdArray);

  // Add attributes to VAO
  const shaderBuilder = renderResources.shaderBuilder;

  const edgeAttributes = [
    ...renderResources.attributes,
    {
      index: shaderBuilder._attributeLocations.a_edgeType,
      vertexBuffer: edgeTypeBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: shaderBuilder._attributeLocations.a_edgePos0,
      vertexBuffer: edgePos0Buffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: shaderBuilder._attributeLocations.a_edgePos1,
      vertexBuffer: edgePos1Buffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
    {
      index: shaderBuilder._attributeLocations.a_currentTriThird,
      vertexBuffer: currentTriThirdBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
    },
  ];

  let mateTriThirdBuffer = null;
  if (mateTriThirdArray) {
    mateTriThirdBuffer = createBuffer(mateTriThirdArray);
    const mateLocation = shaderBuilder._attributeLocations.a_mateTriThird;
    if (defined(mateLocation)) {
      edgeAttributes.push({
        index: mateLocation,
        vertexBuffer: mateTriThirdBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        normalize: false,
      });
    }
    console.log("Silhouette mate positions prepared for", edgeCount, "edges");
  }

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
    edgePos0Buffer: edgePos0Buffer,
    edgePos1Buffer: edgePos1Buffer,
    currentTriThirdBuffer: currentTriThirdBuffer,
    mateTriThirdBuffer: mateTriThirdBuffer,
  };
}

export default EdgeVisibilityPipelineStage;
