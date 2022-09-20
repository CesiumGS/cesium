import {
  defined,
  Color,
  ClearCommand,
  Framebuffer,
  FramebufferManager,
  PixelDatatype,
  PixelFormat,
  Renderbuffer,
  RenderbufferFormat,
  Texture,
} from "../../index.js";;

import createContext from "../../../../Specs/createContext.js";;

describe(
  "Renderer/FramebufferManager",
  function () {
    let context;
    let fbm;

    beforeAll(function () {
      context = createContext({ requestWebgl2: true });
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      if (defined(fbm)) {
        fbm.destroy();
      }
    });

    it("throws when constructor has no enabled attachments", function () {
      expect(function () {
        fbm = new FramebufferManager({
          color: false,
        });
      }).toThrowDeveloperError();
    });

    it("throws when constructor enables depth and depth-stencil attachments", function () {
      expect(function () {
        fbm = new FramebufferManager({
          depth: true,
          depthStencil: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if update is called without width or height", function () {
      fbm = new FramebufferManager();
      expect(function () {
        fbm.update(context);
      }).toThrowDeveloperError();
      expect(function () {
        fbm.update(context, 1);
      }).toThrowDeveloperError();
      expect(function () {
        fbm.update(context, undefined, 1);
      }).toThrowDeveloperError();
    });

    it("throws if getting color texture at an invalid index", function () {
      fbm = new FramebufferManager({
        colorAttachmentsLength: 2,
        createColorAttachments: false,
      });
      expect(function () {
        fbm.getColorTexture(2);
      }).toThrowDeveloperError();
    });

    it("throws if setting color texture when createColorAttachments is true", function () {
      fbm = new FramebufferManager();
      expect(function () {
        fbm.setColorTexture();
      }).toThrowDeveloperError();
    });

    it("throws if setting color texture at an invalid index", function () {
      fbm = new FramebufferManager({
        colorAttachmentsLength: 2,
        createColorAttachments: false,
      });
      expect(function () {
        fbm.setColorTexture({}, 2);
      }).toThrowDeveloperError();
    });

    it("sets color textures", function () {
      fbm = new FramebufferManager({
        colorAttachmentsLength: 2,
        createColorAttachments: false,
      });
      const texture0 = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGB,
      });
      const texture1 = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
      });
      fbm.setColorTexture(texture0, 0);
      fbm.setColorTexture(texture1, 1);
      expect(fbm._colorTextures.length).toEqual(2);
      expect(fbm.getColorTexture(0)).toEqual(texture0);
      expect(fbm.getColorTexture(1)).toEqual(texture1);
      texture0.destroy();
      texture1.destroy();
    });

    it("throws if setting depth attachments when createDepthAttachments is true", function () {
      fbm = new FramebufferManager();
      expect(function () {
        fbm.setDepthTexture();
      }).toThrowDeveloperError();
      expect(function () {
        fbm.setDepthRenderbuffer();
      }).toThrowDeveloperError();
    });

    it("sets depth attachments", function () {
      fbm = new FramebufferManager({
        createDepthAttachments: false,
      });
      const texture = new Texture({
        context: context,
        width: 1,
        height: 1,
      });
      fbm.setDepthTexture(texture);
      expect(fbm.getDepthTexture()).toBeDefined();
      expect(fbm.getDepthTexture()).toEqual(texture);
      texture.destroy();

      const renderbuffer = new Renderbuffer({
        context: context,
        width: 1,
        height: 1,
      });
      fbm.setDepthRenderbuffer(renderbuffer);
      expect(fbm.getDepthRenderbuffer()).toBeDefined();
      expect(fbm.getDepthRenderbuffer()).toEqual(renderbuffer);
      renderbuffer.destroy();
    });

    it("throws if setting depth-stencil attachments when createDepthStencilAttachments is true", function () {
      fbm = new FramebufferManager();
      expect(function () {
        fbm.setDepthStencilTexture();
      }).toThrowDeveloperError();
      expect(function () {
        fbm.setDepthStencilRenderbuffer();
      }).toThrowDeveloperError();
    });

    it("sets depth-stencil attachments", function () {
      fbm = new FramebufferManager({
        createDepthAttachments: false,
      });
      const texture = new Texture({
        context: context,
        width: 1,
        height: 1,
      });
      fbm.setDepthStencilTexture(texture);
      expect(fbm.getDepthStencilTexture()).toBeDefined();
      expect(fbm.getDepthStencilTexture()).toEqual(texture);
      texture.destroy();

      const renderbuffer = new Renderbuffer({
        context: context,
        width: 1,
        height: 1,
      });
      fbm.setDepthStencilRenderbuffer(renderbuffer);
      expect(fbm.getDepthStencilRenderbuffer()).toBeDefined();
      expect(fbm.getDepthStencilRenderbuffer()).toEqual(renderbuffer);
      renderbuffer.destroy();
    });

    it("creates framebuffer", function () {
      fbm = new FramebufferManager();
      expect(fbm.framebuffer).toBeUndefined();
      fbm.update(context, 1, 1);
      const framebuffer = fbm.framebuffer;
      expect(framebuffer).toBeDefined();
      expect(framebuffer.numberOfColorAttachments).toEqual(1);
    });

    it("destroyFramebuffer destroys framebuffer", function () {
      fbm = new FramebufferManager();
      fbm.update(context, 1, 1);
      expect(fbm.framebuffer.isDestroyed()).toEqual(false);
      spyOn(Framebuffer.prototype, "destroy").and.callThrough();
      fbm.destroyFramebuffer();
      expect(fbm.framebuffer).toBeUndefined();
      expect(Framebuffer.prototype.destroy).toHaveBeenCalled();
    });

    it("creates single color attachment", function () {
      fbm = new FramebufferManager();
      fbm.update(context, 1, 1);
      const texture = fbm.getColorTexture();
      expect(texture).toBeDefined();
      expect(texture.width).toEqual(1);
      expect(texture.height).toEqual(1);
      expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it("creates multiple color attachments", function () {
      if (!context.drawBuffers) {
        return;
      }

      const length = 2;
      fbm = new FramebufferManager({
        colorAttachmentsLength: length,
      });
      fbm.update(context, 1, 1);
      for (let i = 0; i < length; ++i) {
        const texture = fbm.getColorTexture(i);
        expect(texture).toBeDefined();
        expect(texture.width).toEqual(1);
        expect(texture.height).toEqual(1);
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
      }
    });

    it("creates depth attachments", function () {
      fbm = new FramebufferManager({
        color: false,
        depth: true,
        supportsDepthTexture: true,
      });
      fbm.update(context, 1, 1);
      if (context.depthTexture) {
        const texture = fbm.getDepthTexture();
        expect(texture).toBeDefined();
        expect(texture.width).toEqual(1);
        expect(texture.height).toEqual(1);
        expect(texture.pixelFormat).toEqual(PixelFormat.DEPTH_COMPONENT);
        expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_INT);
      } else {
        const renderbuffer = fbm.getDepthRenderbuffer();
        expect(renderbuffer).toBeDefined();
        expect(renderbuffer.width).toEqual(1);
        expect(renderbuffer.height).toEqual(1);
        expect(renderbuffer.format).toEqual(
          RenderbufferFormat.DEPTH_COMPONENT16
        );
      }
    });

    it("creates depth-stencil attachments", function () {
      fbm = new FramebufferManager({
        color: false,
        depthStencil: true,
        supportsDepthTexture: true,
      });
      fbm.update(context, 1, 1);
      if (context.depthTexture) {
        const texture = fbm.getDepthStencilTexture();
        expect(texture).toBeDefined();
        expect(texture.width).toEqual(1);
        expect(texture.height).toEqual(1);
        expect(texture.pixelFormat).toEqual(PixelFormat.DEPTH_STENCIL);
        expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_INT_24_8);
      } else {
        const renderbuffer = fbm.getDepthStencilRenderbuffer();
        expect(renderbuffer).toBeDefined();
        expect(renderbuffer.width).toEqual(1);
        expect(renderbuffer.height).toEqual(1);
        expect(renderbuffer.format).toEqual(RenderbufferFormat.DEPTH_STENCIL);
      }
    });

    it("creates renderbuffer depth attachments if supportsDepthTexture is false", function () {
      fbm = new FramebufferManager({
        depth: true,
      });
      fbm.update(context, 1, 1);
      expect(fbm.getDepthTexture()).toBeUndefined();
      expect(fbm.getDepthRenderbuffer()).toBeDefined();
    });

    it("creates renderbuffer depth attachments if supportsDepthTexture is true but context.depthTexture is false", function () {
      fbm = new FramebufferManager({
        depth: true,
        supportsDepthTexture: true,
      });
      // Disable extensions
      const depthTexture = context._depthTexture;
      context._depthTexture = false;
      const webgl2 = context._webgl2;
      context._webgl2 = false;

      fbm.update(context, 1, 1);
      expect(fbm.getDepthTexture()).toBeUndefined();
      expect(fbm.getDepthRenderbuffer()).toBeDefined();

      // Re-enable extensions
      context._depthTexture = depthTexture;
      context._webgl2 = webgl2;
    });

    it("doesn't create multisample resources if msaa is unsupported", function () {
      fbm = new FramebufferManager({
        depth: true,
        supportsDepthTexture: true,
      });
      // Disable extensions
      const webgl2 = context._webgl2;
      context._webgl2 = false;

      fbm.update(context, 1, 1, 4);
      expect(fbm._multisampleFramebuffer).toBeUndefined();

      // Re-enable extensions
      context._webgl2 = webgl2;
    });

    it("destroys attachments and framebuffer", function () {
      if (!context.drawBuffers) {
        return;
      }

      fbm = new FramebufferManager({
        colorAttachmentsLength: 2,
        depth: true,
      });
      fbm.update(context, 1, 1);
      expect(fbm.framebuffer).toBeDefined();
      expect(fbm.getColorTexture(0)).toBeDefined();
      expect(fbm.getColorTexture(1)).toBeDefined();
      expect(fbm.getDepthRenderbuffer()).toBeDefined();

      spyOn(Framebuffer.prototype, "destroy").and.callThrough();
      spyOn(Renderbuffer.prototype, "destroy").and.callThrough();
      spyOn(Texture.prototype, "destroy").and.callThrough();
      fbm.destroy();

      expect(Framebuffer.prototype.destroy.calls.count()).toEqual(1);
      expect(fbm.framebuffer).toBeUndefined();
      expect(Renderbuffer.prototype.destroy.calls.count()).toEqual(1);
      expect(fbm.getDepthRenderbuffer()).toBeUndefined();
      expect(Texture.prototype.destroy.calls.count()).toEqual(2);
      expect(fbm.getColorTexture(0)).toBeUndefined();
      expect(fbm.getColorTexture(1)).toBeUndefined();
    });

    it("does not destroy attachments that are not created by FramebufferManager", function () {
      fbm = new FramebufferManager({
        createColorAttachments: false,
        createDepthAttachments: false,
      });

      const colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
      });
      fbm.setColorTexture(colorTexture, 0);

      const depthRenderbuffer = new Renderbuffer({
        context: context,
        width: 1,
        height: 1,
      });
      fbm.setDepthRenderbuffer(depthRenderbuffer);

      fbm.update(context, 1, 1);
      fbm.destroy();
      expect(fbm.framebuffer).toBeUndefined();
      expect(fbm.getColorTexture()).toBeDefined();
      expect(fbm.getDepthRenderbuffer()).toBeDefined();

      colorTexture.destroy();
      depthRenderbuffer.destroy();
    });

    it("does not destroy resources if texture dimensions haven't changed", function () {
      fbm = new FramebufferManager();
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.update(context, 1, 1);
      fbm.update(context, 1, 1);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(1);
    });

    it("destroys resources after texture dimensions change", function () {
      fbm = new FramebufferManager();
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.update(context, 1, 1);
      fbm.update(context, 2, 1);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(2);
    });

    it("destroys resources after numSamples changes", function () {
      if (!context.webgl2) {
        return;
      }

      fbm = new FramebufferManager();
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.update(context, 1, 1);
      fbm.update(context, 1, 1, 2);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(2);
    });

    it("destroys resources after pixel datatype changes", function () {
      fbm = new FramebufferManager({
        pixelDatatype: PixelDatatype.UNSIGNED_INT,
      });
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.update(context, 1, 1);
      fbm.update(context, 1, 1, 1, PixelDatatype.UNSIGNED_BYTE);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(2);
    });

    it("destroys resources after pixel format changes", function () {
      fbm = new FramebufferManager({
        pixelFormat: PixelFormat.RGB,
      });
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.update(context, 1, 1);
      fbm.update(context, 1, 1, 1, undefined, PixelFormat.RGBA);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(2);
    });

    it("destroys resources after new attachment is set", function () {
      fbm = new FramebufferManager({
        createColorAttachments: false,
      });
      const texture = new Texture({
        context: context,
        width: 1,
        height: 1,
      });
      spyOn(FramebufferManager.prototype, "destroy").and.callThrough();
      fbm.setColorTexture(texture, 0);
      fbm.update(context, 1, 1);
      fbm.setColorTexture(texture, 0);
      fbm.update(context, 1, 1);
      expect(FramebufferManager.prototype.destroy.calls.count()).toEqual(1);
    });

    it("executes clear command", function () {
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      fbm = new FramebufferManager();
      fbm.update(context, 1, 1);

      const clearCommand = new ClearCommand({
        color: new Color(1.0, 0.0, 0.0, 1.0),
      });
      fbm.clear(context, clearCommand);

      const fs =
        "uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }";
      const uniformMap = {
        u_texture: function () {
          return fbm.getColorTexture();
        },
      };

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("preserves clear command framebuffer after clear()", function () {
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      fbm = new FramebufferManager();
      fbm.update(context, 1, 1);

      const fb = new Framebuffer({
        context: context,
      });
      const clearCommand = new ClearCommand({
        color: new Color(1.0, 0.0, 0.0, 1.0),
        framebuffer: fb,
      });

      fbm.clear(context, clearCommand);
      expect(clearCommand.framebuffer).toBe(fb);

      const fs =
        "uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }";
      const uniformMap = {
        u_texture: function () {
          return fbm.getColorTexture();
        },
      };

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);
      fb.destroy();
    });

    it("returns framebuffer status", function () {
      fbm = new FramebufferManager();
      fbm.update(context, 1, 1);
      expect(fbm.status).toEqual(fbm.framebuffer.status);
    });
  },
  "WebGL"
);
