import { encodeTile } from "@maplibre/mlt/dist/encoding/mltEncoder.js";
import { decodeMLT } from "../../index.js";

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
});
