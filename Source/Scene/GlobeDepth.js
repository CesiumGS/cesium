import BoundingRectangle from '../Core/BoundingRectangle.js';
import Color from '../Core/Color.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import PixelFormat from '../Core/PixelFormat.js';
import ClearCommand from '../Renderer/ClearCommand.js';
import Framebuffer from '../Renderer/Framebuffer.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import RenderState from '../Renderer/RenderState.js';
import Sampler from '../Renderer/Sampler.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import Texture from '../Renderer/Texture.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import PassThrough from '../Shaders/PostProcessStages/PassThrough.js';
import PassThroughDepth from '../Shaders/PostProcessStages/PassThroughDepth.js';
import BlendingState from './BlendingState.js';
import StencilConstants from './StencilConstants.js';
import StencilFunction from './StencilFunction.js';
import StencilOperation from './StencilOperation.js';

    /**
     * @private
     */
    function GlobeDepth() {
        this._globeColorTexture = undefined;
        this._primitiveColorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._globeDepthTexture = undefined;
        this._tempGlobeDepthTexture = undefined;
        this._tempCopyDepthTexture = undefined;

        this._globeColorFramebuffer = undefined;
        this._primitiveColorFramebuffer = undefined;
        this._copyDepthFramebuffer = undefined;
        this._tempCopyDepthFramebuffer = undefined;
        this._updateDepthFramebuffer = undefined;

        this._clearGlobeColorCommand = undefined;
        this._clearPrimitiveColorCommand = undefined;
        this._copyColorCommand = undefined;
        this._copyDepthCommand = undefined;
        this._tempCopyDepthCommand = undefined;
        this._updateDepthCommand = undefined;
        this._mergeColorCommand = undefined;

        this._viewport = new BoundingRectangle();
        this._rs = undefined;
        this._rsBlend = undefined;
        this._rsUpdate = undefined;

        this._useScissorTest = false;
        this._scissorRectangle = undefined;

        this._useLogDepth = undefined;
        this._useHdr = undefined;
        this._clearGlobeDepth = undefined;

        this._debugGlobeDepthViewportCommand = undefined;
    }

    defineProperties(GlobeDepth.prototype, {
        framebuffer : {
            get : function() {
                return this._globeColorFramebuffer;
            }
        },
        primitiveFramebuffer : {
            get : function() {
                return this._primitiveColorFramebuffer;
            }
        }
    });

    function executeDebugGlobeDepth(globeDepth, context, passState, useLogDepth) {
        if (!defined(globeDepth._debugGlobeDepthViewportCommand) || useLogDepth !== globeDepth._useLogDepth) {
            var fsSource =
                'uniform sampler2D u_depthTexture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    float z_window = czm_unpackDepth(texture2D(u_depthTexture, v_textureCoordinates));\n' +
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

            globeDepth._debugGlobeDepthViewportCommand = context.createViewportQuadCommand(fs, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._globeDepthTexture;
                    }
                },
                owner : globeDepth
            });

            globeDepth._useLogDepth = useLogDepth;
        }

        globeDepth._debugGlobeDepthViewportCommand.execute(context, passState);
    }

    function destroyTextures(globeDepth) {
        globeDepth._globeColorTexture = globeDepth._globeColorTexture && !globeDepth._globeColorTexture.isDestroyed() && globeDepth._globeColorTexture.destroy();
        globeDepth._depthStencilTexture = globeDepth._depthStencilTexture && !globeDepth._depthStencilTexture.isDestroyed() && globeDepth._depthStencilTexture.destroy();
        globeDepth._globeDepthTexture = globeDepth._globeDepthTexture && !globeDepth._globeDepthTexture.isDestroyed() && globeDepth._globeDepthTexture.destroy();
    }

    function destroyFramebuffers(globeDepth) {
        globeDepth._globeColorFramebuffer = globeDepth._globeColorFramebuffer && !globeDepth._globeColorFramebuffer.isDestroyed() && globeDepth._globeColorFramebuffer.destroy();
        globeDepth._copyDepthFramebuffer = globeDepth._copyDepthFramebuffer && !globeDepth._copyDepthFramebuffer.isDestroyed() && globeDepth._copyDepthFramebuffer.destroy();
    }

    function destroyUpdateDepthResources(globeDepth) {
        globeDepth._tempCopyDepthFramebuffer = globeDepth._tempCopyDepthFramebuffer && !globeDepth._tempCopyDepthFramebuffer.isDestroyed() && globeDepth._tempCopyDepthFramebuffer.destroy();
        globeDepth._updateDepthFramebuffer = globeDepth._updateDepthFramebuffer && !globeDepth._updateDepthFramebuffer.isDestroyed() && globeDepth._updateDepthFramebuffer.destroy();
        globeDepth._tempGlobeDepthTexture = globeDepth._tempGlobeDepthTexture && !globeDepth._tempGlobeDepthTexture.isDestroyed() && globeDepth._tempGlobeDepthTexture.destroy();
    }

    function createUpdateDepthResources(globeDepth, context, width, height, passState) {
        globeDepth._tempGlobeDepthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
        globeDepth._tempCopyDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._tempGlobeDepthTexture],
            destroyAttachments : false
        });
        globeDepth._updateDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._globeDepthTexture],
            depthStencilTexture : passState.framebuffer.depthStencilTexture,
            destroyAttachments : false
        });
    }

    function createTextures(globeDepth, context, width, height, hdr) {
        var pixelDatatype = hdr ? (context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT) : PixelDatatype.UNSIGNED_BYTE;
        globeDepth._globeColorTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : pixelDatatype,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });

        globeDepth._depthStencilTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
        });

        globeDepth._globeDepthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
    }

    function createFramebuffers(globeDepth, context) {
        globeDepth._globeColorFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._globeColorTexture],
            depthStencilTexture : globeDepth._depthStencilTexture,
            destroyAttachments : false
        });

        globeDepth._copyDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._globeDepthTexture],
            destroyAttachments : false
        });
    }

    function createPrimitiveFramebuffer(globeDepth, context, width, height, hdr) {
        var pixelDatatype = hdr ? (context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT) : PixelDatatype.UNSIGNED_BYTE;
        globeDepth._primitiveColorTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : pixelDatatype,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });

        globeDepth._primitiveColorFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._primitiveColorTexture],
            depthStencilTexture : globeDepth._depthStencilTexture,
            destroyAttachments : false
        });
    }

    function destroyPrimitiveFramebuffer(globeDepth) {
        globeDepth._primitiveColorTexture = globeDepth._primitiveColorTexture && !globeDepth._primitiveColorTexture.isDestroyed() && globeDepth._primitiveColorTexture.destroy();
        globeDepth._primitiveColorFramebuffer = globeDepth._primitiveColorFramebuffer && !globeDepth._primitiveColorFramebuffer.isDestroyed() && globeDepth._primitiveColorFramebuffer.destroy();
    }

    function updateFramebuffers(globeDepth, context, width, height, hdr, clearGlobeDepth) {
        var colorTexture = globeDepth._globeColorTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height || hdr !== globeDepth._useHdr;
        if (textureChanged) {
            destroyTextures(globeDepth);
            destroyFramebuffers(globeDepth);
            createTextures(globeDepth, context, width, height, hdr, clearGlobeDepth);
            createFramebuffers(globeDepth, context, clearGlobeDepth);
        }

        if (textureChanged || clearGlobeDepth !== globeDepth._clearGlobeDepth) {
            destroyPrimitiveFramebuffer(globeDepth);
            if (clearGlobeDepth) {
                createPrimitiveFramebuffer(globeDepth, context, width, height, hdr);
            }
        }
    }

    function updateCopyCommands(globeDepth, context, width, height, passState) {
        globeDepth._viewport.width = width;
        globeDepth._viewport.height = height;

        var useScissorTest = !BoundingRectangle.equals(globeDepth._viewport, passState.viewport);
        var updateScissor = useScissorTest !== globeDepth._useScissorTest;
        globeDepth._useScissorTest = useScissorTest;

        if (!BoundingRectangle.equals(globeDepth._scissorRectangle, passState.viewport)) {
            globeDepth._scissorRectangle = BoundingRectangle.clone(passState.viewport, globeDepth._scissorRectangle);
            updateScissor = true;
        }

        if (!defined(globeDepth._rs) || !BoundingRectangle.equals(globeDepth._viewport, globeDepth._rs.viewport) || updateScissor) {
            globeDepth._rs = RenderState.fromCache({
                viewport : globeDepth._viewport,
                scissorTest : {
                    enabled : globeDepth._useScissorTest,
                    rectangle : globeDepth._scissorRectangle
                }
            });
            globeDepth._rsBlend = RenderState.fromCache({
                viewport : globeDepth._viewport,
                scissorTest : {
                    enabled : globeDepth._useScissorTest,
                    rectangle : globeDepth._scissorRectangle
                },
                blending: BlendingState.ALPHA_BLEND
            });

            // Copy packed depth only if the 3D Tiles bit is set
            globeDepth._rsUpdate = RenderState.fromCache({
                viewport : globeDepth._viewport,
                scissorTest : {
                    enabled : globeDepth._useScissorTest,
                    rectangle : globeDepth._scissorRectangle
                },
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.EQUAL,
                    frontOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.KEEP
                    },
                    backFunction : StencilFunction.NEVER,
                    reference : StencilConstants.CESIUM_3D_TILE_MASK,
                    mask : StencilConstants.CESIUM_3D_TILE_MASK
                }
            });
        }

        if (!defined(globeDepth._copyDepthCommand)) {
            globeDepth._copyDepthCommand = context.createViewportQuadCommand(PassThroughDepth, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._depthStencilTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._copyDepthCommand.framebuffer = globeDepth._copyDepthFramebuffer;
        globeDepth._copyDepthCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._copyColorCommand)) {
            globeDepth._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._globeColorTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._copyColorCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._tempCopyDepthCommand)) {
            globeDepth._tempCopyDepthCommand = context.createViewportQuadCommand(PassThroughDepth, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._tempCopyDepthTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._tempCopyDepthCommand.framebuffer = globeDepth._tempCopyDepthFramebuffer;
        globeDepth._tempCopyDepthCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._updateDepthCommand)) {
            globeDepth._updateDepthCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._tempGlobeDepthTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._updateDepthCommand.framebuffer = globeDepth._updateDepthFramebuffer;
        globeDepth._updateDepthCommand.renderState = globeDepth._rsUpdate;

        if (!defined(globeDepth._clearGlobeColorCommand)) {
            globeDepth._clearGlobeColorCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                stencil : 0.0,
                owner : globeDepth
            });
        }

        globeDepth._clearGlobeColorCommand.framebuffer = globeDepth._globeColorFramebuffer;

        if (!defined(globeDepth._clearPrimitiveColorCommand)) {
            globeDepth._clearPrimitiveColorCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                stencil : 0.0,
                owner : globeDepth
            });
        }

        globeDepth._clearPrimitiveColorCommand.framebuffer = globeDepth._primitiveColorFramebuffer;

        if (!defined(globeDepth._mergeColorCommand)) {
            globeDepth._mergeColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._primitiveColorTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._mergeColorCommand.framebuffer = globeDepth._globeColorFramebuffer;
        globeDepth._mergeColorCommand.renderState = globeDepth._rsBlend;
    }

    GlobeDepth.prototype.executeDebugGlobeDepth = function(context, passState, useLogDepth) {
        executeDebugGlobeDepth(this, context, passState, useLogDepth);
    };

    GlobeDepth.prototype.update = function(context, passState, viewport, hdr, clearGlobeDepth) {
        var width = viewport.width;
        var height = viewport.height;

        updateFramebuffers(this, context, width, height, hdr, clearGlobeDepth);
        updateCopyCommands(this, context, width, height, passState);
        context.uniformState.globeDepthTexture = undefined;

        this._useHdr = hdr;
        this._clearGlobeDepth = clearGlobeDepth;
    };

    GlobeDepth.prototype.executeCopyDepth = function(context, passState) {
        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
            context.uniformState.globeDepthTexture = this._globeDepthTexture;
        }
    };

    GlobeDepth.prototype.executeUpdateDepth = function(context, passState, clearGlobeDepth) {
        var depthTextureToCopy = passState.framebuffer.depthStencilTexture;
        if (clearGlobeDepth || (depthTextureToCopy !== this._depthStencilTexture)) {
            // First copy the depth to a temporary globe depth texture, then update the
            // main globe depth texture where the stencil bit for 3D Tiles is set.
            // This preserves the original globe depth except where 3D Tiles is rendered.
            // The additional texture and framebuffer resources are created on demand.
            if (defined(this._updateDepthCommand)) {
                if (!defined(this._updateDepthFramebuffer) ||
                    (this._updateDepthFramebuffer.depthStencilTexture !== depthTextureToCopy) ||
                    (this._updateDepthFramebuffer.getColorTexture(0) !== this._globeDepthTexture)) {
                    var width = this._globeDepthTexture.width;
                    var height = this._globeDepthTexture.height;
                    destroyUpdateDepthResources(this);
                    createUpdateDepthResources(this, context, width, height, passState);
                    updateCopyCommands(this, context, width, height, passState);
                }
                this._tempCopyDepthTexture = depthTextureToCopy;
                this._tempCopyDepthCommand.execute(context, passState);
                this._updateDepthCommand.execute(context, passState);
            }
            return;
        }

        // Fast path - the depth texture can be copied normally.
        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.executeCopyColor = function(context, passState) {
        if (defined(this._copyColorCommand)) {
            this._copyColorCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.executeMergeColor = function(context, passState) {
        if (defined(this._mergeColorCommand)) {
            this._mergeColorCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.clear = function(context, passState, clearColor) {
        var clear = this._clearGlobeColorCommand;
        if (defined(clear)) {
            Color.clone(clearColor, clear.color);
            clear.execute(context, passState);
        }
        clear = this._clearPrimitiveColorCommand;
        if (defined(clear) && defined(this._primitiveColorFramebuffer)) {
            clear.execute(context, passState);
        }
    };

    GlobeDepth.prototype.isDestroyed = function() {
        return false;
    };

    GlobeDepth.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);
        destroyPrimitiveFramebuffer(this);
        destroyUpdateDepthResources(this);

        if (defined(this._copyColorCommand)) {
            this._copyColorCommand.shaderProgram = this._copyColorCommand.shaderProgram.destroy();
        }

        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.shaderProgram = this._copyDepthCommand.shaderProgram.destroy();
        }

        if (defined(this._tempCopyDepthCommand)) {
            this._tempCopyDepthCommand.shaderProgram = this._tempCopyDepthCommand.shaderProgram.destroy();
        }

        if (defined(this._updateDepthCommand)) {
            this._updateDepthCommand.shaderProgram = this._updateDepthCommand.shaderProgram.destroy();
        }

        if (defined(this._mergeColorCommand)) {
            this._mergeColorCommand.shaderProgram = this._mergeColorCommand.shaderProgram.destroy();
        }

        if (defined(this._debugGlobeDepthViewportCommand)) {
            this._debugGlobeDepthViewportCommand.shaderProgram = this._debugGlobeDepthViewportCommand.shaderProgram.destroy();
        }

        return destroyObject(this);
    };
export default GlobeDepth;
