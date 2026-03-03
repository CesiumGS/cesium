import {
  Cesium3DTilesetFootprintGenerator,
  Cartesian3,
  defined,
  EntityCollection,
  Event,
} from "../../index.js";

describe("DataSources/Cesium3DTilesetFootprintGenerator", function () {
  // --- Mock helpers ---

  // Default quad positions for mock features (when none explicitly provided)
  const defaultFeaturePositions = Cartesian3.fromDegreesArray([
    -75.0, 40.0,
    -74.0, 40.0,
    -74.0, 41.0,
    -75.0, 41.0,
  ]);

  function createMockContent(featuresLength, featurePositions) {
    const features = [];
    for (let i = 0; i < featuresLength; i++) {
      const positionsForFeature =
        defined(featurePositions) && defined(featurePositions[i])
          ? featurePositions[i]
          : defaultFeaturePositions;
      features.push({
        featureId: i,
        _batchId: i,
        _content: null, // back-reference set below
        getProperty: function () {
          return undefined;
        },
        getPositions: function () {
          return positionsForFeature;
        },
      });
    }
    const content = {
      featuresLength: featuresLength,
      url: "mock://tileset/tile.b3dm",
      getFeature: function (index) {
        return features[index];
      },
      getPositions: function () {
        const map = new Map();
        for (let j = 0; j < features.length; j++) {
          const pos = features[j].getPositions();
          if (defined(pos)) {
            map.set(j, pos);
          }
        }
        return map;
      },
      _tile: null,
    };
    for (let i = 0; i < features.length; i++) {
      features[i]._content = content;
    }
    return content;
  }

  function createMockTile(options) {
    options = options || {};
    const content = defined(options.featuresLength)
      ? createMockContent(options.featuresLength, options.featurePositions)
      : undefined;

    const tile = {
      content: content,
      contentReady: true,
      children: options.children || [],
      _depth: options.depth || 0,
      _x: options.x || 0,
      _y: options.y || 0,
      _z: options.z || 0,
      boundingVolume: {
        boundingVolume: {
          center: Cartesian3.fromDegrees(-75.0, 40.0, 0),
          radius: 500.0,
        },
      },
    };

    if (defined(content)) {
      content._tile = tile;
    }

    return tile;
  }

  function createMockTileset(options) {
    options = options || {};
    const root = options.root || createMockTile({ featuresLength: 3 });

    return {
      root: root,
      tileLoad: new Event(),
      tileUnload: new Event(),
      allTilesLoaded: new Event(),
    };
  }

  // --- Tests ---

  describe("constructor", function () {
    it("stores constructor options", function () {
      const tileset = createMockTileset();
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
        hullMethod: "boundary",
      });

      expect(generator.tileset).toBe(tileset);
      expect(generator._hullMethod).toEqual("boundary");
    });

    it("uses default option values", function () {
      const tileset = createMockTileset();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: new EntityCollection(),
      });

      expect(generator._hullMethod).toEqual("convexHull");
    });

    it("throws without options", function () {
      expect(function () {
        return new Cesium3DTilesetFootprintGenerator(undefined);
      }).toThrowDeveloperError();
    });

    it("throws without tileset", function () {
      expect(function () {
        return new Cesium3DTilesetFootprintGenerator({});
      }).toThrowDeveloperError();
    });
  });

  describe("properties", function () {
    it("reports footprintCount as 0 initially", function () {
      const tileset = createMockTileset();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: new EntityCollection(),
      });
      expect(generator.footprintCount).toEqual(0);
    });
  });

  describe("filterFeature", function () {
    it("creates footprints for loaded tiles", function () {
      const root = createMockTile({ featuresLength: 2 });
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      expect(generator.footprintCount).toBeGreaterThan(0);
      expect(entities.values.length).toBeGreaterThan(0);
    });

    it("traverses child tiles", function () {
      const child = createMockTile({ featuresLength: 1, depth: 1 });
      // Give child a different URL
      child.content.url = "mock://tileset/child.b3dm";
      const root = createMockTile({ featuresLength: 1, children: [child] });
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      // Should have footprints from both tiles
      expect(generator.footprintCount).toBeGreaterThan(1);
    });

    it("skips tiles without content", function () {
      const root = createMockTile({});
      root.content = undefined;
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      expect(generator.footprintCount).toEqual(0);
    });

    it("raises footprintsGenerated event", function () {
      const tileset = createMockTileset();
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      const spy = jasmine.createSpy("footprintsGenerated");
      generator.footprintsGenerated.addEventListener(spy);

      generator.generate();

      expect(spy).toHaveBeenCalled();
    });

    it("does not duplicate footprints on second call", function () {
      const tileset = createMockTileset();
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();
      const countAfterFirst = generator.footprintCount;

      generator.generate();
      expect(generator.footprintCount).toEqual(countAfterFirst);
    });

    it("throws when destroyed", function () {
      const tileset = createMockTileset();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: new EntityCollection(),
      });
      generator.destroy();

      expect(function () {
        generator.generate();
      }).toThrowDeveloperError();
    });
  });

  describe("filterFeature", function () {
    it("skips features rejected by the filter", function () {
      const tileset = createMockTileset();
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
        filterFeature: function (feature) {
          return feature.featureId !== 1;
        },
      });

      generator.generate();

      // Feature 1 should be filtered out — the root has 3 features,
      // so we expect fewer footprints
      const allIds = [];
      for (const [key] of generator._footprintMap) {
        allIds.push(key);
      }
      const hasFeature1 = allIds.some(function (k) {
        return k.endsWith("#1");
      });
      expect(hasFeature1).toBe(false);
    });
  });

  describe("clear", function () {
    it("removes all footprints and resets state", function () {
      const tileset = createMockTileset();
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();
      expect(generator.footprintCount).toBeGreaterThan(0);

      generator.clear();
      expect(generator.footprintCount).toEqual(0);
      expect(entities.values.length).toEqual(0);
    });
  });

  describe("destroy", function () {
    it("cleans up and marks as destroyed", function () {
      const tileset = createMockTileset();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: new EntityCollection(),
      });

      expect(generator.isDestroyed()).toBe(false);

      generator.destroy();
      expect(generator.isDestroyed()).toBe(true);
    });
  });

  describe("vertex extraction via getPositions", function () {
    it("uses getPositions when vertex data is available", function () {
      // Create a feature with real vertex positions (a simple quad)
      const positions = Cartesian3.fromDegreesArray([
        -75.0, 40.0,
        -74.0, 40.0,
        -74.0, 41.0,
        -75.0, 41.0,
      ]);
      const root = createMockTile({
        featuresLength: 1,
        featurePositions: { 0: positions },
      });
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      expect(generator.footprintCount).toEqual(1);
      expect(entities.values.length).toEqual(1);

      // The polygon should have positions derived from the convex hull
      const polygon = entities.values[0].polygon;
      expect(polygon).toBeDefined();
      const hierarchy = polygon.hierarchy.getValue();
      expect(hierarchy.positions.length).toBeGreaterThanOrEqual(3);
    });

    it("skips features without vertex data", function () {
      // Feature 0 has positions, feature 1 returns undefined
      const root = createMockTile({
        featuresLength: 2,
        featurePositions: { 0: defaultFeaturePositions, 1: undefined },
      });
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      // Only feature 0 should have a footprint
      expect(generator.footprintCount).toEqual(1);
    });

    it("skips features with fewer than 3 positions", function () {
      // Feature has only 2 positions — not enough for a polygon
      const positions = Cartesian3.fromDegreesArray([
        -75.0, 40.0,
        -74.0, 40.0,
      ]);
      const root = createMockTile({
        featuresLength: 1,
        featurePositions: { 0: positions },
      });
      const tileset = createMockTileset({ root: root });
      const entities = new EntityCollection();
      const generator = new Cesium3DTilesetFootprintGenerator({
        tileset: tileset,
        entityCollection: entities,
      });

      generator.generate();

      // Should be skipped — not enough positions for a polygon
      expect(generator.footprintCount).toEqual(0);
    });
  });
});
