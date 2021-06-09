import {
  FeatureTextureProperty,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe("Scene/FeatureTextureProperty", function () {
  var classDefinition = new MetadataClass({
    id: "map",
    class: {
      properties: {
        color: {
          type: "ARRAY",
          componentType: "UINT8",
          componentCount: 3,
        },
      },
    },
  });
  var classProperty = classDefinition.properties.color;

  it("creates feature texture property", function () {
    var context = createContext();
    var texture = new Texture({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        arrayBufferView: new Uint8Array([1, 2, 3, 4]),
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

    var property = {
      channels: "rgb",
      texture: {
        index: 0,
        texCoord: 0,
      },
      extras: extras,
      extensions: extensions,
    };
    var featureTexture = new FeatureTextureProperty({
      property: property,
      classProperty: classProperty,
      textures: {
        0: texture,
      },
    });

    expect(featureTexture.extras).toBe(extras);
    expect(featureTexture.extensions).toBe(extensions);

    texture.destroy();
    context.destroyForSpecs();
  });

  it("constructor throws without property", function () {
    expect(function () {
      return new FeatureTextureProperty({
        classProperty: classProperty,
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new FeatureTextureProperty({
        property: {},
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without textures", function () {
    expect(function () {
      return new FeatureTextureProperty({
        property: {},
        classProperty: classProperty,
      });
    }).toThrowDeveloperError();
  });
});
