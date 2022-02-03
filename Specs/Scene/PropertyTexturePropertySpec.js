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

  describe("metadata unpacking", function () {
    const unpackingClass = new MetadataClass({
      id: "unpacking",
      class: {
        properties: {
          uint8: {
            componentType: "UINT8",
            normalized: false,
          },
          normalizedUint8: {
            componentType: "UINT8",
            normalized: true,
          },
          vec2: {
            type: "ARRAY",
            componentType: "UINT8",
            normalized: true,
            componentCount: 2,
          },
          ivec3: {
            type: "ARRAY",
            componentType: "UINT8",
            normalized: false,
            componentCount: 3,
          },
          unsupportedType: {
            type: "INT8",
          },
          tooManyComponents: {
            type: "ARRAY",
            componentType: "UINT8",
            componentCount: 6,
          },
        },
      },
    });

    const textureInfo = {
      index: 0,
      texCoord: 0,
    };

    let context;
    let texture;
    const properties = {};
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

      properties.uint8Property = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.uint8,
        channels: [0],
        texture: texture,
      });

      properties.normalizedUint8Property = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.normalizedUint8,
        channels: [0],
        texture: texture,
      });

      properties.vec2Property = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.vec2,
        channels: [1, 2],
        texture: texture,
      });

      properties.ivec3Property = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.ivec3,
        channels: [0, 1, 2],
        texture: texture,
      });

      properties.unsupportedProperty = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.unsupportedType,
        channels: [0],
        texture: texture,
      });

      properties.tooManyComponentsProperty = new PropertyTextureProperty({
        textureInfo: textureInfo,
        classProperty: unpackingClass.properties.tooManyComponents,
        channels: [0, 1, 2, 3, 4, 5, 6],
        texture: texture,
      });
    });

    afterAll(function () {
      texture.destroy();
      context.destroyForSpecs();
    });

    function applyUnpackingSteps(expression, unpackingSteps) {
      let result = expression;
      unpackingSteps.forEach(function (step) {
        result = step(result);
      });
      return result;
    }

    it("getUnpackingSteps throws for too many components", function () {
      expect(function () {
        return properties.tooManyComponentsProperty.getUnpackingSteps();
      }).toThrowDeveloperError();
    });

    it("getUnpackingSteps throws for invalid type", function () {
      expect(function () {
        return properties.unsupportedProperty.getUnpackingSteps();
      }).toThrowDeveloperError();
    });

    it("getUnpackingSteps works", function () {
      expect(properties.normalizedUint8Property.getUnpackingSteps()).toEqual(
        []
      );
      expect(properties.vec2Property.getUnpackingSteps()).toEqual([]);

      // Because int casts involve an anonymous function, apply the steps
      // to an expression
      let steps = properties.uint8Property.getUnpackingSteps();
      let expression = applyUnpackingSteps("x", steps);
      expect(expression).toEqual("int(255.0 * (x))");

      steps = properties.ivec3Property.getUnpackingSteps();
      expression = applyUnpackingSteps("x", steps);
      expect(expression).toEqual("ivec3(255.0 * (x))");
    });

    it("getGlslType throws for too many components", function () {
      expect(function () {
        return properties.tooManyComponentsProperty.getGlslType();
      }).toThrowDeveloperError();
    });

    it("getGlslType throws for invalid type", function () {
      expect(function () {
        return properties.unsupportedProperty.getGlslType();
      }).toThrowDeveloperError();
    });

    it("getGlslType works", function () {
      expect(properties.normalizedUint8Property.getGlslType()).toEqual("float");
      expect(properties.vec2Property.getUnpackingSteps()).toEqual("vec2");
      expect(properties.uint8Property.getGlslType()).toEqual("int");
      expect(properties.ivec3Property.getUnpackingSteps()).toEqual("ivec3");
    });
  });
});
