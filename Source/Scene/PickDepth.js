/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Shaders/PostProcessFilters/PassThrough'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        PixelDatatype,
        PassThrough) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var PickDepth = function(context) {
        this.framebuffer = undefined;

        this._depthTexture = undefined;
        this._texturetoCopy = undefined;
        this._copyDepthCommand = undefined;

        var supported = updateFramebuffers(this, context);
        if (supported) {
            updateCopyCommands(this, context);
        }

        this._supported = supported;
    };

    defineProperties(PickDepth.prototype, {
        supported : {
            get : function() {
                return this._supported;
            }
        }
    });

    function destroyTextures(pickDepth) {
        pickDepth._depthTexture = pickDepth._depthTexture && !pickDepth._depthTexture.isDestroyed() && pickDepth._depthTexture.destroy();
    }

    function destroyFramebuffers(pickDepth) {
        pickDepth.framebuffer = pickDepth.framebuffer && !pickDepth.framebuffer.isDestroyed() && pickDepth.framebuffer.destroy();
    }

    function createTextures(pickDepth, context, width, height) {
        pickDepth._depthTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
    }

    function createFramebuffers(pickDepth, context, width, height) {
        destroyTextures(pickDepth);
        destroyFramebuffers(pickDepth);

        createTextures(pickDepth, context, width, height);

        pickDepth.framebuffer = context.createFramebuffer({
            colorTextures : [pickDepth._depthTexture],
            destroyAttachments : false
        });

        if (pickDepth.framebuffer.status !== WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
            destroyTextures(pickDepth);
            destroyFramebuffers(pickDepth);
            return false;
        }

        return true;
    }

    function updateFramebuffers(pickDepth, context, depthTexture) {
        if (!context.depthTexture) {
            return;
        }

        var width;
        var height;

        if (defined(depthTexture)) {
            width = depthTexture.width;
            height = depthTexture.height;
        } else {
            width = context.drawingBufferWidth;
            height = context.drawingBufferHeight;
        }

        var texture = pickDepth._depthTexture;
        var textureChanged = !defined(texture) || texture.width !== width || texture.height !== height;
        if (!defined(pickDepth.framebuffer) || textureChanged) {
            if (!createFramebuffers(pickDepth, context, width, height)) {
                // framebuffer creation failed
                return false;
            }
        }

        return true;
    }

    function updateCopyCommands(pickDepth, context, depthTexture) {
        if (!defined(pickDepth._copyDepthCommand)) {
            pickDepth._copyDepthCommand = context.createViewportQuadCommand(PassThrough, {
                renderState : context.createRenderState(),
                uniformMap : {
                    u_texture : function() {
                        return pickDepth._textureToCopy;
                    }
                },
                owner : pickDepth
            });
        }

        pickDepth._textureToCopy = depthTexture;
        pickDepth._copyDepthCommand.framebuffer = pickDepth.framebuffer;
    }

    PickDepth.prototype.update = function(context, depthTexture) {
        if (!this.supported) {
            return;
        }

        updateFramebuffers(this, context, depthTexture);
        updateCopyCommands(this, context, depthTexture);
    };

    PickDepth.prototype.executeCopyDepth = function(context, passState) {
        if (this.supported && defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
        }
    };

    PickDepth.prototype.isDestroyed = function() {
        return false;
    };

    PickDepth.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);

        this._copyDepthCommand.shaderProgram = defined(this._copyDepthCommand.shaderProgram) && this._copyDepthCommand.shaderProgram.destroy();

        return destroyObject(this);
    };

    return PickDepth;
});