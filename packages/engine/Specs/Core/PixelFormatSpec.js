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

  it("returns the correct internal formats for PixelDatatype.FLOAT", function () {
    if (!context.webgl2) {
      return;
    }
    const interFormatR32F = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatR32F).toBe(WebGLConstants.R32F);

    const interFormatRG32F = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRG32F).toBe(WebGLConstants.RG32F);

    const interFormatRGB32F = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRGB32F).toBe(WebGLConstants.RGB32F);

    const interFormatRGBA32F = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.FLOAT,
      context,
    );
    expect(interFormatRGBA32F).toBe(WebGLConstants.RGBA32F);
  });

  it("returns the correct internal formats for PixelDatatype.HALF_FLOAT", function () {
    if (!context.webgl2) {
      return;
    }
    const interFormatR16F = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatR16F).toBe(WebGLConstants.R16F);

    const interFormatRG16F = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRG16F).toBe(WebGLConstants.RG16F);

    const interFormatRGB16F = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRGB16F).toBe(WebGLConstants.RGB16F);

    const interFormatRGBA16F = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(interFormatRGBA16F).toBe(WebGLConstants.RGBA16F);
  });

  it("returns the correct internal formats for PixelDatatype.UNSIGNED_BYTE", function () {
    if (!context.webgl2) {
      return;
    }
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
