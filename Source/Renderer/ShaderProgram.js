/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        './UniformDatatype'
    ], function(
        DeveloperError,
        RuntimeError,
        destroyObject,
        CesiumMath,
        Matrix2,
        Matrix3,
        Matrix4,
        UniformDatatype) {
    "use strict";
    /*global console*/

    function getUniformDatatype(gl, activeUniformType) {
        switch (activeUniformType) {
        case gl.FLOAT:
            return function() {
                return UniformDatatype.FLOAT;
            };
        case gl.FLOAT_VEC2:
            return function() {
                return UniformDatatype.FLOAT_VECTOR2;
            };
        case gl.FLOAT_VEC3:
            return function() {
                return UniformDatatype.FLOAT_VECTOR3;
            };
        case gl.FLOAT_VEC4:
            return function() {
                return UniformDatatype.FLOAT_VECTOR4;
            };
        case gl.INT:
            return function() {
                return UniformDatatype.INT;
            };
        case gl.INT_VEC2:
            return function() {
                return UniformDatatype.INT_VECTOR2;
            };
        case gl.INT_VEC3:
            return function() {
                return UniformDatatype.INT_VECTOR3;
            };
        case gl.INT_VEC4:
            return function() {
                return UniformDatatype.INT_VECTOR4;
            };
        case gl.BOOL:
            return function() {
                return UniformDatatype.BOOL;
            };
        case gl.BOOL_VEC2:
            return function() {
                return UniformDatatype.BOOL_VECTOR2;
            };
        case gl.BOOL_VEC3:
            return function() {
                return UniformDatatype.BOOL_VECTOR3;
            };
        case gl.BOOL_VEC4:
            return function() {
                return UniformDatatype.BOOL_VECTOR4;
            };
        case gl.FLOAT_MAT2:
            return function() {
                return UniformDatatype.FLOAT_MATRIX2;
            };
        case gl.FLOAT_MAT3:
            return function() {
                return UniformDatatype.FLOAT_MATRIX3;
            };
        case gl.FLOAT_MAT4:
            return function() {
                return UniformDatatype.FLOAT_MATRIX4;
            };
        case gl.SAMPLER_2D:
            return function() {
                return UniformDatatype.SAMPLER_2D;
            };
        case gl.SAMPLER_CUBE:
            return function() {
                return UniformDatatype.SAMPLER_CUBE;
            };
        default:
            throw new RuntimeError('Unrecognized uniform type: ' + activeUniformType);
        }
    }

    /**
     * A shader program's uniform, including the uniform's value.  This is most commonly used to change
     * the value of a uniform, but can also be used retrieve a uniform's name and datatype,
     * which is useful for creating user interfaces for tweaking shaders.
     * <br /><br />
     * Do not create a uniform object with the <code>new</code> keyword; a shader program's uniforms
     * are available via {@link ShaderProgram#getAllUniforms}.
     * <br /><br />
     * Changing a uniform's value will affect future calls to {@link Context#draw}
     * that use the corresponding shader program.
     * <br /><br />
     * The datatype of the <code>value</code> property depends on the datatype
     * used in the GLSL declaration as shown in the examples in the table below.
     * <br /><br />
     * <table border='1'>
     * <tr>
     * <td>GLSL</td>
     * <td>JavaScript</td>
     * </tr>
     * <tr>
     * <td><code>uniform float u_float; </code></td>
     * <td><code> sp.getAllUniforms().u_float.value = 1.0;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec2 u_vec2; </code></td>
     * <td><code> sp.getAllUniforms().u_vec2.value = new Cartesian2(1.0, 2.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec3 u_vec3; </code></td>
     * <td><code> sp.getAllUniforms().u_vec3.value = new Cartesian3(1.0, 2.0, 3.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec4 u_vec4; </code></td>
     * <td><code> sp.getAllUniforms().u_vec4.value = new Cartesian4(1.0, 2.0, 3.0, 4.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform int u_int; </code></td>
     * <td><code> sp.getAllUniforms().u_int.value = 1;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec2 u_ivec2; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec2.value = new Cartesian2(1, 2);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec3 u_ivec3; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec3.value = new Cartesian3(1, 2, 3);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec4 u_ivec4; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec4.value = new Cartesian4(1, 2, 3, 4);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bool u_bool; </code></td>
     * <td><code> sp.getAllUniforms().u_bool.value = true;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec2 u_bvec2; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec2.value = new Cartesian2(true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec3 u_bvec3; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec3.value = new Cartesian3(true, true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec4 u_bvec4; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec4.value = new Cartesian4(true, true, true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat2 u_mat2; </code></td>
     * <td><code> sp.getAllUniforms().u_mat2.value = new Matrix2(1.0, 2.0, 3.0, 4.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat3 u_mat3; </code></td>
     * <td><code> sp.getAllUniforms().u_mat3.value = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat4 u_mat4; </code></td>
     * <td><code> sp.getAllUniforms().u_mat4.value = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform sampler2D u_texture; </code></td>
     * <td><code> sp.getAllUniforms().u_texture.value = context.createTexture2D(...);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform samplerCube u_cubeMap; </code></td>
     * <td><code> sp.getAllUniforms().u_cubeMap.value = context.createCubeMap(...);</code></td>
     * </tr>
     * </table>
     * <br />
     * When the GLSL uniform is declared as an array, <code>value</code> is also an array as shown in Example 2.
     * Individual members of a <code>struct uniform</code> can be accessed as done in Example 3.
     * <br /><br />
     * Uniforms whose names starting with <code>agi_</code>, such as {@link agi_viewProjection}, are called
     * automatic uniforms; they are implicitly declared and automatically assigned to in
     * <code>Context.draw</code> based on the {@link UniformState}.
     *
     * @alias Uniform
     * @internalConstructor
     *
     * @see Uniform#value
     * @see UniformDatatype
     * @see ShaderProgram#getAllUniforms
     * @see UniformState
     * @see Context#draw
     * @see Context#createTexture2D
     * @see Context#createCubeMap
     *
     * @example
     * // Example 1. Create a shader program and set its
     * // one uniform, a 4x4 matrix, to the identity matrix
     * var vs =
     *   'attribute vec4 position; ' +
     *   'uniform mat4 u_mvp; ' +
     *   'void main() { gl_Position = u_mvp * position; }';
     * var fs = // ...
     * var sp = context.createShaderProgram(vs, fs);
     *
     * var mvp = sp.getAllUniforms().u_mvp;
     * console.log(mvp.getName());           // 'u_mvp'
     * console.log(mvp.getDatatype().name);  // 'FLOAT_MATRIX4'
     * mvp.value = Matrix4.IDENTITY;
     *
     * //////////////////////////////////////////////////////////////////////
     *
     * // Example 2. Setting values for a GLSL array uniform
     * // GLSL:  uniform float u_float[2];
     * sp.getAllUniforms().u_float.value = new Cartesian2(1.0, 2.0);
     *
     * // GLSL:  uniform vec4 u_vec4[2];
     * sp.getAllUniforms().u_vec4.value = [
     *   Cartesian4.UNIT_X,
     *   Cartesian4.UNIT_Y
     * ];
     *
     * //////////////////////////////////////////////////////////////////////
     *
     * // Example 3. Setting values for members of a GLSL struct
     * // GLSL:  uniform struct { float f; vec4 v; } u_struct;
     * sp.getAllUniforms()['u_struct.f'].value = 1.0;
     * sp.getAllUniforms()['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
     */
    var Uniform = function(_gl, activeUniform, _uniformName, _location, uniformValue) {
        /**
         * The value of the uniform.  The datatype depends on the datatype used in the
         * GLSL declaration as explained in the {@link Uniform} help and shown
         * in the examples below.
         *
         * @field
         * @alias Uniform#value
         *
         * @see Context#createTexture2D
         *
         * @example
         * // GLSL:  uniform float u_float;
         * sp.getAllUniforms().u_float.value = 1.0;
         *
         * // GLSL:  uniform vec4 u_vec4;
         * sp.getAllUniforms().u_vec4.value = Cartesian4.ZERO;
         *
         * // GLSL:  uniform bvec4 u_bvec4;
         * sp.getAllUniforms().u_bvec4.value = new Cartesian4(true, true, true, true);
         *
         * // GLSL:  uniform mat4 u_mat4;
         * sp.getAllUniforms().u_mat4.value = Matrix4.IDENTITY;
         *
         * // GLSL:  uniform sampler2D u_texture;
         * sp.getAllUniforms().u_texture.value = context.createTexture2D(...);
         *
         * // GLSL:  uniform vec2 u_vec2[2];
         * sp.getAllUniforms().u_vec2.value = [
         *   new Cartesian2(1.0, 2.0),
         *   new Cartesian2(3.0, 4.0)
         * ];
         *
         * // GLSL:  uniform struct { float f; vec4 v; } u_struct;
         * sp.getAllUniforms()['u_struct.f'].value = 1.0;
         * sp.getAllUniforms()['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
         */
        this.value = uniformValue;

        /**
         * Returns the case-sensitive name of the GLSL uniform.
         *
         * @returns {String} The name of the uniform.
         * @function
         * @alias Uniform#getName
         *
         * @example
         * // GLSL: uniform mat4 u_mvp;
         * console.log(sp.getAllUniforms().u_mvp.getName());  // 'u_mvp'
         */
        this.getName = function() {
            return _uniformName;
        };

        /**
         * Returns the datatype of the uniform.  This is useful when dynamically
         * creating a user interface to tweak shader uniform values.
         *
         * @returns {UniformDatatype} The datatype of the uniform.
         * @function
         * @alias Uniform#getDatatype
         *
         * @see UniformDatatype
         *
         * @example
         * // GLSL: uniform mat4 u_mvp;
         * console.log(sp.getAllUniforms().u_mvp.getDatatype().name);  // 'FLOAT_MATRIX4'
         */
        this.getDatatype = getUniformDatatype(_gl, activeUniform.type);

        this._getLocation = function() {
            return _location;
        };

        this._set = function() {
            switch (activeUniform.type) {
            case _gl.FLOAT:
                return function() {
                    _gl.uniform1f(_location, this.value);
                };
            case _gl.FLOAT_VEC2:
                return function() {
                    var v = this.value;
                    _gl.uniform2f(_location, v.x, v.y);
                };
            case _gl.FLOAT_VEC3:
                return function() {
                    var v = this.value;
                    _gl.uniform3f(_location, v.x, v.y, v.z);
                };
            case _gl.FLOAT_VEC4:
                return function() {
                    var v = this.value;

                    if (typeof v.red !== 'undefined') {
                        _gl.uniform4f(_location, v.red, v.green, v.blue, v.alpha);
                    } else if (typeof v.x !== 'undefined') {
                        _gl.uniform4f(_location, v.x, v.y, v.z, v.w);
                    } else {
                        throw new DeveloperError('Invalid vec4 value.');
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                // See _setSampler()
                return undefined;
            case _gl.INT:
            case _gl.BOOL:
                return function() {
                    _gl.uniform1i(_location, this.value);
                };
            case _gl.INT_VEC2:
            case _gl.BOOL_VEC2:
                return function() {
                    var v = this.value;
                    _gl.uniform2i(_location, v.x, v.y);
                };
            case _gl.INT_VEC3:
            case _gl.BOOL_VEC3:
                return function() {
                    var v = this.value;
                    _gl.uniform3i(_location, v.x, v.y, v.z);
                };
            case _gl.INT_VEC4:
            case _gl.BOOL_VEC4:
                return function() {
                    var v = this.value;
                    _gl.uniform4i(_location, v.x, v.y, v.z, v.w);
                };
            case _gl.FLOAT_MAT2:
                return function() {
                    _gl.uniformMatrix2fv(_location, false, Matrix2.toArray(this.value));
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    _gl.uniformMatrix3fv(_location, false, Matrix3.toArray(this.value));
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    _gl.uniformMatrix4fv(_location, false, this.value.values);
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type);
            }
        }();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex);
                _gl.bindTexture(this.value._getTarget(), this.value._getTexture());
                _gl.uniform1i(_location, textureUnitIndex);

                return textureUnitIndex + 1;
            };

            this._clearSampler = function(textureUnitIndex) {
                _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex);
                _gl.bindTexture(this.value._getTarget(), null);

                return textureUnitIndex + 1;
            };
        }
    };

    /**
     * Uniform and UniformArray have the same documentation.  It is just an implementation
     * detail that they are two different types.
     *
     * @alias UniformArray
     * @constructor
     *
     * @see Uniform
     */
    var UniformArray = function(_gl, activeUniform, _uniformName, locations, value) {
        this.value = value;

        var _locations = locations;

        /**
         * @private
         */
        this.getName = function() {
            return _uniformName;
        };

        this.getDatatype = getUniformDatatype(_gl, activeUniform.type);

        this._getLocations = function() {
            return _locations;
        };

        this._set = function() {
            switch (activeUniform.type) {
            case _gl.FLOAT:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniform1f(_locations[i], this.value[i]);
                    }
                };
            case _gl.FLOAT_VEC2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform2f(_locations[i], v.x, v.y);
                    }
                };
            case _gl.FLOAT_VEC3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform3f(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.FLOAT_VEC4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];

                        if (typeof v.red !== 'undefined') {
                            _gl.uniform4f(_locations[i], v.red, v.green, v.blue, v.alpha);
                        } else if (typeof v.x !== 'undefined') {
                            _gl.uniform4f(_locations[i], v.x, v.y, v.z, v.w);
                        } else {
                            throw new DeveloperError('Invalid vec4 value.');
                        }
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                // See _setSampler()
                return undefined;
            case _gl.INT:
            case _gl.BOOL:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniform1i(_locations[i], this.value[i]);
                    }
                };
            case _gl.INT_VEC2:
            case _gl.BOOL_VEC2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform2i(_locations[i], v.x, v.y);
                    }
                };
            case _gl.INT_VEC3:
            case _gl.BOOL_VEC3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform3i(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.INT_VEC4:
            case _gl.BOOL_VEC4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform4i(_locations[i], v.x, v.y, v.z, v.w);
                    }
                };
            case _gl.FLOAT_MAT2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix2fv(_locations[i], false, Matrix2.toArray(this.value[i]));
                    }
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix3fv(_locations[i], false, Matrix3.toArray(this.value[i]));
                    }
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix4fv(_locations[i], false, this.value[i].values);
                    }
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type);
            }
        }();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                for ( var i = 0; i < _locations.length; ++i) {
                    var index = textureUnitIndex + i;
                    _gl.activeTexture(_gl.TEXTURE0 + index);
                    _gl.bindTexture(this.value[i]._getTarget(), this.value[i]._getTexture());
                    _gl.uniform1i(_locations[i], index);
                }

                return textureUnitIndex + _locations.length;
            };

            this._clearSampler = function(textureUnitIndex) {
                for ( var i = 0; i < _locations.length; ++i) {
                    _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex + i);
                    _gl.bindTexture(this.value[i]._getTarget(), null);
                }

                return textureUnitIndex + _locations.length;
            };
        }
    };

    /**
     * DOC_TBA
     *
     * @alias ShaderProgram
     * @internalConstructor
     *
     * @see Context#createShaderProgram
     * @see Context#getShaderCache
     */
    var ShaderProgram = function(gl, logShaderCompilation, builtInGlslFunctions, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        var getAllAutomaticUniforms = function() {
            var uniforms = {
                /**
                 * An automatic GLSL uniform containing the viewport's <code>x</code>, <code>y</code>, <code>width</code>,
                 * and <code>height</code> properties in an <code>ivec4</code>'s <code>x</code>, <code>y</code>, <code>z</code>,
                 * and <code>w</code> components, respectively.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_viewport</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_viewport
                 * @glslUniform
                 *
                 * @see Context#getViewport
                 *
                 * @example
                 * // GLSL declaration
                 * uniform ivec4 agi_viewport;
                 *
                 * // Scale the window coordinate components to [0, 1] by dividing
                 * // by the viewport's width and height.
                 * vec2 v = gl_FragCoord.xy / agi_viewport.zw;
                 */
                agi_viewport : {
                    /**
                     * @private
                     */
                    getSize : function() {
                        return 1;
                    },

                    /**
                     * @private
                     */
                    getDatatype : function() {
                        return UniformDatatype.INT_VECTOR4;
                    },

                    /**
                     * @private
                     */
                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                var v = uniformState.getContext().getViewport();
                                uniform.value = {
                                    x : v.x,
                                    y : v.y,
                                    z : v.width,
                                    w : v.height
                                };
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 orthographic projection matrix that
                 * transforms window coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.
                 * <br /><br />
                 * This transform is useful when a vertex shader inputs or manipulates window coordinates
                 * as done by {@link BillboardCollection}.
                 * <br /><br />
                 * Do not confuse {@link agi_viewportTransformation} with <code>agi_viewportOrthographic</code>.
                 * The former transforms from normalized device coordinates to window coordinates; the later transforms
                 * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_viewportOrthographic</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_viewportOrthographic
                 * @glslUniform
                 *
                 * @see UniformState#getViewportOrthographic
                 * @see agi_viewport
                 * @see agi_viewportTransformation
                 * @see BillboardCollection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_viewportOrthographic;
                 *
                 * // Example
                 * gl_Position = agi_viewportOrthographic * vec4(windowPosition, 0.0, 1.0);
                 */
                agi_viewportOrthographic : {
                    /**
                     * @private
                     */
                    getSize : function() {
                        return 1;
                    },

                    /**
                     * @private
                     */
                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    /**
                     * @private
                     */
                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getViewportOrthographic();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 transformation matrix that
                 * transforms normalized device coordinates to window coordinates.  The context's
                 * full viewport is used, and the depth range is assumed to be <code>near = 0</code>
                 * and <code>far = 1</code>.
                 * <br /><br />
                 * This transform is useful when there is a need to manipulate window coordinates
                 * in a vertex shader as done by {@link BillboardCollection}.  In many cases,
                 * this matrix will not be used directly; instead, {@link agi_modelToWindowCoordinates}
                 * will be used to transform directly from model to window coordinates.
                 * <br /><br />
                 * Do not confuse <code>agi_viewportTransformation</code> with {@link agi_viewportOrthographic}.
                 * The former transforms from normalized device coordinates to window coordinates; the later transforms
                 * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_viewportTransformation</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_viewportTransformation
                 * @glslUniform
                 *
                 * @see UniformState#getViewportTransformation
                 * @see agi_viewport
                 * @see agi_viewportOrthographic
                 * @see agi_modelToWindowCoordinates
                 * @see BillboardCollection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_viewportTransformation;
                 *
                 * // Use agi_viewportTransformation as part of the
                 * // transform from model to window coordinates.
                 * vec4 q = agi_modelViewProjection * positionMC;              // model to clip coordinates
                 * q.xyz /= q.w;                                                // clip to normalized device coordinates (ndc)
                 * q.xyz = (agi_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // ndc to window coordinates
                 */
                agi_viewportTransformation : {
                    /**
                     * @private
                     */
                    getSize : function() {
                        return 1;
                    },

                    /**
                     * @private
                     */
                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    /**
                     * @private
                     */
                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getViewportTransformation();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 model transformation matrix that
                 * transforms model coordinates to world coordinates.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_model</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_model
                 * @glslUniform
                 *
                 * @see UniformState#getModel
                 * @see agi_modelView
                 * @see agi_modelViewProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_model;
                 *
                 * // Example
                 * vec4 worldPosition = agi_model * modelPosition;
                 */
                agi_model : {
                    /**
                     * @private
                     */
                    getSize : function() {
                        return 1;
                    },

                    /**
                     * @private
                     */
                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    /**
                     * @private
                     */
                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getModel();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 transformation matrix that
                 * transforms from eye coordinates to world coordinates.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_inverseView</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_inverseView
                 * @glslUniform
                 *
                 * @see UniformState#getInverseView
                 * @see agi_view
                 * @see agi_inverseNormal
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_inverseView;
                 *
                 * // Example
                 * vec4 worldPosition = agi_inverseView * eyePosition;
                 */
                agi_inverseView : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInverseView();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 view transformation matrix that
                 * transforms world coordinates to eye coordinates.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_view</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_view
                 * @glslUniform
                 *
                 * @see UniformState#getView
                 * @see agi_modelView
                 * @see agi_viewProjection
                 * @see agi_modelViewProjection
                 * @see agi_inverseView
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_view;
                 *
                 * // Example
                 * vec4 eyePosition = agi_view * worldPosition;
                 */
                agi_view : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getView();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 projection transformation matrix that
                 * transforms eye coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_projection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_projection
                 * @glslUniform
                 *
                 * @see UniformState#getProjection
                 * @see agi_viewProjection
                 * @see agi_modelViewProjection
                 * @see agi_infiniteProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_projection;
                 *
                 * // Example
                 * gl_Position = agi_projection * eyePosition;
                 */
                agi_projection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 inverse projection transformation matrix that
                 * transforms from clip coordinates to eye coordinates. Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_inverseProjection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_inverseProjection
                 * @glslUniform
                 *
                 * @see UniformState#getInverseProjection
                 * @see agi_projection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_inverseProjection;
                 *
                 * // Example
                 * vec4 eyePosition = agi_inverseProjection * clipPosition;
                 */
                agi_inverseProjection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInverseProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 projection transformation matrix with the far plane at infinity,
                 * that transforms eye coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.  An infinite far plane is used
                 * in algorithms like shadow volumes and GPU ray casting with proxy geometry to ensure that triangles
                 * are not clipped by the far plane.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_infiniteProjection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_infiniteProjection
                 * @glslUniform
                 *
                 * @see UniformState#getInfiniteProjection
                 * @see agi_projection
                 * @see agi_modelViewInfiniteProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_infiniteProjection;
                 *
                 * // Example
                 * gl_Position = agi_infiniteProjection * eyePosition;
                 */
                agi_infiniteProjection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInfiniteProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
                 * transforms model coordinates to eye coordinates.
                 * <br /><br />
                 * Positions should be transformed to eye coordinates using <code>agi_modelView</code> and
                 * normals should be transformed using {@link agi_normal}.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_modelView</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_modelView
                 * @glslUniform
                 *
                 * @see UniformState#getModelView
                 * @see agi_model
                 * @see agi_view
                 * @see agi_modelViewProjection
                 * @see agi_normal
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_modelView;
                 *
                 * // Example
                 * vec4 eyePosition = agi_modelView * modelPosition;
                 *
                 * // The above is equivalent to, but more efficient than:
                 * vec4 eyePosition = agi_view * agi_model * modelPosition;
                 */
                agi_modelView : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getModelView();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 transformation matrix that
                 * transforms from eye coordinates to model coordinates.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_inverseModelView</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_inverseModelView
                 * @glslUniform
                 *
                 * @see UniformState#getInverseModelView
                 * @see agi_modelView
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_inverseModelView;
                 *
                 * // Example
                 * vec4 modelPosition = agi_inverseModelView * eyePosition;
                 */
                agi_inverseModelView : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInverseModelView();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
                 * transforms world coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_viewProjection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_viewProjection
                 * @glslUniform
                 *
                 * @see UniformState#getViewProjection
                 * @see agi_view
                 * @see agi_projection
                 * @see agi_modelViewProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_viewProjection;
                 *
                 * // Example
                 * vec4 gl_Position = agi_viewProjection * agi_model * modelPosition;
                 *
                 * // The above is equivalent to, but more efficient than:
                 * gl_Position = agi_projection * agi_view * agi_model * modelPosition;
                 */
                agi_viewProjection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getViewProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
                 * transforms model coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_modelViewProjection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_modelViewProjection
                 * @glslUniform
                 *
                 * @see UniformState#getModelViewProjection
                 * @see agi_model
                 * @see agi_view
                 * @see agi_projection
                 * @see agi_modelView
                 * @see agi_viewProjection
                 * @see agi_modelViewInfiniteProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_modelViewProjection;
                 *
                 * // Example
                 * vec4 gl_Position = agi_modelViewProjection * modelPosition;
                 *
                 * // The above is equivalent to, but more efficient than:
                 * gl_Position = agi_projection * agi_view * agi_model * modelPosition;
                 */
                agi_modelViewProjection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getModelViewProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
                 * transforms model coordinates to clip coordinates.  Clip coordinates is the
                 * coordinate system for a vertex shader's <code>gl_Position</code> output.  The projection matrix places
                 * the far plane at infinity.  This is useful in algorithms like shadow volumes and GPU ray casting with
                 * proxy geometry to ensure that triangles are not clipped by the far plane.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_modelViewInfiniteProjection</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_modelViewInfiniteProjection
                 * @glslUniform
                 *
                 * @see UniformState#getModelViewInfiniteProjection
                 * @see agi_model
                 * @see agi_view
                 * @see agi_infiniteProjection
                 * @see agi_modelViewProjection
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat4 agi_modelViewInfiniteProjection;
                 *
                 * // Example
                 * vec4 gl_Position = agi_modelViewInfiniteProjection * modelPosition;
                 *
                 * // The above is equivalent to, but more efficient than:
                 * gl_Position = agi_infiniteProjection * agi_view * agi_model * modelPosition;
                 */
                agi_modelViewInfiniteProjection : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX4;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getModelViewInfiniteProjection();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
                 * transforms normal vectors in model coordinates to eye coordinates.
                 * <br /><br />
                 * Positions should be transformed to eye coordinates using {@link agi_modelView} and
                 * normals should be transformed using <code>agi_normal</code>.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_normal</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_normal
                 * @glslUniform
                 *
                 * @see UniformState#getNormal
                 * @see agi_inverseNormal
                 * @see agi_modelView
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat3 agi_normal;
                 *
                 * // Example
                 * vec3 eyeNormal = agi_normal * normal;
                 */
                agi_normal : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX3;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getNormal();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
                 * transforms normal vectors in eye coordinates to model coordinates.  This is
                 * in the opposite transform provided by {@link agi_normal}.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_inverseNormal</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_inverseNormal
                 * @glslUniform
                 *
                 * @see UniformState#getInverseNormal
                 * @see agi_normal
                 * @see agi_modelView
                 * @see agi_inverseView
                 *
                 * @example
                 * // GLSL declaration
                 * uniform mat3 agi_inverseNormal;
                 *
                 * // Example
                 * vec3 normalMC = agi_inverseNormal * normalEC;
                 */
                agi_inverseNormal : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_MATRIX3;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInverseNormal();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing the direction of the sun in eye coordinates.
                 * This is commonly used for directional lighting computations.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_sunDirectionEC</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_sunDirectionEC
                 * @glslUniform
                 *
                 * @see UniformState#getSunDirectionEC
                 * @see agi_sunDirectionWC
                 *
                 * @example
                 * // GLSL declaration
                 * uniform vec3 agi_sunDirectionEC;
                 *
                 * // Example
                 * float diffuse = max(dot(agi_sunDirectionEC, normalEC), 0.0);
                 */
                agi_sunDirectionEC : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_VECTOR3;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getSunDirectionEC();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing a normalized vector from the origin
                 * in world coordinates to the sun.  This is commonly used for lighting computations.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_sunDirectionWC</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_sunDirectionWC
                 * @glslUniform
                 *
                 * @see UniformState#getSunDirectionWC
                 * @see agi_sunDirectionEC
                 *
                 * @example
                 * // GLSL declaration
                 * uniform vec3 agi_sunDirectionWC;
                 */
                agi_sunDirectionWC : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_VECTOR3;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getSunDirectionWC();
                            }
                        };
                    }
                },

                /**
                 * An automatic GLSL uniform representing the position of the viewer (camera) in world coordinates.
                 * <br /><br />
                 * Like all automatic uniforms, <code>agi_sunDirectionWC</code> does not need to be explicitly declared.
                 * However, it can be explicitly declared when a shader is also used by other applications such
                 * as a third-party authoring tool.
                 *
                 * @alias agi_viewerPositionWC
                 * @glslUniform
                 *
                 * @example
                 * // GLSL declaration
                 * uniform vec3 agi_viewerPositionWC;
                 */
                agi_viewerPositionWC : {
                    getSize : function() {
                        return 1;
                    },

                    getDatatype : function() {
                        return UniformDatatype.FLOAT_VECTOR3;
                    },

                    create : function(uniform) {
                        return {
                            _set : function(uniformState) {
                                uniform.value = uniformState.getInverseView().getTranslation();
                            }
                        };
                    }
                }

            };

            getAllAutomaticUniforms = function() {
                return uniforms;
            };

            return uniforms;
        };

        function extractShaderVersion(source) {
            // This will fail if the first #version is actually in a comment.
            var index = source.indexOf('#version');
            if (index !== -1) {
                var newLineIndex = source.indexOf('\n', index);

                // We could throw an exception if there is not a new line after
                // #version, but the GLSL compiler will catch it.
                if (index !== -1) {
                    // Extract #version directive, including the new line.
                    var version = source.substring(index, newLineIndex + 1);

                    // Comment out original #version directive so the line numbers
                    // are not off by one.  There can be only one #version directive
                    // and it must appear at the top of the source, only preceded by
                    // whitespace and comments.
                    var modified = source.substring(0, index) + '//' + source.substring(index);

                    return {
                        versionDirective : version,
                        modifiedSource : modified
                    };
                }
            }

            return {
                versionDirective : '', // defaults to #version 100
                modifiedSource : source // no modifications required
            };
        }

        function getAutomaticUniformDeclaration(uniforms, uniform) {
            var factory = uniforms[uniform];
            var declaration = 'uniform ' + factory.getDatatype().getGLSL() + ' ' + uniform;

            var size = factory.getSize();
            if (size === 1) {
                declaration += ';';
            } else {
                declaration += '[' + size.toString() + '];';
            }

            return declaration;
        }

        function commentOutAutomaticUniforms(source) {
            // Comment out automatic uniforms that the user may have declared, perhaps
            // because the shader was authored in a third-party tool like RenderMonkey.
            // At runtime, all automatic uniforms are declared by the engine itself.

            // This function has problems if the automatic uniform was declared with the
            // wrong datatype or with extra whitespace or comments in the declaration.

            var modifiedSource = source;
            var uniforms = getAllAutomaticUniforms();
            for ( var uniform in uniforms) {
                if (uniforms.hasOwnProperty(uniform)) {
                    var declaration = getAutomaticUniformDeclaration(uniforms, uniform);
                    var index = modifiedSource.indexOf(declaration);
                    if (index !== -1) {
                        modifiedSource =
                            modifiedSource.substring(0, index) +
                            '/*' +
                            modifiedSource.substring(index, declaration.length) +
                            '*/' +
                            modifiedSource.substring(index + declaration.length);
                    }
                }
            }

            return modifiedSource;
        }

        function getFragmentShaderPrecision() {
            // TODO: Performance?
            return '#ifdef GL_FRAGMENT_PRECISION_HIGH \n' +
                   '  precision highp float; \n' +
                   '#else \n' +
                   '  precision mediump float; \n' +
                   '#endif \n\n';
        }

        function getBuiltinConstants() {
            var constants = {
                /**
                 * A built-in GLSL floating-point constant for <code>Math.PI</code>.
                 *
                 * @alias agi_pi
                 * @glslConstant
                 *
                 * @see CesiumMath.PI
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_pi = ...;
                 *
                 * // Example
                 * float twoPi = 2.0 * agi_pi;
                 */
                agi_pi : Math.PI.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>1/pi</code>.
                 *
                 * @alias agi_oneOverPi
                 * @glslConstant
                 *
                 * @see CesiumMath.ONE_OVER_PI
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_oneOverPi = ...;
                 *
                 * // Example
                 * float pi = 1.0 / agi_oneOverPi;
                 */
                agi_oneOverPi : CesiumMath.ONE_OVER_PI.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>pi/2</code>.
                 *
                 * @alias agi_piOverTwo
                 * @glslConstant
                 *
                 * @see CesiumMath.PI_OVER_TWO
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_piOverTwo = ...;
                 *
                 * // Example
                 * float pi = 2.0 * agi_piOverTwo;
                 */
                agi_piOverTwo : CesiumMath.PI_OVER_TWO.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>pi/3</code>.
                 *
                 * @alias agi_piOverThree
                 * @glslConstant
                 *
                 * @see CesiumMath.PI_OVER_THREE
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_piOverThree = ...;
                 *
                 * // Example
                 * float pi = 3.0 * agi_piOverThree;
                 */
                agi_piOverThree : CesiumMath.PI_OVER_THREE.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>pi/4</code>.
                 *
                 * @alias agi_piOverFour
                 * @glslConstant
                 *
                 * @see CesiumMath.PI_OVER_FOUR
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_piOverFour = ...;
                 *
                 * // Example
                 * float pi = 4.0 * agi_piOverFour;
                 */
                agi_piOverFour : CesiumMath.PI_OVER_FOUR.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>pi/6</code>.
                 *
                 * @alias agi_piOverSix
                 * @glslConstant
                 *
                 * @see CesiumMath.PI_OVER_SIX
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_piOverSix = ...;
                 *
                 * // Example
                 * float pi = 6.0 * agi_piOverSix;
                 */
                agi_piOverSix : CesiumMath.PI_OVER_SIX.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>3pi/2</code>.
                 *
                 * @alias agi_threePiOver2
                 * @glslConstant
                 *
                 * @see CesiumMath.THREE_PI_OVER_TWO
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_threePiOver2 = ...;
                 *
                 * // Example
                 * float pi = (2.0 / 3.0) * agi_threePiOver2;
                 */
                agi_threePiOver2 : CesiumMath.THREE_PI_OVER_TWO.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>2pi</code>.
                 *
                 * @alias agi_twoPi
                 * @glslConstant
                 *
                 * @see CesiumMath.TWO_PI
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_twoPi = ...;
                 *
                 * // Example
                 * float pi = agi_twoPi / 2.0;
                 */
                agi_twoPi : CesiumMath.TWO_PI.toString(),

                /**
                 * A built-in GLSL floating-point constant for <code>1/2pi</code>.
                 *
                 * @alias agi_oneOverTwoPi
                 * @glslConstant
                 *
                 * @see CesiumMath.ONE_OVER_TWO_PI
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_oneOverTwoPi = ...;
                 *
                 * // Example
                 * float pi = 2.0 * agi_oneOverTwoPi;
                 */
                agi_oneOverTwoPi : CesiumMath.ONE_OVER_TWO_PI.toString(),

                /**
                 * A built-in GLSL floating-point constant for converting degrees to radians.
                 *
                 * @alias agi_radiansPerDegree
                 * @glslConstant
                 *
                 * @see CesiumMath.RADIANS_PER_DEGREE
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_radiansPerDegree = ...;
                 *
                 * // Example
                 * float rad = agi_radiansPerDegree * deg;
                 */
                agi_radiansPerDegree : CesiumMath.RADIANS_PER_DEGREE.toString(),

                /**
                 * A built-in GLSL floating-point constant for converting radians to degrees.
                 *
                 * @alias agi_degreesPerRadian
                 * @glslConstant
                 *
                 * @see CesiumMath.DEGREES_PER_RADIAN
                 *
                 * @example
                 * // GLSL declaration
                 * const float agi_degreesPerRadian = ...;
                 *
                 * // Example
                 * float deg = agi_degreesPerRadian * rad;
                 */
                agi_degreesPerRadian : CesiumMath.DEGREES_PER_RADIAN.toString()
            };

            var glslConstants = '';
            for ( var name in constants) {
                if (constants.hasOwnProperty(name)) {
                    glslConstants += 'const float ' + name + ' = ' + constants[name] + '; \n';
                }
            }
            glslConstants += ' \n';

            return glslConstants;
        }

        function getAutomaticUniforms() {
            var automatics = '';

            var uniforms = getAllAutomaticUniforms();
            for ( var uniform in uniforms) {
                if (uniforms.hasOwnProperty(uniform)) {
                    automatics += getAutomaticUniformDeclaration(uniforms, uniform) + ' \n';
                }
            }
            automatics += '\n';

            return automatics;
        }

        var getShaderDefinitions = function() {
            // I think this should be #line 1 given what the GL ES spec says:
            //
            //   After processing this directive (including its new-line), the implementation will
            //   behave as if the following line has line number line...
            //
            // But this works, at least on NVIDIA hardware.

            // Functions after constants and uniforms because functions depend on them.
            var definitions = getBuiltinConstants() +
                              getAutomaticUniforms() +
                              builtInGlslFunctions + '\n\n' +
                              '#line 0 \n';

            getShaderDefinitions = function() {
                return definitions;
            };

            return definitions;
        };

        function createAndLinkProgram() {
            var vsSourceVersioned = extractShaderVersion(vertexShaderSource);
            var fsSourceVersioned = extractShaderVersion(fragmentShaderSource);

            var vsSource = vsSourceVersioned.versionDirective +
                           getShaderDefinitions() +
                           commentOutAutomaticUniforms(vsSourceVersioned.modifiedSource);
            var fsSource = fsSourceVersioned.versionDirective +
                           getFragmentShaderPrecision() +
                           getShaderDefinitions() +
                           commentOutAutomaticUniforms(fsSourceVersioned.modifiedSource);

            var vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vsSource);
            gl.compileShader(vertexShader);
            var vsLog = gl.getShaderInfoLog(vertexShader);

            if (logShaderCompilation && vsLog && vsLog.length) {
                console.log('[GL] Vertex shader compile log: ' + vsLog);
            }

            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                gl.deleteShader(vertexShader);
                console.error('[GL] Vertex shader compile log: ' + vsLog);
                throw new RuntimeError('Vertex shader failed to compile.  Compile log: ' + vsLog);
            }

            var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fsSource);
            gl.compileShader(fragmentShader);
            var fsLog = gl.getShaderInfoLog(fragmentShader);

            if (logShaderCompilation && fsLog && fsLog.length) {
                console.log('[GL] Fragment shader compile log: ' + fsLog);
            }

            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                console.error('[GL] Fragment shader compile log: ' + fsLog);
                throw new RuntimeError('Fragment shader failed to compile.  Compile log: ' + fsLog);
            }

            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);

            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            if (attributeLocations) {
                for ( var attribute in attributeLocations) {
                    if (attributeLocations.hasOwnProperty(attribute)) {
                        gl.bindAttribLocation(program, attributeLocations[attribute], attribute);
                    }
                }
            }

            gl.linkProgram(program);
            var linkLog = gl.getProgramInfoLog(program);

            if (logShaderCompilation && linkLog && linkLog.length) {
                console.log('[GL] Shader program link log: ' + linkLog);
            }

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                gl.deleteProgram(program);
                console.error('[GL] Shader program link log: ' + linkLog);
                throw new RuntimeError('Program failed to link.  Link log: ' + linkLog);
            }

            return program;
        }

        function findVertexAttributes(program, numberOfAttributes) {
            var attributes = {};
            for ( var i = 0; i < numberOfAttributes; ++i) {
                var attr = gl.getActiveAttrib(program, i);
                var location = gl.getAttribLocation(program, attr.name);

                attributes[attr.name] = {
                    name : attr.name,
                    type : attr.type,
                    index : location
                };
            }

            return attributes;
        }

        function findUniforms(program) {
            var allUniforms = {};
            var uniforms = [];
            var samplerUniforms = [];

            var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

            for ( var i = 0; i < numberOfUniforms; ++i) {
                var activeUniform = gl.getActiveUniform(program, i);
                var suffix = '[0]';
                var uniformName =
                    activeUniform.name.indexOf(suffix, activeUniform.name.length - suffix.length) !== -1 ? activeUniform.name.slice(0, activeUniform.name.length - 3) : activeUniform.name;

                // Ignore GLSL built-in uniforms returned in Firefox.
                if (uniformName.indexOf('gl_') !== 0) {
                    if (activeUniform.size === 1) {
                        // Single uniform
                        var location = gl.getUniformLocation(program, uniformName);
                        var uniformValue = gl.getUniform(program, location);
                        var uniform = new Uniform(gl, activeUniform, uniformName, location, uniformValue);

                        allUniforms[uniformName] = uniform;

                        if (uniform._setSampler) {
                            samplerUniforms.push(uniform);
                        } else {
                            uniforms.push(uniform);
                        }
                    } else {
                        // Uniform array
                        var locations = [];
                        var value = [];
                        for ( var j = 0; j < activeUniform.size; ++j) {
                            var loc = gl.getUniformLocation(program, uniformName + '[' + j + ']');
                            locations.push(loc);
                            value.push(gl.getUniform(program, loc));
                        }
                        var uniformArray = new UniformArray(gl, activeUniform, uniformName, locations, value);

                        allUniforms[uniformName] = uniformArray;

                        if (uniformArray._setSampler) {
                            samplerUniforms.push(uniformArray);
                        } else {
                            uniforms.push(uniformArray);
                        }
                    }
                }
            }

            return {
                allUniforms : allUniforms,
                uniforms : uniforms,
                samplerUniforms : samplerUniforms
            };
        }

        function findAutomaticUniforms(uniforms) {
            var automaticUniforms = [];
            var manualUniforms = {};

            var allAutomaticUniforms = getAllAutomaticUniforms();

            for ( var uniform in uniforms) {
                if (uniforms.hasOwnProperty(uniform)) {
                    var factory = allAutomaticUniforms[uniform];
                    if (factory) {
                        automaticUniforms.push(factory.create(uniforms[uniform]));
                    } else {
                        manualUniforms[uniform] = uniforms[uniform];
                    }
                }
            }

            return {
                automaticUniforms : automaticUniforms,
                manualUniforms : manualUniforms
            };
        }

        var _program = createAndLinkProgram();
        var _numberOfVertexAttributes = gl.getProgramParameter(_program, gl.ACTIVE_ATTRIBUTES);
        var _vertexAttributes = findVertexAttributes(_program, _numberOfVertexAttributes);
        var uniforms = findUniforms(_program);
        var _allUniforms = uniforms.allUniforms;
        var _uniforms = uniforms.uniforms;
        var _samplerUniforms = uniforms.samplerUniforms;
        var automaticUniforms = findAutomaticUniforms(_allUniforms);
        var _automaticUniforms = automaticUniforms.automaticUniforms;
        var _manualUniforms = automaticUniforms.manualUniforms;

        this._getProgram = function() {
            return _program;
        };

        /**
        * DOC_TBA
        *
        * @return {Object} DOC_TBA
        * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
        */
        this.getVertexAttributes = function() {
            return _vertexAttributes;
        };

        /**
        * DOC_TBA
        *
        * @return {Number} DOC_TBA
        * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
        */
        this.getNumberOfVertexAttributes = function() {
            return _numberOfVertexAttributes;
        };

        /**
        * DOC_TBA
        *
        * @return {Object} DOC_TBA
        *
        * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
        *
        * @see ShaderProgram#getManualUniforms
        */
        this.getAllUniforms = function() {
            return _allUniforms;
        };

        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
         *
         * @see ShaderProgram#getAllUniforms
         */
        this.getManualUniforms = function() {
            return _manualUniforms;
        };

        this._bind = function() {
            gl.useProgram(_program);
        };

        this._setUniforms = function(uniformMap, uniformState) {
            // TODO: Performance

            var len;
            var i;

            if (uniformMap) {
                uniformState.setModel(uniformMap.u_model ? uniformMap.u_model() : Matrix4.IDENTITY);

                for ( var uniform in _manualUniforms) {
                    if (_manualUniforms.hasOwnProperty(uniform)) {
                        _manualUniforms[uniform].value = uniformMap[uniform]();
                    }
                }
            }

            len = _automaticUniforms.length;
            for (i = 0; i < len; ++i) {
                _automaticUniforms[i]._set(uniformState);
            }

            ///////////////////////////////////////////////////////////////////

            len = _uniforms.length;
            for (i = 0; i < len; ++i) {
                _uniforms[i]._set();
            }

            var textureUnitIndex = 0;
            len = _samplerUniforms.length;
            for (i = 0; i < len; ++i) {
                textureUnitIndex = _samplerUniforms[i]._setSampler(textureUnitIndex);
            }
        };

        this._unBind = function() {
            gl.useProgram(null);

            var textureUnitIndex = 0;
            var len = _samplerUniforms.length;
            for ( var i = 0; i < len; ++i) {
                textureUnitIndex = _samplerUniforms[i]._clearSampler(textureUnitIndex);
            }
        };

        /**
         * Returns true if this object was destroyed; otherwise, false.
         * <br /><br />
         * If this object was destroyed, it should not be used; calling any function other than
         * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
         *
         * @return {Boolean} True if this object was destroyed; otherwise, false.
         *
         * @see ShaderProgram.destroy
         */
        this.isDestroyed = function() {
            return false;
        };

        /**
         * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
         * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
         * <br /><br />
         * Once an object is destroyed, it should not be used; calling any function other than
         * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
         * assign the return value (<code>undefined</code>) to the object as done in the example.
         *
         * @return {undefined}
         *
         * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
         *
         * @see ShaderProgram.isDestroyed
         * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteShader.xml'>glDeleteShader</a>
         * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteProgram.xml'>glDeleteProgram</a>
         *
         * @example
         * shaderProgram = shaderProgram && shaderProgram.destroy();
         */
        this.destroy = function() {
            gl.deleteProgram(_program);
            return destroyObject(this);
        };

        /**
         * DOC_TBA
         */
        this.release = function() {
            if (this._cachedShader) {
                return this._cachedShader.cache.releaseShaderProgram(this);
            }

            return this.destroy();
        };

        return null;
    };

    return ShaderProgram;
});
