import {
  Cartesian3,
  Color,
  HeadingPitchRange,
  MetadataClass,
  GroupMetadata,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

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

    it("throws with invalid version", function () {
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        version: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "cmpt");
    });

    it("throws with invalid inner tile content type", function () {
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        tiles: [
          Cesium3DTilesTester.generateInstancedTileBuffer({
            magic: [120, 120, 120, 120],
          }),
        ],
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "cmpt");
    });

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.resolvesReadyPromise(scene, compositeUrl);
    });

    it("rejects readyPromise on error", function () {
      // Try loading a composite tile with an instanced tile that has an invalid url.
      // Expect promise to be rejected in Model, ModelInstanceCollection,
      // Instanced3DModel3DTileContent, and Composite3DTileContent.
      const arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
        tiles: [
          Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat: 0,
            gltfUri: "invalid",
          }),
        ],
      });
      return Cesium3DTilesTester.rejectsReadyPromiseOnError(
        scene,
        arrayBuffer,
        "cmpt"
      );
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

    describe("3DTILES_metadata", function () {
      const metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              componentType: "STRING",
            },
            height: {
              componentType: "FLOAT32",
            },
          },
        },
      });
      const groupMetadata = new GroupMetadata({
        id: "testGroup",
        group: {
          properties: {
            name: "Test Group",
            height: 35.6,
          },
        },
        class: metadataClass,
      });

      it("assigning groupMetadata propagates to inner contents", function () {
        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            content.groupMetadata = groupMetadata;
            expect(content.groupMetadata).toBe(groupMetadata);

            const innerContents = content.innerContents;
            for (let i = 0; i < innerContents.length; i++) {
              expect(innerContents[i].groupMetadata).toBe(groupMetadata);
            }
          }
        );
      });
    });
  },
  "WebGL"
);
