import {
  B3dmParser,
  Cartesian3,
  Color,
  HeadingPitchRange,
  HeadingPitchRoll,
  Matrix4,
  Transforms,
  Cesium3DTilePass,
  ClippingPlane,
  ClippingPlaneCollection,
  MetadataClass,
  GroupMetadata,
  Model,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Batched3DModel3DTileContent",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const withBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const withBatchTableBinaryUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json";
    const withoutBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
    const translucentUrl =
      "./Data/Cesium3DTiles/Batched/BatchedTranslucent/tileset.json";
    const translucentOpaqueMixUrl =
      "./Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/tileset.json";
    const withTransformBoxUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json";
    const withTransformSphereUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/tileset.json";
    const withTransformRegionUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/tileset.json";
    const texturedUrl =
      "./Data/Cesium3DTiles/Batched/BatchedTextured/tileset.json";
    const withRtcCenterUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithRtcCenter/tileset.json";
    const withCopyrightUrl =
      "./Data/Cesium3dTiles/Batched/BatchedWithCopyright/tileset.json";

    function setCamera(longitude, latitude) {
      // One feature is located at the center, point the camera there
      const center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    beforeAll(function () {
      scene = createScene();

      // Keep the error from logging to the console when running tests
      spyOn(B3dmParser, "_deprecationWarning");
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.resolvesReadyPromise(
        scene,
        withoutBatchTableUrl
      );
    });

    it("renders with batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with batch table binary", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        withBatchTableBinaryUrl
      ).then(function (tileset) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders without batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with all features translucent", function () {
      return Cesium3DTilesTester.loadTileset(scene, translucentUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with a mix of opaque and translucent features", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        translucentOpaqueMixUrl
      ).then(function (tileset) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders with textures", function () {
      return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function (
        tileset
      ) {
        Cesium3DTilesTester.expectRender(scene, tileset);
      });
    });

    function expectRenderWithTransform(url) {
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);

        const newLongitude = -1.31962;
        const newLatitude = 0.698874;
        const newCenter = Cartesian3.fromRadians(
          newLongitude,
          newLatitude,
          0.0
        );
        const newHPR = new HeadingPitchRoll();
        const newTransform = Transforms.headingPitchRollToFixedFrame(
          newCenter,
          newHPR
        );

        // Update tile transform
        tileset.root.transform = newTransform;
        scene.renderForSpecs();

        // Move the camera to the new location
        setCamera(newLongitude, newLatitude);
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    }

    it("renders with a tile transform and box bounding volume", function () {
      return expectRenderWithTransform(withTransformBoxUrl);
    });

    it("renders with a tile transform and sphere bounding volume", function () {
      return expectRenderWithTransform(withTransformSphereUrl);
    });

    it("renders with a tile transform and region bounding volume", function () {
      return expectRenderWithTransform(withTransformRegionUrl);
    });

    it("picks with batch table", function () {
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
          });
        }
      );
    });

    it("picks without batch table", function () {
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
          });
        }
      );
    });

    it("can get features and properties", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          expect(content.featuresLength).toBe(10);
          expect(content.innerContents).toBeUndefined();
          expect(content.hasProperty(0, "id")).toBe(true);
          expect(content.getFeature(0)).toBeDefined();
        }
      );
    });

    it("throws when calling getFeature with invalid index", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          expect(function () {
            content.getFeature(-1);
          }).toThrowDeveloperError();
          expect(function () {
            content.getFeature(1000);
          }).toThrowDeveloperError();
          expect(function () {
            content.getFeature();
          }).toThrowDeveloperError();
        }
      );
    });

    it("gets memory usage", function () {
      return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function (
        tileset
      ) {
        const content = tileset.root.content;

        // 10 buildings, 36 ushort indices and 24 vertices per building, 8 float components (position, normal, uv) and 1 uint component (batchId) per vertex.
        // 10 * ((24 * (8 * 4 + 1 * 4)) + (36 * 2)) = 9360
        const geometryByteLength = 9360;

        // Texture is 128x128 RGBA bytes, not mipmapped
        const texturesByteLength = 65536;

        // One RGBA byte pixel per feature
        const batchTexturesByteLength = content.featuresLength * 4;
        const pickTexturesByteLength = content.featuresLength * 4;

        // Features have not been picked or colored yet, so the batch table contribution is 0.
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(0);

        // Color a feature and expect the texture memory to increase
        content.getFeature(0).color = Color.RED;
        scene.renderForSpecs();
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(batchTexturesByteLength);

        // Pick the tile and expect the texture memory to increase
        scene.pickForSpecs();
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(
          batchTexturesByteLength + pickTexturesByteLength
        );
      });
    });

    it("Links model to tileset clipping planes based on bounding volume clipping", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          const tile = tileset.root;
          const content = tile.content;
          const model = content._model;
          const passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          expect(model.clippingPlanes).toBeUndefined();

          const clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeDefined();
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);

          tile._isClipped = false;
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeUndefined();
        }
      );
    });

    it("Links model to tileset clipping planes if tileset clipping planes are reassigned", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          const tile = tileset.root;
          const model = tile.content._model;
          const passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          expect(model.clippingPlanes).toBeUndefined();

          const clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeDefined();
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);

          const newClippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = newClippingPlaneCollection;
          newClippingPlaneCollection.update(scene.frameState);
          expect(model.clippingPlanes).not.toBe(tileset.clippingPlanes);

          tile.update(tileset, scene.frameState, passOptions);
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);
        }
      );
    });

    it("rebuilds Model shaders when clipping planes change", function () {
      spyOn(Model, "_getClippingFunction").and.callThrough();

      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          const tile = tileset.root;
          const passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          const clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(Model._getClippingFunction.calls.count()).toEqual(1);
        }
      );
    });

    it("transforms model positions by RTC_CENTER property in the features table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withRtcCenterUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);

          const rtcTransform = tileset.root.content._rtcCenterTransform;
          expect(rtcTransform).toEqual(
            Matrix4.fromTranslation(new Cartesian3(0.1, 0.2, 0.3))
          );

          let expectedModelTransform = Matrix4.multiply(
            tileset.root.transform,
            rtcTransform,
            new Matrix4()
          );
          expect(tileset.root.content._contentModelMatrix).toEqual(
            expectedModelTransform
          );
          expect(tileset.root.content._model._modelMatrix).toEqual(
            expectedModelTransform
          );

          // Update tile transform
          const newLongitude = -1.31962;
          const newLatitude = 0.698874;
          const newCenter = Cartesian3.fromRadians(
            newLongitude,
            newLatitude,
            0.0
          );
          const newHPR = new HeadingPitchRoll();
          const newTransform = Transforms.headingPitchRollToFixedFrame(
            newCenter,
            newHPR
          );
          tileset.root.transform = newTransform;
          scene.camera.lookAt(newCenter, new HeadingPitchRange(0.0, 0.0, 15.0));
          scene.renderForSpecs();

          expectedModelTransform = Matrix4.multiply(
            tileset.root.computedTransform,
            rtcTransform,
            expectedModelTransform
          );
          expect(tileset.root.content._model._modelMatrix).toEqual(
            expectedModelTransform
          );
        }
      );
    });

    it("gets copyright from glTF", function () {
      return Cesium3DTilesTester.loadTileset(scene, withCopyrightUrl).then(
        function (tileset) {
          const creditDisplay = scene.frameState.creditDisplay;
          const credits =
            creditDisplay._currentFrameCredits.lightboxCredits.values;
          expect(credits.length).toEqual(1);
          expect(credits[0].credit.html).toEqual("Sample Copyright");
        }
      );
    });

    it("shows copyright from glTF on screen", function () {
      return Cesium3DTilesTester.loadTileset(scene, withCopyrightUrl, {
        showCreditsOnScreen: true,
      }).then(function (tileset) {
        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.screenCredits.values;
        expect(credits.length).toEqual(1);
        expect(credits[0].credit.html).toEqual("Sample Copyright");
      });
    });

    it("toggles showing copyright from glTF on screen", function () {
      return Cesium3DTilesTester.loadTileset(scene, withCopyrightUrl, {
        showCreditsOnScreen: false,
      }).then(function (tileset) {
        const creditDisplay = scene.frameState.creditDisplay;
        const lightboxCredits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        const screenCredits =
          creditDisplay._currentFrameCredits.screenCredits.values;

        expect(lightboxCredits.length).toEqual(1);
        expect(lightboxCredits[0].credit.html).toEqual("Sample Copyright");
        expect(screenCredits.length).toEqual(0);

        tileset.showCreditsOnScreen = true;
        scene.renderForSpecs();
        expect(screenCredits.length).toEqual(1);
        expect(screenCredits[0].credit.html).toEqual("Sample Copyright");
        expect(lightboxCredits.length).toEqual(0);

        tileset.showCreditsOnScreen = false;
        scene.renderForSpecs();
        expect(lightboxCredits.length).toEqual(1);
        expect(lightboxCredits[0].credit.html).toEqual("Sample Copyright");
        expect(screenCredits.length).toEqual(0);
      });
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
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

      it("assigns groupMetadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          content.groupMetadata = groupMetadata;
          expect(content.groupMetadata).toBe(groupMetadata);
        });
      });
    });
  },
  "WebGL"
);
