define([
        './WebGLConstants'
    ], function(
        WebGLConstants) {
    'use strict';

    function webGLConstantToGlslType(webGLValue) {
        switch (webGLValue) {
            case WebGLConstants.FLOAT:
                return 'float';
            case WebGLConstants.FLOAT_VEC2:
                return 'vec2';
            case WebGLConstants.FLOAT_VEC3:
                return 'vec3';
            case WebGLConstants.FLOAT_VEC4:
                return 'vec4';
            case WebGLConstants.FLOAT_MAT2:
                return 'mat2';
            case WebGLConstants.FLOAT_MAT3:
                return 'mat3';
            case WebGLConstants.FLOAT_MAT4:
                return 'mat4';
            case WebGLConstants.SAMPLER_2D:
                return 'sampler2D';
            case WebGLConstants.BOOL:
                return 'bool';
        }
    }
    return webGLConstantToGlslType;
});
