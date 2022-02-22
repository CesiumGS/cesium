import { FeatureMetadata, MetadataSchema } from "../../Source/Cesium.js";

describe("Scene/FeatureMetadata", function () {
  const propertyTablesSchema = {
    classes: {
      building: {
        properties: {
          name: {
            type: "STRING",
          },
          height: {
            type: "SCALAR",
            componentType: "FLOAT64",
          },
        },
      },
      tree: {
        properties: {
          species: {
            type: "STRING",
          },
        },
      },
    },
  };

  const propertyTexturesSchema = {
    classes: {
      map: {
        properties: {
          color: {
            type: "SCALAR",
            componentType: "UINT8",
            array: true,
            count: 3,
          },
          intensity: {
            type: "SCALAR",
            componentType: "UINT8",
          },
        },
      },
      ortho: {
        properties: {
          vegetation: {
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        },
      },
    },
  };

  it("creates feature metadata with default values", function () {
    const metadata = new FeatureMetadata({
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.schema).toBeDefined();
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates feature metadata", function () {
    const mockPropertyTables = [
      { id: 0, name: "Buildings" },
      { id: 1, name: "Trees" },
    ];
    const metadata = new FeatureMetadata({
      schema: new MetadataSchema(propertyTablesSchema),
      propertyTables: mockPropertyTables,
    });

    expect(metadata.propertyTableCount).toEqual(2);

    const buildingClass = metadata.schema.classes.building;
    const treeClass = metadata.schema.classes.tree;

    expect(buildingClass.id).toBe("building");
    expect(treeClass.id).toBe("tree");

    const buildingsTable = metadata.getPropertyTable(0);
    const treesTable = metadata.getPropertyTable(1);

    expect(buildingsTable).toBe(mockPropertyTables[0]);
    expect(treesTable).toBe(mockPropertyTables[1]);
  });

  it("creates feature metadata with feature textures", function () {
    const schema = new MetadataSchema(propertyTexturesSchema);
    const mapClass = schema.classes.map;
    const orthoClass = schema.classes.ortho;

    const mockTextures = [
      {
        id: 0,
        name: "Map Texture",
        class: mapClass,
      },
      {
        id: 1,
        name: "Ortho Texture",
        class: orthoClass,
      },
    ];

    const metadata = new FeatureMetadata({
      schema: schema,
      propertyTextures: mockTextures,
    });

    expect(mapClass.id).toBe("map");
    expect(orthoClass.id).toBe("ortho");

    const mapTexture = metadata.getPropertyTexture(0);
    const orthoTexture = metadata.getPropertyTexture(1);

    expect(mapTexture.id).toBe(0);
    expect(mapTexture.name).toBe("Map Texture");
    expect(mapTexture.class).toBe(mapClass);
    expect(orthoTexture.id).toBe(1);
    expect(orthoTexture.name).toBe("Ortho Texture");
    expect(orthoTexture.class).toBe(orthoClass);
  });

  it("creates feature metadata with extras", function () {
    const extras = {
      date: "2021-04-14",
    };

    const metadata = new FeatureMetadata({
      extras: extras,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.extras).toBe(extras);
  });

  it("creates feature metadata with extensions", function () {
    const extensions = {
      "3DTILES_extension": {},
    };

    const metadata = new FeatureMetadata({
      extensions: extensions,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.extensions).toBe(extensions);
  });

  it("creates feature metadata with statistics", function () {
    const statistics = {
      classes: {
        tree: {
          count: 100,
          properties: {
            height: {
              min: 10.0,
              max: 20.0,
            },
          },
        },
      },
    };

    const metadata = new FeatureMetadata({
      statistics: statistics,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.statistics).toBe(statistics);
  });

  it("getPropertyTable throws without propertyTableId", function () {
    const metadata = new FeatureMetadata({
      extension: {},
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(function () {
      metadata.getPropertyTable();
    }).toThrowDeveloperError();
  });

  it("getPropertyTexture throws without featureTextureId", function () {
    const metadata = new FeatureMetadata({
      extension: {},
      schema: new MetadataSchema(propertyTexturesSchema),
    });

    expect(function () {
      metadata.getPropertyTexture();
    }).toThrowDeveloperError();
  });
});
