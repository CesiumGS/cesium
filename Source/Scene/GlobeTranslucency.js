import BoundingRectangle from '../Core/BoundingRectangle.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import Texture from '../Renderer/Texture.js';
import PixelFormat from '../Core/PixelFormat.js';
import Sampler from '../Renderer/Sampler.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import defaultValue from '../Core/defaultValue.js';
import destroyObject from '../Core/destroyObject.js';
import defined from '../Core/defined.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Framebuffer from '../Renderer/Framebuffer.js';
import RenderState from '../Renderer/RenderState.js';
import BlendingState from './BlendingState.js';
import PassThrough from '../Shaders/PostProcessStages/PassThrough.js';
import ClearCommand from '../Renderer/ClearCommand.js';
import Color from '../Core/Color.js';
import CullFace from './CullFace.js';

    /**
     * @private
     */
    function GlobeTranslucency() {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._framebuffer = undefined;

        this._manualDepthTestTexture = undefined;
        this._manualDepthTestFramebuffer = undefined;

        this._manualDepthTestRenderState = undefined;
        this._blendRenderState = undefined;

        this._manualDepthTestCommand = undefined;
        this._blendCommand = undefined;
        this._clearCommand = undefined;

        this._viewport = new BoundingRectangle();
        this._useScissorTest = false;
        this._scissorRectangle = undefined;
        this._useHdr = undefined;
    }

    GlobeTranslucency.isSupported = function(context) {
        return context.depthTexture;
    };

    function destroyResources(globeTranslucency) {
        globeTranslucency._colorTexture = globeTranslucency._colorTexture && !globeTranslucency._colorTexture.isDestroyed() && globeTranslucency._colorTexture.destroy();
        globeTranslucency._depthStencilTexture = globeTranslucency._depthStencilTexture && !globeTranslucency._depthStencilTexture.isDestroyed() && globeTranslucency._depthStencilTexture.destroy();
        globeTranslucency._framebuffer = globeTranslucency._framebuffer && !globeTranslucency._framebuffer.isDestroyed() && globeTranslucency._framebuffer.destroy();
        globeTranslucency._manualDepthTestFramebuffer = globeTranslucency._manualDepthTestFramebuffer && !globeTranslucency._manualDepthTestFramebuffer.isDestroyed() && globeTranslucency._manualDepthTestFramebuffer.destroy();
    }

    function createResources(globeTranslucency, context, width, height, hdr) {
        var pixelDatatype = hdr ? (context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT) : PixelDatatype.UNSIGNED_BYTE;
        globeTranslucency._colorTexture = new Texture({
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

        globeTranslucency._depthStencilTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
        });

        globeTranslucency._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeTranslucency._colorTexture],
            depthStencilTexture : globeTranslucency._depthStencilTexture,
            destroyAttachments : false
        });

        globeTranslucency._manualDepthTestFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeTranslucency._colorTexture],
            destroyAttachments : false
        });
    }

    function updateResources(globeTranslucency, context, width, height, hdr) {
        var colorTexture = globeTranslucency._colorTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height || hdr !== globeTranslucency._useHdr;
        if (textureChanged) {
            destroyResources(globeTranslucency);
            createResources(globeTranslucency, context, width, height, hdr);
        }
    }

    function updateCommands(globeTranslucency, context, width, height, passState) {
        globeTranslucency._viewport.width = width;
        globeTranslucency._viewport.height = height;

        var useScissorTest = !BoundingRectangle.equals(globeTranslucency._viewport, passState.viewport);
        var updateScissor = useScissorTest !== globeTranslucency._useScissorTest;
        globeTranslucency._useScissorTest = useScissorTest;

        if (!BoundingRectangle.equals(globeTranslucency._scissorRectangle, passState.viewport)) {
            globeTranslucency._scissorRectangle = BoundingRectangle.clone(passState.viewport, globeTranslucency._scissorRectangle);
            updateScissor = true;
        }

        if (!defined(globeTranslucency._blendRenderState) || !BoundingRectangle.equals(globeTranslucency._viewport, globeTranslucency._blendRenderState.viewport) || updateScissor) {
            globeTranslucency._manualDepthTestRenderState = RenderState.fromCache({
                viewport : globeTranslucency._viewport,
                scissorTest : {
                    enabled : globeTranslucency._useScissorTest,
                    rectangle : globeTranslucency._scissorRectangle
                }
            });
            globeTranslucency._blendRenderState = RenderState.fromCache({
                viewport : globeTranslucency._viewport,
                scissorTest : {
                    enabled : globeTranslucency._useScissorTest,
                    rectangle : globeTranslucency._scissorRectangle
                },
                blending: BlendingState.ALPHA_BLEND
            });
        }

        if (!defined(globeTranslucency._manualDepthTestCommand)) {
            var fs =
                'uniform sampler2D u_depthTextureExternal;\n' +
                'uniform sampler2D u_depthTextureInternal;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    float depthExternal = texture2D(u_depthTextureExternal, v_textureCoordinates).r;\n' +
                '    float depthInternal = texture2D(u_depthTextureInternal, v_textureCoordinates).r;\n' +
                '    if (depthInternal <= depthExternal)\n' +
                '    {\n' +
                '        discard;\n' +
                '    }\n' +
                '    gl_FragColor = vec4(0.0);' +
                '}\n';

            globeTranslucency._manualDepthTestCommand = context.createViewportQuadCommand(fs, {
                uniformMap : {
                    u_depthTextureExternal : function() {
                        return globeTranslucency._manualDepthTestTexture;
                    },
                    u_depthTextureInternal : function() {
                        return globeTranslucency._depthStencilTexture;
                    }
                },
                owner : globeTranslucency
            });
        }

        if (!defined(globeTranslucency._blendCommand)) {
            globeTranslucency._blendCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeTranslucency._colorTexture;
                    }
                },
                owner : globeTranslucency
            });
        }

        if (!defined(globeTranslucency._clearCommand)) {
            globeTranslucency._clearCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                depth : 1.0,
                stencil : 0.0,
                owner : globeTranslucency
            });
        }

        globeTranslucency._manualDepthTestCommand.framebuffer = globeTranslucency._manualDepthTestFramebuffer;
        globeTranslucency._manualDepthTestCommand.renderState = globeTranslucency._manualDepthTestRenderState;
        globeTranslucency._blendCommand.renderState = globeTranslucency._blendRenderState;
        globeTranslucency._clearCommand.framebuffer = globeTranslucency._framebuffer;
    }

    function removeDefine(defines, defineToRemove) {
        var index = defines.indexOf(defineToRemove);
        if (index > -1) {
            defines.splice(index, 1);
        }
    }

    function getBackFaceShaderProgram(context, shaderProgram) {
        // TODO : Needs to use dark fog
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'backFace');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var vs = shaderProgram.vertexShaderSource.clone();
            var fs = shaderProgram.fragmentShaderSource.clone();

            vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
            fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];

            removeDefine(vs.defines, 'GROUND_ATMOSPHERE');
            removeDefine(fs.defines, 'GROUND_ATMOSPHERE');

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'backFace', {
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    function getFrontFaceShaderProgram(context, shaderProgram) {
        // TODO : not needed for ALPHA?
        // TODO : Needs to use regular fog
        // var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'frontFace');
        // if (!defined(shader)) {
        //     var attributeLocations = shaderProgram._attributeLocations;
        //     var fs = shaderProgram.fragmentShaderSource.clone();

        //     fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
        //     fs.defines.push('ALPHA');

        //     shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'frontFace', {
        //         vertexShaderSource : shaderProgram.vertexShaderSource,
        //         fragmentShaderSource : fs,
        //         attributeLocations : attributeLocations
        //     });
        // }

        // return shader;

        return shaderProgram;
    }

    var backFaceRenderStateCache = {};
    var frontFaceRenderStateCache = {};

    function getBackFaceRenderState(renderState) {
        // TODO Move pickRenderStateCache, depthOnlyRenderStateCache, and this new cache to context
        var cache = backFaceRenderStateCache;
        var backFaceState = cache[renderState.id];
        if (!defined(backFaceState)) {
            var rs = RenderState.getState(renderState);
            rs.cull.face = CullFace.FRONT;
            rs.cull.enabled = true; // TODO: why not just disable cull in Globe?

            backFaceState = RenderState.fromCache(rs);
            cache[renderState.id] = backFaceState;
        }

        return backFaceState;
    }

    function getFrontFaceRenderState(renderState) {
        var cache = frontFaceRenderStateCache;
        var frontFaceState = cache[renderState.id];
        if (!defined(frontFaceState)) {
            var rs = RenderState.getState(renderState);
            rs.cull.face = CullFace.BACK;
            rs.cull.enabled = true;

            frontFaceState = RenderState.fromCache(rs);
            cache[renderState.id] = frontFaceState;
        }

        return frontFaceState;
    }

    GlobeTranslucency.updateDerivedCommand = function(command, context) {
        var derivedCommands = command.derivedCommands.globeTranslucency;

        if (!defined(derivedCommands) || command.dirty) {
            command.dirty = false;

            derivedCommands = defined(derivedCommands) ? derivedCommands : {};
            var backFaceCommand = derivedCommands.backFaceCommand;
            var frontFaceCommand = derivedCommands.frontFaceCommand;

            var backFaceShader;
            var backFaceRenderState;
            var frontFaceShader;
            var frontFaceRenderState;

            if (defined(backFaceCommand)) {
                backFaceShader = backFaceCommand.shaderProgram;
                backFaceRenderState = backFaceCommand.renderState;
                frontFaceShader = frontFaceCommand.shaderProgram;
                frontFaceRenderState = frontFaceCommand.renderState;
            }

            backFaceCommand = DrawCommand.shallowClone(command, backFaceCommand);
            frontFaceCommand = DrawCommand.shallowClone(command, frontFaceCommand);

            derivedCommands.backFaceCommand = backFaceCommand;
            derivedCommands.frontFaceCommand = frontFaceCommand;
            command.derivedCommands.globeTranslucency = derivedCommands;

            if (!defined(backFaceShader) || (derivedCommands.shaderProgramId !== command.shaderProgram.id)) {
                derivedCommands.shaderProgramId = command.shaderProgram.id;
                backFaceCommand.shaderProgram = getBackFaceShaderProgram(context, command.shaderProgram);
                backFaceCommand.renderState = getBackFaceRenderState(command.renderState);
                frontFaceCommand.shaderProgram = getFrontFaceShaderProgram(context, command.shaderProgram);
                frontFaceCommand.renderState = getFrontFaceRenderState(command.renderState);
            } else {
                backFaceCommand.shaderProgram = backFaceShader;
                backFaceCommand.renderState = backFaceRenderState;
                frontFaceCommand.shaderProgram = frontFaceShader;
                frontFaceCommand.renderState = frontFaceRenderState;
            }
        }
    };

    function executeManualDepthTest(globeTranslucency, context, passState) {
        globeTranslucency._manualDepthTestTexture = defaultValue(passState.framebuffer.depthStencilTexture, passState.framebuffer.depthTexture);
        globeTranslucency._manualDepthTestCommand.execute(context, passState);
    }

    function executeBackFaceCommands(commands, length, executeCommandFunction, scene, context, passState) {
        // TODO : safer approach than inteleaving?
        for (var i = 0; i < length; i += 2)
        {
            executeCommandFunction(commands[i], scene, context, passState);
        }
    }

    function executeFrontFaceCommands(commands, length, executeCommandFunction, scene, context, passState) {
        // TODO : safer approach than inteleaving?
        for (var i = 1; i < length; i += 2)
        {
            executeCommandFunction(commands[i], scene, context, passState);
        }
    }

    GlobeTranslucency.prototype.executeGlobeCommands = function(commands, length, clearGlobeDepth, cameraUnderground, hdr, executeCommandFunction, viewport, scene, context, passState) {
        if (length === 0) {
            return;
        }

        var executeFirstPass = cameraUnderground ? executeFrontFaceCommands : executeBackFaceCommands;
        var executeSecondPass = cameraUnderground ? executeBackFaceCommands : executeFrontFaceCommands;

        executeFirstPass(commands, length, executeCommandFunction, scene, context, passState);

        var width = viewport.width;
        var height = viewport.height;

        updateResources(this, context, width, height, hdr);
        updateCommands(this, context, width, height, passState);

        this._useHdr = hdr;

        var originalFramebuffer = passState.framebuffer;
        passState.framebuffer = this._framebuffer;

        this._clearCommand.execute(context, passState);

        executeSecondPass(commands, length, executeCommandFunction, scene, context, passState);

        passState.framebuffer = originalFramebuffer;

        if (clearGlobeDepth) {
            executeManualDepthTest(this, context, passState);
        }
    };

    GlobeTranslucency.prototype.executeClassificationCommands = function(commands, length, executeCommandFunction, scene, context, passState) {
        if (length === 0) {
            return;
        }

        var i;

        // Execute classification on back faces
        for (i = 0; i < length; ++i) {
            executeCommandFunction(commands[i], scene, context, passState);
        }

        var originalFramebuffer = passState.framebuffer;
        passState.framebuffer = this._framebuffer;

        // Execute classification on front faces
        for (i = 0; i < length; ++i) {
            executeCommandFunction(commands[i], scene, context, passState);
        }

        passState.framebuffer = originalFramebuffer;
    };

    GlobeTranslucency.prototype.updateCommand = function(context, passState) {
        executeManualDepthTest(this, context, passState);
        return this._blendCommand;
    };

    GlobeTranslucency.prototype.isDestroyed = function() {
        return false;
    };

    GlobeTranslucency.prototype.destroy = function() {
        destroyResources();
        return destroyObject(this);
    };

export default GlobeTranslucency;
