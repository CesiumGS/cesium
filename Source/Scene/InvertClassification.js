define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './BlendingState',
        './StencilFunction',
        './StencilOperation'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BlendingState,
        StencilFunction,
        StencilOperation) {
    'use strict';

    /**
     * @private
     */
    function InvertClassification() {
        this.previousFramebuffer = undefined;
        this._previousFramebuffer = undefined;

        this._texture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._fbo = undefined;

        this._rsUnclassified = undefined;
        this._rsClassified = undefined;

        this._unclassifiedCommand = undefined;
        this._classifiedCommand = undefined;

        this._clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            owner : this
        });

        var that = this;
        this._uniformMap = {
            u_texture : function() {
                return that._texture;
            }
        };
    }

    var rsUnclassified = {
        depthMask : false,
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.KEEP
            },
            backFunction : StencilFunction.NEVER,
            reference : 0,
            mask : ~0
        },
        blending : BlendingState.ALPHA_BLEND
    };
    var rsClassified = {
        depthMask : false,
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.KEEP
            },
            backFunction : StencilFunction.NEVER,
            reference : 0,
            mask : ~0
        },
        blending : BlendingState.ALPHA_BLEND
    };

    var unclassifiedFS =
        'uniform sampler2D u_texture;\n' +
        'varying vec2 v_textureCoordinates;\n' +
        'void main()\n' +
        '{\n' +
        '    vec4 color = texture2D(u_texture, v_textureCoordinates);\n' +
        '    if (color.a == 0.0)\n' +
        '    {\n' +
        '        discard;\n' +
        '    }\n' +
        '    gl_FragColor = color * czm_invertClassificationColor;\n' +
        '}\n';

    var classifiedFS =
        'uniform sampler2D u_texture;\n' +
        'varying vec2 v_textureCoordinates;\n' +
        'void main()\n' +
        '{\n' +
        '    vec4 color = texture2D(u_texture, v_textureCoordinates);\n' +
        '    if (color.a == 0.0)\n' +
        '    {\n' +
        '        discard;\n' +
        '    }\n' +
        '    gl_FragColor = color;\n' +
        '}\n';

    InvertClassification.prototype.update = function(context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var texture = this._texture;
        var textureChanged = !defined(texture) || texture.width !== width || texture.height !== height;
        if (textureChanged) {
            this._texture = this._texture && this._texture.destroy();
            this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
            this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

            this._texture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                })
            });

            if (context.depthTexture) {
                this._depthStencilTexture = new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
                });
            } else {
                this._depthStencilRenderbuffer = new Renderbuffer({
                    context : context,
                    width : width,
                    height : height,
                    format : RenderbufferFormat.DEPTH_STENCIL
                });
            }
        }

        var previousFramebufferChanged = this.previousFramebuffer !== this._previousFramebuffer;

        if (!defined(this._fbo) || textureChanged || previousFramebufferChanged) {
            this._fbo = this._fbo && this._fbo.destroy();

            this._previousFramebuffer = this.previousFramebuffer;

            var depthStencilTexture;
            var depthStencilRenderbuffer;
            if (defined(this._previousFramebuffer)) {
                depthStencilTexture = this._previousFramebuffer.depthStencilTexture;
                depthStencilRenderbuffer = this._previousFramebuffer.depthStencilRenderbuffer;
            } else {
                depthStencilTexture = this._depthStencilTexture;
                depthStencilRenderbuffer = this._depthStencilRenderbuffer;
            }

            this._fbo = new Framebuffer({
                context : context,
                colorTextures : [this._texture],
                depthStencilTexture : depthStencilTexture,
                depthStencilRenderbuffer : depthStencilRenderbuffer,
                destroyAttachments : false
            });
        }

        if (!defined(this._rsUnclassified)) {
            this._rsUnclassified = RenderState.fromCache(rsUnclassified);
            this._rsClassified = RenderState.fromCache(rsClassified);
        }

        if (!defined(this._unclassifiedCommand)) {
            this._unclassifiedCommand = context.createViewportQuadCommand(unclassifiedFS, {
                renderState : this._rsUnclassified,
                uniformMap : this._uniformMap,
                owner : this
            });
            this._classifiedCommand = context.createViewportQuadCommand(classifiedFS, {
                renderState : this._rsClassified,
                uniformMap : this._uniformMap,
                owner : this
            });
        }
    };

    InvertClassification.prototype.clear = function(context, passState) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fbo;
        this._clearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    InvertClassification.prototype.executeUnclassified = function(context, passState) {
        this._unclassifiedCommand.execute(context, passState);
    };

    InvertClassification.prototype.executeClassified = function(context, passState) {
        this._classifiedCommand.execute(context, passState);
    };

    InvertClassification.prototype.isDestroyed = function() {
        return false;
    };

    InvertClassification.prototype.destroy = function() {
        this._fbo = this._fbo && this._fbo.destroy();
        this._texture = this._texture && this._texture.destroy();
        this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
        this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

        if (defined(this._unclassifiedCommand)) {
            this._unclassifiedCommand.shaderProgram = this._unclassifiedCommand.shaderProgram && this._unclassifiedCommand.shaderProgram.destroy();
            this._classifiedCommand.shaderProgram = this._classifiedCommand.shaderProgram && this._classifiedCommand.shaderProgram.destroy();
        }

        return destroyObject(this);
    };

    return InvertClassification;
});
