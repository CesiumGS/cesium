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
 * @private
 * @constructor
 */
function createUniform(gl, activeUniform, uniformName, location) {
  switch (activeUniform.type) {
    case gl.FLOAT:
      return new UniformFloat(gl, activeUniform, uniformName, location);
    case gl.FLOAT_VEC2:
      return new UniformFloatVec2(gl, activeUniform, uniformName, location);
    case gl.FLOAT_VEC3:
      return new UniformFloatVec3(gl, activeUniform, uniformName, location);
    case gl.FLOAT_VEC4:
      return new UniformFloatVec4(gl, activeUniform, uniformName, location);
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return new UniformSampler(gl, activeUniform, uniformName, location);
    case gl.INT:
    case gl.BOOL:
      return new UniformInt(gl, activeUniform, uniformName, location);
    case gl.INT_VEC2:
    case gl.BOOL_VEC2:
      return new UniformIntVec2(gl, activeUniform, uniformName, location);
    case gl.INT_VEC3:
    case gl.BOOL_VEC3:
      return new UniformIntVec3(gl, activeUniform, uniformName, location);
    case gl.INT_VEC4:
    case gl.BOOL_VEC4:
      return new UniformIntVec4(gl, activeUniform, uniformName, location);
    case gl.FLOAT_MAT2:
      return new UniformMat2(gl, activeUniform, uniformName, location);
    case gl.FLOAT_MAT3:
      return new UniformMat3(gl, activeUniform, uniformName, location);
    case gl.FLOAT_MAT4:
      return new UniformMat4(gl, activeUniform, uniformName, location);
    default:
      throw new RuntimeError(
        "Unrecognized uniform type: " +
          activeUniform.type +
          ' for uniform "' +
          uniformName +
          '".'
      );
  }
}

/**
 * @private
 * @constructor
 */
function UniformFloat(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = 0.0;

  this._gl = gl;
  this._location = location;
}

UniformFloat.prototype.set = function () {
  if (this.value !== this._value) {
    this._value = this.value;
    this._gl.uniform1f(this._location, this.value);
  }
};

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @constructor
 */
function UniformFloatVec2(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Cartesian2();

  this._gl = gl;
  this._location = location;
}

UniformFloatVec2.prototype.set = function () {
  var v = this.value;
  if (!Cartesian2.equals(v, this._value)) {
    Cartesian2.clone(v, this._value);
    this._gl.uniform2f(this._location, v.x, v.y);
  }
};

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @constructor
 */
function UniformFloatVec3(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = undefined;

  this._gl = gl;
  this._location = location;
}

UniformFloatVec3.prototype.set = function () {
  var v = this.value;

  if (defined(v.red)) {
    if (!Color.equals(v, this._value)) {
      this._value = Color.clone(v, this._value);
      this._gl.uniform3f(this._location, v.red, v.green, v.blue);
    }
  } else if (defined(v.x)) {
    if (!Cartesian3.equals(v, this._value)) {
      this._value = Cartesian3.clone(v, this._value);
      this._gl.uniform3f(this._location, v.x, v.y, v.z);
    }
  } else {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      'Invalid vec3 value for uniform "' + this.name + '".'
    );
    //>>includeEnd('debug');
  }
};

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @constructor
 */
function UniformFloatVec4(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = undefined;

  this._gl = gl;
  this._location = location;
}

UniformFloatVec4.prototype.set = function () {
  var v = this.value;

  if (defined(v.red)) {
    if (!Color.equals(v, this._value)) {
      this._value = Color.clone(v, this._value);
      this._gl.uniform4f(this._location, v.red, v.green, v.blue, v.alpha);
    }
  } else if (defined(v.x)) {
    if (!Cartesian4.equals(v, this._value)) {
      this._value = Cartesian4.clone(v, this._value);
      this._gl.uniform4f(this._location, v.x, v.y, v.z, v.w);
    }
  } else {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      'Invalid vec4 value for uniform "' + this.name + '".'
    );
    //>>includeEnd('debug');
  }
};

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @constructor
 */
