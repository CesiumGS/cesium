define([
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/ShaderSource',
        '../Renderer/Texture'
    ], function(
        Cartesian4,
        defined,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        RenderState,
        ShaderSource,
        Texture) {
    'use strict';

    /**
     * @private
     */
    function PickDepth() {
        this._framebuffer = undefined;

        this._depthTexture = undefined;
        this._textureToCopy = undefined;
        this._colorTextureMask = undefined;
        this._copyDepthCommand = undefined;
        this._copyDepthCommandRender = undefined;
        this._copyDepthCommandPick = undefined;

        this._useLogDepth = undefined;

        this._debugPickDepthViewportCommand = undefined;
    }

    function executeDebugPickDepth(pickDepth, context, passState, useLogDepth) {
        if (!defined(pickDepth._debugPickDepthViewportCommand) || useLogDepth !== pickDepth._useLogDepth) {
            var fsSource =
                'uniform sampler2D u_texture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    float z_window = czm_unpackDepth(texture2D(u_texture, v_textureCoordinates));\n' +
                '    z_window = czm_reverseLogDepth(z_window); \n' +
                '    float n_range = czm_depthRange.near;\n' +
                '    float f_range = czm_depthRange.far;\n' +
                '    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n' +
                '    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);\n' +
                '    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);\n' +
                '}\n';
            var fs = new ShaderSource({
                defines : [useLogDepth ? 'LOG_DEPTH' : ''],
                sources : [fsSource]
            });

            pickDepth._debugPickDepthViewportCommand = context.createViewportQuadCommand(fs, {
                uniformMap : {
                    u_texture : function() {
                        return pickDepth._depthTexture;
                    }
                },
                owner : pickDepth
            });

            pickDepth._useLogDepth = useLogDepth;
        }

        pickDepth._debugPickDepthViewportCommand.execute(context, passState);
    }

    function destroyTextures(pickDepth) {
        pickDepth._depthTexture = pickDepth._depthTexture && !pickDepth._depthTexture.isDestroyed() && pickDepth._depthTexture.destroy();
    }

    function destroyFramebuffers(pickDepth) {
        pickDepth._framebuffer = pickDepth._framebuffer && !pickDepth._framebuffer.isDestroyed() && pickDepth._framebuffer.destroy();
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

        pickDepth._framebuffer = new Framebuffer({
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
        if (!defined(pickDepth._framebuffer) || textureChanged) {
            createFramebuffers(pickDepth, context, width, height);
        }
    }

    function updateCopyCommands(pickDepth, context, depthTexture, colorTextureMask) {
        var fs;
        if (!defined(pickDepth._copyDepthCommand)) {
            // Passthrough depth copy
            fs =
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

        if (!defined(pickDepth._copyDepthCommandRender)) {
            // If alpha is less than one, use globe depth instead of scene depth. Globe depth will overwrite areas where
            // there is translucent geometry or no geometry (like the depth plane).
            fs =
                'uniform sampler2D u_texture;\n' +
                'uniform sampler2D u_colorTextureMask;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    vec4 pickDepth = czm_packDepth(texture2D(u_texture, v_textureCoordinates).r);\n' +
                '    vec4 globeDepth = texture2D(czm_globeDepthTexture, v_textureCoordinates);\n' +
                '    bool mask = texture2D(u_colorTextureMask, v_textureCoordinates).a < 1.0;\n' +
                '    gl_FragColor = czm_branchFreeTernary(mask, globeDepth, pickDepth);\n' +
                '}\n';
            pickDepth._copyDepthCommandRender = context.createViewportQuadCommand(fs, {
                renderState : RenderState.fromCache(),
                uniformMap : {
                    u_texture : function() {
                        return pickDepth._textureToCopy;
                    },
                    u_colorTextureMask : function() {
                        return pickDepth._colorTextureMask;
                    }
                },
                owner : pickDepth
            });
        }

        if (!defined(pickDepth._copyDepthCommandPick)) {
            // If color is (0,0,0,0), use globe depth instead of scene depth. Globe depth will overwrite areas where
            // there is no geometry (like the depth plane).
            fs =
                'uniform sampler2D u_texture;\n' +
                'uniform sampler2D u_colorTextureMask;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    vec4 pickDepth = czm_packDepth(texture2D(u_texture, v_textureCoordinates).r);\n' +
                '    vec4 globeDepth = texture2D(czm_globeDepthTexture, v_textureCoordinates);\n' +
                '    bool mask = all(equal(texture2D(u_colorTextureMask, v_textureCoordinates), vec4(0.0)));\n' +
                '    gl_FragColor = czm_branchFreeTernary(mask, globeDepth, pickDepth);\n' +
                '}\n';
            pickDepth._copyDepthCommandPick = context.createViewportQuadCommand(fs, {
                renderState : RenderState.fromCache(),
                uniformMap : {
                    u_texture : function() {
                        return pickDepth._textureToCopy;
                    },
                    u_colorTextureMask : function() {
                        return pickDepth._colorTextureMask;
                    }
                },
                owner : pickDepth
            });
        }

        pickDepth._textureToCopy = depthTexture;
        pickDepth._colorTextureMask = colorTextureMask;
        pickDepth._copyDepthCommand.framebuffer = pickDepth._framebuffer;
        pickDepth._copyDepthCommandRender.framebuffer = pickDepth._framebuffer;
        pickDepth._copyDepthCommandPick.framebuffer = pickDepth._framebuffer;
    }

    PickDepth.prototype.executeDebugPickDepth = function(context, passState, useLogDepth) {
        executeDebugPickDepth(this, context, passState, useLogDepth);
    };

    PickDepth.prototype.update = function(context, depthTexture, colorTextureMask) {
        updateFramebuffers(this, context, depthTexture);
        updateCopyCommands(this, context, depthTexture, colorTextureMask);
    };

    var scratchPackedDepth = new Cartesian4();
    var packedDepthScale = new Cartesian4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0);

    PickDepth.prototype.getDepth = function(context, x, y) {
        var pixels = context.readPixels({
            x : x,
            y : y,
            width : 1,
            height : 1,
            framebuffer : this._framebuffer
        });

        var packedDepth = Cartesian4.unpack(pixels, 0, scratchPackedDepth);
        Cartesian4.divideByScalar(packedDepth, 255.0, packedDepth);
        return Cartesian4.dot(packedDepth, packedDepthScale);
    };

    PickDepth.prototype.executeCopyDepth = function(context, passState, copyGlobeDepth, picking) {
        if (!copyGlobeDepth) {
            this._copyDepthCommand.execute(context, passState);
        } else if (picking) {
            this._copyDepthCommandPick.execute(context, passState);
        } else {
            this._copyDepthCommandRender.execute(context, passState);
        }
    };

    PickDepth.prototype.isDestroyed = function() {
        return false;
    };

    PickDepth.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);

        this._copyDepthCommand.shaderProgram = defined(this._copyDepthCommand.shaderProgram) && this._copyDepthCommand.shaderProgram.destroy();
        this._copyDepthCommandRender.shaderProgram = defined(this._copyDepthCommandRender.shaderProgram) && this._copyDepthCommandRender.shaderProgram.destroy();
        this._copyDepthCommandPick.shaderProgram = defined(this._copyDepthCommandPick.shaderProgram) && this._copyDepthCommandPick.shaderProgram.destroy();

        return destroyObject(this);
    };

    return PickDepth;
});
