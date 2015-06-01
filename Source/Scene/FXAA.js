/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderbufferFormat',
        '../Shaders/PostProcessFilters/FXAA'
    ], function(
        Cartesian2,
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        PixelDatatype,
        RenderbufferFormat,
        FXAAFS) {
    "use strict";

    /**
     * @private
     */
    var FXAA = function() {
        this._texture = undefined;
        this._fbo = undefined;
        this._command = undefined;
        this._clearCommand = undefined;

        this._step = new Cartesian2();
    };

    function createResources(fxaa, context, width, height) {
        fxaa._fbo = fxaa._fbo && fxaa._fbo.destroy();

        var texture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });

        var depthTexture;
        var depthRenderbuffer;

        if (context.depthTexture) {
            depthTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        } else {
            depthRenderbuffer = context.createRenderbuffer({
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_COMPONENT16
            });
        }

        fxaa._fbo = context.createFramebuffer({
            colorTextures : [texture],
            depthTexture : depthTexture,
            depthRenderbuffer : depthRenderbuffer
        });
    }

    FXAA.prototype.update = function(context, texture) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        if (!defined(this._fbo)) {
            createResources(this, context, width, height);
        }

        if (!defined(texture)) {
            var fboTexture = this._fbo.getColorTexture(0);
            var texWidth = fboTexture.width;
            var texHeight = fboTexture.height;

            if (texWidth !== width || texHeight !== height) {
                createResources(this, context, width, height);
            }

            this._texture = fboTexture;
        } else {
            this._texture = texture;
        }

        this._step.x = 1.0 / this._texture.width;
        this._step.y = 1.0 / this._texture.height;

        if (!defined(this._clearCommand)) {
            this._clearCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                depth : 1.0,
                owner : this
            });
        }

        if (!defined(this._command)) {
            var that = this;
            this._command = context.createViewportQuadCommand(FXAAFS, {
                renderState : context.createRenderState(),
                uniformMap : {
                    u_texture : function() {
                        return that._texture;
                    },
                    u_step : function() {
                        return that._step;
                    }
                },
                owner : this
            });
        }
    };

    FXAA.prototype.execute = function(context, passState) {
        this._command.execute(context, passState);
    };

    FXAA.prototype.clear = function(context, passState, clearColor) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fbo;
        Color.clone(clearColor, this._clearCommand.color);
        this._clearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    FXAA.prototype.getColorFramebuffer = function() {
        return this._fbo;
    };

    FXAA.prototype.isDestroyed = function() {
        return false;
    };

    FXAA.prototype.destroy = function() {
        this._fbo = this._fbo && this._fbo.destroy();

        if (defined(this._command)) {
            this._command.shaderProgram = this._command.shaderProgram && this._command.shaderProgram.destroy();
        }

        return destroyObject(this);
    };

    return FXAA;
});
