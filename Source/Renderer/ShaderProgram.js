/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/RuntimeError',
        '../Core/destroyObject',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        './AutomaticUniforms',
        './UniformDatatype',
        '../Shaders/Builtin/CzmBuiltins'
    ], function(
        defined,
        DeveloperError,
        FeatureDetection,
        RuntimeError,
        destroyObject,
        Matrix2,
        Matrix3,
        Matrix4,
        AutomaticUniforms,
        UniformDatatype,
        CzmBuiltins) {
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
                return UniformDatatype.FLOAT_VEC2;
            };
        case gl.FLOAT_VEC3:
            return function() {
                return UniformDatatype.FLOAT_VEC3;
            };
        case gl.FLOAT_VEC4:
            return function() {
                return UniformDatatype.FLOAT_VEC4;
            };
        case gl.INT:
            return function() {
                return UniformDatatype.INT;
            };
        case gl.INT_VEC2:
            return function() {
                return UniformDatatype.INT_VEC2;
            };
        case gl.INT_VEC3:
            return function() {
                return UniformDatatype.INT_VEC3;
            };
        case gl.INT_VEC4:
            return function() {
                return UniformDatatype.INT_VEC4;
            };
        case gl.BOOL:
            return function() {
                return UniformDatatype.BOOL;
            };
        case gl.BOOL_VEC2:
            return function() {
                return UniformDatatype.BOOL_VEC2;
            };
        case gl.BOOL_VEC3:
            return function() {
                return UniformDatatype.BOOL_VEC3;
            };
        case gl.BOOL_VEC4:
            return function() {
                return UniformDatatype.BOOL_VEC4;
            };
        case gl.FLOAT_MAT2:
            return function() {
                return UniformDatatype.FLOAT_MAT2;
            };
        case gl.FLOAT_MAT3:
            return function() {
                return UniformDatatype.FLOAT_MAT3;
            };
        case gl.FLOAT_MAT4:
            return function() {
                return UniformDatatype.FLOAT_MAT4;
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

    var scratchUniformMatrix2;
    var scratchUniformMatrix3;
    var scratchUniformMatrix4;
    if (FeatureDetection.supportsTypedArrays()) {
        scratchUniformMatrix2 = new Float32Array(4);
        scratchUniformMatrix3 = new Float32Array(9);
        scratchUniformMatrix4 = new Float32Array(16);
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
     * Uniforms whose names starting with <code>czm_</code>, such as {@link czm_viewProjection}, are called
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
     * console.log(mvp.getDatatype().name);  // 'FLOAT_MAT4'
     * mvp.value = Cesium.Matrix4.IDENTITY;
     *
     * //////////////////////////////////////////////////////////////////////
     *
     * // Example 2. Setting values for a GLSL array uniform
     * // GLSL:  uniform float u_float[2];
     * sp.getAllUniforms().u_float.value = new Cesium.Cartesian2(1.0, 2.0);
     *
     * // GLSL:  uniform vec4 u_vec4[2];
     * sp.getAllUniforms().u_vec4.value = [
     *   Cesium.Cartesian4.UNIT_X,
     *   Cesium.Cartesian4.UNIT_Y
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
         * sp.getAllUniforms().u_vec4.value = Cesium.Cartesian4.ZERO;
         *
         * // GLSL:  uniform bvec4 u_bvec4;
         * sp.getAllUniforms().u_bvec4.value = new Cesium.Cartesian4(true, true, true, true);
         *
         * // GLSL:  uniform mat4 u_mat4;
         * sp.getAllUniforms().u_mat4.value = Cesium.Matrix4.IDENTITY;
         *
         * // GLSL:  uniform sampler2D u_texture;
         * sp.getAllUniforms().u_texture.value = context.createTexture2D(...);
         *
         * // GLSL:  uniform vec2 u_vec2[2];
         * sp.getAllUniforms().u_vec2.value = [
         *   new Cesium.Cartesian2(1.0, 2.0),
         *   new Cesium.Cartesian2(3.0, 4.0)
         * ];
         *
         * // GLSL:  uniform struct { float f; vec4 v; } u_struct;
         * sp.getAllUniforms()['u_struct.f'].value = 1.0;
         * sp.getAllUniforms()['u_struct.v'].value = new Cesium.Cartesian4(1.0, 2.0, 3.0, 4.0);
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
         * console.log(sp.getAllUniforms().u_mvp.getDatatype().name);  // 'FLOAT_MAT4'
         */
        this.getDatatype = getUniformDatatype(_gl, activeUniform.type);

        this._getLocation = function() {
            return _location;
        };

        /**
         * @private
         */
        this.textureUnitIndex = undefined;

        this._set = (function() {
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

                    if (defined(v.red)) {
                        _gl.uniform4f(_location, v.red, v.green, v.blue, v.alpha);
                    } else if (defined(v.x)) {
                        _gl.uniform4f(_location, v.x, v.y, v.z, v.w);
                    } else {
                        throw new DeveloperError('Invalid vec4 value for uniform "' + activeUniform.name + '".');
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                return function() {
                    _gl.activeTexture(_gl.TEXTURE0 + this.textureUnitIndex);
                    _gl.bindTexture(this.value._getTarget(), this.value._getTexture());
                };
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
                    _gl.uniformMatrix2fv(_location, false, Matrix2.toArray(this.value, scratchUniformMatrix2));
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    _gl.uniformMatrix3fv(_location, false, Matrix3.toArray(this.value, scratchUniformMatrix3));
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    _gl.uniformMatrix4fv(_location, false, Matrix4.toArray(this.value, scratchUniformMatrix4));
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type + ' for uniform "' + activeUniform.name + '".');
            }
        })();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                this.textureUnitIndex = textureUnitIndex;
                _gl.uniform1i(_location, textureUnitIndex);
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

        /**
         * @private
         */
        this.textureUnitIndex = undefined;

        this._set = (function() {
            switch (activeUniform.type) {
            case _gl.FLOAT:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        _gl.uniform1f(_locations[i], value[i]);
                    }
                };
            case _gl.FLOAT_VEC2:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        _gl.uniform2f(_locations[i], v.x, v.y);
                    }
                };
            case _gl.FLOAT_VEC3:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        _gl.uniform3f(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.FLOAT_VEC4:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];

                        if (defined(v.red)) {
                            _gl.uniform4f(_locations[i], v.red, v.green, v.blue, v.alpha);
                        } else if (defined(v.x)) {
                            _gl.uniform4f(_locations[i], v.x, v.y, v.z, v.w);
                        } else {
                            throw new DeveloperError('Invalid vec4 value.');
                        }
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        var index = this.textureUnitIndex + i;
                        _gl.activeTexture(_gl.TEXTURE0 + index);
                        _gl.bindTexture(v._getTarget(), v._getTexture());
                    }
                };
            case _gl.INT:
            case _gl.BOOL:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        _gl.uniform1i(_locations[i], value[i]);
                    }
                };
            case _gl.INT_VEC2:
            case _gl.BOOL_VEC2:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        _gl.uniform2i(_locations[i], v.x, v.y);
                    }
                };
            case _gl.INT_VEC3:
            case _gl.BOOL_VEC3:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        _gl.uniform3i(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.INT_VEC4:
            case _gl.BOOL_VEC4:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        var v = value[i];
                        _gl.uniform4i(_locations[i], v.x, v.y, v.z, v.w);
                    }
                };
            case _gl.FLOAT_MAT2:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        _gl.uniformMatrix2fv(_locations[i], false, Matrix2.toArray(value[i], scratchUniformMatrix2));
                    }
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        _gl.uniformMatrix3fv(_locations[i], false, Matrix3.toArray(value[i], scratchUniformMatrix3));
                    }
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    var value = this.value;
                    var length = value.length;
                    for (var i = 0; i < length; ++i) {
                        _gl.uniformMatrix4fv(_locations[i], false, Matrix4.toArray(value[i], scratchUniformMatrix4));
                    }
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type);
            }
        })();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                this.textureUnitIndex = textureUnitIndex;

                var length = _locations.length;
                for (var i = 0; i < length; ++i) {
                    var index = textureUnitIndex + i;
                    _gl.uniform1i(_locations[i], index);
                }

                return textureUnitIndex + length;
            };
        }
    };

    function setSamplerUniforms(gl, program, samplerUniforms) {
        gl.useProgram(program);

        var textureUnitIndex = 0;
        var length = samplerUniforms.length;
        for (var i = 0; i < length; ++i) {
            textureUnitIndex = samplerUniforms[i]._setSampler(textureUnitIndex);
        }

        gl.useProgram(null);

        return textureUnitIndex;
    }

    /**
     * DOC_TBA
     *
     * @alias ShaderProgram
     * @internalConstructor
     *
     * @exception {DeveloperError} A circular dependency was found in the Cesium built-in functions/structs/constants.
     *
     * @see Context#createShaderProgram
     */
    var ShaderProgram = function(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        var program = createAndLinkProgram(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations);
        var numberOfVertexAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        var uniforms = findUniforms(gl, program);
        var partitionedUniforms = partitionUniforms(uniforms.uniformsByName);

        this._gl = gl;
        this._program = program;
        this._numberOfVertexAttributes = numberOfVertexAttributes;
        this._vertexAttributes = findVertexAttributes(gl, program, numberOfVertexAttributes);
        this._uniformsByName = uniforms.uniformsByName;
        this._uniforms = uniforms.uniforms;
        this._automaticUniforms = partitionedUniforms.automaticUniforms;
        this._manualUniforms = partitionedUniforms.manualUniforms;

        /**
         * @private
         */
        this.maximumTextureUnitIndex = setSamplerUniforms(gl, program, uniforms.samplerUniforms);

        /**
         * GLSL source for the shader program's vertex shader.  This is the version of
         * the source provided when the shader program was created, not the final
         * source provided to WebGL, which includes Cesium bulit-ins.
         *
         * @type {String}
         *
         * @readonly
         */
        this.vertexShaderSource = vertexShaderSource;

        /**
         * GLSL source for the shader program's fragment shader.  This is the version of
         * the source provided when the shader program was created, not the final
         * source provided to WebGL, which includes Cesium bulit-ins.
         *
         * @type {String}
         *
         * @readonly
         */
        this.fragmentShaderSource = fragmentShaderSource;
    };

    /**
     * For ShaderProgram testing
     * @private
     */
    ShaderProgram._czmBuiltinsAndUniforms = {};

    // combine automatic uniforms and Cesium built-ins
    for ( var builtinName in CzmBuiltins) {
        if (CzmBuiltins.hasOwnProperty(builtinName)) {
            ShaderProgram._czmBuiltinsAndUniforms[builtinName] = CzmBuiltins[builtinName];
        }
    }
    for ( var uniformName in AutomaticUniforms) {
        if (AutomaticUniforms.hasOwnProperty(uniformName)) {
            var uniform = AutomaticUniforms[uniformName];
            if (typeof uniform.getDeclaration === 'function') {
                ShaderProgram._czmBuiltinsAndUniforms[uniformName] = uniform.getDeclaration(uniformName);
            }
        }
    }

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
                    version : version,
                    source : modified
                };
            }
        }

        return {
            version : '', // defaults to #version 100
            source : source // no modifications required
        };
    }

    function getDependencyNode(name, glslSource, nodes) {
        var dependencyNode;

        // check if already loaded
        for (var i = 0; i < nodes.length; ++i) {
            if (nodes[i].name === name) {
                dependencyNode = nodes[i];
            }
        }

        if (!defined(dependencyNode)) {
            // strip doc comments so we don't accidentally try to determine a dependency for something found
            // in a comment
            var commentBlocks = glslSource.match(/\/\*\*[\s\S]*?\*\//gm);
            if (defined(commentBlocks) && commentBlocks !== null) {
                for (i = 0; i < commentBlocks.length; ++i) {
                    var commentBlock = commentBlocks[i];

                    // preserve the number of lines in the comment block so the line numbers will be correct when debugging shaders
                    var numberOfLines = commentBlock.match(/\n/gm).length;
                    var modifiedComment = '';
                    for (var lineNumber = 0; lineNumber < numberOfLines; ++lineNumber) {
                        if (lineNumber === 0) {
                            modifiedComment += '// Comment replaced to prevent problems when determining dependencies on built-in functions\n';
                        } else {
                            modifiedComment += '//\n';
                        }
                    }

                    glslSource = glslSource.replace(commentBlock, modifiedComment);
                }
            }

            // create new node
            dependencyNode = {
                name : name,
                glslSource : glslSource,
                dependsOn : [],
                requiredBy : [],
                evaluated : false
            };
            nodes.push(dependencyNode);
        }

        return dependencyNode;
    }

    function generateDependencies(currentNode, dependencyNodes) {
        if (currentNode.evaluated) {
            return;
        }

        currentNode.evaluated = true;

        // identify all dependencies that are referenced from this glsl source code
        var czmMatches = currentNode.glslSource.match(/\bczm_[a-zA-Z0-9_]*/g);
        if (defined(czmMatches) && czmMatches !== null) {
            // remove duplicates
            czmMatches = czmMatches.filter(function(elem, pos) {
                return czmMatches.indexOf(elem) === pos;
            });

            czmMatches.forEach(function(element, index, array) {
                if (element !== currentNode.name && ShaderProgram._czmBuiltinsAndUniforms.hasOwnProperty(element)) {
                    var referencedNode = getDependencyNode(element, ShaderProgram._czmBuiltinsAndUniforms[element], dependencyNodes);
                    currentNode.dependsOn.push(referencedNode);
                    referencedNode.requiredBy.push(currentNode);

                    // recursive call to find any dependencies of the new node
                    generateDependencies(referencedNode, dependencyNodes);
                }
            });
        }
    }

    function sortDependencies(dependencyNodes) {
        var nodesWithoutIncomingEdges = [];
        var allNodes = [];

        while (dependencyNodes.length > 0) {
            var node = dependencyNodes.pop();
            allNodes.push(node);

            if (node.requiredBy.length === 0) {
                nodesWithoutIncomingEdges.push(node);
            }
        }

        while (nodesWithoutIncomingEdges.length > 0) {
            var currentNode = nodesWithoutIncomingEdges.shift();

            dependencyNodes.push(currentNode);

            for (var i = 0; i < currentNode.dependsOn.length; ++i) {
                // remove the edge from the graph
                var referencedNode = currentNode.dependsOn[i];
                var index = referencedNode.requiredBy.indexOf(currentNode);
                referencedNode.requiredBy.splice(index, 1);

                // if referenced node has no more incoming edges, add to list
                if (referencedNode.requiredBy.length === 0) {
                    nodesWithoutIncomingEdges.push(referencedNode);
                }
            }
        }

        // if there are any nodes left with incoming edges, then there was a circular dependency somewhere in the graph
        var badNodes = [];
        for (var j = 0; j < allNodes.length; ++j) {
            if (allNodes[j].requiredBy.length !== 0) {
                badNodes.push(allNodes[j]);
            }
        }
        if (badNodes.length !== 0) {
            var message = 'A circular dependency was found in the following built-in functions/structs/constants: \n';
            for (j = 0; j < badNodes.length; ++j) {
                message = message + badNodes[j].name + '\n';
            }
            throw new DeveloperError(message);
        }
    }

    function getBuiltinsAndAutomaticUniforms(shaderSource) {
        // generate a dependency graph for builtin functions
        var dependencyNodes = [];
        var root = getDependencyNode('main', shaderSource, dependencyNodes);
        generateDependencies(root, dependencyNodes);
        sortDependencies(dependencyNodes);

        // Concatenate the source code for the function dependencies.
        // Iterate in reverse so that dependent items are declared before they are used.
        var builtinsSource = '';
        for (var i = dependencyNodes.length - 1; i >= 0; --i) {
            builtinsSource = builtinsSource + dependencyNodes[i].glslSource + '\n';
        }

        return builtinsSource.replace(root.glslSource, '');
    }

    function getFragmentShaderPrecision() {
        return '#ifdef GL_FRAGMENT_PRECISION_HIGH \n' +
               '  precision highp float; \n' +
               '#else \n' +
               '  precision mediump float; \n' +
               '#endif \n\n';
    }

    function createAndLinkProgram(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        var vsSourceVersioned = extractShaderVersion(vertexShaderSource);
        var fsSourceVersioned = extractShaderVersion(fragmentShaderSource);

        var vsSource =
                vsSourceVersioned.version +
                getBuiltinsAndAutomaticUniforms(vsSourceVersioned.source) +
                '\n#line 0\n' +
                vsSourceVersioned.source;
        var fsSource =
                fsSourceVersioned.version +
                getFragmentShaderPrecision() +
                getBuiltinsAndAutomaticUniforms(fsSourceVersioned.source) +
                '\n#line 0\n' +
                fsSourceVersioned.source;
        var log;

        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);

        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (defined(attributeLocations)) {
            for ( var attribute in attributeLocations) {
                if (attributeLocations.hasOwnProperty(attribute)) {
                    gl.bindAttribLocation(program, attributeLocations[attribute], attribute);
                }
            }
        }

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            // For performance, only check compile errors if there is a linker error.
            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                log = gl.getShaderInfoLog(fragmentShader);
                gl.deleteProgram(program);
                console.error('[GL] Fragment shader compile log: ' + log);
                throw new RuntimeError('Fragment shader failed to compile.  Compile log: ' + log);
            }

            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                log = gl.getShaderInfoLog(vertexShader);
                gl.deleteProgram(program);
                console.error('[GL] Vertex shader compile log: ' + log);
                throw new RuntimeError('Vertex shader failed to compile.  Compile log: ' + log);
            }

            log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            console.error('[GL] Shader program link log: ' + log);
            throw new RuntimeError('Program failed to link.  Link log: ' + log);
        }

        if (logShaderCompilation) {
            log = gl.getShaderInfoLog(vertexShader);
            if (defined(log) && (log.length > 0)) {
                console.log('[GL] Vertex shader compile log: ' + log);
            }
        }

        if (logShaderCompilation) {
            log = gl.getShaderInfoLog(fragmentShader);
            if (defined(log) && (log.length > 0)) {
                console.log('[GL] Fragment shader compile log: ' + log);
            }
        }

        if (logShaderCompilation) {
            log = gl.getProgramInfoLog(program);
            if (defined(log) && (log.length > 0)) {
                console.log('[GL] Shader program link log: ' + log);
            }
        }

        return program;
    }

    function findVertexAttributes(gl, program, numberOfAttributes) {
        var attributes = {};
        for (var i = 0; i < numberOfAttributes; ++i) {
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

    function findUniforms(gl, program) {
        var uniformsByName = {};
        var uniforms = [];
        var samplerUniforms = [];

        var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        for (var i = 0; i < numberOfUniforms; ++i) {
            var activeUniform = gl.getActiveUniform(program, i);
            var suffix = '[0]';
            var uniformName = activeUniform.name.indexOf(suffix, activeUniform.name.length - suffix.length) !== -1 ? activeUniform.name.slice(0, activeUniform.name.length - 3) : activeUniform.name;

            // Ignore GLSL built-in uniforms returned in Firefox.
            if (uniformName.indexOf('gl_') !== 0) {
                if (activeUniform.name.indexOf('[') < 0) {
                    // Single uniform
                    var location = gl.getUniformLocation(program, uniformName);
                    var uniformValue = gl.getUniform(program, location);
                    var uniform = new Uniform(gl, activeUniform, uniformName, location, uniformValue);

                    uniformsByName[uniformName] = uniform;
                    uniforms.push(uniform);

                    if (uniform._setSampler) {
                        samplerUniforms.push(uniform);
                    }
                } else {
                    // Uniform array

                    var uniformArray;
                    var locations;
                    var value;
                    var loc;

                    // On some platforms - Nexus 4 in Firefox for one - an array of sampler2D ends up being represented
                    // as separate uniforms, one for each array element.  Check for and handle that case.
                    var indexOfBracket = uniformName.indexOf('[');
                    if (indexOfBracket >= 0) {
                        // We're assuming the array elements show up in numerical order - it seems to be true.
                        uniformArray = uniformsByName[uniformName.slice(0, indexOfBracket)];

                        // Nexus 4 with Android 4.3 needs this check, because it reports a uniform
                        // with the strange name webgl_3467e0265d05c3c1[1] in our central body surface shader.
                        if (typeof uniformArray === 'undefined') {
                            continue;
                        }

                        locations = uniformArray._getLocations();

                        // On the Nexus 4 in Chrome, we get one uniform per sampler, just like in Firefox,
                        // but the size is not 1 like it is in Firefox.  So if we push locations here,
                        // we'll end up adding too many locations.
                        if (locations.length <= 1) {
                            value = uniformArray.value;
                            loc = gl.getUniformLocation(program, uniformName);
                            locations.push(loc);
                            value.push(gl.getUniform(program, loc));
                        }
                    } else {
                        locations = [];
                        value = [];
                        for ( var j = 0; j < activeUniform.size; ++j) {
                            loc = gl.getUniformLocation(program, uniformName + '[' + j + ']');
                            locations.push(loc);
                            value.push(gl.getUniform(program, loc));
                        }
                        uniformArray = new UniformArray(gl, activeUniform, uniformName, locations, value);

                        uniformsByName[uniformName] = uniformArray;
                        uniforms.push(uniformArray);

                        if (uniformArray._setSampler) {
                            samplerUniforms.push(uniformArray);
                        }
                    }
                }
            }
        }

        return {
            uniformsByName : uniformsByName,
            uniforms : uniforms,
            samplerUniforms : samplerUniforms
        };
    }

    function partitionUniforms(uniforms) {
        var automaticUniforms = [];
        var manualUniforms = {};

        for ( var uniform in uniforms) {
            if (uniforms.hasOwnProperty(uniform)) {
                var automaticUniform = AutomaticUniforms[uniform];
                if (automaticUniform) {
                    automaticUniforms.push({
                        uniform : uniforms[uniform],
                        automaticUniform : automaticUniform
                    });
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

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @returns {Object} DOC_TBA
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     */
    ShaderProgram.prototype.getVertexAttributes = function() {
        return this._vertexAttributes;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @returns {Number} DOC_TBA
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     */
    ShaderProgram.prototype.getNumberOfVertexAttributes = function() {
        return this._numberOfVertexAttributes;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @returns {Object} DOC_TBA
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#getManualUniforms
     */
    ShaderProgram.prototype.getAllUniforms = function() {
        return this._uniformsByName;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#getAllUniforms
     */
    ShaderProgram.prototype.getManualUniforms = function() {
        return this._manualUniforms;
    };

    ShaderProgram.prototype._bind = function() {
        this._gl.useProgram(this._program);
    };

    ShaderProgram.prototype._setUniforms = function(uniformMap, uniformState, validate) {
        // TODO: Performance

        var len;
        var i;

        var uniforms = this._uniforms;
        var manualUniforms = this._manualUniforms;
        var automaticUniforms = this._automaticUniforms;

        if (uniformMap) {
            for ( var uniform in manualUniforms) {
                if (manualUniforms.hasOwnProperty(uniform)) {
                    manualUniforms[uniform].value = uniformMap[uniform]();
                }
            }
        }

        len = automaticUniforms.length;
        for (i = 0; i < len; ++i) {
            automaticUniforms[i].uniform.value = automaticUniforms[i].automaticUniform.getValue(uniformState);
        }

        ///////////////////////////////////////////////////////////////////

        len = uniforms.length;
        for (i = 0; i < len; ++i) {
            uniforms[i]._set();
        }

        if (validate) {
            var gl = this._gl;
            var program = this._program;

            gl.validateProgram(program);
            if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                throw new DeveloperError('Program validation failed.  Link log: ' + gl.getProgramInfoLog(program));
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * @memberof ShaderProgram
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ShaderProgram#destroy
     */
    ShaderProgram.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * @memberof ShaderProgram
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteShader.xml'>glDeleteShader</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteProgram.xml'>glDeleteProgram</a>
     *
     * @example
     * shaderProgram = shaderProgram && shaderProgram.destroy();
     */
    ShaderProgram.prototype.destroy = function() {
        this._gl.deleteProgram(this._program);
        return destroyObject(this);
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     */
    ShaderProgram.prototype.release = function() {
        if (this._cachedShader) {
            return this._cachedShader.cache.releaseShaderProgram(this);
        }

        return this.destroy();
    };

    return ShaderProgram;
});
