import {
  Cartesian3,
  Cesium3DContentGroup,
  HeadingPitchRange,
  MetadataClass,
  ContentMetadata,
  GroupMetadata,
} from "../../index.js";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/Tileset3DTileContent",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const tilesetOfTilesetsUrl =
      "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";

    beforeAll(function () {
      scene = createScene();

      // Point the camera at the center and far enough way to only load the root tile
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 100.0));
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("becomes ready", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        tilesetOfTilesetsUrl
      );
      expect(tileset.root.contentReady).toBeTrue();
      expect(tileset.root.content).toBeDefined();
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, tilesetOfTilesetsUrl);
    });

    it("gets properties", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          const tile = tileset.root;
          const content = tile.content;
          expect(content.featuresLength).toBe(0);
          expect(content.pointsLength).toBe(0);
          expect(content.trianglesLength).toBe(0);
          expect(content.geometryByteLength).toBe(0);
          expect(content.texturesByteLength).toBe(0);
          expect(content.batchTableByteLength).toBe(0);
          expect(content.innerContents).toBeUndefined();
          expect(content.tileset).toBe(tileset);
          expect(content.tile).toBe(tile);
          expect(content.url).toBeDefined();
          expect(content.batchTable).toBeUndefined();
          expect(content.hasProperty(0, "name")).toBe(false);
          expect(content.getFeature(0)).toBeUndefined();
        }
      );
    });

    describe("metadata", function () {
      let metadataClass;
      let groupMetadata;
      let contentMetadataClass;
      let contentMetadata;

      beforeAll(function () {
        metadataClass = MetadataClass.fromJson({
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

        contentMetadataClass = MetadataClass.fromJson({
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
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetOfTilesetsUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          content.group = new Cesium3DContentGroup({ metadata: groupMetadata });
          expect(content.group.metadata).toBe(groupMetadata);
        });
      });

      it("assigns metadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetOfTilesetsUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          content.metadata = contentMetadata;
          expect(content.metadata).toBe(contentMetadata);
        });
      });
    });
  },
  "WebGL"
);
