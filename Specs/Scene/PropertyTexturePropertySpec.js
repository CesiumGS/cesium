import {
  PropertyTextureProperty,
  Matrix3,
  MetadataClass,
  PixelDatatype,
  PixelFormat,
  Texture,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe("Scene/PropertyTextureProperty", function () {
  let textureInfo;
  let extras;
  let channels;
  let propertyTextureProperty;

  const classDefinition = new MetadataClass({
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

  const classProperty = classDefinition.properties.color;

  let context;
  let texture;
  beforeAll(function () {
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

    textureInfo = {
      index: 0,
      texCoord: 0,
      extensions: {
        KHR_texture_transform: {
          offset: [0.5, 0.5],
          scale: [0.1, 0.2],
          texCoord: 1,
        },
      },
      extras: extras,
    };

    channels = [0, 1, 2];

    propertyTextureProperty = new PropertyTextureProperty({
      textureInfo: textureInfo,
      classProperty: classProperty,
      channels: channels,
      texture: texture,
    });
  });

  afterAll(function () {
    texture.destroy();
    context.destroyForSpecs();
  });

  it("creates feature texture property", function () {
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

  it("constructor throws without textureInfo", function () {
    expect(function () {
      return new PropertyTextureProperty({
        textureInfo: undefined,
        classProperty: classProperty,
        channels: channels,
        texture: texture,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without classProperty", function () {
    expect(function () {
      return new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: undefined,
        channels: channels,
        texture: texture,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without channels", function () {
    expect(function () {
      return new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: classProperty,
        channels: undefined,
        texture: texture,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without texture", function () {
    expect(function () {
      return new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: classProperty,
        channels: channels,
        texture: undefined,
      });
    }).toThrowDeveloperError();
  });
});
