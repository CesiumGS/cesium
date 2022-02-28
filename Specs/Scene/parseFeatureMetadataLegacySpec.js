import {
  MetadataSchema,
  parseFeatureMetadataLegacy,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";
import MetadataTester from "../MetadataTester.js";

describe(
  "Scene/parseFeatureMetadataLegacy",
  function () {
    const featureTablesSchema = {
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

    const featureTexturesSchema = {
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
        return parseFeatureMetadataLegacy({
          extension: undefined,
          schema: new MetadataSchema(featureTablesSchema),
        });
      }).toThrowDeveloperError();
    });

    it("throws without schema", function () {
      expect(function () {
        return parseFeatureMetadataLegacy({
          extension: {},
          schema: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("parses extension with default values", function () {
      const metadata = parseFeatureMetadataLegacy({
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

      const featureTableResults = MetadataTester.createFeatureTables({
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

      const extension = {
        schema: featureTablesSchema,
        featureTables: featureTableResults.featureTables,
      };

      const metadata = parseFeatureMetadataLegacy({
        extension: extension,
        schema: new MetadataSchema(featureTablesSchema),
        bufferViews: featureTableResults.bufferViews,
      });

      const buildingClass = metadata.schema.classes.building;
      const treeClass = metadata.schema.classes.tree;

      expect(buildingClass.id).toBe("building");
      expect(treeClass.id).toBe("tree");

      const buildingsTable = metadata.getPropertyTable(0);
      const treesTable = metadata.getPropertyTable(1);

      expect(buildingsTable.id).toBe("buildings");
      expect(buildingsTable.name).not.toBeDefined();
      expect(buildingsTable.count).toBe(3);
      expect(buildingsTable.class).toBe(buildingClass);
      expect(buildingsTable.getPropertyIds().length).toBe(2);
      expect(buildingsTable.getProperty(0, "name")).toBe("Building A");
      expect(buildingsTable.getProperty(1, "name")).toBe("Building B");
      expect(buildingsTable.getProperty(2, "name")).toBe("Building C");
      expect(buildingsTable.getProperty(0, "height")).toBe(10.0);
      expect(buildingsTable.getProperty(1, "height")).toBe(20.0);
      expect(buildingsTable.getProperty(2, "height")).toBe(30.0);

      expect(treesTable.id).toBe("trees");
      expect(treesTable.name).not.toBeDefined();
      expect(treesTable.count).toBe(2);
      expect(treesTable.class).toBe(treeClass);
      expect(treesTable.getPropertyIds().length).toBe(1);
      expect(treesTable.getProperty(0, "species")).toBe("Oak");
      expect(treesTable.getProperty(1, "species")).toBe("Pine");
    });

    it("parses extension with feature textures", function () {
      const context = createContext();
      const texture0 = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([1, 2, 3, 4]),
          width: 1,
          height: 1,
        },
      });
      const texture1 = new Texture({
        context: context,
        pixelFormat: PixelFormat.LUMINANCE,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([5]),
          width: 1,
          height: 1,
        },
      });

      const textures = {
        0: texture0,
        1: texture1,
      };

      const extension = {
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

      const metadata = parseFeatureMetadataLegacy({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
        textures: textures,
      });

      const mapClass = metadata.schema.classes.map;
      const orthoClass = metadata.schema.classes.ortho;

      expect(mapClass.id).toBe("map");
      expect(orthoClass.id).toBe("ortho");

      const mapTexture = metadata.getPropertyTexture(0);
      const orthoTexture = metadata.getPropertyTexture(1);

      expect(mapTexture.class).toBe(mapClass);
      expect(mapTexture.id).toBe("mapTexture");
      expect(mapTexture.name).not.toBeDefined();
      expect(orthoTexture.class).toBe(orthoClass);
      expect(orthoTexture.id).toBe("orthoTexture");
      expect(orthoTexture.name).not.toBeDefined();

      texture0.destroy();
      texture1.destroy();
      context.destroyForSpecs();
    });

    it("parses extension with statistics", function () {
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
      const extension = {
        statistics: statistics,
      };
      const metadata = parseFeatureMetadataLegacy({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });
      expect(metadata.statistics).toBe(statistics);
    });

    it("parses extension with extras", function () {
      const extras = {
        description: "Extra",
      };
      const extension = {
        extras: extras,
      };
      const metadata = parseFeatureMetadataLegacy({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });
      expect(metadata.extras).toBe(extras);
    });

    it("parses extension with extensions", function () {
      const extensions = {
        EXT_other_extension: {},
      };
      const extension = {
        extensions: extensions,
      };
      const metadata = parseFeatureMetadataLegacy({
        extension: extension,
        schema: new MetadataSchema(featureTexturesSchema),
      });

      expect(metadata.extensions).toBe(extensions);
    });
  },
  "WebGL"
);
