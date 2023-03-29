import {
  Cartesian3,
  Cesium3DContentGroup,
  Color,
  ContentMetadata,
  HeadingPitchRange,
  MetadataClass,
  RuntimeError,
  GroupMetadata,
  ImplicitMetadataView,
} from "../../index.js";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/Composite3DTileContent",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const compositeUrl =
      "./Data/Cesium3DTiles/Composite/Composite/tileset.json";
    const compositeOfComposite =
      "./Data/Cesium3DTiles/Composite/CompositeOfComposite/tileset.json";
    const compositeOfInstanced =
      "./Data/Cesium3DTiles/Composite/CompositeOfInstanced/tileset.json";

    beforeAll(function () {
      scene = createScene();
      // One item in each data set is always located in the center, so point the camera there
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 26.0));
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    function expectRenderComposite(tileset) {
      expect(scene).toPickAndCall(function (result) {
        // Pick a building
        const pickedBuilding = result;
        expect(pickedBuilding).toBeDefined();

        // Change the color of the picked building to yellow
        pickedBuilding.color = Color.clone(Color.YELLOW, pickedBuilding.color);

        // Expect the pixel color to be some shade of yellow
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Both a building and instance are located at the center, hide the building and pick the instance
        pickedBuilding.show = false;

        let pickedInstance;
        expect(scene).toPickAndCall(function (result) {
          pickedInstance = result;
          expect(pickedInstance).toBeDefined();
          expect(pickedInstance).not.toEqual(pickedBuilding);
        });

        // Change the color of the picked instance to green
        pickedInstance.color = Color.clone(Color.GREEN, pickedInstance.color);

        // Expect the pixel color to be some shade of green
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Hide the instance, and expect the render to be blank
        pickedInstance.show = false;
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);
      });
    }

    it("throws with invalid version", async function () {
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        version: 2,
      });
      await expectAsync(
        Cesium3DTilesTester.createContentForMockTile(arrayBuffer, "cmpt")
      ).toBeRejectedWithError(
        RuntimeError,
        "Only Composite Tile version 1 is supported. Version 2 is not."
      );
    });

    it("throws with invalid inner tile content type", async function () {
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        tiles: [
          Cesium3DTilesTester.generateInstancedTileBuffer({
            magic: [120, 120, 120, 120],
          }),
        ],
      });
      await expectAsync(
        Cesium3DTilesTester.createContentForMockTile(arrayBuffer, "cmpt")
      ).toBeRejectedWithError(
        RuntimeError,
        "Unknown tile content type, xxxx, inside Composite tile"
      );
    });

    it("becomes ready", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        compositeUrl
      );
      expect(tileset.root.contentReady).toBeTrue();
      expect(tileset.root.content).toBeDefined();
    });

    it("throws with invalid tile content", async function () {
      // Try loading a composite tile with an instanced tile that has an invalid url.
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        tiles: [
          Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat: 0,
            gltfUri: "invalid",
          }),
        ],
      });

      await expectAsync(
        Cesium3DTilesTester.createContentForMockTile(arrayBuffer, "cmpt")
      ).toBeRejectedWithError(RuntimeError);
    });

    it("renders composite", function () {
      return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(
        expectRenderComposite
      );
    });

    it("renders composite of composite", function () {
      return Cesium3DTilesTester.loadTileset(scene, compositeOfComposite).then(
        expectRenderComposite
      );
    });

    it("renders multiple instanced tilesets", function () {
      return Cesium3DTilesTester.loadTileset(scene, compositeOfInstanced).then(
        expectRenderComposite
      );
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, compositeUrl);
    });

    describe("metadata", function () {
      let metadataClass;
      let groupMetadata;
      let contentMetadataClass;
      let explicitMetadata;
      let implicitMetadata;

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

        explicitMetadata = new ContentMetadata({
          content: {
            properties: {
              author: "Test Author",
              color: [255, 0, 0],
            },
          },
          class: contentMetadataClass,
        });

        implicitMetadata = new ImplicitMetadataView({
          metadataTable: {},
          class: {},
          entityId: 0,
          propertyTableJson: {},
        });
      });

      it("assigning group metadata propagates to inner contents", function () {
        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            content.group = new Cesium3DContentGroup({
              metadata: groupMetadata,
            });
            expect(content.group.metadata).toBe(groupMetadata);

            const innerContents = content.innerContents;
            for (let i = 0; i < innerContents.length; i++) {
              expect(innerContents[i].group.metadata).toBe(groupMetadata);
            }
          }
        );
      });

      it("assigning explicit content metadata propagates to inner contents", function () {
        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            content.metadata = explicitMetadata;
            expect(content.metadata).toBe(explicitMetadata);

            const innerContents = content.innerContents;
            for (let i = 0; i < innerContents.length; i++) {
              expect(innerContents[i].metadata).toBe(explicitMetadata);
            }
          }
        );
      });

      it("assigning implicit content metadata propagates to inner contents", function () {
        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            content.metadata = implicitMetadata;
            expect(content.metadata).toBe(implicitMetadata);

            const innerContents = content.innerContents;
            for (let i = 0; i < innerContents.length; i++) {
              expect(innerContents[i].metadata).toBe(implicitMetadata);
            }
          }
        );
      });
    });
  },
  "WebGL"
);
