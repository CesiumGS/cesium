/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Texture',
        '../Shaders/PostProcessFilters/PassThrough'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        RenderState,
        Texture,
        PassThrough) {
    'use strict';

    /**
     * @private
     */
    function PickDepth() {
        this.framebuffer = undefined;

        this._depthTexture = undefined;
        this._textureToCopy = undefined;
        this._copyDepthCommand = undefined;

        this._debugPickDepthViewportCommand = undefined;
    }

    function executeDebugPickDepth(pickDepth, context, passState) {
        if (!defined(pickDepth._debugPickDepthViewportCommand)) {
            var fs =
                'uniform sampler2D u_texture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    float z_window = czm_unpackDepth(texture2D(u_texture, v_textureCoordinates));\n' +
                '    float n_range = czm_depthRange.near;\n' +
                '    float f_range = czm_depthRange.far;\n' +
                '    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n' +
                '    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);\n' +
                '    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);\n' +
                '}\n';

            pickDepth._debugPickDepthViewportCommand = context.createViewportQuadCommand(fs, {
                uniformMap : {
                    u_texture : function() {
                        return pickDepth._depthTexture;
                    }
                },
                owner : pickDepth
            });
        }

        pickDepth._debugPickDepthViewportCommand.execute(context, passState);
    }

    function destroyTextures(pickDepth) {
        pickDepth._depthTexture = pickDepth._depthTexture && !pickDepth._depthTexture.isDestroyed() && pickDepth._depthTexture.destroy();
    }

    function destroyFramebuffers(pickDepth) {
        pickDepth.framebuffer = pickDepth.framebuffer && !pickDepth.framebuffer.isDestroyed() && pickDepth.framebuffer.destroy();
    }

    function createTextures(pickDepth, context, width, height) {
        pickDepth._depthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });
    }

    function createFramebuffers(pickDepth, context, width, height) {
        destroyTextures(pickDepth);
        destroyFramebuffers(pickDepth);

        createTextures(pickDepth, context, width, height);

        pickDepth.framebuffer = new Framebuffer({
            context : context,
            colorTextures : [pickDepth._depthTexture],
            destroyAttachments : false
        });
    }

    function updateFramebuffers(pickDepth, context, depthTexture) {
        var width = depthTexture.width;
        var height = depthTexture.height;

        var texture = pickDepth._depthTexture;
        var textureChanged = !defined(texture) || texture.width !== width || texture.height !== height;
        if (!defined(pickDepth.framebuffer) || textureChanged) {
            createFramebuffers(pickDepth, context, width, height);
        }
    }

    function updateCopyCommands(pickDepth, context, depthTexture) {
        if (!defined(pickDepth._copyDepthCommand)) {
            var fs =
                'uniform sampler2D u_texture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    gl_FragColor = czm_packDepth(texture2D(u_texture, v_textureCoordinates).r);\n' +
                '}\n';
            pickDepth._copyDepthCommand = context.createViewportQuadCommand(fs, {
                renderState : RenderState.fromCache(),
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

    PickDepth.prototype.executeDebugPickDepth = function(context, passState) {
        executeDebugPickDepth(this, context, passState);
    };

    PickDepth.prototype.update = function(context, depthTexture) {
        updateFramebuffers(this, context, depthTexture);
        updateCopyCommands(this, context, depthTexture);
    };

    PickDepth.prototype.executeCopyDepth = function(context, passState) {
        this._copyDepthCommand.execute(context, passState);
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
