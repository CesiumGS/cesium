import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Credit } from "../../Source/Cesium.js";
import { CullingVolume } from "../../Source/Cesium.js";
import { defer } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { getAbsoluteUri } from "../../Source/Cesium.js";
import { getJsonFromTypedArray } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { PrimitiveType } from "../../Source/Cesium.js";
import { Ray } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { ResourceCache } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { Camera } from "../../Source/Cesium.js";
import { Cesium3DTile } from "../../Source/Cesium.js";
import { Cesium3DTileColorBlendMode } from "../../Source/Cesium.js";
import { Cesium3DTileContentState } from "../../Source/Cesium.js";
import { Cesium3DTilePass } from "../../Source/Cesium.js";
import { Cesium3DTilePassState } from "../../Source/Cesium.js";
import { Cesium3DTileRefine } from "../../Source/Cesium.js";
import { Cesium3DTileset } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import { ClippingPlane } from "../../Source/Cesium.js";
import { ClippingPlaneCollection } from "../../Source/Cesium.js";
import { CullFace } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";
import generateJsonBuffer from "../generateJsonBuffer.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Cesium3DTileset",
  function () {
    // It's not easily possible to mock the most detailed pick functions
    // so don't run those tests when using the WebGL stub
    const webglStub = !!window.webglStub;

    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;
    let options;

    // Parent tile with content and four child tiles with content
    const tilesetUrl = "Data/Cesium3DTiles/Tilesets/Tileset/tileset.json";

    // Parent tile with no content and four child tiles with content
    const tilesetEmptyRootUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetEmptyRoot/tileset.json";

    // Tileset with 3 levels of uniform subdivision
    const tilesetUniform =
      "Data/Cesium3DTiles/Tilesets/TilesetUniform/tileset.json";

    const tilesetReplacement1Url =
      "Data/Cesium3DTiles/Tilesets/TilesetReplacement1/tileset.json";
    const tilesetReplacement2Url =
      "Data/Cesium3DTiles/Tilesets/TilesetReplacement2/tileset.json";
    const tilesetReplacement3Url =
      "Data/Cesium3DTiles/Tilesets/TilesetReplacement3/tileset.json";

    // 3 level tree with mix of additive and replacement refinement
    const tilesetRefinementMix =
      "Data/Cesium3DTiles/Tilesets/TilesetRefinementMix/tileset.json";

    // tileset.json : root content points to tiles2.json
    // tiles2.json: root with b3dm content, three children with b3dm content, one child points to tiles3.json
    // tiles3.json: root with b3dm content
    const tilesetOfTilesetsUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";

    const withoutBatchTableUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
    const withBatchTableUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const noBatchIdsUrl =
      "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";

    const withBatchTableHierarchyUrl =
      "Data/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json";

    const withTransformBoxUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json";
    const withTransformSphereUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/tileset.json";
    const withTransformRegionUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/tileset.json";
    const withBoundingSphereUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithBoundingSphere/tileset.json";

    const compositeUrl = "Data/Cesium3DTiles/Composite/Composite/tileset.json";
    const instancedUrl =
      "Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
    const instancedRedMaterialUrl =
      "Data/Cesium3DTiles/Instanced/InstancedRedMaterial/tileset.json";
    const instancedAnimationUrl =
      "Data/Cesium3DTiles/Instanced/InstancedAnimated/tileset.json";

    const gltfContentUrl = "Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
    const glbContentUrl = "Data/Cesium3DTiles/GltfContent/glb/tileset.json";

    const gltfContentWithCopyrightUrl =
      "Data/Cesium3DTiles/GltfContentWithCopyright/glTF/tileset.json";
    const gltfContentWithRepeatedCopyrightsUrl =
      "Data/Cesium3DTiles/GltfContentWithRepeatedCopyrights/glTF/tileset.json";

    // 1 tile where each feature is a different source color
    const colorsUrl = "Data/Cesium3DTiles/Batched/BatchedColors/tileset.json";

    // 1 tile where each feature has a reddish texture
    const texturedUrl =
      "Data/Cesium3DTiles/Batched/BatchedTextured/tileset.json";

    // 1 tile with translucent features
    const translucentUrl =
      "Data/Cesium3DTiles/Batched/BatchedTranslucent/tileset.json";

    // 1 tile with opaque and translucent features
    const translucentOpaqueMixUrl =
      "Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/tileset.json";

    // Root tile is transformed from local space to wgs84, child tile is rotated, scaled, and translated locally
    const tilesetWithTransformsUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetWithTransforms/tileset.json";

    // Root tile with 4 b3dm children and 1 pnts child with a viewer request volume
    const tilesetWithViewerRequestVolumeUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetWithViewerRequestVolume/tileset.json";

    // Parent tile with content and four child tiles with content with viewer request volume for each child
    const tilesetReplacementWithViewerRequestVolumeUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetReplacementWithViewerRequestVolume/tileset.json";

    const tilesetWithExternalResourcesUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetWithExternalResources/tileset.json";
    const tilesetUrlWithContentUri =
      "Data/Cesium3DTiles/Batched/BatchedWithContentDataUri/tileset.json";

    const tilesetSubtreeExpirationUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetSubtreeExpiration/tileset.json";
    const tilesetSubtreeUrl =
      "Data/Cesium3DTiles/Tilesets/TilesetSubtreeExpiration/subtree.json";
    const batchedExpirationUrl =
      "Data/Cesium3DTiles/Batched/BatchedExpiration/tileset.json";
    const batchedColorsB3dmUrl =
      "Data/Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm";
    const batchedVertexColorsUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithVertexColors/tileset.json";
    const batchedAnimationUrl =
      "Data/Cesium3DTiles/Batched/BatchedAnimated/tileset.json";

    const styleUrl = "Data/Cesium3DTiles/Style/style.json";

    const pointCloudUrl =
      "Data/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json";
    const pointCloudBatchedUrl =
      "Data/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json";

    function endsWith(string, suffix) {
      const slicePoint = string.length - suffix.length;
      return string.slice(slicePoint) === suffix;
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

      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      viewAllTiles();

      options = {
        cullRequestsWhileMoving: false,
      };
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    function setZoom(distance) {
      // Bird's eye view
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, distance));
    }

    function viewAllTiles() {
      setZoom(15.0);
    }

    function viewRootOnly() {
      setZoom(100.0);
    }

    function viewNothing() {
      setZoom(200.0);
    }

    function viewSky() {
      const center = Cartesian3.fromRadians(
        centerLongitude,
        centerLatitude,
        100
      );
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 10.0));
    }

    function viewBottomLeft() {
      viewAllTiles();
      scene.camera.moveLeft(200.0);
      scene.camera.moveDown(200.0);
    }

    function viewInstances() {
      setZoom(30.0);
    }

    function viewPointCloud() {
      setZoom(5.0);
    }

    function viewGltfContent() {
      setZoom(100.0);
    }

    function isSelected(tileset, tile) {
      return tileset._selectedTiles.indexOf(tile) > -1;
    }

    it("throws with undefined url", function () {
      expect(function () {
        return new Cesium3DTileset();
      }).toThrowDeveloperError();
    });

    // Throws several unhandled 404 errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("rejects readyPromise with invalid tileset JSON file", function () {
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        deferred.reject();
      });

      options.url = "invalid.json";
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise
        .then(function () {
          fail("should not resolve");
        })
        .catch(function (error) {
          expect(tileset.ready).toEqual(false);
        });
    });

    it("loads json with static loadJson method", function () {
      const tilesetJson = {
        asset: {
          version: 2.0,
        },
      };

      const uri = `data:text/plain;base64,${btoa(JSON.stringify(tilesetJson))}`;

      Cesium3DTileset.loadJson(uri)
        .then(function (result) {
          expect(result).toEqual(tilesetJson);
        })
        .catch(function (error) {
          fail("should not fail");
        });
    });

    it("static method loadJson is used in Cesium3DTileset constructor", function () {
      const path = "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";

      const originalLoadJson = Cesium3DTileset.loadJson;

      // override loadJson and replace incorrect url with correct url
      Cesium3DTileset.loadJson = function (tilesetUrl) {
        return originalLoadJson(path);
      };

      // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
      const tileset = new Cesium3DTileset({
        url: "invalid.json",
      });

      return tileset.readyPromise
        .then(function () {
          expect(tileset.ready).toEqual(true);
          // restore original version
          Cesium3DTileset.loadJson = originalLoadJson;
        })
        .catch(function (error) {
          fail("should not fail");
        });
    });

    it("Constructor works with promise to resource", function () {
      const resource = new Resource({
        url: "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json",
      });

      // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
      const tileset = new Cesium3DTileset({
        url: Promise.resolve(resource),
      });

      return tileset.readyPromise
        .then(function () {
          expect(tileset.ready).toEqual(true);
        })
        .catch(function (error) {
          fail("should not fail");
        });
    });

    it("Constructor works with file resource", function () {
      const resource = new Resource({
        url: "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json",
      });

      // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
      const tileset = new Cesium3DTileset({
        url: resource,
      });

      return tileset.readyPromise
        .then(function () {
          expect(tileset.ready).toEqual(true);
        })
        .catch(function (error) {
          fail("should not fail");
        });
    });

    it("rejects readyPromise with invalid tileset version", function () {
      const tilesetJson = {
        asset: {
          version: 2.0,
        },
      };

      const uri = `data:text/plain;base64,${btoa(JSON.stringify(tilesetJson))}`;

      options.url = uri;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise
        .then(function () {
          fail("should not resolve");
        })
        .catch(function (error) {
          expect(tileset.ready).toEqual(false);
        });
    });

    it("rejects readyPromise with unsupported extension", function () {
      const tilesetJson = {
        asset: {
          version: 1.0,
        },
        extensionsUsed: ["unsupported_extension"],
        extensionsRequired: ["unsupported_extension"],
      };

      const uri = `data:text/plain;base64,${btoa(JSON.stringify(tilesetJson))}`;

      options.url = uri;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise
        .then(function () {
          fail("should not resolve");
        })
        .catch(function (error) {
          expect(tileset.ready).toEqual(false);
        });
    });

    it("url and tilesetUrl set up correctly given tileset JSON filepath", function () {
      const path = "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = new Cesium3DTileset({
        url: path,
      });
      return Promise.resolve(tileset).then(function () {
        expect(tileset.resource.url).toEqual(path);
        return tileset.readyPromise;
      });
    });

    it("url and tilesetUrl set up correctly given path with query string", function () {
      const path = "Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const param = "?param1=1&param2=2";
      const tileset = new Cesium3DTileset({
        url: path + param,
      });
      return Promise.resolve(tileset).then(function () {
        expect(tileset.resource.url).toEqual(path + param);
        return tileset.readyPromise;
      });
    });

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        return tileset.readyPromise.then(function (tileset) {
          expect(tileset.ready).toEqual(true);
        });
      });
    });

    it("loads tileset JSON file", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const asset = tileset.asset;
        expect(asset).toBeDefined();
        expect(asset.version).toEqual("1.0");
        expect(asset.tilesetVersion).toEqual("1.2.3");

        const properties = tileset.properties;
        expect(properties).toBeDefined();
        expect(properties.id).toBeDefined();
        expect(properties.id.minimum).toEqual(0);
        expect(properties.id.maximum).toEqual(9);

        expect(tileset._geometricError).toEqual(240.0);
        expect(tileset.root).toBeDefined();
        expect(tileset.resource.url).toEqual(tilesetUrl);
      });
    });

    it("loads tileset with extras", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        expect(tileset.extras).toEqual({ name: "Sample Tileset" });
        expect(tileset.root.extras).toBeUndefined();

        const length = tileset.root.children.length;
        let taggedChildren = 0;
        for (let i = 0; i < length; ++i) {
          if (defined(tileset.root.children[i].extras)) {
            expect(tileset.root.children[i].extras).toEqual({
              id: "Special Tile",
            });
            ++taggedChildren;
          }
        }

        expect(taggedChildren).toEqual(1);
      });
    });

    it("gets root tile", function () {
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      expect(function () {
        return tileset.root;
      }).toThrowDeveloperError();
      return tileset.readyPromise.then(function () {
        expect(tileset.root).toBeDefined();
      });
    });

    it("hasExtension returns true if the tileset JSON file uses the specified extension", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        withBatchTableHierarchyUrl
      ).then(function (tileset) {
        expect(tileset.hasExtension("3DTILES_batch_table_hierarchy")).toBe(
          true
        );
        expect(tileset.hasExtension("3DTILES_nonexistant_extension")).toBe(
          false
        );
      });
    });

    it("passes version in query string to tiles", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        expect(tileset.root.content._resource.url).toEqual(
          getAbsoluteUri(
            tilesetUrl.replace("tileset.json", "parent.b3dm?v=1.2.3")
          )
        );
      });
    });

    it("passes version in query string to all external resources", function () {
      // Spy on loadWithXhr so we can verify requested urls
      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      const queryParams = "?a=1&b=boy";
      const queryParamsWithVersion = "?a=1&b=boy&v=1.2.3";
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithExternalResourcesUrl + queryParams
      ).then(function (tileset) {
        const calls = Resource._Implementations.loadWithXhr.calls.all();
        const callsLength = calls.length;
        for (let i = 0; i < callsLength; ++i) {
          const url = calls[0].args[0];
          if (url.indexOf(tilesetWithExternalResourcesUrl) >= 0) {
            const query = url.slice(url.indexOf("?"));
            if (url.indexOf("tileset.json") >= 0) {
              // The initial tileset.json does not have a tileset version parameter
              expect(query).toBe(queryParams);
            } else {
              expect(query).toBe(queryParamsWithVersion);
            }
          }
        }
      });
    });

    it("throws when getting asset and tileset is not ready", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        return tileset.asset;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    it("throws when getting extensions and tileset is not ready", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        return tileset.extensions;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    it("throws when getting properties and tileset is not ready", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        return tileset.properties;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    it("throws when getting extras and tileset is not ready", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        return tileset.extras;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    // Throws several unhandled errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("requests tile with invalid magic", function () {
      const invalidMagicBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
        magic: [120, 120, 120, 120],
      });
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise.then(function (tileset) {
        // Start spying after the tileset json has been loaded
        spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          deferred.resolve(invalidMagicBuffer);
        });
        scene.renderForSpecs(); // Request root
        const root = tileset.root;
        return root.contentReadyPromise
          .then(function () {
            fail("should not resolve");
          })
          .catch(function (error) {
            expect(error.message).toBe("Invalid tile content.");
            expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
          });
      });
    });

    // Throws several unhandled 404 errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("handles failed tile requests", function () {
      viewRootOnly();
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise.then(function (tileset) {
        // Start spying after the tileset json has been loaded
        spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          deferred.reject();
        });
        scene.renderForSpecs(); // Request root
        const root = tileset.root;
        return root.contentReadyPromise
          .then(function () {
            fail("should not resolve");
          })
          .catch(function (error) {
            expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(0);
            expect(statistics.numberOfPendingRequests).toBe(0);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(0);
          });
      });
    });

    // Throws several unhandled errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("handles failed tile processing", function () {
      viewRootOnly();
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise.then(function (tileset) {
        // Start spying after the tileset json has been loaded
        spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          deferred.resolve(
            Cesium3DTilesTester.generateBatchedTileBuffer({
              version: 0, // Invalid version
            })
          );
        });
        scene.renderForSpecs(); // Request root
        const root = tileset.root;
        return root.contentReadyPromise
          .then(function () {
            fail("should not resolve");
          })
          .catch(function (error) {
            expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(0);
            expect(statistics.numberOfPendingRequests).toBe(0);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(0);
          });
      });
    });

    it("renders tileset", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);
      });
    });

    function checkAnimation(url) {
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(271.828),
        };

        expect(renderOptions).toRenderAndCall(function (rgba) {
          const commandList = scene.frameState.commandList;
          const modelMatrix1 = Matrix4.clone(commandList[0].modelMatrix);
          // Check that the scene changes after .5 seconds. (it animates)
          renderOptions.time.secondsOfDay += 0.5;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            const modelMatrix2 = Matrix4.clone(commandList[0].modelMatrix);
            expect(modelMatrix1).not.toEqual(modelMatrix2);
          });
        });
      });
    }
    it("animates instanced tileset", function () {
      return checkAnimation(instancedAnimationUrl);
    });

    it("animates batched tileset", function () {
      return checkAnimation(batchedAnimationUrl);
    });

    it("renders tileset in CV", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        scene.morphToColumbusView(0.0);
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);
      });
    });

    it("renders tileset in 2D", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        scene.morphTo2D(0.0);
        tileset.maximumScreenSpaceError = 3;
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(10);
      });
    });

    it("does not render during morph", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const commandList = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commandList.length).toBeGreaterThan(0);
        scene.morphToColumbusView(1.0);
        scene.renderForSpecs();
        expect(commandList.length).toBe(0);
      });
    });

    it("renders tileset with empty root tile", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(
        function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(5);
          expect(statistics.numberOfCommands).toEqual(4); // Empty tile doesn't issue a command
        }
      );
    });

    it("verify statistics", function () {
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      // Verify initial values
      const statistics = tileset._statistics;
      expect(statistics.visited).toEqual(0);
      expect(statistics.numberOfCommands).toEqual(0);
      expect(statistics.numberOfPendingRequests).toEqual(0);
      expect(statistics.numberOfTilesProcessing).toEqual(0);

      return Cesium3DTilesTester.waitForReady(scene, tileset).then(function () {
        // Check that root and children are requested
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(0);
        expect(statistics.numberOfPendingRequests).toEqual(5);
        expect(statistics.numberOfTilesProcessing).toEqual(0);

        // Wait for all tiles to load and check that they are all visited and rendered
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfPendingRequests).toEqual(0);
            expect(statistics.numberOfTilesProcessing).toEqual(0);
          }
        );
      });
    });

    function checkPointAndFeatureCounts(tileset, features, points, triangles) {
      const statistics = tileset._statistics;

      expect(statistics.numberOfFeaturesSelected).toEqual(0);
      expect(statistics.numberOfFeaturesLoaded).toEqual(0);
      expect(statistics.numberOfPointsSelected).toEqual(0);
      expect(statistics.numberOfPointsLoaded).toEqual(0);
      expect(statistics.numberOfTrianglesSelected).toEqual(0);

      return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
        function () {
          expect(statistics.numberOfFeaturesSelected).toEqual(features);
          expect(statistics.numberOfFeaturesLoaded).toEqual(features);
          expect(statistics.numberOfPointsSelected).toEqual(points);
          expect(statistics.numberOfPointsLoaded).toEqual(points);
          expect(statistics.numberOfTrianglesSelected).toEqual(triangles);

          viewNothing();
          scene.renderForSpecs();

          expect(statistics.numberOfFeaturesSelected).toEqual(0);
          expect(statistics.numberOfFeaturesLoaded).toEqual(features);
          expect(statistics.numberOfPointsSelected).toEqual(0);
          expect(statistics.numberOfPointsLoaded).toEqual(points);
          expect(statistics.numberOfTrianglesSelected).toEqual(0);

          tileset.trimLoadedTiles();
          scene.renderForSpecs();

          expect(statistics.numberOfFeaturesSelected).toEqual(0);
          expect(statistics.numberOfFeaturesLoaded).toEqual(0);
          expect(statistics.numberOfPointsSelected).toEqual(0);
          expect(statistics.numberOfPointsLoaded).toEqual(0);
          expect(statistics.numberOfTrianglesSelected).toEqual(0);
        }
      );
    }

    it("verify batched features statistics", function () {
      options.url = withBatchTableUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 10, 0, 120);
    });

    it("verify no batch table features statistics", function () {
      options.url = noBatchIdsUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 0, 0, 120);
    });

    it("verify instanced features statistics", function () {
      options.url = instancedRedMaterialUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 25, 0, 12);
    });

    it("verify composite features statistics", function () {
      options.url = compositeUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 35, 0, 132);
    });

    it("verify tileset of tilesets features statistics", function () {
      options.url = tilesetOfTilesetsUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 50, 0, 600);
    });

    it("verify points statistics", function () {
      viewPointCloud();

      options.url = pointCloudUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 0, 1000, 0);
    });

    it("verify triangle statistics", function () {
      options.url = tilesetEmptyRootUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 40, 0, 480);
    });

    it("verify batched points statistics", function () {
      viewPointCloud();

      options.url = pointCloudBatchedUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));

      return checkPointAndFeatureCounts(tileset, 8, 1000, 0);
    });

    it("verify memory usage statistics", function () {
      // Calculations in Batched3DModel3DTileContentSpec, minus uvs
      const singleTileGeometryMemory = 7440;
      const singleTileTextureMemory = 0;
      const singleTileBatchTextureMemory = 40;
      const singleTilePickTextureMemory = 40;
      const tilesLength = 5;

      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;

        // No tiles loaded
        expect(statistics.geometryByteLength).toEqual(0);
        expect(statistics.texturesByteLength).toEqual(0);
        expect(statistics.batchTableByteLength).toEqual(0);

        viewRootOnly();
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            // Root tile loaded
            expect(statistics.geometryByteLength).toEqual(
              singleTileGeometryMemory
            );
            expect(statistics.texturesByteLength).toEqual(
              singleTileTextureMemory
            );
            expect(statistics.batchTableByteLength).toEqual(0);

            viewAllTiles();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                // All tiles loaded
                expect(statistics.geometryByteLength).toEqual(
                  singleTileGeometryMemory * tilesLength
                );
                expect(statistics.texturesByteLength).toEqual(
                  singleTileTextureMemory * tilesLength
                );
                expect(statistics.batchTableByteLength).toEqual(0);

                // One feature colored, the batch table memory is now higher
                tileset.root.content.getFeature(0).color = Color.RED;
                scene.renderForSpecs();
                expect(statistics.geometryByteLength).toEqual(
                  singleTileGeometryMemory * tilesLength
                );
                expect(statistics.texturesByteLength).toEqual(
                  singleTileTextureMemory * tilesLength
                );
                expect(statistics.batchTableByteLength).toEqual(
                  singleTileBatchTextureMemory
                );

                // All tiles picked, the texture memory is now higher
                scene.pickForSpecs();
                expect(statistics.geometryByteLength).toEqual(
                  singleTileGeometryMemory * tilesLength
                );
                expect(statistics.texturesByteLength).toEqual(
                  singleTileTextureMemory * tilesLength
                );
                expect(statistics.batchTableByteLength).toEqual(
                  singleTileBatchTextureMemory +
                    singleTilePickTextureMemory * tilesLength
                );

                // Tiles are still in memory when zoomed out
                viewNothing();
                scene.renderForSpecs();
                expect(statistics.geometryByteLength).toEqual(
                  singleTileGeometryMemory * tilesLength
                );
                expect(statistics.texturesByteLength).toEqual(
                  singleTileTextureMemory * tilesLength
                );
                expect(statistics.batchTableByteLength).toEqual(
                  singleTileBatchTextureMemory +
                    singleTilePickTextureMemory * tilesLength
                );

                // Trim loaded tiles, expect the memory statistics to be 0
                tileset.trimLoadedTiles();
                scene.renderForSpecs();
                expect(statistics.geometryByteLength).toEqual(0);
                expect(statistics.texturesByteLength).toEqual(0);
                expect(statistics.batchTableByteLength).toEqual(0);
              }
            );
          }
        );
      });
    });

    it("verify memory usage statistics for shared resources", function () {
      // Six tiles total:
      // * Two b3dm tiles - no shared resources
      // * Two i3dm tiles with embedded glTF - no shared resources
      // * Two i3dm tiles with external glTF - shared resources
      // Expect to see some saving with memory usage since two of the tiles share resources
      // All tiles reference the same external texture but texture caching is not supported yet
      // TODO : tweak test when #5051 is in

      const b3dmGeometryMemory = 840; // Only one box in the tile, unlike most other test tiles
      const i3dmGeometryMemory = 840;

      // Texture is 128x128 RGBA bytes, not mipmapped
      const texturesByteLength = 65536;

      const expectedGeometryMemory =
        b3dmGeometryMemory * 2 + i3dmGeometryMemory * 3;
      const expectedTextureMemory = texturesByteLength * 5;

      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithExternalResourcesUrl
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        expect(statistics.geometryByteLength).toBe(expectedGeometryMemory);
        expect(statistics.texturesByteLength).toBe(expectedTextureMemory);
      });
    });

    it("does not process tileset when screen space error is not met", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);

        // Set zoom far enough away to not meet sse
        viewNothing();
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(0);
        expect(statistics.numberOfCommands).toEqual(0);
      });
    });

    it("does not select tiles when outside of view frustum", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);

        viewSky();

        scene.renderForSpecs();
        expect(statistics.visited).toEqual(0);
        expect(statistics.numberOfCommands).toEqual(0);
        expect(
          tileset.root.visibility(
            scene.frameState,
            CullingVolume.MASK_INDETERMINATE
          )
        ).toEqual(CullingVolume.MASK_OUTSIDE);
      });
    });

    it("does not load additive tiles that are out of view", function () {
      viewBottomLeft();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.numberOfTilesWithContentReady).toEqual(2);
      });
    });

    it("culls with content box", function () {
      // Root tile has a content box that is half the extents of its box
      // Expect to cull root tile and three child tiles
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);

        viewBottomLeft();
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(2); // Visits root, but does not render it
        expect(statistics.numberOfCommands).toEqual(1);
        expect(tileset._selectedTiles[0]).not.toBe(tileset.root);

        // Set contents box to undefined, and now root won't be culled
        tileset.root._contentBoundingVolume = undefined;
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(2);
        expect(statistics.numberOfCommands).toEqual(2);
      });
    });

    function findTileByUri(tiles, uri) {
      const length = tiles.length;
      for (let i = 0; i < length; ++i) {
        const tile = tiles[i];
        const contentHeader = tile._header.content;
        if (defined(contentHeader)) {
          if (contentHeader.uri.indexOf(uri) >= 0) {
            return tile;
          }
        }
      }
      return undefined;
    }

    it("selects children in front to back order", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        // After moving the camera left by 1.0 and down by 0.5, the distance from the camera should be in the order:
        // 1. lower left
        // 2. upper left
        // 3. lower right
        // 4. upper right

        scene.camera.moveLeft(1.0);
        scene.camera.moveDown(0.5);
        scene.renderForSpecs();

        const root = tileset.root;
        const llTile = findTileByUri(root.children, "ll.b3dm");
        const lrTile = findTileByUri(root.children, "lr.b3dm");
        const urTile = findTileByUri(root.children, "ur.b3dm");
        const ulTile = findTileByUri(root.children, "ul.b3dm");

        const selectedTiles = tileset._selectedTiles;
        expect(selectedTiles[0]).toBe(root);
        expect(selectedTiles[1]).toBe(llTile);
        expect(selectedTiles[2]).toBe(ulTile);
        expect(selectedTiles[3]).toBe(lrTile);
        expect(selectedTiles[4]).toBe(urTile);
      });
    });

    function testDynamicScreenSpaceError(url, distance) {
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;

        // Horizon view, only root is visible
        const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, distance));

        // Set dynamic SSE to false (default)
        tileset.dynamicScreenSpaceError = false;
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(1);

        // Set dynamic SSE to true, now the root is not rendered
        tileset.dynamicScreenSpaceError = true;
        tileset.dynamicScreenSpaceErrorDensity = 1.0;
        tileset.dynamicScreenSpaceErrorFactor = 10.0;
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(0);
        expect(statistics.numberOfCommands).toEqual(0);
      });
    }

    function numberOfChildrenWithoutContent(tile) {
      const children = tile.children;
      const length = children.length;
      let count = 0;
      for (let i = 0; i < length; ++i) {
        const child = children[i];
        if (!child.contentReady) {
          ++count;
        }
      }
      return count;
    }

    // Adjust distances for each test because the dynamic SSE takes the
    // bounding volume height into account, which differs for each bounding volume.
    it("uses dynamic screen space error for tileset with region", function () {
      return testDynamicScreenSpaceError(withTransformRegionUrl, 103.0);
    });

    it("uses dynamic screen space error for tileset with bounding sphere", function () {
      return testDynamicScreenSpaceError(withBoundingSphereUrl, 137.0);
    });

    it("uses dynamic screen space error for local tileset with box", function () {
      return testDynamicScreenSpaceError(withTransformBoxUrl, 103.0);
    });

    it("uses dynamic screen space error for local tileset with sphere", function () {
      return testDynamicScreenSpaceError(withTransformSphereUrl, 144.0);
    });

    it("additive refinement - selects root when sse is met", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        // Meets screen space error, only root tile is rendered
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(1);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("additive refinement - selects all tiles when sse is not met", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        // Does not meet screen space error, all tiles are visible
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("additive refinement - use parent's geometric error on child's box for early refinement", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5);
        expect(statistics.numberOfCommands).toEqual(5);

        // Both right tiles don't meet the SSE anymore
        scene.camera.moveLeft(50.0);
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(3);
        expect(statistics.numberOfCommands).toEqual(3);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("additive refinement - selects tile when inside viewer request volume", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithViewerRequestVolumeUrl
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        // Force root tile to always not meet SSE since this is just checking the request volume
        tileset.maximumScreenSpaceError = 0.0;

        // Renders all 5 tiles
        setZoom(20.0);
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(5);

        // No longer renders the tile with a request volume
        setZoom(1500.0);
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(4);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects root when sse is met", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.root.refine = Cesium3DTileRefine.REPLACE;

        // Meets screen space error, only root tile is rendered
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(1);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects children when sse is not met", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.root.refine = Cesium3DTileRefine.REPLACE;

        // Does not meet screen space error, child tiles replace root tile
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(5); // Visits root, but does not render it
        expect(statistics.numberOfCommands).toEqual(4);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects root when sse is not met and children are not ready", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const root = tileset.root;
        root.refine = Cesium3DTileRefine.REPLACE;

        // Set zoom to start loading child tiles
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        // LOD skipping visits all visible
        expect(statistics.visited).toEqual(5);
        // no stencil clear command because only the root tile
        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfPendingRequests).toEqual(4);
        expect(numberOfChildrenWithoutContent(root)).toEqual(4);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects tile when inside viewer request volume", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithViewerRequestVolumeUrl,
        {
          skipLevelOfDetail: false,
        }
      ).then(function (tileset) {
        const statistics = tileset._statistics;

        const root = tileset.root;
        root.refine = Cesium3DTileRefine.REPLACE;
        root.hasEmptyContent = false; // mock content
        tileset.maximumScreenSpaceError = 0.0; // Force root tile to always not meet SSE since this is just checking the request volume

        // Renders all 5 tiles
        setZoom(20.0);
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(5);
        expect(isSelected(tileset, root)).toBe(false);

        // No longer renders the tile with a request volume
        setZoom(1500.0);
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(4);
        expect(isSelected(tileset, root)).toBe(true); // one child is no longer selected. root is chosen instead
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects upwards when traversal stops at empty tile", function () {
      // No children have content, but all grandchildren have content
      //
      //          C
      //      E       E
      //    C   C   C   C
      //
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement1Url
      ).then(function (tileset) {
        tileset.root.geometricError = 90;
        setZoom(80);
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.selected).toEqual(1);
        expect(statistics.visited).toEqual(3);
        expect(isSelected(tileset, tileset.root)).toBe(true);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("replacement refinement - selects root when sse is not met and subtree is not refinable (1)", function () {
      // No children have content, but all grandchildren have content
      //
      //          C
      //      E       E
      //    C   C   C   C
      //
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement1Url
      ).then(function (tileset) {
        tileset.skipLevelOfDetail = false;
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        const root = tileset.root;

        // Even though root's children are loaded, the grandchildren need to be loaded before it becomes refinable
        expect(numberOfChildrenWithoutContent(root)).toEqual(0); // Children are loaded
        expect(statistics.numberOfCommands).toEqual(1); // No stencil or backface commands; no mixed content
        expect(statistics.numberOfPendingRequests).toEqual(4); // Loading grandchildren

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(4); // Render children
          }
        );
      });
    });

    it("replacement refinement - selects root when sse is not met and subtree is not refinable (2)", function () {
      // Check that the root is refinable once its child is loaded
      //
      //          C
      //          E
      //        C   E
      //            C (smaller geometric error)
      //

      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement2Url
      ).then(function (tileset) {
        tileset.skipLevelOfDetail = false;
        const statistics = tileset._statistics;
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.numberOfCommands).toEqual(1);

            setZoom(5.0); // Zoom into the last tile, when it is ready the root is refinable
            scene.renderForSpecs();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                expect(statistics.numberOfCommands).toEqual(2); // Renders two content tiles
              }
            );
          }
        );
      });
    });

    it("replacement refinement - selects root when sse is not met and subtree is not refinable (3)", function () {
      // Check that the root is refinable once its child is loaded
      //
      //          C
      //          T (external tileset ref)
      //          E (root of external tileset)
      //     C  C  C  C
      //

      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url
      ).then(function (tileset) {
        tileset.skipLevelOfDetail = false;
        const statistics = tileset._statistics;
        const root = tileset.root;
        expect(statistics.numberOfCommands).toEqual(1);

        viewAllTiles();
        scene.renderForSpecs();
        return root.children[0].contentReadyPromise.then(function () {
          // The external tileset json is loaded, but the external tileset isn't.
          scene.renderForSpecs();
          expect(statistics.numberOfCommands).toEqual(1); // root
          expect(statistics.numberOfPendingRequests).toEqual(4); // Loading child content tiles

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(isSelected(tileset, root)).toEqual(false);
              expect(statistics.numberOfCommands).toEqual(4); // Render child content tiles
            }
          );
        });
      });
    });

    it("replacement refinement - refines if descendant is empty leaf tile", function () {
      // Check that the root is refinable once its children with content are loaded
      //
      //          C
      //     C  C  C  E
      //
      viewAllTiles();
      const originalLoadJson = Cesium3DTileset.loadJson;
      spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
        return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
          tilesetJson.root.refine = "REPLACE";
          tilesetJson.root.children[3].content = undefined;
          return tilesetJson;
        });
      });

      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.skipLevelOfDetail = false;
        const statistics = tileset._statistics;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(3);
      });
    });

    it("replacement and additive refinement", function () {
      //          A
      //      A       R (not rendered)
      //    R   A   R   A
      //
      return Cesium3DTilesTester.loadTileset(scene, tilesetRefinementMix).then(
        function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(7);
          expect(statistics.numberOfCommands).toEqual(6);
        }
      );
    });

    describe("children bound union optimization", function () {
      it("does not select visible tiles with invisible children", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetReplacementWithViewerRequestVolumeUrl
        ).then(function (tileset) {
          const center = Cartesian3.fromRadians(
            centerLongitude,
            centerLatitude,
            22.0
          );
          scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 1.0));

          const root = tileset.root;
          const childRoot = root.children[0];

          scene.renderForSpecs();

          expect(
            childRoot.visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);

          expect(
            childRoot.children[0].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[1].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[2].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[3].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).toEqual(CullingVolume.MASK_OUTSIDE);

          expect(tileset._selectedTiles.length).toEqual(0);
          expect(isSelected(tileset, childRoot)).toBe(false);
        });
      });

      it("does not select external tileset whose root has invisible children", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetOfTilesetsUrl
        ).then(function (tileset) {
          const center = Cartesian3.fromRadians(
            centerLongitude,
            centerLatitude,
            50.0
          );
          scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 1.0));
          const root = tileset.root;
          const externalRoot = root.children[0];
          externalRoot.refine = Cesium3DTileRefine.REPLACE;
          scene.renderForSpecs();

          expect(isSelected(tileset, root)).toBe(false);
          expect(isSelected(tileset, externalRoot)).toBe(false);
          expect(root._visible).toBe(false);
          expect(externalRoot._visible).toBe(false);
          expect(tileset.statistics.numberOfTilesCulledWithChildrenUnion).toBe(
            1
          );
        });
      });

      it("does not select visible tiles not meeting SSE with visible children", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetReplacementWithViewerRequestVolumeUrl
        ).then(function (tileset) {
          const root = tileset.root;
          const childRoot = root.children[0];
          childRoot.geometricError = 240;

          scene.renderForSpecs();

          expect(
            childRoot.visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);

          expect(
            childRoot.children[0].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[1].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[2].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[3].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);

          expect(isSelected(tileset, childRoot)).toBe(false);
        });
      });

      it("does select visible tiles meeting SSE with visible children", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetReplacementWithViewerRequestVolumeUrl
        ).then(function (tileset) {
          const root = tileset.root;
          const childRoot = root.children[0];

          childRoot.geometricError = 0; // child root should meet SSE and children should not be drawn
          scene.renderForSpecs();
          // wait for load because geometric error has changed
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function (tileset) {
              expect(
                childRoot.visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);

              expect(
                childRoot.children[0].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[1].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[2].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[3].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);

              expect(isSelected(tileset, childRoot)).toBe(true);
            }
          );
        });
      });

      it("does select visible tiles with visible children failing request volumes", function () {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetReplacementWithViewerRequestVolumeUrl,
          {
            cullWithChildrenBounds: false,
          }
        ).then(function (tileset) {
          const root = tileset.root;
          const childRoot = root.children[0];

          expect(
            childRoot.visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);

          expect(
            childRoot.children[0].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[1].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[2].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);
          expect(
            childRoot.children[3].visibility(
              scene.frameState,
              CullingVolume.MASK_INDETERMINATE
            )
          ).not.toEqual(CullingVolume.MASK_OUTSIDE);

          expect(tileset._selectedTiles.length).toEqual(1);
          expect(isSelected(tileset, childRoot)).toBe(true);
        });
      });

      it("does select visible tiles with visible children passing request volumes", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetReplacementWithViewerRequestVolumeUrl
        ).then(function (tileset) {
          const root = tileset.root;
          const childRoot = root.children[0];
          childRoot.geometricError = 0;

          // wait for load because geometric error has changed
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function (tileset) {
              expect(
                childRoot.visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);

              expect(
                childRoot.children[0].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[1].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[2].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);
              expect(
                childRoot.children[3].visibility(
                  scene.frameState,
                  CullingVolume.MASK_INDETERMINATE
                )
              ).not.toEqual(CullingVolume.MASK_OUTSIDE);

              expect(tileset._selectedTiles.length).toEqual(1);
              expect(isSelected(tileset, childRoot)).toBe(true);

              childRoot.geometricError = 200;
              scene.renderForSpecs();
              expect(tileset._selectedTiles.length).toEqual(4);
              expect(isSelected(tileset, childRoot)).toBe(false);
            }
          );
        });
      });
    });

    it("loads tileset with external tileset JSON file", function () {
      // Set view so that no tiles are loaded initially
      viewNothing();

      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          // Root points to an external tileset JSON file and has no children until it is requested
          const root = tileset.root;
          expect(root.children.length).toEqual(0);

          // Set view so that root's content is requested
          viewRootOnly();
          scene.renderForSpecs();
          return root.contentReadyPromise.then(function () {
            expect(root.hasTilesetContent).toEqual(true);

            // Root has one child now, the root of the external tileset
            expect(root.children.length).toEqual(1);

            // Check that headers are equal
            const subtreeRoot = root.children[0];
            expect(root.refine).toEqual(subtreeRoot.refine);
            expect(root.contentBoundingVolume.boundingVolume).toEqual(
              subtreeRoot.contentBoundingVolume.boundingVolume
            );

            // Check that subtree root has 4 children
            expect(subtreeRoot.hasTilesetContent).toEqual(false);
            expect(subtreeRoot.children.length).toEqual(4);
          });
        }
      );
    });

    it("preserves query string with external tileset JSON file", function () {
      // Set view so that no tiles are loaded initially
      viewNothing();

      //Spy on loadWithXhr so we can verify requested urls
      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      const queryParams = "a=1&b=boy";
      let expectedUrl = `Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json?${queryParams}`;
      return Cesium3DTilesTester.loadTileset(
        scene,
        `${tilesetOfTilesetsUrl}?${queryParams}`
      )
        .then(function (tileset) {
          //Make sure tileset JSON file was requested with query parameters
          expect(
            Resource._Implementations.loadWithXhr.calls.argsFor(0)[0]
          ).toEqual(expectedUrl);

          Resource._Implementations.loadWithXhr.calls.reset();

          // Set view so that root's content is requested
          viewRootOnly();
          scene.renderForSpecs();

          return tileset.root.contentReadyPromise;
        })
        .then(function () {
          //Make sure tileset2.json was requested with query parameters and does not use parent tilesetVersion
          expectedUrl = getAbsoluteUri(
            `Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset2.json?v=1.2.3&${queryParams}`
          );
          expect(
            Resource._Implementations.loadWithXhr.calls.argsFor(0)[0]
          ).toEqual(expectedUrl);
        });
    });

    it("renders tileset with external tileset JSON file", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(7); // Visits two tiles with tileset content, five tiles with b3dm content
          expect(statistics.numberOfCommands).toEqual(5); // Render the five tiles with b3dm content
        }
      );
    });

    it("always visits external tileset root", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(2); // Visits external tileset tile, and external tileset root
          expect(statistics.numberOfCommands).toEqual(1); // Renders external tileset root
        }
      );
    });

    it("set tile color", function () {
      return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(
        function (tileset) {
          // Get initial color
          let color;
          Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
            color = rgba;
          });

          // Check for color
          tileset.root.color = Color.RED;
          Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
            expect(rgba).not.toEqual(color);
          });
        }
      );
    });

    it("debugFreezeFrame", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        viewRootOnly();
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(1);

        tileset.debugFreezeFrame = true;
        viewAllTiles();
        scene.renderForSpecs();
        expect(statistics.visited).toEqual(0); // selectTiles returns early, so no tiles are visited
        expect(statistics.numberOfCommands).toEqual(1); // root tile is still in selectedTiles list
      });
    });

    function checkDebugColorizeTiles(url) {
      CesiumMath.setRandomNumberSeed(0);
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        // Get initial color
        let color;
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          color = rgba;
        });

        // Check for debug color
        tileset.debugColorizeTiles = true;
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba).not.toEqual(color);
        });

        // Check for original color
        tileset.debugColorizeTiles = false;
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba).toEqual(color);
        });
      });
    }

    it("debugColorizeTiles for b3dm with batch table", function () {
      return checkDebugColorizeTiles(withBatchTableUrl);
    });

    it("debugColorizeTiles for b3dm without batch table", function () {
      return checkDebugColorizeTiles(noBatchIdsUrl);
    });

    it("debugColorizeTiles for i3dm", function () {
      viewInstances();
      return checkDebugColorizeTiles(instancedUrl);
    });

    it("debugColorizeTiles for cmpt", function () {
      return checkDebugColorizeTiles(compositeUrl);
    });

    it("debugColorizeTiles for pnts with batch table", function () {
      viewPointCloud();
      return checkDebugColorizeTiles(pointCloudBatchedUrl);
    });

    it("debugColorizeTiles for pnts without batch table", function () {
      viewPointCloud();
      return checkDebugColorizeTiles(pointCloudUrl);
    });

    it("debugColorizeTiles for glTF", function () {
      viewGltfContent();
      return checkDebugColorizeTiles(gltfContentUrl);
    });

    it("debugColorizeTiles for glb", function () {
      viewGltfContent();
      return checkDebugColorizeTiles(glbContentUrl);
    });

    it("debugWireframe", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, {
        enableDebugWireframe: true,
      }).then(function (tileset) {
        viewRootOnly();
        tileset.debugWireframe = true;
        scene.renderForSpecs();
        let commands = scene.frameState.commandList;
        const length = commands.length;
        let i;
        for (i = 0; i < length; ++i) {
          expect(commands[i].primitiveType).toEqual(PrimitiveType.LINES);
        }

        tileset.debugWireframe = false;
        scene.renderForSpecs();
        commands = scene.frameState.commandList;
        for (i = 0; i < length; ++i) {
          expect(commands[i].primitiveType).toEqual(PrimitiveType.TRIANGLES);
        }
      });
    });

    it("debugShowBoundingVolume", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        viewRootOnly();
        tileset.debugShowBoundingVolume = true;
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(2); // Tile command + bounding volume command

        tileset.debugShowBoundingVolume = false;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(1);
      });
    });

    it("debugShowContentBoundingVolume", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        viewRootOnly();
        tileset.debugShowContentBoundingVolume = true;
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(2); // Tile command + bounding volume command

        tileset.debugShowContentBoundingVolume = false;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(1);
      });
    });

    it("debugShowViewerRequestVolume", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithViewerRequestVolumeUrl
      ).then(function (tileset) {
        tileset.debugShowViewerRequestVolume = true;
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(6); // 1 empty root tile + 4 b3dm tiles + 1 pnts tile
        expect(statistics.numberOfCommands).toEqual(6); // 5 tile commands + viewer request volume command

        tileset.debugShowViewerRequestVolume = false;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(5);
      });
    });

    it("show tile debug labels with regions", function () {
      // tilesetUrl has bounding regions
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.debugShowGeometricError = true;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();
        expect(tileset._tileDebugLabels.length).toEqual(5);

        const root = tileset.root;
        expect(tileset._tileDebugLabels._labels[0].text).toEqual(
          `Geometric error: ${root.geometricError}`
        );
        expect(tileset._tileDebugLabels._labels[1].text).toEqual(
          `Geometric error: ${root.children[0].geometricError}`
        );
        expect(tileset._tileDebugLabels._labels[2].text).toEqual(
          `Geometric error: ${root.children[1].geometricError}`
        );
        expect(tileset._tileDebugLabels._labels[3].text).toEqual(
          `Geometric error: ${root.children[2].geometricError}`
        );
        expect(tileset._tileDebugLabels._labels[4].text).toEqual(
          `Geometric error: ${root.children[3].geometricError}`
        );

        tileset.debugShowGeometricError = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show tile debug labels with boxes", function () {
      // tilesetWithTransformsUrl has bounding boxes
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithTransformsUrl
      ).then(function (tileset) {
        tileset.debugShowGeometricError = true;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();
        expect(tileset._tileDebugLabels.length).toEqual(2);

        const root = tileset.root;
        expect(tileset._tileDebugLabels._labels[0].text).toEqual(
          `Geometric error: ${root.geometricError}`
        );
        expect(tileset._tileDebugLabels._labels[1].text).toEqual(
          `Geometric error: ${root.children[0].geometricError}`
        );

        tileset.debugShowGeometricError = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show tile debug labels with bounding spheres", function () {
      // tilesetWithViewerRequestVolumeUrl has bounding sphere
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithViewerRequestVolumeUrl
      ).then(function (tileset) {
        tileset.debugShowGeometricError = true;
        scene.renderForSpecs();

        const length = tileset._selectedTiles.length;
        expect(tileset._tileDebugLabels).toBeDefined();
        expect(tileset._tileDebugLabels.length).toEqual(length);

        for (let i = 0; i < length; ++i) {
          expect(tileset._tileDebugLabels._labels[i].text).toEqual(
            `Geometric error: ${tileset._selectedTiles[i].geometricError}`
          );
        }

        tileset.debugShowGeometricError = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show tile debug labels with rendering statistics", function () {
      // tilesetUrl has bounding regions
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.debugShowRenderingStatistics = true;
        viewRootOnly();
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();
        expect(tileset._tileDebugLabels.length).toEqual(1);

        const content = tileset.root.content;
        const expected =
          `Commands: ${tileset.root.commandsLength}\n` +
          `Triangles: ${content.trianglesLength}\n` +
          `Features: ${content.featuresLength}`;

        expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

        tileset.debugShowRenderingStatistics = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show tile debug labels with memory usage", function () {
      // tilesetUrl has bounding regions
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.debugShowMemoryUsage = true;
        viewRootOnly();
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();
        expect(tileset._tileDebugLabels.length).toEqual(1);

        const expected = "Texture Memory: 0\n" + "Geometry Memory: 0.007";

        expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

        tileset.debugShowMemoryUsage = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show tile debug labels with all statistics", function () {
      // tilesetUrl has bounding regions
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.debugShowGeometricError = true;
        tileset.debugShowRenderingStatistics = true;
        tileset.debugShowMemoryUsage = true;
        tileset.debugShowUrl = true;
        viewRootOnly();
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();

        const expected =
          "Geometric error: 70\n" +
          "Commands: 1\n" +
          "Triangles: 120\n" +
          "Features: 10\n" +
          "Texture Memory: 0\n" +
          "Geometry Memory: 0.007\n" +
          "Url: parent.b3dm";
        expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

        tileset.debugShowGeometricError = false;
        tileset.debugShowRenderingStatistics = false;
        tileset.debugShowMemoryUsage = false;
        tileset.debugShowUrl = false;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).not.toBeDefined();
      });
    });

    it("show only picked tile debug label with all stats", function () {
      // tilesetUrl has bounding regions
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.debugShowGeometricError = true;
        tileset.debugShowRenderingStatistics = true;
        tileset.debugShowMemoryUsage = true;
        tileset.debugShowUrl = true;
        tileset.debugPickedTileLabelOnly = true;

        const scratchPosition = new Cartesian3(1.0, 1.0, 1.0);
        tileset.debugPickedTile = tileset.root;
        tileset.debugPickPosition = scratchPosition;

        scene.renderForSpecs();
        expect(tileset._tileDebugLabels).toBeDefined();

        const expected =
          "Geometric error: 70\n" +
          "Commands: 1\n" +
          "Triangles: 120\n" +
          "Features: 10\n" +
          "Texture Memory: 0\n" +
          "Geometry Memory: 0.007\n" +
          "Url: parent.b3dm";
        expect(tileset._tileDebugLabels.get(0).text).toEqual(expected);
        expect(tileset._tileDebugLabels.get(0).position).toEqual(
          scratchPosition
        );

        tileset.debugPickedTile = undefined;
        scene.renderForSpecs();
        expect(tileset._tileDebugLabels.length).toEqual(0);
      });
    });

    it("does not request tiles when picking", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        viewRootOnly();
        scene.pickForSpecs();
        expect(tileset._statistics.numberOfPendingRequests).toEqual(0);
        scene.renderForSpecs();
        expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("does not process tiles when picking", function () {
      const spy = spyOn(Cesium3DTile.prototype, "process").and.callThrough();

      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        viewRootOnly();
        scene.renderForSpecs(); // Request root
        expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
        return tileset.root.contentReadyToProcessPromise.then(function () {
          scene.pickForSpecs();
          expect(spy).not.toHaveBeenCalled();
          scene.renderForSpecs();
          expect(spy).toHaveBeenCalled();
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        });
      });
    });

    // https://github.com/CesiumGS/cesium/issues/6482
    xit("does not request tiles when the request scheduler is full", function () {
      viewRootOnly(); // Root tiles are loaded initially
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, {
        skipLevelOfDetail: false,
      }).then(function (tileset) {
        // Try to load 4 children. Only 3 requests will go through, 1 will be attempted.
        const oldMaximumRequestsPerServer =
          RequestScheduler.maximumRequestsPerServer;
        RequestScheduler.maximumRequestsPerServer = 3;

        viewAllTiles();
        scene.renderForSpecs();

        expect(tileset._statistics.numberOfPendingRequests).toEqual(3);
        expect(tileset._statistics.numberOfAttemptedRequests).toEqual(1);

        RequestScheduler.maximumRequestsPerServer = oldMaximumRequestsPerServer;
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("load progress events are raised", function () {
      // [numberOfPendingRequests, numberOfTilesProcessing]
      const results = [
        [1, 0],
        [0, 1],
        [0, 0],
      ];
      const spyUpdate = jasmine.createSpy("listener");

      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.loadProgress.addEventListener(spyUpdate);
        viewRootOnly();
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(spyUpdate.calls.count()).toEqual(3);
            expect(spyUpdate.calls.allArgs()).toEqual(results);
          }
        );
      });
    });

    it("tilesLoaded", function () {
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      expect(tileset.tilesLoaded).toBe(false);
      return tileset.readyPromise.then(function () {
        expect(tileset.tilesLoaded).toBe(false);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(tileset.tilesLoaded).toBe(true);
          }
        );
      });
    });

    it("all tiles loaded event is raised", function () {
      // Called first when only the root is visible and it becomes loaded, and then again when
      // the rest of the tileset is visible and all tiles are loaded.
      const spyUpdate1 = jasmine.createSpy("listener");
      const spyUpdate2 = jasmine.createSpy("listener");
      viewRootOnly();
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      tileset.allTilesLoaded.addEventListener(spyUpdate1);
      tileset.initialTilesLoaded.addEventListener(spyUpdate2);
      return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
        function () {
          viewAllTiles();
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(spyUpdate1.calls.count()).toEqual(2);
              expect(spyUpdate2.calls.count()).toEqual(1);
            }
          );
        }
      );
    });

    it("tile visible event is raised", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const spyUpdate = jasmine.createSpy("listener");
        tileset.tileVisible.addEventListener(spyUpdate);
        scene.renderForSpecs();
        expect(
          tileset.root.visibility(
            scene.frameState,
            CullingVolume.MASK_INDETERMINATE
          )
        ).not.toEqual(CullingVolume.MASK_OUTSIDE);
        expect(spyUpdate.calls.count()).toEqual(1);
        expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("tile load event is raised", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const spyUpdate = jasmine.createSpy("listener");
        tileset.tileLoad.addEventListener(spyUpdate);
        tileset.maximumMemoryUsage = 0;
        viewRootOnly();
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            // Root is loaded
            expect(spyUpdate.calls.count()).toEqual(1);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
            spyUpdate.calls.reset();

            // Unload from cache
            viewNothing();
            scene.renderForSpecs();
            expect(tileset.statistics.numberOfTilesWithContentReady).toEqual(0);

            // Look at root again
            viewRootOnly();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                expect(spyUpdate.calls.count()).toEqual(1);
                expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
              }
            );
          }
        );
      });
    });

    // Throws several unhandled 404 errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("tile failed event is raised", function () {
      viewNothing();
      const spyUpdate = jasmine.createSpy("listener");
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl)
        .then(function (tileset) {
          spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
            function (
              url,
              responseType,
              method,
              data,
              headers,
              deferred,
              overrideMimeType
            ) {
              deferred.reject("404");
            }
          );
          tileset.tileFailed.addEventListener(spyUpdate);
          tileset.maximumMemoryUsage = 0;
          viewRootOnly();
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        })
        .finally(function () {
          expect(spyUpdate.calls.count()).toEqual(1);

          const arg = spyUpdate.calls.argsFor(0)[0];
          expect(arg).toBeDefined();
          expect(arg.url).toContain("parent.b3dm");
          expect(arg.message).toBeDefined();
        });
    });

    it("destroys", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const root = tileset.root;
        expect(tileset.isDestroyed()).toEqual(false);
        scene.primitives.remove(tileset);
        expect(tileset.isDestroyed()).toEqual(true);

        // Check that all tiles are destroyed
        expect(root.isDestroyed()).toEqual(true);
        expect(root.children[0].isDestroyed()).toEqual(true);
        expect(root.children[1].isDestroyed()).toEqual(true);
        expect(root.children[2].isDestroyed()).toEqual(true);
        expect(root.children[3].isDestroyed()).toEqual(true);
      });
    });

    // Throws undefined in handleTileFailure when run with --webgl-stub
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("destroys before external tileset JSON file finishes loading", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          const root = tileset.root;

          viewRootOnly();
          scene.renderForSpecs(); // Request external tileset JSON file

          const statistics = tileset._statistics;
          expect(statistics.numberOfPendingRequests).toEqual(1);
          scene.primitives.remove(tileset);

          return root.contentReadyPromise
            .then(function (root) {
              fail("should not resolve");
            })
            .catch(function (error) {
              // Expect the root to not have added any children from the external tileset JSON file
              expect(root.children.length).toEqual(0);
            });
        }
      );
    });

    // Throws error in release tests
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("destroys before tile finishes loading", function () {
      viewRootOnly();
      options.url = tilesetUrl;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      return tileset.readyPromise.then(function (tileset) {
        const root = tileset.root;
        scene.renderForSpecs(); // Request root
        scene.primitives.remove(tileset);

        return root.contentReadyPromise
          .then(function (content) {
            fail("should not resolve");
          })
          .catch(function (error) {
            expect(root._contentState).toBe(Cesium3DTileContentState.FAILED);
          });
      });
    });

    it("renders with imageBaseLightingFactor", function () {
      const renderOptions = {
        scene: scene,
        time: new JulianDate(2457522.154792),
      };
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            tileset.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
            expect(renderOptions).notToRender(rgba);
          });
        }
      );
    });

    it("renders with lightColor", function () {
      const renderOptions = {
        scene: scene,
        time: new JulianDate(2457522.154792),
      };
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            tileset.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
            expect(renderOptions).toRenderAndCall(function (rgba2) {
              expect(rgba2).not.toEqual(rgba);
              tileset.lightColor = new Cartesian3(5.0, 5.0, 5.0);
              expect(renderOptions).notToRender(rgba2);
            });
          });
        }
      );
    });

    function testBackFaceCulling(url, setViewOptions) {
      const renderOptions = {
        scene: scene,
        time: new JulianDate(2457522.154792),
      };
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        scene.camera.setView(setViewOptions);
        // In the glTF and glb tests, the back-face of the model is black,
        // so the background color is set to a different color to distinguish
        // between the results.
        scene.backgroundColor = new Color(0.0, 0.0, 1.0, 1.0);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 255, 255]);
          tileset.backFaceCulling = false;
          expect(renderOptions).toRenderAndCall(function (rgba2) {
            expect(rgba2).not.toEqual(rgba);
          });
        });
        scene.backgroundColor = new Color(0.0, 0.0, 0.0, 1.0);
      });
    }

    it("renders b3dm tileset when back-face culling is disabled", function () {
      const setViewOptions = {
        destination: new Cartesian3(
          1215012.6853779217,
          -4736313.101374343,
          4081603.4657718465
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179584,
          -0.49999825387267993,
          6.283185307179586
        ),
        endTransform: Matrix4.IDENTITY,
      };

      return testBackFaceCulling(withoutBatchTableUrl, setViewOptions);
    });

    it("renders glTF tileset when back-face culling is disabled", function () {
      const setViewOptions = {
        destination: new Cartesian3(
          1215012.6853779217,
          -4736313.101374343,
          4081603.4657718465
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179584,
          -0.49999825387267993,
          6.283185307179586
        ),
        endTransform: Matrix4.IDENTITY,
      };

      return testBackFaceCulling(gltfContentUrl, setViewOptions);
    });

    it("renders glb tileset when back-face culling is disabled", function () {
      const setViewOptions = {
        destination: new Cartesian3(
          1215012.6853779217,
          -4736313.101374343,
          4081603.4657718465
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179584,
          -0.49999825387267993,
          6.283185307179586
        ),
        endTransform: Matrix4.IDENTITY,
      };

      return testBackFaceCulling(glbContentUrl, setViewOptions);
    });

    it("renders i3dm tileset when back-face culling is disabled", function () {
      const setViewOptions = {
        destination: new Cartesian3(
          1215015.8599828142,
          -4736324.65638894,
          4081609.967056947
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179585,
          -0.5000006393986758,
          6.283185307179586
        ),
        endTransform: Matrix4.IDENTITY,
      };

      return testBackFaceCulling(instancedUrl, setViewOptions);
    });

    ///////////////////////////////////////////////////////////////////////////
    // Styling tests

    it("applies show style to a tileset", function () {
      let tileset, hideStyle;
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl)
        .then(function (t) {
          tileset = t;
          hideStyle = new Cesium3DTileStyle({ show: "false" });
          tileset.style = hideStyle;
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(tileset.style).toBe(hideStyle);
          expect(scene).toRender([0, 0, 0, 255]);
          tileset.style = new Cesium3DTileStyle({ show: "true" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies show style to a tileset without features", function () {
      let tileset;
      let hideStyle;
      return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl)
        .then(function (t) {
          tileset = t;
          hideStyle = new Cesium3DTileStyle({ show: "false" });
          tileset.style = hideStyle;
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(tileset.style).toBe(hideStyle);
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({ show: "true" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies style with complex show expression to a tileset", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          // Each feature in the b3dm file has an id property from 0 to 9
          // ${id} >= 10 will always evaluate to false
          tileset.style = new Cesium3DTileStyle({ show: "${id} >= 50 * 2" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRender([0, 0, 0, 255]);

          // ${id} < 10 will always evaluate to true
          tileset.style = new Cesium3DTileStyle({ show: "${id} < 200 / 2" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies show style to a tileset with a composite tile", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, compositeUrl)
        .then(function (t) {
          tileset = t;
          tileset.style = new Cesium3DTileStyle({ show: "false" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({ show: "true" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies show style to a tileset with glTF content", function () {
      let tileset;
      let hideStyle;
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl)
        .then(function (t) {
          tileset = t;
          viewGltfContent();
          hideStyle = new Cesium3DTileStyle({ show: "false" });
          tileset.style = hideStyle;
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(tileset.style).toBe(hideStyle);
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({ show: "true" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies show style to a tileset with glb content", function () {
      let tileset;
      let hideStyle;
      return Cesium3DTilesTester.loadTileset(scene, glbContentUrl)
        .then(function (t) {
          tileset = t;
          viewGltfContent();
          hideStyle = new Cesium3DTileStyle({ show: "false" });
          tileset.style = hideStyle;
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(tileset.style).toBe(hideStyle);
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({ show: "true" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    function expectColorStyle(tileset) {
      let color;
      expect(scene).toRenderAndCall(function (rgba) {
        color = rgba;
      });

      tileset.style = new Cesium3DTileStyle({ color: 'color("blue")' });
      return tileset.style.readyPromise
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
          });

          // set color to transparent
          tileset.style = new Cesium3DTileStyle({
            color: 'color("blue", 0.0)',
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({ color: 'color("cyan")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
          });

          // Remove style
          tileset.style = undefined;
          expect(scene).toRender(color);
        });
    }

    it("applies color style to a tileset", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          return expectColorStyle(tileset);
        }
      );
    });

    it("applies color style to a tileset with translucent tiles", function () {
      return Cesium3DTilesTester.loadTileset(scene, translucentUrl).then(
        function (tileset) {
          return expectColorStyle(tileset);
        }
      );
    });

    it("applies color style to a tileset with translucent and opaque tiles", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        translucentOpaqueMixUrl
      ).then(function (tileset) {
        return expectColorStyle(tileset);
      });
    });

    it("applies color style to tileset without features", function () {
      return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(
        function (tileset) {
          return expectColorStyle(tileset);
        }
      );
    });

    it("applies color style to tileset with glTF content", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          viewGltfContent();
          return expectColorStyle(tileset);
        }
      );
    });

    it("applies color style to tileset with glb content", function () {
      return Cesium3DTilesTester.loadTileset(scene, glbContentUrl).then(
        function (tileset) {
          viewGltfContent();
          return expectColorStyle(tileset);
        }
      );
    });

    it("applies style when feature properties change", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          // Initially, all feature ids are less than 10
          tileset.style = new Cesium3DTileStyle({ show: "${id} < 10" });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);

          // Change feature ids so the show expression will evaluate to false
          const content = tileset.root.content;
          const length = content.featuresLength;
          let i;
          let feature;
          for (i = 0; i < length; ++i) {
            feature = content.getFeature(i);
            feature.setProperty("id", feature.getProperty("id") + 10);
          }
          expect(scene).toRender([0, 0, 0, 255]);

          // Change ids back
          for (i = 0; i < length; ++i) {
            feature = content.getFeature(i);
            feature.setProperty("id", feature.getProperty("id") - 10);
          }
          expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it("applies style when tile is selected after new style is applied", function () {
      let tileset;
      let feature;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          feature = tileset.root.content.getFeature(0);
          tileset.style = new Cesium3DTileStyle({ color: 'color("red")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(feature.color).toEqual(Color.RED);

          tileset.style = new Cesium3DTileStyle({ color: 'color("blue")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(feature.color).toEqual(Color.BLUE);

          viewNothing();
          tileset.style = new Cesium3DTileStyle({ color: 'color("lime")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(feature.color).toEqual(Color.BLUE); // Hasn't been selected yet

          viewAllTiles();
          scene.renderForSpecs();
          expect(feature.color).toEqual(Color.LIME);

          // Feature's show property is preserved if the style hasn't changed and the feature is newly selected
          feature.show = false;
          scene.renderForSpecs();
          expect(feature.show).toBe(false);
          viewNothing();
          scene.renderForSpecs();
          expect(feature.show).toBe(false);
          viewAllTiles();
          expect(feature.show).toBe(false);
        });
    });

    it("does not reapply style during pick pass", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          tileset.style = new Cesium3DTileStyle({ color: 'color("red")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(
            tileset._statisticsPerPass[Cesium3DTilePass.RENDER]
              .numberOfTilesStyled
          ).toBe(1);
          scene.pickForSpecs();
          expect(
            tileset._statisticsPerPass[Cesium3DTilePass.PICK]
              .numberOfTilesStyled
          ).toBe(0);
        });
    });

    it("applies style with complex color expression to a tileset", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          // Each feature in the b3dm file has an id property from 0 to 9
          // ${id} >= 10 will always evaluate to false
          tileset.style = new Cesium3DTileStyle({
            color: '(${id} >= 50 * 2) ? color("red") : color("blue")',
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
          });

          // ${id} < 10 will always evaluate to true
          tileset.style = new Cesium3DTileStyle({
            color: '(${id} < 50 * 2) ? color("red") : color("blue")',
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
          });
        });
    });

    it("applies conditional color style to a tileset", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          // ${id} < 10 will always evaluate to true
          tileset.style = new Cesium3DTileStyle({
            color: {
              conditions: [
                ["${id} < 10", 'color("red")'],
                ["true", 'color("blue")'],
              ],
            },
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
          });

          // ${id}>= 10 will always evaluate to false
          tileset.style = new Cesium3DTileStyle({
            color: {
              conditions: [
                ["${id} >= 10", 'color("red")'],
                ["true", 'color("blue")'],
              ],
            },
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
          });
        });
    });

    it("handle else case when applying conditional color style to a tileset", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          tileset.style = new Cesium3DTileStyle({
            color: {
              conditions: [["${id} > 0", 'color("black")']],
            },
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(tileset.root.content.getFeature(0).color).toEqual(Color.WHITE);
          expect(tileset.root.content.getFeature(1).color).toEqual(Color.BLACK);
        });
    });

    it("handle else case when applying conditional show to a tileset", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          tileset.style = new Cesium3DTileStyle({
            show: {
              conditions: [["${id} > 0", "true"]],
            },
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(tileset.root.content.getFeature(0).show).toBe(true);
          expect(tileset.root.content.getFeature(1).show).toBe(true);

          tileset.style = new Cesium3DTileStyle({
            show: {
              conditions: [["${id} > 0", "false"]],
            },
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();
          expect(tileset.root.content.getFeature(0).show).toBe(true);
          expect(tileset.root.content.getFeature(1).show).toBe(false);
        });
    });

    it("loads style from uri", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          // ${id} < 10 will always evaluate to true
          tileset.style = new Cesium3DTileStyle(styleUrl);
          return tileset.style.readyPromise
            .then(function (style) {
              expect(scene).toRenderAndCall(function (rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
              });
            })
            .catch(function (error) {
              expect(error).not.toBeDefined();
            });
        }
      );
    });

    it("applies custom style to a tileset", function () {
      const style = new Cesium3DTileStyle();
      style.show = {
        evaluate: function (feature) {
          return this._value;
        },
        _value: false,
      };
      style.color = {
        evaluateColor: function (feature, result) {
          return Color.clone(Color.WHITE, result);
        },
      };

      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          tileset.style = style;
          expect(tileset.style).toBe(style);
          expect(scene).toRender([0, 0, 0, 255]);

          style.show._value = true;
          tileset.makeStyleDirty();
          expect(scene).notToRender([0, 0, 0, 255]);
        }
      );
    });

    it("doesn't re-evaluate style during the next update", function () {
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          tileset.show = false;
          tileset.preloadWhenHidden = true;
          tileset.style = new Cesium3DTileStyle({ color: 'color("red")' });
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();

          const statistics =
            tileset._statisticsPerPass[Cesium3DTilePass.PRELOAD];
          expect(statistics.numberOfTilesStyled).toBe(1);

          scene.renderForSpecs();
          expect(statistics.numberOfTilesStyled).toBe(0);
        });
    });

    it("doesn't re-evaluate style if the style being set is the same as the active style", function () {
      let tileset;
      let style;
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
        .then(function (t) {
          tileset = t;
          style = new Cesium3DTileStyle({ color: 'color("red")' });
          tileset.style = style;
          return tileset.style.readyPromise;
        })
        .then(function () {
          scene.renderForSpecs();

          const statistics =
            tileset._statisticsPerPass[Cesium3DTilePass.RENDER];
          expect(statistics.numberOfTilesStyled).toBe(1);

          tileset.style = style;
          scene.renderForSpecs();
          expect(statistics.numberOfTilesStyled).toBe(0);
        });
    });

    function testColorBlendMode(url) {
      // Check that the feature is red
      let sourceRed;
      let sourceGreen;
      let replaceRed;
      let replaceGreen;
      const renderOptions = {
        scene: scene,
        time: new JulianDate(2457522.154792),
      };
      let tileset;
      return Cesium3DTilesTester.loadTileset(scene, url)
        .then(function (t) {
          tileset = t;
          tileset.luminanceAtZenith = undefined;

          expect(renderOptions).toRenderAndCall(function (rgba) {
            sourceRed = rgba[0];
            sourceGreen = rgba[1];
          });

          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(200);
            expect(rgba[1]).toBeLessThan(25);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Use HIGHLIGHT blending
          tileset.colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT;

          // Style with dark yellow. Expect the red channel to be darker than before.
          tileset.style = new Cesium3DTileStyle({
            color: "rgb(128, 128, 0)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(100);
            expect(rgba[0]).toBeLessThan(sourceRed);
            expect(rgba[1]).toBeLessThan(25);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Style with yellow + alpha. Expect the red channel to be darker than before.
          tileset.style = new Cesium3DTileStyle({
            color: "rgba(255, 255, 0, 0.5)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(100);
            expect(rgba[0]).toBeLessThan(sourceRed);
            expect(rgba[1]).toBeLessThan(25);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Use REPLACE blending
          tileset.colorBlendMode = Cesium3DTileColorBlendMode.REPLACE;

          // Style with dark yellow. Expect the red and green channels to be roughly dark yellow.
          tileset.style = new Cesium3DTileStyle({
            color: "rgb(128, 128, 0)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            replaceRed = rgba[0];
            replaceGreen = rgba[1];
            expect(rgba[0]).toBeGreaterThan(100);
            expect(rgba[0]).toBeLessThan(255);
            expect(rgba[1]).toBeGreaterThan(100);
            expect(rgba[1]).toBeLessThan(255);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Style with yellow + alpha. Expect the red and green channels to be a shade of yellow.
          tileset.style = new Cesium3DTileStyle({
            color: "rgba(255, 255, 0, 0.5)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(100);
            expect(rgba[0]).toBeLessThan(255);
            expect(rgba[1]).toBeGreaterThan(100);
            expect(rgba[1]).toBeLessThan(255);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Use MIX blending
          tileset.colorBlendMode = Cesium3DTileColorBlendMode.MIX;
          tileset.colorBlendAmount = 0.5;

          // Style with dark yellow. Expect color to be a mix of the source and style colors.
          tileset.style = new Cesium3DTileStyle({
            color: "rgb(128, 128, 0)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          let mixRed;
          let mixGreen;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            mixRed = rgba[0];
            mixGreen = rgba[1];
            expect(rgba[0]).toBeGreaterThan(replaceRed);
            expect(rgba[0]).toBeLessThan(sourceRed);
            expect(rgba[1]).toBeGreaterThan(sourceGreen);
            expect(rgba[1]).toBeLessThan(replaceGreen);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Set colorBlendAmount to 0.25. Expect color to be closer to the source color.
          tileset.colorBlendAmount = 0.25;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(mixRed);
            expect(rgba[0]).toBeLessThan(sourceRed);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[1]).toBeLessThan(mixGreen);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Set colorBlendAmount to 0.0. Expect color to equal the source color
          tileset.colorBlendAmount = 0.0;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(sourceRed);
            expect(rgba[1]).toBeLessThan(25);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Set colorBlendAmount to 1.0. Expect color to equal the style color
          tileset.colorBlendAmount = 1.0;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(replaceRed);
            expect(rgba[1]).toEqual(replaceGreen);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });

          // Style with yellow + alpha. Expect color to be a mix of the source and style colors.
          tileset.colorBlendAmount = 0.5;
          tileset.style = new Cesium3DTileStyle({
            color: "rgba(255, 255, 0, 0.5)",
          });
          return tileset.style.readyPromise;
        })
        .then(function () {
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toBeLessThan(25);
            expect(rgba[3]).toEqual(255);
          });
        });
    }

    it("sets colorBlendMode", function () {
      return testColorBlendMode(colorsUrl);
    });

    it("sets colorBlendMode when vertex texture fetch is not supported", function () {
      // Disable VTF
      const maximumVertexTextureImageUnits =
        ContextLimits.maximumVertexTextureImageUnits;
      ContextLimits._maximumVertexTextureImageUnits = 0;
      return testColorBlendMode(colorsUrl).then(function () {
        // Re-enable VTF
        ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;
      });
    });

    it("sets colorBlendMode for textured tileset", function () {
      return testColorBlendMode(texturedUrl);
    });

    it("sets colorBlendMode for instanced tileset", function () {
      viewInstances();
      return testColorBlendMode(instancedRedMaterialUrl);
    });

    it("sets colorBlendMode for vertex color tileset", function () {
      return testColorBlendMode(batchedVertexColorsUrl);
    });

    ///////////////////////////////////////////////////////////////////////////
    // Cache replacement tests

    it("Unload all cached tiles not required to meet SSE using maximumMemoryUsage", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.maximumMemoryUsage = 0;

        // Render parent and four children (using additive refinement)
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(5);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
        expect(tileset.totalMemoryUsageInBytes).toEqual(37200); // Specific to this tileset

        // Zoom out so only root tile is needed to meet SSE.  This unloads
        // the four children since the maximum memory usage is zero.
        viewRootOnly();
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfTilesWithContentReady).toEqual(1);
        expect(tileset.totalMemoryUsageInBytes).toEqual(7440); // Specific to this tileset

        // Zoom back in so all four children are re-requested.
        viewAllTiles();

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
            expect(tileset.totalMemoryUsageInBytes).toEqual(37200); // Specific to this tileset
          }
        );
      });
    });

    it("Unload some cached tiles not required to meet SSE using maximumMemoryUsage", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.maximumMemoryUsage = 0.025; // Just enough memory to allow 3 tiles to remain
        // Render parent and four children (using additive refinement)
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(5);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

        // Zoom out so only root tile is needed to meet SSE.  This unloads
        // two of the four children so three tiles are still loaded (the
        // root and two children) since the maximum memory usage is sufficient.
        viewRootOnly();
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfTilesWithContentReady).toEqual(3);

        // Zoom back in so the two children are re-requested.
        viewAllTiles();

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
          }
        );
      });
    });

    it("Unloads cached tiles outside of the view frustum using maximumMemoryUsage", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.maximumMemoryUsage = 0;

        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(5);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5);

        viewSky();

        // All tiles are unloaded
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toEqual(0);
        expect(statistics.numberOfTilesWithContentReady).toEqual(0);

        // Reset camera so all tiles are reloaded
        viewAllTiles();

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);
          }
        );
      });
    });

    it("Unloads cached tiles in a tileset with external tileset JSON file using maximumMemoryUsage", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          const statistics = tileset._statistics;
          const cacheList = tileset._cache._list;

          tileset.maximumMemoryUsage = 0.02;

          scene.renderForSpecs();
          expect(statistics.numberOfCommands).toEqual(5);
          expect(statistics.numberOfTilesWithContentReady).toEqual(5);
          expect(cacheList.length - 1).toEqual(5); // Only tiles with content are on the replacement list. -1 for sentinel.

          // Zoom out so only root tile is needed to meet SSE.  This unloads
          // all tiles except the root and one of the b3dm children
          viewRootOnly();
          scene.renderForSpecs();

          expect(statistics.numberOfCommands).toEqual(1);
          expect(statistics.numberOfTilesWithContentReady).toEqual(2);
          expect(cacheList.length - 1).toEqual(2);

          // Reset camera so all tiles are reloaded
          viewAllTiles();

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(statistics.numberOfCommands).toEqual(5);
              expect(statistics.numberOfTilesWithContentReady).toEqual(5);

              expect(cacheList.length - 1).toEqual(5);
            }
          );
        }
      );
    });

    it("Unloads cached tiles in a tileset with empty tiles using maximumMemoryUsage", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(
        function (tileset) {
          const statistics = tileset._statistics;

          tileset.maximumMemoryUsage = 0.02;

          scene.renderForSpecs();
          expect(statistics.numberOfCommands).toEqual(4);
          expect(statistics.numberOfTilesWithContentReady).toEqual(4); // 4 children with b3dm content (does not include empty root)

          viewSky();

          // Unload tiles to meet cache size
          scene.renderForSpecs();
          expect(statistics.numberOfCommands).toEqual(0);
          expect(statistics.numberOfTilesWithContentReady).toEqual(2); // 2 children with b3dm content (does not include empty root)

          // Reset camera so all tiles are reloaded
          viewAllTiles();

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(statistics.numberOfCommands).toEqual(4);
              expect(statistics.numberOfTilesWithContentReady).toEqual(4);
            }
          );
        }
      );
    });

    it("Unload cached tiles when a tileset uses replacement refinement using maximumMemoryUsage", function () {
      // No children have content, but all grandchildren have content
      //
      //          C
      //      E       E
      //    C   C   C   C
      //
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement1Url
      ).then(function (tileset) {
        tileset.maximumMemoryUsage = 0; // Only root needs to be visible

        // Render parent and four children (using additive refinement)
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(4); // 4 grandchildren. Root is replaced.
        expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Root + four grandchildren (does not include empty children)

        // Zoom out so only root tile is needed to meet SSE.  This unloads
        // all grandchildren since the max number of loaded tiles is one.
        viewRootOnly();
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfTilesWithContentReady).toEqual(1);

        // Zoom back in so the four children are re-requested.
        viewAllTiles();

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function () {
            expect(statistics.numberOfCommands).toEqual(4);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);
          }
        );
      });
    });

    it("Explicitly unloads cached tiles with trimLoadedTiles", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.maximumMemoryUsage = 0.05;

        // Render parent and four children (using additive refinement)
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(5);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

        // Zoom out so only root tile is needed to meet SSE.  The children
        // are not unloaded since max number of loaded tiles is five.
        viewRootOnly();
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5);

        tileset.trimLoadedTiles();
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(1);
        expect(statistics.numberOfTilesWithContentReady).toEqual(1);
      });
    });

    it("tileUnload event is raised", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        tileset.maximumMemoryUsage = 0;

        // Render parent and four children (using additive refinement)
        viewAllTiles();
        scene.renderForSpecs();

        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(5);
        expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

        // Zoom out so only root tile is needed to meet SSE.  All the
        // children are unloaded since max number of loaded tiles is one.
        viewRootOnly();
        const spyUpdate = jasmine.createSpy("listener");
        tileset.tileUnload.addEventListener(spyUpdate);
        scene.renderForSpecs();

        expect(
          tileset.root.visibility(
            scene.frameState,
            CullingVolume.MASK_INDETERMINATE
          )
        ).not.toEqual(CullingVolume.MASK_OUTSIDE);
        expect(spyUpdate.calls.count()).toEqual(4);
        expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root.children[0]);
        expect(spyUpdate.calls.argsFor(1)[0]).toBe(tileset.root.children[1]);
        expect(spyUpdate.calls.argsFor(2)[0]).toBe(tileset.root.children[2]);
        expect(spyUpdate.calls.argsFor(3)[0]).toBe(tileset.root.children[3]);
      });
    });

    it("maximumMemoryUsage throws when negative", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        tileset.maximumMemoryUsage = -1;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    it("maximumScreenSpaceError throws when negative", function () {
      const tileset = new Cesium3DTileset({
        url: tilesetUrl,
      });
      expect(function () {
        tileset.maximumScreenSpaceError = -1;
      }).toThrowDeveloperError();
      return tileset.readyPromise;
    });

    it("propagates tile transform down the tree", function () {
      const b3dmCommands = 1;
      // when instancing is supported, there is a single draw command,
      // else each instance is a separate command.
      const i3dmCommands = scene.context.instancedArrays ? 1 : 25;
      const totalCommands = b3dmCommands + i3dmCommands;
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithTransformsUrl
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        const root = tileset.root;
        const rootTransform = Matrix4.unpack(root._header.transform);

        const child = root.children[0];
        const childTransform = Matrix4.unpack(child._header.transform);
        let computedTransform = Matrix4.multiply(
          rootTransform,
          childTransform,
          new Matrix4()
        );

        expect(statistics.numberOfCommands).toBe(totalCommands);
        expect(root.computedTransform).toEqual(rootTransform);
        expect(child.computedTransform).toEqual(computedTransform);

        // Set the tileset's modelMatrix
        const tilesetTransform = Matrix4.fromTranslation(
          new Cartesian3(0.0, 1.0, 0.0)
        );
        tileset.modelMatrix = tilesetTransform;
        computedTransform = Matrix4.multiply(
          tilesetTransform,
          computedTransform,
          computedTransform
        );
        scene.renderForSpecs();
        expect(child.computedTransform).toEqual(computedTransform);

        // Set the modelMatrix somewhere off screen
        tileset.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(0.0, 100000.0, 0.0)
        );
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toBe(0);

        // Now bring it back
        tileset.modelMatrix = Matrix4.IDENTITY;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toBe(totalCommands);

        // Do the same steps for a tile transform
        child.transform = Matrix4.fromTranslation(
          new Cartesian3(0.0, 100000.0, 0.0)
        );
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toBe(1);
        child.transform = Matrix4.IDENTITY;
        scene.renderForSpecs();
        expect(statistics.numberOfCommands).toBe(totalCommands);
      });
    });

    const skipLevelOfDetailOptions = {
      skipLevelOfDetail: true,
    };

    it("does not mark tileset as refining when tiles have selection depth 0", function () {
      viewRootOnly();
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetUrl,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        viewAllTiles();
        scene.renderForSpecs();
        const statistics = tileset._statistics;
        expect(statistics.numberOfTilesWithContentReady).toEqual(1);
        expect(tileset._selectedTiles[0]._selectionDepth).toEqual(0);
        expect(tileset._hasMixedContent).toBe(false);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function (tileset) {
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);
            expect(tileset._hasMixedContent).toBe(false);
          }
        );
      });
    });

    it("marks tileset as mixed when tiles have nonzero selection depth", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        const statistics = tileset._statistics;

        tileset.root.children[0].children[0].children[0].unloadContent();
        tileset.root.children[0].children[0].children[1].unloadContent();
        tileset.root.children[0].children[0].children[2].unloadContent();
        statistics.numberOfTilesWithContentReady -= 3;

        scene.renderForSpecs();

        expect(tileset._hasMixedContent).toBe(true);
        expect(statistics.numberOfTilesWithContentReady).toEqual(2);
        expect(
          tileset.root.children[0].children[0].children[3]._selectionDepth
        ).toEqual(1);
        expect(tileset.root._selectionDepth).toEqual(0);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function (tileset) {
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);
            expect(tileset._hasMixedContent).toBe(false);
          }
        );
      });
    });

    it("adds stencil clear command first when unresolved", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        tileset.root.children[0].children[0].children[0].unloadContent();
        tileset.root.children[0].children[0].children[1].unloadContent();
        tileset.root.children[0].children[0].children[2].unloadContent();

        scene.renderForSpecs();
        const commandList = scene.frameState.commandList;
        expect(commandList[0]).toBeInstanceOf(ClearCommand);
        expect(commandList[0].stencil).toBe(0);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("creates duplicate backface commands", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        const root = tileset.root;

        tileset.root.children[0].children[0].children[0].unloadContent();
        tileset.root.children[0].children[0].children[1].unloadContent();
        tileset.root.children[0].children[0].children[2].unloadContent();

        scene.renderForSpecs();

        // 2 for root tile, 1 for child, 1 for stencil clear
        // Tiles that are marked as finalResolution, including leaves, do not create back face commands
        expect(statistics.numberOfCommands).toEqual(4);
        expect(isSelected(tileset, root)).toBe(true);
        expect(root._finalResolution).toBe(false);
        expect(
          isSelected(tileset, root.children[0].children[0].children[3])
        ).toBe(true);
        expect(root.children[0].children[0].children[3]._finalResolution).toBe(
          true
        );
        expect(tileset._hasMixedContent).toBe(true);

        const commandList = scene.frameState.commandList;
        const rs = commandList[1].renderState;
        expect(rs.cull.enabled).toBe(true);
        expect(rs.cull.face).toBe(CullFace.FRONT);
        expect(rs.polygonOffset.enabled).toBe(true);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("does not create duplicate backface commands if no selected descendants", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        const root = tileset.root;

        tileset.root.children[0].children[0].children[0].unloadContent();
        tileset.root.children[0].children[0].children[1].unloadContent();
        tileset.root.children[0].children[0].children[2].unloadContent();
        tileset.root.children[0].children[0].children[3].unloadContent();

        scene.renderForSpecs();

        // 2 for root tile, 1 for child, 1 for stencil clear
        expect(statistics.numberOfCommands).toEqual(1);
        expect(isSelected(tileset, root)).toBe(true);
        expect(root._finalResolution).toBe(true);
        expect(
          isSelected(tileset, root.children[0].children[0].children[0])
        ).toBe(false);
        expect(
          isSelected(tileset, root.children[0].children[0].children[1])
        ).toBe(false);
        expect(
          isSelected(tileset, root.children[0].children[0].children[2])
        ).toBe(false);
        expect(
          isSelected(tileset, root.children[0].children[0].children[3])
        ).toBe(false);
        expect(tileset._hasMixedContent).toBe(false);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("does not add commands or stencil clear command with no selected tiles", function () {
      options.url = tilesetUrl;
      options.skipLevelOfDetail = true;
      const tileset = scene.primitives.add(new Cesium3DTileset(options));
      scene.renderForSpecs();
      const statistics = tileset._statistics;
      expect(tileset._selectedTiles.length).toEqual(0);
      expect(statistics.numberOfCommands).toEqual(0);
      return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
    });

    it("does not add stencil clear command or backface commands when fully resolved", function () {
      viewAllTiles();
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetReplacement3Url,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        expect(statistics.numberOfCommands).toEqual(
          tileset._selectedTiles.length
        );

        const commandList = scene.frameState.commandList;
        const length = commandList.length;
        for (let i = 0; i < length; ++i) {
          const command = commandList[i];
          expect(command).not.toBeInstanceOf(ClearCommand);
          expect(command.renderState.cull.face).not.toBe(CullFace.FRONT);
        }
      });
    });

    it("loadSiblings", function () {
      viewBottomLeft();
      return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url, {
        skipLevelOfDetail: true,
        loadSiblings: false,
        foveatedTimeDelay: 0,
      }).then(function (tileset) {
        const statistics = tileset._statistics;
        expect(statistics.numberOfTilesWithContentReady).toBe(2);
        tileset.loadSiblings = true;
        scene.renderForSpecs();
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function (tileset) {
            expect(statistics.numberOfTilesWithContentReady).toBe(5);
          }
        );
      });
    });

    it("immediatelyLoadDesiredLevelOfDetail", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, {
        skipLevelOfDetail: true,
        immediatelyLoadDesiredLevelOfDetail: true,
      }).then(function (tileset) {
        const root = tileset.root;
        const child = findTileByUri(root.children, "ll.b3dm");
        tileset.root.refine = Cesium3DTileRefine.REPLACE;
        tileset._allTilesAdditive = false;
        viewBottomLeft();
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
          function (tileset) {
            expect(isSelected(tileset, child));
            expect(!isSelected(tileset, root));
            expect(root.contentUnloaded).toBe(true);
            // Renders child while parent loads
            viewRootOnly();
            scene.renderForSpecs();
            expect(isSelected(tileset, child));
            expect(!isSelected(tileset, root));
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function (tileset) {
                expect(!isSelected(tileset, child));
                expect(isSelected(tileset, root));
              }
            );
          }
        );
      });
    });

    it("selects children if no ancestors available", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetOfTilesetsUrl,
        skipLevelOfDetailOptions
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        const parent = tileset.root.children[0];
        const child = parent.children[3].children[0];
        parent.refine = Cesium3DTileRefine.REPLACE;
        parent.unloadContent();

        viewBottomLeft();
        scene.renderForSpecs();

        expect(child.contentReady).toBe(true);
        expect(parent.contentReady).toBe(false);
        expect(isSelected(tileset, child)).toBe(true);
        expect(isSelected(tileset, parent)).toBe(false);
        expect(statistics.numberOfCommands).toEqual(1);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      });
    });

    it("tile expires", function () {
      return Cesium3DTilesTester.loadTileset(scene, batchedExpirationUrl).then(
        function (tileset) {
          // Intercept the request and load content that produces more draw commands, to simulate fetching new content after the original expires
          spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
            function (
              url,
              responseType,
              method,
              data,
              headers,
              deferred,
              overrideMimeType
            ) {
              Resource._DefaultImplementations.loadWithXhr(
                batchedColorsB3dmUrl,
                responseType,
                method,
                data,
                headers,
                deferred,
                overrideMimeType
              );
            }
          );
          const tile = tileset.root;
          const statistics = tileset._statistics;
          tileset.style = new Cesium3DTileStyle({
            color: 'color("red")',
          });

          // Check that expireDuration and expireDate are correctly set
          const expireDate = JulianDate.addSeconds(
            JulianDate.now(),
            5.0,
            new JulianDate()
          );
          expect(
            JulianDate.secondsDifference(tile.expireDate, expireDate)
          ).toEqualEpsilon(0.0, CesiumMath.EPSILON1);
          expect(tile.expireDuration).toBe(5.0);
          expect(tile.contentExpired).toBe(false);
          expect(tile.contentReady).toBe(true);
          expect(tile.contentAvailable).toBe(true);
          expect(tile._expiredContent).toBeUndefined();

          // Check statistics
          expect(statistics.numberOfCommands).toBe(1);
          expect(statistics.numberOfTilesTotal).toBe(1);

          // Trigger expiration to happen next frame
          tile.expireDate = JulianDate.addSeconds(
            JulianDate.now(),
            -1.0,
            new JulianDate()
          );

          // Stays in the expired state until the request goes through
          const originalMaximumRequests = RequestScheduler.maximumRequests;
          RequestScheduler.maximumRequests = 0; // Artificially limit Request Scheduler so the request won't go through
          scene.renderForSpecs();
          RequestScheduler.maximumRequests = originalMaximumRequests;
          const expiredContent = tile._expiredContent;
          expect(tile.contentExpired).toBe(true);
          expect(tile.contentAvailable).toBe(true); // Expired content now exists
          expect(expiredContent).toBeDefined();

          // Expired content renders while new content loads in
          expect(statistics.numberOfCommands).toBe(1);
          expect(statistics.numberOfTilesTotal).toBe(1);

          // Request goes through, now in the LOADING state
          scene.renderForSpecs();
          expect(tile.contentExpired).toBe(false);
          expect(tile.contentReady).toBe(false);
          expect(tile.contentAvailable).toBe(true);
          expect(tile._contentState).toBe(Cesium3DTileContentState.LOADING);
          expect(tile._expiredContent).toBeDefined(); // Still holds onto expired content until the content state is READY

          // Check that url contains a query param with the timestamp
          const url = Resource._Implementations.loadWithXhr.calls.first()
            .args[0];
          expect(url.indexOf("expired=") >= 0).toBe(true);

          // statistics are still the same
          expect(statistics.numberOfCommands).toBe(1);
          expect(statistics.numberOfTilesTotal).toBe(1);

          return pollToPromise(function () {
            expect(statistics.numberOfCommands).toBe(1); // Still renders expired content
            scene.renderForSpecs();
            return tile.contentReady;
          }).then(function () {
            scene.renderForSpecs();

            // Expired content is destroyed
            expect(tile._expiredContent).toBeUndefined();
            expect(expiredContent.isDestroyed()).toBe(true);

            // statistics for new content
            expect(statistics.numberOfCommands).toBe(10);
            expect(statistics.numberOfTilesTotal).toBe(1);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
          });
        }
      );
    });

    function modifySubtreeBuffer(arrayBuffer) {
      const uint8Array = new Uint8Array(arrayBuffer);
      const json = getJsonFromTypedArray(uint8Array);
      json.root.children.splice(0, 1);

      return generateJsonBuffer(json).buffer;
    }

    it("tile with tileset content expires", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetSubtreeExpirationUrl
      ).then(function (tileset) {
        // Intercept the request and load a subtree with one less child. Still want to make an actual request to simulate
        // real use cases instead of immediately returning a pre-created array buffer.
        spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          const newDeferred = defer();
          Resource._DefaultImplementations.loadWithXhr(
            tilesetSubtreeUrl,
            responseType,
            method,
            data,
            headers,
            newDeferred,
            overrideMimeType
          );
          newDeferred.promise.then(function (arrayBuffer) {
            deferred.resolve(modifySubtreeBuffer(arrayBuffer));
          });
        });

        const subtreeRoot = tileset.root.children[0];
        const subtreeChildren = subtreeRoot.children[0].children;
        const childrenLength = subtreeChildren.length;
        const statistics = tileset._statistics;

        // Check statistics
        expect(statistics.numberOfCommands).toBe(5);
        expect(statistics.numberOfTilesTotal).toBe(7);
        expect(statistics.numberOfTilesWithContentReady).toBe(5);

        // Trigger expiration to happen next frame
        subtreeRoot.expireDate = JulianDate.addSeconds(
          JulianDate.now(),
          -1.0,
          new JulianDate()
        );

        // Listen to tile unload events
        const spyUpdate = jasmine.createSpy("listener");
        tileset.tileUnload.addEventListener(spyUpdate);

        // Tiles in the subtree are removed from the cache and destroyed.
        scene.renderForSpecs(); // Becomes expired
        scene.renderForSpecs(); // Makes request
        expect(subtreeRoot.children).toEqual([]);
        for (let i = 0; i < childrenLength; ++i) {
          expect(subtreeChildren[0].isDestroyed()).toBe(true);
        }
        expect(spyUpdate.calls.count()).toEqual(4);

        // Remove the spy so new tiles load in normally
        Resource._Implementations.loadWithXhr =
          Resource._DefaultImplementations.loadWithXhr;

        // Wait for the new tileset content to come in with one less leaf
        return pollToPromise(function () {
          scene.renderForSpecs();
          return subtreeRoot.contentReady && tileset.tilesLoaded;
        }).then(function () {
          scene.renderForSpecs();
          expect(statistics.numberOfCommands).toBe(4);
          expect(statistics.numberOfTilesTotal).toBe(6);
          expect(statistics.numberOfTilesWithContentReady).toBe(4);
        });
      });
    });

    // Throws several unhandled 404 errors
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("tile expires and request fails", function () {
      return Cesium3DTilesTester.loadTileset(scene, batchedExpirationUrl).then(
        function (tileset) {
          spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
            function (
              url,
              responseType,
              method,
              data,
              headers,
              deferred,
              overrideMimeType
            ) {
              deferred.reject(new Error());
            }
          );
          const tile = tileset.root;
          const statistics = tileset._statistics;

          // Trigger expiration to happen next frame
          tile.expireDate = JulianDate.addSeconds(
            JulianDate.now(),
            -1.0,
            new JulianDate()
          );

          // After update the tile is expired
          scene.renderForSpecs();

          // Make request (it will fail)
          scene.renderForSpecs();

          return tile.contentReadyPromise
            .then(function () {
              fail();
            })
            .catch(function () {
              // Render scene
              scene.renderForSpecs();

              expect(tile._contentState).toBe(Cesium3DTileContentState.FAILED);
              expect(statistics.numberOfCommands).toBe(0);
              expect(statistics.numberOfTilesTotal).toBe(1);
            });
        }
      );
    });

    it("tile expiration date", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const tile = tileset.root;

        // Trigger expiration to happen next frame
        tile.expireDate = JulianDate.addSeconds(
          JulianDate.now(),
          -1.0,
          new JulianDate()
        );

        // Stays in the expired state until the request goes through
        const originalMaxmimumRequests = RequestScheduler.maximumRequests;
        RequestScheduler.maximumRequests = 0; // Artificially limit Request Scheduler so the request won't go through
        scene.renderForSpecs();
        RequestScheduler.maximumRequests = originalMaxmimumRequests;

        expect(tile.contentExpired).toBe(true);

        return pollToPromise(function () {
          scene.renderForSpecs();
          return tile.contentReady;
        }).then(function () {
          scene.renderForSpecs();
          expect(tile._expiredContent).toBeUndefined();
          expect(tile.expireDate).toBeUndefined();
        });
      });
    });

    it("supports content data URIs", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetUrlWithContentUri
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        expect(statistics.visited).toEqual(1);
        expect(statistics.numberOfCommands).toEqual(1);
      });
    });

    it("destroys attached ClippingPlaneCollections and ClippingPlaneCollections that have been detached", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const clippingPlaneCollection1 = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0)],
        });
        expect(clippingPlaneCollection1.owner).not.toBeDefined();

        tileset.clippingPlanes = clippingPlaneCollection1;
        const clippingPlaneCollection2 = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0)],
        });

        tileset.clippingPlanes = clippingPlaneCollection2;
        expect(clippingPlaneCollection1.isDestroyed()).toBe(true);

        scene.primitives.remove(tileset);
        expect(clippingPlaneCollection2.isDestroyed()).toBe(true);
      });
    });

    it("throws a DeveloperError when given a ClippingPlaneCollection attached to another Tileset", function () {
      let clippingPlanes;
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl)
        .then(function (tileset1) {
          clippingPlanes = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset1.clippingPlanes = clippingPlanes;

          return Cesium3DTilesTester.loadTileset(scene, tilesetUrl);
        })
        .then(function (tileset2) {
          expect(function () {
            tileset2.clippingPlanes = clippingPlanes;
          }).toThrowDeveloperError();
        });
    });

    it("clipping planes cull hidden tiles", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        let visibility = tileset.root.visibility(
          scene.frameState,
          CullingVolume.MASK_INSIDE
        );

        expect(visibility).not.toBe(CullingVolume.MASK_OUTSIDE);

        const plane = new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });

        visibility = tileset.root.visibility(
          scene.frameState,
          CullingVolume.MASK_INSIDE
        );

        expect(visibility).toBe(CullingVolume.MASK_OUTSIDE);

        plane.distance = 0.0;
        visibility = tileset.root.visibility(
          scene.frameState,
          CullingVolume.MASK_INSIDE
        );

        expect(visibility).not.toBe(CullingVolume.MASK_OUTSIDE);
      });
    });

    it("clipping planes cull hidden content", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        let visibility = tileset.root.contentVisibility(scene.frameState);

        expect(visibility).not.toBe(Intersect.OUTSIDE);

        const plane = new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });

        visibility = tileset.root.contentVisibility(scene.frameState);

        expect(visibility).toBe(Intersect.OUTSIDE);

        plane.distance = 0.0;
        visibility = tileset.root.contentVisibility(scene.frameState);

        expect(visibility).not.toBe(Intersect.OUTSIDE);
      });
    });

    it("clipping planes cull tiles completely inside clipping region", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        const statistics = tileset._statistics;
        const root = tileset.root;

        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(5);

        tileset.update(scene.frameState);

        const radius = 287.0736139905632;

        const plane = new ClippingPlane(Cartesian3.UNIT_X, radius);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(5);
        expect(root._isClipped).toBe(false);

        plane.distance = -1;

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(3);
        expect(root._isClipped).toBe(true);

        plane.distance = -radius;

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(0);
        expect(root._isClipped).toBe(true);
      });
    });

    it("clipping planes cull tiles completely inside clipping region for i3dm", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithExternalResourcesUrl
      ).then(function (tileset) {
        const statistics = tileset._statistics;
        const root = tileset.root;

        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(6);

        tileset.update(scene.frameState);

        const radius = 142.19001637409772;

        const plane = new ClippingPlane(Cartesian3.UNIT_Z, radius);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(6);
        expect(root._isClipped).toBe(false);

        plane.distance = 0;

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(6);
        expect(root._isClipped).toBe(true);

        plane.distance = -radius;

        tileset.update(scene.frameState);
        scene.renderForSpecs();

        expect(statistics.numberOfCommands).toEqual(0);
        expect(root._isClipped).toBe(true);
      });
    });

    it("clippingPlanesOriginMatrix has correct orientation", function () {
      return Cesium3DTilesTester.loadTileset(scene, withTransformBoxUrl).then(
        function (tileset) {
          // The bounding volume of this tileset puts it under the surface, so no
          // east-north-up should be applied. Check that it matches the orientation
          // of the original transform.
          let offsetMatrix = tileset.clippingPlanesOriginMatrix;

          expect(
            Matrix4.equals(offsetMatrix, tileset.root.computedTransform)
          ).toBe(true);

          return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(
            function (tileset) {
              // The bounding volume of this tileset puts it on the surface,
              //  so we want to apply east-north-up as our best guess.
              offsetMatrix = tileset.clippingPlanesOriginMatrix;
              // The clipping plane matrix is not the same as the original because we applied east-north-up.
              expect(
                Matrix4.equals(offsetMatrix, tileset.root.computedTransform)
              ).toBe(false);

              // But they have the same translation.
              const clippingPlanesOrigin = Matrix4.getTranslation(
                offsetMatrix,
                new Cartesian3()
              );
              expect(
                Cartesian3.equals(
                  tileset.root.boundingSphere.center,
                  clippingPlanesOrigin
                )
              ).toBe(true);
            }
          );
        }
      );
    });

    it("clippingPlanesOriginMatrix matches root tile bounding sphere", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(
        function (tileset) {
          let offsetMatrix = Matrix4.clone(
            tileset.clippingPlanesOriginMatrix,
            new Matrix4()
          );
          let boundingSphereEastNorthUp = Transforms.eastNorthUpToFixedFrame(
            tileset.root.boundingSphere.center
          );
          expect(Matrix4.equals(offsetMatrix, boundingSphereEastNorthUp)).toBe(
            true
          );

          // Changing the model matrix should change the clipping planes matrix
          tileset.modelMatrix = Matrix4.fromTranslation(
            new Cartesian3(100, 0, 0)
          );
          scene.renderForSpecs();
          expect(
            Matrix4.equals(offsetMatrix, tileset.clippingPlanesOriginMatrix)
          ).toBe(false);

          boundingSphereEastNorthUp = Transforms.eastNorthUpToFixedFrame(
            tileset.root.boundingSphere.center
          );
          offsetMatrix = tileset.clippingPlanesOriginMatrix;
          expect(offsetMatrix).toEqualEpsilon(
            boundingSphereEastNorthUp,
            CesiumMath.EPSILON3
          );
        }
      );
    });

    it("throws if pointCloudShading is set to undefined", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function (
        tileset
      ) {
        expect(function () {
          tileset.pointCloudShading = undefined;
        }).toThrowDeveloperError();
      });
    });

    describe("updateForPass", function () {
      it("updates for pass", function () {
        viewAllTiles();
        const passCamera = Camera.clone(scene.camera);
        const passCullingVolume = passCamera.frustum.computeCullingVolume(
          passCamera.positionWC,
          passCamera.directionWC,
          passCamera.upWC
        );
        viewNothing(); // Main camera views nothing, pass camera views all tiles

        const preloadFlightPassState = new Cesium3DTilePassState({
          pass: Cesium3DTilePass.PRELOAD_FLIGHT,
          camera: passCamera,
          cullingVolume: passCullingVolume,
        });

        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(
          function (tileset) {
            expect(tileset.statistics.selected).toBe(0);
            tileset.updateForPass(scene.frameState, preloadFlightPassState);
            expect(tileset._requestedTiles.length).toBe(5);
          }
        );
      });

      it("uses custom command list", function () {
        const passCommandList = [];

        const renderPassState = new Cesium3DTilePassState({
          pass: Cesium3DTilePass.RENDER,
          commandList: passCommandList,
        });

        viewAllTiles();

        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(
          function (tileset) {
            tileset.updateForPass(scene.frameState, renderPassState);
            expect(passCommandList.length).toBe(5);
          }
        );
      });

      it("throws if frameState is undefined", function () {
        const tileset = new Cesium3DTileset({
          url: tilesetUrl,
        });

        expect(function () {
          tileset.updateForPass();
        }).toThrowDeveloperError();

        return tileset.readyPromise;
      });

      it("throws if tilesetPassState is undefined", function () {
        const tileset = new Cesium3DTileset({
          url: tilesetUrl,
        });

        expect(function () {
          tileset.updateForPass(scene.frameState);
        }).toThrowDeveloperError();

        return tileset.readyPromise;
      });
    });

    function sampleHeightMostDetailed(cartographics, objectsToExclude) {
      let result;
      let completed = false;
      scene
        .sampleHeightMostDetailed(cartographics, objectsToExclude)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    function drillPickFromRayMostDetailed(ray, limit, objectsToExclude) {
      let result;
      let completed = false;
      scene
        .drillPickFromRayMostDetailed(ray, limit, objectsToExclude)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    describe("most detailed height queries", function () {
      it("tileset is offscreen", function () {
        if (webglStub) {
          return;
        }

        viewNothing();

        // Tileset uses replacement refinement so only one tile should be loaded and selected during most detailed picking
        const centerCartographic = new Cartographic(
          -1.3196799798348215,
          0.6988740001506679,
          2.4683731133709323
        );
        const cartographics = [centerCartographic];

        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            return sampleHeightMostDetailed(cartographics).then(function () {
              expect(centerCartographic.height).toEqualEpsilon(
                2.47,
                CesiumMath.EPSILON1
              );
              const statisticsMostDetailedPick =
                tileset._statisticsPerPass[Cesium3DTilePass.MOST_DETAILED_PICK];
              const statisticsRender =
                tileset._statisticsPerPass[Cesium3DTilePass.RENDER];
              expect(statisticsMostDetailedPick.numberOfCommands).toBe(1);
              expect(
                statisticsMostDetailedPick.numberOfTilesWithContentReady
              ).toBe(1);
              expect(statisticsMostDetailedPick.selected).toBe(1);
              expect(statisticsMostDetailedPick.visited).toBeGreaterThan(1);
              expect(statisticsMostDetailedPick.numberOfTilesTotal).toBe(21);
              expect(statisticsRender.selected).toBe(0);
            });
          }
        );
      });

      it("tileset is onscreen", function () {
        if (webglStub) {
          return;
        }

        viewAllTiles();

        // Tileset uses replacement refinement so only one tile should be loaded and selected during most detailed picking
        const centerCartographic = new Cartographic(
          -1.3196799798348215,
          0.6988740001506679,
          2.4683731133709323
        );
        const cartographics = [centerCartographic];

        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            return sampleHeightMostDetailed(cartographics).then(function () {
              expect(centerCartographic.height).toEqualEpsilon(
                2.47,
                CesiumMath.EPSILON1
              );
              const statisticsMostDetailedPick =
                tileset._statisticsPerPass[Cesium3DTilePass.MOST_DETAILED_PICK];
              const statisticsRender =
                tileset._statisticsPerPass[Cesium3DTilePass.RENDER];
              expect(statisticsMostDetailedPick.numberOfCommands).toBe(1);
              expect(
                statisticsMostDetailedPick.numberOfTilesWithContentReady
              ).toBeGreaterThan(1);
              expect(statisticsMostDetailedPick.selected).toBe(1);
              expect(statisticsMostDetailedPick.visited).toBeGreaterThan(1);
              expect(statisticsMostDetailedPick.numberOfTilesTotal).toBe(21);
              expect(statisticsRender.selected).toBeGreaterThan(0);
            });
          }
        );
      });

      it("tileset uses additive refinement", function () {
        if (webglStub) {
          return;
        }

        viewNothing();

        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            tilesetJson.root.refine = "ADD";
            return tilesetJson;
          });
        });

        const offcenterCartographic = new Cartographic(
          -1.3196754112739246,
          0.6988705057695633,
          2.467395745774971
        );
        const cartographics = [offcenterCartographic];

        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            return sampleHeightMostDetailed(cartographics).then(function () {
              const statistics =
                tileset._statisticsPerPass[Cesium3DTilePass.MOST_DETAILED_PICK];
              expect(offcenterCartographic.height).toEqualEpsilon(
                7.407,
                CesiumMath.EPSILON1
              );
              expect(statistics.numberOfCommands).toBe(3); // One for each level of the tree
              expect(
                statistics.numberOfTilesWithContentReady
              ).toBeGreaterThanOrEqual(3);
              expect(statistics.selected).toBe(3);
              expect(statistics.visited).toBeGreaterThan(3);
              expect(statistics.numberOfTilesTotal).toBe(21);
            });
          }
        );
      });

      it("drill picks multiple features when tileset uses additive refinement", function () {
        if (webglStub) {
          return;
        }

        viewNothing();
        const ray = new Ray(scene.camera.positionWC, scene.camera.directionWC);

        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            tilesetJson.root.refine = "ADD";
            return tilesetJson;
          });
        });

        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            return drillPickFromRayMostDetailed(ray).then(function (results) {
              expect(results.length).toBe(3);
              expect(
                results[0].object.content.url.indexOf("0_0_0.b3dm") > -1
              ).toBe(true);
              expect(
                results[1].object.content.url.indexOf("1_1_1.b3dm") > -1
              ).toBe(true);
              expect(
                results[2].object.content.url.indexOf("2_4_4.b3dm") > -1
              ).toBe(true);
            });
          }
        );
      });

      it("works when tileset cache is disabled", function () {
        if (webglStub) {
          return;
        }
        viewNothing();
        const centerCartographic = new Cartographic(
          -1.3196799798348215,
          0.6988740001506679,
          2.4683731133709323
        );
        const cartographics = [centerCartographic];
        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            tileset.maximumMemoryUsage = 0;
            return sampleHeightMostDetailed(cartographics).then(function () {
              expect(centerCartographic.height).toEqualEpsilon(
                2.47,
                CesiumMath.EPSILON1
              );
            });
          }
        );
      });

      it("multiple samples", function () {
        if (webglStub) {
          return;
        }

        viewNothing();

        const centerCartographic = new Cartographic(
          -1.3196799798348215,
          0.6988740001506679
        );
        const offcenterCartographic = new Cartographic(
          -1.3196754112739246,
          0.6988705057695633
        );
        const missCartographic = new Cartographic(
          -1.3196096042084076,
          0.6988703290845706
        );
        const cartographics = [
          centerCartographic,
          offcenterCartographic,
          missCartographic,
        ];

        return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
          function (tileset) {
            return sampleHeightMostDetailed(cartographics).then(function () {
              expect(centerCartographic.height).toEqualEpsilon(
                2.47,
                CesiumMath.EPSILON1
              );
              expect(offcenterCartographic.height).toEqualEpsilon(
                2.47,
                CesiumMath.EPSILON1
              );
              expect(missCartographic.height).toBeUndefined();

              const statistics =
                tileset._statisticsPerPass[Cesium3DTilePass.MOST_DETAILED_PICK];
              expect(statistics.numberOfTilesWithContentReady).toBe(2);
            });
          }
        );
      });
    });

    // Cancelling a request throws an unhandled 404
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("cancels out-of-view tiles", function () {
      viewNothing();

      return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
        function (tileset) {
          // Make requests
          viewAllTiles();
          scene.renderForSpecs();
          const requestedTilesInFlight = tileset._requestedTilesInFlight;
          const requestedTilesInFlightLength = requestedTilesInFlight.length;
          expect(requestedTilesInFlightLength).toBeGreaterThan(0);

          // Save off old requests
          const oldRequests = [];
          let i;
          for (i = 0; i < requestedTilesInFlightLength; i++) {
            oldRequests.push(requestedTilesInFlight[i]);
          }

          // Cancel requests
          viewNothing();
          scene.renderForSpecs();
          expect(requestedTilesInFlight.length).toBe(0);

          // Make sure old requests were marked for cancelling
          let allCancelled = true;
          const oldRequestsLength = oldRequests.length;
          for (i = 0; i < oldRequestsLength; i++) {
            const tile = oldRequests[i];
            allCancelled = allCancelled && tile._request.cancelled;
          }
          expect(allCancelled).toBe(true);
        }
      );
    });

    it("sorts requests by priority", function () {
      viewNothing();

      return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
        function (tileset) {
          // Make requests
          viewAllTiles();
          scene.renderForSpecs();
          const requestedTilesInFlight = tileset._requestedTilesInFlight;
          const requestedTilesInFlightLength = requestedTilesInFlight.length;
          expect(requestedTilesInFlightLength).toBeGreaterThan(0);

          // Verify sort
          let allSorted = true;
          let lastPriority = -Number.MAX_VALUE;
          let thisPriority;
          for (let i = 0; i < requestedTilesInFlightLength; i++) {
            thisPriority = requestedTilesInFlight[i]._priority;
            allSorted = allSorted && thisPriority >= lastPriority;
            lastPriority = thisPriority;
          }

          expect(allSorted).toBe(true);
          expect(lastPriority).not.toEqual(requestedTilesInFlight[0]._priority); // Not all the same value

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        }
      );
    });

    it("defers requests when foveatedScreenSpaceError is true", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetRefinementMix).then(
        function (tileset) {
          tileset.foveatedScreenSpaceError = true;
          tileset.foveatedConeSize = 0;
          tileset.maximumScreenSpaceError = 8;
          tileset.foveatedTimeDelay = 0;

          // Position camera such that some tiles are outside the foveated cone but still on screen.
          viewAllTiles();
          scene.camera.moveLeft(205.0);
          scene.camera.moveDown(205.0);

          scene.renderForSpecs();

          // Verify deferred
          const requestedTilesInFlight = tileset._requestedTilesInFlight;
          expect(requestedTilesInFlight.length).toBe(1);
          expect(requestedTilesInFlight[0].priorityDeferred).toBe(true);

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        }
      );
    });

    it("loads deferred requests only after time delay.", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetRefinementMix).then(
        function (tileset) {
          tileset.foveatedScreenSpaceError = true;
          tileset.foveatedConeSize = 0;
          tileset.maximumScreenSpaceError = 8;
          tileset.foveatedTimeDelay = 0.1;

          // Position camera such that some tiles are outside the foveated cone but still on screen.
          viewAllTiles();
          scene.camera.moveLeft(205.0);
          scene.camera.moveDown(205.0);

          scene.renderForSpecs();

          // Nothing should be loaded yet.
          expect(tileset._requestedTilesInFlight.length).toBe(0);
          // Eventually, a deferred tile should load.
          return pollToPromise(function () {
            scene.renderForSpecs();
            return tileset._requestedTilesInFlight.length !== 0;
          }).then(function () {
            expect(tileset._requestedTilesInFlight[0].priorityDeferred).toBe(
              true
            );

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
          });
        }
      );
    });

    it("preloads tiles", function () {
      // Flight destination
      viewAllTiles();
      scene.preloadFlightCamera = Camera.clone(scene.camera);
      scene.preloadFlightCullingVolume = scene.camera.frustum.computeCullingVolume(
        scene.camera.positionWC,
        scene.camera.directionWC,
        scene.camera.upWC
      );

      // Reset view
      viewNothing();

      return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
        function (tileset) {
          spyOn(Camera.prototype, "canPreloadFlight").and.callFake(function () {
            return true;
          });
          scene.renderForSpecs();
          expect(tileset._requestedTilesInFlight.length).toBeGreaterThan(0);
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        }
      );
    });

    it("does not fetch tiles while camera is moving", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
        function (tileset) {
          tileset.cullRequestsWhileMoving = true;
          viewAllTiles();
          scene.renderForSpecs();
          expect(tileset._requestedTilesInFlight.length).toEqual(0); // Big camera delta so no fetches should occur.
        }
      );
    });

    it("does not apply cullRequestWhileMoving optimization if tileset is moving", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, tilesetUniform).then(
        function (tileset) {
          tileset.cullRequestsWhileMoving = true;
          tileset.modelMatrix[12] += 1.0;
          viewAllTiles();
          scene.renderForSpecs();
          expect(tileset._requestedTilesInFlight.length).toEqual(2);
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        }
      );
    });

    it("loads tiles when preloadWhenHidden is true", function () {
      const options = {
        show: false,
        preloadWhenHidden: true,
      };

      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, options).then(
        function (tileset) {
          const selectedLength = tileset.statistics.selected;
          expect(selectedLength).toBeGreaterThan(0);
          tileset.show = true;
          scene.renderForSpecs();
          expect(tileset.statistics.selected).toBe(selectedLength);
          expect(tileset.statistics.numberOfPendingRequests).toBe(0);
        }
      );
    });

    it("displays copyrights for all glTF content", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        gltfContentWithCopyrightUrl
      ).then(function (tileset) {
        setZoom(10.0);
        scene.renderForSpecs();

        const expectedCredits = [
          "Parent Copyright",
          "Lower Left Copyright",
          "Lower Right Copyright 1",
          "Lower Right Copyright 2",
          "Upper Right Copyright",
          "Upper Left Copyright",
        ];

        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        const length = credits.length;
        expect(length).toEqual(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          const creditInfo = credits[i];
          const creditString = creditInfo.credit.html;
          expect(expectedCredits.includes(creditString)).toBe(true);
        }
      });
    });

    it("displays copyrights only for glTF content in view", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        gltfContentWithCopyrightUrl
      ).then(function (tileset) {
        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.lightboxCredits;

        setZoom(10.0);
        scene.camera.moveLeft(150);
        scene.camera.moveDown(150);
        scene.renderForSpecs();
        expect(credits.values.length).toEqual(1);
        expect(credits.values[0].credit.html).toEqual("Lower Left Copyright");

        setZoom(10.0);
        scene.camera.moveRight(150);
        scene.camera.moveDown(150);
        scene.renderForSpecs();
        expect(credits.values.length).toEqual(2);
        expect(credits.values[0].credit.html).toEqual(
          "Lower Right Copyright 1"
        );
        expect(credits.values[1].credit.html).toEqual(
          "Lower Right Copyright 2"
        );

        setZoom(10.0);
        scene.camera.moveRight(150);
        scene.camera.moveUp(150);
        scene.renderForSpecs();
        expect(credits.values.length).toEqual(1);
        expect(credits.values[0].credit.html).toEqual("Upper Right Copyright");

        setZoom(10.0);
        scene.camera.moveLeft(150);
        scene.camera.moveUp(150);
        scene.renderForSpecs();
        expect(credits.values.length).toEqual(1);
        expect(credits.values[0].credit.html).toEqual("Upper Left Copyright");
      });
    });

    it("displays copyrights for glTF content in sorted order", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        gltfContentWithRepeatedCopyrightsUrl
      ).then(function (tileset) {
        setZoom(10.0);
        scene.renderForSpecs();

        const mostFrequentCopyright = new Credit("Most Frequent Copyright");
        const secondRepeatedCopyright = new Credit("Second Repeated Copyright");
        const lastRepeatedCopyright = new Credit("Last Repeated Copyright");
        const uniqueCopyright = new Credit("Unique Copyright");

        const expectedCredits = [
          mostFrequentCopyright,
          secondRepeatedCopyright,
          lastRepeatedCopyright,
          uniqueCopyright,
        ];

        const creditDisplay = scene.frameState.creditDisplay;
        const creditContainer = creditDisplay._lightboxCredits.childNodes[2];
        const creditList = creditContainer.childNodes;

        const length = creditList.length;
        expect(length).toEqual(4);

        for (let i = 0; i < length; i++) {
          const credit = creditList[i].childNodes[0];
          expect(credit).toEqual(expectedCredits[i].element);
        }
      });
    });

    it("shows credits on screen", function () {
      const options = {
        showCreditsOnScreen: true,
      };
      return Cesium3DTilesTester.loadTileset(
        scene,
        gltfContentWithCopyrightUrl,
        options
      ).then(function (tileset) {
        setZoom(10.0);
        scene.renderForSpecs();

        const expectedCredits = [
          "Parent Copyright",
          "Lower Left Copyright",
          "Lower Right Copyright 1",
          "Lower Right Copyright 2",
          "Upper Right Copyright",
          "Upper Left Copyright",
        ];

        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.screenCredits.values;
        const length = credits.length;
        expect(length).toEqual(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          const creditInfo = credits[i];
          const creditString = creditInfo.credit.html;
          expect(expectedCredits.includes(creditString)).toBe(true);
        }
      });
    });

    it("toggles showing credits on screen", function () {
      const options = {
        showCreditsOnScreen: false,
      };
      return Cesium3DTilesTester.loadTileset(
        scene,
        gltfContentWithCopyrightUrl,
        options
      ).then(function (tileset) {
        setZoom(10.0);
        scene.renderForSpecs();

        const expectedCredits = [
          "Parent Copyright",
          "Lower Left Copyright",
          "Lower Right Copyright 1",
          "Lower Right Copyright 2",
          "Upper Right Copyright",
          "Upper Left Copyright",
        ];

        const creditDisplay = scene.frameState.creditDisplay;
        const lightboxCredits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        const screenCredits =
          creditDisplay._currentFrameCredits.screenCredits.values;

        let length = lightboxCredits.length;
        expect(length).toEqual(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          const creditInfo = lightboxCredits[i];
          const creditString = creditInfo.credit.html;
          expect(expectedCredits.includes(creditString)).toBe(true);
        }
        expect(screenCredits.length).toEqual(0);

        tileset.showCreditsOnScreen = true;
        scene.renderForSpecs();
        length = screenCredits.length;
        expect(length).toEqual(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          const creditInfo = screenCredits[i];
          const creditString = creditInfo.credit.html;
          expect(expectedCredits.includes(creditString)).toBe(true);
        }
        expect(lightboxCredits.length).toEqual(0);

        tileset.showCreditsOnScreen = false;
        scene.renderForSpecs();
        length = lightboxCredits.length;
        expect(length).toEqual(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          const creditInfo = lightboxCredits[i];
          const creditString = creditInfo.credit.html;
          expect(expectedCredits.includes(creditString)).toBe(true);
        }
        expect(screenCredits.length).toEqual(0);
      });
    });

    describe("implicit tiling", function () {
      const implicitTilesetUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTileset/tileset_1.1.json";
      const implicitTilesetWithJsonUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTilesetWithJsonSubtree/tileset_1.1.json";
      const implicitRootUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitRootTile/tileset_1.1.json";
      const implicitChildUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitChildTile/tileset_1.1.json";

      it("renders tileset", function () {
        return Cesium3DTilesTester.loadTileset(scene, implicitTilesetUrl).then(
          function (tileset) {
            const statistics = tileset._statistics;
            // root + implicit placeholder + 4 child tiles
            expect(statistics.visited).toEqual(6);
            // the implicit placeholder tile is not rendered
            expect(statistics.numberOfCommands).toEqual(5);
          }
        );
      });

      it("renders tileset with JSON subtree file", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitTilesetWithJsonUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // root + implicit placeholder + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // the implicit placeholder tile is not rendered
          expect(statistics.numberOfCommands).toEqual(5);
        });
      });

      it("detects and initializes an implicit tileset in root tile", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, implicitRootUrl).then(
          function (tileset) {
            const implicitTile = tileset.root;
            expect(
              endsWith(
                implicitTile._contentResource.url,
                "subtrees/0/0/0/0.subtree"
              )
            ).toEqual(true);
            expect(implicitTile.implicitTileset).toBeDefined();
            expect(implicitTile.implicitCoordinates).toBeDefined();
            expect(implicitTile.implicitCoordinates.level).toEqual(0);
            expect(implicitTile.implicitCoordinates.x).toEqual(0);
            expect(implicitTile.implicitCoordinates.y).toEqual(0);
            expect(implicitTile.implicitCoordinates.z).toEqual(0);
          }
        );
      });

      it("detects and initializes an implicit tileset in child tile", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, implicitChildUrl).then(
          function (tileset) {
            const parentTile = tileset.root;
            const implicitTile = parentTile.children[0];
            expect(
              endsWith(
                implicitTile._contentResource.url,
                "subtrees/0/0/0.subtree"
              )
            ).toEqual(true);
            expect(implicitTile.implicitTileset).toBeDefined();
            expect(implicitTile.implicitCoordinates).toBeDefined();
            expect(implicitTile.implicitCoordinates.level).toEqual(0);
            expect(implicitTile.implicitCoordinates.x).toEqual(0);
            expect(implicitTile.implicitCoordinates.y).toEqual(0);
          }
        );
      });
    });

    describe("3DTILES_implicit_tiling", function () {
      const implicitTilesetLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTileset/tileset_1.0.json";
      const implicitTilesetWithJsonLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTilesetWithJsonSubtree/tileset_1.0.json";
      const implicitRootLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitRootTile/tileset_1.0.json";
      const implicitChildLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitChildTile/tileset_1.0.json";

      it("renders tileset (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitTilesetLegacyUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // root + implicit placeholder + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // the implicit placeholder tile is not rendered
          expect(statistics.numberOfCommands).toEqual(5);
        });
      });

      it("renders tileset with JSON subtree file (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitTilesetWithJsonLegacyUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // root + implicit placeholder + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // the implicit placeholder tile is not rendered
          expect(statistics.numberOfCommands).toEqual(5);
        });
      });

      it("detects and initializes an implicit tileset in root tile (legacy)", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitRootLegacyUrl
        ).then(function (tileset) {
          const implicitTile = tileset.root;
          expect(
            endsWith(
              implicitTile._contentResource.url,
              "subtrees/0/0/0/0.subtree"
            )
          ).toEqual(true);
          expect(implicitTile.implicitTileset).toBeDefined();
          expect(implicitTile.implicitCoordinates).toBeDefined();
          expect(implicitTile.implicitCoordinates.level).toEqual(0);
          expect(implicitTile.implicitCoordinates.x).toEqual(0);
          expect(implicitTile.implicitCoordinates.y).toEqual(0);
          expect(implicitTile.implicitCoordinates.z).toEqual(0);
        });
      });

      it("detects and initializes an implicit tileset in child tile (legacy)", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitChildLegacyUrl
        ).then(function (tileset) {
          const parentTile = tileset.root;
          const implicitTile = parentTile.children[0];
          expect(
            endsWith(
              implicitTile._contentResource.url,
              "subtrees/0/0/0.subtree"
            )
          ).toEqual(true);
          expect(implicitTile.implicitTileset).toBeDefined();
          expect(implicitTile.implicitCoordinates).toBeDefined();
          expect(implicitTile.implicitCoordinates.level).toEqual(0);
          expect(implicitTile.implicitCoordinates.x).toEqual(0);
          expect(implicitTile.implicitCoordinates.y).toEqual(0);
        });
      });
    });

    describe("multiple contents", function () {
      const multipleContentsUrl =
        "Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.1.json";
      const implicitMultipleContentsUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.1.json";

      it("request statistics are updated correctly on success", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(0);
            expect(statistics.numberOfPendingRequests).toBe(0);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(1);
          }
        );
      });

      it("request statistics are updated for partial success", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const contents = tilesetJson.root.contents;
            const badTile = {
              uri: "nonexistent.b3dm",
            };
            contents.splice(1, 0, badTile);

            return tilesetJson;
          });
        });

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            viewAllTiles();
            scene.renderForSpecs();

            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(0);
            expect(statistics.numberOfPendingRequests).toBe(3);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(0);

            tileset.root.contentReadyToProcessPromise
              .then(function () {
                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(1);
                expect(statistics.numberOfTilesWithContentReady).toBe(0);
              })
              .catch(fail);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(0);
                expect(statistics.numberOfTilesWithContentReady).toBe(1);
              }
            );
          }
        );
      });

      it("request statistics are updated correctly if requests are not scheduled", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const oldMaximumRequestsPerServer =
              RequestScheduler.maximumRequestsPerServer;
            RequestScheduler.maximumRequestsPerServer = 1;

            viewAllTiles();
            scene.renderForSpecs();

            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(2);
            expect(statistics.numberOfPendingRequests).toBe(0);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(0);

            RequestScheduler.maximumRequestsPerServer = oldMaximumRequestsPerServer;
          }
        );
      });

      it("statistics update correctly if tile is canceled", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            let callCount = 0;
            tileset.tileFailed.addEventListener(function (event) {
              callCount++;
            });

            viewAllTiles();
            scene.renderForSpecs();

            const statistics = tileset.statistics;
            expect(statistics.numberOfAttemptedRequests).toBe(0);
            expect(statistics.numberOfPendingRequests).toBe(2);
            expect(statistics.numberOfTilesProcessing).toBe(0);
            expect(statistics.numberOfTilesWithContentReady).toBe(0);

            const multipleContents = tileset.root.content;
            multipleContents.cancelRequests();

            tileset.root.contentReadyToProcessPromise
              .then(function () {
                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(1);
                expect(statistics.numberOfTilesWithContentReady).toBe(0);
              })
              .catch(fail);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                // Resetting content should be handled gracefully; it should
                // not trigger the tileFailed event
                expect(callCount).toBe(0);

                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(0);
                expect(statistics.numberOfTilesWithContentReady).toBe(1);
              }
            );
          }
        );
      });

      it("verify multiple content statistics", function () {
        options.url = multipleContentsUrl;
        const tileset = scene.primitives.add(new Cesium3DTileset(options));

        return checkPointAndFeatureCounts(tileset, 35, 0, 132);
      });

      it("calls tileFailed for each content with errors", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const contents = [
              {
                uri: "nonexistent1.b3dm",
              },
              {
                uri: "nonexistent2.b3dm",
              },
              {
                uri: "nonexistent3.b3dm",
              },
            ];
            tilesetJson.root.contents = contents;
            return tilesetJson;
          });
        });

        const uris = [];

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            tileset.tileFailed.addEventListener(function (event) {
              uris.push(event.url);
            });

            viewAllTiles();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                expect(uris.length).toBe(3);
                uris.sort();
                const expected = [
                  "nonexistent1.b3dm",
                  "nonexistent2.b3dm",
                  "nonexistent3.b3dm",
                ];

                for (let i = 0; i < expected.length; i++) {
                  expect(endsWith(uris[i], expected[i])).toBe(true);
                }
              }
            );
          }
        );
      });

      it("raises tileFailed for external tileset inside multiple contents", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const contents = [
              {
                uri: "external.json",
              },
              {
                uri: "other.json",
              },
            ];
            tilesetJson.root.contents = contents;

            return tilesetJson;
          });
        });

        spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
          const externalTileset = {
            asset: {
              version: "1.1",
            },
            root: {},
          };
          const buffer = generateJsonBuffer(externalTileset).buffer;
          return Promise.resolve(buffer);
        });

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            let errorCount = 0;
            tileset.tileFailed.addEventListener(function (event) {
              errorCount++;
              expect(endsWith(event.url, ".json")).toBe(true);
              expect(event.message).toEqual(
                "External tilesets are disallowed inside multiple contents"
              );
            });

            viewAllTiles();
            scene.renderForSpecs();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
              function () {
                expect(errorCount).toBe(2);
              }
            );
          }
        );
      });

      it("debugColorizeTiles for multiple contents", function () {
        return checkDebugColorizeTiles(multipleContentsUrl);
      });

      it("debugShowUrl lists each URI", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            tileset.debugShowUrl = true;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();

            const expected = "Urls:\n- batched.b3dm\n- instanced.i3dm";
            expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

            tileset.debugShowUrl = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
          }
        );
      });

      it("renders tileset with multiple contents", function () {
        const b3dmCommands = 1;
        // when instancing is supported, there is a single draw command,
        // else,each instance is a separate command.
        const i3dmCommands = scene.context.instancedArrays ? 1 : 25;
        const totalCommands = b3dmCommands + i3dmCommands;
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(totalCommands);
          }
        );
      });

      it("renders implicit tileset with multiple contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // implicit placeholder + transcoded root + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // root content + 2 contents per child tile
          expect(statistics.numberOfCommands).toEqual(9);
        });
      });
    });

    describe("3DTILES_multiple_contents", function () {
      const multipleContentsLegacyUrl =
        "Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.0.json";
      const implicitMultipleContentsLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.0.json";

      // Test for older version of 3DTILES_multiple_contents that uses "content" instead of "contents"
      const multipleContentsLegacyWithContentUrl =
        "Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.0_content.json";
      const implicitMultipleContentsLegacyWithContentUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.0_content.json";

      it("request statistics are updated correctly on success (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          const statistics = tileset.statistics;
          expect(statistics.numberOfAttemptedRequests).toBe(0);
          expect(statistics.numberOfPendingRequests).toBe(0);
          expect(statistics.numberOfTilesProcessing).toBe(0);
          expect(statistics.numberOfTilesWithContentReady).toBe(1);
        });
      });

      it("request statistics are updated for partial success (legacy)", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const content =
              tilesetJson.root.extensions["3DTILES_multiple_contents"].contents;
            const badTile = {
              uri: "nonexistent.b3dm",
            };
            content.splice(1, 0, badTile);

            return tilesetJson;
          });
        });

        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          viewAllTiles();
          scene.renderForSpecs();

          const statistics = tileset.statistics;
          expect(statistics.numberOfAttemptedRequests).toBe(0);
          expect(statistics.numberOfPendingRequests).toBe(3);
          expect(statistics.numberOfTilesProcessing).toBe(0);
          expect(statistics.numberOfTilesWithContentReady).toBe(0);

          tileset.root.contentReadyToProcessPromise
            .then(function () {
              expect(statistics.numberOfAttemptedRequests).toBe(0);
              expect(statistics.numberOfPendingRequests).toBe(0);
              expect(statistics.numberOfTilesProcessing).toBe(1);
              expect(statistics.numberOfTilesWithContentReady).toBe(0);
            })
            .catch(fail);

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(statistics.numberOfAttemptedRequests).toBe(0);
              expect(statistics.numberOfPendingRequests).toBe(0);
              expect(statistics.numberOfTilesProcessing).toBe(0);
              expect(statistics.numberOfTilesWithContentReady).toBe(1);
            }
          );
        });
      });

      it("request statistics are updated correctly if requests are not scheduled (legacy)", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          const oldMaximumRequestsPerServer =
            RequestScheduler.maximumRequestsPerServer;
          RequestScheduler.maximumRequestsPerServer = 1;

          viewAllTiles();
          scene.renderForSpecs();

          const statistics = tileset.statistics;
          expect(statistics.numberOfAttemptedRequests).toBe(2);
          expect(statistics.numberOfPendingRequests).toBe(0);
          expect(statistics.numberOfTilesProcessing).toBe(0);
          expect(statistics.numberOfTilesWithContentReady).toBe(0);

          RequestScheduler.maximumRequestsPerServer = oldMaximumRequestsPerServer;
        });
      });

      it("statistics update correctly if tile is canceled (legacy)", function () {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          let callCount = 0;
          tileset.tileFailed.addEventListener(function (event) {
            callCount++;
          });

          viewAllTiles();
          scene.renderForSpecs();

          const statistics = tileset.statistics;
          expect(statistics.numberOfAttemptedRequests).toBe(0);
          expect(statistics.numberOfPendingRequests).toBe(2);
          expect(statistics.numberOfTilesProcessing).toBe(0);
          expect(statistics.numberOfTilesWithContentReady).toBe(0);

          const multipleContents = tileset.root.content;
          multipleContents.cancelRequests();

          tileset.root.contentReadyToProcessPromise
            .then(function () {
              expect(statistics.numberOfAttemptedRequests).toBe(0);
              expect(statistics.numberOfPendingRequests).toBe(0);
              expect(statistics.numberOfTilesProcessing).toBe(1);
              expect(statistics.numberOfTilesWithContentReady).toBe(0);
            })
            .catch(fail);

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              // Resetting content should be handled gracefully; it should
              // not trigger the tileFailed event
              expect(callCount).toBe(0);

              expect(statistics.numberOfAttemptedRequests).toBe(0);
              expect(statistics.numberOfPendingRequests).toBe(0);
              expect(statistics.numberOfTilesProcessing).toBe(0);
              expect(statistics.numberOfTilesWithContentReady).toBe(1);
            }
          );
        });
      });

      it("verify multiple content statistics (legacy)", function () {
        options.url = multipleContentsLegacyUrl;
        const tileset = scene.primitives.add(new Cesium3DTileset(options));

        return checkPointAndFeatureCounts(tileset, 35, 0, 132);
      });

      it("calls tileFailed for each content with errors (legacy)", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const extension =
              tilesetJson.root.extensions["3DTILES_multiple_contents"];
            extension.contents = [
              {
                uri: "nonexistent1.b3dm",
              },
              {
                uri: "nonexistent2.b3dm",
              },
              {
                uri: "nonexistent3.b3dm",
              },
            ];

            return tilesetJson;
          });
        });

        const uris = [];

        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          tileset.tileFailed.addEventListener(function (event) {
            uris.push(event.url);
          });

          viewAllTiles();
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(uris.length).toBe(3);
              uris.sort();
              const expected = [
                "nonexistent1.b3dm",
                "nonexistent2.b3dm",
                "nonexistent3.b3dm",
              ];

              for (let i = 0; i < expected.length; i++) {
                expect(endsWith(uris[i], expected[i])).toBe(true);
              }
            }
          );
        });
      });

      it("raises tileFailed for external tileset inside multiple contents (legacy)", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const extension =
              tilesetJson.root.extensions["3DTILES_multiple_contents"];
            extension.contents = [
              {
                uri: "external.json",
              },
              {
                uri: "other.json",
              },
            ];

            return tilesetJson;
          });
        });

        spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
          const externalTileset = {
            asset: {
              version: "1.0",
            },
            root: {},
          };
          const buffer = generateJsonBuffer(externalTileset).buffer;
          return Promise.resolve(buffer);
        });

        viewNothing();
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          let errorCount = 0;
          tileset.tileFailed.addEventListener(function (event) {
            errorCount++;
            expect(endsWith(event.url, ".json")).toBe(true);
            expect(event.message).toEqual(
              "External tilesets are disallowed inside multiple contents"
            );
          });

          viewAllTiles();
          scene.renderForSpecs();

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              expect(errorCount).toBe(2);
            }
          );
        });
      });

      it("debugColorizeTiles for multiple contents (legacy)", function () {
        return checkDebugColorizeTiles(multipleContentsLegacyUrl);
      });

      it("debugShowUrl lists each URI (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          tileset.debugShowUrl = true;
          scene.renderForSpecs();
          expect(tileset._tileDebugLabels).toBeDefined();

          const expected = "Urls:\n- batched.b3dm\n- instanced.i3dm";
          expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

          tileset.debugShowUrl = false;
          scene.renderForSpecs();
          expect(tileset._tileDebugLabels).not.toBeDefined();
        });
      });

      it("renders tileset with multiple contents (legacy)", function () {
        const b3dmCommands = 1;
        // when instancing is supported, there is a single draw command,
        // else,each instance is a separate command.
        const i3dmCommands = scene.context.instancedArrays ? 1 : 25;
        const totalCommands = b3dmCommands + i3dmCommands;
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(1);
          expect(statistics.numberOfCommands).toEqual(totalCommands);
        });
      });

      it("renders tileset with multiple contents (legacy with 'content')", function () {
        const b3dmCommands = 1;
        // when instancing is supported, there is a single draw command,
        // else,each instance is a separate command.
        const i3dmCommands = scene.context.instancedArrays ? 1 : 25;
        const totalCommands = b3dmCommands + i3dmCommands;
        return Cesium3DTilesTester.loadTileset(
          scene,
          multipleContentsLegacyWithContentUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          expect(statistics.visited).toEqual(1);
          expect(statistics.numberOfCommands).toEqual(totalCommands);
        });
      });

      it("renders implicit tileset with multiple contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // implicit placeholder + transcoded root + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // root content + 2 contents per child tile
          expect(statistics.numberOfCommands).toEqual(9);
        });
      });

      it("renders implicit tileset with multiple contents (legacy with 'content')", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyWithContentUrl
        ).then(function (tileset) {
          const statistics = tileset._statistics;
          // implicit placeholder + transcoded root + 4 child tiles
          expect(statistics.visited).toEqual(6);
          // root content + 2 contents per child tile
          expect(statistics.numberOfCommands).toEqual(9);
        });
      });
    });

    const tilesetProperties = {
      author: "Cesium",
      date: "2021-03-23",
      centerCartographic: [
        -1.3196816996258511,
        0.6988767486400521,
        45.78600543644279,
      ],
      tileCount: 5,
    };

    describe("select feature IDs", function () {
      const tilesetWithFeatureIdsUrl =
        "Data/Cesium3DTiles/Metadata/StructuralMetadata/tileset.json";

      it("featureIdLabel sets from string", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithFeatureIdsUrl
        ).then(function (tileset) {
          expect(tileset.featureIdLabel).toBe("featureId_0");
          tileset.featureIdLabel = "buildings";
          expect(tileset.featureIdLabel).toBe("buildings");
        });
      });

      it("featureIdLabel sets from integer", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithFeatureIdsUrl
        ).then(function (tileset) {
          expect(tileset.featureIdLabel).toBe("featureId_0");
          tileset.featureIdLabel = 1;
          expect(tileset.featureIdLabel).toBe("featureId_1");
        });
      });

      it("instanceFeatureIdLabel sets from string", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithFeatureIdsUrl
        ).then(function (tileset) {
          expect(tileset.instanceFeatureIdLabel).toBe("instanceFeatureId_0");
          tileset.instanceFeatureIdLabel = "perInstance";
          expect(tileset.instanceFeatureIdLabel).toBe("perInstance");
        });
      });

      it("instanceFeatureIdLabel sets from integer", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithFeatureIdsUrl
        ).then(function (tileset) {
          expect(tileset.instanceFeatureIdLabel).toBe("instanceFeatureId_0");
          tileset.instanceFeatureIdLabel = 1;
          expect(tileset.instanceFeatureIdLabel).toBe("instanceFeatureId_1");
        });
      });
    });

    describe("metadata", function () {
      const tilesetMetadataUrl =
        "Data/Cesium3DTiles/Metadata/TilesetMetadata/tileset_1.1.json";
      const tilesetWithExternalSchemaUrl =
        "Data/Cesium3DTiles/Metadata/ExternalSchema/tileset_1.1.json";
      const tilesetWithGroupMetadataUrl =
        "Data/Cesium3DTiles/Metadata/GroupMetadata/tileset_1.1.json";
      const tilesetWithExplicitTileMetadataUrl =
        "Data/Cesium3DTiles/Metadata/TileMetadata/tileset_1.1.json";
      const tilesetWithImplicitTileMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitTileMetadata/tileset_1.1.json";
      const tilesetWithExplicitContentMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ContentMetadata/tileset_1.1.json";
      const tilesetWithImplicitContentMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentMetadata/tileset_1.1.json";
      const tilesetWithExplicitMultipleContentsMetadataUrl =
        "Data/Cesium3DTiles/Metadata/MultipleContentsWithMetadata/tileset_1.1.json";
      const tilesetWithImplicitMultipleContentsMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.1.json";

      it("loads tileset metadata", function () {
        return Cesium3DTilesTester.loadTileset(scene, tilesetMetadataUrl).then(
          function (tileset) {
            const tilesetMetadata = tileset.metadata;
            expect(function () {
              return tilesetMetadata.getProperty("name");
            }).toThrowDeveloperError();
            expect(tilesetMetadata.getProperty("author")).toBe(
              tilesetProperties.author
            );
            expect(tilesetMetadata.getPropertyBySemantic("DATE_ISO_8601")).toBe(
              tilesetProperties.date
            );
            expect(tilesetMetadata.getProperty("centerCartographic")).toEqual(
              Cartesian3.unpack(tilesetProperties.centerCartographic)
            );
            expect(tilesetMetadata.getProperty("tileCount")).toBe(
              tilesetProperties.tileCount
            );
          }
        );
      });

      it("loads group metadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithGroupMetadataUrl
        ).then(function (tileset) {
          const metadata = tileset.metadataExtension;
          expect(metadata).toBeDefined();

          const groups = metadata.groups;
          expect(groups).toBeDefined();

          let group = groups[1];
          expect(group).toBeDefined();
          expect(group.getProperty("businessCount")).toBe(143);

          group = groups[0];
          expect(group).toBeDefined();
          expect(group.getProperty("population")).toBe(300000);
          expect(group.getProperty("neighborhoods")).toEqual([
            "Hillside",
            "Middletown",
            "Western Heights",
          ]);
        });
      });

      it("can access group metadata through contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithGroupMetadataUrl
        ).then(function (tileset) {
          const metadata = tileset.metadataExtension;
          const commercialDistrict = metadata.groups[1];
          const residentialDistrict = metadata.groups[0];

          // the parent tile in this dataset does not have a group defined,
          // but its children do.
          const parent = tileset.root;
          const group = parent.content.group;
          expect(group).not.toBeDefined();

          const expected = {
            "ul.b3dm": residentialDistrict,
            "ll.b3dm": residentialDistrict,
            "ur.b3dm": commercialDistrict,
            "lr.b3dm": commercialDistrict,
          };

          const childrenTiles = parent.children;
          childrenTiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            expect(tile.content.group.metadata).toBe(expected[uri]);
          });
        });
      });

      it("loads metadata with embedded schema", function () {
        return Cesium3DTilesTester.loadTileset(scene, tilesetMetadataUrl).then(
          function (tileset) {
            const schema = tileset.schema;
            expect(schema).toBeDefined();

            const classes = schema.classes;
            expect(classes.tileset).toBeDefined();
          }
        );
      });

      it("loads metadata with external schema", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExternalSchemaUrl
        ).then(function (tileset) {
          const schema = tileset.schema;
          expect(schema).toBeDefined();

          const classes = schema.classes;
          expect(classes.tileset).toBeDefined();
        });
      });

      it("loads explicit tileset with tile metadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitTileMetadataUrl
        ).then(function (tileset) {
          const expected = {
            "parent.b3dm": {
              color: new Cartesian3(0.5, 0.0, 1.0),
              population: 530,
              areaPercentage: 100,
            },
            "ll.b3dm": {
              color: new Cartesian3(1.0, 1.0, 0.0),
              population: 50,
              areaPercentage: 25,
            },
            "lr.b3dm": {
              color: new Cartesian3(1.0, 0.0, 0.5),
              population: 230,
              areaPercentage: 25,
            },
            "ur.b3dm": {
              color: new Cartesian3(1.0, 0.5, 0.0),
              population: 150,
              areaPercentage: 25,
            },
            "ul.b3dm": {
              color: new Cartesian3(1.0, 0.0, 0.0),
              population: 100,
              areaPercentage: 25,
            },
          };

          const parent = tileset.root;
          const tiles = [parent].concat(parent.children);
          tiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            const expectedValues = expected[uri];
            const metadata = tile.metadata;
            expect(metadata.getProperty("color")).toEqual(expectedValues.color);
            expect(metadata.getProperty("population")).toEqual(
              expectedValues.population
            );
            // 25 can't be represented exactly when quantized as a UINT16
            expect(metadata.getProperty("areaPercentage")).toEqualEpsilon(
              expectedValues.areaPercentage,
              CesiumMath.EPSILON2
            );
          });
        });
      });

      it("loads implicit tileset with tile metadata", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitTileMetadataUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTable = subtree.tileMetadataTable;
          expect(metadataTable).toBeDefined();
          expect(metadataTable.count).toBe(4);
          expect(metadataTable.hasProperty("color")).toBe(true);
          expect(metadataTable.hasProperty("quadrant")).toBe(true);

          const tileCount = 4;
          const expectedQuadrants = [
            "None",
            "Southwest",
            "",
            "Northwest",
            "Northeast",
          ];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const index = tile.implicitCoordinates.tileIndex;
            const metadata = tile.metadata;
            if (!subtree.tileIsAvailableAtIndex(index)) {
              expect(metadata.getProperty("quadrant")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("quadrant")).toBe(
                expectedQuadrants[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("loads explicit tileset with content metadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitContentMetadataUrl
        ).then(function (tileset) {
          const expected = {
            "parent.b3dm": {
              highlightColor: new Cartesian3(255, 0, 0),
              author: "Cesium",
            },
            "ll.b3dm": {
              highlightColor: new Cartesian3(255, 255, 255),
              author: "First Company",
            },
            "lr.b3dm": {
              highlightColor: new Cartesian3(255, 0, 255),
              author: "Second Company",
            },
            "ur.b3dm": {
              highlightColor: new Cartesian3(0, 255, 0),
              author: "Third Company",
            },
            "ul.b3dm": {
              highlightColor: new Cartesian3(0, 0, 255),
              author: "Fourth Company",
            },
          };

          const parent = tileset.root;
          const tiles = [parent].concat(parent.children);
          tiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            const content = tile.content;
            const expectedValues = expected[uri];
            const metadata = content.metadata;
            expect(metadata.getProperty("highlightColor")).toEqual(
              expectedValues.highlightColor
            );
            expect(metadata.getProperty("author")).toEqual(
              expectedValues.author
            );
          });
        });
      });

      it("loads implicit tileset with content metadata", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitContentMetadataUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTables = subtree.contentMetadataTables;
          expect(metadataTables.length).toBe(1);

          const metadataTable = metadataTables[0];

          expect(metadataTable.count).toBe(4);
          expect(metadataTable.hasProperty("height")).toBe(true);
          expect(metadataTable.hasProperty("color")).toBe(true);

          const tileCount = 4;

          const expectedHeights = [10, 20, 0, 30, 40];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const content = tile.content;
            const index = tile.implicitCoordinates.tileIndex;
            const metadata = content.metadata;
            if (!subtree.contentIsAvailableAtIndex(index, 0)) {
              expect(metadata.getProperty("height")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("height")).toBe(
                expectedHeights[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("loads explicit tileset with multiple contents with metadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitMultipleContentsMetadataUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          const batchedContent = content.innerContents[0];
          const batchedContentMetadata = batchedContent.metadata;

          expect(batchedContentMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255)
          );
          expect(batchedContentMetadata.getProperty("author")).toEqual(
            "Cesium"
          );
          expect(batchedContentMetadata.hasProperty("numberOfInstances")).toBe(
            false
          );

          const instancedContent = content.innerContents[1];
          const instancedContentMetadata = instancedContent.metadata;

          expect(
            instancedContentMetadata.getProperty("numberOfInstances")
          ).toEqual(50);
          expect(instancedContentMetadata.getProperty("author")).toEqual(
            "Sample Author"
          );
          expect(instancedContentMetadata.hasProperty("highlightColor")).toBe(
            false
          );
        });
      });

      it("loads implicit tileset with multiple contents with metadata", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitMultipleContentsMetadataUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTables = subtree.contentMetadataTables;
          expect(metadataTables.length).toBe(2);

          const buildingMetadataTable = metadataTables[0];
          const treeMetadataTable = metadataTables[1];

          expect(buildingMetadataTable.count).toBe(5);
          expect(buildingMetadataTable.hasProperty("height")).toBe(true);
          expect(buildingMetadataTable.hasProperty("color")).toBe(true);

          expect(treeMetadataTable.count).toBe(4);
          expect(treeMetadataTable.hasProperty("age")).toBe(true);

          const tileCount = 5;

          const expectedHeights = [10, 20, 30, 40, 50];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            new Cartesian3(255, 255, 0),
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const expectedAges = [21, 7, 11, 16];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const index = tile.implicitCoordinates.tileIndex;

            let buildingMetadata;
            if (i > 0) {
              expect(tile.hasMultipleContents).toBe(true);
              const buildingContent = tile.content.innerContents[0];
              buildingMetadata = buildingContent.metadata;
            } else {
              expect(tile.hasMultipleContents).toBe(false);
              buildingMetadata = tile.content.metadata;
            }

            expect(buildingMetadata.getProperty("height")).toBe(
              expectedHeights[index]
            );
            expect(buildingMetadata.getProperty("color")).toEqual(
              expectedColors[index]
            );

            if (i === 0) {
              continue;
            }

            const treeContent = tile.content.innerContents[1];
            const treeMetadata = treeContent.metadata;
            expect(treeMetadata.getProperty("age")).toEqual(
              expectedAges[index - 1]
            );
          }
        });
      });
    });

    describe("3DTILES_metadata", function () {
      const tilesetMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/TilesetMetadata/tileset_1.0.json";
      const tilesetWithExternalSchemaLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ExternalSchema/tileset_1.0.json";
      const tilesetWithGroupMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/GroupMetadata/tileset_1.0.json";
      const tilesetWithExplicitTileMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/TileMetadata/tileset_1.0.json";
      const tilesetWithImplicitTileMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitTileMetadata/tileset_1.0.json";
      const tilesetWithExplicitContentMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ContentMetadata/tileset_1.0.json";
      const tilesetWithImplicitContentMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentMetadata/tileset_1.0.json";
      const tilesetWithExplicitMultipleContentsMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/MultipleContentsWithMetadata/tileset_1.0.json";
      const tilesetWithImplicitMultipleContentsMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.0.json";

      it("loads tileset metadata (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetMetadataLegacyUrl
        ).then(function (tileset) {
          const metadata = tileset.metadataExtension;
          expect(metadata).toBeDefined();

          const tilesetMetadata = metadata.tileset;
          expect(function () {
            return tilesetMetadata.getProperty("name");
          }).toThrowDeveloperError();
          expect(tilesetMetadata.getProperty("author")).toBe(
            tilesetProperties.author
          );
          expect(tilesetMetadata.getPropertyBySemantic("DATE_ISO_8601")).toBe(
            tilesetProperties.date
          );
          expect(tilesetMetadata.getProperty("centerCartographic")).toEqual(
            Cartesian3.unpack(tilesetProperties.centerCartographic)
          );
          expect(tilesetMetadata.getProperty("tileCount")).toBe(
            tilesetProperties.tileCount
          );
        });
      });

      it("loads group metadata (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithGroupMetadataLegacyUrl
        ).then(function (tileset) {
          const metadata = tileset.metadataExtension;
          expect(metadata).toBeDefined();

          const groups = metadata.groups;
          const groupIds = metadata.groupIds;
          expect(groups).toBeDefined();
          expect(groupIds).toEqual([
            "commercialDistrict",
            "residentialDistrict",
          ]);

          let group = groups[0];
          expect(group).toBeDefined();
          expect(group.getProperty("businessCount")).toBe(143);

          group = groups[1];
          expect(group).toBeDefined();
          expect(group.getProperty("population")).toBe(300000);
          expect(group.getProperty("neighborhoods")).toEqual([
            "Hillside",
            "Middletown",
            "Western Heights",
          ]);
        });
      });

      it("can access group metadata through contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithGroupMetadataLegacyUrl
        ).then(function (tileset) {
          const metadata = tileset.metadataExtension;
          const commercialDistrict = metadata.groups[0];
          const residentialDistrict = metadata.groups[1];

          // the parent tile in this dataset does not have a group defined,
          // but its children do.
          const parent = tileset.root;
          const group = parent.content.group;
          expect(group).not.toBeDefined();

          const expected = {
            "ul.b3dm": residentialDistrict,
            "ll.b3dm": residentialDistrict,
            "ur.b3dm": commercialDistrict,
            "lr.b3dm": commercialDistrict,
          };

          const childrenTiles = parent.children;
          childrenTiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            expect(tile.content.group.metadata).toBe(expected[uri]);
          });
        });
      });

      it("loads metadata with embedded schema (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetMetadataLegacyUrl
        ).then(function (tileset) {
          const schema = tileset.schema;
          expect(schema).toBeDefined();

          const classes = schema.classes;
          expect(classes.tileset).toBeDefined();
        });
      });

      it("loads metadata with external schema and extension (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExternalSchemaLegacyUrl
        ).then(function (tileset) {
          const schema = tileset.schema;
          expect(schema).toBeDefined();

          const classes = schema.classes;
          expect(classes.tileset).toBeDefined();
        });
      });

      it("loads explicit tileset with tile metadata (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitTileMetadataLegacyUrl
        ).then(function (tileset) {
          const expected = {
            "parent.b3dm": {
              color: new Cartesian3(0.5, 0.0, 1.0),
              population: 530,
              areaPercentage: 100,
            },
            "ll.b3dm": {
              color: new Cartesian3(1.0, 1.0, 0.0),
              population: 50,
              areaPercentage: 25,
            },
            "lr.b3dm": {
              color: new Cartesian3(1.0, 0.0, 0.5),
              population: 230,
              areaPercentage: 25,
            },
            "ur.b3dm": {
              color: new Cartesian3(1.0, 0.5, 0.0),
              population: 150,
              areaPercentage: 25,
            },
            "ul.b3dm": {
              color: new Cartesian3(1.0, 0.0, 0.0),
              population: 100,
              areaPercentage: 25,
            },
          };

          const parent = tileset.root;
          const tiles = [parent].concat(parent.children);
          tiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            const expectedValues = expected[uri];
            const metadata = tile.metadata;
            expect(metadata.getProperty("color")).toEqual(expectedValues.color);
            expect(metadata.getProperty("population")).toEqual(
              expectedValues.population
            );
            // 25 can't be represented exactly when quantized as a UINT16
            expect(metadata.getProperty("areaPercentage")).toEqualEpsilon(
              expectedValues.areaPercentage,
              CesiumMath.EPSILON2
            );
          });
        });
      });

      it("loads implicit tileset with tile metadata (legacy)", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitTileMetadataLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTable = subtree.tileMetadataTable;
          expect(metadataTable).toBeDefined();
          expect(metadataTable.count).toBe(4);
          expect(metadataTable.hasProperty("color")).toBe(true);
          expect(metadataTable.hasProperty("quadrant")).toBe(true);

          const tileCount = 4;
          const expectedQuadrants = [
            "None",
            "Southwest",
            "",
            "Northwest",
            "Northeast",
          ];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const index = tile.implicitCoordinates.tileIndex;
            const metadata = tile.metadata;
            if (!subtree.tileIsAvailableAtIndex(index)) {
              expect(metadata.getProperty("quadrant")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("quadrant")).toBe(
                expectedQuadrants[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("loads explicit tileset with content metadata (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitContentMetadataLegacyUrl
        ).then(function (tileset) {
          const expected = {
            "parent.b3dm": {
              highlightColor: new Cartesian3(255, 0, 0),
              author: "Cesium",
            },
            "ll.b3dm": {
              highlightColor: new Cartesian3(255, 255, 255),
              author: "First Company",
            },
            "lr.b3dm": {
              highlightColor: new Cartesian3(255, 0, 255),
              author: "Second Company",
            },
            "ur.b3dm": {
              highlightColor: new Cartesian3(0, 255, 0),
              author: "Third Company",
            },
            "ul.b3dm": {
              highlightColor: new Cartesian3(0, 0, 255),
              author: "Fourth Company",
            },
          };

          const parent = tileset.root;
          const tiles = [parent].concat(parent.children);
          tiles.forEach(function (tile) {
            const uri = tile._header.content.uri;
            const content = tile.content;
            const expectedValues = expected[uri];
            const metadata = content.metadata;
            expect(metadata.getProperty("highlightColor")).toEqual(
              expectedValues.highlightColor
            );
            expect(metadata.getProperty("author")).toEqual(
              expectedValues.author
            );
          });
        });
      });

      it("loads implicit tileset with content metadata (legacy)", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitContentMetadataLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTables = subtree.contentMetadataTables;
          expect(metadataTables.length).toBe(1);

          const metadataTable = metadataTables[0];

          expect(metadataTable.count).toBe(4);
          expect(metadataTable.hasProperty("height")).toBe(true);
          expect(metadataTable.hasProperty("color")).toBe(true);

          const tileCount = 4;

          const expectedHeights = [10, 20, 0, 30, 40];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const content = tile.content;
            const index = tile.implicitCoordinates.tileIndex;
            const metadata = content.metadata;
            if (!subtree.contentIsAvailableAtIndex(index, 0)) {
              expect(metadata.getProperty("height")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("height")).toBe(
                expectedHeights[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("loads explicit tileset with multiple contents with metadata (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithExplicitMultipleContentsMetadataLegacyUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          const batchedContent = content.innerContents[0];
          const batchedContentMetadata = batchedContent.metadata;

          expect(batchedContentMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255)
          );
          expect(batchedContentMetadata.getProperty("author")).toEqual(
            "Cesium"
          );
          expect(batchedContentMetadata.hasProperty("numberOfInstances")).toBe(
            false
          );

          const instancedContent = content.innerContents[1];
          const instancedContentMetadata = instancedContent.metadata;

          expect(
            instancedContentMetadata.getProperty("numberOfInstances")
          ).toEqual(50);
          expect(instancedContentMetadata.getProperty("author")).toEqual(
            "Sample Author"
          );
          expect(instancedContentMetadata.hasProperty("highlightColor")).toBe(
            false
          );
        });
      });

      it("loads implicit tileset with multiple contents with metadata (legacy)", function () {
        // this tileset is similar to other implicit tilesets, though
        // one tile is removed
        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithImplicitMultipleContentsMetadataLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;

          const transcodedRoot = placeholderTile.children[0];
          const subtree = transcodedRoot.implicitSubtree;
          expect(subtree).toBeDefined();

          const metadataTables = subtree.contentMetadataTables;
          expect(metadataTables.length).toBe(2);

          const buildingMetadataTable = metadataTables[0];
          const treeMetadataTable = metadataTables[1];

          expect(buildingMetadataTable.count).toBe(5);
          expect(buildingMetadataTable.hasProperty("height")).toBe(true);
          expect(buildingMetadataTable.hasProperty("color")).toBe(true);

          expect(treeMetadataTable.count).toBe(4);
          expect(treeMetadataTable.hasProperty("age")).toBe(true);

          const tileCount = 5;

          const expectedHeights = [10, 20, 30, 40, 50];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            new Cartesian3(255, 255, 0),
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const expectedAges = [21, 7, 11, 16];

          const tiles = [transcodedRoot].concat(transcodedRoot.children);
          expect(tiles.length).toBe(tileCount);

          let i;
          for (i = 0; i < tileCount; i++) {
            const tile = tiles[i];
            const index = tile.implicitCoordinates.tileIndex;

            let buildingMetadata;
            if (i > 0) {
              expect(tile.hasMultipleContents).toBe(true);
              const buildingContent = tile.content.innerContents[0];
              buildingMetadata = buildingContent.metadata;
            } else {
              expect(tile.hasMultipleContents).toBe(false);
              buildingMetadata = tile.content.metadata;
            }

            expect(buildingMetadata.getProperty("height")).toBe(
              expectedHeights[index]
            );
            expect(buildingMetadata.getProperty("color")).toEqual(
              expectedColors[index]
            );

            if (i === 0) {
              continue;
            }

            const treeContent = tile.content.innerContents[1];
            const treeMetadata = treeContent.metadata;
            expect(treeMetadata.getProperty("age")).toEqual(
              expectedAges[index - 1]
            );
          }
        });
      });
    });
  },
  "WebGL"
);
