import {
  Cartesian3,
  Color,
  HeadingPitchRange,
  Math as CesiumMath,
  Matrix4,
} from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolygonMaterial,
  Cesium3DTileStyle,
  Model3DTileContent,
  SceneMode,
  VectorGltf3DTileContent,
} from "../../index.js";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

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

  it("update syncs blendOption from the tileset", () => {
    const tileset = { _vectorBlendOption: BlendOption.OPAQUE };
    const tile = { computedTransform: Matrix4.clone(Matrix4.IDENTITY) };
    content = new VectorGltf3DTileContent(tileset, tile, {});
    content._ready = true;

    const points = createBufferPointCollection();
    content._collections = [points];
    content._collectionLocalMatrices = [Matrix4.clone(Matrix4.IDENTITY)];

    const frameState = { mode: SceneMode.SCENE3D, passes: {}, frameNumber: 0 };

    content.update(tileset, frameState);
    expect(points.blendOption).toBe(BlendOption.OPAQUE);

    tileset._vectorBlendOption = BlendOption.TRANSLUCENT;
    content.update(tileset, frameState);
    expect(points.blendOption).toBe(BlendOption.TRANSLUCENT);
  });

  describe("fromGeoJson", () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "A", code: 1 },
          geometry: {
            type: "MultiPoint",
            coordinates: [
              [-75.0, 40.0],
              [-75.001, 40.0],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "B" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-75.0, 40.0],
              [-75.001, 40.001],
            ],
          },
        },
        {
          type: "Feature",
          properties: null,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-75.0, 40.0],
                [-75.001, 40.0],
                [-75.001, 40.001],
                [-75.0, 40.001],
                [-75.0, 40.0],
              ],
            ],
          },
        },
      ],
    };

    it("creates one collection per geometry type", () => {
      content = VectorGltf3DTileContent.fromGeoJson({}, {}, {}, geoJson);

      expect(content.ready).toBe(true);
      expect(content._collections.length).toBe(3);
      expect(content._collections[0]).toBeInstanceOf(BufferPointCollection);
      expect(content._collections[1]).toBeInstanceOf(BufferPolylineCollection);
      expect(content._collections[2]).toBeInstanceOf(BufferPolygonCollection);
      expect(content.pointsLength).toBe(2);
      expect(content.featuresLength).toBe(3);

      content.destroy();
    });

    it("exposes GeoJSON properties on features", () => {
      content = VectorGltf3DTileContent.fromGeoJson({}, {}, {}, geoJson);

      expect(content.getFeature(0, 0).getProperty("name")).toBe("A");
      expect(content.getFeature(0, 0).getProperty("code")).toBe(1);
      expect(content.getFeature(1, 0).getProperty("name")).toBe("B");
      expect(content.getFeature(1, 0).getProperty("code")).toBe("");
      expect(content.getFeature(2, 0).getProperty("name")).toBe("");
      expect(content.getFeature(0, 0).getProperty("missing")).toBeUndefined();

      content.destroy();
    });

    it("picks the feature from each of its primitives", () => {
      content = VectorGltf3DTileContent.fromGeoJson({}, {}, {}, geoJson);
      const [points, polylines, polygons] = content._collections;

      expect(points.get(0, scratchPoint).pickObject).toBe(
        content.getFeature(0, 0),
      );
      expect(points.get(1, scratchPoint).pickObject).toBe(
        content.getFeature(0, 0),
      );
      expect(polylines.get(0, scratchPolyline).pickObject).toBe(
        content.getFeature(1, 0),
      );
      expect(polygons.get(0, scratchPolygon).pickObject).toBe(
        content.getFeature(2, 0),
      );

      content.destroy();
    });

    it("shows and hides all primitives of a feature", () => {
      content = VectorGltf3DTileContent.fromGeoJson({}, {}, {}, geoJson);
      const [points, polylines] = content._collections;

      content.getFeature(0, 0).show = false;

      expect(points.get(0, scratchPoint).show).toBe(false);
      expect(points.get(1, scratchPoint).show).toBe(false);
      expect(polylines.get(0, scratchPolyline).show).toBe(true);

      content.destroy();
    });

    it("applies a style that reads GeoJSON properties", () => {
      content = VectorGltf3DTileContent.fromGeoJson({}, {}, {}, geoJson);
      const [points, polylines] = content._collections;

      content.applyStyle(
        new Cesium3DTileStyle({
          color: "${name} === 'A' ? color('red') : color('blue')",
        }),
      );

      points.get(1, scratchPoint).getMaterial(scratchPointMaterial);
      expect(scratchPointMaterial.color).toEqual(Color.RED);
      polylines.get(0, scratchPolyline).getMaterial(scratchPolylineMaterial);
      expect(scratchPolylineMaterial.color).toEqual(Color.BLUE);

      content.destroy();
    });
  });
});

describe(
  "Scene/VectorGltf3DTileContent GeoJSON tilesets",
  () => {
    const geoJsonPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/Polygon/tileset.json";
    const geoJsonPolygonHoleUrl =
      "./Data/Cesium3DTiles/GeoJson/PolygonHole/tileset.json";

    let scene;

    beforeAll(() => {
      scene = createScene();
    });

    afterAll(() => {
      scene.destroyForSpecs();
    });

    beforeEach(() => {
      scene.morphTo3D(0.0);
      const center = Cartesian3.fromDegrees(-75.6121443, 40.0425806);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, 1.0),
      );
    });

    afterEach(() => {
      scene.primitives.removeAll();
    });

    it("loads GeoJSON content as a model by default", async () => {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        geoJsonPolygonUrl,
      );

      expect(tileset.vectorGeoJson).toBe(false);
      expect(tileset.root.content).toBeInstanceOf(Model3DTileContent);
    });

    it("loads GeoJSON content as vector content with vectorGeoJson", async () => {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        geoJsonPolygonUrl,
        { vectorGeoJson: true },
      );

      expect(tileset.vectorGeoJson).toBe(true);
      expect(tileset.root.content).toBeInstanceOf(VectorGltf3DTileContent);
    });

    it("fills polygons with holes", async () => {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        geoJsonPolygonHoleUrl,
        { vectorGeoJson: true },
      );

      // A quad with one quad hole triangulates into 8 triangles.
      expect(tileset.root.content.trianglesLength).toBe(8);
    });

    it("renders GeoJSON polygons", async () => {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        geoJsonPolygonUrl,
        { vectorGeoJson: true },
      );

      Cesium3DTilesTester.expectRender(scene, tileset);
    });

    it("picks GeoJSON polygons", async () => {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        geoJsonPolygonUrl,
        { vectorGeoJson: true },
      );
      const content = tileset.root.content;

      expect(scene).toPickAndCall((result) => {
        expect(result).toBe(content.getFeature(0, 0));
        expect(result.primitive).toBe(tileset);
        expect(result.getProperty("name")).toBe("UL");
        expect(result.getProperty("code")).toBe(12);
      });
    });
  },
  "WebGL",
);

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
