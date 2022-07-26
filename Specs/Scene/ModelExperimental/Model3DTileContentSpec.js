import {
  Cartesian3,
  Cesium3DContentGroup,
  Cesium3DTileStyle,
  ContentMetadata,
  defaultValue,
  defined,
  ExperimentalFeatures,
  GroupMetadata,
  HeadingPitchRange,
  MetadataClass,
  RuntimeError,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";

describe(
  "Scene/ModelExperimental/Model3DTileContent",
  function () {
    const gltfContentUrl = "./Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
    const glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
    const buildingsMetadataUrl =
      "./Data/Cesium3DTiles/Metadata/StructuralMetadata/tileset.json";
    const withBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const withBatchTableBinaryUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json";
    const withoutBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
    const noBatchIdsUrl =
      "Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";
    const instancedWithBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
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

    describe("geoJSON", function () {
      function rendersGeoJson(url) {
        setCamera(centerLongitude, centerLatitude, 1.0);
        return Cesium3DTilesTester.loadTileset(scene, url).then(function (
          tileset
        ) {
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

      function picksGeoJson(url, hasProperties, expectedFeatureId) {
        expectedFeatureId = defaultValue(expectedFeatureId, 0);
        setCamera(centerLongitude, centerLatitude, 1.0);
        return Cesium3DTilesTester.loadTileset(scene, url).then(function (
          tileset
        ) {
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
    });

    describe("b3dm", function () {
      it("resolves readyPromise with b3dm", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.resolvesReadyPromise(
          scene,
          withBatchTableUrl
        );
      });

      it("renders b3dm content with batch table", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
          function (tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
          }
        );
      });

      it("renders b3dm with a binary batch table", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withBatchTableBinaryUrl
        ).then(function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
      });

      it("renders b3dm content without batch table", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
        ).then(function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
      });

      it("renders b3dm content without features", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(
          function (tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
          }
        );
      });

      it("destroys b3dm content", function () {
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
      });

      it("picks from b3dm", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
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
            expect(featureId).toBe(0);
            expect(content.hasProperty(featureId, "id")).toBe(false);
            expect(content.getFeature(featureId)).toBeDefined();
          });
        });
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
    });

    describe("i3dm", function () {
      it("resolves readyPromise with i3dm", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.resolvesReadyPromise(
          scene,
          instancedWithBatchTableUrl
        );
      });

      it("renders i3dm content", function () {
        setCamera(centerLongitude, centerLatitude, 25.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          instancedWithBatchTableUrl
        ).then(function (tileset) {
          Cesium3DTilesTester.expectRender(scene, tileset);
        });
      });

      it("picks from i3dm batch table", function () {
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
    });

    describe("pnts", function () {
      const pointCloudNormalsUrl =
        "./Data/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json";
      const pointCloudWithPerPointPropertiesUrl =
        "./Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/tileset.json";
      const pointCloudWithUnicodePropertyIdsUrl =
        "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyIds/tileset.json";
      it("renders pnts content", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          Cesium3DTilesTester.expectRender(scene, tileset);
        });
      });

      it("renders pnts with color style", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          // Solid red color
          tileset.style = new Cesium3DTileStyle({
            color: 'color("red")',
          });
          expect(scene).toRender([255, 0, 0, 255]);

          // Applies translucency
          tileset.style = new Cesium3DTileStyle({
            color: "rgba(255, 0, 0, 0.005)",
          });
          expect(scene).toRenderAndCall(function (rgba) {
            // Pixel is a darker red
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toBeLessThan(255);
            expect(rgba[1]).toBe(0);
            expect(rgba[2]).toBe(0);
            expect(rgba[3]).toBe(255);
          });

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with show style", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          // Apply show style that hides all points
          tileset.style = new Cesium3DTileStyle({
            show: false,
          });
          expect(scene).toRender([0, 0, 0, 255]);

          // Apply show style that shows all points
          tileset.style = new Cesium3DTileStyle({
            show: true,
          });
          expect(scene).notToRender([0, 0, 0, 255]);

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with point size style", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          scene.camera.moveDown(5.0);
          Cesium3DTilesTester.expectRenderBlank(scene, tileset);

          // Apply pointSize style
          tileset.style = new Cesium3DTileStyle({
            pointSize: 5.0,
          });
          expect(scene).notToRender([0, 0, 0, 255]);

          // Remove style
          tileset.style = undefined;
          expect(scene).toRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with style using point cloud semantics", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          // Apply color style with semantic
          tileset.style = new Cesium3DTileStyle({
            color: "vec4(${COLOR}[0], 0.0, 0.0, 1.0)",
          });
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBe(0);
            expect(rgba[2]).toBe(0);
            expect(rgba[3]).toBe(255);
          });

          // Apply show style with semantic
          tileset.style = new Cesium3DTileStyle({
            show: "${POSITION}[0] > -50.0",
          });
          expect(scene).notToRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({
            show: "${POSITION}[0] > 50.0",
          });
          expect(scene).toRender([0, 0, 0, 255]);

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with style using point cloud properties", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          // Apply show style with property
          tileset.style = new Cesium3DTileStyle({
            show: "${temperature} > 1.0",
          });
          expect(scene).toRender([0, 0, 0, 255]);

          tileset.style = new Cesium3DTileStyle({
            show: "${temperature} > 0.1",
          });
          expect(scene).notToRender([0, 0, 0, 255]);

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with style using point cloud properties (unicode)", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithUnicodePropertyIdsUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          tileset.style = new Cesium3DTileStyle({
            color: "color() * ${temperature_}",
          });

          expect(scene).toRenderAndCall(function (rgba) {
            // Pixel color is some shade of gray
            expect(rgba[0]).toBe(rgba[1]);
            expect(rgba[0]).toBe(rgba[2]);
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toBeLessThan(255);
          });

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("renders pnts with style and normals", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudNormalsUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          tileset.style = new Cesium3DTileStyle({
            color: 'color("red")',
            pointSize: 5.0,
          });

          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toBeLessThan(255);
            expect(rgba[1]).toBe(0);
            expect(rgba[2]).toBe(0);
            expect(rgba[3]).toBe(255);
          });

          // Remove style
          tileset.style = undefined;
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });

      it("throws if style references the NORMAL semantic for pnts without normals", function () {
        setCamera(centerLongitude, centerLatitude, 5.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          pointCloudWithPerPointPropertiesUrl
        ).then(function (tileset) {
          // Verify render without style
          Cesium3DTilesTester.expectRender(scene, tileset);

          tileset.style = new Cesium3DTileStyle({
            color: "${NORMAL}[0] > 0.5",
          });

          expect(function () {
            scene.renderForSpecs();
          }).toThrowError(RuntimeError);
        });
      });
    });

    describe("glTF", function () {
      it("resolves readyPromise with glb", function () {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, glbContentUrl);
      });

      it("resolves readyPromise with glTF", function () {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, gltfContentUrl);
      });

      it("renders glb content", function () {
        return Cesium3DTilesTester.loadTileset(scene, glbContentUrl).then(
          function (tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
          }
        );
      });

      it("renders glTF content", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
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

      it("picks from glTF feature table", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
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
            expect(featureId).toBe(0);
            expect(content.batchTable).toBeDefined();
            expect(content.hasProperty(featureId, "id")).toBe(true);
            expect(content.getFeature(featureId)).toBeDefined();
          });
        });
      });

      it("destroys glTF content", function () {
        return Cesium3DTilesTester.tileDestroys(scene, buildingsMetadataUrl);
      });
    });

    describe("tileset.preloadWhenHidden", function () {
      it("renders correctly when tileset starts hidden and tileset.preloadWhenHidden is true", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        const tilesetOptions = {
          show: false,
          preloadWhenHidden: true,
        };
        return Cesium3DTilesTester.loadTileset(
          scene,
          noBatchIdsUrl,
          tilesetOptions
        ).then(function (tileset) {
          // expectRender() renders twice, first with tileset.show = false,
          // then with tileset.show = true.
          //
          // When tileset.preloadWhenHidden is true, the model has loaded by
          // this point. It will only render when tileset.show = true
          Cesium3DTilesTester.expectRender(scene, tileset);
        });
      });

      it("does not render when tileset starts hidden and tileset.preloadWhenHidden is false", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        const tilesetOptions = {
          show: false,
          preloadWhenHidden: false,
        };
        return Cesium3DTilesTester.loadTileset(
          scene,
          noBatchIdsUrl,
          tilesetOptions
        ).then(function (tileset) {
          // expectRenderBlank() renders twice, first with tileset.show = false,
          // then with tileset.show = true.
          //
          // When tileset.preloadWhenHidden is false, the model has not loaded
          // by this point. Regardless of tileset.show, the tile should not be
          // rendered.
          Cesium3DTilesTester.expectRenderBlank(scene, tileset);
        });
      });
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
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
        ).then(function (tileset) {
          const content = tileset.root.content;
          content.group = new Cesium3DContentGroup({ metadata: groupMetadata });
          expect(content.group.metadata).toBe(groupMetadata);
        });
      });

      it("assigns metadata", function () {
        setCamera(centerLongitude, centerLatitude, 15.0);
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
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
