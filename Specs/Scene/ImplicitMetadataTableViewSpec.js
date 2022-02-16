import {
  Cartesian3,
  ImplicitSubtree,
  ImplicitTileCoordinates,
  ImplicitTileset,
  ImplicitMetadataTableView,
  MetadataClass,
  MetadataSchema,
  Resource,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/ImplicitMetadataTableView", function () {
  const highlightColors = [
    [255, 0, 0],
    [255, 255, 0],
    [255, 0, 255],
  ];

  const buildingCounts = [100, 350, 200];

  const tileTableDescription = {
    name: "Tiles",
    class: "tile",
    properties: {
      highlightColor: highlightColors,
      buildingCount: buildingCounts,
    },
  };

  const areaValues = [10, 50, 100, 75, 30];
  const populationValues = [10000, 20000, 50000, 30000, 20000];

  const contentTableDescription = {
    name: "Content",
    class: "content",
    properties: {
      area: areaValues,
      population: populationValues,
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
      content: {
        properties: {
          area: {
            componentType: "UINT16",
            semantic: "_AREA",
            description: "Area in square miles",
          },
          population: {
            componentType: "UINT16",
          },
        },
      },
    },
  };

  const tileClass = new MetadataClass({
    id: "tile",
    class: schema.classes.tile,
  });

  const contentClass = new MetadataClass({
    id: "content",
    class: schema.classes.content,
  });

  const propertyTablesDescription = {
    schema: schema,
    propertyTables: [tileTableDescription, contentTableDescription],
  };

  const subtreeDescription = {
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
      propertyTables: propertyTablesDescription,
    },
  };

  const bufferResults = ImplicitTilingTester.generateSubtreeBuffers(
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
      bufferResults.subtreeBuffer,
      metadataQuadtree,
      rootCoordinates
    );

    return subtree.readyPromise;
  });

  let firstTileMetadataTableView;
  let secondTileMetadataTableView;
  beforeEach(function () {
    firstTileMetadataTableView = new ImplicitMetadataTableView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 0,
      propertyTableJson: {},
    });

    secondTileMetadataTableView = new ImplicitMetadataTableView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 1,
      propertyTableJson: {},
    });
  });

  it("throws without metadataTable", function () {
    expect(function () {
      firstTileMetadataTableView = new ImplicitMetadataTableView({
        metadataTable: undefined,
        class: tileClass,
        entityId: 0,
        propertyTableJson: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws without class", function () {
    expect(function () {
      firstTileMetadataTableView = new ImplicitMetadataTableView({
        metadataTable: subtree.tileMetadataTable,
        class: undefined,
        entityId: 0,
        propertyTableJson: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws without entityId", function () {
    expect(function () {
      firstTileMetadataTableView = new ImplicitMetadataTableView({
        metadataTable: subtree.tileMetadataTable,
        class: tileClass,
        entityId: undefined,
        propertyTableJson: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws without propertyTableJson", function () {
    expect(function () {
      firstTileMetadataTableView = new ImplicitMetadataTableView({
        metadataTable: subtree.tileMetadataTable,
        class: tileClass,
        entityId: 0,
        propertyTableJson: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("creates metadata table view", function () {
    firstTileMetadataTableView = new ImplicitMetadataTableView({
      metadataTable: subtree.tileMetadataTable,
      class: tileClass,
      entityId: 0,
      propertyTableJson: {},
    });

    expect(firstTileMetadataTableView.class).toBe(tileClass);
    expect(firstTileMetadataTableView.extras).toBe(undefined);
    expect(firstTileMetadataTableView.extensions).toBe(undefined);
  });

  it("hasProperty returns true if the metadata table has this property", function () {
    expect(firstTileMetadataTableView.hasProperty("highlightColor")).toBe(true);
  });

  it("hasProperty returns false if the metadata table does not have this property", function () {
    expect(firstTileMetadataTableView.hasProperty("numberOfPoints")).toBe(
      false
    );
  });

  it("hasPropertyBySemantic returns true if the metadata table has a property with the given semantic", function () {
    expect(
      firstTileMetadataTableView.hasPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toBe(true);
  });

  it("hasPropertyBySemantic returns false if the metadata table does not have a property with the given semantic", function () {
    expect(
      firstTileMetadataTableView.hasPropertyBySemantic("_NUMBER_OF_POINTS")
    ).toBe(false);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const propertyIds = firstTileMetadataTableView.getPropertyIds([]);
    propertyIds.sort();
    expect(propertyIds).toEqual(["buildingCount", "highlightColor"]);
  });

  it("getProperty returns undefined if a property does not exist", function () {
    expect(
      firstTileMetadataTableView.getProperty("numberOfPoints")
    ).not.toBeDefined();
  });

  it("getProperty returns the property value", function () {
    expect(firstTileMetadataTableView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);
  });

  it("getProperty returns the correct value for metadata table views that point to the same table", function () {
    expect(firstTileMetadataTableView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 0, 0)
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);

    expect(secondTileMetadataTableView.getProperty("highlightColor")).toEqual(
      new Cartesian3(255, 255, 0)
    );
    expect(secondTileMetadataTableView.getProperty("buildingCount")).toBe(350);
  });

  it("setProperty does not create property if it doesn't exist", function () {
    expect(firstTileMetadataTableView.setProperty("numberOfPoints", 10)).toBe(
      false
    );
  });

  it("setProperty sets property value", function () {
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);
    expect(firstTileMetadataTableView.setProperty("buildingCount", 400)).toBe(
      true
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(400);

    // reset the value so it won't affect other tests
    expect(firstTileMetadataTableView.setProperty("buildingCount", 100)).toBe(
      true
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);
  });

  it("setProperty sets the correct values for metadata table views that point to the same table", function () {
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);
    expect(secondTileMetadataTableView.getProperty("buildingCount")).toBe(350);

    expect(firstTileMetadataTableView.setProperty("buildingCount", 400)).toBe(
      true
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(400);
    expect(secondTileMetadataTableView.getProperty("buildingCount")).toBe(350);

    // reset the value so it won't affect other tests
    expect(firstTileMetadataTableView.setProperty("buildingCount", 100)).toBe(
      true
    );
    expect(firstTileMetadataTableView.getProperty("buildingCount")).toBe(100);
    expect(secondTileMetadataTableView.getProperty("buildingCount")).toBe(350);
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(
      firstTileMetadataTableView.getPropertyBySemantic(
        "HORIZON_OCCLUSION_POINT"
      )
    ).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
  });

  it("getPropertyBySemantic returns correct values for metadata table views that point to the same table", function () {
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
    expect(
      secondTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 255, 0));
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
    expect(
      firstTileMetadataTableView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(0, 0, 0)
      )
    ).toBe(true);
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(0, 0, 0));

    // reset the value so it won't affect other tests
    expect(
      firstTileMetadataTableView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(true);
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
  });

  it("setPropertyBySemantic sets the correct value for metadata table views that point to the same table", function () {
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
    expect(
      secondTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 255, 0));

    expect(
      firstTileMetadataTableView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(0, 0, 0)
      )
    ).toBe(true);
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(0, 0, 0));
    expect(
      secondTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 255, 0));

    // reset the value so it won't affect other tests
    expect(
      firstTileMetadataTableView.setPropertyBySemantic(
        "_HIGHLIGHT_COLOR",
        new Cartesian3(255, 0, 0)
      )
    ).toBe(true);
    expect(
      firstTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 0, 0));
    expect(
      secondTileMetadataTableView.getPropertyBySemantic("_HIGHLIGHT_COLOR")
    ).toEqual(new Cartesian3(255, 255, 0));
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    expect(
      firstTileMetadataTableView.setPropertyBySemantic("NAME", "Test Tile")
    ).toBe(false);
  });
});
