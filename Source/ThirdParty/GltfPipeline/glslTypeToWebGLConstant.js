define([
        '../../Core/WebGLConstants'
    ], function(
        WebGLConstants) {
    'use strict';

    function glslTypeToWebGLConstant(glslType) {
        switch (glslType) {
            case 'float':
                return WebGLConstants.FLOAT;
            case 'vec2':
                return WebGLConstants.FLOAT_VEC2;
            case 'vec3':
                return WebGLConstants.FLOAT_VEC3;
            case 'vec4':
                return WebGLConstants.FLOAT_VEC4;
            case 'mat2':
                return WebGLConstants.FLOAT_MAT2;
            case 'mat3':
                return WebGLConstants.FLOAT_MAT3;
            case 'mat4':
                return WebGLConstants.FLOAT_MAT4;
            case 'sampler2D':
                return WebGLConstants.SAMPLER_2D;
        }
    }
    return glslTypeToWebGLConstant;
});
