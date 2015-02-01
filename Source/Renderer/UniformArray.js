/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/RuntimeError'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Color,
        defined,
        defineProperties,
        DeveloperError,
        FeatureDetection,
        Matrix2,
        Matrix3,
        Matrix4,
        RuntimeError) {
    "use strict";
    /*global console*/

    var scratchUniformMatrix2;
    var scratchUniformMatrix3;
    var scratchUniformMatrix4;
    if (FeatureDetection.supportsTypedArrays()) {
        scratchUniformMatrix2 = new Float32Array(4);
        scratchUniformMatrix3 = new Float32Array(9);
        scratchUniformMatrix4 = new Float32Array(16);
    }

    /**
     * @private
     */
    var UniformArray = function(gl, activeUniform, uniformName, locations) {
        this._gl = gl;
        this._activeUniform = activeUniform;
        this._uniformName = uniformName;
        this.value = new Array(locations.length);
        this._value = new Array(locations.length);
        this._locations = locations;

        /**
         * @private
         */
        this.textureUnitIndex = undefined;

        var set;
        switch (activeUniform.type) {
            case gl.FLOAT:
                set = this.setFloat;
                break;
            case gl.FLOAT_VEC2:
                set = this.setFloatVec2;
                break;
            case gl.FLOAT_VEC3:
                set = this.setFloatVec3;
                break;
            case gl.FLOAT_VEC4:
                set = this.setFloatVec4;
                break;
            case gl.SAMPLER_2D:
            case gl.SAMPLER_CUBE:
                set = this.setSampler;
                break;
            case gl.INT:
            case gl.BOOL:
                set = this.setInt;
                break;
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                set = this.setIntVec2;
                break;
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                set = this.setIntVec3;
                break;
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                set = this.setIntVec4;
                break;
            case gl.FLOAT_MAT2:
                set = this.setMat2;
                break;
            case gl.FLOAT_MAT3:
                set = this.setMat3;
                break;
            case gl.FLOAT_MAT4:
                set = this.setMat4;
                break;
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type + ' for uniform "' + uniformName + '".');
        }

        this._set = set;

        if ((activeUniform.type === gl.SAMPLER_2D) || (activeUniform.type === gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                this.textureUnitIndex = textureUnitIndex;

                var length = locations.length;
                for (var i = 0; i < length; ++i) {
                    var index = textureUnitIndex + i;
                    gl.uniform1i(locations[i], index);
                }

                return textureUnitIndex + length;
            };
        }
    };

    defineProperties(UniformArray.prototype, {
        name : {
            get : function() {
                return this._uniformName;
            }
        },
        datatype : {
            get : function() {
                return this._activeUniform.type;
            }
        }
    });

    UniformArray.prototype.setFloat = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== _value[i]) {
                _value[i] = v;
                gl.uniform1f(locations[i], v);
            }
        }
    };

    UniformArray.prototype.setFloatVec2 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equals(v, _value[i])) {
                _value[i] = Cartesian2.clone(v, _value[i]);
                gl.uniform2f(locations[i], v.x, v.y);
            }
        }
    };

    UniformArray.prototype.setFloatVec3 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if (!Color.equals(v, _value[i])) {
                    _value[i] = Color.clone(v, _value[i]);
                    gl.uniform3f(locations[i], v.red, v.green, v.blue);
                }
            } else if (defined(v.x)) {
                if (!Cartesian3.equals(v, _value[i])) {
                    _value[i] = Cartesian3.clone(v, _value[i]);
                    gl.uniform3f(locations[i], v.x, v.y, v.z);
                }
            } else {
                throw new DeveloperError('Invalid vec3 value.');
            }
        }
    };

    UniformArray.prototype.setFloatVec4 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if (!Color.equals(v, _value[i])) {
                    _value[i] = Color.clone(v, _value[i]);
                    gl.uniform4f(locations[i], v.red, v.green, v.blue, v.alpha);
                }
            } else if (defined(v.x)) {
                if (!Cartesian4.equals(v, _value[i])) {
                    _value[i] = Cartesian4.clone(v, _value[i]);
                    gl.uniform4f(locations[i], v.x, v.y, v.z, v.w);
                }
            } else {
                throw new DeveloperError('Invalid vec4 value.');
            }
        }
    };

    UniformArray.prototype.setSampler = function() {
        var gl = this._gl;
        var locations = this._locations;
        var textureUnitIndex = gl.TEXTURE0 + this.textureUnitIndex;

        var value = this.value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];
            gl.activeTexture(textureUnitIndex + i);
            gl.bindTexture(v._target, v._texture);
        }
    };

    UniformArray.prototype.setInt = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== _value[i]) {
                _value[i] = v;
                gl.uniform1i(locations[i], v);
            }
        }
    };

    UniformArray.prototype.setIntVec2 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equals(v, _value[i])) {
                _value[i] = Cartesian2.clone(v, _value[i]);
                gl.uniform2i(locations[i], v.x, v.y);
            }
        }
    };

    UniformArray.prototype.setIntVec3 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian3.equals(v, _value[i])) {
                _value[i] = Cartesian3.clone(v, _value[i]);
                gl.uniform3i(locations[i], v.x, v.y, v.z);
            }
        }
    };

    UniformArray.prototype.setIntVec4 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian4.equals(v, _value[i])) {
                _value[i] = Cartesian4.clone(v, _value[i]);
                gl.uniform4i(locations[i], v.x, v.y, v.z, v.w);
            }
        }
    };

    UniformArray.prototype.setMat2 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];
            if (!Matrix2.equals(v, _value[i])) {
                _value[i] = Matrix2.clone(v, _value[i]);
                gl.uniformMatrix2fv(locations[i], false, Matrix2.toArray(v, scratchUniformMatrix2));
            }
        }
    };

    UniformArray.prototype.setMat3 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];
            if (!Matrix3.equals(v, _value[i])) {
                _value[i] = Matrix3.clone(v, _value[i]);
                gl.uniformMatrix3fv(locations[i], false, Matrix3.toArray(value[i], scratchUniformMatrix3));
            }
        }
    };

    UniformArray.prototype.setMat4 = function() {
        var gl = this._gl;
        var locations = this._locations;

        var value = this.value;
        var _value = this._value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];
            if (!Matrix4.equals(v, _value[i])) {
                _value[i] = Matrix4.clone(v, _value[i]);
                gl.uniformMatrix4fv(locations[i], false, Matrix4.toArray(value[i], scratchUniformMatrix4));
            }
        }
    };

    return UniformArray;
});
