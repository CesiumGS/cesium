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
  let classProperty;
  let context;
  let texture;
  let extras;
  let extensions;
  let propertyTextureProperty;

  beforeAll(function () {
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

    classProperty = classDefinition.properties.color;

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

  it("creates feature texture property", function () {
    expect(propertyTextureProperty.extras).toBe(extras);
    expect(propertyTextureProperty.extensions).toBe(extensions);

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

  it("constructor throws without property", function () {
    expect(function () {
      return new PropertyTextureProperty({
        classProperty: classProperty,
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new PropertyTextureProperty({
        property: {},
        textures: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without textures", function () {
    expect(function () {
      return new PropertyTextureProperty({
        property: {},
        classProperty: classProperty,
      });
    }).toThrowDeveloperError();
  });
});
