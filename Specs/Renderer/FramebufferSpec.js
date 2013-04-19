/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Cartesian4',
         'Core/PrimitiveType',
         'Renderer/PixelFormat',
         'Renderer/PixelDatatype',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/DepthFunction',
         'Renderer/RenderbufferFormat',
         'Renderer/StencilFunction',
         'Renderer/StencilOperation'
     ], 'Renderer/Framebuffer', function(
         createContext,
         destroyContext,
         Cartesian4,
         PrimitiveType,
         PixelFormat,
         PixelDatatype,
         BufferUsage,
         ClearCommand,
         DepthFunction,
         RenderbufferFormat,
         StencilFunction,
         StencilOperation) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var sp;
    var va;
    var framebuffer;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
        framebuffer = framebuffer && framebuffer.destroy();
    });

    it('has a color texture attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setColorTexture(colorTexture);
        expect(framebuffer.getColorTexture()).toEqual(colorTexture);
    });

    it('has a color renderbuffer attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.RGBA4
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setColorRenderbuffer(renderbuffer);
        expect(framebuffer.getColorRenderbuffer()).toEqual(renderbuffer);

        framebuffer.setColorRenderbuffer(undefined);
        expect(framebuffer.getColorRenderbuffer()).not.toBeDefined();
    });

    it('has a depth texture attachment', function() {
        if (context.getDepthTexture()) {
            var depthTexture = context.createTexture2D({
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            framebuffer = context.createFramebuffer();
            framebuffer.setDepthTexture(depthTexture);
            expect(framebuffer.getDepthTexture()).toEqual(depthTexture);
        }
    });

    it('has a depth renderbuffer attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setDepthRenderbuffer(renderbuffer);
        expect(framebuffer.getDepthRenderbuffer()).toEqual(renderbuffer);
    });

    it('has a stencil renderbuffer attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.STENCIL_INDEX8
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setStencilRenderbuffer(renderbuffer);
        expect(framebuffer.getStencilRenderbuffer()).toEqual(renderbuffer);
    });

    it('has a depth-stencil texture attachment', function() {
        if (context.getDepthTexture()) {
            var texture = context.createTexture2D({
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8_WEBGL
            });

            framebuffer = context.createFramebuffer();
            framebuffer.setDepthStencilTexture(texture);
            expect(framebuffer.getDepthStencilTexture()).toEqual(texture);
        }
    });

    it('has a depth-stencil renderbuffer attachment', function() {
        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_STENCIL
        });

        framebuffer = context.createFramebuffer();
        framebuffer.setDepthStencilRenderbuffer(renderbuffer);
        expect(framebuffer.getDepthStencilRenderbuffer()).toEqual(renderbuffer);
    });

    it('has a depth attachment', function() {
        framebuffer = context.createFramebuffer();
        expect(framebuffer.hasDepthAttachment()).toEqual(false);

        var renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });
        framebuffer.setDepthRenderbuffer(renderbuffer);
        expect(framebuffer.hasDepthAttachment()).toEqual(true);
    });

    it('clears a color attachment', function() {
        // 1 of 4.  Clear default color buffer to black.
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        framebuffer = context.createFramebuffer({
            colorTexture : colorTexture
        });

        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }), framebuffer));

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

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
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('clears a cube map face color attachment', function() {
        var cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        // 1 of 4.  Clear default color buffer to black.
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        framebuffer = context.createFramebuffer({
            colorTexture : cubeMap.getPositiveX()
        });

        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }), framebuffer));

        framebuffer.setColorTexture(undefined);

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

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
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

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
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        sp2 = sp2.destroy();
    });

    function renderDepthAttachment(framebuffer, texture) {
        context.clear();

        // 1 of 3.  Render green point into color attachment.
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
            framebuffer : framebuffer,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true
                }
            })
        });

        // 2 of 3.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3.  Render green to default color buffer by reading from previous color attachment
        var vs2 = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs2 = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)).rrrr; }';
        var sp2 = context.createShaderProgram(vs2, fs2, {
            position : 0
        });
        sp2.getAllUniforms().u_texture.value = texture;

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp2,
            vertexArray : va
        });

        sp2 = sp2.destroy();

        return context.readPixels();
    }

    it('draws to a depth texture attachment', function() {
        if (context.getDepthTexture()) {
            framebuffer = context.createFramebuffer({
                colorTexture : context.createTexture2D({
                    width : 1,
                    height : 1
                }),
                depthTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });

            expect(renderDepthAttachment(framebuffer, framebuffer.getDepthTexture())).toEqualEpsilon([128, 128, 128, 128], 1);
        }
    });

    it('draws to a depth-stencil texture attachment', function() {
        if (context.getDepthTexture()) {
            framebuffer = context.createFramebuffer({
                colorTexture : context.createTexture2D({
                    width : 1,
                    height : 1
                }),
                depthStencilTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8_WEBGL
                })
            });

            expect(renderDepthAttachment(framebuffer, framebuffer.getDepthStencilTexture())).toEqualEpsilon([128, 128, 128, 128], 1);
        }
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
        context.clear(new ClearCommand(context.createClearState(), framebuffer));
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([0, 0, 0, 0]);

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
        })).toEqual([0, 0, 0, 0]);

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
        })).toEqual([255, 255, 255, 255]);
    });

    it('destroys', function() {
        var f = context.createFramebuffer();
        expect(f.isDestroyed()).toEqual(false);
        f.destroy();
        expect(f.isDestroyed()).toEqual(true);
    });

    it('throws when created with color texture and color renderbuffer attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                colorTexture : 'not undefined',
                colorRenderbuffer : 'not undefined'
            });
        }).toThrow();
    });

    it('throws when created with depth texture and depth renderbuffer attachments', function() {
      expect(function() {
            framebuffer = context.createFramebuffer({
                depthTexture : 'not undefined',
                depthRenderbuffer : 'not undefined'
            });
      }).toThrow();
    });

    it('throws when created with depth-stencil texture and depth-stencil renderbuffer attachments', function() {
      expect(function() {
            framebuffer = context.createFramebuffer({
                depthStencilTexture : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
      }).toThrow();
    });

    it('throws when created with depth and depth-stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
        }).toThrow();
    });

    it('throws when created with stencil and depth-stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                stencilRenderbuffer : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
        }).toThrow();
    });

    it('throws when created with depth and stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not undefined',
                stencilRenderbuffer : 'not undefined'
            });
        }).toThrow();
    });

    it('throws when created with a color texture with a non-color pixel format', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                colorTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });
        }).toThrow();
    });

    it('throws when created with a depth texture without a DEPTH_COMPONENT pixel format', function() {
      expect(function() {
          framebuffer = context.createFramebuffer({
              depthTexture : context.createTexture2D({
                  width : 1,
                  height : 1
              })
          });
      }).toThrow();
    });

    it('throws when created with a depth-stencil texture without a DEPTH_STENCIL pixel format', function() {
      expect(function() {
          framebuffer = context.createFramebuffer({
              depthStencilTexture : context.createTexture2D({
                  width : 1,
                  height : 1
              })
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
}, 'WebGL');