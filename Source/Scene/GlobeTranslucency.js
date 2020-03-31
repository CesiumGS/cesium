import BoundingRectangle from '../Core/BoundingRectangle.js';
import Color from '../Core/Color.js';
import combine from '../Core/combine.js';
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
import SceneMode from './SceneMode.js';

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

    this._derivedCommandPack = undefined;
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

var TranslucencyMode = {
    FRONT_INVISIBLE : 1,
    FRONT_OPAQUE : 2,
    FRONT_TRANSLUCENT : 3,
    BACK_INVISIBLE : 4,
    BACK_OPAQUE : 8,
    BACK_TRANSLUCENT : 12,
    FRONT_MASK : 3, // For bitwise operations
    BACK_MASK : 12 // For bitwise operations
};

function getTranslucencyMode(frontTranslucencyByDistance, backTranslucencyByDistance, baseColor) {
    var baseLayerTranslucent = baseColor.alpha < 1.0;

    var frontInvisible = frontTranslucencyByDistance.nearValue === 0.0 && frontTranslucencyByDistance.farValue === 0.0;
    var frontOpaque = !baseLayerTranslucent && frontTranslucencyByDistance.nearValue === 1.0 && frontTranslucencyByDistance.farValue === 1.0;

    var backInvisible = backTranslucencyByDistance.nearValue === 0.0 && backTranslucencyByDistance.farValue === 0.0;
    var backOpaque = !baseLayerTranslucent && backTranslucencyByDistance.nearValue === 1.0 && backTranslucencyByDistance.farValue === 1.0;

    var translucencyMode = 0;

    if (frontInvisible) {
        translucencyMode += TranslucencyMode.FRONT_INVISIBLE;
    } else if (frontOpaque) {
        translucencyMode += TranslucencyMode.FRONT_OPAQUE;
    } else {
        translucencyMode += TranslucencyMode.FRONT_TRANSLUCENT;
    }

    if (backInvisible) {
        translucencyMode += TranslucencyMode.BACK_INVISIBLE;
    } else if (backOpaque) {
        translucencyMode += TranslucencyMode.BACK_OPAQUE;
    } else {
        translucencyMode += TranslucencyMode.BACK_TRANSLUCENT;
    }

    return translucencyMode;
}

function getFrontTranslucencyMode(translucencyMode) {
    return translucencyMode & TranslucencyMode.FRONT_MASK;
}

function getBackTranslucencyMode(translucencyMode) {
    return translucencyMode & TranslucencyMode.BACK_MASK;
}

function getTranslucencyModeFromGlobe(globe) {
    var frontTranslucencyByDistance = globe.frontTranslucencyByDistanceFinal;
    var backTranslucencyByDistance = globe.backTranslucencyByDistanceFinal;
    return getTranslucencyMode(frontTranslucencyByDistance, backTranslucencyByDistance, globe.baseColor);
}

GlobeTranslucency.isTranslucent = function(globe) {
    if (!defined(globe) || !globe.show) {
        return false;
    }
    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    return getFrontTranslucencyMode(translucencyMode) !== TranslucencyMode.FRONT_OPAQUE;
};

GlobeTranslucency.isSunVisibleThroughGlobe = function(globe, cameraUnderground) {
    if (!defined(globe) || !globe.show) {
        return true;
    }

    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    var frontOpaque = getFrontTranslucencyMode(translucencyMode) === TranslucencyMode.FRONT_OPAQUE;
    var backOpaque = getBackTranslucencyMode(translucencyMode) === TranslucencyMode.BACK_OPAQUE;

    // The sun is visible through the globe if the front and back faces are translucent when above ground
    // or if front faces are translucent when below ground
    return !frontOpaque && (cameraUnderground || !backOpaque);
};

GlobeTranslucency.isSkyAtmosphereVisible = function(globe) {
    if (!defined(globe) || !globe.show) {
        return false;
    }

    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    var frontInvisible = getFrontTranslucencyMode(translucencyMode) === TranslucencyMode.FRONT_INVISIBLE;
    var backInvisible = getBackTranslucencyMode(translucencyMode) === TranslucencyMode.BACK_INVISIBLE;

    // Sky atmosphere is visible if the globe is not completely invisible
    return !frontInvisible || !backInvisible;
};

