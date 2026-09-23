import { buildVectorTileBuffers } from "../../index.js";
import { collectVectorBufferTransferables } from "../../Source/Scene/buildVectorTileBuffers.js";

const NULL_FEATURE_ID = 0xffffffff;
const RESTART_INDEX = 0xffffffff;

const tileCoordinates = {
  tileX: 0,
  tileY: 0,
  tileZ: 0,
};

function pointFeature(x, y, properties) {
  return {
    type: "Point",
    geometry: [{ x: x, y: y }],
    properties: properties ?? {},
  };
}

function lineFeature(lines, properties) {
  return {
    type: "LineString",
    geometry: lines.map(function (line) {
      return line.map(function (p) {
        return { x: p[0], y: p[1] };
      });
    }),
    properties: properties ?? {},
  };
}

function polygonFeature(rings, properties) {
  return {
    type: "Polygon",
    geometry: rings.map(function (ring) {
      return ring.map(function (p) {
        return { x: p[0], y: p[1] };
      });
    }),
    properties: properties ?? {},
  };
}

// Outer rings have non-positive signed area (MVT screen-space convention,
// y down); holes have positive signed area.
const outerSquare = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const innerHole = [
  [2, 2],
  [2, 8],
  [8, 8],
  [8, 2],
  [2, 2],
];

