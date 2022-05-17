import {
  Cartesian3,
  Cesium3DContentGroup,
  ContentMetadata,
  defaultValue,
  defined,
  ExperimentalFeatures,
  GroupMetadata,
  HeadingPitchRange,
  MetadataClass,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";

describe("Scene/ModelExperimental/ModelExperimental3DTileContent", function () {
  const gltfContentUrl = "./Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
  const glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
  const buildingsMetadataUrl =
    "./Data/Cesium3DTiles/Metadata/StructuralMetadata/tileset.json";
  const withBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
  const withoutBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
  const noBatchIdsUrl =
    "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";
  const instancedWithBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
  const geoJsonMultiPolygonUrl =
    "./Data/Cesium3DTiles/GeoJson/MultiPolygon/tileset.json";
  const geoJsonPolygonUrl = "./Data/Cesium3DTiles/GeoJson/Polygon/tileset.json";
  const geoJsonPolygonHeightsUrl =
    "./Data/Cesium3DTiles/GeoJson/PolygonHeights/tileset.json";
  const geoJsonPolygonHoleUrl =
    "./Data/Cesium3DTiles/GeoJson/PolygonHole/tileset.json";
  const geoJsonPolygonNoPropertiesUrl =
    "./Data/Cesium3DTiles/GeoJson/PolygonNoProperties/tileset.json";
  const geoJsonLineStringUrl =
    "./Data/Cesium3DTiles/GeoJson/LineString/tileset.json";
  const geoJsonMultiLineStringUrl =
    "./Data/Cesium3DTiles/GeoJson/MultiLineString/tileset.json";
  const geoJsonMultipleFeaturesUrl =
    "./Data/Cesium3DTiles/GeoJson/MultipleFeatures/tileset.json";

  let scene;
  const centerLongitude = -1.31968;
  const centerLatitude = 0.698874;

  function setCamera(longitude, latitude, height) {
    // One feature is located at the center, point the camera there
    const center = Cartesian3.fromRadians(longitude, latitude);
    scene.camera.lookAt(
      center,
      new HeadingPitchRange(0.0, -1.57, defined(height) ? height : 100.0)
    );
  }

  beforeAll(function () {
    ExperimentalFeatures.enableModelExperimental = true;
    scene = createScene();
  });

  afterAll(function () {
    ExperimentalFeatures.enableModelExperimental = false;
    scene.destroyForSpecs();
  });

  beforeEach(function () {
    setCamera(centerLongitude, centerLatitude);
  });

  afterEach(function () {
    scene.primitives.removeAll();
  });

  it("resolves readyPromise with glb", function () {
    return Cesium3DTilesTester.resolvesReadyPromise(scene, glbContentUrl);
  });

  it("resolves readyPromise with glTF", function () {
    return Cesium3DTilesTester.resolvesReadyPromise(scene, gltfContentUrl);
  });

  it("resolves readyPromise with b3dm", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.resolvesReadyPromise(scene, withBatchTableUrl);
  });

  it("resolves readyPromise with i3dm", function () {
    if (!scene.context.instancedArrays) {
      return;
    }

    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.resolvesReadyPromise(
      scene,
      instancedWithBatchTableUrl
    );
  });

  it("renders glb content", function () {
    return Cesium3DTilesTester.loadTileset(scene, glbContentUrl).then(function (
      tileset
    ) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
  });

  it("renders glTF content", function () {
    return Cesium3DTilesTester.loadTileset(scene, buildingsMetadataUrl).then(
      function (tileset) {
        Cesium3DTilesTester.expectRender(scene, tileset);
      }
    );
  });

  it("renders b3dm content", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
      function (tileset) {
        Cesium3DTilesTester.expectRender(scene, tileset);
      }
    );
  });

  it("renders b3dm content without features", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(function (
      tileset
    ) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
  });

  it("renders i3dm content", function () {
    if (!scene.context.instancedArrays) {
      return;
    }

    setCamera(centerLongitude, centerLatitude, 25.0);
    return Cesium3DTilesTester.loadTileset(
      scene,
      instancedWithBatchTableUrl
    ).then(function (tileset) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
  });

  function rendersGeoJson(url) {
    setCamera(centerLongitude, centerLatitude, 1.0);
    return Cesium3DTilesTester.loadTileset(scene, url).then(function (tileset) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
  }

  it("renders GeoJSON MultiPolygon", function () {
    return rendersGeoJson(geoJsonMultiPolygonUrl);
  });

  it("renders GeoJSON Polygon", function () {
    return rendersGeoJson(geoJsonPolygonUrl);
  });

  it("renders GeoJSON Polygon with heights", function () {
    return rendersGeoJson(geoJsonPolygonHeightsUrl);
  });

  it("renders GeoJSON Polygon with hole", function () {
    return rendersGeoJson(geoJsonPolygonHoleUrl);
  });

  it("renders GeoJSON Polygon with no properties", function () {
    return rendersGeoJson(geoJsonPolygonNoPropertiesUrl);
  });

  it("renders GeoJSON LineString", function () {
    return rendersGeoJson(geoJsonLineStringUrl);
  });

  it("renders GeoJSON MultiLineString", function () {
    return rendersGeoJson(geoJsonMultiLineStringUrl);
  });

  it("renders GeoJSON with multiple features", function () {
    return rendersGeoJson(geoJsonMultipleFeaturesUrl);
  });

  it("picks from glTF", function () {
    return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
      function (tileset) {
        const content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          expect(result.featureId).toBeUndefined();
          expect(content.hasProperty(0, "id")).toBe(false);
          expect(content.getFeature(0)).toBeUndefined();
        });
      }
    );
  });

  it("picks from b3dm", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
      function (tileset) {
        const content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          const featureId = result.featureId;
          expect(featureId).toBe(0);
          expect(content.hasProperty(featureId, "id")).toBe(false);
          expect(content.getFeature(featureId)).toBeDefined();
        });
      }
    );
  });

  it("picks from glTF feature table", function () {
    return Cesium3DTilesTester.loadTileset(scene, buildingsMetadataUrl).then(
      function (tileset) {
        const content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          const featureId = result.featureId;
          expect(featureId).toBe(0);
          expect(content.batchTable).toBeDefined();
          expect(content.hasProperty(featureId, "id")).toBe(true);
          expect(content.getFeature(featureId)).toBeDefined();
        });
      }
    );
  });

  it("picks from b3dm batch table", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
      function (tileset) {
        const content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          const featureId = result.featureId;
          expect(featureId).toBe(0);
          expect(content.batchTable).toBeDefined();
          expect(content.hasProperty(featureId, "id")).toBe(true);
          expect(content.getFeature(featureId)).toBeDefined();
        });
      }
    );
  });

  it("picks from i3dm batch table", function () {
    if (!scene.context.instancedArrays) {
      return;
    }

    setCamera(centerLongitude, centerLatitude, 25.0);
    return Cesium3DTilesTester.loadTileset(
      scene,
      instancedWithBatchTableUrl
    ).then(function (tileset) {
      const content = tileset.root.content;
      tileset.show = false;
      expect(scene).toPickPrimitive(undefined);
      tileset.show = true;
      expect(scene).toPickAndCall(function (result) {
        expect(result).toBeDefined();
        expect(result.primitive).toBe(tileset);
        expect(result.content).toBe(content);
        const featureId = result.featureId;
        expect(featureId).toBe(12);
        expect(content.hasProperty(featureId, "Height")).toBe(true);
        expect(content.getFeature(featureId)).toBeDefined();
      });
    });
  });

  function picksGeoJson(url, hasProperties, expectedFeatureId) {
    expectedFeatureId = defaultValue(expectedFeatureId, 0);
    setCamera(centerLongitude, centerLatitude, 1.0);
    return Cesium3DTilesTester.loadTileset(scene, url).then(function (tileset) {
      const content = tileset.root.content;
      tileset.show = false;
      expect(scene).toPickPrimitive(undefined);
      tileset.show = true;
      expect(scene).toPickAndCall(function (result) {
        expect(result).toBeDefined();
        expect(result.primitive).toBe(tileset);
        expect(result.content).toBe(content);
        const featureId = result.featureId;
        expect(featureId).toBe(expectedFeatureId);
        const feature = content.getFeature(featureId);
        expect(feature).toBeDefined();

        if (hasProperties) {
          expect(feature.getProperty("name")).toBe("UL");
          expect(feature.getProperty("code")).toBe(12);
        } else {
          expect(feature.getProperty("name")).toBeUndefined();
          expect(feature.getProperty("code")).toBeUndefined();
        }
      });
    });
  }

  it("picks GeoJSON MultiPolygon", function () {
    return picksGeoJson(geoJsonMultiPolygonUrl, true);
  });

  it("picks GeoJSON Polygon", function () {
    return picksGeoJson(geoJsonPolygonUrl, true);
  });

  it("picks GeoJSON Polygon with heights", function () {
    return picksGeoJson(geoJsonPolygonHeightsUrl, true);
  });

  it("picks GeoJSON Polygon with hole", function () {
    return picksGeoJson(geoJsonPolygonHoleUrl, true);
  });

  it("picks GeoJSON Polygon with no properties", function () {
    return picksGeoJson(geoJsonPolygonNoPropertiesUrl, false);
  });

  it("picks GeoJSON LineString", function () {
    return picksGeoJson(geoJsonLineStringUrl, true);
  });

  it("picks GeoJSON MultiLineString", function () {
    return picksGeoJson(geoJsonMultiLineStringUrl, true);
  });

  it("picks GeoJSON with multiple features", function () {
    return picksGeoJson(geoJsonMultipleFeaturesUrl, true, 1);
  });

  it("destroys", function () {
    return Cesium3DTilesTester.tileDestroys(scene, buildingsMetadataUrl);
  });

  describe("metadata", function () {
    let metadataClass;
    let groupMetadata;
    let contentMetadataClass;
    let contentMetadata;

    beforeAll(function () {
      metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              type: "STRING",
            },
            height: {
              type: "SCALAR",
              componentType: "FLOAT32",
            },
          },
        },
      });

      groupMetadata = new GroupMetadata({
        id: "testGroup",
        group: {
          properties: {
            name: "Test Group",
            height: 35.6,
          },
        },
        class: metadataClass,
      });

      contentMetadataClass = new MetadataClass({
        id: "contentTest",
        class: {
          properties: {
            author: {
              type: "STRING",
            },
            color: {
              type: "VEC3",
              componentType: "UINT8",
            },
          },
        },
      });

      contentMetadata = new ContentMetadata({
        content: {
          properties: {
            author: "Test Author",
            color: [255, 0, 0],
          },
        },
        class: contentMetadataClass,
      });
    });

    it("assigns group metadata", function () {
      setCamera(centerLongitude, centerLatitude, 15.0);
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          content.group = new Cesium3DContentGroup({ metadata: groupMetadata });
          expect(content.group.metadata).toBe(groupMetadata);
        }
      );
    });

    it("assigns metadata", function () {
      setCamera(centerLongitude, centerLatitude, 15.0);
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          content.metadata = contentMetadata;
          expect(content.metadata).toBe(contentMetadata);
        }
      );
    });
  });
});
