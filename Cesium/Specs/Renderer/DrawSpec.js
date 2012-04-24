(function() {
    "use strict";
    /*global Cesium, describe, it, xit, expect, beforeEach, afterEach, Uint16Array, Float32Array, ArrayBuffer*/

    describe("Draw", function () {
        var context;
        var sp;
        var va;
        var bufferUsage = Cesium.BufferUsage;

        beforeEach(function () {
            context = Cesium.Specs.createContext();
        });

        afterEach(function () {
            if (sp) {
                sp = sp.destroy();
            }

            if (va) {
                va = va.destroy();
            }

            Cesium.Specs.destroyContext(context);
        });

        it("draws a white point", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws a white point with an index buffer", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });
            // Two indices instead of one is a workaround for NVIDIA:
            //   http://www.khronos.org/message_boards/viewtopic.php?f=44&t=3719
            va.setIndexBuffer(context.createIndexBuffer(new Uint16Array([0, 0]), bufferUsage.STATIC_DRAW, Cesium.IndexDatatype.UNSIGNED_SHORT));

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws a red point with two vertex buffers", function () {
            var vs =
                "attribute vec4 position;" +
                "attribute mediump float intensity;" +
                "varying mediump float fs_intensity;" +
                "void main()" +
                "{" +
                "    gl_PointSize = 1.0; " +
                "    gl_Position = position;" +
                "    fs_intensity = intensity;" +
                "}";
            var fs = "varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });
            va.addAttribute({
                index                  : sp.getVertexAttributes().intensity.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 1
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 0, 0, 255]);
        });

        it("draws a red point with one interleaved vertex buffers", function () {
            var vs =
                "attribute vec4 position;" +
                "attribute mediump float intensity;" +
                "varying mediump float fs_intensity;" +
                "void main()" +
                "{" +
                "    gl_PointSize = 1.0; " +
                "    gl_Position = position;" +
                "    fs_intensity = intensity;" +
                "}";
            var fs = "varying mediump float fs_intensity; void main() { gl_FragColor = vec4(fs_intensity, 0.0, 0.0, 1.0); }";
            sp = context.createShaderProgram(vs, fs);

            var stride = 5 * Float32Array.BYTES_PER_ELEMENT;
            var vertexBuffer = context.createVertexBuffer(new Float32Array([0, 0, 0, 1, 1]), bufferUsage.STATIC_DRAW);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : vertexBuffer,
                componentsPerAttribute : 4,
                offsetInBytes          : 0,
                strideInBytes          : stride
            });
            va.addAttribute({
                index                  : sp.getVertexAttributes().intensity.index,
                vertexBuffer           : vertexBuffer,
                componentsPerAttribute : 1,
                offsetInBytes          : 4 * Float32Array.BYTES_PER_ELEMENT,
                strideInBytes          : stride
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 0, 0, 255]);
        });

        it("draws with stencil test", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 3:  Render point - fails scissor test
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    scissorTest : {
                        enabled   : true,
                        rectangle : { x:0, y:0, width:0, height:0 }
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 3 of 3:  Render point - passes scissor test
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    scissorTest : {
                        enabled   : true,
                        rectangle : { x:0, y:0, width:1, height:1 }
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with color mask", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 3:  Render point - blue color mask
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    colorMask : { red : true, green : false, blue : false, alpha : false }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 0, 0, 0]);

            // 3 of 3:  Render point - red color mask (blue channel not touched)
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    colorMask : { red : false, green : false, blue : true, alpha : false }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 0, 255, 0]);
        });

        it("draws with additive blending", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(0.5); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            var da = {
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    blending : {
                        enabled                  : true,
                        equationRgb              : Cesium.BlendEquation.ADD, // Optional, default
                        equationAlpha            : Cesium.BlendEquation.ADD, // Optional, default
                        functionSourceRgb        : Cesium.BlendFunction.ONE, // Optional, default
                        functionSourceAlpha      : Cesium.BlendFunction.ONE, // Optional, default
                        functionDestinationRgb   : Cesium.BlendFunction.ONE,
                        functionDestinationAlpha : Cesium.BlendFunction.ONE
                    }
                })
            };

            // 2 of 3:  Blend:  0 + 0.5
            context.draw(da);
            expect(context.readPixels()).toEqualArrayEpsilon([127, 127, 127, 127], 1);

            // 3 of 3:  Blend:  0.5 + 0.5
            context.draw(da);
            expect(context.readPixels()).toEqualArrayEpsilon([254, 254, 254, 254], 1);
        });

        it("draws with alpha blending", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            var da = {
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    blending : {
                        enabled                  : true,
                        equationRgb              : Cesium.BlendEquation.ADD,
                        equationAlpha            : Cesium.BlendEquation.SUBTRACT,             // Doesn't actually matter
                        functionSourceRgb        : Cesium.BlendFunction.SOURCE_ALPHA,
                        functionSourceAlpha      : Cesium.BlendFunction.ONE,                  // Don't blend alpha
                        functionDestinationRgb   : Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
                        functionDestinationAlpha : Cesium.BlendFunction.ZERO
                    }
                })
            };

            // 2 of 3:  Blend:  RGB:  (255 * 0.5) + (0 * 0.5), Alpha: 0.5 + 0
            context.draw(da);
            expect(context.readPixels()).toEqualArrayEpsilon([127, 127, 127, 127], 1);

            // 3 of 3:  Blend:  RGB:  (255 * 0.5) + (127 * 0.5), Alpha: 0.5 + 0
            context.draw(da);
            expect(context.readPixels()).toEqualArrayEpsilon([191, 191, 191, 127], 2);
        });

        it("draws with blend color", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            var da = {
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    blending : {
                        enabled                  : true,
                        color                    : { red : 0.5, green : 0.5, blue : 0.5, alpha : 0.5 },
                        equationRgb              : Cesium.BlendEquation.SUBTRACT,
                        equationAlpha            : Cesium.BlendEquation.SUBTRACT,
                        functionSourceRgb        : Cesium.BlendFunction.CONSTANT_COLOR,
                        functionSourceAlpha      : Cesium.BlendFunction.ONE,
                        functionDestinationRgb   : Cesium.BlendFunction.ZERO,
                        functionDestinationAlpha : Cesium.BlendFunction.ZERO
                    }
                })
            };

            // 2 of 3:  Blend:  RGB:  255 - 127, Alpha: 255 - (255 - 255)
            //   Epsilon of 1 because ANGLE gives 127 and desktop GL gives 128.
            context.draw(da);
            expect(context.readPixels()).toEqualArrayEpsilon([128, 128, 128, 255], 1);
        });

        it("draws with culling", function () {
            var vs = "attribute vec4 position; void main() { gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000, -1000, 0, 1,
                                       1000,  1000, 0, 1,
                                      -1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 3:  Cull front faces - nothing is drawn
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    cull          : {
                        enabled : true,
                        face    : Cesium.CullFace.FRONT
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 3 of 3:  Cull back faces - nothing is culled
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    cull : {
                        enabled : true,
                        face    : Cesium.CullFace.BACK
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with front face winding order", function () {
            var vs = "attribute vec4 position; void main() { gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000, -1000, 0, 1,
                                       1000,  1000, 0, 1,
                                      -1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            // 1 of 3:  Clear to black
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 3:  Cull back faces with opposite winding order - nothing is drawn
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    frontFace : Cesium.WindingOrder.CLOCKWISE,
                    cull      : {
                        enabled : true,
                        face    : Cesium.CullFace.BACK
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 3 of 3:  Cull back faces with correct winding order - nothing is culled
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    frontFace : Cesium.WindingOrder.COUNTER_CLOCKWISE,
                    cull      : {
                        enabled : true,
                        face    : Cesium.CullFace.BACK
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with the depth test", function () {
            var vs = "attribute vec4 position; void main() { gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000, -1000, 0, 1,
                                       1000,  1000, 0, 1,
                                      -1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            var da = {
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    depthTest : {
                        enabled : true,
                        func    : Cesium.DepthFunction.LESS_OR_EQUAL
                    }
                })
            };

            // 1 of 2.  Triangle fan passes the depth test.
            context.clear(context.createClearState({
                color : { red : 0.0, green : 0.0, blue : 0.0, alpha : 0.0 },
                depth : 1.0
            }));
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw(da);
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

            // 2 of 2.  Triangle fan fails the depth test.
            context.clear(context.createClearState({
                color : { red : 0.0, green : 0.0, blue : 0.0, alpha : 0.0 },
                depth : 0.0
            }));
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw(da);
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
        });

        it("draws with depth range", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(gl_DepthRange.near, gl_DepthRange.far, 0.0, 1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    depthRange : {
                        near : 0.25,
                        far  : 0.75
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([64, 191, 0, 255]);
        });

        it("draws with line width", function () {
            var vs = "attribute vec4 position; void main() { gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.LINES,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    lineWidth : context.getMaximumAliasedLineWidth()    // May only be 1.
                })
            });

            // I believe different GL implementations are allowed to AA
            // in different ways (or at least that is what we see in practice),
            // so verify it at least rendered something.
            expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
        });

        it("draws with polygon offset", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    polygonOffset : {
                        enabled : true,
                        factor  : 1,
                        units   : 1
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with sample coverage", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    sampleCoverage : {
                        enabled : true,
                        value   : 0,
                        invert  : false
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    sampleCoverage : {
                        enabled : false
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with stencil test (front)", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000, -1000, 0, 1,
                                       1000,  1000, 0, 1,
                                      -1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            var rs = context.createRenderState({
                    stencilTest : {
                        enabled        : true,
                        frontFunction  : Cesium.StencilFunction.EQUAL,
                        reference      : 1,
                        mask           : 1
                    }
                });

            // 1 of 4.  Clear, including stencil
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 4.  Render where stencil is set - nothing is drawn
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : rs
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 3 of 4.  Render to stencil only, increment
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    colorMask : { red : false, green : false, blue : false, alpha : false },
                    stencilTest : {
                        enabled        : true,
                        frontOperation : {
                            zPass : Cesium.StencilOperation.INCREMENT
                        }
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 4 of 4.  Render where stencil is set
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : rs
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with stencil test (back)", function () {
            var vs = "attribute vec4 position; void main() { gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(
                    new Float32Array([-1000, -1000, 0, 1,
                                       1000, -1000, 0, 1,
                                       1000,  1000, 0, 1,
                                      -1000,  1000, 0, 1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            var rs = context.createRenderState({
                    frontFace : Cesium.WindingOrder.CLOCKWISE,
                    stencilTest : {
                        enabled       : true,
                        backFunction  : Cesium.StencilFunction.NOT_EQUAL,
                        reference     : 0
                    }
                });

            // 1 of 4.  Clear, including stencil
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 2 of 4.  Render where stencil is set - nothing is drawn
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : rs
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 3 of 4.  Render to stencil only, increment
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : context.createRenderState({
                    frontFace   : Cesium.WindingOrder.CLOCKWISE,
                    colorMask   : { red : false, green : false, blue : false, alpha : false },
                    stencilTest : {
                        enabled        : true,
                        backOperation : {
                            zPass : Cesium.StencilOperation.INVERT
                        }
                    }
                })
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // 4 of 4.  Render where stencil is set
            context.draw({
                primitiveType : Cesium.PrimitiveType.TRIANGLE_FAN,
                shaderProgram : sp,
                vertexArray   : va,
                renderState   : rs
            });

            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("draws with an offset and count", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([
                    0, 0, 0, -1,
                    0, 0, 0,  1]), bufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            // The first point in the vertex buffer does not generate any pixels
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                offset        : 0,
                count         : 1,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                offset        : 1,
                count         : 1,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("fails to draw (missing drawArguments)", function () {
            expect(function () {
                context.draw();
            }).toThrow();
        });

        it("fails to draw (missing shaderProgram)", function () {
            expect(function () {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.POINTS
                });
            }).toThrow();
        });

        it("fails to draw (missing primitiveType)", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            expect(function () {
                context.draw({
                    shaderProgram : sp
                });
            }).toThrow();
        });

        it("fails to draw (primitiveType)", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            expect(function () {
                context.draw({
                    primitiveType : "invalid value",
                    shaderProgram : sp
                });
            }).toThrow();
        });

        it("fails to draw (missing vertexArray)", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            expect(function () {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.POINTS,
                    shaderProgram : sp
                });
            }).toThrow();
        });

        it("fails to draw (negative offset)", function () {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var fs = "void main() { gl_FragColor = vec4(1.0); }";
            sp = context.createShaderProgram(vs, fs);

            expect(function () {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.POINTS,
                    shaderProgram : sp,
                    vertexArray   : context.createVertexArray(),
                    offset        : -1,
                    count         : 1
                });
            }).toThrow();
        });
    });
}());