import {
  MetadataSchema,
  parseStructuralMetadata,
  PixelDatatype,
  PixelFormat,
  Texture,
  TextureWrap,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  defined,
  ContextLimits,
} from "../../index.js";
import createContext from "../../../../Specs/createContext.js";
import MetadataTester from "../../../../Specs/MetadataTester.js";

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
          schema: MetadataSchema.fromJson(propertyTablesSchema),
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
        schema: MetadataSchema.fromJson(propertyTablesSchema),
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
        schema: MetadataSchema.fromJson(propertyTablesSchema),
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
        schema: MetadataSchema.fromJson(propertyTexturesSchema),
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
        schema: MetadataSchema.fromJson(propertyAttributesSchema),
      });

      const pointsClass = metadata.schema.classes.points;
      expect(pointsClass.id).toBe("points");

      const propertyAttribute = metadata.getPropertyAttribute(0);
      expect(propertyAttribute.id).toBe(0);
      expect(propertyAttribute.name).toBe("Points");
      expect(propertyAttribute.class).toBe(pointsClass);
      expect(propertyAttribute.getProperty("color").attribute).toBe("_COLOR");
      expect(propertyAttribute.getProperty("intensity").attribute).toBe(
        "_INTENSITY",
      );
      expect(propertyAttribute.getProperty("pointSize").attribute).toBe(
        "_POINT_SIZE",
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
        schema: MetadataSchema.fromJson(propertyTexturesSchema),
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
        schema: MetadataSchema.fromJson(propertyTexturesSchema),
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
        schema: MetadataSchema.fromJson(propertyTexturesSchema),
      });

      expect(metadata.extensions).toBe(extensions);
    });

    describe("Property Table Textures", function () {
      if (!MetadataTester.isSupported()) {
        return;
      }

      let context;
      let structuralMetadata;
      const maximumTextureSize = ContextLimits.maximumTextureSize;

      beforeEach(function () {
        context = createContext();
      });

      afterEach(function () {
        if (defined(structuralMetadata)) {
          structuralMetadata.destroy();
          structuralMetadata = undefined;
        }

        if (context && !context.isDestroyed()) {
          context.destroyForSpecs();
        }
        context = undefined;
        ContextLimits._maximumTextureSize = maximumTextureSize;
      });

      it("creates a texture for a well-formed property table", function () {
        const schemaJson = {
          classes: {
            feature: {
              properties: {
                a: {
                  type: "SCALAR",
                  componentType: "INT32",
                },
                b: {
                  type: "SCALAR",
                  componentType: "INT32",
                },
              },
            },
          },
        };

        const extension = {
          propertyTables: [
            {
              name: "Features",
              class: "feature",
              count: 3,
              properties: {
                a: { values: 0 },
                b: { values: 1 },
              },
            },
          ],
        };

        const bufferViews = {
          // INT32 values [1,2,3] => 12 bytes little-endian
          0: new Uint8Array([1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0]),
          // INT32 values [4,5,6] => 12 bytes little-endian
          1: new Uint8Array([4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0]),
        };

        structuralMetadata = parseStructuralMetadata({
          extension: extension,
          schema: MetadataSchema.fromJson(schemaJson),
          bufferViews: bufferViews,
          context: context,
        });

        const table = structuralMetadata.getPropertyTable(0);
        expect(table).toBeDefined();

        const texture = table.texture;
        expect(texture).toBeDefined();
        expect(texture.pixelFormat).toBe(PixelFormat.RGBA);
        expect(texture.pixelDatatype).toBe(PixelDatatype.UNSIGNED_BYTE);
        // width = numFeatures, height = numGpuCompatibleProperties
        expect(texture.width).toBe(3);
        expect(texture.height).toBe(2);

        const sampler = texture.sampler;
        expect(sampler.wrapS).toBe(TextureWrap.CLAMP_TO_EDGE);
        expect(sampler.wrapT).toBe(TextureWrap.CLAMP_TO_EDGE);
        expect(sampler.minificationFilter).toBe(
          TextureMinificationFilter.NEAREST,
        );
        expect(sampler.magnificationFilter).toBe(
          TextureMagnificationFilter.NEAREST,
        );
      });

      it("creates a texture correctly when property data needs padding ", function () {
        const schemaJson = {
          classes: {
            feature: {
              properties: {
                a: {
                  type: "SCALAR",
                  componentType: "UINT8",
                },
                b: {
                  type: "SCALAR",
                  componentType: "UINT16",
                },
              },
            },
          },
        };

        const extension = {
          propertyTables: [
            {
              name: "Features",
              class: "feature",
              count: 3,
              properties: {
                a: { values: 0 },
                b: { values: 1 },
              },
            },
          ],
        };

        // Since UINT8 and UINT16 do not align to 4-byte boundaries, padding will be required in the texture.
        const bufferViews = {
          0: new Uint8Array([1, 2, 3]), // UINT8
          1: new Uint8Array([0x02, 0x01, 0x04, 0x03, 0x06, 0x05]), // UINT16, little-endian
        };

        let createdTextureOptions;
        spyOn(Texture, "create").and.callFake(function (options) {
          createdTextureOptions = options;
          return new Texture(options);
        });

        structuralMetadata = parseStructuralMetadata({
          extension: extension,
          schema: MetadataSchema.fromJson(schemaJson),
          bufferViews: bufferViews,
          context: context,
        });

        const texture = structuralMetadata.getPropertyTable(0).texture;
        expect(texture).toBeDefined();

        expect(createdTextureOptions).toBeDefined();
        expect(createdTextureOptions.source).toBeDefined();
        const packed = createdTextureOptions.source.arrayBufferView;
        expect(packed).toBeDefined();

        const expected = [
          // Row 0 (a: UINT8):  [1,0,0,0, 2,0,0,0, 3,0,0,0]
          1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0,
          // Row 1 (b: UINT16): [02,01,0,0, 04,03,0,0, 06,05,0,0]
          0x02, 0x01, 0, 0, 0x04, 0x03, 0, 0, 0x06, 0x05, 0, 0,
        ];

        expect(Array.from(packed)).toEqual(expected);
      });

      it("creates an undefined texture if property table has no gpu-compatible properties", function () {
        const schemaJson = {
          classes: {
            building: {
              properties: {
                // STRING is not GPU compatible
                name: { type: "STRING" },
                // FLOAT64 is not GPU compatible (currently)
                height: { type: "SCALAR", componentType: "FLOAT64" },
              },
            },
          },
        };

        const extension = {
          propertyTables: [
            {
              name: "Buildings",
              class: "building",
              count: 2,
              properties: {
                name: { stringOffsets: 0, values: 1 },
                height: { values: 2 },
              },
            },
          ],
        };

        // Minimal well-formed buffers (just good enough for testing)
        // name.stringOffsets: 3 * UINT32 for count=2 => [0, 1, 2]
        const nameStringOffsets = new Uint8Array([
          0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0,
        ]);
        // name.values: UTF-8 bytes for "A" + "B"
        const nameValues = new Uint8Array([65, 66]);
        const heightValues = new Uint8Array(
          new Float64Array([10.0, 20.0]).buffer,
        );

        const bufferViews = {
          0: nameStringOffsets,
          1: nameValues,
          2: heightValues,
        };

        const metadata = parseStructuralMetadata({
          extension: extension,
          schema: MetadataSchema.fromJson(schemaJson),
          bufferViews: bufferViews,
          context: context,
        });

        const table = metadata.getPropertyTable(0);
        expect(table).toBeDefined();
        expect(table.texture).toBeUndefined();
      });

      it("warns and returns an undefined texture if the number of properties or features exceeds the maximum texture size", function () {
        spyOn(console, "warn");
        ContextLimits._maximumTextureSize = 1;

        const schemaJson = {
          classes: {
            feature: {
              properties: {
                a: { type: "SCALAR", componentType: "UINT8" },
              },
            },
          },
        };

        const extension = {
          propertyTables: [
            {
              name: "TooBig_ForTest_1",
              class: "feature",
              count: 2, // exceeds maxTextureSize=1
              properties: {
                a: { values: 0 },
              },
            },
          ],
        };

        const bufferViews = {
          0: new Uint8Array([1, 2]),
        };

        const metadata = parseStructuralMetadata({
          extension: extension,
          schema: MetadataSchema.fromJson(schemaJson),
          bufferViews: bufferViews,
          context: context,
        });

        const table = metadata.getPropertyTable(0);
        expect(table).toBeDefined();
        expect(table.texture).toBeUndefined();
        expect(console.warn).toHaveBeenCalled();
      });

      it("throws an error if a property's buffer length does not match the number of features", function () {
        const schemaJson = {
          classes: {
            feature: {
              properties: {
                a: { type: "SCALAR", componentType: "UINT8" },
              },
            },
          },
        };

        const extension = {
          propertyTables: [
            {
              name: "BadLengths",
              class: "feature",
              count: 2, // expects 2 elements
              properties: {
                a: { values: 0 },
              },
            },
          ],
        };

        const bufferViews = {
          0: new Uint8Array([7]), // only 1 element -> should throw
        };

        expect(function () {
          parseStructuralMetadata({
            extension: extension,
            schema: MetadataSchema.fromJson(schemaJson),
            bufferViews: bufferViews,
            context: context,
          });
        }).toThrowError();
      });
    });
  },
  "WebGL",
);
