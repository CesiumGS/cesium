import {
  PropertyTextureProperty,
  Matrix3,
  MetadataClassProperty,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../index.js";
import createContext from "../../../../Specs/createContext.js";

describe(
  "Scene/PropertyTextureProperty",
  function () {
    let classProperty;
    let context;
    let texture;
    let extras;
    let extensions;
    let propertyTextureProperty;

    beforeAll(function () {
      classProperty = MetadataClassProperty.fromJson({
        id: "color",
        property: {
          array: true,
          type: "SCALAR",
          componentType: "UINT8",
          count: 3,
        },
      });

      context = createContext();

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([1, 2, 3, 4]),
          width: 1,
          height: 1,
        },
      });

      extras = {
        description: "Extra",
      };

      extensions = {
        KHR_texture_transform: {
          offset: [0.5, 0.5],
          scale: [0.1, 0.2],
          texCoord: 1,
        },
      };

      const property = {
        channels: [0, 1, 2],
        index: 0,
        texCoord: 0,
        extensions: extensions,
        extras: extras,
      };

      propertyTextureProperty = new PropertyTextureProperty({
        property: property,
        classProperty: classProperty,
        textures: {
          0: texture,
        },
      });
    });

    afterAll(function () {
      texture.destroy();
      context.destroyForSpecs();
    });

    function makeProperty(options) {
      const classProperty = MetadataClassProperty.fromJson({
        id: "propertyId",
        property: options.property,
      });
      return new PropertyTextureProperty({
        property: {
          channels: options.channels,
          index: 0,
          texCoord: 0,
        },
        classProperty: classProperty,
        textures: {
          0: texture,
        },
      });
    }

    it("creates property texture property", function () {
      expect(propertyTextureProperty.extras).toBe(extras);
      expect(propertyTextureProperty.extensions).toBe(extensions);
      expect(propertyTextureProperty.classProperty).toBe(classProperty);

      // prettier-ignore
      const expectedTransform = new Matrix3(
      0.1, 0.0, 0.5,
      0.0, 0.2, 0.5,
      0.0, 0.0, 1.0
    );

      const modelTextureReader = propertyTextureProperty.textureReader;
      expect(modelTextureReader.texture).toBe(texture);
      expect(modelTextureReader.texCoord).toBe(1);
      expect(modelTextureReader.transform).toEqual(expectedTransform);
      expect(modelTextureReader.channels).toBe("rgb");
    });

    it("creates property texture property with default channels", function () {
      const property = makeProperty({
        property: {
          type: "SCALAR",
          componentType: "UINT8",
          normalized: true,
        },
      });
      expect(property.textureReader.channels).toBe("r");
    });

    it("constructor throws without property", function () {
      expect(function () {
        return new PropertyTextureProperty({
          property: undefined,
          classProperty: classProperty,
          textures: {},
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws without classProperty", function () {
      expect(function () {
        return new PropertyTextureProperty({
          property: {},
          classProperty: undefined,
          textures: {},
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws without textures", function () {
      expect(function () {
        return new PropertyTextureProperty({
          property: {},
          classProperty: classProperty,
          textures: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("isGpuCompatible returns false for variable-length arrays and string types", function () {
      const properties = [
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            array: true,
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),

        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            type: "STRING",
          },
        }),
      ];

      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].isGpuCompatible()).toBe(false);
      }
    });

    it("isGpuCompatible returns false for properties that can't fit in 4 channels", function () {
      const properties = [
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            type: "VEC4",
            componentType: "FLOAT32",
          },
        }),
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            type: "SCALAR",
            componentType: "UINT8",
            array: true,
            count: 5,
          },
        }),
        makeProperty({
          channels: [0, 1, 2],
          property: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        }),
      ];

      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].isGpuCompatible()).toBe(false);
      }
    });

    it("isGpuCompatible returns true for other types", function () {
      const properties = [
        makeProperty({
          channels: [0],
          property: {
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),
        makeProperty({
          channels: [0, 1],
          property: {
            type: "VEC2",
            componentType: "UINT8",
          },
        }),
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            array: true,
            count: 4,
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),
        makeProperty({
          channels: [0],
          property: {
            type: "SCALAR",
            componentType: "INT8",
          },
        }),
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            type: "VEC2",
            componentType: "UINT8",
            array: true,
            count: 2,
          },
        }),
        makeProperty({
          channels: [0, 1, 2, 3],
          property: {
            array: true,
            count: 4,
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),
      ];

      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].isGpuCompatible()).toBe(true);
      }
    });

    it("getGlslType returns floating point types for normalized UINT8 properties", function () {
      const properties = [
        makeProperty({
          channels: [0],
          property: {
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),
        makeProperty({
          channels: [0, 1],
          property: {
            type: "VEC2",
            componentType: "UINT8",
            normalized: true,
          },
        }),
        makeProperty({
          channels: [0, 1, 2],
          property: {
            array: true,
            count: 3,
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        }),
      ];

      const expectedTypes = ["float", "vec2", "vec3"];

      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].getGlslType()).toBe(expectedTypes[i]);
      }
    });

    it("getGlslType returns unsigned integer types for non-normalized UINT8 properties", function () {
      const properties = [
        makeProperty({
          channels: [0],
          property: {
            type: "SCALAR",
            componentType: "UINT8",
          },
        }),
        makeProperty({
          channels: [0, 1],
          property: {
            type: "VEC2",
            componentType: "UINT8",
          },
        }),
        makeProperty({
          channels: [0, 1, 2],
          property: {
            array: true,
            count: 3,
            type: "SCALAR",
            componentType: "UINT8",
          },
        }),
      ];

      const expectedTypes = ["uint", "uvec2", "uvec3"];

      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].getGlslType()).toBe(expectedTypes[i]);
      }
    });
  },
  "WebGL",
);
