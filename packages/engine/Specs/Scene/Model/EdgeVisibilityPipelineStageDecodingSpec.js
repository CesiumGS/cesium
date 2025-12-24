import {
  Cartesian4,
  Buffer,
  BufferUsage,
  ComponentDatatype,
  IndexDatatype,
  PrimitiveType,
  ShaderBuilder,
  ShaderDestination,
  VertexAttributeSemantic,
} from "../../../index.js";
import createContext from "../../../../../Specs/createContext.js";
import EdgeVisibilityPipelineStage from "../../../Source/Scene/Model/EdgeVisibilityPipelineStage.js";

describe("Scene/Model/EdgeVisibilityPipelineStage", function () {
  let context;

  beforeAll(function () {
    context = createContext();
  });

  afterAll(function () {
    context.destroyForSpecs();
  });

  function createTestEdgeVisibilityData() {
    // Test case from GltfLoader: Simple 2-triangle quad with shared silhouette edge
    // Triangles: [0,1,2, 0,2,3]
    // Edge visibility: [VISIBLE,HIDDEN,SILHOUETTE, HIDDEN,VISIBLE,HIDDEN] = [2,0,1, 0,2,0]
    // Expected bytes: [18, 2] = [00010010, 00000010]
    const testVisibilityBuffer = new Uint8Array([18, 2]);

    return {
      visibility: testVisibilityBuffer,
      silhouetteNormals: new Float32Array([
        0.0,
        0.0,
        1.0, // Edge 0 silhouette normal
        0.0,
        1.0,
        0.0, // Edge 2 silhouette normal
      ]),
    };
  }

  function createTestPrimitive() {
    // Create a simple 2-triangle quad
    // Vertices: (0,0,0), (1,0,0), (1,1,0), (0,1,0)
    // Triangles: [0,1,2], [0,2,3]
    const positions = new Float32Array([
      0.0,
      0.0,
      0.0, // vertex 0
      1.0,
      0.0,
      0.0, // vertex 1
      1.0,
      1.0,
      0.0, // vertex 2
      0.0,
      1.0,
      0.0, // vertex 3
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const primitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          componentDatatype: ComponentDatatype.FLOAT,
          count: 4,
          typedArray: positions,
          buffer: Buffer.createVertexBuffer({
            context: context,
            typedArray: positions,
            usage: BufferUsage.STATIC_DRAW,
          }),
          strideInBytes: 12,
          offsetInBytes: 0,
        },
      ],
      indices: {
        indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        count: 6,
        typedArray: indices,
        buffer: Buffer.createIndexBuffer({
          context: context,
          typedArray: indices,
          usage: BufferUsage.STATIC_DRAW,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        }),
      },
      mode: PrimitiveType.TRIANGLES,
      edgeVisibility: createTestEdgeVisibilityData(),
    };

    return primitive;
  }

  function createMockRenderResources(primitive) {
    const shaderBuilder = new ShaderBuilder();

    // Pre-add the required function that EdgeVisibilityPipelineStage expects
    shaderBuilder.addFunction(
      "setDynamicVaryingsVS",
      "void setDynamicVaryingsVS()\n{\n}",
      ShaderDestination.VERTEX,
    );

    return {
      shaderBuilder: shaderBuilder,
      uniformMap: {},
      runtimePrimitive: {
        primitive: primitive,
      },
    };
  }

  function createMockFrameState() {
    return {
      context: context,
    };
  }

  it("decodes edge visibility test data correctly", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    // Process the primitive through EdgeVisibilityPipelineStage
    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    // Verify edge geometry was created
    expect(renderResources.edgeGeometry).toBeDefined();
    expect(renderResources.edgeGeometry.vertexArray).toBeDefined();
    expect(renderResources.edgeGeometry.indexCount).toBeGreaterThan(0);
    expect(renderResources.edgeGeometry.primitiveType).toBe(
      PrimitiveType.LINES,
    );
  });

  it("extracts correct edge visibility values from test buffer", function () {
    const testVisibilityBuffer = new Uint8Array([18, 2]);

    // Test decoding of each edge manually
    // Expected pattern: [HARD(2), HIDDEN(0), SILHOUETTE(1), HIDDEN(0), HARD(2), HIDDEN(0)]

    // Edge 0: bits 0-1 of byte 0 (18 = 00010010)
    const edge0 = (testVisibilityBuffer[0] >> 0) & 0x3;
    expect(edge0).toBe(2); // HARD edge

    // Edge 1: bits 2-3 of byte 0
    const edge1 = (testVisibilityBuffer[0] >> 2) & 0x3;
    expect(edge1).toBe(0); // HIDDEN edge

    // Edge 2: bits 4-5 of byte 0
    const edge2 = (testVisibilityBuffer[0] >> 4) & 0x3;
    expect(edge2).toBe(1); // SILHOUETTE edge

    // Edge 3: bits 6-7 of byte 0
    const edge3 = (testVisibilityBuffer[0] >> 6) & 0x3;
    expect(edge3).toBe(0); // HIDDEN edge

    // Edge 4: bits 0-1 of byte 1 (2 = 00000010)
    const edge4 = (testVisibilityBuffer[1] >> 0) & 0x3;
    expect(edge4).toBe(2); // HARD edge

    // Edge 5: bits 2-3 of byte 1
    const edge5 = (testVisibilityBuffer[1] >> 2) & 0x3;
    expect(edge5).toBe(0); // HIDDEN edge
  });

  it("processes triangle edges in correct order", function () {
    const primitive = createTestPrimitive();
    const indices = primitive.indices.typedArray; // [0,1,2, 0,2,3]

    // Verify triangle structure
    expect(indices.length).toBe(6);

    // Triangle 0: vertices [0,1,2]
    expect(indices[0]).toBe(0);
    expect(indices[1]).toBe(1);
    expect(indices[2]).toBe(2);

    // Triangle 1: vertices [0,2,3]
    expect(indices[3]).toBe(0);
    expect(indices[4]).toBe(2);
    expect(indices[5]).toBe(3);

    // Expected edges from triangles:
    // Triangle 0: edges (0,1), (1,2), (2,0)
    // Triangle 1: edges (0,2), (2,3), (3,0)
    // Total 6 edges with visibility pattern [2,0,1, 0,2,0]
  });

  it("filters edges based on visibility values", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    // With visibility pattern [2,0,1, 0,2,0]:
    // - Edge 0 (HARD, value 2): should be included
    // - Edge 1 (HIDDEN, value 0): should be excluded
    // - Edge 2 (SILHOUETTE, value 1): should be included
    // - Edge 3 (HIDDEN, value 0): should be excluded
    // - Edge 4 (HARD, value 2): should be included
    // - Edge 5 (HIDDEN, value 0): should be excluded

    expect(renderResources.edgeGeometry).toBeDefined();

    // Expected 3 unique visible edges: (0,1), (0,2), (2,3)
    // Each edge creates 2 indices (line primitive), so indexCount should be 6
    expect(renderResources.edgeGeometry.indexCount).toBe(6);
    expect(renderResources.edgeGeometry.indexCount % 2).toBe(0); // Even number for lines
    expect(renderResources.edgeGeometry.primitiveType).toBe(
      PrimitiveType.LINES,
    );
  });

  it("handles silhouette edges correctly", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    // Verify silhouette-specific attributes are added
    const shaderBuilder = renderResources.shaderBuilder;
    const shaderProgram = shaderBuilder.buildShaderProgram(context);

    // Check for edge visibility defines in the shader program
    expect(shaderProgram._vertexShaderText).toContain("HAS_EDGE_VISIBILITY");
    expect(shaderProgram._fragmentShaderText).toContain(
      "HAS_EDGE_VISIBILITY_MRT",
    );

    // Check for silhouette-related attributes
    expect(shaderProgram._vertexShaderText).toContain("a_silhouetteNormal");
    expect(shaderProgram._vertexShaderText).toContain("a_faceNormalA");
    expect(shaderProgram._vertexShaderText).toContain("a_faceNormalB");
  });

  it("creates proper edge geometry buffers", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    expect(renderResources.edgeGeometry).toBeDefined();

    const vertexArray = renderResources.edgeGeometry.vertexArray;
    expect(vertexArray).toBeDefined();
    expect(vertexArray.indexBuffer).toBeDefined();
    expect(vertexArray._attributes).toBeDefined();

    // Verify the vertex array has the expected attributes for edge rendering
    const attributes = vertexArray._attributes;
    expect(attributes.length).toBeGreaterThan(0);
  });

  it("handles edge deduplication correctly", function () {
    const primitive = createTestPrimitive();

    // Manually extract edges to test deduplication logic
    const indices = primitive.indices.typedArray; // [0,1,2, 0,2,3]
    const testVisibility = primitive.edgeVisibility.visibility; // [18, 2]

    const expectedEdges = new Set();
    const visibilityValues = [];
    let edgeIndex = 0;

    // Process each triangle's edges and collect expected results
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const v0 = indices[i];
      const v1 = indices[i + 1];
      const v2 = indices[i + 2];

      const triangleEdges = [
        [v0, v1], // Edge 0 of current triangle
        [v1, v2], // Edge 1 of current triangle
        [v2, v0], // Edge 2 of current triangle
      ];

      for (let e = 0; e < 3; e++) {
        const byteIndex = Math.floor(edgeIndex / 4);
        const bitPairOffset = (edgeIndex % 4) * 2;
        const visibility2Bit =
          (testVisibility[byteIndex] >> bitPairOffset) & 0x3;
        visibilityValues.push(visibility2Bit);

        if (visibility2Bit !== 0) {
          // Not HIDDEN
          const [a, b] = triangleEdges[e];
          const edgeKey = `${Math.min(a, b)},${Math.max(a, b)}`;
          expectedEdges.add(edgeKey);
        }

        edgeIndex++;
      }
    }

    // Verify the expected visibility pattern [HARD(2), HIDDEN(0), SILHOUETTE(1), HIDDEN(0), HARD(2), HIDDEN(0)]
    expect(visibilityValues).toEqual([2, 0, 1, 0, 2, 0]);

    // Expected visible edges after deduplication:
    // Triangle 0: edges (0,1)[HARD], (1,2)[HIDDEN], (2,0)[SILHOUETTE] → visible: (0,1), (0,2)
    // Triangle 1: edges (0,2)[HIDDEN], (2,3)[HARD], (3,0)[HIDDEN] → visible: (2,3)
    // Total unique visible edges: (0,1), (0,2), (2,3)
    const expectedEdgeKeys = new Set(["0,1", "0,2", "2,3"]);
    expect(expectedEdges).toEqual(expectedEdgeKeys);
    expect(expectedEdges.size).toBe(3);
  });

  it("generates edge color attribute for material overrides and line strings", function () {
    const primitive = createTestPrimitive();
    primitive.edgeVisibility.materialColor = new Cartesian4(0.2, 0.3, 0.4, 1.0);
    primitive.edgeVisibility.lineStrings = [
      {
        indices: new Uint16Array([0, 1, 65535, 1, 3]),
        restartIndex: 65535,
        materialColor: new Cartesian4(0.9, 0.1, 0.2, 1.0),
      },
    ];

    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    expect(renderResources.edgeGeometry).toBeDefined();

    const attributeLocations = renderResources.shaderBuilder.attributeLocations;
    expect(attributeLocations.a_edgeColor).toBeDefined();

    const vertexDefines =
      renderResources.shaderBuilder._vertexShaderParts.defineLines;
    expect(vertexDefines).toContain("HAS_EDGE_COLOR_ATTRIBUTE");

    const attributes =
      renderResources.edgeGeometry.vertexArray._attributes ?? [];
    expect(attributes.length).toBeGreaterThan(5);
  });

  it("sets up uniforms correctly", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    expect(renderResources.uniformMap.u_isEdgePass).toBeDefined();
    expect(renderResources.uniformMap.u_isEdgePass()).toBe(false);
  });

  it("validates primitive VAO vs edge VAO structure", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    // Original primitive VAO (triangles)
    const originalIndices = primitive.indices.typedArray; // [0,1,2, 0,2,3]
    expect(originalIndices.length).toBe(6); // 6 indices for 2 triangles
    expect(primitive.mode).toBe(PrimitiveType.TRIANGLES);

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    // Edge VAO (lines)
    expect(renderResources.edgeGeometry).toBeDefined();
    expect(renderResources.edgeGeometry.primitiveType).toBe(
      PrimitiveType.LINES,
    );

    // With visibility pattern [2,0,1, 0,2,0] → 3 visible edges
    // Each edge creates 2 vertices, so 6 vertices total
    expect(renderResources.edgeGeometry.indexCount).toBe(6); // 3 edges × 2 vertices per edge
  });

  it("validates edge VAO has 6 vertices for 3 visible edges", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    const edgeVertexArray = renderResources.edgeGeometry.vertexArray;
    expect(edgeVertexArray).toBeDefined();

    // Verify vertex array structure
    const attributes = edgeVertexArray._attributes;
    expect(attributes.length).toBeGreaterThan(0);

    // Check that we have the expected vertex buffers
    let positionAttribute = null;
    let edgeTypeAttribute = null;
    let silhouetteNormalAttribute = null;
    let faceNormalAAttribute = null;
    let faceNormalBAttribute = null;

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.index === 0) {
        // Position at location 0
        positionAttribute = attr;
      } else if (attr.componentsPerAttribute === 1) {
        // Edge type (float)
        edgeTypeAttribute = attr;
      } else if (attr.componentsPerAttribute === 3) {
        // Normals (vec3)
        if (!silhouetteNormalAttribute) {
          silhouetteNormalAttribute = attr;
        } else if (!faceNormalAAttribute) {
          faceNormalAAttribute = attr;
        } else if (!faceNormalBAttribute) {
          faceNormalBAttribute = attr;
        }
      }
    }

    expect(positionAttribute).toBeDefined();
    expect(edgeTypeAttribute).toBeDefined();
    expect(silhouetteNormalAttribute).toBeDefined();
    expect(faceNormalAAttribute).toBeDefined();
    expect(faceNormalBAttribute).toBeDefined();

    // Verify buffer properties
    expect(positionAttribute.componentsPerAttribute).toBe(3); // vec3
    expect(positionAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);

    expect(edgeTypeAttribute.componentsPerAttribute).toBe(1); // float
    expect(edgeTypeAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);

    expect(silhouetteNormalAttribute.componentsPerAttribute).toBe(3); // vec3
    expect(silhouetteNormalAttribute.componentDatatype).toBe(
      ComponentDatatype.FLOAT,
    );
  });

  it("validates edge VAO vertex data correctness", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    const edgeVertexArray = renderResources.edgeGeometry.vertexArray;

    // With our test data:
    // - 3 visible edges: (0,1)[HARD], (0,2)[SILHOUETTE], (2,3)[HARD]
    // - Each edge has 2 vertices
    // - Total: 6 vertices in edge domain

    // Verify index buffer
    expect(edgeVertexArray.indexBuffer).toBeDefined();
    expect(renderResources.edgeGeometry.indexCount).toBe(6);

    // Expected vertex positions in edge domain:
    // Edge 0: vertices (0,1) → positions: (0,0,0), (1,0,0)
    // Edge 1: vertices (0,2) → positions: (0,0,0), (1,1,0)
    // Edge 2: vertices (2,3) → positions: (1,1,0), (0,1,0)

    // The edge VAO creates a separate vertex domain with 6 vertices total
    const indexBuffer = edgeVertexArray.indexBuffer;
    expect(indexBuffer).toBeDefined();
  });

  it("validates silhouette normal VAO data values", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    const edgeVertexArray = renderResources.edgeGeometry.vertexArray;
    const attributes = edgeVertexArray._attributes;

    // Find silhouette normal attribute buffer
    let silhouetteNormalBuffer = null;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      // Look for vec3 attribute that's not position (index 0)
      if (attr.componentsPerAttribute === 3 && attr.index !== 0) {
        silhouetteNormalBuffer = attr.vertexBuffer;
        break;
      }
    }

    expect(silhouetteNormalBuffer).toBeDefined();

    expect(silhouetteNormalBuffer.sizeInBytes).toBe(6 * 3 * 4);
  });

  it("validates edge type VAO data values", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    const edgeVertexArray = renderResources.edgeGeometry.vertexArray;
    const attributes = edgeVertexArray._attributes;

    // Find edge type attribute buffer (componentsPerAttribute === 1)
    let edgeTypeBuffer = null;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.componentsPerAttribute === 1) {
        edgeTypeBuffer = attr.vertexBuffer;
        break;
      }
    }

    expect(edgeTypeBuffer).toBeDefined();

    expect(edgeTypeBuffer.sizeInBytes).toBe(6 * 4);
  });

  it("validates edge position VAO data values", function () {
    const primitive = createTestPrimitive();
    const renderResources = createMockRenderResources(primitive);
    const frameState = createMockFrameState();

    EdgeVisibilityPipelineStage.process(renderResources, primitive, frameState);

    const edgeVertexArray = renderResources.edgeGeometry.vertexArray;
    const attributes = edgeVertexArray._attributes;

    // Find position attribute (index === 0)
    let positionBuffer = null;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.index === 0) {
        positionBuffer = attr.vertexBuffer;
        break;
      }
    }

    expect(positionBuffer).toBeDefined();
    expect(positionBuffer.sizeInBytes).toBe(6 * 3 * 4);
  });
});