GlobeTranslucency.isEnvironmentVisible = function(globe, cameraUnderground) {
    if (!defined(globe) || !globe.show) {
        return true;
    }

    // The environment is visible if the camera is above ground or underground with translucency
    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    return !cameraUnderground || getFrontTranslucencyMode(translucencyMode) !== TranslucencyMode.FRONT_OPAQUE;
};

GlobeTranslucency.useDepthPlane = function(globe, cameraUnderground) {
    if (cameraUnderground || !defined(globe) || !globe.show) {
        return false;
    }

    // Use the depth plane when the globe is opaque
    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    return getFrontTranslucencyMode(translucencyMode) === TranslucencyMode.FRONT_OPAQUE;
};

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

function getBackAndFrontFaceShaderProgram(vs, fs) {
    removeDefine(vs.defines, 'GROUND_ATMOSPHERE');
    removeDefine(fs.defines, 'GROUND_ATMOSPHERE');
    removeDefine(vs.defines, 'FOG');
    removeDefine(fs.defines, 'FOG');
    removeDefine(vs.defines, 'TRANSLUCENT');
    removeDefine(fs.defines, 'TRANSLUCENT');
}

function getFrontFaceShaderProgram(vs, fs) {
    removeDefine(vs.defines, 'TRANSLUCENT');
    removeDefine(fs.defines, 'TRANSLUCENT');
}

function getClearDepthTranslucentBackFaceShaderProgram(vs, fs) {
    getTranslucentBackFaceShaderProgram(vs, fs);
    vs.defines.push('GENERATE_POSITION');
    fs.defines.push('CLEAR_GLOBE_DEPTH');
}

function getClearDepthTranslucentFrontFaceShaderProgram(vs, fs) {
    getTranslucentShaderProgram(vs, fs);
    vs.defines.push('GENERATE_POSITION');
    fs.defines.push('CLEAR_GLOBE_DEPTH');
}

function getTranslucentBackFaceShaderProgram(vs, fs) {
    getTranslucentShaderProgram(vs, fs);
    removeDefine(vs.defines, 'GROUND_ATMOSPHERE');
    removeDefine(fs.defines, 'GROUND_ATMOSPHERE');
    removeDefine(vs.defines, 'FOG');
    removeDefine(fs.defines, 'FOG');
}

function getPickShaderProgram(vs, fs) {
    var pickShader =
        '\n\n' +
        'uniform sampler2D u_classificationTexture; \n' +
        'void main() \n' +
        '{ \n' +
        '    vec2 st = gl_FragCoord.xy / czm_viewport.zw; \n' +
        '    vec4 classificationColor = texture2D(u_classificationTexture, st); \n' +
        '    if (classificationColor == vec4(0.0)) \n' +
        '    { \n' +
        '        discard; \n' +
        '    } \n' +
        '    gl_FragColor = classificationColor; \n' +
        '} \n';

    fs.sources = [pickShader];
}

