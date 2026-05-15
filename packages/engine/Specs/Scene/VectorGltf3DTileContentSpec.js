import {
  BufferPoint,
  BufferPointCollection,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolygon,
  BufferPolygonCollection,
  Cartesian3,
  VectorGltf3DTileContent,
} from "../../index.js";

const scratchPoint = new BufferPoint();
const scratchPolyline = new BufferPolyline();
const scratchPolygon = new BufferPolygon();

describe("Scene/VectorGltf3DTileContent", () => {
  let content;

  beforeAll(() => {});

  afterAll(() => {});

  beforeEach(() => {
    content = new VectorGltf3DTileContent({}, {}, {});
    content._model = { _featureTables: [] };
  });

  afterEach(() => {});

  it("featuresLength", () => {
    // For consistency with other tile content, features are counted from the
    // batch table, not unique IDs in the geometry, so feature length should be
    // zero if no batch tables are added. We can change this in the future; the
    // test is just here to protect against accidental changes.
    content._collections = [
      createBufferPointCollection(),
      createBufferPolylineCollection(),
    ];

    expect(content.featuresLength).toBe(0);

    content._model._featureTables.push({ featuresLength: 10 });
    content._model._featureTables.push({ featuresLength: 14 });

    expect(content.featuresLength).toBe(24);
  });

  it("pointsLength", () => {
    expect(content.pointsLength).toBe(0);

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();
    content._collections = [points, lines, polygons];

    expect(content.pointsLength).toBe(points.primitiveCount);
  });

  it("trianglesLength", () => {
    expect(content.trianglesLength).toBe(0);

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();
    content._collections = [points, lines, polygons];

    // Polylines and polygons are triangulated, not points.
    expect(content.trianglesLength).toBe(
      2 * lines.primitiveCount + polygons.triangleCount,
    );
  });

  it("byteLength", () => {
    expect(content.geometryByteLength).toBe(0);

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();
    content._collections = [points, lines, polygons];

    expect(content.geometryByteLength).toBe(
      points.byteLength + lines.byteLength + polygons.byteLength,
    );
  });

  it("texturesByteLength", () => {
    expect(content.texturesByteLength).toBe(0);

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();
    content._collections = [points, lines, polygons];

    expect(content.texturesByteLength).toBe(0);
  });

  it("batchTableByteLength", () => {
    expect(content.batchTableByteLength).toBe(0);

    content._model._featureTables.push({ batchTableByteLength: 100 });
    content._model._featureTables.push({ batchTableByteLength: 156 });

    expect(content.batchTableByteLength).toBe(256);
  });

  it("getFeature", () => {
    expect(content.getFeature(123, 100)).toBe(undefined);

    const mockFeature1 = { id: 123 };
    const mockFeature2 = { id: 456 };

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();

    content._collections = [points, lines, polygons];
    content._collectionFeatureTableIds = new Map([
      [points, 100],
      [lines, 101],
      [polygons, 101],
    ]);
    content._featuresByTableId = new Map([
      [
        100,
        new Map([
          [123, mockFeature1],
          [456, mockFeature2],
        ]),
      ],
      [101, new Map()],
    ]);

    expect(content.getFeature(123, 100)).toBe(mockFeature1);
    expect(content.getFeature(456, 100)).toBe(mockFeature2);
    expect(content.getFeature(999, 101)).toBe(undefined);
  });

  it("hasProperty", () => {
    expect(content.hasProperty(123, "my-prop", 100)).toBe(false);

    const mockFeature1 = { id: 123, hasProperty: (name) => name === "my-prop" };
    const mockFeature2 = { id: 456, hasProperty: () => false };

    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();

    content._collections = [points, lines, polygons];
    content._collectionFeatureTableIds = new Map([
      [points, 100],
      [lines, 101],
      [polygons, 101],
    ]);
    content._featuresByTableId = new Map([
      [
        100,
        new Map([
          [123, mockFeature1],
          [456, mockFeature2],
        ]),
      ],
      [101, new Map()],
    ]);

    expect(content.hasProperty(123, "my-prop", 100)).toBe(true);
    expect(content.hasProperty(456, "my-prop", 100)).toBe(false);
    expect(content.hasProperty(999, "my-prop", 101)).toBe(false);
  });
});

function createBufferPointCollection() {
  const collection = new BufferPointCollection();
  collection.add({ position: Cartesian3.UNIT_X }, scratchPoint);
  collection.add({ position: Cartesian3.UNIT_Y }, scratchPoint);
  collection.add({ position: Cartesian3.UNIT_Z }, scratchPoint);
  return collection;
}

function createBufferPolylineCollection() {
  const collection = new BufferPolylineCollection();
  collection.add(
    { positions: new Int8Array([0, 0, 0, 1, 1, 1]) },
    scratchPolyline,
  );
  collection.add(
    { positions: new Int8Array([1, 1, 1, 2, 2, 2]) },
    scratchPolyline,
  );
  collection.add(
    { positions: new Int8Array([2, 2, 2, 3, 3, 3]) },
    scratchPolyline,
  );
  collection.add(
    { positions: new Int8Array([3, 3, 3, 4, 4, 4]) },
    scratchPolyline,
  );
  return collection;
}

function createBufferPolygonCollection() {
  const collection = new BufferPolygonCollection();
  collection.add(
    {
      positions: new Int8Array([0, 0, 0, 1, 1, 1, 2, 2, 2]),
      triangles: new Uint8Array([0, 1, 2]),
    },
    scratchPolygon,
  );
  collection.add(
    {
      positions: new Int8Array([1, 1, 1, 2, 2, 2, 3, 3, 3]),
      triangles: new Uint8Array([0, 1, 2]),
    },
    scratchPolygon,
  );
  collection.add(
    {
      positions: new Int8Array([2, 2, 2, 3, 3, 3, 4, 4, 4]),
      triangles: new Uint8Array([0, 1, 2]),
    },
    scratchPolygon,
  );
  collection.add(
    {
      positions: new Int8Array([3, 3, 3, 4, 4, 4, 5, 5, 5]),
      triangles: new Uint8Array([0, 1, 2]),
    },
    scratchPolygon,
  );
  return collection;
}
