/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/IndexDatatype',
         'Core/PrimitiveType',
         'Core/WindingOrder',
         'Renderer/BufferUsage',
         'Renderer/BlendEquation',
         'Renderer/BlendFunction',
         'Renderer/ClearCommand',
         'Renderer/CullFace',
         'Renderer/DepthFunction',
         'Renderer/StencilFunction',
         'Renderer/StencilOperation'
     ], 'Renderer/Draw', function(
         createContext,
         destroyContext,
         IndexDatatype,
         PrimitiveType,
         WindingOrder,
         BufferUsage,
         BlendEquation,
         BlendFunction,
         ClearCommand,
         CullFace,
         DepthFunction,
         StencilFunction,
         StencilOperation) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var sp;
    var va;

    beforeAll(function() {
        context = createContext({
            stencil : true
        });
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
    });

    it('draws a white point', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws a white point with an index buffer', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // Two indices instead of one is a workaround for NVIDIA:
        //   http://www.khronos.org/message_boards/viewtopic.php?f=44&t=3719
        va.setIndexBuffer(context.createIndexBuffer(new Uint16Array([0, 0]), BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT));

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
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

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });
        va.addAttribute({
            index : sp.getVertexAttributes().intensity.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
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

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 4,
            offsetInBytes : 0,
            strideInBytes : stride
        });
        va.addAttribute({
            index : sp.getVertexAttributes().intensity.index,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 1,
            offsetInBytes : 4 * Float32Array.BYTES_PER_ELEMENT,
            strideInBytes : stride
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('draws with stencil test', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Render point - fails scissor test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                scissorTest : {
                    enabled : true,
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : 0,
                        height : 0
                    }
                }
            })
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Render point - passes scissor test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                scissorTest : {
                    enabled : true,
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : 1,
                        height : 1
                    }
                }
            })
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with color mask', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Render point - blue color mask
        context.draw({
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
        expect(context.readPixels()).toEqual([255, 0, 0, 0]);

        // 3 of 3:  Render point - red color mask (blue channel not touched)
        context.draw({
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
        expect(context.readPixels()).toEqual([255, 0, 255, 0]);
    });

    it('draws with additive blending', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(0.5); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var da = {
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                blending : {
                    enabled : true,
                    equationRgb : BlendEquation.ADD, // Optional, default
                    equationAlpha : BlendEquation.ADD, // Optional, default
                    functionSourceRgb : BlendFunction.ONE, // Optional, default
                    functionSourceAlpha : BlendFunction.ONE, // Optional, default
                    functionDestinationRgb : BlendFunction.ONE,
                    functionDestinationAlpha : BlendFunction.ONE
                }
            })
        };

        // 2 of 3:  Blend:  0 + 0.5
        context.draw(da);
        expect(context.readPixels()).toEqualEpsilon([127, 127, 127, 127], 1);

        // 3 of 3:  Blend:  0.5 + 0.5
        context.draw(da);
        expect(context.readPixels()).toEqualEpsilon([254, 254, 254, 254], 1);
    });

    it('draws with alpha blending', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var da = {
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                blending : {
                    enabled : true,
                    equationRgb : BlendEquation.ADD,
                    equationAlpha : BlendEquation.SUBTRACT, // does not actually matter
                    functionSourceRgb : BlendFunction.SOURCE_ALPHA,
                    functionSourceAlpha : BlendFunction.ONE, // Don't blend alpha
                    functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
                    functionDestinationAlpha : BlendFunction.ZERO
                }
            })
        };

        // 2 of 3:  Blend:  RGB:  (255 * 0.5) + (0 * 0.5), Alpha: 0.5 + 0
        context.draw(da);
        expect(context.readPixels()).toEqualEpsilon([127, 127, 127, 127], 1);

        // 3 of 3:  Blend:  RGB:  (255 * 0.5) + (127 * 0.5), Alpha: 0.5 + 0
        context.draw(da);
        expect(context.readPixels()).toEqualEpsilon([191, 191, 191, 127], 2);
    });

    it('draws with blend color', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var da = {
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
                    equationRgb : BlendEquation.SUBTRACT,
                    equationAlpha : BlendEquation.SUBTRACT,
                    functionSourceRgb : BlendFunction.CONSTANT_COLOR,
                    functionSourceAlpha : BlendFunction.ONE,
                    functionDestinationRgb : BlendFunction.ZERO,
                    functionDestinationAlpha : BlendFunction.ZERO
                }
            })
        };

        // 2 of 3:  Blend:  RGB:  255 - 127, Alpha: 255 - (255 - 255)
        //   Epsilon of 1 because ANGLE gives 127 and desktop GL gives 128.
        context.draw(da);
        expect(context.readPixels()).toEqualEpsilon([128, 128, 128, 255], 1);
    });

    it('draws with culling', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, 1000, 1000, 0, 1, -1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Cull front faces - nothing is drawn
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                }
            })
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Cull back faces - nothing is culled
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                }
            })
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with front face winding order', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, 1000, 1000, 0, 1, -1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3:  Clear to black
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 3:  Cull back faces with opposite winding order - nothing is drawn
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                frontFace : WindingOrder.CLOCKWISE,
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                }
            })
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3:  Cull back faces with correct winding order - nothing is culled
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                frontFace : WindingOrder.COUNTER_CLOCKWISE,
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                }
            })
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with the depth test', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, 1000, 1000, 0, 1, -1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        var da = {
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : DepthFunction.LESS_OR_EQUAL
                }
            })
        };

        // 1 of 2.  Triangle fan passes the depth test.
        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            depth : 1.0
        })));
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw(da);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        // 2 of 2.  Triangle fan fails the depth test.
        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            depth : 0.0
        })));
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw(da);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('draws with depth range', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(gl_DepthRange.near, gl_DepthRange.far, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
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
        expect(context.readPixels()).toEqual([64, 191, 0, 255]);
    });

    it('draws with line width', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.LINES,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                lineWidth : context.getMaximumAliasedLineWidth()
            // May only be 1.
            })
        });

        // I believe different GL implementations are allowed to AA
        // in different ways (or at least that is what we see in practice),
        // so verify it at least rendered something.
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('draws with polygon offset', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
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
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with sample coverage', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : context.createRenderState({
                sampleCoverage : {
                    enabled : false
                }
            })
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with stencil test (front)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, 1000, 1000, 0, 1, -1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        var rs = context.createRenderState({
            stencilTest : {
                enabled : true,
                frontFunction : StencilFunction.EQUAL,
                reference : 1,
                mask : 1
            }
        });

        // 1 of 4.  Clear, including stencil
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Render where stencil is set - nothing is drawn
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 4.  Render to stencil only, increment
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
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
                        zPass : StencilOperation.INCREMENT
                    }
                }
            })
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render where stencil is set
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with stencil test (back)', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([-1000, -1000, 0, 1, 1000, -1000, 0, 1, 1000, 1000, 0, 1, -1000, 1000, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        var rs = context.createRenderState({
            frontFace : WindingOrder.CLOCKWISE,
            stencilTest : {
                enabled : true,
                backFunction : StencilFunction.NOT_EQUAL,
                reference : 0
            }
        });

        // 1 of 4.  Clear, including stencil
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Render where stencil is set - nothing is drawn
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 4.  Render to stencil only, increment
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
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
                        zPass : StencilOperation.INVERT
                    }
                }
            })
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render where stencil is set
        context.draw({
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });

        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('draws with an offset and count', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, -1, 0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // The first point in the vertex buffer does not generate any pixels
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            offset : 0,
            count : 1,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            offset : 1,
            count : 1,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('fails to draw (missing command)', function() {
        expect(function() {
            context.draw();
        }).toThrow();
    });

    it('fails to draw (missing shaderProgram)', function() {
        expect(function() {
            context.draw({
                primitiveType : PrimitiveType.POINTS
            });
        }).toThrow();
    });

    it('fails to draw (missing primitiveType)', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            context.draw({
                shaderProgram : sp
            });
        }).toThrow();
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
        }).toThrow();
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
        }).toThrow();
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
        }).toThrow();
    });
}, 'WebGL');