import {
  Cartesian3,
  defined,
  ExperimentalFeatures,
  GroupMetadata,
  HeadingPitchRange,
  MetadataClass,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";

describe("Scene/ModelExperimental/ModelExperimental3DTileContent", function () {
  var gltfContentUrl = "./Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
  var glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
  var buildingsMetadataUrl =
    "./Data/Cesium3DTiles/Metadata/FeatureMetadata/tileset.json";
  var withBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
  var withoutBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
  var noBatchIdsUrl =
    "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";

  var scene;
  var centerLongitude = -1.31968;
  var centerLatitude = 0.698874;

  function setCamera(longitude, latitude, height) {
    // One feature is located at the center, point the camera there
    var center = Cartesian3.fromRadians(longitude, latitude);
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

  it("resolves readyPromise with B3DM", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.resolvesReadyPromise(scene, withBatchTableUrl);
  });

  it("renders glTF content", function () {
    return Cesium3DTilesTester.loadTileset(scene, buildingsMetadataUrl).then(
      function (tileset) {
        Cesium3DTilesTester.expectRender(scene, tileset);
      }
    );
  });

  it("renders B3DM content", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
      function (tileset) {
        Cesium3DTilesTester.expectRender(scene, tileset);
      }
    );
  });

  it("renders B3DM content without features", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(function (
      tileset
    ) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
  });

  it("picks from glTF", function () {
    return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
      function (tileset) {
        var content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          expect(content.hasProperty(0, "id")).toBe(false);
          expect(content.getFeature(0)).toBeUndefined();
        });
      }
    );
  });

  it("picks from B3DM", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
      function (tileset) {
        var content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          expect(content.hasProperty(0, "id")).toBe(false);
          expect(content.getFeature(0)).toBeDefined();
        });
      }
    );
  });

  it("picks from glTF feature table", function () {
    return Cesium3DTilesTester.loadTileset(scene, buildingsMetadataUrl).then(
      function (tileset) {
        var content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          expect(content.batchTable).toBeDefined();
          expect(content.hasProperty(0, "id")).toBe(true);
          expect(content.getFeature(0)).toBeDefined();
        });
      }
    );
  });

  it("picks from B3DM batch table", function () {
    setCamera(centerLongitude, centerLatitude, 15.0);
    return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
      function (tileset) {
        var content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
          expect(content.batchTable).toBeDefined();
          expect(content.hasProperty(0, "id")).toBe(true);
          expect(content.getFeature(0)).toBeDefined();
        });
      }
    );
  });

  it("destroys", function () {
    return Cesium3DTilesTester.tileDestroys(scene, buildingsMetadataUrl);
  });

  describe("3DTILES_metadata", function () {
    var metadataClass = new MetadataClass({
      id: "test",
      class: {
        properties: {
          name: {
            type: "STRING",
          },
          height: {
            type: "FLOAT32",
          },
        },
      },
    });
    var groupMetadata = new GroupMetadata({
      id: "testGroup",
      group: {
        properties: {
          name: "Test Group",
          height: 35.6,
        },
      },
      class: metadataClass,
    });

    it("assigns groupMetadata", function () {
      setCamera(centerLongitude, centerLatitude, 15.0);
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          var content = tileset.root.content;
          content.groupMetadata = groupMetadata;
          expect(content.groupMetadata).toBe(groupMetadata);
        }
      );
    });
  });
});
