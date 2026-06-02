import { buildVectorGltfFromMVT, PrimitiveType } from "../../index.js";

/**
 * Parse a GLB Uint8Array and return the embedded glTF JSON.
 * @param {Uint8Array} glb
 * @returns {object}
 */
function parseGlbJson(glb) {
  const view = new DataView(glb.buffer, glb.byteOffset);
  // JSON chunk starts at byte 12: 4-byte length + 4-byte type + data
  const jsonLength = view.getUint32(12, true);
  const jsonBytes = glb.subarray(20, 20 + jsonLength);
  return JSON.parse(new TextDecoder().decode(jsonBytes));
}

describe("Scene/buildVectorGltfFromMVT", function () {
  const tileCoordinates = {
    tileX: 0,
    tileY: 0,
    tileZ: 0,
  };

  it("returns undefined for empty decoded tile", function () {
    const decoded = {
      layers: [
        {
          name: "empty",
          extent: 4096,
          features: [],
        },
      ],
    };

    const gltf = buildVectorGltfFromMVT(decoded, tileCoordinates);
    expect(gltf).toBeUndefined();
  });

  it("builds vector primitives for point, line, and polygon features", function () {
    const decoded = {
      layers: [
        {
          name: "testlayer",
          extent: 4096,
          features: [
            {
              type: "Point",
              geometry: [{ x: 2000, y: 2000 }],
              properties: {},
            },
            {
              type: "LineString",
              geometry: [
                [
                  { x: 1600, y: 1600 },
                  { x: 2200, y: 1800 },
                  { x: 2600, y: 2100 },
                ],
              ],
              properties: {},
            },
            {
              type: "Polygon",
              geometry: [
                [
                  { x: 1200, y: 1200 },
                  { x: 2200, y: 1200 },
                  { x: 2200, y: 2200 },
                  { x: 1200, y: 2200 },
                  { x: 1200, y: 1200 },
                ],
              ],
              properties: {},
            },
          ],
        },
      ],
    };

    const glb = buildVectorGltfFromMVT(decoded, tileCoordinates);
    expect(glb).toBeDefined();
    expect(glb instanceof Uint8Array).toBe(true);

    const gltf = parseGlbJson(glb);
    expect(gltf.extensionsUsed).toContain("EXT_mesh_polygon");
    expect(gltf.extensionsUsed).toContain("EXT_mesh_features");
    expect(gltf.extensionsUsed).toContain("EXT_structural_metadata");
    expect(gltf.extensionsRequired).toBeUndefined();

    const primitives = gltf.meshes[0].primitives;
    expect(primitives.length).toBe(3);

    const pointPrimitive = primitives.find(function (p) {
      return p.mode === PrimitiveType.POINTS;
    });
    const linePrimitive = primitives.find(function (p) {
      return p.mode === PrimitiveType.LINE_STRIP;
    });
    const polygonPrimitive = primitives.find(function (p) {
      return p.mode === PrimitiveType.TRIANGLES;
    });

    expect(pointPrimitive).toBeDefined();
    expect(linePrimitive).toBeDefined();
    expect(polygonPrimitive).toBeDefined();

    expect(pointPrimitive.extensions?.EXT_mesh_polygon).toBeUndefined();
    expect(linePrimitive.extensions?.EXT_mesh_polygon).toBeUndefined();
    expect(polygonPrimitive.extensions.EXT_mesh_polygon).toBeDefined();
    expect(polygonPrimitive.extensions.EXT_mesh_polygon.count).toBeGreaterThan(
      0,
    );
    expect(
      polygonPrimitive.extensions.EXT_mesh_polygon.loopIndices,
    ).toBeDefined();
    expect(
      polygonPrimitive.extensions.EXT_mesh_polygon.loopIndicesOffsets,
    ).toBeDefined();
    expect(
      polygonPrimitive.extensions.EXT_mesh_polygon.indicesOffsets,
    ).toBeDefined();
    expect(polygonPrimitive.indices).toBeDefined();

    expect(pointPrimitive.extensions.EXT_mesh_features).toBeDefined();
    expect(linePrimitive.extensions.EXT_mesh_features).toBeDefined();
    expect(polygonPrimitive.extensions.EXT_mesh_features).toBeDefined();
  });

  it("encodes feature properties into EXT_structural_metadata", function () {
    const decoded = {
      layers: [
        {
          name: "roads",
          extent: 4096,
          features: [
            {
              type: "LineString",
              geometry: [
                [
                  { x: 100, y: 100 },
                  { x: 200, y: 200 },
                ],
              ],
              properties: { name: "Main St", lanes: 4, oneway: true },
            },
            {
              type: "LineString",
              geometry: [
                [
                  { x: 300, y: 300 },
                  { x: 400, y: 400 },
                ],
              ],
              properties: { name: "Oak Ave", lanes: 2, oneway: false },
            },
          ],
        },
        {
          name: "buildings",
          extent: 4096,
          features: [
            {
              type: "Polygon",
              geometry: [
                [
                  { x: 500, y: 500 },
                  { x: 600, y: 500 },
                  { x: 600, y: 600 },
                  { x: 500, y: 600 },
                  { x: 500, y: 500 },
                ],
              ],
              properties: { name: "Tower", height: 120.5 },
            },
          ],
        },
      ],
    };

    const glb = buildVectorGltfFromMVT(decoded, tileCoordinates);
    expect(glb).toBeDefined();

    const gltf = parseGlbJson(glb);

    // Extension is declared
    expect(gltf.extensionsUsed).toContain("EXT_structural_metadata");

    // Root extension is present
    const metadata = gltf.extensions.EXT_structural_metadata;
    expect(metadata).toBeDefined();

    // Schema has the expected class
    const schema = metadata.schema;
    expect(schema.classes.mvt_feature).toBeDefined();

    const classProps = schema.classes.mvt_feature.properties;
    expect(classProps._layer.type).toBe("STRING");
    expect(classProps.name.type).toBe("STRING");
    expect(classProps.lanes.type).toBe("SCALAR");
    expect(classProps.lanes.componentType).toBe("FLOAT64");
    expect(classProps.oneway.type).toBe("BOOLEAN");
    expect(classProps.height.type).toBe("SCALAR");
    expect(classProps.height.componentType).toBe("FLOAT64");

    // Property table has correct count (3 unique features)
    const table = metadata.propertyTables[0];
    expect(table.class).toBe("mvt_feature");
    expect(table.count).toBe(3);

    // Table properties reference bufferViews
    expect(table.properties._layer.values).toBeDefined();
    expect(table.properties._layer.stringOffsets).toBeDefined();
    expect(table.properties.name.values).toBeDefined();
    expect(table.properties.name.stringOffsets).toBeDefined();
    expect(table.properties.lanes.values).toBeDefined();
    expect(table.properties.oneway.values).toBeDefined();
    expect(table.properties.height.values).toBeDefined();

    // EXT_mesh_features links to propertyTable 0
    const primitives = gltf.meshes[0].primitives;
    for (const prim of primitives) {
      if (prim.extensions.EXT_mesh_features) {
        expect(
          prim.extensions.EXT_mesh_features.featureIds[0].propertyTable,
        ).toBe(0);
      }
    }
  });

  it("encodes string properties with binary values and offsets", function () {
    const decoded = {
      layers: [
        {
          name: "places",
          extent: 4096,
          features: [
            {
              type: "Point",
              geometry: [{ x: 1000, y: 1000 }],
              properties: { name: "Hello" },
            },
            {
              type: "Point",
              geometry: [{ x: 2000, y: 2000 }],
              properties: { name: "World" },
            },
          ],
        },
      ],
    };

    const glb = buildVectorGltfFromMVT(decoded, tileCoordinates);
    const gltf = parseGlbJson(glb);
    const metadata = gltf.extensions.EXT_structural_metadata;
    const table = metadata.propertyTables[0];

    // Verify string property has both values and stringOffsets
    expect(table.properties.name.values).toBeDefined();
    expect(table.properties.name.stringOffsets).toBeDefined();
    expect(table.properties.name.stringOffsetType).toBe("UINT32");

    // Verify _layer property
    expect(table.properties._layer.values).toBeDefined();
    expect(table.properties._layer.stringOffsets).toBeDefined();
  });

  it("handles features with no properties gracefully", function () {
    const decoded = {
      layers: [
        {
          name: "minimal",
          extent: 4096,
          features: [
            {
              type: "Point",
              geometry: [{ x: 500, y: 500 }],
            },
          ],
        },
      ],
    };

    const glb = buildVectorGltfFromMVT(decoded, tileCoordinates);
    expect(glb).toBeDefined();

    const gltf = parseGlbJson(glb);
    // Should still have _layer property
    const metadata = gltf.extensions.EXT_structural_metadata;
    expect(metadata).toBeDefined();
    expect(metadata.schema.classes.mvt_feature.properties._layer).toBeDefined();
  });
});
