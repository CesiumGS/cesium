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
    var propertyTablesSchema = {
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
          schema: new MetadataSchema(propertyTablesSchema),
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
        schema: new MetadataSchema(propertyTablesSchema),
      });

      expect(metadata.schema).toBeDefined();
      expect(metadata.statistics).toBeUndefined();
      expect(metadata.extras).toBeUndefined();
      expect(metadata.extensions).toBeUndefined();
    });

    it("parses extension with property tables", function () {
      if (!MetadataTester.isSupported()) {
        return;
      }

      var propertyTableResults = MetadataTester.createPropertyTables({
        schema: propertyTablesSchema,
        propertyTables: [
          {
            name: "Buildings",
            class: "building",
            properties: {
              name: ["Building A", "Building B", "Building C"],
              height: [10.0, 20.0, 30.0],
            },
          },
          {
            name: "Trees",
            class: "tree",
            properties: {
              species: ["Oak", "Pine"],
            },
          },
        ],
      });

      var extension = {
        schema: propertyTablesSchema,
        propertyTables: propertyTableResults.propertyTables,
      };

      var metadata = parseFeatureMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTablesSchema),
        bufferViews: propertyTableResults.bufferViews,
      });

      var buildingClass = metadata.schema.classes.building;
      var treeClass = metadata.schema.classes.tree;

      expect(buildingClass.id).toBe("building");
      expect(treeClass.id).toBe("tree");

      var buildingsTable = metadata.getPropertyTable(0);
      var treesTable = metadata.getPropertyTable(1);

      expect(buildingsTable.count).toBe(3);
      expect(buildingsTable.id).toBe(0);
      expect(buildingsTable.name).toBe("Buildings");
      expect(buildingsTable.class).toBe(buildingClass);
      expect(buildingsTable.getPropertyIds().length).toBe(2);
      expect(buildingsTable.getProperty(0, "name")).toBe("Building A");
      expect(buildingsTable.getProperty(1, "name")).toBe("Building B");
      expect(buildingsTable.getProperty(2, "name")).toBe("Building C");
      expect(buildingsTable.getProperty(0, "height")).toBe(10.0);
      expect(buildingsTable.getProperty(1, "height")).toBe(20.0);
      expect(buildingsTable.getProperty(2, "height")).toBe(30.0);

      expect(treesTable.count).toBe(2);
      expect(treesTable.id).toBe(1);
      expect(treesTable.name).toBe("Trees");
      expect(treesTable.class).toBe(treeClass);
      expect(treesTable.getPropertyIds().length).toBe(1);
      expect(treesTable.getProperty(0, "species")).toBe("Oak");
      expect(treesTable.getProperty(1, "species")).toBe("Pine");
    });

    it("parses extension with property textures", function () {
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
        propertyTextures: [
          {
            name: "Map",
            class: "map",
            index: 0,
            texCoord: 0,
            properties: {
              color: [0, 1, 2],
              intensity: [3],
            },
          },
          {
            name: "Ortho",
            class: "ortho",
            index: 1,
            texCoord: 1,
            properties: {
              vegetation: [0],
            },
          },
        ],
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

      var mapTexture = metadata.getPropertyTexture(0);
      var orthoTexture = metadata.getPropertyTexture(1);

      expect(mapTexture.class).toBe(mapClass);
      expect(mapTexture.id).toBe(0);
      expect(mapTexture.name).toBe("Map");
      expect(orthoTexture.class).toBe(orthoClass);
      expect(orthoTexture.id).toBe(1);
      expect(orthoTexture.name).toBe("Ortho");

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
