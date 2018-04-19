define([
        '../Core/defined',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderSource'
    ], function(
        defined,
        DrawCommand,
        RenderState,
        ShaderSource) {
    'use strict';

    /**
     * @private
     */
    function DerivedCommand() {}

    var fragDepthRegex = /\bgl_FragDepthEXT\b/;
    var discardRegex = /\bdiscard\b/;

    function getDepthOnlyShaderProgram(context, shaderProgram) {
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'depthOnly');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var fs = shaderProgram.fragmentShaderSource;

            var writesDepthOrDiscards = false;
            var sources = fs.sources;
            var length = sources.length;
            for (var i = 0; i < length; ++i) {
                if (fragDepthRegex.test(sources[i]) || discardRegex.test(sources[i])) {
                    writesDepthOrDiscards = true;
                    break;
                }
            }

            if (!writesDepthOrDiscards) {
                fs = new ShaderSource({
                    sources : ['void main() { gl_FragColor = vec4(1.0); }']
                });
            }

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'depthOnly', {
                vertexShaderSource : shaderProgram.vertexShaderSource,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    function getDepthOnlyRenderState(scene, renderState) {
        var cache = scene._depthOnlyRenderStateCache;
        var depthOnlyState = cache[renderState.id];
        if (!defined(depthOnlyState)) {
            var rs = RenderState.getState(renderState);
            rs.depthMask = true;
            rs.colorMask = {
                red : false,
                green : false,
                blue : false,
                alpha : false
            };

            depthOnlyState = RenderState.fromCache(rs);
            cache[renderState.id] = depthOnlyState;
        }

        return depthOnlyState;
    }

    DerivedCommand.createDepthOnlyDerivedCommand = function(scene, command, context, result) {
        // For a depth only pass, we bind a framebuffer with only a depth attachment (no color attachments),
        // do not write color, and write depth. If the fragment shader doesn't modify the fragment depth
        // or discard, the driver can replace the fragment shader with a pass-through shader. We're unsure if this
        // actually happens so we modify the shader to use a pass-through fragment shader.

        if (!defined(result)) {
            result = {};
        }

        var shader;
        var renderState;
        if (defined(result.depthOnlyCommand)) {
            shader = result.depthOnlyCommand.shaderProgram;
            renderState = result.depthOnlyCommand.renderState;
        }

        result.depthOnlyCommand = DrawCommand.shallowClone(command, result.depthOnlyCommand);

        if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
            result.depthOnlyCommand.shaderProgram = getDepthOnlyShaderProgram(context, command.shaderProgram);
            result.depthOnlyCommand.renderState = getDepthOnlyRenderState(scene, command.renderState);
            result.shaderProgramId = command.shaderProgram.id;
        } else {
            result.depthOnlyCommand.shaderProgram = shader;
            result.depthOnlyCommand.renderState = renderState;
        }

        return result;
    };

    var writeLogDepthRegex = /\s+czm_writeLogDepth\(/;
    var vertexlogDepthRegex = /\s+czm_vertexLogDepth\(/;
    var extensionRegex = /\s*#extension\s+GL_EXT_frag_depth\s*:\s*enable/;

    function getLogDepthShaderProgram(context, shaderProgram) {
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'logDepth');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var vs = shaderProgram.vertexShaderSource.clone();
            var fs = shaderProgram.fragmentShaderSource.clone();

            vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
            vs.defines.push('LOG_DEPTH');
            fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
            fs.defines.push('LOG_DEPTH');

            var i;
            var logMain;
            var writesLogDepth = false;
            var sources = vs.sources;
            var length = sources.length;
            for (i = 0; i < length; ++i) {
                if (vertexlogDepthRegex.test(sources[i])) {
                    writesLogDepth = true;
                    break;
                }
            }

            if (!writesLogDepth) {
                for (i = 0; i < length; ++i) {
                    sources[i] = ShaderSource.replaceMain(sources[i], 'czm_log_depth_main');
                }

                logMain =
                    '\n\n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_log_depth_main(); \n' +
                    '    czm_vertexLogDepth(); \n' +
                    '} \n';
                sources.push(logMain);
            }

            var addExtension = true;
            writesLogDepth = false;
            sources = fs.sources;
            length = sources.length;
            for (i = 0; i < length; ++i) {
                if (writeLogDepthRegex.test(sources[i])) {
                    writesLogDepth = true;
                }
                if (extensionRegex.test(sources[i])) {
                    addExtension = false;
                }
            }

            var logSource = '';
            if (addExtension) {
                logSource +=
                    '#ifdef GL_EXT_frag_depth \n' +
                    '#extension GL_EXT_frag_depth : enable \n' +
                    '#endif \n\n';
            }

            if (!writesLogDepth) {
                for (i = 0; i < length; i++) {
                    sources[i] = ShaderSource.replaceMain(sources[i], 'czm_log_depth_main');
                }

                logSource +=
                    '\n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_log_depth_main(); \n' +
                    '    czm_writeLogDepth(); \n' +
                    '} \n';
            }

            sources.push(logSource);

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'logDepth', {
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    DerivedCommand.createLogDepthCommand = function(command, context, result) {
        if (!defined(result)) {
            result = {};
        }

        var shader;
        if (defined(result.command)) {
            shader = result.command.shaderProgram;
        }

        result.command = DrawCommand.shallowClone(command, result.command);

        if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
            result.command.shaderProgram = getLogDepthShaderProgram(context, command.shaderProgram);
            result.shaderProgramId = command.shaderProgram.id;
        } else {
            result.command.shaderProgram = shader;
        }

        return result;
    };

    return DerivedCommand;
});
