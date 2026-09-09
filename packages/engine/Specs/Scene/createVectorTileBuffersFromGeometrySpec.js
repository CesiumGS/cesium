import {
  BufferPointCollection,
  BufferPolygonCollection,
  BufferPolylineCollection,
  buildVectorTileBuffers,
  Cartesian3,
  createVectorTileBuffersFromGeometry,
  Matrix4,
} from "../../index.js";
import { VectorPropertyTable } from "../../Source/Scene/createVectorTileBuffersFromGeometry.js";

const tileCoordinates = {
  tileX: 0,
  tileY: 0,
  tileZ: 0,
};

function buildTestGeometry(options) {
  const decoded = {
    layers: [
      {
        name: "mixed",
        extent: 4096,
        features: [
          {
            type: "Point",
            geometry: [{ x: 100, y: 100 }],
            properties: { name: "point" },
          },
          {
            type: "LineString",
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            properties: { name: "line" },
          },
          {
            type: "Polygon",
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 0, y: 0 },
              ],
            ],
            properties: { name: "polygon" },
          },
        ],
      },
    ],
  };
  return buildVectorTileBuffers(decoded, tileCoordinates, options);
}

describe("Scene/createVectorTileBuffersFromGeometry", function () {
  it("creates one collection per layer geometry type", function () {
    const content = {};
    const geometry = buildTestGeometry();
    const result = createVectorTileBuffersFromGeometry(content, geometry);

    expect(result.collections.length).toBe(3);
    expect(result.collections[0] instanceof BufferPointCollection).toBe(true);
    expect(result.collections[1] instanceof BufferPolylineCollection).toBe(
      true,
    );
    expect(result.collections[2] instanceof BufferPolygonCollection).toBe(true);

    expect(result.collections[0].primitiveCount).toBe(1);
    expect(result.collections[1].primitiveCount).toBe(1);
    expect(result.collections[2].primitiveCount).toBe(1);
  });

  it("creates a local matrix per collection translating to the geometry origin", function () {
    const content = {};
    const geometry = buildTestGeometry();
    const result = createVectorTileBuffersFromGeometry(content, geometry);

    const expected = Matrix4.fromTranslation(
      new Cartesian3(geometry.origin.x, geometry.origin.y, geometry.origin.z),
      new Matrix4(),
    );

    expect(result.collectionLocalMatrices.length).toBe(3);
    for (const matrix of result.collectionLocalMatrices) {
      expect(matrix).toEqual(expected);
    }
  });

  it("maps every collection to the shared property table", function () {
    const content = {};
    const geometry = buildTestGeometry();
    const result = createVectorTileBuffersFromGeometry(content, geometry);

    for (const collection of result.collections) {
      expect(result.collectionFeatureTableIds.get(collection)).toBe(0);
    }
  });

  it("creates one feature per feature ID, shared across collections", function () {
    const content = {};
    const geometry = buildTestGeometry();
    const result = createVectorTileBuffersFromGeometry(content, geometry);

    const features = result.featuresByTableId.get(0);
    expect(features.size).toBe(3);
    for (const [featureId, feature] of features) {
      expect(feature.featureId).toBe(featureId);
    }
  });

  it("does not create features for the null feature ID", function () {
    const content = {};
    // With featureIdProperty set to a property no feature has, all vertices
    // get the null feature ID.
    const geometry = buildTestGeometry({ featureIdProperty: "missing" });
    const result = createVectorTileBuffersFromGeometry(content, geometry);

    expect(result.collections.length).toBe(3);
    const features = result.featuresByTableId.get(0);
    expect(features.size).toBe(0);
  });
});

describe("Scene/createVectorTileBuffersFromGeometry VectorPropertyTable", function () {
  it("reports featuresLength from the property array", function () {
    const table = new VectorPropertyTable([{ a: 1 }, null, { b: 2 }]);
    expect(table.featuresLength).toBe(3);
  });

  it("implements hasProperty and getProperty", function () {
    const table = new VectorPropertyTable([{ name: "a", height: 5 }, null]);

    expect(table.hasProperty(0, "name")).toBe(true);
    expect(table.hasProperty(0, "missing")).toBe(false);
    expect(table.hasProperty(1, "name")).toBe(false);

    expect(table.getProperty(0, "name")).toBe("a");
    expect(table.getProperty(0, "height")).toBe(5);
    expect(table.getProperty(0, "missing")).toBeUndefined();
    expect(table.getProperty(1, "name")).toBeUndefined();
  });

  it("implements getPropertyIds with a reusable result array", function () {
    const table = new VectorPropertyTable([{ name: "a", height: 5 }, null]);

    expect(table.getPropertyIds(0)).toEqual(["name", "height"]);
    expect(table.getPropertyIds(1)).toEqual([]);

    const results = ["stale"];
    expect(table.getPropertyIds(0, results)).toEqual(["name", "height"]);
    expect(results).toEqual(["name", "height"]);
  });

  it("has no semantics or classes", function () {
    const table = new VectorPropertyTable([{ name: "a" }]);

    expect(table.hasPropertyBySemantic(0, "NAME")).toBe(false);
    expect(table.getPropertyBySemantic(0, "NAME")).toBeUndefined();
    expect(table.isClass(0, "someClass")).toBe(false);
    expect(table.isExactClass(0, "someClass")).toBe(false);
    expect(table.getExactClassName(0)).toBeUndefined();
  });

  it("estimates batchTableByteLength from keys and values", function () {
    // Strings count two bytes per character (keys included); numbers and
    // booleans count eight bytes. Null rows are skipped.
    const table = new VectorPropertyTable([
      { name: "ab", n: 1, b: true },
      null,
    ]);

    // "name" (8) + "ab" (4) + "n" (2) + 8 + "b" (2) + 8 = 32
    expect(table.batchTableByteLength).toBe(32);
    // Cached value stays stable.
    expect(table.batchTableByteLength).toBe(32);
  });

  it("reports zero batchTableByteLength for empty tables", function () {
    expect(new VectorPropertyTable([]).batchTableByteLength).toBe(0);
    expect(new VectorPropertyTable([null]).batchTableByteLength).toBe(0);
  });
});
