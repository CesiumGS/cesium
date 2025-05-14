import {
  Color,
  PixelFormat,
  ClearCommand,
  PixelDatatype,
  Sampler,
  Texture3D,
  TextureMagnificationFilter,
  TextureMinificationFilter,
} from "../../index.js";

import createContext from "../../../../Specs/createContext.js";

describe("Renderer/Texture3D", function () {
  {
    let context;
    let source;
    const size = 2;
    const data = new Uint8Array(size * size * size * 4);
    data.fill(255);
    const sampler = new Sampler({
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    });

    const fs = `
      precision highp sampler3D;
      uniform sampler3D u_texture;
      void main() { out_FragColor = texture(u_texture, vec3(0.0)); }
      `;
    let texture;
    const uniformMap = {
      u_texture: function () {
        return texture;
      },
    };

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      if (context) {
        context.destroyForSpecs();
      }
    });

    beforeEach(function () {
      source = {
        arrayBufferView: data,
        width: size,
        height: size,
        depth: size,
      };
    });

    afterEach(function () {
      texture = texture && texture.destroy();
    });

    it("has expected default values for pixel format and datatype", function () {
      if (!context.webgl2) {
        return;
      }
      texture = new Texture3D({
        context: context,
        source: source,
        sampler: sampler,
      });

      expect(texture.id).toBeDefined();
      expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it("can create a texture from the arrayBuffer", function () {
      if (!context.webgl2) {
        return;
      }
      const command = new ClearCommand({
        color: Color.RED,
      });
      command.execute(context);

      texture = new Texture3D({
        context: context,
        source: source,
        sampler: sampler,
      });

      expect(texture.width).toEqual(size);
      expect(texture.height).toEqual(size);
      expect(texture.depth).toEqual(size);
      expect(texture.sizeInBytes).toEqual(
        size * size * size * PixelFormat.componentsLength(texture.pixelFormat),
      );

      command.color = Color.WHITE;
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 255, 255, 255]);
    });

    function expectTextureByteSize(
      width,
      height,
      depth,
      pixelFormat,
      pixelDatatype,
      expectedSize,
    ) {
      texture = new Texture3D({
        context: context,
        width: width,
        height: height,
        depth: depth,
        pixelFormat: pixelFormat,
        pixelDatatype: pixelDatatype,
      });
      expect(texture.sizeInBytes).toBe(expectedSize);
      texture = texture && texture.destroy();
    }

    it("can get the size in bytes of a texture", function () {
      if (!context.webgl2) {
        return;
      }
      // Depth textures
      if (context.depthTexture) {
        expectTextureByteSize(
          16,
          16,
          16,
          PixelFormat.DEPTH_COMPONENT,
          PixelDatatype.UNSIGNED_SHORT,
          16 * 16 * 16 * 2,
        );
        expectTextureByteSize(
          16,
          16,
          16,
          PixelFormat.DEPTH_COMPONENT,
          PixelDatatype.UNSIGNED_INT,
          16 * 16 * 16 * 4,
        );
        expectTextureByteSize(
          16,
          16,
          16,
          PixelFormat.DEPTH_STENCIL,
          PixelDatatype.UNSIGNED_INT_24_8,
          16 * 16 * 16 * 4,
        );
      }

      // Uncompressed formats
      expectTextureByteSize(
        16,
        16,
        16,
        PixelFormat.ALPHA,
        PixelDatatype.UNSIGNED_BYTE,
        16 * 16 * 16,
      );
      expectTextureByteSize(
        16,
        16,
        16,
        PixelFormat.RGB,
        PixelDatatype.UNSIGNED_BYTE,
        16 * 16 * 16 * 3,
      );
      expectTextureByteSize(
        16,
        16,
        16,
        PixelFormat.RGBA,
        PixelDatatype.UNSIGNED_BYTE,
        16 * 16 * 16 * 4,
      );
      expectTextureByteSize(
        16,
        16,
        16,
        PixelFormat.LUMINANCE,
        PixelDatatype.UNSIGNED_BYTE,
        16 * 16 * 16,
      );
      expectTextureByteSize(
        16,
        16,
        16,
        PixelFormat.LUMINANCE_ALPHA,
        PixelDatatype.UNSIGNED_BYTE,
        16 * 16 * 16 * 2,
      );
    });

    it("can be destroyed", function () {
      if (!context.webgl2) {
        return;
      }
      const t = new Texture3D({
        context: context,
        source: source,
        pixelFormat: PixelFormat.RGBA,
      });

      expect(t.isDestroyed()).toEqual(false);
      t.destroy();
      expect(t.isDestroyed()).toEqual(true);
    });

    it("throws when creating a texture without a options", function () {
      if (!context.webgl2) {
        return;
      }
      expect(function () {
        texture = new Texture3D();
      }).toThrowDeveloperError();
    });
  }
});
