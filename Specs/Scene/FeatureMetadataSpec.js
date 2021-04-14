import { FeatureMetadata, MetadataSchema } from "../../Source/Cesium.js";

describe("Scene/FeatureMetadata", function () {
  var featureTablesSchema = {
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

  var featureTexturesSchema = {
    classes: {
      map: {
        properties: {
          color: {
            type: "ARRAY",
            componentType: "UINT8",
            componentCount: 3,
          },
          intensity: {
            type: "UINT8",
          },
        },
      },
      ortho: {
        properties: {
          vegetation: {
            type: "UINT8",
            normalized: true,
          },
        },
      },
    },
  };

  it("creates feature metadata with default values", function () {
    var metadata = new FeatureMetadata({
      schema: new MetadataSchema(featureTablesSchema),
    });

    expect(metadata.schema).toBeDefined();
    expect(metadata.statistics).toBeUndefined();
    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates feature metadata", function () {
    var mockFeatureTables = {
      buildings: {},
      trees: {},
    };
    var metadata = new FeatureMetadata({
      schema: new MetadataSchema(featureTablesSchema),
      featureTables: mockFeatureTables,
    });

    var buildingClass = metadata.schema.classes.building;
    var treeClass = metadata.schema.classes.tree;

    expect(buildingClass.id).toBe("building");
    expect(treeClass.id).toBe("tree");

    var buildingsTable = metadata.getFeatureTable("buildings");
    var treesTable = metadata.getFeatureTable("trees");

    expect(buildingsTable).toBe(mockFeatureTables.buildings);
    expect(treesTable).toBe(mockFeatureTables.trees);
  });

  it("creates feature metadata with feature textures", function () {
    var schema = new MetadataSchema(featureTexturesSchema);
    var mapClass = schema.classes.map;
    var orthoClass = schema.classes.ortho;

    var mockTextures = {
      mapTexture: {
        class: mapClass,
      },
      orthoTexture: {
        class: orthoClass,
      },
    };

    var metadata = new FeatureMetadata({
      schema: schema,
      featureTextures: mockTextures,
    });

    expect(mapClass.id).toBe("map");
    expect(orthoClass.id).toBe("ortho");

    var mapTexture = metadata.getFeatureTexture("mapTexture");
    var orthoTexture = metadata.getFeatureTexture("orthoTexture");

    expect(mapTexture.class).toBe(mapClass);
    expect(orthoTexture.class).toBe(orthoClass);
  });

  it("creates feature metadata with extras", function () {
    var extras = {
      date: "2021-04-14",
    };

    var metadata = new FeatureMetadata({
      extras: extras,
      schema: new MetadataSchema(featureTablesSchema),
    });

    expect(metadata.extras).toBe(extras);
  });

  it("creates feature metadata with extensions", function () {
    var extensions = {
      "3DTILES_extension": {},
    };

    var metadata = new FeatureMetadata({
      extensions: extensions,
      schema: new MetadataSchema(featureTablesSchema),
    });

    expect(metadata.extensions).toBe(extensions);
  });

  it("creates feature metadata with statistics", function () {
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

    var metadata = new FeatureMetadata({
      statistics: statistics,
      schema: new MetadataSchema(featureTablesSchema),
    });

    expect(metadata.statistics).toBe(statistics);
  });

  it("getFeatureTable throws without featureTableId", function () {
    var metadata = new FeatureMetadata({
      extension: {},
      schema: new MetadataSchema(featureTablesSchema),
    });

    expect(function () {
      metadata.getFeatureTable();
    }).toThrowDeveloperError();
  });

  it("getFeatureTexture throws without featureTextureId", function () {
    var metadata = new FeatureMetadata({
      extension: {},
      schema: new MetadataSchema(featureTexturesSchema),
    });

    expect(function () {
      metadata.getFeatureTexture();
    }).toThrowDeveloperError();
  });
});
