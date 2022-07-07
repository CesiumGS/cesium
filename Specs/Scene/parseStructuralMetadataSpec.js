import {
  MetadataSchema,
  parseStructuralMetadata,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";
import MetadataTester from "../MetadataTester.js";

describe(
  "Scene/parseStructuralMetadata",
  function () {
    const propertyTablesSchema = {
      classes: {
        building: {
          properties: {
            name: {
              type: "STRING",
            },
            height: {
              type: "SCALAR",
              componentType: "FLOAT64",
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

    const propertyTexturesSchema = {
      classes: {
        map: {
          properties: {
            color: {
              type: "SCALAR",
              componentType: "UINT8",
              array: true,
              count: 3,
            },
            intensity: {
              type: "SCALAR",
              componentType: "UINT8",
            },
          },
        },
        ortho: {
          properties: {
            vegetation: {
              type: "SCALAR",
              componentType: "UINT8",
              normalized: true,
            },
          },
        },
      },
    };

    const propertyAttributesSchema = {
      classes: {
        points: {
          properties: {
            color: {
              type: "VEC3",
              componentType: "UINT8",
              array: true,
              count: 3,
            },
            intensity: {
              type: "SCALAR",
              componentType: "UINT8",
            },
            pointSize: {
              type: "SCALAR",
              componentTYpe: "FLOAT32",
            },
          },
        },
      },
    };

    it("throws without extension", function () {
      expect(function () {
        return parseStructuralMetadata({
          extension: undefined,
          schema: new MetadataSchema(propertyTablesSchema),
        });
      }).toThrowDeveloperError();
    });

    it("throws without schema", function () {
      expect(function () {
        return parseStructuralMetadata({
          extension: {},
          schema: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("parses extension with default values", function () {
      const metadata = parseStructuralMetadata({
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

      const propertyTableResults = MetadataTester.createPropertyTables({
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

      const extension = {
        schema: propertyTablesSchema,
        propertyTables: propertyTableResults.propertyTables,
      };

      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTablesSchema),
        bufferViews: propertyTableResults.bufferViews,
      });

      const buildingClass = metadata.schema.classes.building;
      const treeClass = metadata.schema.classes.tree;

      expect(buildingClass.id).toBe("building");
      expect(treeClass.id).toBe("tree");

      const buildingsTable = metadata.getPropertyTable(0);
      const treesTable = metadata.getPropertyTable(1);

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
        schema: propertyTexturesSchema,
        propertyTextures: [
          {
            name: "Map",
            class: "map",
            properties: {
              color: {
                index: 0,
                texCoord: 0,
                channels: [0, 1, 2],
              },
              intensity: {
                index: 0,
                texCoord: 0,
                channels: [3],
              },
            },
          },
          {
            name: "Ortho",
            class: "ortho",
            properties: {
              vegetation: {
                index: 1,
                texCoord: 1,
                channels: [0],
              },
            },
          },
        ],
      };

      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTexturesSchema),
        textures: textures,
      });

      const mapClass = metadata.schema.classes.map;
      const orthoClass = metadata.schema.classes.ortho;

      expect(mapClass.id).toBe("map");
      expect(orthoClass.id).toBe("ortho");

      const mapTexture = metadata.getPropertyTexture(0);
      const orthoTexture = metadata.getPropertyTexture(1);

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

    it("parses extension with property attributes", function () {
      const extension = {
        schema: propertyAttributesSchema,
        propertyAttributes: [
          {
            class: "points",
            name: "Points",
            properties: {
              color: {
                attribute: "_COLOR",
              },
              intensity: {
                attribute: "_INTENSITY",
              },
              pointSize: {
                attribute: "_POINT_SIZE",
              },
            },
          },
        ],
      };

      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyAttributesSchema),
      });

      const pointsClass = metadata.schema.classes.points;
      expect(pointsClass.id).toBe("points");

      const propertyAttribute = metadata.getPropertyAttribute(0);
      expect(propertyAttribute.id).toBe(0);
      expect(propertyAttribute.name).toBe("Points");
      expect(propertyAttribute.class).toBe(pointsClass);
      expect(propertyAttribute.getProperty("color").attribute).toBe("_COLOR");
      expect(propertyAttribute.getProperty("intensity").attribute).toBe(
        "_INTENSITY"
      );
      expect(propertyAttribute.getProperty("pointSize").attribute).toBe(
        "_POINT_SIZE"
      );
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
      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTexturesSchema),
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
      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTexturesSchema),
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
      const metadata = parseStructuralMetadata({
        extension: extension,
        schema: new MetadataSchema(propertyTexturesSchema),
      });

      expect(metadata.extensions).toBe(extensions);
    });
  },
  "WebGL"
);
