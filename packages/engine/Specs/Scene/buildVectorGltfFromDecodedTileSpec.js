import { buildVectorGltfFromDecodedTile, PrimitiveType } from "../../index.js";

describe("Scene/buildVectorGltfFromDecodedTile", function () {
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

    const gltf = buildVectorGltfFromDecodedTile(decoded, tileCoordinates);
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

    const gltf = buildVectorGltfFromDecodedTile(decoded, tileCoordinates);
    expect(gltf).toBeDefined();
    expect(gltf.extensionsUsed).toEqual(["CESIUM_mesh_vector"]);
    expect(gltf.extensionsRequired).toEqual(["CESIUM_mesh_vector"]);

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

    expect(pointPrimitive.extensions.EXT_mesh_features).toBeUndefined();
    expect(linePrimitive.extensions.EXT_mesh_features).toBeUndefined();
    expect(polygonPrimitive.extensions.EXT_mesh_features).toBeUndefined();
  });
});
