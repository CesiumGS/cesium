import BoundingRectangle from '../Core/BoundingRectangle.js';
import Color from '../Core/Color.js';
import destroyObject from '../Core/destroyObject.js';
import defined from '../Core/defined.js';
import PixelFormat from '../Core/PixelFormat.js';
import ClearCommand from '../Renderer/ClearCommand.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Framebuffer from '../Renderer/Framebuffer.js';
import Pass from '../Renderer/Pass.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import Renderbuffer from '../Renderer/Renderbuffer.js';
import RenderbufferFormat from '../Renderer/RenderbufferFormat.js';
import RenderState from '../Renderer/RenderState.js';
import Sampler from '../Renderer/Sampler.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import Texture from '../Renderer/Texture.js';
import PassThroughDepth from '../Shaders/PostProcessStages/PassThroughDepth.js';
import BlendingState from './BlendingState.js';
import CullFace from './CullFace.js';
import GlobeTranslucencyMode from './GlobeTranslucencyMode.js';

    /**
     * @private
     */
    function GlobeTranslucency() {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._framebuffer = undefined;

        this._packedDepthTexture = undefined;
        this._packedDepthFramebuffer = undefined;

        this._renderState = undefined;

        this._packedDepthCommand = undefined;
        this._clearCommand = undefined;

        this._viewport = new BoundingRectangle();
        this._useScissorTest = false;
        this._scissorRectangle = undefined;
        this._useHdr = undefined;
    }

    function destroyResources(globeTranslucency) {
        globeTranslucency._colorTexture = globeTranslucency._colorTexture && !globeTranslucency._colorTexture.isDestroyed() && globeTranslucency._colorTexture.destroy();
        globeTranslucency._depthStencilTexture = globeTranslucency._depthStencilTexture && !globeTranslucency._depthStencilTexture.isDestroyed() && globeTranslucency._depthStencilTexture.destroy();
        globeTranslucency._depthStencilRenderbuffer = globeTranslucency._depthStencilRenderbuffer && !globeTranslucency._depthStencilRenderbuffer.isDestroyed() && globeTranslucency._depthStencilRenderbuffer.destroy();
        globeTranslucency._framebuffer = globeTranslucency._framebuffer && !globeTranslucency._framebuffer.isDestroyed() && globeTranslucency._framebuffer.destroy();
        globeTranslucency._packedDepthTexture = globeTranslucency._packedDepthTexture && !globeTranslucency._packedDepthTexture.isDestroyed() && globeTranslucency._packedDepthTexture.destroy();
        globeTranslucency._packedDepthFramebuffer = globeTranslucency._packedDepthFramebuffer && !globeTranslucency._packedDepthFramebuffer.isDestroyed() && globeTranslucency._packedDepthFramebuffer.destroy();
    }

    function createResources(globeTranslucency, context, width, height, hdr) {
        var pixelDatatype = hdr ? (context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT) : PixelDatatype.UNSIGNED_BYTE;
        globeTranslucency._colorTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : pixelDatatype,
            sampler : Sampler.NEAREST
        });

        if (context.depthTexture) {
            globeTranslucency._depthStencilTexture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
            });
        } else {
            globeTranslucency._depthStencilRenderbuffer = new Renderbuffer({
                context : context,
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_STENCIL
            });
        }

        globeTranslucency._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeTranslucency._colorTexture],
            depthStencilTexture : globeTranslucency._depthStencilTexture,
            depthStencilRenderbuffer : globeTranslucency._depthStencilRenderbuffer,
            destroyAttachments : false
        });

        globeTranslucency._packedDepthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : Sampler.NEAREST
        });

        globeTranslucency._packedDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeTranslucency._packedDepthTexture],
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

        if (!defined(globeTranslucency._renderState) || !BoundingRectangle.equals(globeTranslucency._viewport, globeTranslucency._renderState.viewport) || updateScissor) {
            globeTranslucency._renderState = RenderState.fromCache({
                viewport : globeTranslucency._viewport,
                scissorTest : {
                    enabled : globeTranslucency._useScissorTest,
                    rectangle : globeTranslucency._scissorRectangle
                }
            });
        }

        if (!defined(globeTranslucency._packedDepthCommand)) {
            globeTranslucency._packedDepthCommand = context.createViewportQuadCommand(PassThroughDepth, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeTranslucency._depthStencilTexture;
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

        globeTranslucency._packedDepthCommand.framebuffer = globeTranslucency._packedDepthFramebuffer;
        globeTranslucency._packedDepthCommand.renderState = globeTranslucency._renderState;
        globeTranslucency._clearCommand.framebuffer = globeTranslucency._framebuffer;
        globeTranslucency._clearCommand.renderState = globeTranslucency._renderState;
    }

    function removeDefine(defines, defineToRemove) {
        var index = defines.indexOf(defineToRemove);
        if (index > -1) {
            defines.splice(index, 1);
        }
    }

    function getBackFaceShaderProgram(vs, fs) {
        removeDefine(vs.defines, 'GROUND_ATMOSPHERE');
        removeDefine(fs.defines, 'GROUND_ATMOSPHERE');
        removeDefine(vs.defines, 'FOG');
        removeDefine(fs.defines, 'FOG');
        removeDefine(vs.defines, 'TRANSLUCENT');
        removeDefine(fs.defines, 'TRANSLUCENT');
    }

    function getTranslucentBackFaceShaderProgram(vs, fs) {
        getTranslucentShaderProgram(vs, fs);
        removeDefine(vs.defines, 'GROUND_ATMOSPHERE');
        removeDefine(fs.defines, 'GROUND_ATMOSPHERE');
        removeDefine(vs.defines, 'FOG');
        removeDefine(fs.defines, 'FOG');
    }

    function getTranslucentShaderProgram(vs, fs) {
        var sources = fs.sources;
        var length = sources.length;
        for (var i = 0; i < length; ++i) {
            sources[i] = ShaderSource.replaceMain(sources[i], 'czm_globe_translucency_main');
        }

        var globeTranslucencyMain =
            '\n\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_globe_translucency_main(); \n' +
            '    vec4 classificationColor = texture2D(czm_classificationTexture, gl_FragCoord.xy / czm_viewport.zw); \n' +
            '    gl_FragColor = classificationColor * vec4(classificationColor.aaa, 1.0) + gl_FragColor * (1.0 - classificationColor.a); \n' +
            '} \n';
        sources.push(globeTranslucencyMain);
    }

    function getDerivedShaderProgram(context, shaderProgram, getShaderProgramFunction, cacheName) {
        if (!defined(getShaderProgramFunction)) {
            return shaderProgram;
        }

        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, cacheName);
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var vs = shaderProgram.vertexShaderSource.clone();
            var fs = shaderProgram.fragmentShaderSource.clone();
            vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
            fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];

            getShaderProgramFunction(vs, fs);

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, cacheName, {
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    function getBackFaceRenderState(renderState) {
        renderState.cull.face = CullFace.FRONT;
        renderState.cull.enabled = true;
    }

    function getFrontFaceRenderState(renderState) {
        renderState.cull.face = CullFace.BACK;
        renderState.cull.enabled = true;
    }

    function getTranslucentBackFaceRenderState(renderState) {
        renderState.cull.face = CullFace.FRONT;
        renderState.cull.enabled = true;
        renderState.depthMask = false;
        renderState.blending = BlendingState.ALPHA_BLEND;
    }

    function getTranslucentFrontFaceRenderState(renderState) {
        renderState.cull.face = CullFace.BACK;
        renderState.cull.enabled = true;
        renderState.depthMask = false;
        renderState.blending = BlendingState.ALPHA_BLEND;
    }

    function getGlobeRenderState(renderState) {
        renderState.cull.face = CullFace.BACK;
        renderState.cull.enabled = false;
    }

    function getDerivedRenderState(renderState, getRenderStateFunction, cache) {
        var cachedRenderState = cache[renderState.id];
        if (!defined(cachedRenderState)) {
            var rs = RenderState.getState(renderState);
            getRenderStateFunction(rs);
            cachedRenderState = RenderState.fromCache(rs);
            cache[renderState.id] = cachedRenderState;
        }

        return cachedRenderState;
    }

    function DerivedCommandPack(names, passes, getShaderProgramFunctions, getRenderStateFunctions) {
        var length = names.length;
        var renderStateCaches = new Array(length);
        for (var i = 0; i < length; ++i) {
            renderStateCaches[i] = {};
        }

        this.length = length;
        this.names = names;
        this.passes = passes;
        this.getShaderProgramFunctions = getShaderProgramFunctions;
        this.getRenderStateFunctions = getRenderStateFunctions;
        this.commands = new Array(length);
        this.shaders = new Array(length);
        this.renderStates = new Array(length);
        this.renderStateCaches = renderStateCaches;
    }

    var derivedCommandPacks = {};

    function getDerivedCommandPack(globeTranslucencyMode) {
        if (globeTranslucencyMode === GlobeTranslucencyMode.ENABLED) {
            if (!defined(derivedCommandPacks.enabled)) {
                derivedCommandPacks.enabled = new DerivedCommandPack(
                    ['globeCommand', 'translucentFrontFaceCommand', 'translucentBackFaceCommand'],
                    [Pass.GLOBE, Pass.TRANSLUCENT, Pass.TRANSLUCENT],
                    [undefined, getTranslucentShaderProgram, getTranslucentBackFaceShaderProgram],
                    [getGlobeRenderState, getTranslucentFrontFaceRenderState, getTranslucentBackFaceRenderState]
                );
            }
            return derivedCommandPacks.enabled;
        }
        if (!defined(derivedCommandPacks.frontFacesOnly)) {
            derivedCommandPacks.frontFacesOnly = new DerivedCommandPack(
                ['backFaceCommand', 'frontFaceCommand', 'translucentBackFaceCommand', 'translucentFrontFaceCommand'],
                [Pass.GLOBE, Pass.GLOBE, Pass.TRANSLUCENT, Pass.TRANSLUCENT],
                [getBackFaceShaderProgram, undefined, getTranslucentBackFaceShaderProgram, getTranslucentShaderProgram],
                [getBackFaceRenderState, getFrontFaceRenderState, getTranslucentBackFaceRenderState, getTranslucentFrontFaceRenderState]
            );
        }
        return derivedCommandPacks.frontFacesOnly;
    }

    GlobeTranslucency.updateDerivedCommand = function(command, globeTranslucencyMode, frameState) {
        var derivedCommands = command.derivedCommands.globeTranslucency;

        var globeTranslucencyModeChanged = defined(derivedCommands) && (derivedCommands.globeTraslucencyMode !== globeTranslucencyMode);

        if (!defined(derivedCommands) || command.dirty || globeTranslucencyModeChanged) {
            var derivedCommandsPack = getDerivedCommandPack(globeTranslucencyMode);
            var length = derivedCommandsPack.length;
            var names = derivedCommandsPack.names;
            var passes = derivedCommandsPack.passes;
            var getShaderProgramFunctions = derivedCommandsPack.getShaderProgramFunctions;
            var getRenderStateFunctions = derivedCommandsPack.getRenderStateFunctions;
            var commands = derivedCommandsPack.commands;
            var shaders = derivedCommandsPack.shaders;
            var renderStates = derivedCommandsPack.renderStates;
            var renderStateCaches = derivedCommandsPack.renderStateCaches;

            command.dirty = false;
            derivedCommands = defined(derivedCommands) ? derivedCommands : {};

            var i;
            for (i = 0; i < length; ++i) {
                commands[i] = derivedCommands[names[i]];
            }

            if (defined(commands[0])) {
                for (i = 0; i < length; ++i) {
                    shaders[i] = commands[i].shaderProgram;
                    renderStates[i] = commands[i].renderState;
                }
            }

            for (i = 0; i < length; ++i) {
                commands[i] = DrawCommand.shallowClone(command, commands[i]);
                commands[i].pass = passes[i];
                derivedCommands[names[i]] = commands[i];
            }

            command.derivedCommands.globeTranslucency = derivedCommands;

            if (!defined(shaders[0]) || (derivedCommands.shaderProgramId !== command.shaderProgram.id) || globeTranslucencyModeChanged) {
                derivedCommands.shaderProgramId = command.shaderProgram.id;
                derivedCommands.globeTranslucencyMode = globeTranslucencyMode;
                for (i = 0; i < length; ++i) {
                    commands[i].shaderProgram = getDerivedShaderProgram(frameState.context, command.shaderProgram, getShaderProgramFunctions[i], names[i]);
                    commands[i].renderState = getDerivedRenderState(command.renderState, getRenderStateFunctions[i], renderStateCaches[i]);
                }
            } else {
                for (i = 0; i < length; ++i) {
                    commands[i].shaderProgram = shaders[i];
                    commands[i].renderState = renderStates[i];
                }
            }
        }
    };

    GlobeTranslucency.pushDerivedCommands = function(command, globeTranslucencyMode, frameState) {
        var derivedCommands = command.derivedCommands.globeTranslucency;
        if (globeTranslucencyMode === GlobeTranslucencyMode.ENABLED) {
            frameState.commandList.push(derivedCommands.globeCommand);
            frameState.commandList.push(derivedCommands.translucentFrontFaceCommand);
            frameState.commandList.push(derivedCommands.translucentBackFaceCommand);
        } else {
            frameState.commandList.push(derivedCommands.backFaceCommand);
            frameState.commandList.push(derivedCommands.frontFaceCommand);
            if (frameState.cameraUnderground) {
                frameState.commandList.push(derivedCommands.translucentBackFaceCommand);
            } else {
                frameState.commandList.push(derivedCommands.translucentFrontFaceCommand);
            }
        }
    };

    GlobeTranslucency.prototype.updateAndClear = function(hdr, viewport, context, passState) {
        var width = viewport.width;
        var height = viewport.height;

        updateResources(this, context, width, height, hdr);
        updateCommands(this, context, width, height, passState);

        // TODO remove
        context.uniformState.classificationTexture = this._colorTexture;

        this._useHdr = hdr;
    };

    function executeCommands(commands, length, cullFace, depthOnly, executeCommandFunction, scene, context, passState) {
        var originalPassesDepth = scene.frameState.passes.depth;

        if (depthOnly) {
            scene.frameState.passes.depth = true; // Renders depth-only commands in executeCommand
        }

        for (var i = 0; i < length; ++i) {
            var command = commands[i];
            if (!defined(cullFace) || command.renderState.cull.face === cullFace) {
                executeCommandFunction(command, scene, context, passState);
            }
        }

        scene.frameState.passes.depth = originalPassesDepth;
    }

    GlobeTranslucency.prototype.executeGlobeCommands = function(commands, commandsLength, cameraUnderground, globeTranslucencyMode, executeCommandFunction, scene, context, passState) {
        if (commandsLength === 0) {
            return;
        }

        // Clear for each frustum
        this._clearCommand.execute(context, passState);

        if (globeTranslucencyMode !== GlobeTranslucencyMode.FRONT_FACES_ONLY) {
            return;
        }

        // Back face gets swapped if the camera in underground
        var cullFace = cameraUnderground ? CullFace.BACK : CullFace.FRONT;

        // Render back faces to scene's framebuffer like normal
        executeCommands(commands, commandsLength, cullFace, false, executeCommandFunction, scene, context, passState);
    };

    GlobeTranslucency.prototype.executeGlobeClassificationCommands = function(frustumCommands, cameraUnderground, globeTranslucencyMode, executeCommandFunction, scene, context, passState) {
        var globeCommands = frustumCommands.commands[Pass.GLOBE];
        var globeCommandsLength = frustumCommands.indices[Pass.GLOBE];
        var classificationCommands = frustumCommands.commands[Pass.TERRAIN_CLASSIFICATION];
        var classificationCommandsLength = frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION];

        if (classificationCommandsLength === 0) {
            return;
        }

        var cullFace;

        if (globeTranslucencyMode === GlobeTranslucencyMode.FRONT_FACES_ONLY) {
            // Render classification on back faces
            executeCommands(classificationCommands, classificationCommandsLength, undefined, false, executeCommandFunction, scene, context, passState);

            // Front face gets swapped if the camera in underground
            cullFace = cameraUnderground ? CullFace.FRONT : CullFace.BACK;
        }

        var originalGlobeDepthTexture = context.uniformState.globeDepthTexture;
        var originalFramebuffer = passState.framebuffer;

        // Render to internal framebuffer and get the first depth peel
        passState.framebuffer = this._framebuffer;
        executeCommands(globeCommands, globeCommandsLength, cullFace, true, executeCommandFunction, scene, context, passState);

        if (context.depthTexture) {
            // Pack depth into separate texture for ground polylines and textured ground primitives
            this._packedDepthCommand.execute(context, passState);
            context.uniformState.globeDepthTexture = this._packedDepthTexture;
        }

        // Render classification on translucent faces
        executeCommands(classificationCommands, classificationCommandsLength, undefined, false, executeCommandFunction, scene, context, passState);

        // Unset temporary state
        context.uniformState.globeDepthTexture = originalGlobeDepthTexture;
        passState.framebuffer = originalFramebuffer;
    };

    GlobeTranslucency.prototype.executeTranslucentCommands = function(translucentCommands, translucentCommandsLength, classificationCommands, classificationCommandsLength, globeCommandsLength, executeTranslucentCommandsFunction, executeCommandFunction, useOIT, scene, context, invertClassification, scenePassState) {

    };

    GlobeTranslucency.prototype.isDestroyed = function() {
        return false;
    };

    GlobeTranslucency.prototype.destroy = function() {
        destroyResources();
        return destroyObject(this);
    };

export default GlobeTranslucency;
