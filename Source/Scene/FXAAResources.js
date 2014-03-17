/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Color',
        '../Renderer/createShaderSource',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Shaders/PostProcessFilters/FXAA'
    ], function(
        defined,
        destroyObject,
        Cartesian2,
        Color,
        createShaderSource,
        ClearCommand,
        PixelDatatype,
        PixelFormat,
        FXAAFS) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var FXAAResources = function(context) {
        this.enable = false;

        this._fxaaTexture = undefined;
        this._fxaaFBO = undefined;
        this._fxaaCommand = undefined;

        var fxaaClearCommand = new ClearCommand();
        fxaaClearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
        fxaaClearCommand.owner = this;
        this._fxaaClearCommand = fxaaClearCommand;
    };

    function destroyResources(that) {
        that._fxaaFBO = that._fxaaFBO && that._fxaaFBO.destroy();
        that._fxaaTexture = that._fxaaTexture && that._fxaaTexture.destroy();

        that._fxaaFBO = undefined;
        that._fxaaTexture = undefined;
    }

    FXAAResources.prototype.update = function(context) {
        if (!this.enabled) {
            if (defined(this._fxaaTexture)) {
                destroyResources(this);
            }

            return;
        }

        var width = context.getDrawingBufferWidth();
        var height = context.getDrawingBufferHeight();

        var fxaaTexture = this._fxaaTexture;
        var textureChanged = !defined(fxaaTexture) || fxaaTexture.getWidth() !== width || fxaaTexture.getHeight() !== height;
        if (textureChanged) {
            this._fxaaTexture = this._fxaaTexture && this._fxaaTexture.destroy();

            this._fxaaTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGB,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
        }

        if (!defined(this._fxaaFBO) || textureChanged) {
            this._fxaaFBO = this._fxaaFBO && this._fxaaFBO.destroy();

            this._fxaaFBO = context.createFramebuffer({
                colorTextures : [this._fxaaTexture],
                destroyAttachments : false
            });
        }

        if (!defined(this._fxaaCommand)) {
            var fs = createShaderSource({
                sources : [FXAAFS]
            });

            this._fxaaCommand = context.createViewportQuadCommand(fs, context.createRenderState());
        }

        var that = this;
        var step = new Cartesian2(1.0 / this._fxaaTexture.getWidth(), 1.0 / this._fxaaTexture.getHeight());
        this._fxaaCommand.uniformMap = {
            u_texture : function() {
                return that._fxaaTexture;
            },
            u_step : function() {
                return step;
            }
        };
    };

    FXAAResources.prototype.clear = function(context, passState, clearColor) {
        if(!this.enabled) {
            return;
        }

        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fxaaFBO;
        Color.clone(clearColor, this._fxaaClearCommand.color);
        this._fxaaClearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    FXAAResources.prototype.isDestroyed = function() {
        return false;
    };

    FXAAResources.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return FXAAResources;
});
