import {
  PixelDatatype,
  PixelFormat,
  Resource,
  Sampler,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  TextureUniform,
  TextureWrap,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/TextureUniform", function () {
  const exampleUrl = "https://example.com/url";
  const greenTexture = new Uint8Array([0, 255, 0, 255]);
  const defaultSampler = new Sampler({
    wrapS: TextureWrap.REPEAT,
    wrapT: TextureWrap.REPEAT,
    minificationFilter: TextureMinificationFilter.LINEAR,
    magnificationFilter: TextureMagnificationFilter.LINEAR,
    maximumAnisotropy: 1.0,
  });

  it("throws if no texture is specified", function () {
    expect(function () {
      return new TextureUniform();
    }).toThrowDeveloperError();
  });

  it("throws if both url and typedArray are specified", function () {
    expect(function () {
      return new TextureUniform({
        url: exampleUrl,
        typedArray: greenTexture,
        width: 1,
        height: 1,
      });
    }).toThrowDeveloperError();
  });

  it("constructs with a URL", function () {
    const textureUniform = new TextureUniform({
      url: exampleUrl,
    });

    expect(textureUniform.resource).toBeDefined();
    expect(textureUniform.resource.url).toEqual(exampleUrl);
    expect(textureUniform.typedArray).not.toBeDefined();
    expect(textureUniform.width).not.toBeDefined();
    expect(textureUniform.height).not.toBeDefined();
    expect(textureUniform.sampler).toEqual(defaultSampler);
    expect(textureUniform.pixelFormat).toEqual(PixelFormat.RGBA);
    expect(textureUniform.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
  });

  it("throws if width and height are not provided for a typed array", function () {
    expect(function () {
      return new TextureUniform({
        typedArray: greenTexture,
      });
    }).toThrowDeveloperError();
  });

  it("constructs with a typed array", function () {
    const textureUniform = new TextureUniform({
      typedArray: greenTexture,
      width: 1,
      height: 1,
    });

    expect(textureUniform.resource).not.toBeDefined();
    expect(textureUniform.typedArray).toBe(greenTexture);
    expect(textureUniform.width).toBe(1);
    expect(textureUniform.height).toBe(1);
    expect(textureUniform.sampler).toEqual(defaultSampler);
    expect(textureUniform.pixelFormat).toEqual(PixelFormat.RGBA);
    expect(textureUniform.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
  });

  it("constructs with a resource", function () {
    const resource = new Resource({
      url: exampleUrl,
    });
    const textureUniform = new TextureUniform({
      url: resource,
    });

    expect(textureUniform.resource).toBe(resource);
    expect(textureUniform.typedArray).not.toBeDefined();
    expect(textureUniform.width).not.toBeDefined();
    expect(textureUniform.height).not.toBeDefined();
    expect(textureUniform.sampler).toEqual(defaultSampler);
    expect(textureUniform.pixelFormat).toEqual(PixelFormat.RGBA);
    expect(textureUniform.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
  });

  it("sets sampler settings", function () {
    const textureUniform = new TextureUniform({
      url: exampleUrl,
      repeat: false,
      minificationFilter: TextureMinificationFilter.NEAREST,
      magnificationFilter: TextureMagnificationFilter.NEAREST,
      maximumAnisotropy: 2,
    });
    expect(textureUniform.sampler).toEqual(
      new Sampler({
        wrapS: TextureWrap.CLAMP_TO_EDGE,
        wrapT: TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: TextureMinificationFilter.NEAREST,
        magnificationFilter: TextureMagnificationFilter.NEAREST,
        maximumAnisotropy: 2,
      })
    );
  });

  it("sets texture settings for typed arrays", function () {
    const textureUniform = new TextureUniform({
      typedArray: new Uint8Array([255, 0, 0, 0, 255, 0]),
      width: 1,
      height: 1,
      pixelFormat: PixelFormat.RGB,
      pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
    });
    expect(textureUniform.pixelFormat).toEqual(PixelFormat.RGB);
    expect(textureUniform.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_SHORT);
  });
});
