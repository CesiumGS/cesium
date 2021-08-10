import {
  FeatureTexture,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe("Scene/FeatureTexture", function () {
  var classDefinition;
  var context;
  var texture0;
  var texture1;
  var extras;
  var extensions;
  var featureTexture;

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
            type: "UINT8",
          },
          ortho: {
            type: "UINT8",
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

    var featureTextureJson = {
      class: "map",
      extras: extras,
      extensions: extensions,
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
        ortho: {
          channels: "r",
          texture: {
            index: 1,
            texCoord: 0,
          },
        },
      },
    };

    featureTexture = new FeatureTexture({
      featureTexture: featureTextureJson,
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
    expect(featureTexture.class).toBe(classDefinition);
    expect(featureTexture.extras).toBe(extras);
    expect(featureTexture.extensions).toBe(extensions);
  });

  it("constructor throws without featureTexture", function () {
    expect(function () {
      return new FeatureTexture({
        class: classDefinition,
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new FeatureTexture({
        featureTexture: {},
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without textures", function () {
    expect(function () {
      return new FeatureTexture({
        featureTexture: {},
        class: classDefinition,
      });
    }).toThrowDeveloperError();
  });

  it("getProperty returns feature texture property", function () {
    expect(featureTexture.getProperty("color")).toBeDefined();
    expect(featureTexture.getProperty("intensity")).toBeDefined();
    expect(featureTexture.getProperty("ortho")).toBeDefined();
  });

  it("getProperty returns undefined if the property doesn't exist", function () {
    expect(featureTexture.getProperty("other")).toBeUndefined();
  });

  it("getProperty throws if propertyId is undefined", function () {
    expect(function () {
      featureTexture.getProperty(undefined);
    }).toThrowDeveloperError();
  });
});