describe("Scene/buildVectorTileBuffers", function () {
  it("returns undefined when no layer has geometry", function () {
    const decoded = {
      layers: [{ name: "empty", extent: 4096, features: [] }],
    };
    expect(buildVectorTileBuffers(decoded, tileCoordinates)).toBeUndefined();
  });

  it("builds point buffers with local positions relative to the tile center", function () {
    const decoded = {
      layers: [
        {
          name: "poi",
          extent: 4096,
          // The center of tile 0/0/0 is (lon 0, lat 0), which is the RTC
          // origin, so this point maps to the local origin.
          features: [pointFeature(2048, 2048)],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    expect(buffers).toBeDefined();
    expect(buffers.layers.length).toBe(1);

    const points = buffers.layers[0].points;
    expect(points).toBeDefined();
    expect(points.positions.length).toBe(3);
    expect(points.positions[0]).toBeCloseTo(0, 5);
    expect(points.positions[1]).toBeCloseTo(0, 5);
    expect(points.positions[2]).toBeCloseTo(0, 5);
    expect(points.featureIds).toEqual(new Uint32Array([0]));

    expect(buffers.origin.x).toBeGreaterThan(6.0e6); // ~WGS84 radius
    expect(buffers.origin.y).toBeCloseTo(0, 5);
    expect(buffers.origin.z).toBeCloseTo(0, 5);
    expect(buffers.nullFeatureId).toBe(NULL_FEATURE_ID);
  });

  it("assigns dense auto-increment feature IDs and collects properties", function () {
    const decoded = {
      layers: [
        {
          name: "poi",
          extent: 4096,
          features: [
            pointFeature(100, 100, { name: "a" }),
            pointFeature(200, 200, { name: "b" }),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    expect(buffers.featureCount).toBe(2);
    expect(buffers.layers[0].points.featureIds).toEqual(
      new Uint32Array([0, 1]),
    );
    expect(buffers.properties.length).toBe(2);
    expect(buffers.properties[0].name).toBe("a");
    expect(buffers.properties[1].name).toBe("b");
  });

  it("injects the layer name as the _layer property", function () {
    const decoded = {
      layers: [
        {
          name: "roads",
          extent: 4096,
          features: [pointFeature(1, 1, { name: "a" })],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    expect(buffers.properties[0]._layer).toBe("roads");
  });

  it("builds polyline buffers with restart-separated line strip indices", function () {
    const decoded = {
      layers: [
        {
          name: "lines",
          extent: 4096,
          features: [
            lineFeature([
              [
                [0, 0],
                [10, 0],
                [10, 5],
              ],
              [
                [20, 20],
                [30, 30],
              ],
            ]),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    const polylines = buffers.layers[0].polylines;
    expect(polylines).toBeDefined();
    expect(polylines.count).toBe(2);
    expect(polylines.positions.length).toBe(5 * 3);
    expect(polylines.featureIds).toEqual(new Uint32Array([0, 0, 0, 0, 0]));
    // Trailing restart index is removed.
    expect(polylines.indices).toEqual(
      new Uint32Array([0, 1, 2, RESTART_INDEX, 3, 4]),
    );
  });

  it("triangulates polygons and records per-polygon offsets", function () {
    const decoded = {
      layers: [
        {
          name: "areas",
          extent: 4096,
          features: [
            polygonFeature([outerSquare]),
            polygonFeature([
              [
                [20, 20],
                [30, 20],
                [30, 30],
                [20, 20],
              ],
            ]),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    const polygons = buffers.layers[0].polygons;
    expect(polygons).toBeDefined();
    expect(polygons.count).toBe(2);
    // First polygon: 4 vertices, 2 triangles. Second: 3 vertices, 1 triangle.
    expect(polygons.positions.length).toBe(7 * 3);
    expect(polygons.attributeOffsets).toEqual(new Uint32Array([0, 4]));
    expect(polygons.indicesOffsets).toEqual(new Uint32Array([0, 6]));
    expect(polygons.indices.length).toBe(9);
    expect(polygons.featureIds).toEqual(new Uint32Array([0, 0, 0, 0, 1, 1, 1]));
    expect(polygons.holeCounts).toBeUndefined();
    expect(polygons.holeOffsets).toBeUndefined();

    // Triangle indices of the second polygon reference its own vertices.
    for (let i = 6; i < 9; i++) {
      expect(polygons.indices[i]).toBeGreaterThanOrEqual(4);
      expect(polygons.indices[i]).toBeLessThan(7);
    }
  });

  it("records hole offsets for polygons with holes", function () {
    const decoded = {
      layers: [
        {
          name: "areas",
          extent: 4096,
          features: [polygonFeature([outerSquare, innerHole])],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    const polygons = buffers.layers[0].polygons;
    expect(polygons.count).toBe(1);
    // 4 outer + 4 hole vertices (closing vertices stripped).
    expect(polygons.positions.length).toBe(8 * 3);
    expect(polygons.holeCounts).toEqual(new Uint32Array([1]));
    expect(polygons.holeOffsets).toEqual(new Uint32Array([4]));
  });

  it("maps feature IDs from a property when featureIdProperty is set", function () {
    const decoded = {
      layers: [
        {
          name: "poi",
          extent: 4096,
          features: [
            pointFeature(1, 1, { osm_id: 42, name: "first" }),
            pointFeature(2, 2, { osm_id: 7, name: "other" }),
            pointFeature(3, 3, { osm_id: 42, name: "ignored duplicate" }),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates, {
      featureIdProperty: "osm_id",
    });

    // Two distinct property values -> two dense feature IDs.
    expect(buffers.featureCount).toBe(2);
    expect(buffers.layers[0].points.featureIds).toEqual(
      new Uint32Array([0, 1, 0]),
    );
    // First-seen properties win for a shared feature ID.
    expect(buffers.properties[0].name).toBe("first");
    expect(buffers.properties[1].name).toBe("other");
  });

  it("assigns the null feature ID when the featureIdProperty is missing", function () {
    const decoded = {
      layers: [
        {
          name: "poi",
          extent: 4096,
          features: [
            pointFeature(1, 1, { name: "no id here" }),
            pointFeature(2, 2, { osm_id: 42 }),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates, {
      featureIdProperty: "osm_id",
    });

    expect(buffers.featureCount).toBe(1);
    expect(buffers.layers[0].points.featureIds).toEqual(
      new Uint32Array([NULL_FEATURE_ID, 0]),
    );
    expect(buffers.properties.length).toBe(1);
    expect(buffers.properties[0].osm_id).toBe(42);
  });

  it("builds polygon buffers from pre-tessellated data", function () {
    // Feature 0: square, 4 vertices, 2 triangles.
    // Feature 1: triangle, 3 vertices, 1 triangle.
    // The index buffer is per-feature local (starts at 0 for each feature).
    const preTessellated = {
      vertexBuffer: new Int32Array([
        0, 0, 10, 0, 10, 10, 0, 10, 20, 20, 30, 20, 30, 30,
      ]),
      indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3, 0, 1, 2]),
      triangleOffsets: new Uint32Array([0, 2, 3]),
      vertexOffsets: new Uint32Array([0, 4, 7]),
      numFeatures: 2,
    };
    const decoded = {
      layers: [
        {
          name: "areas",
          extent: 4096,
          preTessellated: preTessellated,
          features: [
            polygonFeature([outerSquare], { name: "a" }),
            polygonFeature(
              [
                [
                  [20, 20],
                  [30, 20],
                  [30, 30],
                  [20, 20],
                ],
              ],
              { name: "b" },
            ),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    const polygons = buffers.layers[0].polygons;
    expect(polygons).toBeDefined();
    // The regular per-feature polygon path is skipped; only the
    // pre-tessellated geometry is used.
    expect(polygons.count).toBe(2);
    expect(polygons.positions.length).toBe(7 * 3);
    expect(polygons.attributeOffsets).toEqual(new Uint32Array([0, 4]));
    expect(polygons.indicesOffsets).toEqual(new Uint32Array([0, 6]));
    // Local indices are converted to collection-global indices.
    expect(polygons.indices).toEqual(
      new Uint32Array([0, 1, 2, 0, 2, 3, 4, 5, 6]),
    );
    expect(polygons.featureIds).toEqual(new Uint32Array([0, 0, 0, 0, 1, 1, 1]));

    // Properties are still collected from the features.
    expect(buffers.featureCount).toBe(2);
    expect(buffers.properties[0].name).toBe("a");
    expect(buffers.properties[1].name).toBe("b");
  });

  it("collectVectorBufferTransferables returns each backing ArrayBuffer once", function () {
    const decoded = {
      layers: [
        {
          name: "mixed",
          extent: 4096,
          features: [
            pointFeature(1, 1),
            lineFeature([
              [
                [0, 0],
                [10, 10],
              ],
            ]),
            polygonFeature([outerSquare]),
          ],
        },
      ],
    };

    const buffers = buildVectorTileBuffers(decoded, tileCoordinates);
    const transferables = collectVectorBufferTransferables(buffers);

    // points: 2 buffers, polylines: 3, polygons: 5 (no holes).
    expect(transferables.length).toBe(10);
    expect(new Set(transferables).size).toBe(transferables.length);
    for (const transferable of transferables) {
      expect(transferable instanceof ArrayBuffer).toBe(true);
    }
  });
});
