import {
  PropertyTexture,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Scene/PropertyTexture",
  function () {
    let classDefinition;
    let context;
    let texture0;
    let texture1;
    let extras;
    let extensions;
    let propertyTexture;

    beforeAll(function () {
      classDefinition = new MetadataClass({
        id: "map",
        class: {
          properties: {
            color: {
              type: "VEC3",
              componentType: "UINT8",
            },
            intensity: {
              type: "SCALAR",
              componentType: "UINT8",
            },
            ortho: {
              type: "SCALAR",
              componentType: "UINT8",
              normalized: true,
            },
          },
        },
      });

      context = createContext();

      texture0 = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([1, 2, 3, 4]),
          width: 1,
          height: 1,
        },
      });

      texture1 = new Texture({
        context: context,
        pixelFormat: PixelFormat.LUMINANCE,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          arrayBufferView: new Uint8Array([5]),
          width: 1,
          height: 1,
        },
      });

      extras = {
        description: "Extra",
      };

      extensions = {
        EXT_other_extension: {},
      };

      const propertyTextureJson = {
        class: "map",
        extras: extras,
        extensions: extensions,
        properties: {
          color: {
            channels: [0, 1, 2],
            index: 0,
            texCoord: 0,
          },
          intensity: {
            channels: [3],
            index: 0,
            texCoord: 0,
          },
          ortho: {
            channels: [0],
            index: 1,
            texCoord: 0,
          },
        },
      };

      propertyTexture = new PropertyTexture({
        propertyTexture: propertyTextureJson,
        class: classDefinition,
        textures: {
          0: texture0,
          1: texture1,
        },
      });
    });

    afterAll(function () {
      texture0.destroy();
      texture1.destroy();
      context.destroyForSpecs();
    });

    it("creates property texture", function () {
      expect(propertyTexture.class).toBe(classDefinition);
      expect(propertyTexture.extras).toBe(extras);
      expect(propertyTexture.extensions).toBe(extensions);
    });

    it("constructor throws without propertyTexture", function () {
      expect(function () {
        return new PropertyTexture({
          class: classDefinition,
          textures: {},
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws without class", function () {
      expect(function () {
        return new PropertyTexture({
          propertyTexture: {},
          textures: {},
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws without textures", function () {
      expect(function () {
        return new PropertyTexture({
          propertyTexture: {},
          class: classDefinition,
        });
      }).toThrowDeveloperError();
    });

    it("getProperty returns property texture property", function () {
      expect(propertyTexture.getProperty("color")).toBeDefined();
      expect(propertyTexture.getProperty("intensity")).toBeDefined();
      expect(propertyTexture.getProperty("ortho")).toBeDefined();
    });

    it("getProperty returns undefined if the property doesn't exist", function () {
      expect(propertyTexture.getProperty("other")).toBeUndefined();
    });

    it("getProperty throws if propertyId is undefined", function () {
      expect(function () {
        propertyTexture.getProperty(undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
