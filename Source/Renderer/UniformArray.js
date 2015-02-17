/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
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
        Matrix2,
        Matrix3,
        Matrix4,
        RuntimeError) {
    "use strict";
    /*global console*/

    /**
     * @private
     */
    var UniformArray = function(gl, activeUniform, uniformName, locations) {
        var length = locations.length;
        var type = activeUniform.type;

        this._gl = gl;
        this._type = type;
        this._name = uniformName;
        this.value = new Array(length);
        this._location = locations[0];

        this._scratchFloat = undefined;
        this._scratchInt = undefined;

        /**
         * @private
         */
        this.textureUnitIndex = undefined;

        var set;
        switch (type) {
            case gl.FLOAT:
                set = this.setFloat;
                this._scratchFloat = new Float32Array(length);
                break;
            case gl.FLOAT_VEC2:
                set = this.setFloatVec2;
                this._scratchFloat = new Float32Array(length * 2);
                break;
            case gl.FLOAT_VEC3:
                set = this.setFloatVec3;
                this._scratchFloat = new Float32Array(length * 3);
                break;
            case gl.FLOAT_VEC4:
                this._scratchFloat = new Float32Array(length * 4);
                set = this.setFloatVec4;
                break;
            case gl.SAMPLER_2D:
            case gl.SAMPLER_CUBE:
                set = this.setSampler;
                break;
            case gl.INT:
            case gl.BOOL:
                set = this.setInt;
                this._scratchInt = new Int32Array(length);
                break;
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                set = this.setIntVec2;
                this._scratchInt = new Int32Array(length * 2);
                break;
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                this._scratchInt = new Int32Array(length * 3);
                set = this.setIntVec3;
                break;
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                this._scratchInt = new Int32Array(length * 4);
                set = this.setIntVec4;
                break;
            case gl.FLOAT_MAT2:
                this._scratchFloat = new Float32Array(length * 4);
                set = this.setMat2;
                break;
            case gl.FLOAT_MAT3:
                this._scratchFloat = new Float32Array(length * 9);
                set = this.setMat3;
                break;
            case gl.FLOAT_MAT4:
                this._scratchFloat = new Float32Array(length * 16);
                set = this.setMat4;
                break;
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + type + ' for uniform "' + uniformName + '".');
        }

        this._set = set;

        if ((type === gl.SAMPLER_2D) || (type === gl.SAMPLER_CUBE)) {
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
                return this._name;
            }
        },
        datatype : {
            get : function() {
                return this._type;
            }
        }
    });

    UniformArray.prototype.setFloat = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== scratch[i]) {
                scratch[i] = v;
                changed = true;
            }
        }

        if (changed) {
            this._gl.uniform1fv(this._location, scratch);
        }
    };

    UniformArray.prototype.setFloatVec2 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equalsArray(v, scratch, j)) {
                Cartesian2.pack(v, scratch, j);
                changed = true;
            }
            j += 2;
        }

        if (changed) {
            this._gl.uniform2fv(this._location, scratch);
        }
    };

    UniformArray.prototype.setFloatVec3 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if ((v.red !== scratch[j]) ||
                    (v.green !== scratch[j + 1]) ||
                    (v.blue !== scratch[j + 2])) {

                    scratch[j] = v.red;
                    scratch[j + 1] = v.green;
                    scratch[j + 2] = v.blue;
                    changed = true;
                }
            } else if (defined(v.x)) {
                if (!Cartesian3.equalsArray(v, scratch, j)) {
                    Cartesian3.pack(v, scratch, j);
                    changed = true;
                }
            } else {
                throw new DeveloperError('Invalid vec3 value.');
            }

            j += 3;
        }

        if (changed) {
            this._gl.uniform3fv(this._location, scratch);
        }
    };

    UniformArray.prototype.setFloatVec4 = function() {
        // PERFORMANCE_IDEA: if it is a common case that only a few elements
        // in a uniform array change, we could use heuristics to determine
        // when it is better to call uniform4f for each element that changed
        // vs. call uniform4fv once to set the entire array.  This applies
        // to all uniform array types, not just vec4.  We might not care
        // once we have uniform buffers since that will be the fast path.

        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if (!Color.equalsArray(v, scratch, j)) {
                    Color.pack(v, scratch, j);
                    changed = true;
                }
            } else if (defined(v.x)) {
                if (!Cartesian4.equalsArray(v, scratch, j)) {
                    Cartesian4.pack(v, scratch, j);
                    changed = true;
                }
            } else {
                throw new DeveloperError('Invalid vec4 value.');
            }

            j += 4;
        }

        if (changed) {
            this._gl.uniform4fv(this._location, scratch);
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
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchInt;
        var changed = false;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== scratch[i]) {
                scratch[i] = v;
                changed = true;
            }
        }

        if (changed) {
            this._gl.uniform1iv(this._location, scratch);
        }
    };

    UniformArray.prototype.setIntVec2 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchInt;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equalsArray(v, scratch, j)) {
                Cartesian2.pack(v, scratch, j);
                changed = true;
            }
            j += 2;
        }

        if (changed) {
            this._gl.uniform2iv(this._location, scratch);
        }
    };

    UniformArray.prototype.setIntVec3 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchInt;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian3.equalsArray(v, scratch, j)) {
                Cartesian3.pack(v, scratch, j);
                changed = true;
            }
            j += 3;
        }

        if (changed) {
            this._gl.uniform3iv(this._location, scratch);
        }
    };

    UniformArray.prototype.setIntVec4 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchInt;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian4.equalsArray(v, scratch, j)) {
                Cartesian4.pack(v, scratch, j);
                changed = true;
            }
            j += 4;
        }

        if (changed) {
            this._gl.uniform4iv(this._location, scratch);
        }
    };

    UniformArray.prototype.setMat2 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix2.equalsArray(v, scratch, j)) {
                Matrix2.pack(v, scratch, j);
                changed = true;
            }
            j += 4;
        }

        if (changed) {
            this._gl.uniformMatrix2fv(this._location, false, scratch);
        }
    };

    UniformArray.prototype.setMat3 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix3.equalsArray(v, scratch, j)) {
                Matrix3.pack(v, scratch, j);
                changed = true;
            }
            j += 9;
        }

        if (changed) {
            this._gl.uniformMatrix3fv(this._location, false, scratch);
        }
    };

    UniformArray.prototype.setMat4 = function() {
        var value = this.value;
        var length = value.length;
        var scratch = this._scratchFloat;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix4.equalsArray(v, scratch, j)) {
                Matrix4.pack(v, scratch, j);
                changed = true;
            }
            j += 16;
        }

        if (changed) {
            this._gl.uniformMatrix4fv(this._location, false, scratch);
        }
    };

    return UniformArray;
});
