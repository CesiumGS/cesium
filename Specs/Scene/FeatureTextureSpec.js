import {
  FeatureTexture,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe("Scene/FeatureTexture", function () {
  var classDefinition = new MetadataClass({
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

  it("creates feature texture", function () {
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

    var extras = {
      description: "Extra",
    };

    var extensions = {
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
    var featureTexture = new FeatureTexture({
      featureTexture: featureTextureJson,
      class: classDefinition,
      textures: {
        0: texture0,
        1: texture1,
      },
    });

    expect(featureTexture.class).toBe(classDefinition);
    expect(featureTexture.extras).toBe(extras);
    expect(featureTexture.extensions).toBe(extensions);

    texture0.destroy();
    texture1.destroy();
    context.destroyForSpecs();
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
});
