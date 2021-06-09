import {
  Cartesian3,
  ImplicitSubtree,
  ImplicitTileCoordinates,
  ImplicitTileset,
  ImplicitTileMetadata,
  MetadataClass,
  MetadataSchema,
  Resource,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/ImplicitTileMetadata", function () {
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

  var tileClass = new MetadataClass({
    id: "tile",
    class: schema.classes.tile,
  });

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

  var metadataSchema = mockTilesetWithMetadata.metadata.schema;

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
    tilesetResource,
    implicitQuadtreeJson,
    metadataSchema
  );

  var rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: metadataQuadtree.subdivisionScheme,
    subtreeLevels: metadataQuadtree.subtreeLevels,
    x: 0,
    y: 0,
    level: 0,
  });

  var implicitCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: metadataQuadtree.subdivisionScheme,
    subtreeLevels: metadataQuadtree.subtreeLevels,
    x: 0,
    y: 1,
    level: 1,
  });

  var subtree;
  beforeAll(function () {
    subtree = new ImplicitSubtree(
      subtreeResource,
      bufferResults.subtreeBuffer,
      metadataQuadtree,
      rootCoordinates
    );

    return subtree.readyPromise;
  });

  var tileMetadata;
  beforeEach(function () {
    tileMetadata = new ImplicitTileMetadata({
      implicitSubtree: subtree,
      implicitCoordinates: implicitCoordinates,
      class: tileClass,
    });
  });

  it("throws without implicitSubtree", function () {
    expect(function () {
      tileMetadata = new ImplicitTileMetadata({
        implicitSubtree: undefined,
        implicitCoordinates: implicitCoordinates,
        class: tileClass,
      });
    }).toThrowDeveloperError();
  });

  it("throws without implicitCoordinates", function () {
    expect(function () {
      tileMetadata = new ImplicitTileMetadata({
        implicitSubtree: subtree,
        implicitCoordinates: undefined,
        class: tileClass,
      });
    }).toThrowDeveloperError();
  });

  it("creates tile metadata", function () {
    tileMetadata = new ImplicitTileMetadata({
      implicitSubtree: subtree,
      implicitCoordinates: implicitCoordinates,
      class: tileClass,
    });
    expect(tileMetadata.class).toBe(tileClass);
    expect(tileMetadata.extras).toBe(undefined);
    expect(tileMetadata.extensions).toBe(undefined);
  });

  it("hasProperty returns true if the tile has this property", function () {
    expect(tileMetadata.hasProperty("highlightColor")).toBe(true);
  });

  it("hasProperty returns false if the tile does not have this property", function () {
    expect(tileMetadata.hasProperty("numberOfPoints")).toBe(false);
  });

  it("hasSemantic returns true if the tile has a property with the given semantic", function () {
    expect(tileMetadata.hasSemantic("_HIGHLIGHT_COLOR")).toBe(true);
  });

  it("hasSemantic returns false if the tile does not have a property with the given semantic", function () {
    expect(tileMetadata.hasSemantic("_NUMBER_OF_POINTS")).toBe(false);
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
    expect(tileMetadata.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 255, 0)
    );
    expect(tileMetadata.getProperty("buildingCount")).toBe(350);
  });

  it("setProperty does not create property if it doesn't exist", function () {
    expect(tileMetadata.setProperty("numberOfPoints", 10)).toBe(false);
  });

  it("setProperty sets property value", function () {
    expect(tileMetadata.getProperty("buildingCount")).toBe(350);
    expect(tileMetadata.setProperty("buildingCount", 400)).toBe(true);
    expect(tileMetadata.getProperty("buildingCount")).toBe(400);
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(
      tileMetadata.getPropertyBySemantic("HORIZON_OCCLUSION_POINT")
    ).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 255, 0)
    );
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 255, 0)
    );
    expect(
      tileMetadata.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(0, 0, 0)
      )
    ).toBe(true);
    expect(tileMetadata.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(0, 0, 0)
    );
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    expect(tileMetadata.setPropertyBySemantic("NAME", "Test Tile")).toBe(false);
  });
});
