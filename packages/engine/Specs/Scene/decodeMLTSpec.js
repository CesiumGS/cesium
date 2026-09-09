import { encodeTile } from "@maplibre/mlt/dist/encoding/mltEncoder.js";
import { decodeMLT, Resource } from "../../index.js";

/**
 * Encodes MLT layers and returns the tile as an ArrayBuffer, as decodeMLT
 * expects.
 * @param {object[]} layers
 * @returns {ArrayBuffer}
 */
function encodeTileToArrayBuffer(layers) {
  const bytes = encodeTile(layers);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

describe("Scene/decodeMLT", function () {
  it("decodes layer name and extent", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "roads",
        extent: 512,
        features: [
          {
            geometry: { type: "Point", coordinates: [100, 200] },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    expect(decoded.layers.length).toBe(1);
    expect(decoded.layers[0].name).toBe("roads");
    expect(decoded.layers[0].extent).toBe(512);
  });

  it("decodes point geometry and feature properties", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "poi",
        extent: 4096,
        features: [
          {
            geometry: { type: "Point", coordinates: [100, 200] },
            properties: { name: "a", height: 5, flag: true },
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("Point");
    expect(feature.geometry).toEqual([{ x: 100, y: 200 }]);
    expect(feature.properties.name).toBe("a");
    expect(Number(feature.properties.height)).toBe(5);
    expect(feature.properties.flag).toBe(true);
  });

  it("omits null properties", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "poi",
        extent: 4096,
        features: [
          {
            geometry: { type: "Point", coordinates: [1, 2] },
            properties: { name: "a" },
          },
          {
            geometry: { type: "Point", coordinates: [3, 4] },
            properties: { name: null },
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const features = decoded.layers[0].features;
    expect(features[0].properties.name).toBe("a");
    expect("name" in features[1].properties).toBe(false);
  });

  it("decodes linestring geometry as an array of line segments", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "lines",
        extent: 4096,
        features: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [10, 0],
                [10, 5],
              ],
            },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("LineString");
    expect(feature.geometry).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ],
    ]);
  });

  it("decodes polygon geometry with a closing vertex on each ring", function () {
    // Rings are encoded without the repeated closing position; the decoded
    // rings must be closed for the polygon ring grouping in
    // buildVectorTileBuffers.
    const tile = encodeTileToArrayBuffer([
      {
        name: "areas",
        extent: 4096,
        features: [
          {
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [10, 0],
                  [10, 10],
                  [0, 10],
                ],
              ],
            },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("Polygon");
    expect(feature.geometry).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
    ]);
  });

  it("flattens multipoint geometry into a single point list", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "poi",
        extent: 4096,
        features: [
          {
            geometry: {
              type: "MultiPoint",
              coordinates: [
                [1, 2],
                [3, 4],
              ],
            },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("Point");
    expect(feature.geometry).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it("decodes multilinestring geometry as multiple line segments", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "lines",
        extent: 4096,
        features: [
          {
            geometry: {
              type: "MultiLineString",
              coordinates: [
                [
                  [0, 0],
                  [5, 5],
                ],
                [
                  [6, 6],
                  [9, 9],
                ],
              ],
            },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("LineString");
    expect(feature.geometry.length).toBe(2);
    expect(feature.geometry[0]).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ]);
    expect(feature.geometry[1]).toEqual([
      { x: 6, y: 6 },
      { x: 9, y: 9 },
    ]);
  });

  it("decodes multiple layers", function () {
    const tile = encodeTileToArrayBuffer([
      {
        name: "first",
        extent: 4096,
        features: [
          {
            geometry: { type: "Point", coordinates: [1, 1] },
            properties: {},
          },
        ],
      },
      {
        name: "second",
        extent: 512,
        features: [
          {
            geometry: { type: "Point", coordinates: [2, 2] },
            properties: {},
          },
        ],
      },
    ]);

    const decoded = decodeMLT(tile);
    expect(decoded.layers.length).toBe(2);
    expect(decoded.layers[0].name).toBe("first");
    expect(decoded.layers[1].name).toBe("second");
    expect(decoded.layers[1].extent).toBe(512);
  });

  // The remaining specs use small synthetic single-layer tiles produced by
  // the Java reference encoder (maplibre/maplibre-tile-spec encode.jar),
  // which — unlike the JS encoder used above — supports pre-tessellation
  // (--tessellate --outlines ALL). One fixture per geometry type; the
  // tessellated polygon fixture encodes the same source tile as
  // polygons.mlt.
  describe("Java encoder fixtures", function () {
    async function loadFixtureLayer(name) {
      const decoded = decodeMLT(
        await Resource.fetchArrayBuffer(`./Data/MLT/${name}`),
      );
      expect(decoded.layers.length).toBe(1);
      return decoded.layers[0];
    }

    it("decodes point and multipoint geometry with properties", async function () {
      const points = await loadFixtureLayer("points.mlt");

      expect(points.name).toBe("points");
      expect(points.extent).toBe(4096);
      expect(points.features.length).toBe(3);
      expect(points.features[0].type).toBe("Point");
      expect(points.features[0].geometry).toEqual([{ x: 100, y: 200 }]);
      expect(points.features[0].properties.name).toBe("alpha");
      expect(points.features[0].properties.height).toBe(5.25);
      expect(points.features[0].properties.active).toBe(true);
      expect(points.features[1].properties.active).toBe(false);
      // Multipoint is flattened into a single point list.
      expect(points.features[2].geometry).toEqual([
        { x: 500, y: 600 },
        { x: 700, y: 800 },
      ]);
      expect(points.preTessellated).toBeUndefined();
    });

    it("decodes linestring and multilinestring geometry with properties", async function () {
      const lines = await loadFixtureLayer("lines.mlt");

      expect(lines.name).toBe("lines");
      expect(lines.extent).toBe(4096);
      expect(lines.features.length).toBe(2);
      expect(lines.features[0].type).toBe("LineString");
      expect(lines.features[0].geometry).toEqual([
        [
          { x: 0, y: 0 },
          { x: 1000, y: 1000 },
          { x: 2000, y: 1000 },
        ],
      ]);
      expect(lines.features[0].properties.road).toBe("main");
      expect(Number(lines.features[0].properties.lanes)).toBe(2);
      // Multilinestring decodes as multiple segments.
      expect(lines.features[1].geometry.length).toBe(2);
      expect(lines.features[1].geometry[1]).toEqual([
        { x: 300, y: 300 },
        { x: 400, y: 400 },
        { x: 500, y: 300 },
      ]);
      expect(lines.preTessellated).toBeUndefined();
    });

    // Shared by the plain and tessellated polygon fixtures, which encode
    // the same source tile: a square, a square with a hole and a
    // multipolygon of two disjoint triangles.
    function expectPolygonFeatures(polygons) {
      expect(polygons.name).toBe("polygons");
      expect(polygons.extent).toBe(4096);
      expect(polygons.features.length).toBe(3);
      // Square: one closed ring.
      expect(polygons.features[0].type).toBe("Polygon");
      expect(polygons.features[0].geometry).toEqual([
        [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 1000 },
          { x: 0, y: 1000 },
          { x: 0, y: 0 },
        ],
      ]);
      expect(polygons.features[0].properties.kind).toBe("square");
      expect(polygons.features[0].properties.tall).toBe(false);
      // Square with a hole: outer ring + inner ring, both closed.
      expect(polygons.features[1].geometry.length).toBe(2);
      expect(polygons.features[1].geometry[1][0]).toEqual({
        x: 2400,
        y: 2400,
      });
      expect(polygons.features[1].properties.tall).toBe(true);
      // Multipolygon: two disjoint triangle rings on one feature.
      expect(polygons.features[2].geometry.length).toBe(2);
      expect(polygons.features[2].geometry[0].length).toBe(4);
      expect(polygons.features[2].geometry[1].length).toBe(4);
    }

    it("decodes polygon, polygon with hole and multipolygon geometry", async function () {
      const polygons = await loadFixtureLayer("polygons.mlt");
      expectPolygonFeatures(polygons);
      // Encoded without --tessellate: no pre-tessellated data.
      expect(polygons.preTessellated).toBeUndefined();
    });

    it("extracts pre-tessellated polygon data from a tessellated tile", async function () {
      const polygons = await loadFixtureLayer("polygonsTessellated.mlt");
      // Features decode identically to the non-tessellated tile.
      expectPolygonFeatures(polygons);

      const preTessellated = polygons.preTessellated;
      expect(preTessellated).toBeDefined();

      expect(preTessellated.numFeatures).toBe(3);
      // Triangle counts per feature: square = 2, square with hole = 8
      // (8 vertices + 2 * 1 hole - 2), two triangles = 2.
      expect(preTessellated.triangleOffsets).toEqual(
        new Uint32Array([0, 2, 10, 12]),
      );
      // Vertex counts per feature (rings without the closing vertex):
      // 4, 4 + 4, 3 + 3.
      expect(preTessellated.vertexOffsets).toEqual(
        new Uint32Array([0, 4, 12, 18]),
      );
      // 18 vertices, interleaved x/y.
      expect(preTessellated.vertexBuffer.length).toBe(36);
      // 12 triangles.
      expect(preTessellated.indexBuffer.length).toBe(36);

      // Indices are local to each feature: every index must be smaller
      // than the owning feature's vertex count.
      const { indexBuffer, triangleOffsets, vertexOffsets } = preTessellated;
      for (let feature = 0; feature < 3; feature++) {
        const vertexCount = vertexOffsets[feature + 1] - vertexOffsets[feature];
        for (
          let i = triangleOffsets[feature] * 3;
          i < triangleOffsets[feature + 1] * 3;
          i++
        ) {
          expect(indexBuffer[i]).toBeLessThan(vertexCount);
        }
      }
    });

    it("degrades gracefully on a tessellated tile without outlines", async function () {
      // The MLT spec allows tessellation data without the optional ring
      // topology (outlines) streams; ring coordinates cannot be
      // reconstructed from such a tile. decodeMLT must not throw: it warns
      // once, returns no features and keeps the GPU buffers.
      spyOn(decodeMLT, "_oneTimeWarning");

      const polygons = await loadFixtureLayer(
        "polygonsTessellatedNoOutlines.mlt",
      );

      expect(decodeMLT._oneTimeWarning).toHaveBeenCalled();

      // No topology: feature coordinates and properties are unavailable.
      expect(polygons.features).toEqual([]);

      // The pre-tessellated geometry is still usable for rendering.
      const preTessellated = polygons.preTessellated;
      expect(preTessellated).toBeDefined();
      expect(preTessellated.numFeatures).toBe(3);
      expect(preTessellated.triangleOffsets).toEqual(
        new Uint32Array([0, 2, 10, 12]),
      );
      expect(preTessellated.vertexBuffer.length).toBe(36);
      expect(preTessellated.indexBuffer.length).toBe(36);
      // Exact per-feature vertex offsets require topology data.
      expect(preTessellated.vertexOffsets).toBeUndefined();
    });
  });
});
