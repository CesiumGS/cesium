import {
  Cartesian3,
  ImplicitSubtree,
  ImplicitTileCoordinates,
  ImplicitTileset,
  ImplicitMetadataView,
  MetadataClass,
  MetadataSchema,
  Resource,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/ImplicitMetadataView", function () {
  const highlightColors = [
    [255, 0, 0],
    [255, 255, 0],
    [255, 0, 255],
    [255, 255, 255],
  ];

  const buildingCounts = [100, 350, 200, 500];

  const tileTableDescription = {
    name: "Tiles",
    class: "tile",
    properties: {
      highlightColor: highlightColors,
      buildingCount: buildingCounts,
    },
  };

  const buildingHeights = [20, 30, 10];
  const buildingTypes = ["Residential", "Commercial", "Other"];

  const buildingTableDescription = {
    name: "Buildings",
    class: "building",
    properties: {
      height: buildingHeights,
      type: buildingTypes,
    },
  };

  const treeHeights = [3, 2, 4];
  const treeSpecies = ["Oak", "Pine", "Maple"];

  const treeTableDescription = {
    name: "Trees",
    class: "tree",
    properties: {
      height: treeHeights,
      species: treeSpecies,
    },
  };

  const schema = {
    classes: {
      tile: {
        properties: {
          highlightColor: {
            type: "VEC3",
            componentType: "UINT8",
            semantic: "_HIGHLIGHT_COLOR",
          },
          buildingCount: {
            componentType: "UINT16",
          },
        },
      },
      building: {
        properties: {
          height: {
            componentType: "UINT16",
            semantic: "_HEIGHT",
          },
          type: {
            componentType: "STRING",
            semantic: "_BUILDING_TYPE",
          },
        },
      },
      tree: {
        properties: {
          height: {
            componentType: "UINT16",
            semantic: "_HEIGHT",
          },
          species: {
            componentType: "STRING",
            semantic: "_TREE_SPECIES",
          },
        },
      },
    },
  };

  const tileClass = new MetadataClass({
    id: "tile",
    class: schema.classes.tile,
  });

  const buildingClass = new MetadataClass({
    id: "building",
    class: schema.classes.building,
  });

  const treeClass = new MetadataClass({
    id: "tree",
    class: schema.classes.tree,
  });

  const propertyTablesDescription = {
    schema: schema,
    propertyTables: [
      tileTableDescription,
      buildingTableDescription,
      treeTableDescription,
    ],
  };

  const subtreeDescription = {
    tileAvailability: {
      descriptor: "11011",
      lengthBits: 5,
      isInternal: true,
      includeAvailableCount: true,
    },
    contentAvailability: [
      {
        descriptor: "01011",
        lengthBits: 5,
        isInternal: true,
        includeAvailableCount: true,
      },
      {
        descriptor: "11001",
        lengthBits: 5,
        isInternal: true,
        includeAvailableCount: true,
      },
    ],
    childSubtreeAvailability: {
      descriptor: 0,
      lengthBits: 16,
      isInternal: true,
    },
    metadata: {
      isInternal: true,
      propertyTables: propertyTablesDescription,
    },
  };

  const results = ImplicitTilingTester.generateSubtreeBuffers(
    subtreeDescription
  );

  const tilesetResource = new Resource({
    url: "https://example.com/tileset.json",
  });

  const subtreeResource = new Resource({
    url: "https://example.com/test.subtree",
  });

  const mockTilesetWithMetadata = {
    metadata: {
      schema: new MetadataSchema(schema),
    },
  };

  const metadataSchema = mockTilesetWithMetadata.metadata.schema;

  const implicitQuadtreeJson = {
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
        availableLevels: 2,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
    },
  };

  const metadataQuadtree = new ImplicitTileset(
    tilesetResource,
    implicitQuadtreeJson,
    metadataSchema
  );

  const rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: metadataQuadtree.subdivisionScheme,
    subtreeLevels: metadataQuadtree.subtreeLevels,
    x: 0,
    y: 0,
    level: 0,
  });

  let subtree;
  beforeAll(function () {
    subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      metadataQuadtree,
      rootCoordinates
    );

    return subtree.readyPromise.otherwise(console.error);
  });

  const emptyJson = {};

  let tileView;
  let secondTileView;

  let buildingView;
  let secondBuildingView;

  let treeView;
  let secondTreeView;

  beforeEach(function () {
    tileView = new ImplicitMetadataView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 0,
      propertyTableJson: emptyJson,
    });

    secondTileView = new ImplicitMetadataView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 1,
      propertyTableJson: emptyJson,
    });

    buildingView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[0],
      class: buildingClass,
      entityId: 0,
      contentIndex: 0,
      propertyTableJson: emptyJson,
    });

    secondBuildingView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[0],
      class: buildingClass,
      entityId: 1,
      contentIndex: 0,
      propertyTableJson: emptyJson,
    });

    treeView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[1],
      class: treeClass,
      entityId: 0,
      contentIndex: 1,
      propertyTableJson: emptyJson,
    });

    secondTreeView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[1],
      class: treeClass,
      entityId: 1,
      contentIndex: 1,
      propertyTableJson: emptyJson,
    });
  });

  it("throws without metadataTable", function () {
    expect(function () {
      tileView = new ImplicitMetadataView({
        metadataTable: undefined,
        class: tileClass,
        entityId: 0,
        propertyTableJson: emptyJson,
      });
    }).toThrowDeveloperError();
  });

  it("throws without class", function () {
    expect(function () {
      tileView = new ImplicitMetadataView({
        metadataTable: subtree.tileMetadataTable,
        class: undefined,
        entityId: 0,
        propertyTableJson: emptyJson,
      });
    }).toThrowDeveloperError();
  });

  it("throws without entityId", function () {
    expect(function () {
      tileView = new ImplicitMetadataView({
        metadataTable: subtree.tileMetadataTable,
        class: tileClass,
        entityId: undefined,
        propertyTableJson: emptyJson,
      });
    }).toThrowDeveloperError();
  });

  it("throws without propertyTableJson", function () {
    expect(function () {
      tileView = new ImplicitMetadataView({
        metadataTable: subtree.tileMetadataTable,
        class: tileClass,
        entityId: 0,
        propertyTableJson: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("creates tile metadata table view", function () {
    tileView = new ImplicitMetadataView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 0,
      propertyTableJson: emptyJson,
    });

    expect(tileView.class).toBe(tileClass);
    expect(tileView.extras).toBe(undefined);
    expect(tileView.extensions).toBe(undefined);
  });

  it("creates content metadata table views", function () {
    buildingView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[0],
      class: buildingClass,
      entityId: 0,
      propertyTableJson: emptyJson,
    });

    expect(buildingView.class).toBe(buildingClass);
    expect(buildingView.extras).toBe(undefined);
    expect(buildingView.extensions).toBe(undefined);

    treeView = new ImplicitMetadataView({
      metadataTable: subtree.contentMetadataTables[1],
      class: treeClass,
      entityId: 0,
      propertyTableJson: emptyJson,
    });

    expect(treeView.class).toBe(treeClass);
    expect(treeView.extras).toBe(undefined);
    expect(treeView.extensions).toBe(undefined);
  });

  it("hasProperty returns true if the metadata table has this property", function () {
    expect(tileView.hasProperty("highlightColor")).toBe(true);
    expect(buildingView.hasProperty("height")).toBe(true);
    expect(treeView.hasProperty("species")).toBe(true);
  });

  it("hasProperty returns false if the metadata table does not have this property", function () {
    expect(tileView.hasProperty("height")).toBe(false);
    expect(buildingView.hasProperty("buildingCount")).toBe(false);
    expect(treeView.hasProperty("type")).toBe(false);
  });

  it("hasPropertyBySemantic returns true if the metadata table has a property with the given semantic", function () {
    expect(tileView.hasPropertyBySemantic("_HIGHLIGHT_COLOR")).toBe(true);
    expect(buildingView.hasPropertyBySemantic("_HEIGHT")).toBe(true);
    expect(treeView.hasPropertyBySemantic("_TREE_SPECIES")).toBe(true);
  });

  it("hasPropertyBySemantic returns false if the metadata table does not have a property with the given semantic", function () {
    expect(tileView.hasPropertyBySemantic("_AREA")).toBe(false);
    expect(buildingView.hasPropertyBySemantic("_HIGHLIGHT_COLOR")).toBe(false);
    expect(treeView.hasPropertyBySemantic("_BUILDING_TYPE")).toBe(false);
  });

  it("getPropertyIds returns array of property IDs for the tile metadata table", function () {
    const tilePropertyIds = tileView.getPropertyIds([]);
    tilePropertyIds.sort();
    expect(tilePropertyIds).toEqual(["buildingCount", "highlightColor"]);
  });

  it("getPropertyIds returns different property IDs for different content metadata tables", function () {
    const buildingPropertyIds = buildingView.getPropertyIds([]);
    buildingPropertyIds.sort();
    expect(buildingPropertyIds).toEqual(["height", "type"]);

    const treePropertyIds = treeView.getPropertyIds([]);
    treePropertyIds.sort();
    expect(treePropertyIds).toEqual(["height", "species"]);
  });

  it("getProperty returns undefined if a property does not exist for the metadata table", function () {
    expect(tileView.getProperty("height")).not.toBeDefined();
    expect(buildingView.getProperty("species")).not.toBeDefined();
    expect(treeView.getProperty("type")).not.toBeDefined();
  });

  it("getProperty returns the property value for the metadata table", function () {
    expect(tileView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(tileView.getProperty("buildingCount")).toBe(100);

    expect(buildingView.getProperty("height")).toEqual(20);
    expect(buildingView.getProperty("type")).toBe("Residential");

    expect(treeView.getProperty("height")).toEqual(3);
    expect(treeView.getProperty("species")).toBe("Oak");
  });

  it("getProperty returns the correct value for metadata table views that point to the same table", function () {
    expect(tileView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(secondTileView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 255, 0)
    );

    expect(buildingView.getProperty("type")).toEqual("Residential");
    expect(secondBuildingView.getProperty("type")).toBe("Commercial");

    expect(treeView.getProperty("species")).toEqual("Oak");
    expect(secondTreeView.getProperty("species")).toBe("Pine");
  });

  it("getProperty returns the correct value for different metadata table views with same property", function () {
    expect(buildingView.getProperty("height")).toEqual(20);
    expect(treeView.getProperty("height")).toEqual(3);
  });

  it("setProperty does not create property if it doesn't exist", function () {
    expect(tileView.setProperty("height", 10)).toBe(false);
    expect(buildingView.setProperty("buildingCount", 10)).toBe(false);
    expect(treeView.setProperty("type", "Other")).toBe(false);
  });

  it("setProperty sets property value", function () {
    expect(tileView.getProperty("buildingCount")).toBe(100);
    expect(tileView.setProperty("buildingCount", 400)).toBe(true);
    expect(tileView.getProperty("buildingCount")).toBe(400);

    expect(buildingView.getProperty("type")).toBe("Residential");
    expect(buildingView.setProperty("type", "Commercial")).toBe(true);
    expect(buildingView.getProperty("type")).toBe("Commercial");

    expect(treeView.getProperty("species")).toBe("Oak");
    expect(treeView.setProperty("species", "Chestnut")).toBe(true);
    expect(treeView.getProperty("species")).toBe("Chestnut");

    // reset the value so it won't affect other tests
    expect(tileView.setProperty("buildingCount", 100)).toBe(true);
    expect(tileView.getProperty("buildingCount")).toBe(100);

    expect(buildingView.setProperty("type", "Residential")).toBe(true);
    expect(buildingView.getProperty("type")).toBe("Residential");

    expect(treeView.setProperty("species", "Oak")).toBe(true);
    expect(treeView.getProperty("species")).toBe("Oak");
  });

  it("setProperty sets property value for different metadata table views with same property", function () {
    expect(buildingView.setProperty("height", 100)).toBe(true);
    expect(buildingView.getProperty("height")).toBe(100);
    expect(treeView.getProperty("height")).toBe(3);

    expect(treeView.setProperty("height", 25)).toBe(true);
    expect(treeView.getProperty("height")).toBe(25);
    expect(buildingView.getProperty("height")).toBe(100);

    // reset the value so it won't affect other tests
    expect(buildingView.setProperty("height", 20)).toBe(true);
    expect(buildingView.getProperty("height")).toBe(20);

    expect(treeView.setProperty("height", 3)).toBe(true);
    expect(treeView.getProperty("height")).toBe(3);
  });

  it("setProperty sets the correct values for metadata table views that point to the same table", function () {
    expect(tileView.getProperty("buildingCount")).toBe(100);
    expect(tileView.setProperty("buildingCount", 400)).toBe(true);
    expect(tileView.getProperty("buildingCount")).toBe(400);
    expect(secondTileView.getProperty("buildingCount")).toBe(350);

    expect(buildingView.getProperty("type")).toBe("Residential");
    expect(buildingView.setProperty("type", "Other")).toBe(true);
    expect(buildingView.getProperty("type")).toBe("Other");
    expect(secondBuildingView.getProperty("type")).toBe("Commercial");

    expect(treeView.getProperty("species")).toBe("Oak");
    expect(treeView.setProperty("species", "Chestnut")).toBe(true);
    expect(treeView.getProperty("species")).toBe("Chestnut");
    expect(secondTreeView.getProperty("species")).toBe("Pine");

    // reset the value so it won't affect other tests
    expect(tileView.setProperty("buildingCount", 100)).toBe(true);
    expect(tileView.getProperty("buildingCount")).toBe(100);

    expect(buildingView.setProperty("type", "Residential")).toBe(true);
    expect(buildingView.getProperty("type")).toBe("Residential");

    expect(treeView.setProperty("species", "Oak")).toBe(true);
    expect(treeView.getProperty("species")).toBe("Oak");
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(tileView.getPropertyBySemantic("_AREA")).not.toBeDefined();
    expect(
      buildingView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).not.toBeDefined();
    expect(treeView.getPropertyBySemantic("_BUILDING_TYPE")).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );
    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
  });

  it("getPropertyBySemantic returns correct values for different metadata table views with same semantic", function () {
    expect(buildingView.getPropertyBySemantic("_HEIGHT")).toEqual(20);
    expect(treeView.getPropertyBySemantic("_HEIGHT")).toEqual(3);
  });

  it("getPropertyBySemantic returns correct values for metadata table views that point to the same table", function () {
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(secondTileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 255, 0)
    );

    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );
    expect(secondBuildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Commercial"
    );

    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
    expect(secondTreeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual(
      "Pine"
    );
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(
      tileView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(0, 0, 0)
      )
    ).toBe(true);
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(0, 0, 0)
    );

    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );
    expect(buildingView.setPropertyBySemantic("_BUILDING_TYPE", "Other")).toBe(
      true
    );
    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Other"
    );

    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
    expect(treeView.setPropertyBySemantic("_TREE_SPECIES", "Chestnut")).toBe(
      true
    );
    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Chestnut");

    // reset the value so it won't affect other tests
    expect(
      tileView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(true);
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );

    expect(
      buildingView.setPropertyBySemantic("_BUILDING_TYPE", "Residential")
    ).toBe(true);
    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );

    expect(treeView.setPropertyBySemantic("_TREE_SPECIES", "Oak")).toBe(true);
    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
  });

  it("setPropertyBySemantic sets the correct value for different metadata table views with the same semantic", function () {
    expect(buildingView.setPropertyBySemantic("_HEIGHT", 100)).toBe(true);
    expect(buildingView.getPropertyBySemantic("_HEIGHT")).toEqual(100);
    expect(treeView.getPropertyBySemantic("_HEIGHT")).toEqual(3);

    expect(treeView.setPropertyBySemantic("_HEIGHT", 55)).toBe(true);
    expect(treeView.getPropertyBySemantic("_HEIGHT")).toEqual(55);
    expect(buildingView.getPropertyBySemantic("_HEIGHT")).toEqual(100);

    // reset the value so it won't affect other tests
    expect(buildingView.setPropertyBySemantic("_HEIGHT", 20)).toBe(true);
    expect(buildingView.getPropertyBySemantic("_HEIGHT")).toEqual(20);

    expect(treeView.setPropertyBySemantic("_HEIGHT", 3)).toBe(true);
    expect(treeView.getPropertyBySemantic("_HEIGHT")).toEqual(3);
  });

  it("setPropertyBySemantic sets the correct value for metadata table views that point to the same table", function () {
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(
      tileView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(0, 0, 0)
      )
    ).toBe(true);
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(0, 0, 0)
    );
    expect(secondTileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 255, 0)
    );

    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );
    expect(buildingView.setPropertyBySemantic("_BUILDING_TYPE", "Other")).toBe(
      true
    );
    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Other"
    );
    expect(secondBuildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Commercial"
    );

    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
    expect(treeView.setPropertyBySemantic("_TREE_SPECIES", "Chestnut")).toBe(
      true
    );
    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Chestnut");
    expect(secondTreeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual(
      "Pine"
    );

    // reset the value so it won't affect other tests
    expect(
      tileView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(true);
    expect(tileView.getPropertyBySemantic("_HIGHLIGHT_COLOR")).toEqual(
      new Cartesian3(255, 0, 0)
    );

    expect(
      buildingView.setPropertyBySemantic("_BUILDING_TYPE", "Residential")
    ).toBe(true);
    expect(buildingView.getPropertyBySemantic("_BUILDING_TYPE")).toEqual(
      "Residential"
    );

    expect(treeView.setPropertyBySemantic("_TREE_SPECIES", "Oak")).toBe(true);
    expect(treeView.getPropertyBySemantic("_TREE_SPECIES")).toEqual("Oak");
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    expect(tileView.setPropertyBySemantic("_AREA", 100)).toBe(false);
    expect(
      buildingView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(false);
    expect(
      treeView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(false);
  });
});