function UniformSampler(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;

  this._gl = gl;
  this._location = location;

  this.textureUnitIndex = undefined;
}

UniformSampler.prototype.set = function () {
  var gl = this._gl;
  gl.activeTexture(gl.TEXTURE0 + this.textureUnitIndex);

  var v = this.value;

  gl.bindTexture(v._target, v._texture);
};

UniformSampler.prototype._setSampler = function (textureUnitIndex) {
  this.textureUnitIndex = textureUnitIndex;
  this._gl.uniform1i(this._location, textureUnitIndex);
  return textureUnitIndex + 1;
};

///////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @constructor
 */
function UniformInt(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = 0.0;

  this._gl = gl;
  this._location = location;
}

UniformInt.prototype.set = function () {
  if (this.value !== this._value) {
    this._value = this.value;
    this._gl.uniform1i(this._location, this.value);
  }
};

///////////////////////////////////////////////////////////////////////////
/**
 * @private
 * @constructor
 */
function UniformIntVec2(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Cartesian2();

  this._gl = gl;
  this._location = location;
}

UniformIntVec2.prototype.set = function () {
  var v = this.value;
  if (!Cartesian2.equals(v, this._value)) {
    Cartesian2.clone(v, this._value);
    this._gl.uniform2i(this._location, v.x, v.y);
  }
};

///////////////////////////////////////////////////////////////////////////
/**
 * @private
 * @constructor
 */
function UniformIntVec3(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Cartesian3();

  this._gl = gl;
  this._location = location;
}

UniformIntVec3.prototype.set = function () {
  var v = this.value;
  if (!Cartesian3.equals(v, this._value)) {
    Cartesian3.clone(v, this._value);
    this._gl.uniform3i(this._location, v.x, v.y, v.z);
  }
};

///////////////////////////////////////////////////////////////////////////
/**
 * @private
 * @constructor
 */
function UniformIntVec4(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Cartesian4();

  this._gl = gl;
  this._location = location;
}

UniformIntVec4.prototype.set = function () {
  var v = this.value;
  if (!Cartesian4.equals(v, this._value)) {
    Cartesian4.clone(v, this._value);
    this._gl.uniform4i(this._location, v.x, v.y, v.z, v.w);
  }
};

///////////////////////////////////////////////////////////////////////////

var scratchUniformArray = new Float32Array(4);
/**
 * @private
 * @constructor
 */
function UniformMat2(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Matrix2();

  this._gl = gl;
  this._location = location;
}

UniformMat2.prototype.set = function () {
  if (!Matrix2.equalsArray(this.value, this._value, 0)) {
    Matrix2.clone(this.value, this._value);

    var array = Matrix2.toArray(this.value, scratchUniformArray);
    this._gl.uniformMatrix2fv(this._location, false, array);
  }
};

///////////////////////////////////////////////////////////////////////////

var scratchMat3Array = new Float32Array(9);
/**
 * @private
 * @constructor
 */
function UniformMat3(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Matrix3();

  this._gl = gl;
  this._location = location;
}

UniformMat3.prototype.set = function () {
  if (!Matrix3.equalsArray(this.value, this._value, 0)) {
    Matrix3.clone(this.value, this._value);

    var array = Matrix3.toArray(this.value, scratchMat3Array);
    this._gl.uniformMatrix3fv(this._location, false, array);
  }
};

///////////////////////////////////////////////////////////////////////////

var scratchMat4Array = new Float32Array(16);
/**
 * @private
 * @constructor
 */
function UniformMat4(gl, activeUniform, uniformName, location) {
  /**
   * @type {String}
   * @readonly
   */
  this.name = uniformName;

  this.value = undefined;
  this._value = new Matrix4();

  this._gl = gl;
  this._location = location;
}

UniformMat4.prototype.set = function () {
  if (!Matrix4.equalsArray(this.value, this._value, 0)) {
    Matrix4.clone(this.value, this._value);

    var array = Matrix4.toArray(this.value, scratchMat4Array);
    this._gl.uniformMatrix4fv(this._location, false, array);
  }
};
export default createUniform;