function getTranslucentShaderProgram(vs, fs) {
    var sources = fs.sources;
    var length = sources.length;
    for (var i = 0; i < length; ++i) {
        sources[i] = ShaderSource.replaceMain(sources[i], 'czm_globe_translucency_main');
    }

    var globeTranslucencyMain =
        '\n\n' +
        'uniform sampler2D u_classificationTexture; \n' +
        'void main() \n' +
        '{ \n' +
        '    vec2 st = gl_FragCoord.xy / czm_viewport.zw; \n' +
        '#ifdef CLEAR_GLOBE_DEPTH \n' +
        '    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st)); \n' +
        '    if (logDepthOrDepth != 0.0) \n' +
        '    { \n' +
        '        vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth); \n' +
        '        float depthEC = eyeCoordinate.z / eyeCoordinate.w; \n' +
        '        if (v_positionEC.z < depthEC) \n' +
        '        { \n' +
        '            discard; \n' +
        '        } \n' +
        '    } \n' +
        '#endif \n' +
        '    czm_globe_translucency_main(); \n' +
        '    vec4 classificationColor = texture2D(u_classificationTexture, st); \n' +
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

function getBackAndFrontFaceRenderState(renderState) {
    renderState.cull.face = CullFace.BACK;
    renderState.cull.enabled = false;
}

function getPickBackFaceRenderState(renderState) {
    renderState.cull.face = CullFace.FRONT;
    renderState.cull.enabled = true;
    renderState.blending.enabled = false;
}

function getPickFrontFaceRenderState(renderState) {
    renderState.cull.face = CullFace.BACK;
    renderState.cull.enabled = true;
    renderState.blending.enabled = false;
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

function getTranslucencyUniformMap(globeTranslucency) {
    return {
        u_classificationTexture : function() {
            return globeTranslucency._colorTexture;
        }
    };
}

function getDerivedUniformMap(globeTranslucency, uniformMap, derivedUniformMap, uniformMapChanged, getDerivedUniformMapFunction) {
    if (!defined(getDerivedUniformMapFunction)) {
        return uniformMap;
    }

    if (uniformMapChanged) {
        return combine(uniformMap, getDerivedUniformMapFunction(globeTranslucency), false);
    }

    return derivedUniformMap;
}

function DerivedCommandPack(names, passes, pickOnly, getShaderProgramFunctions, getRenderStateFunctions, getUniformMapFunctions) {
    var length = names.length;
    var renderStateCaches = new Array(length);
    for (var i = 0; i < length; ++i) {
        renderStateCaches[i] = {};
    }

    this.length = length;
    this.names = names;
    this.passes = passes;
    this.pickOnly = pickOnly;
    this.getShaderProgramFunctions = getShaderProgramFunctions;
    this.getRenderStateFunctions = getRenderStateFunctions;
    this.getUniformMapFunctions = getUniformMapFunctions;
    this.commands = new Array(length);
    this.shaders = new Array(length);
    this.renderStates = new Array(length);
    this.renderStateCaches = renderStateCaches;
    this.uniformMaps = new Array(length);
}

function getDerivedCommandPack(frameState) {
    var globeTranslucency = frameState.globeTranslucency;
    if (!defined(globeTranslucency._derivedCommandPack)) {
        globeTranslucency._derivedCommandPack = new DerivedCommandPack(
            ['backAndFrontFaceCommand', 'backFaceCommand', 'frontFaceCommand', 'translucentBackFaceCommand', 'translucentFrontFaceCommand', 'clearDepthTranslucentBackFaceCommand', 'clearDepthTranslucentFrontFaceCommand', 'pickBackFaceCommand', 'pickFrontFaceCommand'],
            [Pass.GLOBE, Pass.GLOBE, Pass.GLOBE, Pass.TRANSLUCENT, Pass.TRANSLUCENT, Pass.TRANSLUCENT, Pass.TRANSLUCENT, Pass.TRANSLUCENT, Pass.TRANSLUCENT],
            [false, false, false, false, false, false, false, true, true],
            [getBackAndFrontFaceShaderProgram, getBackFaceShaderProgram, getFrontFaceShaderProgram, getTranslucentBackFaceShaderProgram, getTranslucentShaderProgram, getClearDepthTranslucentBackFaceShaderProgram, getClearDepthTranslucentFrontFaceShaderProgram, getPickShaderProgram, getPickShaderProgram],
            [getBackAndFrontFaceRenderState, getBackFaceRenderState, getFrontFaceRenderState, getTranslucentBackFaceRenderState, getTranslucentFrontFaceRenderState, getTranslucentBackFaceRenderState, getTranslucentFrontFaceRenderState, getPickBackFaceRenderState, getPickFrontFaceRenderState],
            [undefined, undefined, undefined, getTranslucencyUniformMap, getTranslucencyUniformMap, getTranslucencyUniformMap, getTranslucencyUniformMap, getTranslucencyUniformMap, getTranslucencyUniformMap]
        );
    }

    return globeTranslucency._derivedCommandPack;
}

GlobeTranslucency.updateDerivedCommand = function(command, frameState) {
    var derivedCommands = command.derivedCommands.globeTranslucency;

    // TODO - only generate derived commands for those that are needed for the current state

    if (!defined(derivedCommands) || command.dirty) {
        var derivedCommandsPack = getDerivedCommandPack(frameState);
        var length = derivedCommandsPack.length;
        var names = derivedCommandsPack.names;
        var passes = derivedCommandsPack.passes;
        var pickOnly = derivedCommandsPack.pickOnly;
        var getShaderProgramFunctions = derivedCommandsPack.getShaderProgramFunctions;
        var getRenderStateFunctions = derivedCommandsPack.getRenderStateFunctions;
        var getUniformMapFunctions = derivedCommandsPack.getUniformMapFunctions;
        var commands = derivedCommandsPack.commands;
        var shaders = derivedCommandsPack.shaders;
        var renderStates = derivedCommandsPack.renderStates;
        var renderStateCaches = derivedCommandsPack.renderStateCaches;
        var uniformMaps = derivedCommandsPack.uniformMaps;

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
                uniformMaps[i] = commands[i].uniformMap;
            }
        } else {
            for (i = 0; i < length; ++i) {
                shaders[i] = undefined;
                renderStates[i] = undefined;
                uniformMaps[i] = undefined;
            }
        }

        var uniformMapChanged = false;
        if (derivedCommands.uniformMap !== command.uniformMap) {
            derivedCommands.uniformMap = command.uniformMap;
            uniformMapChanged = true;
        }

        for (i = 0; i < length; ++i) {
            commands[i] = DrawCommand.shallowClone(command, commands[i]);
            commands[i].pass = passes[i];
            commands[i].pickOnly = pickOnly[i];
            commands[i].uniformMap = getDerivedUniformMap(frameState.globeTranslucency, command.uniformMap, uniformMaps[i], uniformMapChanged, getUniformMapFunctions[i]);
            derivedCommands[names[i]] = commands[i];
        }

        command.derivedCommands.globeTranslucency = derivedCommands;

        if (!defined(shaders[0]) || (derivedCommands.shaderProgramId !== command.shaderProgram.id)) {
            derivedCommands.shaderProgramId = command.shaderProgram.id;
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

GlobeTranslucency.pushDerivedCommands = function(command, tileProvider, frameState) {
    var translucencyMode = getTranslucencyMode(tileProvider.frontTranslucencyByDistance, tileProvider.backTranslucencyByDistance, tileProvider.baseColor);

    if (translucencyMode === (TranslucencyMode.FRONT_INVISIBLE | TranslucencyMode.BACK_INVISIBLE)) {
        // Don't push any commands if both front and back faces are invisible
        return;
    }

    if (getFrontTranslucencyMode(translucencyMode) === TranslucencyMode.FRONT_OPAQUE) {
        // Render the globe normally when front face is opaque
        frameState.commandList.push(command);
        return;
    }

    var derivedCommands = command.derivedCommands.globeTranslucency;
    var picking = frameState.passes.pick;
    var scene2D = frameState.mode === SceneMode.SCENE2D;
    var clearGlobeDepth = translucencyMode === (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_OPAQUE) && !tileProvider.depthTestAgainstTerrain && frameState.context.depthTexture && !scene2D;

    var translucentFrontFaceCommand = picking ? derivedCommands.pickFrontFaceCommand : (clearGlobeDepth ? derivedCommands.clearDepthTranslucentFrontFaceCommand : derivedCommands.translucentFrontFaceCommand);
    var translucentBackFaceCommand = picking ? derivedCommands.pickBackFaceCommand : (clearGlobeDepth ? derivedCommands.clearDepthTranslucentBackFaceCommand : derivedCommands.translucentBackFaceCommand);

    if (scene2D) {
        frameState.commandList.push(derivedCommands.frontFaceCommand);
        frameState.commandList.push(translucentFrontFaceCommand);
        return;
    }

    if (translucencyMode === (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_TRANSLUCENT)) {
        // Push back and front face command for classification depth
        // Push translucent back and front face commands separately so that non-OIT blending looks better
        frameState.commandList.push(derivedCommands.backAndFrontFaceCommand);
        if (frameState.cameraUnderground) {
            frameState.commandList.push(translucentFrontFaceCommand);
            frameState.commandList.push(translucentBackFaceCommand);
        } else {
            frameState.commandList.push(translucentBackFaceCommand);
            frameState.commandList.push(translucentFrontFaceCommand);
        }
    } else if (translucencyMode === (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_OPAQUE)) {
        // Push back and front face commands, one for the opaque pass and the other for classification depth
        // Push translucent command for the face that appears in front
        frameState.commandList.push(derivedCommands.backFaceCommand);
        frameState.commandList.push(derivedCommands.frontFaceCommand);
        if (frameState.cameraUnderground) {
            frameState.commandList.push(translucentBackFaceCommand);
        } else {
            frameState.commandList.push(translucentFrontFaceCommand);
        }
    } else if (translucencyMode === (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_INVISIBLE)) {
        // Push one command for classification depth and another for translucency
        if (frameState.cameraUnderground) {
            frameState.commandList.push(derivedCommands.backFaceCommand);
            frameState.commandList.push(translucentBackFaceCommand);
        } else {
            frameState.commandList.push(derivedCommands.frontFaceCommand);
            frameState.commandList.push(translucentFrontFaceCommand);
        }
    } else if (translucencyMode === (TranslucencyMode.FRONT_INVISIBLE | TranslucencyMode.BACK_TRANSLUCENT)) {
        // Push one command for classification depth and another for translucency
        if (frameState.cameraUnderground) {
            frameState.commandList.push(derivedCommands.frontFaceCommand);
            frameState.commandList.push(translucentFrontFaceCommand);
        } else {
            frameState.commandList.push(derivedCommands.backFaceCommand);
            frameState.commandList.push(translucentBackFaceCommand);
        }
    } else if (translucencyMode === (TranslucencyMode.FRONT_INVISIBLE | TranslucencyMode.BACK_OPAQUE)) {
        // Push command for the opaque pass
        if (frameState.cameraUnderground) {
            frameState.commandList.push(derivedCommands.frontFaceCommand);
        } else {
            frameState.commandList.push(derivedCommands.backFaceCommand);
        }
    }
};

GlobeTranslucency.prototype.updateAndClear = function(hdr, viewport, context, passState) {
    var width = viewport.width;
    var height = viewport.height;

    updateResources(this, context, width, height, hdr);
    updateCommands(this, context, width, height, passState);

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

GlobeTranslucency.prototype.executeGlobeCommands = function(commands, commandsLength, cameraUnderground, globe, executeCommandFunction, scene, context, passState) {
    if (commandsLength === 0) {
        return;
    }

    // Clear for each frustum
    this._clearCommand.execute(context, passState);

    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    var frontOpaque = getFrontTranslucencyMode(translucencyMode) === TranslucencyMode.FRONT_OPAQUE;
    var backOpaque = getBackTranslucencyMode(translucencyMode) === TranslucencyMode.BACK_OPAQUE;

    if (frontOpaque || backOpaque) {
        // Render opaque commands to scene's framebuffer like normal
        // Faces gets swapped if the camera is underground
        var cullFace = cameraUnderground ? CullFace.BACK : CullFace.FRONT;
        executeCommands(commands, commandsLength, cullFace, false, executeCommandFunction, scene, context, passState);
    }
};

GlobeTranslucency.prototype.executeGlobeClassificationCommands = function(frustumCommands, cameraUnderground, globe, executeCommandFunction, scene, context, passState) {
    var globeCommands = frustumCommands.commands[Pass.GLOBE];
    var globeCommandsLength = frustumCommands.indices[Pass.GLOBE];
    var classificationCommands = frustumCommands.commands[Pass.TERRAIN_CLASSIFICATION];
    var classificationCommandsLength = frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION];

    if (globeCommandsLength === 0 || classificationCommandsLength === 0) {
        return;
    }

    var translucencyMode = getTranslucencyModeFromGlobe(globe);
    var frontTranslucencyMode = getFrontTranslucencyMode(translucencyMode);
    var backTranslucencyMode = getBackTranslucencyMode(translucencyMode);

    var frontOpaque = frontTranslucencyMode === TranslucencyMode.FRONT_OPAQUE;
    var backOpaque = backTranslucencyMode === TranslucencyMode.BACK_OPAQUE;
    var frontTranslucent = frontTranslucencyMode === TranslucencyMode.FRONT_TRANSLUCENT;
    var backTranslucent = backTranslucencyMode === TranslucencyMode.BACK_TRANSLUCENT;

    if (frontOpaque || backOpaque) {
        // Render classification on opaque faces like normal
        executeCommands(classificationCommands, classificationCommandsLength, undefined, false, executeCommandFunction, scene, context, passState);
    }

    if (frontOpaque || (!frontTranslucent && !backTranslucent)) {
        // No translucent commands to render. Skip translucent classification.
        return;
    }

    // When front is translucent and back is opaque both front and back face commands are pushed to the globe pass, one
    // for opaque rendering in executeGlobeCommands and one for depth-only rendering for classification. cullFace acts
    // as a filter for rendering depth-only commands.
    var cullFace = (frontTranslucent && backOpaque) ? (cameraUnderground ? CullFace.FRONT : CullFace.BACK) : undefined;

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

GlobeTranslucency.prototype.isDestroyed = function() {
    return false;
};

GlobeTranslucency.prototype.destroy = function() {
    destroyResources(this);
    return destroyObject(this);
};

export default GlobeTranslucency;
