import {
  Cesium3DTilesetMetadata,
  MetadataSchema,
} from "../../Source/Cesium.js";

describe("Scene/Cesium3DTilesetMetadata", function () {
  var schemaJson = {
    classes: {
      city: {
        properties: {
          name: {
            type: "STRING",
          },
        },
      },
      neighborhood: {
        properties: {
          color: {
            type: "STRING",
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

  it("creates 3D Tiles metadata with default values", function () {
    var schema = new MetadataSchema(schemaJson);

    var metadata = new Cesium3DTilesetMetadata({
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
    var statistics = {
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

    var extras = {
      description: "Extra",
    };

    var extensions = {
      EXT_other_extension: {},
    };

    var extension = {
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

    var schema = new MetadataSchema(schemaJson);

    var metadata = new Cesium3DTilesetMetadata({
      extension: extension,
      schema: schema,
    });

    var cityClass = metadata.schema.classes.city;
    var neighborhoodClass = metadata.schema.classes.neighborhood;
    var treeClass = metadata.schema.classes.tree;

    expect(cityClass.id).toBe("city");
    expect(neighborhoodClass.id).toBe("neighborhood");
    expect(treeClass.id).toBe("tree");

    var tilesetMetadata = metadata.tileset;
    expect(tilesetMetadata.class).toBe(cityClass);
    expect(tilesetMetadata.getProperty("name")).toBe("City");

    var neighborhoodA = metadata.groups.neighborhoodA;
    var neighborhoodB = metadata.groups.neighborhoodB;

    expect(neighborhoodA.class).toBe(neighborhoodClass);
    expect(neighborhoodA.getProperty("color")).toBe("RED");
    expect(neighborhoodB.class).toBe(neighborhoodClass);
    expect(neighborhoodB.getProperty("color")).toBe("GREEN");

    expect(metadata.statistics).toBe(statistics);
    expect(metadata.extras).toBe(extras);
    expect(metadata.extensions).toBe(extensions);
  });

  it("constructor throws without extension", function () {
    var schema = new MetadataSchema(schemaJson);

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
