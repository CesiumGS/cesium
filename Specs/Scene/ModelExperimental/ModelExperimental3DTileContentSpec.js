import {
  Cartesian3,
  ContentMetadata,
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
    "./Data/Cesium3DTiles/Metadata/StructuralMetadata/tileset_1.1.json";
  const withBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
  const withoutBatchTableUrl =
    "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
  const noBatchIdsUrl =
    "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";
  const InstancedWithBatchTableUrl =
    "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";

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
      InstancedWithBatchTableUrl
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

  it("renders I3DM content", function () {
    if (!scene.context.instancedArrays) {
      return;
    }

    setCamera(centerLongitude, centerLatitude, 25.0);
    return Cesium3DTilesTester.loadTileset(
      scene,
      InstancedWithBatchTableUrl
    ).then(function (tileset) {
      Cesium3DTilesTester.expectRender(scene, tileset);
    });
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
      InstancedWithBatchTableUrl
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

    it("assigns groupMetadata", function () {
      setCamera(centerLongitude, centerLatitude, 15.0);
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          content.groupMetadata = groupMetadata;
          expect(content.groupMetadata).toBe(groupMetadata);
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
