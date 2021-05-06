import {
  MetadataSchema,
  parseFeatureMetadata,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";
import MetadataTester from "../MetadataTester.js";

describe(
  "Scene/parseFeatureMetadata",
  function () {
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

    it("throws without extension", function () {
      expect(function () {
        return parseFeatureMetadata({
          extension: undefined,
          schema: new MetadataSchema(featureTablesSchema),
        });
      }).toThrowDeveloperError();
    });

    it("throws without schema", function () {
      expect(function () {
        return parseFeatureMetadata({
          extension: {},
          schema: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("parses extension with default values", function () {
      var metadata = parseFeatureMetadata({
        extension: {},
        schema: new MetadataSchema(featureTablesSchema),
      });

      expect(metadata.schema).toBeDefined();
      expect(metadata.statistics).toBeUndefined();
      expect(metadata.extras).toBeUndefined();
      expect(metadata.extensions).toBeUndefined();
    });

    it("parses extension with feature tables", function () {
      if (!MetadataTester.isSupported()) {
        return;
      }

      var featureTableResults = MetadataTester.createFeatureTables({
        schema: featureTablesSchema,
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
        schema: featureTablesSchema,
        featureTables: featureTableResults.featureTables,
      };

      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(featureTablesSchema),
        bufferViews: featureTableResults.bufferViews,
      });

      var buildingClass = metadata.schema.classes.building;
      var treeClass = metadata.schema.classes.tree;

      expect(buildingClass.id).toBe("building");
      expect(treeClass.id).toBe("tree");

      var buildingsTable = metadata.getFeatureTable("buildings");
      var treesTable = metadata.getFeatureTable("trees");

      expect(buildingsTable.count).toBe(3);
      expect(buildingsTable.class).toBe(buildingClass);
      expect(buildingsTable.getPropertyIds().length).toBe(2);
      expect(buildingsTable.getProperty(0, "name")).toBe("Building A");
      expect(buildingsTable.getProperty(1, "name")).toBe("Building B");
      expect(buildingsTable.getProperty(2, "name")).toBe("Building C");
      expect(buildingsTable.getProperty(0, "height")).toBe(10.0);
      expect(buildingsTable.getProperty(1, "height")).toBe(20.0);
      expect(buildingsTable.getProperty(2, "height")).toBe(30.0);

      expect(treesTable.count).toBe(2);
      expect(treesTable.class).toBe(treeClass);
      expect(treesTable.getPropertyIds().length).toBe(1);
      expect(treesTable.getProperty(0, "species")).toBe("Oak");
      expect(treesTable.getProperty(1, "species")).toBe("Pine");
    });

    it("parses extension with feature textures", function () {
      var context = createContext();
      var texture0 = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([1, 2, 3, 4]),
          width: 1,
          height: 1,
        },
      });
      var texture1 = new Texture({
        context: context,
        pixelFormat: PixelFormat.LUMINANCE,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([5]),
          width: 1,
          height: 1,
        },
      });

      var textures = {
        0: texture0,
        1: texture1,
      };

      var extension = {
        schema: featureTexturesSchema,
        featureTextures: {
          mapTexture: {
            class: "map",
            properties: {
              color: {
                channels: "rgb",
                texture: {
                  index: 0,
                  texCoord: 0,
                },
              },
              intensity: {
                channels: "a",
                texture: {
                  index: 0,
                  texCoord: 0,
                },
              },
            },
          },
          orthoTexture: {
            class: "ortho",
            properties: {
              vegetation: {
                channels: "r",
                texture: {
                  index: 1,
                  texCoord: 1,
                },
              },
            },
          },
        },
      };

      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
        textures: textures,
      });

      var mapClass = metadata.schema.classes.map;
      var orthoClass = metadata.schema.classes.ortho;

      expect(mapClass.id).toBe("map");
      expect(orthoClass.id).toBe("ortho");

      var mapTexture = metadata.getFeatureTexture("mapTexture");
      var orthoTexture = metadata.getFeatureTexture("orthoTexture");

      expect(mapTexture.class).toBe(mapClass);
      expect(orthoTexture.class).toBe(orthoClass);

      texture0.destroy();
      texture1.destroy();
      context.destroyForSpecs();
    });

    it("parses extension with statistics", function () {
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
      var extension = {
        statistics: statistics,
      };
      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });
      expect(metadata.statistics).toBe(statistics);
    });

    it("parses extension with extras", function () {
      var extras = {
        description: "Extra",
      };
      var extension = {
        extras: extras,
      };
      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });
      expect(metadata.extras).toBe(extras);
    });

    it("parses extension with extensions", function () {
      var extensions = {
        EXT_other_extension: {},
      };
      var extension = {
        extensions: extensions,
      };
      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });

      expect(metadata.extensions).toBe(extensions);
    });
  },
  "WebGL"
);
