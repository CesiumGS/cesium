/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/Cartesian4',
         'Core/PrimitiveType',
         'Renderer/BufferUsage',
         'Renderer/DepthFunction',
         'Renderer/RenderbufferFormat',
         'Renderer/StencilFunction',
         'Renderer/StencilOperation'
     ], 'Renderer/Framebuffer', function(
         createContext,
         destroyContext,
         Cartesian4,
         PrimitiveType,
         BufferUsage,
         DepthFunction,
         RenderbufferFormat,
         StencilFunction,
         StencilOperation) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;
    var sp;
    var va;
    var framebuffer;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        if (sp) {
            sp = sp.destroy();
        }

        if (va) {
            va = va.destroy();
        }

        if (framebuffer) {
            framebuffer = framebuffer.destroy();
        }

        destroyContext(context);
    });

    it('has a color attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setColorTexture(colorTexture);
        expect(framebuffer.getColorTexture()).toEqual(colorTexture);
    });

    it('has a depth attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setDepthRenderbuffer(renderbuffer);
        expect(framebuffer.getDepthRenderbuffer()).toEqual(renderbuffer);
    });

    it('has a stencil attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.Stencil8
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setStencilRenderbuffer(renderbuffer);
        expect(framebuffer.getStencilRenderbuffer()).toEqual(renderbuffer);
    });

    it('has a depth-stencil attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_STENCIL
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setDepthStencilRenderbuffer(renderbuffer);
        expect(framebuffer.getDepthStencilRenderbuffer()).toEqual(renderbuffer);
    });

    it('clears a color attachment', function() {
        // 1 of 4.  Clear default color buffer to black.
        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        framebuffer = context.createFramebuffer({
            colorTexture : colorTexture
        });

        context.clear(context.createClearState({
            framebuffer : framebuffer,
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }));

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_texture.value = colorTexture;

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqualArray([0, 255, 0, 255]);
    });

    it('clears a cube map face color attachment', function() {
        var cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        // 1 of 4.  Clear default color buffer to black.
        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        framebuffer = context.createFramebuffer({
            colorTexture : cubeMap.getPositiveX()
        });

        context.clear(context.createClearState({
            framebuffer : framebuffer,
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }));

        framebuffer.setColorTexture(null);

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'uniform samplerCube u_cubeMap; void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_cubeMap.value = cubeMap;

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqualArray([0, 255, 0, 255]);

        cubeMap = cubeMap.destroy();
    });

    it('draws to a color attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        framebuffer = context.createFramebuffer({
            colorTexture : colorTexture
        });

        // 1 of 4.  Clear default color buffer to black.
        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 2 of 4.  Render green point into color attachment.
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer
        });

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs2 = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs2 = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';
        var sp2 = context.createShaderProgram(vs2, fs2, {
            position : 0
        });
        sp2.getAllUniforms().u_texture.value = colorTexture;

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp2,
            vertexArray : va
        });
        expect(context.readPixels()).toEqualArray([0, 255, 0, 255]);

        sp2 = sp2.destroy();
    });

    it('draws with a depth attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTexture : context.createTexture2D({
                width : 1,
                height : 1
            }),
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16,
                width : 1,
                height : 1
            })
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3.  Clear framebuffer
        context.clear(context.createClearState({
            framebuffer : framebuffer
        }));
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 2 of 3.  Does not pass depth test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : DepthFunction.NEVER
                }
            })
        });
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqualArray([0, 0, 0, 0]);

        // 3 of 3.  Passes depth test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : DepthFunction.ALWAYS
                }
            })
        });
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqualArray([255, 255, 255, 255]);
    });

    it('draws with a stencil attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTexture : context.createTexture2D({
                width : 1,
                height : 1
            }),
            stencilRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.STENCIL_INDEX8,
                width : 1,
                height : 1
            })
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'uniform vec4 u_color; void main() { gl_FragColor = u_color; }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        // 1 of 3.  Clear framebuffer
        context.clear(context.createClearState({
            framebuffer : framebuffer
        }));
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        // 2 of 3.  Passes stencil test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            uniformMap : {
                u_color : function() {
                    return new Cartesian4(1.0, 1.0, 1.0, 1.0);
                }
            },
            renderState : context.createRenderState({
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.ALWAYS,
                    backFunction : StencilFunction.ALWAYS,
                    reference : 1,
                    frontOperation : {
                        zPass : StencilOperation.REPLACE
                    },
                    backOperation : {
                        zPass : StencilOperation.REPLACE
                    }
                }
            })
        });
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqualArray([255, 255, 255, 255]);

        // 3 of 3.  Does not pass stencil test
        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            uniformMap : {
                u_color : function() {
                    return new Cartesian4(0.0, 0.0, 0.0, 0.0);
                }
            },
            renderState : context.createRenderState({
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.NOT_EQUAL,
                    backFunction : StencilFunction.NOT_EQUAL,
                    reference : 1
                }
            })
        });
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqualArray([255, 255, 255, 255]);
    });

    it('destroys', function() {
        var f = context.createFramebuffer();
        expect(f.isDestroyed()).toEqual(false);
        f.destroy();
        expect(f.isDestroyed()).toEqual(true);
    });

    it('fails to create (depth and depth-stencil)', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not null',
                depthStencilRenderbuffer : 'not null'
            });
        }).toThrow();
    });

    it('fails to create (stencil and depth-stencil)', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                stencilRenderbuffer : 'not null',
                depthStencilRenderbuffer : 'not null'
            });
        }).toThrow();
    });

    it('fails to create (depth and stencil)', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not null',
                stencilRenderbuffer : 'not null'
            });
        }).toThrow();
    });

    it('throws when the depth test is enabled without an appropriate attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTexture : context.createTexture2D({
                width : 1,
                height : 1
            })
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        expect(function() {
            context.draw({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : va,
                framebuffer : framebuffer,
                renderState : context.createRenderState({
                    depthTest : {
                        enabled : true
                    }
                })
            });
        }).toThrow();
    });

    it('fails to destroy', function() {
        var f = context.createFramebuffer();
        f.destroy();

        expect(function() {
            f.destroy();
        }).toThrow();
    });
});