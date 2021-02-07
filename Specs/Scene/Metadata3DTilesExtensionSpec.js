import { Metadata3DTilesExtension } from "../../Source/Cesium.js";

describe("Scene/Metadata3DTilesExtension", function () {
  it("creates 3D Tiles metadata with default values", function () {
    var metadata = new Metadata3DTilesExtension({});

    expect(metadata.schema).toBeUndefined();
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
      schema: {
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

    var cityClass = metadata.schema.classes.city;
    var neighborhoodClass = metadata.schema.classes.neighborhood;
    var treeClass = metadata.schema.classes.tree;

    expect(cityClass.id).toBe("city");
    expect(neighborhoodClass.id).toBe("neighborhood");
    expect(treeClass.id).toBe("tree");

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
