/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Core/DeveloperError',
        'Core/WebGLConstants'
    ], function(
        clone,
        defaultValue,
        defined,
        DeveloperError,
        WebGLConstants) {
    'use strict';

    function getWebGLStub(canvas, options) {
        var stub = clone(WebGLConstants);

        stub.canvas = canvas;
        stub.drawingBufferWidth = Math.max(canvas.width, 1);
        stub.drawingBufferHeight = Math.max(canvas.height, 1);

        stub.activeTexture = noop;
        stub.attachShader = noop;
        stub.bindAttribLocation = noop;
        stub.bindBuffer = noop;
        stub.bindFramebuffer = noop;
        stub.bindRenderbuffer = noop;
        stub.bindTexture = noop;
        stub.blendColor = noop;
        stub.blendEquation = noop;
        stub.blendEquationSeparate = noop;
        stub.blendFunc = noop;
        stub.blendFuncSeparate = noop;
        stub.bufferData = noop;
        stub.bufferSubData = noop;
        stub.checkFramebufferStatus = checkFramebufferStatusStub;
        stub.clear = noop;
        stub.clearColor = noop;
        stub.clearDepth = noop;
        stub.clearStencil = noop;
        stub.colorMask = noop;
        stub.compileShader = noop;
        stub.compressedTexImage2D = noop;
        stub.compressedTexSubImage2D = noop;
        stub.copyTexImage2D = noop;
        stub.copyTexSubImage2D = noop;
        stub.createBuffer = createStub;
        stub.createFramebuffer = createStub;
        stub.createProgram = createStub;
        stub.createRenderbuffer = createStub;
        stub.createShader = createStub;
        stub.createTexture = createStub;
        stub.cullFace = noop;
        stub.deleteBuffer = noop;
        stub.deleteFramebuffer = noop;
        stub.deleteProgram = noop;
        stub.deleteRenderbuffer = noop;
        stub.deleteShader = noop;
        stub.deleteTexture = noop;
        stub.depthFunc = noop;
        stub.depthMask = noop;
        stub.depthRange = noop;
        stub.detachShader = noop;
        stub.disable = noop;
        stub.disableVertexAttribArray = noop;
        stub.drawArrays = noop;
        stub.drawElements = noop;
        stub.enable = noop;
        stub.enableVertexAttribArray = noop;
        stub.finish = noop;
        stub.flush = noop;
        stub.framebufferRenderbuffer = noop;
        stub.framebufferTexture2D = noop;
        stub.frontFace = noop;
        stub.generateMipmap = noop;
        stub.getActiveAttrib = getStub;
        stub.getActiveUniform = getStub;
        stub.getAttachedShaders = getStubWarning;
        stub.getAttribLocation = getStub;
        stub.getBufferParameter = getStubWarning;
        stub.getContextAttributes = getContextAttributesStub(options);
        stub.getError = getErrorStub;
        stub.getExtension = getExtensionStub;
        stub.getFramebufferAttachmentParameter = getStubWarning;
        stub.getParameter = getParameterStub(options);
        stub.getProgramParameter = getProgramParameterStub;
        stub.getProgramInfoLog = getStub;
        stub.getRenderbufferParameter = getStubWarning;
        stub.getShaderParameter = getShaderParameterStub;
        stub.getShaderInfoLog = getStub;
        stub.getShaderPrecisionFormat = getShaderPrecisionStub;
        stub.getShaderSource = getStubWarning;
        stub.getSupportedExtensions = getStubWarning;
        stub.getTexParameter = getStubWarning;
        stub.getUniform = getStub;
        stub.getUniformLocation = getStub;
        stub.getVertexAttrib = getStubWarning;
        stub.getVertexAttribOffset = getStubWarning;
        stub.hint = noop;
        stub.isBuffer = getStubWarning;
        stub.isContextLost = getStubWarning;
        stub.isEnabled = getStubWarning;
        stub.isFramebuffer = getStubWarning;
        stub.isProgram = getStubWarning;
        stub.isRenderbuffer = getStubWarning;
        stub.isShader = getStubWarning;
        stub.isTexture = getStubWarning;
        stub.lineWidth = noop;
        stub.linkProgram = noop;
        stub.pixelStorei = noop;
        stub.polygonOffset = noop;
        stub.readPixels = readPixelsStub;
        stub.renderbufferStorage = noop;
        stub.sampleCoverage = noop;
        stub.scissor = noop;
        stub.shaderSource = noop;
        stub.stencilFunc = noop;
        stub.stencilFuncSeparate = noop;
        stub.stencilMask = noop;
        stub.stencilMaskSeparate = noop;
        stub.stencilOp = noop;
        stub.stencilOpSeparate = noop;
        stub.texParameterf = noop;
        stub.texParameteri = noop;
        stub.texImage2D = noop;
        stub.texSubImage2D = noop;
        stub.uniform1f = noop;
        stub.uniform1fv = noop;
        stub.uniform1i = noop;
        stub.uniform1iv = noop;
        stub.uniform2f = noop;
        stub.uniform2fv = noop;
        stub.uniform2i = noop;
        stub.uniform2iv = noop;
        stub.uniform3f = noop;
        stub.uniform3fv = noop;
        stub.uniform3i = noop;
        stub.uniform3iv = noop;
        stub.uniform4f = noop;
        stub.uniform4fv = noop;
        stub.uniform4i = noop;
        stub.uniform4iv = noop;
        stub.uniformMatrix2fv = noop;
        stub.uniformMatrix3fv = noop;
        stub.uniformMatrix4fv = noop;
        stub.useProgram = noop;
        stub.validateProgram = noop;
        stub.vertexAttrib1f = noop;
        stub.vertexAttrib1fv = noop;
        stub.vertexAttrib2f = noop;
        stub.vertexAttrib2fv = noop;
        stub.vertexAttrib3f = noop;
        stub.vertexAttrib3fv = noop;
        stub.vertexAttrib4f = noop;
        stub.vertexAttrib4fv = noop;
        stub.vertexAttribPointer = noop;
        stub.viewport = noop;

        return stub;
    }

    function noop() {
    }

    function createStub() {
        return {};
    }

    function getStub() {
        return {};
    }

    function getStubWarning() {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('A stub for this get/is function is not defined.  Can it use getStub() or does it need a new one?');
        //>>includeEnd('debug');
    }

    function checkFramebufferStatusStub(target) {
        return WebGLConstants.FRAMEBUFFER_COMPLETE;
    }

    function getContextAttributesStub(options) {
        var contextAttributes = {
            alpha : defaultValue(options.alpha, true),
            depth : defaultValue(options.depth, true),
            stencil : defaultValue(options.stencil, false),
            antialias : defaultValue(options.antialias, true),
            premultipliedAlpha : defaultValue(options.premultipliedAlpha, true),
            preserveDrawingBuffer : defaultValue(options.preserveDrawingBuffer, false),
            powerPreference : defaultValue(options.powerPreference, false),
            failIfMajorPerformanceCaveat : defaultValue(options.failIfMajorPerformanceCaveat, false)
        };

        return function() {
            return contextAttributes;
        };
    }

    function getErrorStub() {
        return WebGLConstants.NO_ERROR;
    }

    function getExtensionStub(name) {
        // No extensions are stubbed.
        return null;
    }

    function getParameterStub(options) {
        // These are not the minimum maximum; instead, they are typical maximums.
        var parameterStubValues = {};
        parameterStubValues[WebGLConstants.STENCIL_BITS] = options.stencil ? 8 : 0;
        parameterStubValues[WebGLConstants.MAX_COMBINED_TEXTURE_IMAGE_UNITS] = 32;
        parameterStubValues[WebGLConstants.MAX_CUBE_MAP_TEXTURE_SIZE] = 16384;
        parameterStubValues[WebGLConstants.MAX_FRAGMENT_UNIFORM_VECTORS] = 1024;
        parameterStubValues[WebGLConstants.MAX_TEXTURE_IMAGE_UNITS] = 16;
        parameterStubValues[WebGLConstants.MAX_RENDERBUFFER_SIZE] = 16384;
        parameterStubValues[WebGLConstants.MAX_TEXTURE_SIZE] = 16384;
        parameterStubValues[WebGLConstants.MAX_VARYING_VECTORS] = 30;
        parameterStubValues[WebGLConstants.MAX_VERTEX_ATTRIBS] = 16;
        parameterStubValues[WebGLConstants.MAX_VERTEX_TEXTURE_IMAGE_UNITS] = 16;
        parameterStubValues[WebGLConstants.MAX_VERTEX_UNIFORM_VECTORS] = 4096;
        parameterStubValues[WebGLConstants.ALIASED_LINE_WIDTH_RANGE] = [1, 1];
        parameterStubValues[WebGLConstants.ALIASED_POINT_SIZE_RANGE] = [1, 1024];
        parameterStubValues[WebGLConstants.MAX_VIEWPORT_DIMS] = [16384, 16384];
        parameterStubValues[WebGLConstants.MAX_TEXTURE_MAX_ANISOTROPY_EXT] = 16; // Assuming extension
        parameterStubValues[WebGLConstants.MAX_DRAW_BUFFERS] = 8; // Assuming extension
        parameterStubValues[WebGLConstants.MAX_COLOR_ATTACHMENTS] = 8; // Assuming extension

        return function(pname) {
            var value = parameterStubValues[pname];

            //>>includeStart('debug', pragmas.debug);
            if (!defined(value)) {
                throw new DeveloperError('A WebGL parameter stub for ' + pname + ' is not defined. Add it.');
            }
            //>>includeEnd('debug');

            return value;
        };
    }

    function getProgramParameterStub(program, pname) {
        if ((pname === WebGLConstants.LINK_STATUS) || (pname === WebGLConstants.VALIDATE_STATUS)) {
            return true;
        }

        if ((pname === WebGLConstants.ACTIVE_UNIFORMS) || (pname === WebGLConstants.ACTIVE_ATTRIBUTES)) {
            return 0;
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('A WebGL parameter stub for ' + pname + ' is not defined. Add it.');
        //>>includeEnd('debug');
    }

    function getShaderParameterStub(shader, pname) {
        //>>includeStart('debug', pragmas.debug);
        if (pname !== WebGLConstants.COMPILE_STATUS) {
            throw new DeveloperError('A WebGL parameter stub for ' + pname + ' is not defined. Add it.');
        }
        //>>includeEnd('debug');

        return true;
    }

    function getShaderPrecisionStub(shadertype, precisiontype) {
        //>>includeStart('debug', pragmas.debug);
        if (shadertype !== WebGLConstants.FRAGMENT_SHADER) {
            throw new DeveloperError('getShaderPrecision only has a stub for FRAGMENT_SHADER. Update it.');
        }

        if ((precisiontype !== WebGLConstants.HIGH_FLOAT) && (precisiontype !== WebGLConstants.HIGH_INT)) {
            throw new DeveloperError('getShaderPrecision only has a stub for HIGH_FLOAT and HIGH_INT. Update it.');
        }
        //>>includeEnd('debug');

        if (precisiontype === WebGLConstants.HIGH_FLOAT) {
            return {
                rangeMin : 127,
                rangeMax : 127,
                precision : 23
            };
        }

        // HIGH_INT
        return {
            rangeMin : 31,
            rangeMax : 30,
            precision : 0
        };
    }

    function readPixelsStub(x, y, width, height, format, type, pixels) {
        return [0, 0, 0, 0];
    }

    return getWebGLStub;
});
