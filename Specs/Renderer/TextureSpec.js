/*global defineSuite*/
defineSuite([
         'Renderer/Texture',
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Cartesian2',
         'Core/Color',
         'Core/loadImage',
         'Core/PrimitiveType',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/PixelFormat',
         'Renderer/PixelDatatype',
         'Renderer/TextureWrap',
         'Renderer/TextureMinificationFilter',
         'Renderer/TextureMagnificationFilter'
     ], function(
         Texture,
         createContext,
         destroyContext,
         Cartesian2,
         Color,
         loadImage,
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
    var greenImage;
    var blueImage;
    var blueAlphaImage;
    var blueOverRedImage;

    var sp;
    var va;
    var texture;

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
        var vs = '';
        vs += 'attribute vec4 position;';
        vs += 'void main() { gl_PointSize = 1.0; gl_Position = position; }';

        var fs = '';
        fs += 'uniform sampler2D u_texture;';
        fs += 'void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }';

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

    it('loads images for the test', function() {
        loadImage('./Data/Images/Green.png').then(function(image) {
            greenImage = image;
        });

        loadImage('./Data/Images/Blue.png').then(function(image) {
            blueImage = image;
        });

        loadImage('./Data/Images/BlueAlpha.png').then(function(image) {
            blueAlphaImage = image;
        });

        loadImage('./Data/Images/BlueOverRed.png').then(function(image) {
            blueOverRedImage = image;
        });

        waitsFor(function() {
            return greenImage && blueImage && blueAlphaImage && blueOverRedImage;
        }, 'Load .png file(s) for texture test.', 3000);
    });

    it('has expected default values for pixel format and datatype', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(texture.getPixelDatatype()).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it('can create a texture from the framebuffer', function() {
        var command = new ClearCommand();
        command.color = Color.RED;
        command.execute(context);

        texture = context.createTexture2DFromFramebuffer();
        expect(texture.getWidth()).toEqual(context.getCanvas().clientWidth);
        expect(texture.getHeight()).toEqual(context.getCanvas().clientHeight);

        command.color = Color.WHITE;
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.WHITE.toBytes());

        expect(renderFragment(context)).toEqual(Color.RED.toBytes());
    });

    it('can copy from the framebuffer', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGB
        });

        // Render blue
        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());

        // Clear to red
        var command = new ClearCommand();
        command.color = Color.RED;
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());

        texture.copyFromFramebuffer();

        // Clear to white
        command.color = Color.WHITE;
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.WHITE.toBytes());

        // Render red
        expect(renderFragment(context)).toEqual(Color.RED.toBytes());
    });

    it('draws the expected texture color', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());
    });

    it('renders with premultiplied alpha', function() {
        texture = context.createTexture2D({
            source : blueAlphaImage,
            pixelFormat : PixelFormat.RGBA,
            preMultiplyAlpha : true
        });
        expect(texture.getPreMultiplyAlpha()).toEqual(true);

        expect(renderFragment(context)).toEqual([0, 0, 127, 127]);
    });

    it('draws textured blue and red points', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA
        });

        var vs = '';
        vs += 'attribute vec4 position;';
        vs += 'void main() { gl_PointSize = 1.0; gl_Position = position; }';

        var fs = '';
        fs += 'uniform sampler2D u_texture;';
        fs += 'uniform mediump vec2 u_txCoords;';
        fs += 'void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }';

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
        expect(context.readPixels()).toEqual(Color.BLUE.toBytes());

        // Red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());
    });

    it('can be created from a typed array', function() {
        var bytes = new Uint8Array(Color.GREEN.toBytes());

        texture = context.createTexture2D({
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            source : {
                width : 1,
                height : 1,
                arrayBufferView : bytes
            }
        });

        expect(renderFragment(context)).toEqual(Color.GREEN.toBytes());
    });

    it('can copy from a typed array', function() {
        texture = context.createTexture2D({
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            width : 1,
            height : 1
        });

        var bytes = new Uint8Array(Color.NAVY.toBytes());
        texture.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : bytes
        });

        expect(renderFragment(context)).toEqual(Color.NAVY.toBytes());
    });

    it('can replace a subset of a texture', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA
        });

        var vs = '';
        vs += 'attribute vec4 position;';
        vs += 'void main() { gl_PointSize = 1.0; gl_Position = position; }';

        var fs = '';
        fs += 'uniform sampler2D u_texture;';
        fs += 'uniform mediump vec2 u_txCoords;';
        fs += 'void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }';

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
        expect(context.readPixels()).toEqual(Color.BLUE.toBytes());

        // Red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());

        // After copy...
        texture.copyFrom(greenImage, 0, 1);

        // Now green on top
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.75);
        context.draw(da);
        expect(context.readPixels()).toEqual(Color.LIME.toBytes());

        // Still red on bottom
        sp.getAllUniforms().u_txCoords.value = new Cartesian2(0.5, 0.25);
        context.draw(da);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());
    });

    it('can generate mipmaps', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        texture.generateMipmap();
        texture.setSampler(context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        }));

        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());
    });

    it('is created with a default sampler', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        var sampler = texture.getSampler();
        expect(sampler.wrapS).toEqual(TextureWrap.CLAMP);
        expect(sampler.wrapT).toEqual(TextureWrap.CLAMP);
        expect(sampler.minificationFilter).toEqual(TextureMinificationFilter.LINEAR);
        expect(sampler.magnificationFilter).toEqual(TextureMagnificationFilter.LINEAR);
        expect(sampler.maximumAnisotropy).toEqual(1.0);
    });

    it('can set a sampler', function() {
        texture = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
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

    it('can get width and height', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(texture.getWidth()).toEqual(1);
        expect(texture.getHeight()).toEqual(2);
    });

    it('can get whether Y is flipped', function() {
        texture = context.createTexture2D({
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA,
            flipY : true
        });

        expect(texture.getFlipY()).toEqual(true);
    });

    it('can get the dimensions of a texture', function() {
        texture = context.createTexture2D({
            width : 64,
            height : 16
        });

        expect(texture.getDimensions()).toEqual(new Cartesian2(64, 16));
    });

    it('can be destroyed', function() {
        var t = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(t.isDestroyed()).toEqual(false);
        t.destroy();
        expect(t.isDestroyed()).toEqual(true);
    });

    it('throws when creating a texture without a description', function() {
        expect(function() {
            texture = context.createTexture2D();
        }).toThrow();
    });

    it('throws when creating a texture without a source', function() {
        expect(function() {
            texture = context.createTexture2D({});
        }).toThrow();
    });

    it('throws when creating a texture with width and no height', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16
            });
        }).toThrow();
    });

    it('throws when creating a texture with height and no width', function() {
        expect(function() {
            texture = context.createTexture2D({
                height : 16
            });
        }).toThrow();
    });

    it('throws when creating a texture with zero width', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 0,
                height : 16
            });
        }).toThrow();
    });

    it('throws when creating a texture with width larger than the maximum texture size', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : context.getMaximumTextureSize() + 1,
                height : 16
            });
        }).toThrow();
    });

    it('throws when creating a texture with zero height', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16,
                height : 0
            });
        }).toThrow();
    });

    it('throws when creating a texture with height larger than the maximum texture size', function() {
        expect(function() {
            texture = context.createTexture2D({
                width : 16,
                height : context.getMaximumTextureSize() + 1
            });
        }).toThrow();
    });

    it('throws when creating a texture with an invalid pixel format', function() {
        expect(function() {
            texture = context.createTexture2D({
                source : blueImage,
                pixelFormat : 'invalid PixelFormat'
            });
        }).toThrow();
    });

    it('throws when creating a texture with an invalid pixel datatype', function() {
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

    it('throws when creating from the framebuffer with an invalid pixel format', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer('invalid PixelFormat');
        }).toThrow();
    });

    it('throws when creating from the framebuffer if PixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.DEPTH_COMPONENT);
        }).toThrow();
    });

    it('throws when creating from the framebuffer with a negative framebufferXOffset', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, -1);
        }).toThrow();
    });

    it('throws when creating from the framebuffer with a negative framebufferYOffset', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, -1);
        }).toThrow();
    });

    it('throws when creating from the framebuffer with a width greater than the canvas clientWidth', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, 0, context.getCanvas().clientWidth + 1);
        }).toThrow();
    });

    it('throws when creating from the framebuffer with a height greater than the canvas clientHeight', function() {
        expect(function() {
            texture = context.createTexture2DFromFramebuffer(PixelFormat.RGB, 0, 0, 1, context.getCanvas().clientHeight + 1);
        }).toThrow();
    });

    it('throws when copying to a texture from the framebuffer with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
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

    it('throws when copying from the framebuffer with a negative xOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(-1);
        }).toThrow();
    });

    it('throws when copying from the framebuffer with a negative yOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, -1);
        }).toThrow();
    });

    it('throws when copying from the framebuffer with a negative framebufferXOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, -1);
        }).toThrow();
    });

    it('throws when copying from the framebuffer with a negative framebufferYOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, -1);
        }).toThrow();
    });

    it('throws when copying from the framebuffer with a larger width', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, texture.getWidth() + 1);
        }).toThrow();
    });

    it('throws when copying from the framebuffer with a larger height', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, 0, texture.getHeight() + 1);
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

    it('throws when copyFrom is not given a source', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFrom();
        }).toThrow();
    });

    it('throws when copyFrom is given a negative xOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFrom(blueImage, -1);
        }).toThrow();
    });

    it('throws when copyFrom is given a negative yOffset', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.copyFrom(blueImage, 0, -1);
        }).toThrow();
    });

    it('throws when copyFrom is given a source with larger width', function() {
        texture = context.createTexture2D({
            source : blueImage
        });
        var image = new Image();
        image.width = blueImage.width + 1;

        expect(function() {
            texture.copyFrom(image);
        }).toThrow();
    });

    it('throws when copyFrom is given a source with larger height', function() {
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

    it('throws when generating mipmaps with a non-power of two width', function() {
        texture = context.createTexture2D({
            width : 3,
            height : 2
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrow();
    });

    it('throws when generating mipmaps with a non-power of two height', function() {
        texture = context.createTexture2D({
            width : 2,
            height : 3
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrow();
    });

    it('throws when generating mipmaps with an invalid hint', function() {
        texture = context.createTexture2D({
            source : blueImage
        });

        expect(function() {
            texture.generateMipmap('invalid hint');
        }).toThrow();
    });

    it('throws when destroy is called after destroying', function() {
        var t = context.createTexture2D({
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        t.destroy();

        expect(function() {
            t.destroy();
        }).toThrow();
    });
}, 'WebGL');