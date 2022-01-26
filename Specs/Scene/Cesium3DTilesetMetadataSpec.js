import {
  Cesium3DTilesetMetadata,
  MetadataSchema,
} from "../../Source/Cesium.js";

describe("Scene/Cesium3DTilesetMetadata", function () {
  const schemaJson = {
    classes: {
      city: {
        properties: {
          name: {
            componentType: "STRING",
          },
        },
      },
      neighborhood: {
        properties: {
          color: {
            componentType: "STRING",
          },
        },
      },
      tree: {
        properties: {
          species: {
            componentType: "STRING",
          },
        },
      },
    },
  };

  it("creates 3D Tiles metadata with default values", function () {
    const schema = new MetadataSchema(schemaJson);

    const metadata = new Cesium3DTilesetMetadata({
      extension: {},
      schema: schema,
    });

    expect(metadata.schema).toBe(schema);
    expect(metadata.groups).toEqual({});
    expect(metadata.tileset).toBeUndefined();
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates 3D Tiles metadata", function () {
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

    const extras = {
      description: "Extra",
    };

    const extensions = {
      EXT_other_extension: {},
    };

    const extension = {
      schema: schemaJson,
      groups: {
        neighborhoodA: {
          class: "neighborhood",
          properties: {
            color: "RED",
          },
        },
        neighborhoodB: {
          class: "neighborhood",
          properties: {
            color: "GREEN",
          },
        },
      },
      tileset: {
        class: "city",
        properties: {
          name: "City",
        },
      },
      statistics: statistics,
      extras: extras,
      extensions: extensions,
    };

    const schema = new MetadataSchema(schemaJson);

    const metadata = new Cesium3DTilesetMetadata({
      extension: extension,
      schema: schema,
    });

    const cityClass = metadata.schema.classes.city;
    const neighborhoodClass = metadata.schema.classes.neighborhood;
    const treeClass = metadata.schema.classes.tree;

    expect(cityClass.id).toBe("city");
    expect(neighborhoodClass.id).toBe("neighborhood");
    expect(treeClass.id).toBe("tree");

    const tilesetMetadata = metadata.tileset;
    expect(tilesetMetadata.class).toBe(cityClass);
    expect(tilesetMetadata.getProperty("name")).toBe("City");

    const neighborhoodA = metadata.groups.neighborhoodA;
    const neighborhoodB = metadata.groups.neighborhoodB;

    expect(neighborhoodA.class).toBe(neighborhoodClass);
    expect(neighborhoodA.getProperty("color")).toBe("RED");
    expect(neighborhoodB.class).toBe(neighborhoodClass);
    expect(neighborhoodB.getProperty("color")).toBe("GREEN");

    expect(metadata.statistics).toBe(statistics);
    expect(metadata.extras).toBe(extras);
    expect(metadata.extensions).toBe(extensions);
  });

  it("constructor throws without extension", function () {
    const schema = new MetadataSchema(schemaJson);

    expect(function () {
      return new Cesium3DTilesetMetadata({
        schema: schema,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without schema", function () {
    expect(function () {
      return new Cesium3DTilesetMetadata({
        extension: {},
      });
    }).toThrowDeveloperError();
  });
});
