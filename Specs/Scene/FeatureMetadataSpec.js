import { FeatureMetadata, MetadataSchema } from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/FeatureMetadata", function () {
  var schema = {
    classes: {
      building: {
        properties: {
          name: {
            type: "STRING",
          },
          height: {
            type: "FLOAT64",
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

  it("creates feature metadata with default values", function () {
    var metadata = new FeatureMetadata({
      extension: {},
      schema: new MetadataSchema(schema),
    });

    expect(metadata.schema).toBeDefined();
    expect(metadata.featureTables).toEqual({});
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates feature metadata", function () {
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

    var featureTableResults = MetadataTester.createFeatureTables({
      schema: schema,
      featureTables: {
        buildings: {
          class: "building",
          properties: {
            name: ["Building A", "Building B", "Building C"],
            height: [10.0, 20.0, 30.0],
          },
        },
        trees: {
          class: "tree",
          properties: {
            species: ["Oak", "Pine"],
          },
        },
      },
    });

    var extension = {
      schema: schema,
      featureTables: featureTableResults.featureTables,
      statistics: statistics,
      extras: extras,
      extensions: extensions,
    };

    var metadata = new FeatureMetadata({
      extension: extension,
      schema: new MetadataSchema(schema),
      bufferViews: featureTableResults.bufferViews,
    });

    var buildingClass = metadata.schema.classes.building;
    var treeClass = metadata.schema.classes.tree;

    expect(buildingClass.id).toBe("building");
    expect(treeClass.id).toBe("tree");

    var featureTables = metadata.featureTables;
    var buildingsTable = featureTables.buildings;
    var treesTable = featureTables.trees;

    expect(buildingsTable.count).toBe(3);
    expect(buildingsTable.class).toBe(buildingClass);
    expect(Object.keys(buildingsTable.properties).length).toBe(2);
    expect(buildingsTable.getProperty(0, "name")).toBe("Building A");
    expect(buildingsTable.getProperty(1, "name")).toBe("Building B");
    expect(buildingsTable.getProperty(2, "name")).toBe("Building C");
    expect(buildingsTable.getProperty(0, "height")).toBe(10.0);
    expect(buildingsTable.getProperty(1, "height")).toBe(20.0);
    expect(buildingsTable.getProperty(2, "height")).toBe(30.0);

    expect(treesTable.count).toBe(2);
    expect(treesTable.class).toBe(treeClass);
    expect(Object.keys(treesTable.properties).length).toBe(1);
    expect(treesTable.getProperty(0, "species")).toBe("Oak");
    expect(treesTable.getProperty(1, "species")).toBe("Pine");

    expect(metadata.statistics).toBe(statistics);
    expect(metadata.extras).toBe(extras);
    expect(metadata.extensions).toBe(extensions);
  });
});
