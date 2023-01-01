import { MetadataSchema } from "../../index.js";

describe("Scene/MetadataSchema", function () {
  it("creates schema with default values", function () {
    const schema = MetadataSchema.fromJson({});

    expect(schema.classes).toEqual({});
    expect(schema.enums).toEqual({});
    expect(schema.name).toBeUndefined();
    expect(schema.description).toBeUndefined();
    expect(schema.version).toBeUndefined();
    expect(schema.extras).toBeUndefined();
  });

  it("creates schema", function () {
    const extras = {
      description: "Extra",
    };

    const extensions = {
      EXT_other_extension: {},
    };

    const schema = MetadataSchema.fromJson({
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
              type: "STRING",
            },
          },
        },
        neighborhood: {
          properties: {
            color: {
              type: "ENUM",
              enumType: "color",
            },
            coordinates: {
              type: "SCALAR",
              componentType: "FLOAT64",
              array: true,
              count: 2,
            },
          },
        },
        tree: {
          properties: {
            species: {
              type: "ENUM",
              array: true,
              enumType: "species",
            },
            height: {
              type: "SCALAR",
              componentType: "FLOAT32",
            },
          },
        },
      },
      id: "mySchema",
      name: "My Schema",
      description: "My Schema Description",
      version: "3.1.0",
      extras: extras,
      extensions: extensions,
    });

    const cityClass = schema.classes.city;
    const neighborhoodClass = schema.classes.neighborhood;
    const treeClass = schema.classes.tree;

    const cityProperties = cityClass.properties;
    const neighborhoodProperties = neighborhoodClass.properties;
    const treeProperties = treeClass.properties;

    expect(cityClass.id).toBe("city");
    expect(neighborhoodClass.id).toBe("neighborhood");
    expect(treeClass.id).toBe("tree");

    expect(cityProperties.name.id).toBe("name");
    expect(neighborhoodProperties.color.enumType.id).toBe("color");
    expect(neighborhoodProperties.coordinates.id).toBe("coordinates");
    expect(treeProperties.species.enumType.id).toBe("species");
    expect(treeProperties.height.id).toBe("height");

    expect(schema.id).toBe("mySchema");
    expect(schema.name).toBe("My Schema");
    expect(schema.description).toBe("My Schema Description");
    expect(schema.version).toBe("3.1.0");

    expect(schema.extras).toEqual(extras);
    expect(schema.extensions).toEqual(extensions);
  });

  it("constructor throws without schema", function () {
    expect(function () {
      return MetadataSchema.fromJson();
    }).toThrowDeveloperError();
  });
});
