import {
  GeoJsonLoader,
  IndexDatatype,
  Matrix4,
  Resource,
  ResourceCache,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/Model/GeoJsonLoader",
  function () {
    const geoJsonMultiPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/MultiPolygon/multiPolygon.geojson";
    const geoJsonPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/Polygon/polygon.geojson";
    const geoJsonPolygonHeightsUrl =
      "./Data/Cesium3DTiles/GeoJson/PolygonHeights/polygonHeights.geojson";
    const geoJsonPolygonHoleUrl =
      "./Data/Cesium3DTiles/GeoJson/PolygonHole/polygonHole.geojson";
    const geoJsonPolygonNoPropertiesUrl =
      "./Data/Cesium3DTiles/GeoJson/PolygonNoProperties/polygonNoProperties.geojson";
    const geoJsonLineStringUrl =
      "./Data/Cesium3DTiles/GeoJson/LineString/lineString.geojson";
    const geoJsonMultiLineStringUrl =
      "./Data/Cesium3DTiles/GeoJson/MultiLineString/multiLineString.geojson";
    const geoJsonMultipleFeaturesUrl =
      "./Data/Cesium3DTiles/GeoJson/MultipleFeatures/multipleFeatures.geojson";

    let scene;
    const geoJsonLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      for (let i = 0; i < geoJsonLoaders.length; i++) {
        const loader = geoJsonLoaders[i];
        if (!loader.isDestroyed()) {
          loader.destroy();
        }
      }
      geoJsonLoaders.length = 0;
      ResourceCache.clearForSpecs();
    });

    function loadGeoJson(geoJsonPath) {
      return Resource.fetchJson({
        url: geoJsonPath,
      }).then(function (json) {
        const loader = new GeoJsonLoader({
          geoJson: json,
        });
        geoJsonLoaders.push(loader);
        loader.load();

        return waitForLoaderProcess(loader, scene);
      });
    }

    function getAttribute(attributes, semantic, setIndex) {
      const attributesLength = attributes.length;
      for (let i = 0; i < attributesLength; ++i) {
        const attribute = attributes[i];
        if (
          attribute.semantic === semantic &&
          attribute.setIndex === setIndex
        ) {
          return attribute;
        }
      }
      return undefined;
    }

    function testLoader(url, expected) {
      return loadGeoJson(url).then(function (loader) {
        const components = loader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const featureIdAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const indices = primitive.indices;
        const material = primitive.material;
        const featureIdAccessor = primitive.featureIds[0];
        const transform = components.transform;
        const structuralMetadata = components.structuralMetadata;
        const propertyTable = structuralMetadata.getPropertyTable(0);

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.buffer.sizeInBytes).toBe(
          expected.vertexCount * 3 * 4
        );
        expect(positionAttribute.count).toBe(expected.vertexCount);
        expect(positionAttribute.min).toBeDefined();
        expect(positionAttribute.max).toBeDefined();

        expect(featureIdAttribute.buffer).toBeDefined();
        expect(featureIdAttribute.buffer.sizeInBytes).toBe(
          expected.vertexCount * 4
        );
        expect(featureIdAttribute.count).toBe(expected.vertexCount);

        expect(indices.buffer).toBeDefined();
        expect(indices.buffer.sizeInBytes).toBe(expected.indexCount * 2);
        expect(indices.count).toBe(expected.indexCount);
        expect(indices.indexDatatype).toBe(IndexDatatype.UNSIGNED_SHORT);

        expect(material.unlit).toBe(true);
        expect(primitive.featureIds.length).toBe(1);

        expect(featureIdAccessor.featureCount).toEqual(expected.featureCount);
        expect(featureIdAccessor.nullFeatureId).not.toBeDefined();
        expect(featureIdAccessor.propertyTableId).toBe(0);
        expect(featureIdAccessor.setIndex).toBe(0);
        expect(featureIdAccessor.positionalLabel).toBe("featureId_0");

        expect(transform).not.toEqual(Matrix4.IDENTITY);

        expect(propertyTable.id).toBe(0);
        expect(propertyTable.count).toBe(expected.featureCount);

        if (expected.hasProperties && expected.featureCount === 1) {
          expect(propertyTable.getProperty(0, "name")).toBe("UL");
          expect(propertyTable.getProperty(0, "code")).toBe(12);
        } else if (expected.hasProperties && expected.featureCount === 2) {
          expect(propertyTable.getProperty(0, "name")).toBe("AL");
          expect(propertyTable.getProperty(0, "code")).toBe(11);
          expect(propertyTable.getProperty(1, "name")).toBe("UL");
          expect(propertyTable.getProperty(1, "code")).toBe(12);
        }
      });
    }

    it("loads GeoJSON MultiPolygon", function () {
      return testLoader(geoJsonMultiPolygonUrl, {
        vertexCount: 10,
        indexCount: 16,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON Polygon", function () {
      return testLoader(geoJsonPolygonUrl, {
        vertexCount: 5,
        indexCount: 8,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON Polygon with heights", function () {
      return testLoader(geoJsonPolygonHeightsUrl, {
        vertexCount: 5,
        indexCount: 8,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON Polygon with hole", function () {
      return testLoader(geoJsonPolygonHoleUrl, {
        vertexCount: 10,
        indexCount: 16,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON Polygon with no properties", function () {
      return testLoader(geoJsonPolygonNoPropertiesUrl, {
        vertexCount: 5,
        indexCount: 8,
        featureCount: 1,
        hasProperties: false,
      });
    });

    it("loads GeoJSON LineString", function () {
      return testLoader(geoJsonLineStringUrl, {
        vertexCount: 5,
        indexCount: 8,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON MultiLineString", function () {
      return testLoader(geoJsonMultiLineStringUrl, {
        vertexCount: 10,
        indexCount: 16,
        featureCount: 1,
        hasProperties: true,
      });
    });

    it("loads GeoJSON with multiple features", function () {
      return testLoader(geoJsonMultipleFeaturesUrl, {
        vertexCount: 10,
        indexCount: 16,
        featureCount: 2,
        hasProperties: true,
      });
    });

    it("destroys GeoJson loader", function () {
      return loadGeoJson(geoJsonPolygonUrl).then(function (loader) {
        expect(loader.components).toBeDefined();
        expect(loader.isDestroyed()).toBe(false);
        loader.destroy();
        expect(loader.components).toBeUndefined();
        expect(loader.isDestroyed()).toBe(true);
      });
    });
  },
  "WebGL"
);
