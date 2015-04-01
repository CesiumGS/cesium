/*global defineSuite*/
defineSuite([
        'Core/Color',
        'Core/PixelFormat',
        'Core/PrimitiveType',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/PixelDatatype',
        'Renderer/RenderbufferFormat',
        'Specs/createContext'
    ], 'Renderer/Framebuffer', function(
        Color,
        PixelFormat,
        PrimitiveType,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        PixelDatatype,
        RenderbufferFormat,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,WebGLRenderingContext*/

    var context;
    var sp;
    var va;
    var framebuffer;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
        framebuffer = framebuffer && framebuffer.destroy();
    });

    it('has a color texture attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTextures : [context.createTexture2D({
                width : 1,
                height : 1
            })]
        });
        expect(framebuffer.getColorTexture(0)).toBeDefined();
    });

    it('has a color renderbuffer attachment', function() {
        framebuffer = context.createFramebuffer({
            colorRenderbuffers : [context.createRenderbuffer({
                format : RenderbufferFormat.RGBA4
            })]
        });
        expect(framebuffer.getColorRenderbuffer(0)).toBeDefined();
    });

    it('has a depth texture attachment', function() {
        if (context.depthTexture) {
            framebuffer = context.createFramebuffer({
                depthTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });
            expect(framebuffer.depthTexture).toBeDefined();
        }
    });

    it('has a depth renderbuffer attachment', function() {
        framebuffer = context.createFramebuffer({
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16
            })
        });
        expect(framebuffer.depthRenderbuffer).toBeDefined();
    });

    it('has a stencil renderbuffer attachment', function() {
        framebuffer = context.createFramebuffer({
            stencilRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.STENCIL_INDEX8
            })
        });
        expect(framebuffer.stencilRenderbuffer).toBeDefined();
    });

    it('has a depth-stencil texture attachment', function() {
        if (context.depthTexture) {
            framebuffer = context.createFramebuffer({
                depthStencilTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8_WEBGL
                })
            });
            expect(framebuffer.depthStencilTexture).toBeDefined();
        }
    });

    it('has a depth-stencil renderbuffer attachment', function() {
        framebuffer = context.createFramebuffer({
            depthStencilRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_STENCIL
            })
        });
        expect(framebuffer.depthStencilRenderbuffer).toBeDefined();
    });

    it('has a depth attachment', function() {
        framebuffer = context.createFramebuffer();
        expect(framebuffer.hasDepthAttachment).toEqual(false);
        framebuffer.destroy();

        framebuffer = context.createFramebuffer({
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16
            })
        });
        expect(framebuffer.hasDepthAttachment).toEqual(true);
    });

    it('clears a color attachment', function() {
        // 1 of 4.  Clear default color buffer to black.
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        framebuffer = context.createFramebuffer({
            colorTextures : [colorTexture]
        });

        var clearCommand = new ClearCommand({
            color : new Color (0.0, 1.0, 0.0, 1.0),
            framebuffer : framebuffer
        });
        clearCommand.execute(context);

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = colorTexture;

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('clears a cube map face color attachment', function() {
        var cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        // 1 of 4.  Clear default color buffer to black.
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Clear framebuffer color attachment to green.
        framebuffer = context.createFramebuffer({
            colorTextures : [cubeMap.positiveX]
        });
        framebuffer.destroyAttachments = false;

        var clearCommand = new ClearCommand({
            color : new Color (0.0, 1.0, 0.0, 1.0),
            framebuffer : framebuffer
        });
        clearCommand.execute(context);

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'uniform samplerCube u_cubeMap; void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        cubeMap = cubeMap.destroy();
    });

    it('draws to a color attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        framebuffer = context.createFramebuffer({
            colorTextures : [colorTexture]
        });

        // 1 of 4.  Clear default color buffer to black.
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 2 of 4.  Render green point into color attachment.
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer
        });
        command.execute(context);

        // 3 of 4.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 4 of 4.  Render green to default color buffer by reading from previous color attachment
        var vs2 = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs2 = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';
        var sp2 = context.createShaderProgram(vs2, fs2, {
            position : 0
        });
        sp2.allUniforms.u_texture.value = colorTexture;

        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp2,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        sp2 = sp2.destroy();
    });

    function renderDepthAttachment(framebuffer, texture) {
        ClearCommand.ALL.execute(context);

        // 1 of 3.  Render green point into color attachment.
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
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
        command.execute(context);

        // 2 of 3.  Verify default color buffer is still black.
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // 3 of 3.  Render green to default color buffer by reading from previous color attachment
        var vs2 = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs2 = 'uniform sampler2D u_texture; void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)).rrrr; }';
        var sp2 = context.createShaderProgram(vs2, fs2, {
            position : 0
        });
        sp2.allUniforms.u_texture.value = texture;

        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp2,
            vertexArray : va
        });
        command.execute(context);

        sp2 = sp2.destroy();

        return context.readPixels();
    }

    it('draws to a depth texture attachment', function() {
        if (context.depthTexture) {
            framebuffer = context.createFramebuffer({
                colorTextures : [context.createTexture2D({
                    width : 1,
                    height : 1
                })],
                depthTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });

            if (framebuffer.status === WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                expect(renderDepthAttachment(framebuffer, framebuffer.depthTexture)).toEqualEpsilon([128, 128, 128, 128], 1);
            }
        }
    });

    it('draws to a depth-stencil texture attachment', function() {
        if (context.depthTexture) {
            framebuffer = context.createFramebuffer({
                colorTextures : [context.createTexture2D({
                    width : 1,
                    height : 1
                })],
                depthStencilTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8_WEBGL
                })
            });

            if (framebuffer.status === WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                expect(renderDepthAttachment(framebuffer, framebuffer.depthStencilTexture)).toEqualEpsilon([128, 128, 128, 128], 1);
            }
        }
    });

    it('draws with a depth attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTextures : [context.createTexture2D({
                width : 1,
                height : 1
            })],
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16,
                width : 1,
                height : 1
            })
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        // 1 of 3.  Clear framebuffer
        var clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            framebuffer : framebuffer
        });
        clearCommand.execute(context);
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([0, 0, 0, 0]);

        // 2 of 3.  Does not pass depth test
        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : WebGLRenderingContext.NEVER
                }
            })
        });
        command.execute(context);
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([0, 0, 0, 0]);

        // 3 of 3.  Passes depth test
        command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            framebuffer : framebuffer,
            renderState : context.createRenderState({
                depthTest : {
                    enabled : true,
                    func : WebGLRenderingContext.ALWAYS
                }
            })
        });
        command.execute(context);
        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([255, 255, 255, 255]);
    });

    it('draws with multiple render targets', function() {
        if (context.drawBuffers) {
            var colorTexture0 = context.createTexture2D({
                width : 1,
                height : 1
            });
            var colorTexture1 = context.createTexture2D({
                width : 1,
                height : 1
            });
            framebuffer = context.createFramebuffer({
                colorTextures : [colorTexture0, colorTexture1]
            });

            // 1 of 5.  Clear default color buffer to black.
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            // 2 of 5.  Render red point into color attachment 0 and green point to color attachment 1.
            var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            var fs = '#extension GL_EXT_draw_buffers : enable \n void main() { gl_FragData[0] = vec4(1.0, 0.0, 0.0, 1.0); gl_FragData[1] = vec4(0.0, 1.0, 0.0, 1.0); }';
            sp = context.createShaderProgram(vs, fs);

            va = context.createVertexArray([{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            }]);

            var command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : va,
                framebuffer : framebuffer
            });
            command.execute(context);

            // 3 of 5.  Verify default color buffer is still black.
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            // 4 of 5.  Render yellow to default color buffer by reading from previous color attachments
            var vs2 = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            var fs2 = 'uniform sampler2D u_texture0; uniform sampler2D u_texture1; void main() { gl_FragColor = texture2D(u_texture0, vec2(0.0)) + texture2D(u_texture1, vec2(0.0)); }';
            var sp2 = context.createShaderProgram(vs2, fs2, {
                position : 0
            });
            sp2.allUniforms.u_texture0.value = colorTexture0;
            sp2.allUniforms.u_texture1.value = colorTexture1;

            command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp2,
                vertexArray : va
            });
            command.execute(context);
            expect(context.readPixels()).toEqual([255, 255, 0, 255]);

            // 5 of 5. Verify clearing multiple color attachments
            var clearCommand = new ClearCommand({
                color : new Color (0.0, 0.0, 0.0, 0.0),
                framebuffer : framebuffer
            });
            clearCommand.execute(context);

            command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp2,
                vertexArray : va
            });
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            sp2 = sp2.destroy();
        }
    });

    it('gets the status of a complete framebuffer', function() {
        framebuffer = context.createFramebuffer({
            colorTextures : [context.createTexture2D({
                width : 1,
                height : 1
            })],
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16,
                width : 1,
                height : 1
            })
        });
        expect(framebuffer.status).toEqual(WebGLRenderingContext.FRAMEBUFFER_COMPLETE);
    });

    it('gets the status of a incomplete framebuffer', function() {
        framebuffer = context.createFramebuffer({
            colorTextures : [context.createTexture2D({
                width : 1,
                height : 1
            })],
            depthRenderbuffer : context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16,
                width : 2,
                height : 2
            })
        });
        expect(framebuffer.status).not.toEqual(WebGLRenderingContext.FRAMEBUFFER_COMPLETE);
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
                colorTextures : 'not undefined',
                colorRenderbuffers : 'not undefined'
            });
        }).toThrowDeveloperError();
    });

    it('throws when created with depth texture and depth renderbuffer attachments', function() {
      expect(function() {
            framebuffer = context.createFramebuffer({
                depthTexture : 'not undefined',
                depthRenderbuffer : 'not undefined'
            });
      }).toThrowDeveloperError();
    });

    it('throws when created with depth-stencil texture and depth-stencil renderbuffer attachments', function() {
      expect(function() {
            framebuffer = context.createFramebuffer({
                depthStencilTexture : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
      }).toThrowDeveloperError();
    });

    it('throws when created with depth and depth-stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
        }).toThrowDeveloperError();
    });

    it('throws when created with stencil and depth-stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                stencilRenderbuffer : 'not undefined',
                depthStencilRenderbuffer : 'not undefined'
            });
        }).toThrowDeveloperError();
    });

    it('throws when created with depth and stencil attachments', function() {
        expect(function() {
            framebuffer = context.createFramebuffer({
                depthRenderbuffer : 'not undefined',
                stencilRenderbuffer : 'not undefined'
            });
        }).toThrowDeveloperError();
    });

    it('throws when created with a color texture with a non-color pixel format', function() {
        if (context.depthTexture) {
            expect(function() {
                framebuffer = context.createFramebuffer({
                    colorTextures : [context.createTexture2D({
                        width : 1,
                        height : 1,
                        pixelFormat : PixelFormat.DEPTH_COMPONENT,
                        pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                    })]
                });
            }).toThrowDeveloperError();
        }
    });

    it('throws when created with a depth texture without a DEPTH_COMPONENT pixel format', function() {
      expect(function() {
          framebuffer = context.createFramebuffer({
              depthTexture : context.createTexture2D({
                  width : 1,
                  height : 1
              })
          });
      }).toThrowDeveloperError();
    });

    it('throws when created with a depth-stencil texture without a DEPTH_STENCIL pixel format', function() {
      expect(function() {
          framebuffer = context.createFramebuffer({
              depthStencilTexture : context.createTexture2D({
                  width : 1,
                  height : 1
              })
          });
      }).toThrowDeveloperError();
    });

    it('throws when the depth test is enabled without an appropriate attachment', function() {
        framebuffer = context.createFramebuffer({
            colorTextures : [context.createTexture2D({
                width : 1,
                height : 1
            })]
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        expect(function() {
            var command = new DrawCommand({
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
            command.execute(context);
        }).toThrowDeveloperError();
    });

    it('throws when the number of color texture exceeds the number color attachments supported', function() {
        expect(function() {
            context.createFramebuffer({
                colorTextures : new Array(context.maximumColorAttachments + 1)
            });
        }).toThrowDeveloperError();
    });

    it('throws when the number of color renderbuffers exceeds the number color attachments supported', function() {
        expect(function() {
            context.createFramebuffer({
                colorRenderbuffers : new Array(context.maximumColorAttachments + 1)
            });
        }).toThrowDeveloperError();
    });

    it('throws when the index to getColorTexture is out of bounds', function(){
        framebuffer = context.createFramebuffer();
        expect(function() {
            framebuffer.getColorTexture();
        }).toThrowDeveloperError();

        expect(function() {
            framebuffer.getColorTexture(-1);
        }).toThrowDeveloperError();

        expect(function() {
            framebuffer.getColorTexture(context.maximumColorAttachments + 1);
        }).toThrowDeveloperError();
    });

    it('throws when the index to getColorRenderbuffer is out of bounds', function(){
        framebuffer = context.createFramebuffer();
        expect(function() {
            framebuffer.getColorRenderbuffer();
        }).toThrowDeveloperError();

        expect(function() {
            framebuffer.getColorRenderbuffer(-1);
        }).toThrowDeveloperError();

        expect(function() {
            framebuffer.getColorRenderbuffer(context.maximumColorAttachments + 1);
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var f = context.createFramebuffer();
        f.destroy();

        expect(function() {
            f.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');