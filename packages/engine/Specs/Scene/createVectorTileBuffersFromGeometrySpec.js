import {
  BufferPointCollection,
  BufferPolygonCollection,
  BufferPolylineCollection,
  buildVectorTileBuffers,
  Cartesian3,
  createVectorTileBuffersFromGeometry,
  Matrix4,
} from "../../index.js";

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
