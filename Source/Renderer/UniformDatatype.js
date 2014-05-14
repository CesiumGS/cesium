/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * Indicates a GLSL uniform's datatype.
     *
     * @exports UniformDatatype
     * @see Uniform.datatype
     */
    var UniformDatatype = {
        /**
         * A <code>float</code> uniform.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1406
         */
        FLOAT : new Enumeration(0x1406, 'FLOAT', {
            glsl : 'float'
        }),

        /**
         * A <code>vec2</code> uniform: a two-component floating-point vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B50
         */
       FLOAT_VEC2 : new Enumeration(0x8B50, 'FLOAT_VEC2', {
            glsl : 'vec2'
        }),

        /**
         * A <code>vec3</code> uniform: a three-component floating-point vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B51
         */
        FLOAT_VEC3 : new Enumeration(0x8B51, 'FLOAT_VEC3', {
            glsl : 'vec3'
        }),

        /**
         * A <code>vec4</code> uniform: a four-component floating-point vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B52
         */
        FLOAT_VEC4 : new Enumeration(0x8B52, 'FLOAT_VEC4', {
            glsl : 'vec4'
        }),

        /**
         * An <code>int</code> uniform.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1404
         */
        INT : new Enumeration(0x1404, 'INT', {
            glsl : 'int'
        }),

        /**
         * An <code>ivec2</code> uniform: a two-component integer vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B53
         */
        INT_VEC2 : new Enumeration(0x8B53, 'INT_VEC2', {
            glsl : 'ivec2'
        }),

        /**
         * An <code>ivec3</code> uniform: a three-component integer vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B54
         */
        INT_VEC3 : new Enumeration(0x8B54, 'INT_VEC3', {
            glsl : 'ivec3'
        }),

        /**
         * An <code>ivec4</code> uniform: a four-component integer vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B55
         */
        INT_VEC4 : new Enumeration(0x8B55, 'INT_VEC4', {
            glsl : 'ivec4'
        }),

        /**
         * A <code>bool</code> uniform.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B56
         */
        BOOL : new Enumeration(0x8B56, 'BOOL', {
            glsl : 'bool'
        }),

        /**
         * A <code>bvec2</code> uniform: a two-component boolean vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B57
         */
        BOOL_VEC2 : new Enumeration(0x8B57, 'BOOL_VEC2', {
            glsl : 'bvec2'
        }),

        /**
         * A <code>bvec3</code> uniform: a three-component boolean vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B58
         */
        BOOL_VEC3 : new Enumeration(0x8B58, 'BOOL_VEC3', {
            glsl : 'bvec3'
        }),

        /**
         * A <code>bvec4</code> uniform: a four-component boolean vector.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B59
         */
        BOOL_VEC4 : new Enumeration(0x8B59, 'BOOL_VEC4', {
            glsl : 'bvec4'
        }),

        /**
         * An <code>mat2</code> uniform: a 2x2 floating-point matrix.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B5A
         */
        FLOAT_MAT2 : new Enumeration(0x8B5A, 'FLOAT_MAT2', {
            glsl : 'mat2'
        }),

        /**
         * An <code>mat3</code> uniform: a 3x3 floating-point matrix.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B5B
         */
        FLOAT_MAT3 : new Enumeration(0x8B5B, 'FLOAT_MAT3', {
            glsl :'mat3'
        }),

        /**
         * An <code>mat4</code> uniform: a 4x4 floating-point matrix.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B5C
         */
        FLOAT_MAT4 : new Enumeration(0x8B5C, 'FLOAT_MAT4', {
            glsl : 'mat4'
        }),

        /**
         * A <code>sampler2D</code> uniform: an opaque type to access 2D textures.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B5E
         */
        SAMPLER_2D : new Enumeration(0x8B5E, 'SAMPLER_2D', {
            glsl : 'sampler2D'
        }),

        /**
         * A <code>samplerCube</code> uniform: an opaque type to access cube-map textures.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8B60
         */
        SAMPLER_CUBE : new Enumeration(0x8B60, 'SAMPLER_CUBE', {
            glsl : 'samplerCube'
        })
    };

    return UniformDatatype;
});
