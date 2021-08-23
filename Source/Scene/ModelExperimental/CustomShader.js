import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import CustomShaderMode from "./CustomShaderMode.js";
import UniformType from "./UniformType.js";
import TextureManager from "./TextureManager.js";

/**
 * An object describing a uniform, its type, and an initial value
 *
 * @typedef {Object} UniformSpecifier
 * @property {UniformType} type The Glsl type of the uniform.
 * @property {Boolean|Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4|TextureUniform} value The initial value of the uniform
 * @private
 */

/**
 * A user defined GLSL shader used with {@link ModelExperimental} as well
 * as {@link Cesium3DTileset}.
 *
 * @param {Object} options An object with the following options
 * @param {CustomShaderMode} [options.mode=CustomShaderMode.MODIFY_MATERIAL] The custom shader mode, which determines how the custom shader code is inserted into the fragment shader.
 * @param {LightingModel} [options.lightingModel] The lighting model (e.g. PBR or unlit). If present, this overrides the normal lighting for the model.
 * @param {Object.<String, UniformSpecifier>} [options.uniforms] A dictionary for user-defined uniforms. The key is the uniform name that will appear in the GLSL code. The value is an object that describes the uniform type and initial value
 * @param {Object.<String, VaryingType>} [options.varyings] A dictionary for declaring additional GLSL varyings used in the shader. The key is the varying name that will appear in the GLSL code. The value is the data type of the varying. For each varying, the declaration will be added to the top of the shader automatically. The caller is responsible for assigning a value in the vertex shader and using the value in the fragment shader.
 * @param {String} [options.vertexShaderText] The custom vertex shader as a string of GLSL code. It must include a GLSL function called vertexMain. See the example for the expected signature. If not specified, the custom vertex shader step will be skipped in the computed vertex shader.
 * @param {String} [options.fragmentShaderText] The custom fragment shader as a string of GLSL code. It must include a GLSL function called fragmentMain. See the example for the expected signature. If not specified, the custom fragment shader step will be skipped in the computed fragment shader.
 *
 * @alias CustomShader
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function CustomShader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this.mode = defaultValue(options.mode, CustomShaderMode.MODIFY_MATERIAL);
  this.lightingModel = options.lightingModel;
  this.uniforms = defaultValue(options.uniforms, defaultValue.EMPTY_OBJECT);
  this.varyings = defaultValue(options.varyings, defaultValue.EMPTY_OBJECT);
  this.vertexShaderText = options.vertexShaderText;
  this.fragmentShaderText = options.fragmentShaderText;

  this._textureManager = new TextureManager();
  this.uniformMap = buildUniformMap(this);

  // Lists of variables used from the automatically-generated structs. These
  // can be used for optimizations when generating the overall shader.
  // The values are JS objects used like sets. The keys are the variable names,
  // the values do not matter here. This is for three reasons:
  // 1. We are not using ES6 sets
  // 2. Using a dictionary automatically de-duplicates variable names
  // 3. It makes it easy to do queries such as:
  //    if ("position" in attributeSet) { ... }
  this._usedVariablesVertex = {
    // attributes from the glTF
    attributeSet: {},
  };
  this._usedVariablesFragment = {
    // positions in various reference frames, e.g. positionMC, positionEC
    positionSet: {},
    // attributes from the glTF
    attributeSet: {},
    // properties of the material used
    materialSet: {},
  };
  findUsedVariables(this);
}

function buildUniformMap(customShader) {
  var uniforms = customShader.uniforms;
  var uniformMap = {};
  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      var uniform = uniforms[uniformName];
      var type = uniform.type;
      //>>includeStart('debug', pragmas.debug);
      if (type === UniformType.SAMPLER_CUBE) {
        throw new DeveloperError(
          "CustomShader does not support samplerCube uniforms"
        );
      }
      //>>includeEnd('debug');

      if (type === UniformType.SAMPLER_2D) {
        customShader._textureManager.loadTexture2D(uniformName, uniform.value);
        uniformMap[uniformName] = createUniformTexture2DFunction(
          customShader,
          uniformName
        );
      } else {
        uniformMap[uniformName] = createUniformFunction(
          customShader,
          uniformName
        );
      }
    }
  }
  return uniformMap;
}

function createUniformTexture2DFunction(customShader, uniformName) {
  return function () {
    return customShader._textureManager.getTexture(uniformName);
  };
}

function createUniformFunction(customShader, uniformName) {
  return function () {
    return customShader.uniforms[uniformName].value;
  };
}

function getVariables(shaderText, regex, outputSet) {
  var match;
  while ((match = regex.exec(shaderText)) !== null) {
    var variableName = match[1];

    // Using a dictionary like a set. The value doesn't
    // matter, as this will only be used for queries such as
    // if (variableName in set) { ... }
    outputSet[variableName] = true;
  }
}

function findUsedVariables(customShader) {
  var attributeRegex = /[vf]sInput\.attributes\.(\w+)/g;
  var attributeSet;

  var vertexShaderText = customShader.vertexShaderText;
  if (defined(vertexShaderText)) {
    attributeSet = customShader._usedVariablesVertex.attributeSet;
    getVariables(vertexShaderText, attributeRegex, attributeSet);
  }

  var fragmentShaderText = customShader.fragmentShaderText;
  if (defined(fragmentShaderText)) {
    attributeSet = customShader._usedVariablesFragment.attributeSet;
    getVariables(fragmentShaderText, attributeRegex, attributeSet);

    var positionRegex = /fsInput\.(position\w+)/g;
    var positionSet = customShader._usedVariablesFragment.positionSet;
    getVariables(fragmentShaderText, positionRegex, positionSet);

    var materialRegex = /material\.(\w+)/g;
    var materialSet = customShader._usedVariablesFragment.materialSet;
    getVariables(fragmentShaderText, materialRegex, materialSet);
  }
}

/**
 * Update the value of a uniform declared in the shader
 * @param {String} uniformName The GLSL name of the uniform. This must match one of the uniforms declared in the constructor
 * @param {Boolean|Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4|String|Resource} value The new value of the uniform.
 */
CustomShader.prototype.setUniform = function (uniformName, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("uniformName", uniformName);
  Check.defined("value", value);
  if (!defined(this.uniforms[uniformName])) {
    throw new DeveloperError(
      "Uniform " +
        uniformName +
        " must be declared in the CustomShader constructor."
    );
  }
  //>>includeEnd('debug');
  var uniform = this.uniforms[uniformName];
  if (uniform.type === UniformType.SAMPLER_2D) {
    // Textures are loaded asynchronously
    this._textureManager.loadTexture2D(uniformName, value);
  } else {
    uniform.value = value;
  }
};

CustomShader.prototype.update = function (frameState) {
  this._textureManager.update(frameState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see CustomShader#destroy
 * @private
 */
CustomShader.prototype.isDestroyed = function () {
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
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * customShader = customShader && customShader.destroy();
 *
 * @see CustomShader#isDestroyed
 * @private
 */
CustomShader.prototype.destroy = function () {
  this._textureManager = this._textureManager && this._textureManager.destroy();
  destroyObject(this);
};
