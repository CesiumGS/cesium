import {
  ImplicitSubdivisionScheme,
  ImplicitSubtree,
  ImplicitTileCoordinates,
  ImplicitTileset,
  MetadataClass,
  MetadataSchema,
  Resource,
  TileMetadata,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/TileMetadata", function () {
  var tileClass = new MetadataClass({
    id: "tile",
    class: {
      properties: {
        color: {
          type: "ARRAY",
          componentType: "FLOAT32",
          componentCount: 8,
          semantic: "COLOR",
        },
        isSquare: {
          description:
            "Is a square tile, rather than a rectangular partial tile",
          type: "BOOLEAN",
        },
      },
    },
  });

  it("options.tileMetadata and options.implicitSubtree are mutually exclusive", function () {
    // neither specified
    expect(function () {
      return new TileMetadata({
        class: tileClass,
      });
    }).toThrowDeveloperError();

    // both specified
    expect(function () {
      return new TileMetadata({
        tileMetadata: {},
        implicitSubtree: {},
        class: tileClass,
      });
    }).toThrowDeveloperError();
  });

  describe("explicit tile metadata", function () {
    var tileExtension = {
      class: "tile",
      properties: {
        color: [1.0, 0.5, 0.0],
        isSquare: true,
      },
    };

    var tileMetadata;
    beforeEach(function () {
      tileMetadata = new TileMetadata({
        tile: tileExtension,
        class: tileClass,
      });
    });

    it("creates tile metadata with default values", function () {
      var metadata = new TileMetadata({
        tile: {},
      });

      expect(metadata.class).toBeUndefined();
      expect(metadata.properties).toBeUndefined();
      expect(metadata.extras).toBeUndefined();
      expect(metadata.extensions).toBeUndefined();
    });

    it("creates tile metadata", function () {
      var properties = {
        color: [0.0, 0.0, 1.0],
        isSquare: false,
      };

      var extras = {
        version: "0.0",
      };

      var extensions = {
        "3DTILES_extension": {},
      };
      tileMetadata = new TileMetadata({
        tile: {
          class: "tile",
          properties: properties,
          extras: extras,
          extensions: extensions,
        },
        class: tileClass,
      });
      expect(tileMetadata.class).toBe(tileClass);
      expect(tileMetadata.properties).toBe(properties);
      expect(tileMetadata.extras).toBe(extras);
      expect(tileMetadata.extensions).toBe(extensions);
    });

    it("hasProperty returns true if a property exists", function () {
      expect(tileMetadata.hasProperty("color")).toBe(true);
    });

    it("hasProperty returns false if a property does not exist", function () {
      expect(tileMetadata.hasProperty("numberOfPoints")).toBe(false);
    });

    it("getPropertyIds returns array of property IDs", function () {
      var propertyIds = tileMetadata.getPropertyIds([]);
      propertyIds.sort();
      expect(propertyIds).toEqual(["color", "isSquare"]);
    });

    it("getProperty returns undefined if a property does not exist", function () {
      expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
    });

    it("getProperty returns the property value", function () {
      expect(tileMetadata.getProperty("color")).toEqual([1.0, 0.5, 0.0]);
      expect(tileMetadata.getProperty("isSquare")).toBe(true);
    });

    it("setProperty creates property if it doesn't exist", function () {
      expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
      tileMetadata.setProperty("numberOfPoints", 10);
      expect(tileMetadata.getProperty("numberOfPoints")).toBe(10);
    });

    it("setProperty sets property value", function () {
      expect(tileMetadata.getProperty("isSquare")).toBe(true);
      tileMetadata.setProperty("isSquare", false);
      expect(tileMetadata.getProperty("isSquare")).toBe(false);
    });

    it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
      expect(
        tileMetadata.getPropertyBySemantic("HORIZON_OCCLUSION_POINT")
      ).not.toBeDefined();
    });

    it("getPropertyBySemantic returns the property value", function () {
      expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
        1.0,
        0.5,
        0.0,
      ]);
    });

    it("setPropertyBySemantic sets property value", function () {
      expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
        1.0,
        0.5,
        0.0,
      ]);
      tileMetadata.setPropertyBySemantic("COLOR", [0.0, 0.0, 0.0]);
      expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
        0.0,
        0.0,
        0.0,
      ]);
    });

    it("setPropertyBySemantic doesn't set property value when there's no matching semantic", function () {
      expect(tileMetadata.getPropertyBySemantic("NAME")).not.toBeDefined();
      tileMetadata.setPropertyBySemantic("NAME", "Test Tile");
      expect(tileMetadata.getPropertyBySemantic("NAME")).not.toBeDefined();
    });
  });

  describe("implicit tile metadata", function () {
    var highlightColors = [
      [255, 0, 0],
      [255, 255, 0],
      [255, 0, 255],
    ];

    var buildingCounts = [100, 350, 200];

    var tileTableDescription = {
      class: "tile",
      properties: {
        highlightColor: highlightColors,
        buildingCount: buildingCounts,
      },
    };

    var schema = {
      classes: {
        tile: {
          properties: {
            highlightColor: {
              type: "ARRAY",
              componentType: "UINT8",
              componentCount: 3,
              semantic: "_HIGHLIGHT_COLOR",
            },
            buildingCount: {
              type: "UINT16",
            },
          },
        },
      },
    };

    var featureTablesDescription = {
      schema: schema,
      featureTables: {
        tiles: tileTableDescription,
      },
    };

    var subtreeDescription = {
      tileAvailability: {
        descriptor: "10011",
        lengthBits: 5,
        isInternal: true,
        includeAvailableCount: true,
      },
      contentAvailability: [
        {
          descriptor: "10011",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 0,
        lengthBits: 16,
        isInternal: true,
      },
      metadata: {
        isInternal: true,
        featureTables: featureTablesDescription,
      },
    };

    var bufferResults = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var tilesetResource = new Resource({
      url: "https://example.com/tileset.json",
    });

    var subtreeResource = new Resource({
      url: "https://example.com/test.subtree",
    });

    var mockTilesetWithMetadata = {
      metadata: {
        schema: new MetadataSchema(schema),
      },
    };

    var implicitQuadtreeJson = {
      geometricError: 500,
      refine: "ADD",
      boundingVolume: {
        region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
      },
      content: {
        uri: "https://example.com/{level}/{x}/{y}.b3dm",
      },
      extensions: {
        "3DTILES_implicit_tiling": {
          subdivisionScheme: "QUADTREE",
          subtreeLevels: 2,
          maximumLevel: 1,
          subtrees: {
            uri: "https://example.com/{level}/{x}/{y}.subtree",
          },
        },
      },
    };

    var metadataQuadtree = new ImplicitTileset(
      mockTilesetWithMetadata,
      tilesetResource,
      implicitQuadtreeJson
    );

    var rootCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      x: 0,
      y: 0,
      level: 0,
    });

    var implicitCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      x: 0,
      y: 1,
      level: 1,
    });

    var subtree;
    beforeAll(function (done) {
      subtree = new ImplicitSubtree(
        subtreeResource,
        bufferResults.subtreeBuffer,
        metadataQuadtree,
        rootCoordinates
      );

      subtree.readyPromise.then(function () {
        done();
      });
    });

    var tileMetadata;
    beforeEach(function () {
      tileMetadata = new TileMetadata({
        implicitSubtree: subtree,
        implicitCoordinates: implicitCoordinates,
        class: tileClass,
      });
    });

    it("creates tile metadata", function () {
      tileMetadata = new TileMetadata({
        implicitSubtree: subtree,
        implicitCoordinates: implicitCoordinates,
        class: tileClass,
      });
      expect(tileMetadata.class).toBe(tileClass);
      expect(tileMetadata.properties).toEqual({});
      expect(tileMetadata.extras).toBe(undefined);
      expect(tileMetadata.extensions).toBe(undefined);
    });

    it("hasProperty returns true if a property exists", function () {
      expect(tileMetadata.hasProperty("highlightColor")).toBe(true);
    });

    it("hasProperty returns false if a property does not exist", function () {
      expect(tileMetadata.hasProperty("numberOfPoints")).toBe(false);
    });

    it("getPropertyIds returns array of property IDs", function () {
      var propertyIds = tileMetadata.getPropertyIds([]);
      propertyIds.sort();
      expect(propertyIds).toEqual(["buildingCount", "highlightColor"]);
    });

    it("getProperty returns undefined if a property does not exist", function () {
      expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
    });

    it("getProperty returns the property value", function () {
      expect(tileMetadata.getProperty("highlightColor")).toEqual([255, 255, 0]);
      expect(tileMetadata.getProperty("buildingCount")).toBe(350);
    });

    it("setProperty does not create property if it doesn't exist", function () {
      expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
      tileMetadata.setProperty("numberOfPoints", 10);
      expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
    });

    it("setProperty sets property value", function () {
      expect(tileMetadata.getProperty("buildingCount")).toBe(350);
      tileMetadata.setProperty("buildingCount", 400);
      expect(tileMetadata.getProperty("buildingCount")).toBe(400);
    });

    it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
      expect(
        tileMetadata.getPropertyBySemantic("HORIZON_OCCLUSION_POINT")
      ).not.toBeDefined();
    });

    it("getPropertyBySemantic returns the property value", function () {
      expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual([
        255,
        255,
        0,
      ]);
    });

    it("setPropertyBySemantic sets property value", function () {
      expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual([
        255,
        255,
        0,
      ]);
      tileMetadata.setPropertyBySemantic("_HIGHLIGHT_COLOR", [0, 0, 0]);
      expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual([
        0,
        0,
        0,
      ]);
    });

    it("setPropertyBySemantic doesn't set property value when there's no matching semantic", function () {
      expect(tileMetadata.getPropertyBySemantic("NAME")).not.toBeDefined();
      tileMetadata.setPropertyBySemantic("NAME", "Test Tile");
      expect(tileMetadata.getPropertyBySemantic("NAME")).not.toBeDefined();
    });
  });
});
