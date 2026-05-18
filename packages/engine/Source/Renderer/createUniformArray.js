// @ts-check

import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLActiveInfo} activeUniform
 * @param {string} uniformName
 * @param {WebGLUniformLocation[]} locations
 * @private
 */
function createUniformArray(gl, activeUniform, uniformName, locations) {
  switch (activeUniform.type) {
    case gl.FLOAT:
      return new UniformArrayFloat(gl, activeUniform, uniformName, locations);
    case gl.FLOAT_VEC2:
      return new UniformArrayFloatVec2(
        gl,
        activeUniform,
        uniformName,
        locations,
      );
    case gl.FLOAT_VEC3:
      return new UniformArrayFloatVec3(
        gl,
        activeUniform,
        uniformName,
        locations,
      );
    case gl.FLOAT_VEC4:
      return new UniformArrayFloatVec4(
        gl,
        activeUniform,
        uniformName,
        locations,
      );
    case gl.SAMPLER_2D:
    case gl.SAMPLER_3D:
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
      throw new RuntimeError(
        `Unrecognized uniform type: ${activeUniform.type} for uniform "${uniformName}".`,
      );
  }
}

/**
 * @private
 */
class UniformArrayFloat {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      if (v !== arraybuffer[i]) {
        arraybuffer[i] = v;
        changed = true;
      }
    }

    if (changed) {
      this._gl.uniform1fv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayFloatVec2 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 2);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Cartesian2.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian2.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 2;
    }

    if (changed) {
      this._gl.uniform2fv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayFloatVec3 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 3);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      if (defined(v.red)) {
        if (
          v.red !== arraybuffer[j] ||
          v.green !== arraybuffer[j + 1] ||
          v.blue !== arraybuffer[j + 2]
        ) {
          arraybuffer[j] = v.red;
          arraybuffer[j + 1] = v.green;
          arraybuffer[j + 2] = v.blue;
          changed = true;
        }
      } else if (defined(v.x)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        if (!Cartesian3.equalsArray(v, arraybuffer, j)) {
          // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
          Cartesian3.pack(v, arraybuffer, j);
          changed = true;
        }
      } else {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError("Invalid vec3 value.");
        //>>includeEnd('debug');
      }

      j += 3;
    }

    if (changed) {
      this._gl.uniform3fv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayFloatVec4 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 4);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    // PERFORMANCE_IDEA: if it is a common case that only a few elements
    // in a uniform array change, we could use heuristics to determine
    // when it is better to call uniform4f for each element that changed
    // vs. call uniform4fv once to set the entire array.  This applies
    // to all uniform array types, not just vec4.  We might not care
    // once we have uniform buffers since that will be the fast path.

    // PERFORMANCE_IDEA: Micro-optimization (I bet it works though):
    // As soon as changed is true, break into a separate loop that
    // does the copy without the equals check.

    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      if (defined(v.red)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        if (!Color.equalsArray(v, arraybuffer, j)) {
          Color.pack(v, arraybuffer, j);
          changed = true;
        }
      } else if (defined(v.x)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        if (!Cartesian4.equalsArray(v, arraybuffer, j)) {
          // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
          Cartesian4.pack(v, arraybuffer, j);
          changed = true;
        }
      } else {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError("Invalid vec4 value.");
        //>>includeEnd('debug');
      }

      j += 4;
    }

    if (changed) {
      this._gl.uniform4fv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArraySampler {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length);

    this._gl = gl;
    this._locations = locations;

    this.textureUnitIndex = undefined;
  }

  set() {
    const gl = this._gl;
    const textureUnitIndex = gl.TEXTURE0 + this.textureUnitIndex;

    const value = this.value;
    const length = value.length;
    for (let i = 0; i < length; ++i) {
      const v = value[i];
      gl.activeTexture(textureUnitIndex + i);
      gl.bindTexture(v._target, v._texture);
    }
  }

  /**
   * @param {number} textureUnitIndex
   * @returns {number}
   */
  _setSampler(textureUnitIndex) {
    this.textureUnitIndex = textureUnitIndex;

    const locations = this._locations;
    const length = locations.length;
    for (let i = 0; i < length; ++i) {
      const index = textureUnitIndex + i;
      this._gl.uniform1i(locations[i], index);
    }

    return textureUnitIndex + length;
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayInt {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Int32Array(length);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      if (v !== arraybuffer[i]) {
        arraybuffer[i] = v;
        changed = true;
      }
    }

    if (changed) {
      this._gl.uniform1iv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayIntVec2 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Int32Array(length * 2);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Cartesian2.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian2.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 2;
    }

    if (changed) {
      this._gl.uniform2iv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayIntVec3 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Int32Array(length * 3);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Cartesian3.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian3.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 3;
    }

    if (changed) {
      this._gl.uniform3iv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayIntVec4 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Int32Array(length * 4);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Cartesian4.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian4.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 4;
    }

    if (changed) {
      this._gl.uniform4iv(this._location, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayMat2 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 4);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Matrix2.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Matrix2.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 4;
    }

    if (changed) {
      this._gl.uniformMatrix2fv(this._location, false, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayMat3 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 9);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Matrix3.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Matrix3.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 9;
    }

    if (changed) {
      this._gl.uniformMatrix3fv(this._location, false, arraybuffer);
    }
  }
}

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
class UniformArrayMat4 {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLActiveInfo} activeUniform
   * @param {string} uniformName
   * @param {WebGLUniformLocation[]} locations
   */
  constructor(gl, activeUniform, uniformName, locations) {
    const length = locations.length;

    /**
     * @type {string}
     * @readonly
     */
    this.name = uniformName;

    this.value = new Array(length);
    this._value = new Float32Array(length * 16);

    this._gl = gl;
    this._location = locations[0];
  }

  set() {
    const value = this.value;
    const length = value.length;
    const arraybuffer = this._value;
    let changed = false;
    let j = 0;

    for (let i = 0; i < length; ++i) {
      const v = value[i];

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      if (!Matrix4.equalsArray(v, arraybuffer, j)) {
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Matrix4.pack(v, arraybuffer, j);
        changed = true;
      }
      j += 16;
    }

    if (changed) {
      this._gl.uniformMatrix4fv(this._location, false, arraybuffer);
    }
  }
}

export default createUniformArray;
