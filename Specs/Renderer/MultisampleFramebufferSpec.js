import { ClearCommand } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { PrimitiveType } from "../../Source/Cesium.js";
import { Buffer } from "../../Source/Cesium.js";
import { BufferUsage } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { MultisampleFramebuffer } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { Renderbuffer } from "../../Source/Cesium.js";
import { RenderbufferFormat } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { VertexArray } from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Renderer/MultisampleFramebuffer",
  function () {
    let context;
    let sp;
    let va;
    let framebuffer;

    beforeAll(function () {
      context = createContext({ requestWebgl2: true });
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      sp = sp && sp.destroy();
      va = va && va.destroy();
      framebuffer = framebuffer && framebuffer.destroy();
    });

    it("throws when missing a color attachment", function () {
      expect(function () {
        framebuffer = new MultisampleFramebuffer({
          context: context,
          width: 1,
          height: 1,
          colorTextures: [],
        });
      }).toThrowDeveloperError();
      expect(function () {
        framebuffer = new MultisampleFramebuffer({
          context: context,
          width: 1,
          height: 1,
          colorRenderbuffers: [],
        });
      }).toThrowDeveloperError();
    });

    it("throws when missing a depth-stencil attachment", function () {
      expect(function () {
        framebuffer = new MultisampleFramebuffer({
          context: context,
          width: 1,
          height: 1,
          depthStencilTexture: [],
        });
      }).toThrowDeveloperError();
      expect(function () {
        framebuffer = new MultisampleFramebuffer({
          context: context,
          width: 1,
          height: 1,
          depthStencilRenderbuffer: [],
        });
      }).toThrowDeveloperError();
    });

    it("creates read and draw framebuffers", function () {
      framebuffer = new MultisampleFramebuffer({
        context: context,
        width: 1,
        height: 1,
        colorTextures: [
          new Texture({
            context: context,
            width: 1,
            height: 1,
          }),
        ],
        colorRenderbuffers: [
          new Renderbuffer({
            context: context,
            format: RenderbufferFormat.RGBA8,
          }),
        ],
        depthStencilTexture: new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_STENCIL,
          pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
        }),
        depthStencilRenderbuffer: new Renderbuffer({
          context: context,
          format: RenderbufferFormat.DEPTH_STENCIL,
        }),
      });
      const readFB = framebuffer.getRenderFramebuffer();
      const drawFB = framebuffer.getColorFramebuffer();
      expect(readFB).toBeDefined();
      expect(readFB.getColorRenderbuffer(0)).toBeDefined();
      expect(readFB.depthStencilRenderbuffer).toBeDefined();
      expect(drawFB).toBeDefined();
      expect(drawFB.getColorTexture(0)).toBeDefined();
      expect(drawFB.depthStencilTexture).toBeDefined();
    });

    function renderColor(framebuffer, color) {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "uniform vec4 color; void main() { gl_FragColor = color; }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      va = new VertexArray({
        context: context,
        attributes: [
          {
            index: 0,
            vertexBuffer: Buffer.createVertexBuffer({
              context: context,
              typedArray: new Float32Array([0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      const uniformMap = {
        color: function () {
          return color;
        },
      };

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        uniformMap: uniformMap,
        framebuffer: framebuffer,
      });
      command.execute(context);
    }

    it("blits color attachments", function () {
      if (!context.webgl2) {
        return;
      }

      framebuffer = new MultisampleFramebuffer({
        context: context,
        width: 1,
        height: 1,
        colorTextures: [
          new Texture({
            context: context,
            width: 1,
            height: 1,
          }),
        ],
        colorRenderbuffers: [
          new Renderbuffer({
            context: context,
            format: RenderbufferFormat.RGBA8,
            numSamples: 2,
          }),
        ],
      });

      const renderFB = framebuffer.getRenderFramebuffer();
      renderColor(renderFB, new Color(0.0, 1.0, 0.0, 1.0));
      framebuffer.blitFramebuffers(context);
      const colorFB = framebuffer.getColorFramebuffer();
      expect({
        context: context,
        framebuffer: colorFB,
      }).toReadPixels([0, 255, 0, 255]);
    });

    function renderAndBlitDepthAttachment(framebuffer) {
      const renderFB = framebuffer.getRenderFramebuffer();
      const colorFB = framebuffer.getColorFramebuffer();
      ClearCommand.ALL.execute(context);

      const framebufferClear = new ClearCommand({
        depth: 1.0,
        framebuffer: renderFB,
      });

      framebufferClear.execute(context);

      // 1 of 3.  Render green point into color attachment.
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      va = new VertexArray({
        context: context,
        attributes: [
          {
            index: 0,
            vertexBuffer: Buffer.createVertexBuffer({
              context: context,
              typedArray: new Float32Array([0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        framebuffer: renderFB,
        renderState: RenderState.fromCache({
          depthTest: {
            enabled: true,
          },
        }),
      });
      command.execute(context);

      // 2 of 3.  Verify default color buffer is still black.
      expect(context).toReadPixels([0, 0, 0, 255]);

      framebuffer.blitFramebuffers(context);

      // 3 of 3.  Render green to default color buffer by reading from blitted color attachment
      const vs2 =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs2 =
        "uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)).rrrr; }";
      let sp2 = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs2,
        fragmentShaderSource: fs2,
        attributeLocations: {
          position: 0,
        },
      });
      const uniformMap = {
        u_texture: function () {
          return colorFB.depthStencilTexture;
        },
      };

      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp2,
        vertexArray: va,
        uniformMap: uniformMap,
      });
      command.execute(context);

      sp2 = sp2.destroy();

      return context.readPixels();
    }

    it("blits depth-stencil attachments", function () {
      if (!context.webgl2 || !context.depthTexture) {
        return;
      }

      framebuffer = new MultisampleFramebuffer({
        context: context,
        width: 1,
        height: 1,
        colorTextures: [
          new Texture({
            context: context,
            width: 1,
            height: 1,
          }),
        ],
        colorRenderbuffers: [
          new Renderbuffer({
            context: context,
            format: RenderbufferFormat.RGBA8,
            numSamples: 2,
          }),
        ],
        depthStencilTexture: new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_STENCIL,
          pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
        }),
        depthStencilRenderbuffer: new Renderbuffer({
          context: context,
          width: 1,
          height: 1,
          format: RenderbufferFormat.DEPTH24_STENCIL8,
          numSamples: 2,
        }),
      });

      expect(
        renderAndBlitDepthAttachment(framebuffer)
      ).toEqualEpsilon([128, 128, 128, 255], 1);
    });

    it("destroys", function () {
      const f = new MultisampleFramebuffer({
        context: context,
        width: 1,
        height: 1,
      });
      expect(f.isDestroyed()).toEqual(false);
      f.destroy();
      expect(f.isDestroyed()).toEqual(true);
    });

    it("fails to destroy", function () {
      const f = new MultisampleFramebuffer({
        context: context,
        width: 1,
        height: 1,
      });
      f.destroy();

      expect(function () {
        f.destroy();
      }).toThrowDeveloperError();
    });

    it("throws when there is no context", function () {
      expect(function () {
        return new MultisampleFramebuffer();
      }).toThrowDeveloperError();
    });

    it("throws when there is no width or height", function () {
      expect(function () {
        return new MultisampleFramebuffer({
          context: context,
          height: 1,
        });
      }).toThrowDeveloperError();
      expect(function () {
        return new MultisampleFramebuffer({
          context: context,
          width: 1,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);