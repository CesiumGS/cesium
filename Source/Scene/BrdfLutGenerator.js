/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/BrdfLutGeneratorFS'
    ], function(
        BoundingRectangle,
        Color,
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        Sampler,
        ShaderSource,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BrdfLutGeneratorFS) {
    'use strict';

    /**
     * @private
     */
    function BrdfLutGenerator() {
        this._framebuffer = undefined;
        this._colorTexture = undefined;
        this._drawCommand = undefined;
    }

    defineProperties(BrdfLutGenerator.prototype, {
        colorTexture : {
            get : function() {
                return this._colorTexture;
            }
        }
    });

    function createCommand(generator, context) {
        var framebuffer = generator._framebuffer;

        var drawCommand = context.createViewportQuadCommand(BrdfLutGeneratorFS, {
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                viewport : new BoundingRectangle(0.0, 0.0, 256.0, 256.0)
            })
        });

        generator._drawCommand = drawCommand;
    }

    function createFramebuffer(generator, context) {
        var colorTexture = new Texture({
            context : context,
            width : 256,
            height: 256,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });

        generator._colorTexture = colorTexture;

        var framebuffer = new Framebuffer({
            context : context,
            colorTextures : [colorTexture],
            destroyAttachments : true
        });

        generator._framebuffer = framebuffer;
    }

    BrdfLutGenerator.prototype.update = function(frameState) {
        if (!defined(this._colorTexture)) {
            var context = frameState.context;

            createFramebuffer(this, context);
            createCommand(this, context);
            this._drawCommand.execute(context);
            delete this._framebuffer;
            delete this._drawCommand;
        }
    };

    BrdfLutGenerator.prototype.isDestroyed = function() {
        return false;
    };

    BrdfLutGenerator.prototype.destroy = function() {
        delete this._colorTexture;
        return destroyObject(this);
    };

    return BrdfLutGenerator;
});
