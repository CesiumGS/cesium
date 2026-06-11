import {
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolygonMaterial,
  Cartesian3,
  Cesium3DTileStyle,
  Color,
  VectorGltf3DTileContent,
} from "../../index.js";

const scratchPoint = new BufferPoint();
const scratchPolyline = new BufferPolyline();
const scratchPolygon = new BufferPolygon();

const scratchPointMaterial = new BufferPointMaterial();
const scratchPolylineMaterial = new BufferPolylineMaterial();
const scratchPolygonMaterial = new BufferPolygonMaterial();

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
    const mockFeature3 = { id: 789 };

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
      [undefined, new Map([[789, mockFeature3]])],
    ]);

    expect(content.getFeature(123, 100)).toBe(mockFeature1);
    expect(content.getFeature(456, 100)).toBe(mockFeature2);
    expect(content.getFeature(789, undefined)).toBe(mockFeature3);
    expect(content.getFeature(999, 101)).toBe(undefined);
  });

  it("hasProperty", () => {
    expect(content.hasProperty(123, "my-prop", 100)).toBe(false);

    const mockFeature1 = { id: 123, hasProperty: (name) => name === "my-prop" };
    const mockFeature2 = { id: 456, hasProperty: () => false };
    const mockFeature3 = { id: 789, hasProperty: () => false };

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
      [undefined, new Map([[789, mockFeature3]])],
    ]);

    expect(content.hasProperty(123, "my-prop", 100)).toBe(true);
    expect(content.hasProperty(456, "my-prop", 100)).toBe(false);
    expect(content.hasProperty(789, "my-prop", undefined)).toBe(false);
    expect(content.hasProperty(999, "my-prop", 101)).toBe(false);
  });

  it("applyDebugSettings", () => {
    const points = createBufferPointCollection();
    const lines = createBufferPolylineCollection();
    const polygons = createBufferPolygonCollection();
    content._collections = [points, lines, polygons];

    content.applyDebugSettings(true, Color.RED);

    assertColorAll(points, scratchPoint, scratchPointMaterial, Color.RED);
    assertColorAll(lines, scratchPolyline, scratchPolylineMaterial, Color.RED);
    assertColorAll(points, scratchPolygon, scratchPolygonMaterial, Color.RED);

    content.applyDebugSettings(false, Color.RED);

    assertColorAll(points, scratchPoint, scratchPointMaterial, Color.WHITE);
    assertColorAll(
      lines,
      scratchPolyline,
      scratchPolylineMaterial,
      Color.WHITE,
    );
    assertColorAll(points, scratchPolygon, scratchPolygonMaterial, Color.WHITE);
  });

  it("applyStyle - points", () => {
    const points = createBufferPointCollection();
    content._collections = [points];

    const style = new Cesium3DTileStyle({
      show: false,
      color: "color('#ff0000', 0.5)",
      pointSize: "12",
      pointOutlineWidth: "2",
      pointOutlineColor: "color('#00ff00', 0.25)",
    });

    content.applyStyle(style);

    for (let i = 0; i < points.primitiveCount; i++) {
      points.get(i, scratchPoint);
      scratchPoint.getMaterial(scratchPointMaterial);

      expect(scratchPoint.show).toBe(false);
      expect(scratchPointMaterial.color.toCssHexString()).toEqual("#ff000080");
      expect(scratchPointMaterial.size).toEqual(12);
      expect(scratchPointMaterial.outlineWidth).toEqual(2);
      expect(scratchPointMaterial.outlineColor.toCssHexString()).toEqual(
        "#00ff0040",
      );
    }
  });

  it("applyStyle - polylines", () => {
    const lines = createBufferPolylineCollection();
    content._collections = [lines];

    const style = new Cesium3DTileStyle({
      show: false,
      color: "color('#ff0000', 0.5)",
      lineWidth: "12",
    });

    content.applyStyle(style);

    for (let i = 0; i < lines.primitiveCount; i++) {
      lines.get(i, scratchPolyline);
      scratchPolyline.getMaterial(scratchPolylineMaterial);

      expect(scratchPolyline.show).toBe(false);
      expect(scratchPolylineMaterial.color.toCssHexString()).toEqual(
        "#ff000080",
      );
      expect(scratchPolylineMaterial.width).toEqual(12);
    }
  });

  it("applyStyle - polygons", () => {
    const polygons = createBufferPolygonCollection();
    content._collections = [polygons];

    const style = new Cesium3DTileStyle({
      show: false,
      color: "color('#ff0000', 0.5)",
    });

    content.applyStyle(style);

    for (let i = 0; i < polygons.primitiveCount; i++) {
      polygons.get(i, scratchPolygon);
      scratchPolygon.getMaterial(scratchPolygonMaterial);

      expect(scratchPolygon.show).toBe(false);
      expect(scratchPolygonMaterial.color.toCssHexString()).toEqual(
        "#ff000080",
      );
    }
  });

  it("applyStyle - conditional styles override the global style", () => {
    const roads = createBufferPolygonCollection();
    const water = createBufferPolygonCollection();
    content._collections = [roads, water];
    content._collectionFeatureTableIds = new Map([
      [roads, 100],
      [water, 101],
    ]);

    // Determine the feature ID assigned to the primitives so the features can
    // be mapped. All primitives in a collection share the same feature ID here.
    roads.get(0, scratchPolygon);
    const featureId = scratchPolygon.featureId;

    const roadFeature = {
      getProperty: (name) => (name === "_layer" ? "roads" : undefined),
    };
    const waterFeature = {
      getProperty: (name) => (name === "_layer" ? "water" : undefined),
    };
    content._featuresByTableId = new Map([
      [100, new Map([[featureId, roadFeature]])],
      [101, new Map([[featureId, waterFeature]])],
    ]);

    const globalStyle = new Cesium3DTileStyle({
      color: "color('#ff0000', 0.5)",
    });
    const waterStyle = new Cesium3DTileStyle({
      color: "color('#0000ff', 0.5)",
    });

    content.applyStyle(globalStyle, [
      {
        condition: (feature) => feature.getProperty("_layer") === "water",
        style: waterStyle,
      },
    ]);

    // "roads" matches no condition, so it uses the global style.
    for (let i = 0; i < roads.primitiveCount; i++) {
      roads.get(i, scratchPolygon);
      scratchPolygon.getMaterial(scratchPolygonMaterial);
      expect(scratchPolygonMaterial.color.toCssHexString()).toEqual(
        "#ff000080",
      );
    }

    // "water" matches the conditional style.
    for (let i = 0; i < water.primitiveCount; i++) {
      water.get(i, scratchPolygon);
      scratchPolygon.getMaterial(scratchPolygonMaterial);
      expect(scratchPolygonMaterial.color.toCssHexString()).toEqual(
        "#0000ff80",
      );
    }
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

function assertColorAll(collection, primitive, material, color) {
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, primitive);
    primitive.getMaterial(material);
    expect(material.color).toEqual(color);
  }
}
