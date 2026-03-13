import {
  BufferPointCollection,
  BufferPolygonCollection,
  BufferPolylineCollection,
  Rectangle,
  RequestScheduler,
  ResourceCache,
  VectorGltf3DTileContent,
} from "../../index.js";

import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/VectorGltf3DTileContent", function () {
  const pointTilesetUrl =
    "./Data/Cesium3DTiles/VectorGltf/sample-cities-spain.tileset.json";
  const polylineTilesetUrl =
    "./Data/Cesium3DTiles/VectorGltf/sample-us-outline.tileset.json";
  const polygonTilesetUrl =
    "./Data/Cesium3DTiles/VectorGltf/sample-us-states.tileset.json";

  const spainRectangle = Rectangle.fromRadians(
    -0.14912553056282754,
    0.630603674286057,
    0.038089971913258434,
    0.7585433514898835,
  );
  const unitedStatesRectangle = Rectangle.fromRadians(
    -3.1267109291897386,
    0.31214887295348465,
    3.13772622569785,
    1.2453371191800977,
  );

  let scene;

  async function loadVectorTileset(url, rectangle) {
    scene.camera.setView({
      destination: rectangle,
    });

    const tileset = await Cesium3DTilesTester.loadTileset(scene, url);
    const tile = await Cesium3DTilesTester.waitForTileContentReady(
      scene,
      tileset.root,
    );

    return {
      tileset: tileset,
      content: tile.content,
    };
  }

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    scene.morphTo3D(0.0);
  });

  afterEach(function () {
    scene.primitives.removeAll();
    ResourceCache.clearForSpecs();
  });

  it("loads point sample data", async function () {
    const { content } = await loadVectorTileset(
      pointTilesetUrl,
      spainRectangle,
    );
    expect(content instanceof VectorGltf3DTileContent).toBe(true);

    const vectorBuffers = content.getExtension("CESIUM_mesh_vector");
    expect(vectorBuffers).toBeDefined();
    expect(vectorBuffers.points).toBeDefined();
    expect(vectorBuffers.points.length).toBe(1);
    expect(vectorBuffers.polylines).toBeUndefined();
    expect(vectorBuffers.polygons).toBeUndefined();
    expect(content._pointCollections).toBe(vectorBuffers.points);
    expect(vectorBuffers.points[0] instanceof BufferPointCollection).toBe(true);

    expect(content.featuresLength).toBe(17);
    expect(content.pointsLength).toBe(17);
    expect(content.trianglesLength).toBe(0);
    expect(vectorBuffers.points[0].primitiveCount).toBe(17);
    expect(vectorBuffers.points[0].byteLength).toBeGreaterThan(0);
  });

  it("loads polyline sample data", async function () {
    const { content } = await loadVectorTileset(
      polylineTilesetUrl,
      unitedStatesRectangle,
    );
    expect(content instanceof VectorGltf3DTileContent).toBe(true);

    const vectorBuffers = content.getExtension("CESIUM_mesh_vector");
    expect(vectorBuffers).toBeDefined();
    expect(vectorBuffers.points).toBeUndefined();
    expect(vectorBuffers.polylines).toBeDefined();
    expect(vectorBuffers.polylines.length).toBe(1);
    expect(vectorBuffers.polygons).toBeUndefined();
    expect(content._polylineCollections).toBe(vectorBuffers.polylines);
    expect(vectorBuffers.polylines[0] instanceof BufferPolylineCollection).toBe(
      true,
    );

    expect(content.featuresLength).toBe(266);
    expect(content.pointsLength).toBe(0);
    expect(content.trianglesLength).toBe(0);
    expect(vectorBuffers.polylines[0].primitiveCount).toBe(266);
    expect(vectorBuffers.polylines[0].byteLength).toBeGreaterThan(0);
  });

  it("loads polygon sample data", async function () {
    const { content } = await loadVectorTileset(
      polygonTilesetUrl,
      unitedStatesRectangle,
    );
    expect(content instanceof VectorGltf3DTileContent).toBe(true);

    const vectorBuffers = content.getExtension("CESIUM_mesh_vector");
    expect(vectorBuffers).toBeDefined();
    expect(vectorBuffers.points).toBeUndefined();
    expect(vectorBuffers.polylines).toBeUndefined();
    expect(vectorBuffers.polygons).toBeDefined();
    expect(vectorBuffers.polygons.length).toBe(1);
    expect(content._polygonCollections).toBe(vectorBuffers.polygons);
    expect(vectorBuffers.polygons[0] instanceof BufferPolygonCollection).toBe(
      true,
    );

    expect(content.featuresLength).toBe(52);
    expect(content.pointsLength).toBe(0);
    expect(content.trianglesLength).toBeGreaterThan(0);
    expect(vectorBuffers.polygons[0].primitiveCount).toBe(52);
    expect(vectorBuffers.polygons[0].triangleCount).toBeGreaterThan(0);
    expect(vectorBuffers.polygons[0].byteLength).toBeGreaterThan(0);
  });
});
