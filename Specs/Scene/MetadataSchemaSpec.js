import { MetadataSchema } from "../../Source/Cesium.js";

describe("Scene/MetadataSchema", function () {
  it("creates schema with default values", function () {
    var schema = new MetadataSchema({});

    expect(schema.classes).toEqual({});
    expect(schema.enums).toEqual({});
    expect(schema.name).toBeUndefined();
    expect(schema.description).toBeUndefined();
    expect(schema.version).toBeUndefined();
    expect(schema.extras).toBeUndefined();
  });

  it("creates schema", function () {
    var extras = {
      description: "Extra",
    };

    var extensions = {
      EXT_other_extension: {},
    };

    var schema = new MetadataSchema({
      enums: {
        color: {
          values: [
            {
              name: "RED",
              value: 0,
            },
            {
              name: "GREEN",
              value: 1,
            },
            {
              name: "BLUE",
              value: 2,
            },
          ],
        },
        species: {
          values: [
            {
              name: "Oak",
              value: 0,
            },
            {
              name: "Pine",
              value: 1,
            },
            {
              name: "Other",
              value: -1,
            },
          ],
        },
      },
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
              componentType: "ENUM",
              enumType: "color",
            },
            coordinates: {
              type: "ARRAY",
              componentType: "FLOAT64",
              componentCount: 2,
            },
          },
        },
        tree: {
          properties: {
            species: {
              type: "ARRAY",
              componentType: "ENUM",
              enumType: "species",
            },
            height: {
              componentType: "FLOAT32",
            },
          },
        },
      },
      name: "My Schema",
      description: "My Schema Description",
      version: "3.1.0",
      extras: extras,
      extensions: extensions,
    });

    var cityClass = schema.classes.city;
    var neighborhoodClass = schema.classes.neighborhood;
    var treeClass = schema.classes.tree;

    var cityProperties = cityClass.properties;
    var neighborhoodProperties = neighborhoodClass.properties;
    var treeProperties = treeClass.properties;

    expect(cityClass.id).toBe("city");
    expect(neighborhoodClass.id).toBe("neighborhood");
    expect(treeClass.id).toBe("tree");

    expect(cityProperties.name.id).toBe("name");
    expect(neighborhoodProperties.color.enumType.id).toBe("color");
    expect(neighborhoodProperties.coordinates.id).toBe("coordinates");
    expect(treeProperties.species.enumType.id).toBe("species");
    expect(treeProperties.height.id).toBe("height");

    expect(schema.name).toBe("My Schema");
    expect(schema.description).toBe("My Schema Description");
    expect(schema.version).toBe("3.1.0");

    expect(schema.extras).toBe(extras);
    expect(schema.extensions).toBe(extensions);
  });

  it("constructor throws without schema", function () {
    expect(function () {
      return new MetadataSchema();
    }).toThrowDeveloperError();
  });
});
