/*global defineSuite*/
defineSuite([
        'Renderer/Texture',
        'Core/Cartesian2',
        'Core/Color',
        'Core/loadImage',
        'Core/PixelFormat',
        'Core/PrimitiveType',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/ContextLimits',
        'Renderer/DrawCommand',
        'Renderer/PixelDatatype',
        'Renderer/Sampler',
        'Renderer/ShaderProgram',
        'Renderer/TextureMagnificationFilter',
        'Renderer/TextureMinificationFilter',
        'Renderer/TextureWrap',
        'Renderer/VertexArray',
        'Specs/createContext',
        'ThirdParty/when'
    ], function(
        Texture,
        Cartesian2,
        Color,
        loadImage,
        PixelFormat,
        PrimitiveType,
        Buffer,
        BufferUsage,
        ClearCommand,
        ContextLimits,
        DrawCommand,
        PixelDatatype,
        Sampler,
        ShaderProgram,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        VertexArray,
        createContext,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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

        var promises = [];
        promises.push(loadImage('./Data/Images/Green.png').then(function(image) {
            greenImage = image;
        }));
        promises.push(loadImage('./Data/Images/Blue.png').then(function(image) {
            blueImage = image;
        }));
        promises.push(loadImage('./Data/Images/BlueAlpha.png').then(function(image) {
            blueAlphaImage = image;
        }));
        promises.push(loadImage('./Data/Images/BlueOverRed.png').then(function(image) {
            blueOverRedImage = image;
        }));

        return when.all(promises);
    });

    afterAll(function() {
        context.destroyForSpecs();
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

        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });
        sp.allUniforms.u_texture.value = texture;

        va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);

        return context.readPixels();
    }

    it('has expected default values for pixel format and datatype', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it('can create a texture from the framebuffer', function() {
        var command = new ClearCommand({
            color : Color.RED
        });
        command.execute(context);

        texture = Texture.fromFramebuffer({
            context : context
        });
        expect(texture.width).toEqual(context.canvas.clientWidth);
        expect(texture.height).toEqual(context.canvas.clientHeight);

        command.color = Color.WHITE;
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.WHITE.toBytes());

        expect(renderFragment(context)).toEqual(Color.RED.toBytes());
    });

    it('can copy from the framebuffer', function() {
        texture = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGB
        });

        // Render blue
        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());

        // Clear to red
        var command = new ClearCommand({
            color : Color.RED
        });
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
        texture = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());
    });

    it('draws the expected floating-point texture color', function() {
        if (context.floatingPointTexture) {
            var color = new Color(0.2, 0.4, 0.6, 0.8);
            var floats = new Float32Array([color.red, color.green, color.blue, color.alpha]);

            texture = new Texture({
                context : context,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.FLOAT,
                source : {
                    width : 1,
                    height : 1,
                    arrayBufferView : floats
                }
            });

            var pixels = renderFragment(context);
            expect(pixels).toEqual(color.toBytes());
        }
    });

    it('renders with premultiplied alpha', function() {
        texture = new Texture({
            context : context,
            source : blueAlphaImage,
            pixelFormat : PixelFormat.RGBA,
            preMultiplyAlpha : true
        });
        expect(texture.preMultiplyAlpha).toEqual(true);

        expect(renderFragment(context)).toEqual([0, 0, 127, 127]);
    });

    it('draws textured blue and red points', function() {
        texture = new Texture({
            context : context,
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

        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });
        sp.allUniforms.u_texture.value = texture;

        va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // Blue on top
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.75);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.BLUE.toBytes());

        // Red on bottom
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.25);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());
    });

    it('can be created from a typed array', function() {
        var bytes = new Uint8Array(Color.GREEN.toBytes());

        texture = new Texture({
            context : context,
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
        texture = new Texture({
            context : context,
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
        texture = new Texture({
            context : context,
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

        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });
        sp.allUniforms.u_texture.value = texture;

        va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // Blue on top
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.75);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.BLUE.toBytes());

        // Red on bottom
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.25);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());

        // After copy...
        texture.copyFrom(greenImage, 0, 1);

        // Now green on top
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.75);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.LIME.toBytes());

        // Still red on bottom
        sp.allUniforms.u_txCoords.value = new Cartesian2(0.5, 0.25);
        command.execute(context);
        expect(context.readPixels()).toEqual(Color.RED.toBytes());
    });

    it('can generate mipmaps', function() {
        texture = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        texture.generateMipmap();
        texture.sampler = new Sampler({
            minificationFilter : TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        });

        expect(renderFragment(context)).toEqual(Color.BLUE.toBytes());
    });

    it('can set a sampler', function() {
        texture = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        var sampler = new Sampler({
            wrapS : TextureWrap.REPEAT,
            wrapT : TextureWrap.MIRRORED_REPEAT,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST,
            maximumAnisotropy : 2.0
        });
        texture.sampler = sampler;

        var s = texture.sampler;
        expect(s.wrapS).toEqual(sampler.wrapS);
        expect(s.wrapT).toEqual(sampler.wrapT);
        expect(s.minificationFilter).toEqual(sampler.minificationFilter);
        expect(s.magnificationFilter).toEqual(sampler.magnificationFilter);
        expect(s.maximumAnisotropy).toEqual(2.0);
    });

    it('can get width and height', function() {
        texture = new Texture({
            context : context,
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(texture.width).toEqual(1);
        expect(texture.height).toEqual(2);
    });

    it('can get whether Y is flipped', function() {
        texture = new Texture({
            context : context,
            source : blueOverRedImage,
            pixelFormat : PixelFormat.RGBA,
            flipY : true
        });

        expect(texture.flipY).toEqual(true);
    });

    it('can get the dimensions of a texture', function() {
        texture = new Texture({
            context : context,
            width : 64,
            height : 16
        });

        expect(texture.dimensions).toEqual(new Cartesian2(64, 16));
    });

    it('can be destroyed', function() {
        var t = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        expect(t.isDestroyed()).toEqual(false);
        t.destroy();
        expect(t.isDestroyed()).toEqual(true);
    });

    it('throws when creating a texture without a options', function() {
        expect(function() {
            texture = new Texture();
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture without a source', function() {
        expect(function() {
            texture = new Texture({
                context : context
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with width and no height', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                width : 16
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with height and no width', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                height : 16
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with zero width', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                width : 0,
                height : 16
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with width larger than the maximum texture size', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                width : ContextLimits.maximumTextureSize + 1,
                height : 16
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with zero height', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                width : 16,
                height : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with height larger than the maximum texture size', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                width : 16,
                height : ContextLimits.maximumTextureSize + 1
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with an invalid pixel format', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                source : blueImage,
                pixelFormat : 'invalid PixelFormat'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a texture with an invalid pixel datatype', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                source : blueImage,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : 'invalid pixelDatatype'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT and pixelDatatype is not UNSIGNED_SHORT or UNSIGNED_INT', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating if pixelFormat is DEPTH_STENCIL and pixelDatatype is not UNSIGNED_INT_24_8', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and source is provided', function() {
        expect(function() {
            texture = new Texture({
                context : context,
                source : blueImage,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and WEBGL_depth_texture is not supported', function() {
        if (!context.depthTexture) {
            expect(function() {
                texture = new Texture({
                    context : context,
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                });
            }).toThrowDeveloperError();
        }
    });

    it('throws when creating if pixelDatatype is FLOAT, and OES_texture_float is not supported', function() {
        if (!context.floatingPointTexture) {
            expect(function() {
                texture = new Texture({
                    context : context,
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.FLOAT
                });
            }).toThrowDeveloperError();
        }
    });

    it('throws when creating from the framebuffer with an invalid pixel format', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : 'invalid PixelFormat'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating from the framebuffer if PixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : PixelFormat.DEPTH_COMPONENT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating from the framebuffer with a negative framebufferXOffset', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : PixelFormat.RGB,
                framebufferXOffset : -1
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating from the framebuffer with a negative framebufferYOffset', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : PixelFormat.RGB,
                framebufferXOffset : 0,
                framebufferYOffset : -1
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating from the framebuffer with a width greater than the canvas clientWidth', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : PixelFormat.RGB,
                framebufferXOffset : 0,
                framebufferYOffset : 0,
                width : context.canvas.clientWidth + 1
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating from the framebuffer with a height greater than the canvas clientHeight', function() {
        expect(function() {
            texture = Texture.fromFramebuffer({
                context : context,
                pixelFormat : PixelFormat.RGB,
                framebufferXOffset : 0,
                framebufferYOffset : 0,
                width : 1,
                height : context.canvas.clientHeight + 1
            });
        }).toThrowDeveloperError();
    });

    it('throws when copying to a texture from the framebuffer with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.depthTexture) {
            texture = new Texture({
                context : context,
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            expect(function() {
                texture.copyFromFramebuffer();
            }).toThrowDeveloperError();
        }
    });

    it('throws when copying to a texture from the framebuffer with a FLOAT pixel data type', function() {
        if (context.floatingPointTexture) {
            texture = new Texture({
                context : context,
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.FLOAT
            });

            expect(function() {
                texture.copyFromFramebuffer();
            }).toThrowDeveloperError();
        }
    });

    it('throws when copying from the framebuffer with a negative xOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(-1);
        }).toThrowDeveloperError();
    });

    it('throws when copying from the framebuffer with a negative yOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, -1);
        }).toThrowDeveloperError();
    });

    it('throws when copying from the framebuffer with a negative framebufferXOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, -1);
        }).toThrowDeveloperError();
    });

    it('throws when copying from the framebuffer with a negative framebufferYOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, -1);
        }).toThrowDeveloperError();
    });

    it('throws when copying from the framebuffer with a larger width', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, texture.width + 1);
        }).toThrowDeveloperError();
    });

    it('throws when copying from the framebuffer with a larger height', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFromFramebuffer(0, 0, 0, 0, 0, texture.height + 1);
        }).toThrowDeveloperError();
    });

    it('throws when copying to a texture with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.depthTexture) {
            texture = new Texture({
                context : context,
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
            }).toThrowDeveloperError();
        }
    });

    it('throws when copyFrom is not given a source', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFrom();
        }).toThrowDeveloperError();
    });

    it('throws when copyFrom is given a negative xOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFrom(blueImage, -1);
        }).toThrowDeveloperError();
    });

    it('throws when copyFrom is given a negative yOffset', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.copyFrom(blueImage, 0, -1);
        }).toThrowDeveloperError();
    });

    it('throws when copyFrom is given a source with larger width', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });
        var image = new Image();
        image.width = blueImage.width + 1;

        expect(function() {
            texture.copyFrom(image);
        }).toThrowDeveloperError();
    });

    it('throws when copyFrom is given a source with larger height', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });
        var image = new Image();
        image.height = blueImage.height + 1;

        expect(function() {
            texture.copyFrom(image);
        }).toThrowDeveloperError();
    });

    it('throws when generating mipmaps with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format', function() {
        if (context.depthTexture) {
            texture = new Texture({
                context : context,
                width : 1,
                height : 1,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });

            expect(function() {
                texture.generateMipmap();
            }).toThrowDeveloperError();
        }
    });

    it('throws when generating mipmaps with a non-power of two width', function() {
        texture = new Texture({
            context : context,
            width : 3,
            height : 2
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrowDeveloperError();
    });

    it('throws when generating mipmaps with a non-power of two height', function() {
        texture = new Texture({
            context : context,
            width : 2,
            height : 3
        });

        expect(function() {
            texture.generateMipmap();
        }).toThrowDeveloperError();
    });

    it('throws when generating mipmaps with an invalid hint', function() {
        texture = new Texture({
            context : context,
            source : blueImage
        });

        expect(function() {
            texture.generateMipmap('invalid hint');
        }).toThrowDeveloperError();
    });

    it('throws when destroy is called after destroying', function() {
        var t = new Texture({
            context : context,
            source : blueImage,
            pixelFormat : PixelFormat.RGBA
        });

        t.destroy();

        expect(function() {
            t.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');