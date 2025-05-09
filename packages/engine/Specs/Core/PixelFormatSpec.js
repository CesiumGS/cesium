import { PixelDatatype, PixelFormat, WebGLConstants } from "../../index.js";

import createContext from "../../../../Specs/createContext.js";

describe("Core/PixelFormat", function () {
  let context;

  beforeAll(function () {
    context = createContext();
  });

  afterAll(function () {
    context.destroyForSpecs();
  });

  it("flipY works", function () {
    const width = 1;
    const height = 2;
    const values = [255, 0, 0, 0, 255, 0];
    const expectedValues = [0, 255, 0, 255, 0, 0];
    const dataBuffer = new Uint8Array(values);
    const expectedDataBuffer = new Uint8Array(expectedValues);

    const flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height,
    );
    expect(flipped).toEqual(expectedDataBuffer);
  });

  it("flipY returns early if height is 1", function () {
    const width = 1;
    const height = 1;
    const values = [255, 255, 255];
    const dataBuffer = new Uint8Array(values);

    const flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height,
    );
    expect(flipped).toBe(dataBuffer);
  });

  it("PixelDatatype.FLOAT correspond to WebGLConstants.RGBA32F", function () {
    const interFormatR8 = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatR8).toBe(WebGLConstants.R32F);
    const interFormatRG8 = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRG8).toBe(WebGLConstants.RG32F);
    const interFormatRGB8 = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRGB8).toBe(WebGLConstants.RGB32F);
    const interFormatRGBA8 = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRGBA8).toBe(WebGLConstants.RGBA32F);
  });

  it("PixelDatatype.HALF_FLOAT correspond to WebGLConstants.RGBA16F", function () {
    const interFormatR8 = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatR8).toBe(WebGLConstants.R16F);
    const interFormatRG8 = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRG8).toBe(WebGLConstants.RG16F);
    const interFormatRGB8 = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRGB8).toBe(WebGLConstants.RGB16F);
    const interFormatRGBA8 = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRGBA8).toBe(WebGLConstants.RGBA16F);
  });

  it("PixelDatatype.UNSIGNED_BYTE correspond to WebGLConstants.RGBA8", function () {
    const interFormatR8 = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(interFormatR8).toBe(WebGLConstants.R8);
    const interFormatRG8 = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(interFormatRG8).toBe(WebGLConstants.RG8);
    const interFormatRGB8 = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(interFormatRGB8).toBe(WebGLConstants.RGB8);
    const interFormatRGBA8 = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(interFormatRGBA8).toBe(WebGLConstants.RGBA8);
  });
});
