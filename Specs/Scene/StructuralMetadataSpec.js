import {
  StructuralMetadata,
  MetadataSchema,
  PropertyAttribute,
} from "../../Source/Cesium.js";

describe("Scene/StructuralMetadata", function () {
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

  const propertyAttributesSchema = {
    classes: {
      points: {
        properties: {
          color: {
            type: "VEC3",
            componentType: "UINT8",
            array: true,
            count: 3,
          },
          intensity: {
            type: "SCALAR",
            componentType: "UINT8",
          },
          pointSize: {
            type: "SCALAR",
            componentTYpe: "FLOAT32",
          },
        },
      },
    },
  };

  it("creates structural metadata with default values", function () {
    const metadata = new StructuralMetadata({
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.schema).toBeDefined();
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates structural metadata", function () {
    const mockPropertyTables = [
      { id: 0, name: "Buildings", byteLength: 8 },
      { id: 1, name: "Trees", byteLength: 16 },
    ];
    const metadata = new StructuralMetadata({
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

    expect(metadata.propertyTablesByteLength).toBe(24);
  });

  it("creates structural metadata with property textures", function () {
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

    const metadata = new StructuralMetadata({
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

    expect(metadata.propertyTablesByteLength).toBe(0);
  });

  it("creates structural metadata with property attributes", function () {
    const schema = new MetadataSchema(propertyAttributesSchema);
    const pointsClass = schema.classes.points;

    const propertyAttributes = [
      new PropertyAttribute({
        class: pointsClass,
        name: "Points",
        id: 0,
        propertyAttribute: {
          properties: {
            color: {
              attribute: "_COLOR",
            },
            intensity: {
              attribute: "_INTENSITY",
            },
            pointSize: {
              attribute: "_POINT_SIZE",
            },
          },
        },
      }),
    ];

    const metadata = new StructuralMetadata({
      schema: schema,
      propertyAttributes: propertyAttributes,
    });

    expect(pointsClass.id).toBe("points");

    const propertyAttribute = metadata.getPropertyAttribute(0);
    expect(propertyAttribute).toBe(propertyAttributes[0]);
    expect(propertyAttribute.id).toBe(0);
    expect(propertyAttribute.name).toBe("Points");
    expect(propertyAttribute.class).toBe(pointsClass);
    expect(propertyAttribute.getProperty("color").attribute).toBe("_COLOR");
    expect(propertyAttribute.getProperty("intensity").attribute).toBe(
      "_INTENSITY"
    );
    expect(propertyAttribute.getProperty("pointSize").attribute).toBe(
      "_POINT_SIZE"
    );

    expect(metadata.propertyTablesByteLength).toBe(0);
  });

  it("creates structural metadata with extras", function () {
    const extras = {
      date: "2021-04-14",
    };

    const metadata = new StructuralMetadata({
      extras: extras,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.extras).toBe(extras);
  });

  it("creates structural metadata with extensions", function () {
    const extensions = {
      "3DTILES_extension": {},
    };

    const metadata = new StructuralMetadata({
      extensions: extensions,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.extensions).toBe(extensions);
  });

  it("creates structural metadata with statistics", function () {
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

    const metadata = new StructuralMetadata({
      statistics: statistics,
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(metadata.statistics).toBe(statistics);
  });

  it("getPropertyTable throws without propertyTableId", function () {
    const metadata = new StructuralMetadata({
      extension: {},
      schema: new MetadataSchema(propertyTablesSchema),
    });

    expect(function () {
      metadata.getPropertyTable();
    }).toThrowDeveloperError();
  });

  it("getPropertyTexture throws without propertyTextureId", function () {
    const metadata = new StructuralMetadata({
      extension: {},
      schema: new MetadataSchema(propertyTexturesSchema),
    });

    expect(function () {
      metadata.getPropertyTexture();
    }).toThrowDeveloperError();
  });

  it("getPropertyAttribute throws without propertyAttributeId", function () {
    const metadata = new StructuralMetadata({
      extension: {},
      schema: new MetadataSchema(propertyAttributesSchema),
    });

    expect(function () {
      metadata.getPropertyAttribute();
    }).toThrowDeveloperError();
  });
});
