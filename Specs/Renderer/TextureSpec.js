/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Cartesian2',
         'Core/PrimitiveType',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/PixelFormat',
         'Renderer/PixelDatatype',
         'Renderer/TextureWrap',
         'Renderer/TextureMinificationFilter',
         'Renderer/TextureMagnificationFilter'
     ], 'Renderer/Texture', function(
         createContext,
         destroyContext,
         Cartesian2,
         PrimitiveType,
         BufferUsage,
         ClearCommand,
         PixelFormat,
         PixelDatatype,
         TextureWrap,
         TextureMinificationFilter,
         TextureMagnificationFilter) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var sp;
    var va;
    var texture;

    var greenImage;
    var blueImage;
    var blueAlphaImage;
    var blueOverRedImage;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
        texture = texture && texture.destroy();
    });

    function renderFragment(context) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform sampler2D u_texture;' +
            'void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_texture.value = texture;

        va = context.createVertexArray();
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        return context.readPixels();
    }

    it('create images', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        blueAlphaImage = new Image();
        blueAlphaImage.src = './Data/Images/BlueAlpha.png';

        blueOverRedImage = new Image();
        blueOverRedImage.src = './Data/Images/BlueOverRed.png';

        waitsFor(function() {
            return greenImage.complete && blueImage.complete && blueAlphaImage.complete && blueOverRedImage.complete;
        }, 'Load .png file(s) for texture test.', 3000);
    });

    it('creates with defaults', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(texture.getPixelDatatype()).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it('creates from the framebuffer', function() {
        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        })));
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        texture = context.createTexture2DFromFramebuffer();
        expect(texture.getWidth()).toEqual(context.getCanvas().clientWidth);
        expect(texture.getHeight()).toEqual(context.getCanvas().clientHeight);

        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            }
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        expect(renderFragment(context)).toEqual([255, 0, 0, 255]);
    });

    it('copies from the framebuffer', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGB
        });

        // Render blue
        expect(renderFragment(context)).toEqual([0, 0, 255, 255]);

        // Clear to red
        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        })));
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        texture.copyFromFramebuffer();

        // Clear to white
        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            }
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        // Render red
        expect(renderFragment(context)).toEqual([255, 0, 0, 255]);
    });

    it('draws a textured blue point', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        expect(renderFragment(context)).toEqual([0, 0, 255, 255]);
    });

    it('renders with premultiplied alpha', function() {
        texture = context.createTexture2D({
            source : blueAlphaImage,
            pixelFormat :PixelFormat.RGBA,
            preMultiplyAlpha : true
        });
        expect(texture.getPreMultiplyAlpha()).toEqual(true);

        expect(renderFragment(context)).toEqual([0, 0, 127, 127]);
    });

    it('draws textured blue and red points', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat :PixelFormat.RGBA
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform sampler2D u_texture;' +
            'uniform mediump vec2 u_txCoords;' +
            'void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_texture.value = texture;

        va = context.createVertexArray();
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        var da = {
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        };

        // Blue on top
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.75);
        context.draw(da);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // Red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('creates from a typed array', function() {
        var bytes = new Uint8Array([0, 255, 0, 255]);

        texture = context.createTexture2D({
            pixelFormat : PixelFormat.RGBA, // Default
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE, // Default
            source : {
                width : 1,
                height : 1,
                arrayBufferView : bytes
            }
        });

        expect(renderFragment(context)).toEqual([0, 255, 0, 255]);
    });

    it('copies from a typed array', function() {
        texture = context.createTexture2D({
            width : 1,
            height : 1,
            pixelFormat : PixelFormat.RGBA, // Default
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE // Default
        });

        var bytes = new Uint8Array([255, 0, 255, 0]);
        texture.copyFrom({
            arrayBufferView : bytes,
            width : 1,
            height : 1
        });

        expect(renderFragment(context)).toEqual([255, 0, 255, 0]);
    });

    it('copies over a subset of a texture', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat :PixelFormat.RGBA
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform sampler2D u_texture;' +
            'uniform mediump vec2 u_txCoords;' +
            'void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_texture.value = texture;

        va = context.createVertexArray();
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        var da = {
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        };

        // Blue on top
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.75);
        context.draw(da);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // Red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        // After copy...
        texture.copyFrom(greenImage, 0, 1);

        // Now green on top
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.75);
        context.draw(da);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        // Still red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('generates mipmaps', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        texture.generateMipmap();
        texture.setSampler(context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        }));

        expect(renderFragment(context)).toEqual([0, 0, 255, 255]);
    });

    it('gets the default sampler', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        var sampler = texture.getSampler();
        expect(sampler.wrapS).toEqual(TextureWrap.CLAMP);
        expect(sampler.wrapT).toEqual(TextureWrap.CLAMP);
        expect(sampler.minificationFilter).toEqual(TextureMinificationFilter.LINEAR);
        expect(sampler.magnificationFilter).toEqual(TextureMagnificationFilter.LINEAR);
        expect(sampler.maximumAnisotropy).toEqual(1.0);
    });

    it('sets a sampler', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        var sampler = context.createSampler({
            wrapS : TextureWrap.REPEAT,
            wrapT : TextureWrap.MIRRORED_REPEAT,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST,
            maximumAnisotropy : 2.0
        });
        texture.setSampler(sampler);

        var s = texture.getSampler();
        expect(s.wrapS).toEqual(sampler.wrapS);
        expect(s.wrapT).toEqual(sampler.wrapT);
        expect(s.minificationFilter).toEqual(sampler.minificationFilter);
        expect(s.magnificationFilter).toEqual(sampler.magnificationFilter);
        expect(s.maximumAnisotropy).toEqual(2.0);
    });

    it('gets width and height', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat :PixelFormat.RGBA
        });

        expect(texture.getWidth()).toEqual(1);
        expect(texture.getHeight()).toEqual(2);
    });

    it('destroys', function() {
        var t = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        expect(t.isDestroyed()).toEqual(false);
        t.destroy();
        expect(t.isDestroyed()).toEqual(true);
    });

    it('fails to create (description)', function() {
        expect(function() {
            texture = context.createTexture2D();
        }).toThrow();
    });

    it('fails to create (source)', function() {
        expect(function() {
            texture = context.createTexture2D({});
        }).toThrow();
    });

    it('fails to create (width, no height)', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16
            });
        }).toThrow();
    });

    it('fails to create (small width)', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 0,
                height : 16
            });
        }).toThrow();
    });

    it('fails to create (large width)', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : context.getMaximumTextureSize() + 1,
                height : 16
            });
        }).toThrow();
    });

    it('fails to create (small height)', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16,
                height : 0
            });
        }).toThrow();
    });

    it('fails to create (large height)', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16,
                height : context.getMaximumTextureSize() + 1
            });
        }).toThrow();
    });

    it('fails to create (PixelFormat)', function() {
        expect(function() {
            texture = context.createTexture2D({
                source : blueImage,
                pixelFormat : 'invalid PixelFormat'
            });
        }).toThrow();
    });

    it('fails to create (pixelDatatype)', function() {
        expect(function() {
            texture = context.createTexture2D({
                source : blueImage,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : 'invalid pixelDatatype'
            });
        }).toThrow();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT and pixelDatatype is not UNSIGNED_SHORT or UNSIGNED_INT', function() {
        expect(function() {
            texture = context.createTexture2D({
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
        }).toThrow();
    });

    it('throws when creating if pixelFormat is DEPTH_STENCIL and pixelDatatype is not UNSIGNED_INT_24_8_WEBGL', function() {
        expect(function() {
            texture = context.createTexture2D({
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
        }).toThrow();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and source is provided', function() {
        expect(function() {
            texture = context.createTexture2D({
                source : blueImage,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        }).toThrow();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and WEBGL_depth_texture is not supported', function() {
        if (!context.getDepthTexture()) {
            expect(function() {
                texture = context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                });
            }).toThrow();
        }
    });

    it('fails to create from the framebuffer (PixelFormat)', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer('invalid PixelFormat');
        }).toThrow();
    });

    it('throws when creating from the framebuffer if PixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.DEPTH_COMPONENT);
        }).toThrow();
    });

    it('fails to create from the framebuffer (framebufferXOffset)', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, -1);
        }).toThrow();
    });

    it('fails to create from the framebuffer (framebufferYOffset)', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, -1);
        }).toThrow();
    });

    it('fails to create from the framebuffer (width)', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, 0, context.getCanvas().clientWidth + 1);
        }).toThrow();
    });

    it('fails to create from the framebuffer (height)', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, 0, 1, context.getCanvas().clientHeight + 1);
        }).toThrow();
    });

    it('throws when copying to a texture from a framebuffer with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.getDepthTexture()) {
            texture = context.createTexture2D({
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            expect(function() {
                texture.copyFromFramebuffer();
            }).toThrow();
        }
    });

    it('fails to copy from the frame buffer (xOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(-1);
        }).toThrow();
    });

    it('fails to copy from the frame buffer (yOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, -1);
        }).toThrow();
    });

    it('fails to copy from the frame buffer (framebufferXOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, -1);
        }).toThrow();
    });

    it('fails to copy from the frame buffer (framebufferYOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, -1);
        }).toThrow();
    });

    it('fails to copy from the frame buffer (width)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, texture.getWidth() + 1);
        }).toThrow();
    });

    it('fails to copy from the frame buffer (height)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, 0, texture.getHeight() + 1);
        }).toThrow();
    });

    it('fails to set sampler (wrapS)', function() {
        expect(function() {
            context.createSampler({
                wrapS : 'invalid wrap'
            });
        }).toThrow();
    });

    it('fails to set sampler (wrapT)', function() {
        expect(function() {
            context.createSampler({
                wrapT : 'invalid wrap'
            });
        }).toThrow();
    });

    it('fails to set sampler (minificationFilter)', function() {
        expect(function() {
            context.createSampler({
                minificationFilter : 'invalid filter'
            });
        }).toThrow();
    });

    it('fails to set sampler (magnificationFilter)', function() {
        expect(function() {
            context.createSampler({
                magnificationFilter : 'invalid filter'
            });
        }).toThrow();
    });

    it('fails to set sampler (maximumAnisotropy)', function() {
        expect(function() {
            context.createSampler({
                maximumAnisotropy : 0.0
            });
        }).toThrow();
    });

    it('throws when copying to a texture with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.getDepthTexture()) {
            texture = context.createTexture2D({
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            expect(function() {
                texture.copyFrom({
                    arrayBufferView : new Uint16Array([0]),
                    width : 1,
                    height : 1
                });
            }).toThrow();
        }
    });

    it('fails to copy from an image (source)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFrom();
        }).toThrow();
    });

    it('fails to copy from an image (xOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });
        var image = new Image();

        expect(function() {
            texture.copyFrom(image, -1);
        }).toThrow();
    });

    it('fails to copy from an image (yOffset)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });
        var image = new Image();

        expect(function() {
            texture.copyFrom(image, 0, -1);
        }).toThrow();
    });

    it('fails to copy from an image (width)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });
        var image = new Image();
        image.width = blueImage.width + 1;

        expect(function() {
            texture.copyFrom(image);
        }).toThrow();
    });

    it('fails to copy from an image (height)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });
        var image = new Image();
        image.height = blueImage.height + 1;

        expect(function() {
            texture.copyFrom(image);
        }).toThrow();
    });

    it('throws when generating mipmaps with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.getDepthTexture()) {
            texture = context.createTexture2D({
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            expect(function() {
                texture.generateMipmap();
            }).toThrow();
        }
    });

    it('fails to generate mipmaps (width)', function() {
        texture = context.createTexture2D({
            width : 3,
            height : 2
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrow();
    });

    it('fails to generate mipmaps (height)', function() {
        texture = context.createTexture2D({
            width : 2,
            height : 3
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrow();
    });

    it('fails to generate mipmaps (hint)', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.generateMipmap('invalid hint');
        }).toThrow();
    });

    it('fails to destroy', function() {
        var t = context.createTexture2D({
            source : blueImage,
            pixelFormat :PixelFormat.RGBA
        });

        t.destroy();

        expect(function() {
            t.destroy();
        }).toThrow();
    });
});