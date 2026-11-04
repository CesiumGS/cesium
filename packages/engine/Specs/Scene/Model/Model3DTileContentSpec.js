import {
  Cartesian3,
  Cartographic,
  Color,
  ColorGeometryInstanceAttribute,
  Ellipsoid,
  FixedFrameTransforms,
  GeometryInstance,
  HeadingPitchRange,
  HeadingPitchRoll,
  JulianDate,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
  RectangleGeometry,
  RuntimeError,
  destroyObject,
} from "@cesium/core";
import {
  Cesium3DContentGroup,
  Cesium3DTilePass,
  Cesium3DTileRefine,
  Cesium3DTileStyle,
  ClassificationType,
  ClippingPlane,
  ClippingPlaneCollection,
  ClippingPolygon,
  ClippingPolygonCollection,
  ContentMetadata,
  GroupMetadata,
  MetadataClass,
  Pass,
  PerInstanceColorAppearance,
  Primitive,
  RenderState,
  StencilConstants,
} from "../../../index.js";
import Cesium3DTilesTester from "../../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../../Specs/createScene.js";
import createCanvas from "../../../../../Specs/createCanvas.js";

describe(
  "Scene/Model/Model3DTileContent",
  function () {
    // glTF
    const gltfContentUrl = "./Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
    const glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
    const buildingsMetadataUrl =
      "./Data/Cesium3DTiles/Metadata/StructuralMetadata/tileset.json";

    // b3dm
    const withoutBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
    const noBatchIdsUrl =
      "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";
    const withBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const withBatchTableBinaryUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json";
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
    const withCopyrightUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithCopyright/tileset.json";

    // i3dm
    const instancedWithBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
    const instancedExternalGltfUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedGltfExternal/tileset.json";
    const instancedWithoutNormalsUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithoutNormals/tileset.json";
    const instancedWithoutBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/tileset.json";
    const instancedWithBatchIdsUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/tileset.json";
    const instancedTexturedUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedTextured/tileset.json";

    // pnts
    const pointCloudRGBUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json";
    const pointCloudRGBAUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGBA/tileset.json";
    const pointCloudNoColorUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/tileset.json";
    const pointCloudNormalsUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json";
    const pointCloudQuantizedOctEncodedUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded/tileset.json";
    const pointCloudDracoUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudDraco/tileset.json";
    const pointCloudWGS84Url =
      "./Data/Cesium3DTiles/PointCloud/PointCloudWGS84/tileset.json";
    const pointCloudBatchedUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json";
    const pointCloudBatchedJsonOnlyUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudBatchedJsonOnly/tileset.json";
    const pointCloudWithPerPointPropertiesUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/tileset.json";
    const pointCloudWithUnicodePropertyIdsUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyIds/tileset.json";

    // GeoJSON
    const geoJsonMultiPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/MultiPolygon/tileset.json";
    const geoJsonPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/Polygon/tileset.json";
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

    const webglStub = !!window.webglStub;

    function setCamera(longitude, latitude, range) {
      // One feature is located at the center, point the camera there
      const center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, range));
    }

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0.0);
      setCamera(centerLongitude, centerLatitude, 100.0);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    describe("geoJSON", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 1.0);
      });

      async function rendersGeoJson(url) {
        const tileset = await Cesium3DTilesTester.loadTileset(scene, url);
        Cesium3DTilesTester.expectRender(scene, tileset);
      }

      it("renders GeoJSON MultiPolygon", async function () {
        await rendersGeoJson(geoJsonMultiPolygonUrl);
      });

      it("renders GeoJSON Polygon", async function () {
        await rendersGeoJson(geoJsonPolygonUrl);
      });

      it("renders GeoJSON Polygon with heights", async function () {
        await rendersGeoJson(geoJsonPolygonHeightsUrl);
      });

      it("renders GeoJSON Polygon with hole", async function () {
        await rendersGeoJson(geoJsonPolygonHoleUrl);
      });

      it("renders GeoJSON Polygon with no properties", async function () {
        await rendersGeoJson(geoJsonPolygonNoPropertiesUrl);
      });

      it("renders GeoJSON LineString", async function () {
        await rendersGeoJson(geoJsonLineStringUrl);
      });

      it("renders GeoJSON MultiLineString", async function () {
        await rendersGeoJson(geoJsonMultiLineStringUrl);
      });

      it("renders GeoJSON with multiple features", async function () {
        await rendersGeoJson(geoJsonMultipleFeaturesUrl);
      });

      async function picksGeoJson(url, hasProperties, expectedFeatureId) {
        expectedFeatureId = expectedFeatureId ?? 0;
        const tileset = await Cesium3DTilesTester.loadTileset(scene, url);
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
      }

      it("picks GeoJSON MultiPolygon", async function () {
        await picksGeoJson(geoJsonMultiPolygonUrl, true);
      });

      it("picks GeoJSON Polygon", async function () {
        await picksGeoJson(geoJsonPolygonUrl, true);
      });

      it("picks GeoJSON Polygon with heights", async function () {
        await picksGeoJson(geoJsonPolygonHeightsUrl, true);
      });

      it("picks GeoJSON Polygon with hole", async function () {
        await picksGeoJson(geoJsonPolygonHoleUrl, true);
      });

      it("picks GeoJSON Polygon with no properties", async function () {
        await picksGeoJson(geoJsonPolygonNoPropertiesUrl, false);
      });

      it("picks GeoJSON LineString", async function () {
        await picksGeoJson(geoJsonLineStringUrl, true);
      });

      it("picks GeoJSON MultiLineString", async function () {
        await picksGeoJson(geoJsonMultiLineStringUrl, true);
      });

      it("picks GeoJSON with multiple features", async function () {
        await picksGeoJson(geoJsonMultipleFeaturesUrl, true, 1);
      });
    });

    describe("b3dm", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
      });

      it("renders b3dm content with batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders b3dm with a binary batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableBinaryUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders b3dm content without batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders b3dm content without features", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          noBatchIdsUrl,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("picks from b3dm", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl,
        );

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
      });

      it("renders with all features translucent", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          translucentUrl,
        );
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders with a mix of opaque and translucent features", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          translucentOpaqueMixUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders with textures", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          texturedUrl,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      async function expectRenderWithTransform(url) {
        setCamera(centerLongitude, centerLatitude, 15.0);
        const tileset = await Cesium3DTilesTester.loadTileset(scene, url);
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);

        const newLongitude = -1.31962;
        const newLatitude = 0.698874;
        const newCenter = Cartesian3.fromRadians(
          newLongitude,
          newLatitude,
          0.0,
        );
        const newHPR = new HeadingPitchRoll();
        const newTransform = FixedFrameTransforms.headingPitchRollToFixedFrame(
          newCenter,
          newHPR,
        );

        // Update tile transform
        tileset.root.transform = newTransform;
        scene.renderForSpecs();

        // Move the camera to the new location
        setCamera(newLongitude, newLatitude, 15.0);
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      }

      it("renders with a tile transform and box bounding volume", async function () {
        await expectRenderWithTransform(withTransformBoxUrl);
      });

      it("renders with a tile transform and sphere bounding volume", async function () {
        await expectRenderWithTransform(withTransformSphereUrl);
      });

      it("renders with a tile transform and region bounding volume", async function () {
        await expectRenderWithTransform(withTransformRegionUrl);
      });

      it("picks from b3dm batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
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
      });

      it("can get features and properties", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        const content = tileset.root.content;
        expect(content.featuresLength).toBe(10);
        expect(content.innerContents).toBeUndefined();
        expect(content.hasProperty(0, "id")).toBe(true);
        expect(content.getFeature(0)).toBeDefined();
      });

      it("gets memory usage", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          texturedUrl,
        );
        const content = tileset.root.content;

        // 10 buildings, 36 ushort indices and 24 vertices per building, 8
        // float components (position, normal, uv) and 1 uint component
        // (batchId) per vertex
        // 10 * [(24 * (8 * 4 + 1 * 4)) + (36 * 2)] = 9360 bytes
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
          batchTexturesByteLength + pickTexturesByteLength,
        );
      });

      it("gets copyright from glTF", async function () {
        await Cesium3DTilesTester.loadTileset(scene, withCopyrightUrl);
        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        expect(credits.length).toEqual(1);
        expect(credits[0].credit.html).toEqual("Sample Copyright");
      });

      it("shows copyright from glTF on screen", async function () {
        await Cesium3DTilesTester.loadTileset(scene, withCopyrightUrl, {
          showCreditsOnScreen: true,
        });

        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.screenCredits.values;
        expect(credits.length).toEqual(1);
        expect(credits[0].credit.html).toEqual("Sample Copyright");
      });

      it("toggles showing copyright from glTF on screen", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withCopyrightUrl,
          {
            showCreditsOnScreen: false,
          },
        );

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

    describe("i3dm", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 27.0);
      });

      it("renders i3dm content", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchTableUrl,
        );

        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders with external gltf", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedExternalGltfUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders without normals", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithoutNormalsUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders with batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchTableUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders without batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithoutBatchTableUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders with batch ids", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchIdsUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("renders with textures", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedTexturedUrl,
        );

        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });

      it("gets memory usage", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedTexturedUrl,
        );

        const content = tileset.root.content;

        // Box model - 36 ushort indices and 24 vertices per building, 8
        // float components (position, normal, uv) per vertex.
        // (24 * 8 * 4) + (36 * 2) = 840
        //
        // There are 25 instances. Each has a transform represented as 3
        // vec4s, and a float feature ID attribute
        // 25 * (3 * 4 * 4) + 25 * 4 = 1300
        const geometryByteLength = 840 + 1300;

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
          batchTexturesByteLength + pickTexturesByteLength,
        );
      });

      it("picks from i3dm batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchTableUrl,
        );

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

    describe("pnts", function () {
      const time = new JulianDate(2457522.0);
      const renderOptions = {
        time: time,
      };

      beforeEach(function () {
        renderOptions.scene = scene;
        setCamera(centerLongitude, centerLatitude, 5.0);
      });

      it("renders point cloud with rgba colors", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudRGBAUrl,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders point cloud with draco encoded positions, normals, colors, and batch table properties", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudDracoUrl,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
        // Test that Draco-encoded batch table properties are functioning correctly
        tileset.style = new Cesium3DTileStyle({
          color: "vec4(Number(${secondaryColor}[0] < 1.0), 0.0, 0.0, 1.0)",
        });

        expect(renderOptions).toRenderAndCall(function (rgba) {
          // Produces a red color
          expect(rgba[0]).toBeGreaterThan(rgba[1]);
          expect(rgba[0]).toBeGreaterThan(rgba[2]);
        });
      });

      it("renders point cloud that is not defined relative to center", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWGS84Url,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders point cloud with batch table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudBatchedUrl,
        );

        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders point cloud with batch table that contains only JSON data", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudBatchedJsonOnlyUrl,
        );

        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders point cloud with per-point properties", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders with debug color", async function () {
        CesiumMath.setRandomNumberSeed(0);
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudRGBUrl,
        );
        let color;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          color = rgba;
        });
        tileset.debugColorizeTiles = true;
        expect(renderOptions).notToRender(color);
        tileset.debugColorizeTiles = false;
        expect(renderOptions).toRender(color);
      });

      it("renders pnts with color style", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        // Solid red color
        tileset.style = new Cesium3DTileStyle({
          color: 'color("red")',
        });
        expect(renderOptions).toRender([255, 0, 0, 255]);

        // Applies translucency
        tileset.style = new Cesium3DTileStyle({
          color: "rgba(255, 0, 0, 0.005)",
        });
        expect(renderOptions).toRenderAndCall(function (rgba) {
          // Pixel is a darker red
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[0]).toBeLessThan(255);
          expect(rgba[1]).toBe(0);
          expect(rgba[2]).toBe(0);
          expect(rgba[3]).toBe(255);
        });

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("renders pnts with show style", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        // Apply show style that hides all points
        tileset.style = new Cesium3DTileStyle({
          show: false,
        });
        expect(renderOptions).toRender([0, 0, 0, 255]);

        // Apply show style that shows all points
        tileset.style = new Cesium3DTileStyle({
          show: true,
        });
        expect(renderOptions).notToRender([0, 0, 0, 255]);

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("renders pnts with point size style", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        scene.camera.moveDown(5.0);
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);

        // Apply pointSize style
        tileset.style = new Cesium3DTileStyle({
          pointSize: 5.0,
        });
        expect(renderOptions).notToRender([0, 0, 0, 255]);

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).toRender([0, 0, 0, 255]);
      });

      it("renders pnts with style using point cloud semantics", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        // Apply color style with semantic
        tileset.style = new Cesium3DTileStyle({
          color: "vec4(${COLOR}[0], 0.0, 0.0, 1.0)",
        });
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBe(0);
          expect(rgba[2]).toBe(0);
          expect(rgba[3]).toBe(255);
        });

        // Apply show style with semantic
        tileset.style = new Cesium3DTileStyle({
          show: "${POSITION}[0] > -50.0",
        });
        expect(renderOptions).notToRender([0, 0, 0, 255]);

        tileset.style = new Cesium3DTileStyle({
          show: "${POSITION}[0] > 50.0",
        });
        expect(renderOptions).toRender([0, 0, 0, 255]);

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("renders pnts with style using point cloud properties", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        // Apply show style with property
        tileset.style = new Cesium3DTileStyle({
          show: "${temperature} > 1.0",
        });
        expect(renderOptions).toRender([0, 0, 0, 255]);

        tileset.style = new Cesium3DTileStyle({
          show: "${temperature} > 0.1",
        });
        expect(renderOptions).notToRender([0, 0, 0, 255]);

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("renders pnts with style using point cloud properties (unicode)", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithUnicodePropertyIdsUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        tileset.style = new Cesium3DTileStyle({
          color: "color() * ${temperature_}",
        });

        expect(renderOptions).toRenderAndCall(function (rgba) {
          // Pixel color is some shade of gray
          expect(rgba[0]).toBe(rgba[1]);
          expect(rgba[0]).toBe(rgba[2]);
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[0]).toBeLessThan(255);
        });

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("renders pnts with style and normals", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudNormalsUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        tileset.style = new Cesium3DTileStyle({
          color: 'color("red")',
          pointSize: 5.0,
        });

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[0]).toBeLessThan(255);
          expect(rgba[1]).toBe(0);
          expect(rgba[2]).toBe(0);
          expect(rgba[3]).toBe(255);
        });

        // Remove style
        tileset.style = undefined;
        expect(renderOptions).notToRender([0, 0, 0, 255]);
      });

      it("throws if style references the NORMAL semantic for pnts without normals", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        // Verify render without style
        Cesium3DTilesTester.expectRender(scene, tileset);

        tileset.style = new Cesium3DTileStyle({
          color: "${NORMAL}[0] > 0.5",
        });

        expect(function () {
          scene.renderForSpecs();
        }).toThrowError(RuntimeError);
      });

      it("picks", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudRGBUrl,
        );
        const content = tileset.root.content;
        tileset.show = false;
        expect(scene).toPickPrimitive(undefined);
        tileset.show = true;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.primitive).toBe(tileset);
          expect(result.content).toBe(content);
        });
      });

      it("picks based on batchId", async function () {
        await Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl);

        // Get the original color
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        // Change the color of the picked feature to yellow
        expect(scene).toPickAndCall(function (first) {
          expect(first).toBeDefined();

          first.color = Color.clone(Color.YELLOW, first.color);

          // Expect the pixel color to be some shade of yellow
          expect(scene).notToRender(color);

          // Turn show off. Expect a different feature to get picked.
          first.show = false;
          expect(scene).toPickAndCall(function (second) {
            expect(second).toBeDefined();
            expect(second).not.toBe(first);
          });
        });
      });

      it("point cloud without batch table works", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudRGBUrl,
        );
        const content = tileset.root.content;
        expect(content.featuresLength).toBe(0);
        expect(content.innerContents).toBeUndefined();
        expect(content.hasProperty(0, "name")).toBe(false);
        expect(function () {
          return content.getFeature(0);
        }).toThrowDeveloperError();
      });

      it("batched point cloud works", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudBatchedUrl,
        );

        const content = tileset.root.content;
        expect(content.featuresLength).toBe(8);
        expect(content.innerContents).toBeUndefined();
        expect(content.hasProperty(0, "name")).toBe(true);
        expect(content.getFeature(0)).toBeDefined();
      });

      it("point cloud with per-point properties work", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl,
        );

        const content = tileset.root.content;
        expect(content.featuresLength).toBe(0);
        expect(content.innerContents).toBeUndefined();
      });

      it("Supports back face culling when there are per-point normals", async function () {
        // Since this test relies on picking, it will not work properly with webglStub
        if (webglStub) {
          return;
        }

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudBatchedUrl,
        );

        // Get the number of picked sections with back face culling on
        let pickedCountCulling = 0;
        let pickedCount = 0;

        // Set culling to true
        tileset.pointCloudShading.backFaceCulling = true;

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          pickedCountCulling = pickedObjects.length;
        });

        // Set culling to false
        tileset.pointCloudShading.backFaceCulling = false;

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          pickedCount = pickedObjects.length;
        });

        expect(pickedCount).toBeGreaterThan(pickedCountCulling);
      });

      it("gets memory usage", async function () {
        const promises = [
          Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl),
          Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl),
          Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsUrl),
          Cesium3DTilesTester.loadTileset(
            scene,
            pointCloudQuantizedOctEncodedUrl,
          ),
        ];

        // 1000 points
        const expectedGeometryMemory = [
          1000 * 12, // 3 floats (xyz)
          1000 * 15, // 3 floats (xyz), 3 bytes (rgb)
          1000 * 27, // 3 floats (xyz), 3 bytes (rgb), 3 floats (normal)
          1000 * 11, // 3 shorts (quantized xyz), 3 bytes (rgb), 2 bytes (oct-encoded normal)
        ];

        const tilesets = await Promise.all(promises);
        const length = tilesets.length;
        for (let i = 0; i < length; ++i) {
          const content = tilesets[i].root.content;
          expect(content.geometryByteLength).toEqual(expectedGeometryMemory[i]);
          expect(content.texturesByteLength).toEqual(0);
        }
      });

      it("picks from i3dm batch table", async function () {
        setCamera(centerLongitude, centerLatitude, 25.0);

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchTableUrl,
        );

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

      it("gets memory usage for batch point cloud", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudBatchedUrl,
        );

        const content = tileset.root.content;

        // Point cloud consists of positions, colors, normals, and batchIds
        // 3 floats (xyz), 3 floats (normal), 1 byte (batchId)
        const pointCloudGeometryMemory = 1000 * 25;

        // 2 properties each with 8 features each
        // dimensions: VEC3 of FLOAT
        // id: UNSIGNED_INT
        const binaryPropertyMemory = 8 * (12 + 4);

        // One RGBA byte pixel per feature
        const batchTexturesByteLength = content.featuresLength * 4;
        const pickTexturesByteLength = content.featuresLength * 4;

        // Features have not been picked or colored yet, so the batch table contribution is 0.
        expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
        expect(content.texturesByteLength).toEqual(0);
        expect(content.batchTableByteLength).toEqual(binaryPropertyMemory);

        // Color a feature and expect the texture memory to increase
        content.getFeature(0).color = Color.RED;
        scene.renderForSpecs();
        expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
        expect(content.texturesByteLength).toEqual(0);
        expect(content.batchTableByteLength).toEqual(
          binaryPropertyMemory + batchTexturesByteLength,
        );

        // Pick the tile and expect the texture memory to increase
        scene.pickForSpecs();
        expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
        expect(content.texturesByteLength).toEqual(0);
        expect(content.batchTableByteLength).toEqual(
          binaryPropertyMemory +
            batchTexturesByteLength +
            pickTexturesByteLength,
        );
      });
    });

    describe("point cloud attenuation", function () {
      let noAttenuationPixelCount;
      async function attenuationTest(postLoadCallback) {
        const scene = createScene({
          canvas: createCanvas(10, 10),
        });
        scene.msaaSamples = 1;
        noAttenuationPixelCount = scene.logarithmicDepthBuffer ? 20 : 16;
        const center = Cartesian3.fromRadians(
          centerLongitude,
          centerLatitude,
          5.0,
        );
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
        scene.postProcessStages.fxaa.enabled = false;
        scene.camera.zoomIn(6);

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudNoColorUrl,
        );

        tileset.pointCloudShading.eyeDomeLighting = false;
        tileset.root.refine = Cesium3DTileRefine.REPLACE;
        postLoadCallback(scene, tileset);
        scene.destroyForSpecs();
      }

      it("attenuates points based on geometric error", async function () {
        await attenuationTest(function (scene, tileset) {
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 1.0;
          tileset.pointCloudShading.maximumAttenuation = undefined;
          tileset.pointCloudShading.baseResolution = undefined;
          tileset.maximumScreenSpaceError = 16;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toBeGreaterThan(noAttenuationPixelCount);
          });
        });
      });

      it("modulates attenuation using the tileset screen space error", async function () {
        await attenuationTest(function (scene, tileset) {
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 1.0;
          tileset.pointCloudShading.maximumAttenuation = undefined;
          tileset.pointCloudShading.baseResolution = undefined;
          tileset.maximumScreenSpaceError = 1;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toEqual(noAttenuationPixelCount);
          });
        });
      });

      it("modulates attenuation using the maximumAttenuation parameter", async function () {
        await attenuationTest(function (scene, tileset) {
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 1.0;
          tileset.pointCloudShading.maximumAttenuation = 1;
          tileset.pointCloudShading.baseResolution = undefined;
          tileset.maximumScreenSpaceError = 16;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toEqual(noAttenuationPixelCount);
          });
        });
      });

      it("modulates attenuation using the baseResolution parameter", async function () {
        await attenuationTest(function (scene, tileset) {
          // pointCloudNoColorUrl is a single tile with GeometricError = 0,
          // which results in default baseResolution being computed
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 1.0;
          tileset.pointCloudShading.maximumAttenuation = undefined;
          tileset.pointCloudShading.baseResolution = 0.2;
          tileset.maximumScreenSpaceError = 16;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toEqual(noAttenuationPixelCount);
          });
        });
      });

      it("modulates attenuation using the geometricErrorScale parameter", async function () {
        await attenuationTest(function (scene, tileset) {
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 0.2;
          tileset.pointCloudShading.maximumAttenuation = undefined;
          tileset.pointCloudShading.baseResolution = 1.0;
          tileset.maximumScreenSpaceError = 1;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toEqual(noAttenuationPixelCount);
          });
        });
      });

      it("attenuates points based on geometric error in 2D", async function () {
        await attenuationTest(function (scene, tileset) {
          scene.morphTo2D(0);
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.geometricErrorScale = 1.0;
          tileset.pointCloudShading.maximumAttenuation = undefined;
          tileset.pointCloudShading.baseResolution = undefined;
          tileset.maximumScreenSpaceError = 16;
          expect(scene).toRenderPixelCountAndCall(function (pixelCount) {
            expect(pixelCount).toBeGreaterThan(noAttenuationPixelCount);
          });
        });
      });
    });

    describe("glTF", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 100.0);
      });

      it("becomes ready with glb", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          glbContentUrl,
        );
        expect(tileset.root.contentReady).toBeTrue();
        expect(tileset.root.content).toBeDefined();
      });

      it("becomes ready with glTF", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          gltfContentUrl,
        );
        expect(tileset.root.contentReady).toBeTrue();
        expect(tileset.root.content).toBeDefined();
      });

      it("renders glb content", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          glbContentUrl,
        );
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("renders glTF content", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl,
        );

        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("throws when calling getFeature without a feature table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          gltfContentUrl,
        );
        const content = tileset.root.content;
        expect(function () {
          content.getFeature(0);
        }).toThrowDeveloperError();
      });

      it("throws when calling getFeature with invalid index", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl,
        );

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
      });

      it("picks from glTF", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          gltfContentUrl,
        );
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

          expect(function () {
            return content.getFeature(0);
          }).toThrowDeveloperError();
        });
      });

      it("picks from glTF feature table", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl,
        );

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
      });

      it("destroys glTF content", async function () {
        await Cesium3DTilesTester.tileDestroys(scene, buildingsMetadataUrl);
      });
    });

    describe("tileset.preloadWhenHidden", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
      });

      it("renders correctly when tileset starts hidden and tileset.preloadWhenHidden is true", async function () {
        const tilesetOptions = {
          show: false,
          preloadWhenHidden: true,
        };

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          noBatchIdsUrl,
          tilesetOptions,
        );

        // expectRender() renders twice, first with tileset.show = false,
        // then with tileset.show = true.
        //
        // When tileset.preloadWhenHidden is true, the model has loaded by
        // this point. It will only render when tileset.show = true
        Cesium3DTilesTester.expectRender(scene, tileset);
      });

      it("does not render when tileset starts hidden and tileset.preloadWhenHidden is false", async function () {
        const tilesetOptions = {
          show: false,
          preloadWhenHidden: false,
        };

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          noBatchIdsUrl,
          tilesetOptions,
        );

        // expectRenderBlank() renders twice, first with tileset.show = false,
        // then with tileset.show = true.
        //
        // When tileset.preloadWhenHidden is false, the model has not loaded
        // by this point. Regardless of tileset.show, the tile should not be
        // rendered.
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);
      });
    });

    describe("clipping planes", function () {
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
      });

      it("Links model to tileset clipping planes based on bounding volume clipping", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        const tile = tileset.root;
        const content = tile.content;
        const model = content._model;
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER,
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
      });

      it("Links model to tileset clipping planes if tileset clipping planes are reassigned", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        const tile = tileset.root;
        const model = tile.content._model;
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER,
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
      });

      it("replaces clipping planes collection with one of the same length", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        const tile = tileset.root;
        const model = tile.content._model;
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER,
        );

        expect(model.clippingPlanes).toBeUndefined();

        spyOn(model, "resetDrawCommands");

        const clippingPlaneCollection = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        tileset.clippingPlanes = clippingPlaneCollection;
        tile.update(tileset, scene.frameState, passOptions);

        expect(model.resetDrawCommands).toHaveBeenCalled();
        expect(model.resetDrawCommands.calls.count()).toBe(1);

        const newClippingPlaneCollection = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        tileset.clippingPlanes = newClippingPlaneCollection;
        tile.update(tileset, scene.frameState, passOptions);

        expect(model.resetDrawCommands.calls.count()).toBe(2);
      });

      it("clipping planes selectively disable rendering", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        const clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -10.0);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [clipPlane],
        });

        expect(scene).notToRender(color);

        clipPlane.distance = 5.0;

        expect(scene).toRender(color);
      });

      it("clipping planes apply edge styling", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        const clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -10.0);
        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [clipPlane],
          modelMatrix: FixedFrameTransforms.eastNorthUpToFixedFrame(
            tileset.boundingSphere.center,
          ),
          edgeWidth: 20.0,
          edgeColor: Color.RED,
        });

        expect(scene).notToRender(color);
      });

      it("clipping planes union regions (Uint8)", async function () {
        // Force uint8 mode - there's a slight rendering difference between
        // float and packed uint8 clipping planes for this test due to the small context
        spyOn(ClippingPlaneCollection, "useFloatTexture").and.returnValue(
          false,
        );
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, 0.0),
            new ClippingPlane(Cartesian3.UNIT_X, 0.0),
          ],
          modelMatrix: FixedFrameTransforms.eastNorthUpToFixedFrame(
            tileset.boundingSphere.center,
          ),
          unionClippingRegions: true,
        });

        expect(scene).notToRender(color);

        tileset.clippingPlanes.unionClippingRegions = false;

        expect(scene).toRender(color);
      });

      it("clipping planes union regions (Float)", async function () {
        if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
          // This configuration for the test fails in uint8 mode due to the small context
          return;
        }
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        tileset.clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, -10.0),
            new ClippingPlane(Cartesian3.UNIT_X, 1.0),
          ],
          modelMatrix: FixedFrameTransforms.eastNorthUpToFixedFrame(
            tileset.boundingSphere.center,
          ),
          unionClippingRegions: true,
        });

        expect(scene).notToRender(color);

        tileset.clippingPlanes.unionClippingRegions = false;

        expect(scene).toRender(color);
      });
    });

    describe("clipping polygons", function () {
      const positions = Cartesian3.fromRadiansArray([
        centerLongitude + 0.001,
        centerLatitude + 0.001,
        centerLongitude + 0.001,
        centerLatitude - 0.001,
        centerLongitude - 0.001,
        centerLatitude - 0.001,
        centerLongitude - 0.001,
        centerLatitude + 0.001,
      ]);
      let polygon;
      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        polygon = new ClippingPolygon({ positions });
      });

      it("clipping planes selectively disable rendering", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
        );
        let color;
        expect(scene).toRenderAndCall(function (rgba) {
          color = rgba;
        });

        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        tileset.clippingPolygons = collection;

        expect(scene).notToRender(color);

        collection.inverse = true;

        expect(scene).toRender(color);
      });
    });

    describe("classification", function () {
      let globePrimitive;
      let tilesetPrimitive;
      let reusableGlobePrimitive;
      let reusableTilesetPrimitive;

      function createPrimitive(rectangle, pass) {
        let renderState;
        if (pass === Pass.CESIUM_3D_TILE) {
          renderState = RenderState.fromCache({
            stencilTest: StencilConstants.setCesium3DTileBit(),
            stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
            depthTest: {
              enabled: true,
            },
          });
        }

        const depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(
          new Color(0.0, 0.0, 0.0, 1.0),
        );

        return new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: new RectangleGeometry({
              ellipsoid: Ellipsoid.WGS84,
              rectangle: rectangle,
            }),
            id: "depth rectangle",
            attributes: {
              color: depthColorAttribute,
            },
          }),
          appearance: new PerInstanceColorAppearance({
            translucent: false,
            flat: true,
            renderState: renderState,
          }),
          asynchronous: false,
        });
      }

      function MockPrimitive(primitive, pass) {
        this._primitive = primitive;
        this._pass = pass;
        this.show = true;
      }

      MockPrimitive.prototype.update = function (frameState) {
        if (!this.show) {
          return;
        }

        const commandList = frameState.commandList;
        const startLength = commandList.length;
        this._primitive.update(frameState);

        for (let i = startLength; i < commandList.length; ++i) {
          const command = commandList[i];
          command.pass = this._pass;
        }
      };

      MockPrimitive.prototype.isDestroyed = function () {
        return false;
      };

      MockPrimitive.prototype.destroy = function () {
        return destroyObject(this);
      };

      let modelMatrix;
      beforeAll(function () {
        scene = createScene();

        const translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
          new Cartographic(centerLongitude, centerLatitude),
        );
        Cartesian3.multiplyByScalar(translation, -5.0, translation);
        modelMatrix = Matrix4.fromTranslation(translation);

        const offset = CesiumMath.toRadians(0.01);
        const rectangle = new Rectangle(
          centerLongitude - offset,
          centerLatitude - offset,
          centerLongitude + offset,
          centerLatitude + offset,
        );
        reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
        reusableTilesetPrimitive = createPrimitive(
          rectangle,
          Pass.CESIUM_3D_TILE,
        );
      });

      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);

        // wrap rectangle primitive so it gets executed during the globe pass
        // and 3D Tiles pass to lay down depth
        globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
        tilesetPrimitive = new MockPrimitive(
          reusableTilesetPrimitive,
          Pass.CESIUM_3D_TILE,
        );

        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);
      });

      afterEach(function () {
        scene.primitives.removeAll();
        globePrimitive =
          globePrimitive &&
          !globePrimitive.isDestroyed() &&
          globePrimitive.destroy();
        tilesetPrimitive =
          tilesetPrimitive &&
          !tilesetPrimitive.isDestroyed() &&
          tilesetPrimitive.destroy();
      });

      afterAll(function () {
        reusableGlobePrimitive.destroy();
        reusableTilesetPrimitive.destroy();
      });

      it("classifies 3D Tiles", async function () {
        setCamera(centerLongitude, centerLatitude, 15.0);

        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
          {
            classificationType: ClassificationType.CESIUM_3D_TILE,
            modelMatrix: modelMatrix,
          },
        );

        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });

      it("classifies globe", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
          {
            classificationType: ClassificationType.TERRAIN,
            modelMatrix: modelMatrix,
          },
        );

        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });

      it("classifies both 3D Tiles and globe", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableUrl,
          {
            classificationType: ClassificationType.BOTH,
            modelMatrix: modelMatrix,
          },
        );

        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
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

      beforeEach(function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
      });

      it("assigns group metadata", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl,
        );

        const content = tileset.root.content;
        content.group = new Cesium3DContentGroup({ metadata: groupMetadata });
        expect(content.group.metadata).toBe(groupMetadata);
      });

      it("assigns metadata", async function () {
        const tileset = await Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl,
        );

        const content = tileset.root.content;
        content.metadata = contentMetadata;
        expect(content.metadata).toBe(contentMetadata);
      });
    });
  },
  "WebGL",
);
