import { PixelDatatype, PixelFormat, RuntimeError } from "@cesium/core";
import { ContextLimits, DataTexture, Texture } from "../../index.js";
import createContext from "../../../../Specs/createContext.js";

describe(
  "Renderer/DataTexture",
  function () {
    let context;
    let maximumTextureSize;
    let dataTexture;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    beforeEach(function () {
      maximumTextureSize = ContextLimits._maximumTextureSize;
      dataTexture = new DataTexture({
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });
    });

    afterEach(function () {
      ContextLimits._maximumTextureSize = maximumTextureSize;
      if (!dataTexture.isDestroyed()) {
        dataTexture.destroy();
      }
    });

    // Narrows rows so small element counts span several of them.
    function useMaximumTextureSize(size) {
      ContextLimits._maximumTextureSize = size;
    }

    // Each element encodes its index and a version, so reads show which upload wrote it.
    function element(index, version) {
      return [index & 255, (index >> 8) & 255, version, 255];
    }

    function createElements(count, version) {
      const data = new Uint8Array(count * 4);
      for (let i = 0; i < count; ++i) {
        data.set(element(i, version), i * 4);
      }
      return data;
    }

    // Reads an element back on the GPU, indexing the texture as shaders do.
    function expectElement(index, version) {
      const fragmentShader =
        "uniform highp sampler2D u_texture;\n" +
        "uniform int u_index;\n" +
        "void main() {\n" +
        "  int width = textureSize(u_texture, 0).x;\n" +
        "  out_FragColor = texelFetch(u_texture, ivec2(u_index % width, u_index / width), 0);\n" +
        "}\n";

      expect({
        context: context,
        fragmentShader: fragmentShader,
        uniformMap: {
          u_texture: function () {
            return dataTexture.texture;
          },
          u_index: function () {
            return index;
          },
        },
      }).contextToRender(element(index, version));
    }

    it("derives componentsPerElement from the pixel format", function () {
      expect(dataTexture.componentsPerElement).toBe(4);

      const redTexture = new DataTexture({
        pixelFormat: PixelFormat.RED,
        pixelDatatype: PixelDatatype.FLOAT,
      });
      expect(redTexture.componentsPerElement).toBe(1);
      redTexture.destroy();
    });

    it("has no texture before the first upload", function () {
      expect(dataTexture.texture).toBeUndefined();
      expect(dataTexture.elementCount).toBe(0);
    });

    it("creates a texture with capacity rounded up to a power of two", function () {
      dataTexture.upload(context, createElements(5, 1));

      const texture = dataTexture.texture;
      expect(texture).toBeInstanceOf(Texture);
      expect(texture.width).toBe(8);
      expect(texture.height).toBe(1);
      expect(texture.pixelFormat).toBe(PixelFormat.RGBA);
      expect(texture.pixelDatatype).toBe(PixelDatatype.UNSIGNED_BYTE);
      expect(dataTexture.elementCount).toBe(5);
    });

    it("wraps rows at the maximum texture size", function () {
      useMaximumTextureSize(4);
      dataTexture.upload(context, createElements(9, 1));

      expect(dataTexture.texture.width).toBe(4);
      expect(dataTexture.texture.height).toBe(4);
    });

    it("creates a texture for empty data", function () {
      dataTexture.upload(context, new Uint8Array(0));

      expect(dataTexture.texture).toBeInstanceOf(Texture);
      expect(dataTexture.elementCount).toBe(0);
    });

    it("uploads every element", function () {
      if (!context.webgl2) {
        return;
      }

      useMaximumTextureSize(4);
      dataTexture.upload(context, createElements(6, 1));

      for (let i = 0; i < 6; ++i) {
        expectElement(i, 1);
      }
    });

    it("uploads only the range within a row", function () {
      if (!context.webgl2) {
        return;
      }

      dataTexture.upload(context, createElements(8, 1));
      const texture = dataTexture.texture;
      dataTexture.upload(context, createElements(8, 2), 2, 5);

      expect(dataTexture.texture).toBe(texture);
      expectElement(1, 1);
      expectElement(2, 2);
      expectElement(4, 2);
      expectElement(5, 1);
    });

    it("uploads only the range across rows", function () {
      if (!context.webgl2) {
        return;
      }

      useMaximumTextureSize(4);
      dataTexture.upload(context, createElements(16, 1));
      dataTexture.upload(context, createElements(16, 2), 2, 13);

      expectElement(1, 1);
      expectElement(2, 2);
      expectElement(3, 2);
      expectElement(4, 2);
      expectElement(11, 2);
      expectElement(12, 2);
      expectElement(13, 1);
    });

    it("uploads a range ending in a partially filled last row", function () {
      if (!context.webgl2) {
        return;
      }

      useMaximumTextureSize(4);
      dataTexture.upload(context, createElements(6, 1));
      dataTexture.upload(context, createElements(6, 2), 3, 6);

      expectElement(2, 1);
      expectElement(3, 2);
      expectElement(4, 2);
      expectElement(5, 2);
    });

    it("keeps the texture when the element count shrinks", function () {
      dataTexture.upload(context, createElements(5, 1));
      const texture = dataTexture.texture;

      dataTexture.upload(context, createElements(3, 1));

      expect(dataTexture.texture).toBe(texture);
      expect(dataTexture.elementCount).toBe(3);
    });

    it("replaces the texture and uploads every element when it grows", function () {
      dataTexture.upload(context, createElements(4, 1));
      const texture = dataTexture.texture;

      dataTexture.upload(context, createElements(5, 2), 4, 5);

      expect(texture.isDestroyed()).toBe(true);
      expect(dataTexture.texture).not.toBe(texture);
      expect(dataTexture.texture.width).toBe(8);
      expect(dataTexture.elementCount).toBe(5);

      if (context.webgl2) {
        for (let i = 0; i < 5; ++i) {
          expectElement(i, 2);
        }
      }
    });

    it("throws a RuntimeError and keeps the texture when the elements don't fit", function () {
      useMaximumTextureSize(4);
      dataTexture.upload(context, createElements(4, 1));
      const texture = dataTexture.texture;

      expect(function () {
        dataTexture.upload(context, createElements(17, 1));
      }).toThrowError(RuntimeError);
      expect(dataTexture.texture).toBe(texture);
      expect(texture.isDestroyed()).toBe(false);
      expect(dataTexture.elementCount).toBe(4);
    });

    it("throws for invalid upload arguments", function () {
      const data = createElements(4, 1);

      expect(function () {
        dataTexture.upload(undefined, data);
      }).toThrowDeveloperError();
      expect(function () {
        dataTexture.upload(context, undefined);
      }).toThrowDeveloperError();
      expect(function () {
        dataTexture.upload(context, new Uint8Array(6));
      }).toThrowDeveloperError();
      expect(function () {
        dataTexture.upload(context, data, -1, 2);
      }).toThrowDeveloperError();
      expect(function () {
        dataTexture.upload(context, data, 3, 2);
      }).toThrowDeveloperError();
      expect(function () {
        dataTexture.upload(context, data, 0, 5);
      }).toThrowDeveloperError();
    });

    it("destroys the texture", function () {
      dataTexture.upload(context, createElements(4, 1));
      const texture = dataTexture.texture;

      expect(dataTexture.isDestroyed()).toBe(false);
      dataTexture.destroy();

      expect(dataTexture.isDestroyed()).toBe(true);
      expect(texture.isDestroyed()).toBe(true);
    });
  },
  "WebGL",
);
