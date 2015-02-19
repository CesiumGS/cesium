/*global defineSuite*/
defineSuite([
        'Core/BoundingRectangle',
        'Core/Color',
        'Core/IndexDatatype',
        'Core/PrimitiveType',
        'Core/WindingOrder',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Specs/createContext'
    ], 'Renderer/Draw', function(
        BoundingRectangle,
        Color,
        IndexDatatype,
        PrimitiveType,
        WindingOrder,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor,WebGLRenderingContext*/

    var context;
    var sp;
    var va;

    beforeAll(function() {
        context = createContext({
            webgl : {
                stencil : true
            }
        });
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
    });

    it('draws a white point', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws a white point with an index buffer', function() {
        // Use separate context to work around IE 11.0.9 bug
        var cxt = createContext();

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = cxt.createShaderProgram(vs, fs);

        // Two indices instead of one is a workaround for NVIDIA:
        //   http://www.khronos.org/message_boards/viewtopic.php?f=44&t=3719
        var indexBuffer = cxt.createIndexBuffer(new Uint16Array([0, 0]), BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);

        va = cxt.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : cxt.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }], indexBuffer);

        ClearCommand.ALL.execute(cxt);
        expect(cxt.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(cxt);
        expect(cxt.readPixels()).toEqual([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
        cxt.destroyForSpecs();
    });

    it('draws a red point with two vertex buffers', function() {
        var vs =
            'attribute vec4 position;' +
            'attribute mediump float intensity;' +
            'varying mediump float fs_intensity;' +
            'void main() {' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = position;' +
            '  fs_intensity = intensity;' +
            '}';
        var fs = 'varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }, {
            index : sp.vertexAttributes.intensity.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('draws a red point with one interleaved vertex buffers', function() {
        var vs =
            'attribute vec4 position;' +
            'attribute mediump float intensity;' +
            'varying mediump float fs_intensity;' +
            'void main() {' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = position;' +
            '  fs_intensity = intensity;' +
            '}';
        var fs = 'varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var stride = 5 * Float32Array.BYTES_PER_ELEMENT;
        var vertexBuffer = context.createVertexBuffer(new Float32Array([0, 0, 0, 1, 1]), BufferUsage.STATIC_DRAW);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 4,
            offsetInBytes : 0,
            strideInBytes : stride
        }, {
            index : sp.vertexAttributes.intensity.index,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 1,
            offsetInBytes : 4 * Float32Array.BYTES_PER_ELEMENT,
            strideInBytes : stride
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('draws with scissor test', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Render point - fails scissor test
        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                scissorTest : {
                    enabled : true,
                    rectangle : new BoundingRectangle(1, 1, 0, 0)
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Render point - passes scissor test
        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                scissorTest : {
                    enabled : true,
                    rectangle : new BoundingRectangle(0, 0, 1, 1)
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with color mask', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Render point - blue color mask
        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                colorMask : {
                    red : true,
                    green : false,
                    blue : false,
                    alpha : false
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 0]);

        // 3 of 3:  Render point - red color mask (blue channel not touched)
        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                colorMask : {
                    red : false,
                    green : false,
                    blue : true,
                    alpha : false
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 255, 0]);
    });

    it('draws with additive blending', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(0.5); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                blending : {
                    enabled : true,
                    equationRgb : WebGLRenderingContext.FUNC_ADD, // Optional, default
                    equationAlpha : WebGLRenderingContext.FUNC_ADD, // Optional, default
                    functionSourceRgb : WebGLRenderingContext.ONE, // Optional, default
                    functionSourceAlpha : WebGLRenderingContext.ONE, // Optional, default
                    functionDestinationRgb : WebGLRenderingContext.ONE,
                    functionDestinationAlpha : WebGLRenderingContext.ONE
                }
            })
        });

        // 2 of 3:  Blend:  0 + 0.5
        command.execute(context);
        expect(context.readPixels()).toEqualEpsilon([127, 127, 127, 127], 1);

        // 3 of 3:  Blend:  0.5 + 0.5
        command.execute(context);
        expect(context.readPixels()).toEqualEpsilon([254, 254, 254, 254], 1);
    });

    it('draws with alpha blending', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                blending : {
                    enabled : true,
                    equationRgb : WebGLRenderingContext.FUNC_ADD,
                    equationAlpha : WebGLRenderingContext.FUNC_SUBTRACT, // does not actually matter
                    functionSourceRgb : WebGLRenderingContext.SRC_ALPHA,
                    functionSourceAlpha : WebGLRenderingContext.ONE, // Don't blend alpha
                    functionDestinationRgb : WebGLRenderingContext.ONE_MINUS_SRC_ALPHA,
                    functionDestinationAlpha : WebGLRenderingContext.ZERO
                }
            })
        });

        // 2 of 3:  Blend:  RGB:  (255 * 0.5) + (0 * 0.5), Alpha: 0.5 + 0
        command.execute(context);
        expect(context.readPixels()).toEqualEpsilon([127, 127, 127, 127], 1);

        // 3 of 3:  Blend:  RGB:  (255 * 0.5) + (127 * 0.5), Alpha: 0.5 + 0
        command.execute(context);
        expect(context.readPixels()).toEqualEpsilon([191, 191, 191, 127], 2);
    });

    it('draws with blend color', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                blending : {
                    enabled : true,
                    color : {
                        red : 0.5,
                        green : 0.5,
                        blue : 0.5,
                        alpha : 0.5
                    },
                    equationRgb : WebGLRenderingContext.FUNC_SUBTRACT,
                    equationAlpha : WebGLRenderingContext.FUNC_SUBTRACT,
                    functionSourceRgb : WebGLRenderingContext.CONSTANT_COLOR,
                    functionSourceAlpha : WebGLRenderingContext.ONE,
                    functionDestinationRgb : WebGLRenderingContext.ZERO,
                    functionDestinationAlpha : WebGLRenderingContext.ZERO
                }
            })
        });

        // 2 of 3:  Blend:  RGB:  255 - 127, Alpha: 255 - (255 - 255)
        //   Epsilon of 1 because ANGLE gives 127 and desktop GL gives 128.
        command.execute(context);
        expect(context.readPixels()).toEqualEpsilon([128, 128, 128, 255], 1);
    });

    it('draws with culling', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, -1000, 1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Cull front faces - nothing is drawn
        var command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                cull : {
                    enabled : true,
                    face : WebGLRenderingContext.FRONT
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Cull back faces - nothing is culled
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                cull : {
                    enabled : true,
                    face : WebGLRenderingContext.BACK
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with front face winding order', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, -1000, 1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3:  Clear to black
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Cull back faces with opposite winding order - nothing is drawn
        var command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                frontFace : WindingOrder.CLOCKWISE,
                cull : {
                    enabled : true,
                    face : WebGLRenderingContext.BACK
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Cull back faces with correct winding order - nothing is culled
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                frontFace : WindingOrder.COUNTER_CLOCKWISE,
                cull : {
                    enabled : true,
                    face : WebGLRenderingContext.BACK
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with the depth test', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, -1000, 1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : WebGLRenderingContext.LEQUAL
                }
            })
        });

        // 1 of 2.  Triangle fan passes the depth test.

        var clearCommand = new ClearCommand({
            color : new Color (0.0, 0.0, 0.0, 0.0),
            depth : 1.0
        });
        clearCommand.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        // 2 of 2.  Triangle fan fails the depth test.
        clearCommand.color = new Color (0.0, 0.0, 0.0, 0.0);
        clearCommand.depth = 0.0;
        clearCommand.execute(context);

        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('draws with depth range', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(gl_DepthRange.near, gl_DepthRange.far, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                depthRange : {
                    near : 0.25,
                    far : 0.75
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([64, 191, 0, 255]);
    });

    it('draws with line width', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.LINES,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                lineWidth : context.maximumAliasedLineWidth
            // May only be 1.
            })
        });
        command.execute(context);

        // I believe different GL implementations are allowed to AA
        // in different ways (or at least that is what we see in practice),
        // so verify it at least rendered something.
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('draws with polygon offset', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                polygonOffset : {
                    enabled : true,
                    factor : 1,
                    units : 1
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with sample coverage', function() {
        if (!context.antialias) {
            // Sample coverage requires antialiasing.
            return;
        }

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                sampleCoverage : {
                    enabled : true,
                    value : 0,
                    invert : false
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                sampleCoverage : {
                    enabled : false
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with stencil test (front)', function() {
        if (context.stencilBits === 0) {
            return;
        }

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, -1000, 1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var rs = context.createRenderState({
            stencilTest : {
                enabled : true,
                frontFunction : WebGLRenderingContext.EQUAL,
                reference : 1,
                mask : 1
            }
        });

        // 1 of 4.  Clear, including stencil
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Render where stencil is set - nothing is drawn
        var command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 4.  Render to stencil only, increment
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                colorMask : {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                },
                stencilTest : {
                    enabled : true,
                    frontOperation : {
                        zPass : WebGLRenderingContext.INCR
                    }
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render where stencil is set
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with stencil test (back)', function() {
        if (context.stencilBits === 0) {
            return;
        }

        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, -1000, 1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var rs = context.createRenderState({
            frontFace : WindingOrder.CLOCKWISE,
            stencilTest : {
                enabled : true,
                backFunction : WebGLRenderingContext.NOTEQUAL,
                reference : 0
            }
        });

        // 1 of 4.  Clear, including stencil
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Render where stencil is set - nothing is drawn
        var command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 4.  Render to stencil only, increment
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                frontFace : WindingOrder.CLOCKWISE,
                colorMask : {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                },
                stencilTest : {
                    enabled : true,
                    backOperation : {
                        zPass : WebGLRenderingContext.INVERT
                    }
                }
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render where stencil is set
        command = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLE_STRIP,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with an offset and count', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, -1, 0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // The first point in the vertex buffer does not generate any pixels
        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            offset : 0,
            count : 1,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            offset : 1,
            count : 1,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('fails to draw (missing command)', function() {
        expect(function() {
            context.draw();
        }).toThrowDeveloperError();
    });

    it('fails to draw (missing shaderProgram)', function() {
        expect(function() {
            context.draw({
                primitiveType : PrimitiveType.POINTS
            });
        }).toThrowDeveloperError();
    });

    it('fails to draw (missing primitiveType)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            context.draw({
                shaderProgram : sp
            });
        }).toThrowDeveloperError();
    });

    it('fails to draw (primitiveType)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            context.draw({
                primitiveType : 'invalid value',
                shaderProgram : sp
            });
        }).toThrowDeveloperError();
    });

    it('fails to draw (missing vertexArray)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            context.draw({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp
            });
        }).toThrowDeveloperError();
    });

    it('fails to draw (negative offset)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            context.draw({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : context.createVertexArray(),
                offset : -1,
                count : 1
            });
        }).toThrowDeveloperError();
    });
}, 'WebGL');