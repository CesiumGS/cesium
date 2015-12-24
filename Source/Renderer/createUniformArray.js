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

    /**
     * @private
     */
    function createUniformArray(gl, activeUniform, uniformName, locations) {
        switch (activeUniform.type) {
            case gl.FLOAT:
                return new UniformArrayFloat(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_VEC2:
                return new UniformArrayFloatVec2(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_VEC3:
                return new UniformArrayFloatVec3(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_VEC4:
                return new UniformArrayFloatVec4(gl, activeUniform, uniformName, locations);
            case gl.SAMPLER_2D:
            case gl.SAMPLER_CUBE:
                return new UniformArraySampler(gl, activeUniform, uniformName, locations);
            case gl.INT:
            case gl.BOOL:
                return new UniformArrayInt(gl, activeUniform, uniformName, locations);
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                return new UniformArrayIntVec2(gl, activeUniform, uniformName, locations);
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                return new UniformArrayIntVec3(gl, activeUniform, uniformName, locations);
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                return new UniformArrayIntVec4(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_MAT2:
                return new UniformArrayMat2(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_MAT3:
                return new UniformArrayMat3(gl, activeUniform, uniformName, locations);
            case gl.FLOAT_MAT4:
                return new UniformArrayMat4(gl, activeUniform, uniformName, locations);
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type + ' for uniform "' + uniformName + '".');
        }
    }

    function UniformArrayFloat(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayFloat.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== arraybuffer[i]) {
                arraybuffer[i] = v;
                changed = true;
            }
        }

        if (changed) {
            this._gl.uniform1fv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayFloatVec2(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 2);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayFloatVec2.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equalsArray(v, arraybuffer, j)) {
                Cartesian2.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 2;
        }

        if (changed) {
            this._gl.uniform2fv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayFloatVec3(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 3);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayFloatVec3.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if ((v.red !== arraybuffer[j]) ||
                    (v.green !== arraybuffer[j + 1]) ||
                    (v.blue !== arraybuffer[j + 2])) {

                    arraybuffer[j] = v.red;
                    arraybuffer[j + 1] = v.green;
                    arraybuffer[j + 2] = v.blue;
                    changed = true;
                }
            } else if (defined(v.x)) {
                if (!Cartesian3.equalsArray(v, arraybuffer, j)) {
                    Cartesian3.pack(v, arraybuffer, j);
                    changed = true;
                }
            } else {
                throw new DeveloperError('Invalid vec3 value.');
            }

            j += 3;
        }

        if (changed) {
            this._gl.uniform3fv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayFloatVec4(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 4);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayFloatVec4.prototype.set = function() {
        // PERFORMANCE_IDEA: if it is a common case that only a few elements
        // in a uniform array change, we could use heuristics to determine
        // when it is better to call uniform4f for each element that changed
        // vs. call uniform4fv once to set the entire array.  This applies
        // to all uniform array types, not just vec4.  We might not care
        // once we have uniform buffers since that will be the fast path.

        // PERFORMANCE_IDEA: Micro-optimization (I bet it works though):
        // As soon as changed is true, break into a separate loop that
        // does the copy without the equals check.

        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (defined(v.red)) {
                if (!Color.equalsArray(v, arraybuffer, j)) {
                    Color.pack(v, arraybuffer, j);
                    changed = true;
                }
            } else if (defined(v.x)) {
                if (!Cartesian4.equalsArray(v, arraybuffer, j)) {
                    Cartesian4.pack(v, arraybuffer, j);
                    changed = true;
                }
            } else {
                throw new DeveloperError('Invalid vec4 value.');
            }

            j += 4;
        }

        if (changed) {
            this._gl.uniform4fv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArraySampler(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length);

        this._gl = gl;
        this._locations = locations;

        this.textureUnitIndex = undefined;
    }

    UniformArraySampler.prototype.set = function() {
        var gl = this._gl;
        var textureUnitIndex = gl.TEXTURE0 + this.textureUnitIndex;

        var value = this.value;
        var length = value.length;
        for (var i = 0; i < length; ++i) {
            var v = value[i];
            gl.activeTexture(textureUnitIndex + i);
            gl.bindTexture(v._target, v._texture);
        }
    };

    UniformArraySampler.prototype._setSampler = function(textureUnitIndex) {
        this.textureUnitIndex = textureUnitIndex;

        var locations = this._locations;
        var length = locations.length;
        for (var i = 0; i < length; ++i) {
            var index = textureUnitIndex + i;
            this._gl.uniform1i(locations[i], index);
        }

        return textureUnitIndex + length;
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayInt(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Int32Array(length);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayInt.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (v !== arraybuffer[i]) {
                arraybuffer[i] = v;
                changed = true;
            }
        }

        if (changed) {
            this._gl.uniform1iv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayIntVec2(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Int32Array(length * 2);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayIntVec2.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian2.equalsArray(v, arraybuffer, j)) {
                Cartesian2.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 2;
        }

        if (changed) {
            this._gl.uniform2iv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayIntVec3(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Int32Array(length * 3);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayIntVec3.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian3.equalsArray(v, arraybuffer, j)) {
                Cartesian3.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 3;
        }

        if (changed) {
            this._gl.uniform3iv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayIntVec4(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Int32Array(length * 4);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayIntVec4.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Cartesian4.equalsArray(v, arraybuffer, j)) {
                Cartesian4.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 4;
        }

        if (changed) {
            this._gl.uniform4iv(this._location, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayMat2(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 4);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayMat2.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix2.equalsArray(v, arraybuffer, j)) {
                Matrix2.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 4;
        }

        if (changed) {
            this._gl.uniformMatrix2fv(this._location, false, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayMat3(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 9);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayMat3.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix3.equalsArray(v, arraybuffer, j)) {
                Matrix3.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 9;
        }

        if (changed) {
            this._gl.uniformMatrix3fv(this._location, false, arraybuffer);
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function UniformArrayMat4(gl, activeUniform, uniformName, locations) {
        var length = locations.length;

        /**
         * @readonly
         */
        this.name = uniformName;

        this.value = new Array(length);
        this._value = new Float32Array(length * 16);

        this._gl = gl;
        this._location = locations[0];
    }

    UniformArrayMat4.prototype.set = function() {
        var value = this.value;
        var length = value.length;
        var arraybuffer = this._value;
        var changed = false;
        var j = 0;

        for (var i = 0; i < length; ++i) {
            var v = value[i];

            if (!Matrix4.equalsArray(v, arraybuffer, j)) {
                Matrix4.pack(v, arraybuffer, j);
                changed = true;
            }
            j += 16;
        }

        if (changed) {
            this._gl.uniformMatrix4fv(this._location, false, arraybuffer);
        }
    };

    return createUniformArray;
});
