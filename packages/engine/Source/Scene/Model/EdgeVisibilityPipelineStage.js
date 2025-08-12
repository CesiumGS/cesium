import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PrimitiveOutlineGenerator from "./PrimitiveOutlineGenerator.js";

/**
 * Pipeline stage for generating edge geometry from EXT_mesh_primitive_edge_visibility data.
 * Uses PrimitiveOutlineGenerator to create quad-based geometry for proper edge rendering.
 *
 * @namespace EdgeVisibilityPipelineStage
 *
 * @private
 */
const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

/**
 * Processes a primitive with edge visibility data and generates edge geometry.
 * Extracts visible edges and uses PrimitiveOutlineGenerator for proper quad-based edge rendering.
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

  // Extract visible edges from EXT_mesh_primitive_edge_visibility data
  const outlineIndices = extractVisibleEdgesAsOutlineIndices(primitive);
  if (!defined(outlineIndices) || outlineIndices.length === 0) {
    return;
  }

  // Get original vertex count and triangle indices from the primitive (not render resources)
  const vertexCount = primitive.attributes[0].count;
  const triangleIndices = primitive.indices.typedArray;

  // Use PrimitiveOutlineGenerator to create proper quad-based edge geometry
  const generator = new PrimitiveOutlineGenerator({
    triangleIndices: triangleIndices.slice(), // Copy to avoid modifying original
    outlineIndices: outlineIndices,
    originalVertexCount: vertexCount,
  });

  // Create edge geometry using the generator's output and primitive data
  const edgeGeometry = createEdgeGeometry(
    generator,
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
    primitiveType: PrimitiveType.TRIANGLES, // Quads rendered as triangles
    pass: Pass.CESIUM_3D_TILE, // Use regular 3D tile pass for testing
  };

  // Track resources for cleanup
  const model = renderResources.model;
  model._pipelineResources.push(
    edgeGeometry.indexBuffer,
    edgeGeometry.vertexArray,
  );

  // Add shaders for edge rendering
  addEdgeShaders(renderResources);
};

/**
 * Extracts visible edge segments from EXT_mesh_primitive_edge_visibility data
 * and converts them to the format expected by PrimitiveOutlineGenerator.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {number[]} Array of outline indices (pairs of vertex indices)
 * @private
 */
function extractVisibleEdgesAsOutlineIndices(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;

  if (!defined(visibility) || !defined(indices)) {
    return [];
  }

  const triangleIndexArray = indices.typedArray;
  const vertexCount = primitive.attributes[0].count;
  const outlinePairs = [];
  const seenEdgeHashes = new Set();

  let bitOffset = 0; // 2 bits per edge in order (v0:v1, v1:v2, v2:v0)
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

      // Extract SILHOUETTE (1) and VISIBLE (2) edges
      if (visibility2Bit === 1 || visibility2Bit === 2) {
        const a = edgeVertices[e][0];
        const b = edgeVertices[e][1];
        const small = Math.min(a, b);
        const big = Math.max(a, b);
        const hash = small * vertexCount + big;

        if (!seenEdgeHashes.has(hash)) {
          seenEdgeHashes.add(hash);
          outlinePairs.push(small, big);
        }
      }
    }
  }

  return outlinePairs;
}

/**
 * Creates edge geometry using PrimitiveOutlineGenerator output.
 * Reads vertex data from primitive attributes and creates updated geometry.
 * @param {PrimitiveOutlineGenerator} generator The outline generator
 * @param {ModelComponents.Primitive} primitive The original primitive
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @returns {Object} Edge geometry with vertex array and index buffer
 * @private
 */
function createEdgeGeometry(generator, primitive, renderResources, context) {
  // Get the outline coordinates from the generator
  const outlineCoordinates = generator.outlineCoordinates;
  const updatedTriangleIndices = generator.updatedTriangleIndices;

  if (!defined(outlineCoordinates) || outlineCoordinates.length === 0) {
    return undefined;
  }

  // Create vertex buffer for outline coordinates
  const outlineBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: outlineCoordinates,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Update primitive attributes using their original typedArray data
  const updatedAttributes = [];
  for (let i = 0; i < primitive.attributes.length; i++) {
    const primitiveAttr = primitive.attributes[i];

    if (!defined(primitiveAttr.typedArray)) {
      continue; // Skip attributes without typedArray
    }

    const updatedTypedArray = generator.updateAttribute(
      primitiveAttr.typedArray,
    );

    const updatedBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: updatedTypedArray,
      usage: BufferUsage.STATIC_DRAW,
    });

    // Use attribute properties directly from primitive
    const componentsPerAttribute =
      primitiveAttr.type === "VEC3"
        ? 3
        : primitiveAttr.type === "VEC2"
          ? 2
          : primitiveAttr.type === "SCALAR"
            ? 1
            : 4;

    updatedAttributes.push({
      index: i, // Use simple indexing
      vertexBuffer: updatedBuffer,
      componentDatatype: primitiveAttr.componentDatatype,
      componentsPerAttribute: componentsPerAttribute,
      offsetInBytes: 0,
      strideInBytes: 0,
    });
  }

  // Add outline coordinates attribute
  updatedAttributes.push({
    index: updatedAttributes.length,
    vertexBuffer: outlineBuffer,
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 3,
    offsetInBytes: 0,
    strideInBytes: 0,
  });

  // Create index buffer for updated triangle indices
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: updatedTriangleIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.fromTypedArray(updatedTriangleIndices),
  });

  // Create vertex array
  const vertexArray = new VertexArray({
    context: context,
    indexBuffer: indexBuffer,
    attributes: updatedAttributes,
  });

  return {
    vertexArray: vertexArray,
    indexBuffer: indexBuffer,
    indexCount: updatedTriangleIndices.length,
    vertexCount: outlineCoordinates.length / 3,
  };
}

/**
 * Adds edge shader support to the render resources.
 * Uses outline coordinates generated by PrimitiveOutlineGenerator.
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @private
 */
function addEdgeShaders(renderResources) {
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  // Add outline coordinates attribute
  shaderBuilder.addAttribute("vec3", "a_outlineCoordinates");
  shaderBuilder.addVarying("vec3", "v_outlineCoordinates");

  // Add uniforms for edge rendering control
  shaderBuilder.addUniform(
    "bool",
    "model_showEdges",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addUniform(
    "vec4",
    "model_edgeColor",
    ShaderDestination.FRAGMENT,
  );

  // Set up uniforms
  uniformMap.model_showEdges = function () {
    return true; // Always show edges
  };
  uniformMap.model_edgeColor = function () {
    return [1.0, 0.0, 0.0, 1.0]; // Red edges
  };

  // Add vertex shader lines (pass through outline coordinates)
  shaderBuilder.addVertexLines([
    "void edgeVisibilityStage() {",
    "    v_outlineCoordinates = a_outlineCoordinates;",
    "}",
  ]);

  // Add fragment shader function (use outline coordinates for edge rendering)
  shaderBuilder.addFragmentLines([
    "void edgeVisibilityStage(inout czm_modelMaterial material) {",
    "    if (model_showEdges) {",
    "        // Use outline coordinates to determine if this fragment is part of an edge",
    "        vec3 coord = v_outlineCoordinates;",
    "        float edgeIntensity = max(coord.x, max(coord.y, coord.z));",
    "        if (edgeIntensity > 0.5) {",
    "            material.diffuse = model_edgeColor.rgb;",
    "            material.alpha = model_edgeColor.a;",
    "        }",
    "    }",
    "}",
  ]);
}

export default EdgeVisibilityPipelineStage;
