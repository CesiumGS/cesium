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
  },
  "WebGL",
);
