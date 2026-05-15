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
    expect(gltf.extensionsUsed).toEqual([
      "CESIUM_mesh_vector",
      "EXT_mesh_features",
    ]);
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

    expect(pointPrimitive.extensions.CESIUM_mesh_vector.vector).toBe(true);
    expect(linePrimitive.extensions.CESIUM_mesh_vector.vector).toBe(true);
    expect(polygonPrimitive.extensions.CESIUM_mesh_vector.vector).toBe(true);
    expect(
      polygonPrimitive.extensions.CESIUM_mesh_vector.polygonAttributeOffsets,
    ).toBeDefined();
    expect(
      polygonPrimitive.extensions.CESIUM_mesh_vector.polygonIndicesOffsets,
    ).toBeDefined();

    expect(pointPrimitive.extensions.EXT_mesh_features).toBeDefined();
    expect(linePrimitive.extensions.EXT_mesh_features).toBeDefined();
    expect(polygonPrimitive.extensions.EXT_mesh_features).toBeDefined();
  });
});
