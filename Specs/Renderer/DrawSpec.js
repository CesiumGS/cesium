import { BoundingRectangle } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ComponentDatatype } from "../../Source/Cesium.js";
import { IndexDatatype } from "../../Source/Cesium.js";
import { PrimitiveType } from "../../Source/Cesium.js";
import { WebGLConstants } from "../../Source/Cesium.js";
import { WindingOrder } from "../../Source/Cesium.js";
import { Buffer } from "../../Source/Cesium.js";
import { BufferUsage } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { VertexArray } from "../../Source/Cesium.js";
import { BlendingState } from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Renderer/Draw",
  function () {
    let context;
    let sp;
    let va;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      sp = sp && sp.destroy();
      va = va && va.destroy();
    });

    it("draws a white point", function () {
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("draws a white point with an index buffer", function () {
      // Use separate context to work around IE 11.0.9 bug
      const context = createContext();

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      // Two indices instead of one is a workaround for NVIDIA:
      //   http://www.khronos.org/message_boards/viewtopic.php?f=44&t=3719
      const indexBuffer = Buffer.createIndexBuffer({
        context: context,
        typedArray: new Uint16Array([0, 0]),
        usage: BufferUsage.STATIC_DRAW,
        indexDatatype: IndexDatatype.UNSIGNED_SHORT,
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
        indexBuffer: indexBuffer,
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      sp = sp.destroy();
      va = va.destroy();
      context.destroyForSpecs();
    });

    it("draws a red point with two vertex buffers", function () {
      const vs =
        "attribute vec4 position;" +
        "attribute mediump float intensity;" +
        "varying mediump float fs_intensity;" +
        "void main() {" +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = position;" +
        "  fs_intensity = intensity;" +
        "}";
      const fs =
        "varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
          intensity: 1,
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
          {
            index: 1,
            vertexBuffer: Buffer.createVertexBuffer({
              context: context,
              typedArray: new Float32Array([1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 1,
          },
        ],
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 0, 255]);
    });

    it("draws a red point with one interleaved vertex buffers", function () {
      const vs =
        "attribute vec4 position;" +
        "attribute mediump float intensity;" +
        "varying mediump float fs_intensity;" +
        "void main() {" +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = position;" +
        "  fs_intensity = intensity;" +
        "}";
      const fs =
        "varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
          intensity: 1,
        },
      });

      const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
      const vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: new Float32Array([0, 0, 0, 1, 1]),
        usage: BufferUsage.STATIC_DRAW,
      });

      va = new VertexArray({
        context: context,
        attributes: [
          {
            index: 0,
            vertexBuffer: vertexBuffer,
            componentsPerAttribute: 4,
            offsetInBytes: 0,
            strideInBytes: stride,
          },
          {
            index: 1,
            vertexBuffer: vertexBuffer,
            componentsPerAttribute: 1,
            offsetInBytes: 4 * Float32Array.BYTES_PER_ELEMENT,
            strideInBytes: stride,
          },
        ],
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 0, 255]);
    });

    it("draws with scissor test", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 3:  Render point - fails scissor test
      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          scissorTest: {
            enabled: true,
            rectangle: new BoundingRectangle(1, 1, 0, 0),
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 3 of 3:  Render point - passes scissor test
      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          scissorTest: {
            enabled: true,
            rectangle: new BoundingRectangle(0, 0, 1, 1),
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with color mask", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 3:  Render point - blue color mask
      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          colorMask: {
            red: true,
            green: false,
            blue: false,
            alpha: false,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 0, 255]);

      // 3 of 3:  Render point - red color mask (blue channel not touched)
      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          colorMask: {
            red: false,
            green: false,
            blue: true,
            alpha: false,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 255, 255]);
    });

    it("draws with additive blending", function () {
      const cxt = createContext({
        webgl: {
          alpha: true,
        },
      });

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(0.5); }";
      const sp = ShaderProgram.fromCache({
        context: cxt,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      const va = new VertexArray({
        context: cxt,
        attributes: [
          {
            index: 0,
            vertexBuffer: Buffer.createVertexBuffer({
              context: cxt,
              typedArray: new Float32Array([0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(cxt);
      expect(cxt).toReadPixels([0, 0, 0, 0]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          blending: {
            enabled: true,
            equationRgb: WebGLConstants.FUNC_ADD, // Optional, default
            equationAlpha: WebGLConstants.FUNC_ADD, // Optional, default
            functionSourceRgb: WebGLConstants.ONE, // Optional, default
            functionSourceAlpha: WebGLConstants.ONE, // Optional, default
            functionDestinationRgb: WebGLConstants.ONE,
            functionDestinationAlpha: WebGLConstants.ONE,
          },
        }),
      });

      // 2 of 3:  Blend:  0 + 0.5
      command.execute(cxt);
      expect({
        context: cxt,
        epsilon: 1,
      }).toReadPixels([127, 127, 127, 127]);

      // 3 of 3:  Blend:  0.5 + 0.5
      command.execute(cxt);
      expect({
        context: cxt,
        epsilon: 1,
      }).toReadPixels([254, 254, 254, 254]);

      sp.destroy();
      va.destroy();
      cxt.destroyForSpecs();
    });

    it("draws with alpha blending", function () {
      const cxt = createContext({
        webgl: {
          alpha: true,
        },
      });

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5); }";
      const sp = ShaderProgram.fromCache({
        context: cxt,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      const va = new VertexArray({
        context: cxt,
        attributes: [
          {
            index: 0,
            vertexBuffer: Buffer.createVertexBuffer({
              context: cxt,
              typedArray: new Float32Array([0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(cxt);
      expect(cxt).toReadPixels([0, 0, 0, 0]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          blending: {
            enabled: true,
            equationRgb: WebGLConstants.FUNC_ADD,
            equationAlpha: WebGLConstants.FUNC_SUBTRACT, // does not actually matter
            functionSourceRgb: WebGLConstants.SRC_ALPHA,
            functionSourceAlpha: WebGLConstants.ONE, // Don't blend alpha
            functionDestinationRgb: WebGLConstants.ONE_MINUS_SRC_ALPHA,
            functionDestinationAlpha: WebGLConstants.ZERO,
          },
        }),
      });

      // 2 of 3:  Blend:  RGB:  (255 * 0.5) + (0 * 0.5), Alpha: 0.5 + 0
      command.execute(cxt);
      expect({
        context: cxt,
        epsilon: 1,
      }).toReadPixels([127, 127, 127, 127]);

      // 3 of 3:  Blend:  RGB:  (255 * 0.5) + (127 * 0.5), Alpha: 0.5 + 0
      command.execute(cxt);
      expect({
        context: cxt,
        epsilon: 2,
      }).toReadPixels([191, 191, 191, 127]);

      sp.destroy();
      va.destroy();
      cxt.destroyForSpecs();
    });

    it("draws with blend color", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }";
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

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          blending: {
            enabled: true,
            color: {
              red: 0.5,
              green: 0.5,
              blue: 0.5,
              alpha: 0.5,
            },
            equationRgb: WebGLConstants.FUNC_SUBTRACT,
            equationAlpha: WebGLConstants.FUNC_SUBTRACT,
            functionSourceRgb: WebGLConstants.CONSTANT_COLOR,
            functionSourceAlpha: WebGLConstants.ONE,
            functionDestinationRgb: WebGLConstants.ZERO,
            functionDestinationAlpha: WebGLConstants.ZERO,
          },
        }),
      });

      // 2 of 3:  Blend:  RGB:  255 - 127, Alpha: 255 - (255 - 255)
      //   Epsilon of 1 because ANGLE gives 127 and desktop GL gives 128.
      command.execute(context);
      expect({
        context: context,
        epsilon: 1,
      }).toReadPixels([128, 128, 128, 255]);
    });

    it("draws with culling", function () {
      const vs =
        "attribute vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                -1000,
                0,
                1,
                -1000,
                1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 3:  Cull front faces - nothing is drawn
      let command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          cull: {
            enabled: true,
            face: WebGLConstants.FRONT,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 3 of 3:  Cull back faces - nothing is culled
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          cull: {
            enabled: true,
            face: WebGLConstants.BACK,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with front face winding order", function () {
      const vs =
        "attribute vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                -1000,
                0,
                1,
                -1000,
                1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      // 1 of 3:  Clear to black
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 3:  Cull back faces with opposite winding order - nothing is drawn
      let command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          frontFace: WindingOrder.CLOCKWISE,
          cull: {
            enabled: true,
            face: WebGLConstants.BACK,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 3 of 3:  Cull back faces with correct winding order - nothing is culled
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          frontFace: WindingOrder.COUNTER_CLOCKWISE,
          cull: {
            enabled: true,
            face: WebGLConstants.BACK,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with the depth test", function () {
      const vs =
        "attribute vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                -1000,
                0,
                1,
                -1000,
                1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      const command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          depthTest: {
            enabled: true,
            func: WebGLConstants.LEQUAL,
          },
        }),
      });

      // 1 of 2.  Triangle fan passes the depth test.

      const clearCommand = new ClearCommand({
        color: new Color(0.0, 0.0, 0.0, 0.0),
        depth: 1.0,
      });
      clearCommand.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      // 2 of 2.  Triangle fan fails the depth test.
      clearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
      clearCommand.depth = 0.0;
      clearCommand.execute(context);

      expect(context).toReadPixels([0, 0, 0, 255]);

      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);
    });

    it("draws with depth range", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs =
        "void main() { gl_FragColor = vec4(gl_DepthRange.near, gl_DepthRange.far, 0.0, 1.0); }";
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

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          depthRange: {
            near: 0.25,
            far: 0.75,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([64, 191, 0, 255]);
    });

    it("draws with line width", function () {
      const vs =
        "attribute vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.LINES,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          lineWidth: ContextLimits.maximumAliasedLineWidth,
          // May only be 1.
        }),
      });
      command.execute(context);

      // I believe different GL implementations are allowed to AA
      // in different ways (or at least that is what we see in practice),
      // so verify it at least rendered something.
      expect(context).notToReadPixels([0, 0, 0, 255]);
    });

    it("draws with polygon offset", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          polygonOffset: {
            enabled: true,
            factor: 1,
            units: 1,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with sample coverage", function () {
      if (!context.antialias) {
        // Sample coverage requires antialiasing.
        return;
      }

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          sampleCoverage: {
            enabled: true,
            value: 0,
            invert: false,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          sampleCoverage: {
            enabled: false,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with stencil test (front)", function () {
      if (context.stencilBits === 0) {
        return;
      }

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                -1000,
                0,
                1,
                -1000,
                1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      const rs = RenderState.fromCache({
        stencilTest: {
          enabled: true,
          frontFunction: WebGLConstants.EQUAL,
          reference: 1,
          mask: 1,
        },
      });

      // 1 of 4.  Clear, including stencil
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 4.  Render where stencil is set - nothing is drawn
      let command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: rs,
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 3 of 4.  Render to stencil only, increment
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          colorMask: {
            red: false,
            green: false,
            blue: false,
            alpha: false,
          },
          stencilTest: {
            enabled: true,
            frontOperation: {
              zPass: WebGLConstants.INCR,
            },
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 4 of 4.  Render where stencil is set
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: rs,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with stencil test (back)", function () {
      if (context.stencilBits === 0) {
        return;
      }

      const vs =
        "attribute vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([
                -1000,
                -1000,
                0,
                1,
                1000,
                -1000,
                0,
                1,
                -1000,
                1000,
                0,
                1,
                1000,
                1000,
                0,
                1,
              ]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      const rs = RenderState.fromCache({
        frontFace: WindingOrder.CLOCKWISE,
        stencilTest: {
          enabled: true,
          backFunction: WebGLConstants.NOTEQUAL,
          reference: 0,
        },
      });

      // 1 of 4.  Clear, including stencil
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 2 of 4.  Render where stencil is set - nothing is drawn
      let command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: rs,
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 3 of 4.  Render to stencil only, increment
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: RenderState.fromCache({
          frontFace: WindingOrder.CLOCKWISE,
          colorMask: {
            red: false,
            green: false,
            blue: false,
            alpha: false,
          },
          stencilTest: {
            enabled: true,
            backOperation: {
              zPass: WebGLConstants.INVERT,
            },
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // 4 of 4.  Render where stencil is set
      command = new DrawCommand({
        primitiveType: PrimitiveType.TRIANGLE_STRIP,
        shaderProgram: sp,
        vertexArray: va,
        renderState: rs,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws with an offset and count", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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
              typedArray: new Float32Array([0, 0, 0, -1, 0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      // The first point in the vertex buffer does not generate any pixels
      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        offset: 0,
        count: 1,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        offset: 1,
        count: 1,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("draws two instances of a point with different per-instance colors", function () {
      const vs =
        "attribute vec4 position;" +
        "attribute vec4 color;" +
        "varying vec4 v_color;" +
        "void main() {" +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = position;" +
        "  v_color = color;" +
        "}";
      const fs =
        "varying vec4 v_color; void main() { gl_FragColor = v_color; }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
          color: 1,
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
          {
            index: 1,
            vertexBuffer: Buffer.createVertexBuffer({
              context: context,
              typedArray: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 4,
            normalize: true,
            instanceDivisor: 1,
          },
        ],
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        instanceCount: 2,
        renderState: RenderState.fromCache({
          blending: BlendingState.ADDITIVE_BLEND,
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 0, 255]);
    });

    it("fails to draw (missing command)", function () {
      expect(function () {
        context.draw();
      }).toThrowDeveloperError();
    });

    it("fails to draw (missing shaderProgram)", function () {
      expect(function () {
        context.draw({
          primitiveType: PrimitiveType.POINTS,
        });
      }).toThrowDeveloperError();
    });

    it("fails to draw (missing primitiveType)", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
      });

      expect(function () {
        context.draw({
          shaderProgram: sp,
        });
      }).toThrowDeveloperError();
    });

    it("fails to draw (primitiveType)", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
      });

      expect(function () {
        context.draw({
          primitiveType: "invalid value",
          shaderProgram: sp,
        });
      }).toThrowDeveloperError();
    });

    it("fails to draw (missing vertexArray)", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
      });

      expect(function () {
        context.draw({
          primitiveType: PrimitiveType.POINTS,
          shaderProgram: sp,
        });
      }).toThrowDeveloperError();
    });

    it("fails to draw (negative offset)", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
      });

      expect(function () {
        context.draw({
          primitiveType: PrimitiveType.POINTS,
          shaderProgram: sp,
          vertexArray: new VertexArray({
            context: context,
          }),
          offset: -1,
          count: 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws if instanceCount is less than one", function () {
      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        instanceCount: -1,
      });

      expect(function () {
        command.execute(context);
      }).toThrowDeveloperError();
    });

    it("throws when instanceCount is greater than one and instancing is disabled", function () {
      // disable extension
      const instancedArrays = context._instancedArrays;
      context._instancedArrays = undefined;

      const vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
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

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        instanceCount: 2,
      });

      expect(function () {
        command.execute(context);
      }).toThrowDeveloperError();
      context._instancedArrays = instancedArrays;
    });
  },
  "WebGL"
);
