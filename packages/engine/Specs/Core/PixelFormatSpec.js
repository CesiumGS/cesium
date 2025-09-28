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
    const internalFormatR32F = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.FLOAT,
      context,
    );
    expect(internalFormatR32F).toBe(WebGLConstants.R32F);

    const internalFormatRG32F = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.FLOAT,
      context,
    );
    expect(internalFormatRG32F).toBe(WebGLConstants.RG32F);

    const internalFormatRGB32F = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.FLOAT,
      context,
    );
    expect(internalFormatRGB32F).toBe(WebGLConstants.RGB32F);

    const internalFormatRGBA32F = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.FLOAT,
      context,
    );
    expect(internalFormatRGBA32F).toBe(WebGLConstants.RGBA32F);
  });

  it("returns the correct internal formats for PixelDatatype.HALF_FLOAT", function () {
    if (!context.webgl2) {
      return;
    }
    const internalFormatR16F = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(internalFormatR16F).toBe(WebGLConstants.R16F);

    const internalFormatRG16F = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(internalFormatRG16F).toBe(WebGLConstants.RG16F);

    const internalFormatRGB16F = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(internalFormatRGB16F).toBe(WebGLConstants.RGB16F);

    const internalFormatRGBA16F = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.HALF_FLOAT,
      context,
    );
    expect(internalFormatRGBA16F).toBe(WebGLConstants.RGBA16F);
  });

  it("returns the correct internal formats for PixelDatatype.UNSIGNED_BYTE", function () {
    if (!context.webgl2) {
      return;
    }
    const internalFormatR8 = PixelFormat.toInternalFormat(
      PixelFormat.RED,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(internalFormatR8).toBe(WebGLConstants.R8);

    const internalFormatRG8 = PixelFormat.toInternalFormat(
      PixelFormat.RG,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(internalFormatRG8).toBe(WebGLConstants.RG8);

    const internalFormatRGB8 = PixelFormat.toInternalFormat(
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(internalFormatRGB8).toBe(WebGLConstants.RGB8);

    const internalFormatRGBA8 = PixelFormat.toInternalFormat(
      PixelFormat.RGBA,
      PixelDatatype.UNSIGNED_BYTE,
      context,
    );
    expect(internalFormatRGBA8).toBe(WebGLConstants.RGBA8);
  });
});
