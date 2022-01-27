import {
  PropertyTexture,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe("Scene/PropertyTexture", function () {
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
            type: "ARRAY",
            componentType: "UINT8",
            componentCount: 3,
          },
          intensity: {
            componentType: "UINT8",
          },
          ortho: {
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
      index: 1,
      texCoord: 1,
      properties: {
        color: [0, 1, 2],
        intensity: [3],
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

  it("creates feature texture", function () {
    expect(propertyTexture.class).toBe(classDefinition);
    expect(propertyTexture.extras).toBe(extras);
    expect(propertyTexture.extensions).toBe(extensions);
  });

  it("constructor throws without propertyTexture", function () {
    expect(function () {
      return new PropertyTexture({
        propertyTexture: undefined,
        class: classDefinition,
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new PropertyTexture({
        propertyTexture: {},
        class: undefined,
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without textures", function () {
    expect(function () {
      return new PropertyTexture({
        propertyTexture: {},
        class: classDefinition,
        textures: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getProperty returns feature texture property", function () {
    expect(propertyTexture.getProperty("color")).toBeDefined();
    expect(propertyTexture.getProperty("intensity")).toBeDefined();
  });

  it("getProperty returns undefined if the property doesn't exist", function () {
    expect(propertyTexture.getProperty("other")).toBeUndefined();
  });

  it("getProperty throws if propertyId is undefined", function () {
    expect(function () {
      propertyTexture.getProperty(undefined);
    }).toThrowDeveloperError();
  });
});
