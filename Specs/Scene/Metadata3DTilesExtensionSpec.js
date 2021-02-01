import { Metadata3DTilesExtension } from "../../Source/Cesium.js";

describe("Scene/Metadata3DTilesExtension", function () {
  it("creates 3D Tiles metadata with default values", function () {
    var metadata = new Metadata3DTilesExtension({});

    expect(metadata.classes).toEqual({});
    expect(metadata.groups).toEqual({});
    expect(metadata.tileset).toBeUndefined();
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
  });

  it("creates 3D Tiles metadata", function () {
    var statistics = {
      classes: {
        tree: {
          count: 100,
          properties: {
            height: {
              min: [10.0],
              max: [20.0],
            },
          },
        },
      },
    };

    var extras = {
      description: "Extra",
    };

    var metadata = new Metadata3DTilesExtension({
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
              type: "FLOAT32",
            },
          },
        },
      },
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
    });

    var cityClass = metadata.classes.city;
    var neighborhoodClass = metadata.classes.neighborhood;
    var treeClass = metadata.classes.tree;

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

    var tilesetMetadata = metadata.tileset;
    expect(tilesetMetadata.class).toBe(cityClass);
    expect(tilesetMetadata.properties.name).toBe("City");

    var neighborhoodA = metadata.groups.neighborhoodA;
    var neighborhoodB = metadata.groups.neighborhoodB;

    expect(neighborhoodA.class).toBe(neighborhoodClass);
    expect(neighborhoodA.properties.color).toBe("RED");
    expect(neighborhoodB.class).toBe(neighborhoodClass);
    expect(neighborhoodB.properties.color).toBe("GREEN");

    expect(metadata.statistics).toEqual(statistics);
    expect(metadata.statistics).not.toBe(statistics); // Statistics are cloned

    expect(metadata.extras).toEqual(extras);
    expect(metadata.extras).not.toBe(extras); // Extras are cloned
  });

  it("constructor throws without extension", function () {
    expect(function () {
      return new Metadata3DTilesExtension();
    }).toThrowDeveloperError();
  });
});
