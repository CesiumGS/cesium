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
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * A set of variables parsed from the user-defined shader code. These can be
 * used for optimizations when generating the overall shader. Though they are
 * represented as JS objects, the intended use is like a set, so only the
 * existence of keys matter. The values will always be <code>true</code> if
 * defined. This data structure is used because:
 * <ul>
 *   <li>We cannot yet use ES6 Set objects</li>
 *   <li>Using a dictionary automatically de-duplicates variable names</li>
 *   <li>Queries such as <code>variableSet.hasOwnProperty("position")</code> are straightforward</li>
 * </ul>
 * @typedef {Object<String, Boolean>} VariableSet
 * @private
 */

/**
 * Variable sets parsed from the user-defined vertex shader text.
 * @typedef {Object} VertexVariableSets
 * @property {VariableSet} attributeSet A set of all unique attributes used in the vertex shader via the <code>vsInput.attributes</code> struct.
 * @property {VariableSet} featureIdSet A set of all unique feature ID sets used in the vertex shader via the <code>vsInput.featureIds</code> struct.
 * @private
 */

/**
 * Variable sets parsed from the user-defined fragment shader text.
 * @typedef {Object} FragmentVariableSets
 * @property {VariableSet} attributeSet A set of all unique attributes used in the fragment shader via the <code>fsInput.attributes</code> struct
 * @property {VariableSet} featureIdSet A set of all unique feature ID sets used in the fragment shader via the <code>fsInput.featureIds</code> struct.
 * @property {VariableSet} materialSet A set of all material variables such as diffuse, specular or alpha that are used in the fragment shader via the <code>material</code> struct.
 * @private
 */

/**
 * A user defined GLSL shader used with {@link ModelExperimental} as well
 * as {@link Cesium3DTileset}.
 * <p>
 * If texture uniforms are used, additional resource management must be done:
 * </p>
 * <ul>
 *   <li>
 *      The <code>update</code> function must be called each frame. When a
 *      custom shader is passed to a {@link ModelExperimental} or a
 *      {@link Cesium3DTileset}, this step is handled automaticaly
 *   </li>
 *   <li>
 *      {@link CustomShader#destroy} must be called when the custom shader is
 *      no longer needed to clean up GPU resources properly. The application
 *      is responsible for calling this method.
 *   </li>
 * </ul>
 * <p>
 * To enable the use of {@link ModelExperimental} in {@link Cesium3DTileset}, set {@link ExperimentalFeatures.enableModelExperimental} to <code>true</code> or tileset.enableModelExperimental to <code>true</code>.
 * </p>
 *
 * @param {Object} options An object with the following options
 * @param {CustomShaderMode} [options.mode=CustomShaderMode.MODIFY_MATERIAL] The custom shader mode, which determines how the custom shader code is inserted into the fragment shader.
 * @param {LightingModel} [options.lightingModel] The lighting model (e.g. PBR or unlit). If present, this overrides the default lighting for the model.
 * @param {Boolean} [options.isTranslucent=false] If set, the model will be rendered as translucent. This overrides the default settings for the model.
 * @param {Object.<String, UniformSpecifier>} [options.uniforms] A dictionary for user-defined uniforms. The key is the uniform name that will appear in the GLSL code. The value is an object that describes the uniform type and initial value
 * @param {Object.<String, VaryingType>} [options.varyings] A dictionary for declaring additional GLSL varyings used in the shader. The key is the varying name that will appear in the GLSL code. The value is the data type of the varying. For each varying, the declaration will be added to the top of the shader automatically. The caller is responsible for assigning a value in the vertex shader and using the value in the fragment shader.
 * @param {String} [options.vertexShaderText] The custom vertex shader as a string of GLSL code. It must include a GLSL function called vertexMain. See the example for the expected signature. If not specified, the custom vertex shader step will be skipped in the computed vertex shader.
 * @param {String} [options.fragmentShaderText] The custom fragment shader as a string of GLSL code. It must include a GLSL function called fragmentMain. See the example for the expected signature. If not specified, the custom fragment shader step will be skipped in the computed fragment shader.
 *
 * @alias CustomShader
 * @constructor
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const customShader = new CustomShader({
 *   uniforms: {
 *     u_colorIndex: {
 *       type: Cesium.UniformType.FLOAT,
 *       value: 1.0
 *     },
 *     u_normalMap: {
 *       type: Cesium.UniformType.SAMPLER_2D,
 *       value: new Cesium.TextureUniform({
 *         url: "http://example.com/normal.png"
 *       })
 *     }
 *   },
 *   varyings: {
 *     v_selectedColor: Cesium.VaryingType.VEC3
 *   },
 *   vertexShaderText: `
 *   void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
 *     v_selectedColor = mix(vsInput.attributes.color_0, vsInput.attributes.color_1, u_colorIndex);
 *     vsOutput.positionMC += 0.1 * vsInput.attributes.normal;
 *   }
 *   `,
 *   fragmentShaderText: `
 *   void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
 *     material.normal = texture2D(u_normalMap, fsInput.attributes.texCoord_0);
 *     material.diffuse = v_selectedColor;
 *   }
 *   `
 * });
 */
export default function CustomShader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * A value determining how the custom shader interacts with the overall
   * fragment shader. This is used by {@link CustomShaderPipelineStage}
   *
   * @type {CustomShaderMode}
   * @readonly
   */
  this.mode = defaultValue(options.mode, CustomShaderMode.MODIFY_MATERIAL);
  /**
   * The lighting model to use when using the custom shader.
   * This is used by {@link CustomShaderPipelineStage}
   *
   * @type {LightingModel}
   * @readonly
   */
  this.lightingModel = options.lightingModel;
  /**
   * Additional uniforms as declared by the user.
   *
   * @type {Object.<String, UniformSpecifier>}
   * @readonly
   */
  this.uniforms = defaultValue(options.uniforms, defaultValue.EMPTY_OBJECT);
  /**
   * Additional varyings as declared by the user.
   * This is used by {@link CustomShaderPipelineStage}
   *
   * @type {Object.<String, VaryingType>}
   * @readonly
   */
  this.varyings = defaultValue(options.varyings, defaultValue.EMPTY_OBJECT);
  /**
   * The user-defined GLSL code for the vertex shader
   *
   * @type {String}
   * @readonly
   */
  this.vertexShaderText = options.vertexShaderText;
  /**
   * The user-defined GLSL code for the fragment shader
   *
   * @type {String}
   * @readonly
   */
  this.fragmentShaderText = options.fragmentShaderText;
  /**
   * Whether the shader should be rendered as translucent
   *
   * @type {Boolean}
   * @readonly
   */
  this.isTranslucent = defaultValue(options.isTranslucent, false);

  /**
   * texture uniforms require some asynchronous processing. This is delegated
   * to a texture manager.
   *
   * @type {TextureManager}
   * @readonly
   * @private
   */
  this._textureManager = new TextureManager();
  /**
   * The default texture (from the {@link Context}) to use while textures
   * are loading
   *
   * @type {Texture}
   * @readonly
   * @private
   */
  this._defaultTexture = undefined;
  /**
   * The map of uniform names to a function that returns a value. This map
   * is combined with the overall uniform map used by the {@link DrawCommand}
   *
   * @type {Object.<String, Function>}
   * @readonly
   * @private
   */
  this.uniformMap = buildUniformMap(this);

  /**
   * A collection of variables used in <code>vertexShaderText</code>. This
   * is used only for optimizations in {@link CustomShaderPipelineStage}.
   * @type {VertexVariableSets}
   * @private
   */
  this.usedVariablesVertex = {
    attributeSet: {},
    featureIdSet: {},
  };
  /**
   * A collection of variables used in <code>fragmentShaderText</code>. This
   * is used only for optimizations in {@link CustomShaderPipelineStage}.
   * @type {FragmentVariableSets}
   * @private
   */
  this.usedVariablesFragment = {
    attributeSet: {},
    featureIdSet: {},
    materialSet: {},
  };

  findUsedVariables(this);
  validateBuiltinVariables(this);
}

function buildUniformMap(customShader) {
  const uniforms = customShader.uniforms;
  const uniformMap = {};
  for (const uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      const uniform = uniforms[uniformName];
      const type = uniform.type;
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
    return defaultValue(
      customShader._textureManager.getTexture(uniformName),
      customShader._defaultTexture
    );
  };
}

function createUniformFunction(customShader, uniformName) {
  return function () {
    return customShader.uniforms[uniformName].value;
  };
}

function getVariables(shaderText, regex, outputSet) {
  let match;
  while ((match = regex.exec(shaderText)) !== null) {
    const variableName = match[1];

    // Using a dictionary like a set. The value doesn't
    // matter, as this will only be used for queries such as
    // if (set.hasOwnProperty(variableName)) { ... }
    outputSet[variableName] = true;
  }
}

function findUsedVariables(customShader) {
  const attributeRegex = /[vf]sInput\.attributes\.(\w+)/g;
  const featureIdRegex = /[vf]sInput\.featureIds\.(\w+)/g;
  let attributeSet;

  const vertexShaderText = customShader.vertexShaderText;
  if (defined(vertexShaderText)) {
    attributeSet = customShader.usedVariablesVertex.attributeSet;
    getVariables(vertexShaderText, attributeRegex, attributeSet);

    attributeSet = customShader.usedVariablesVertex.featureIdSet;
    getVariables(vertexShaderText, featureIdRegex, attributeSet);
  }

  const fragmentShaderText = customShader.fragmentShaderText;
  if (defined(fragmentShaderText)) {
    attributeSet = customShader.usedVariablesFragment.attributeSet;
    getVariables(fragmentShaderText, attributeRegex, attributeSet);

    attributeSet = customShader.usedVariablesFragment.featureIdSet;
    getVariables(fragmentShaderText, featureIdRegex, attributeSet);

    const materialRegex = /material\.(\w+)/g;
    const materialSet = customShader.usedVariablesFragment.materialSet;
    getVariables(fragmentShaderText, materialRegex, materialSet);
  }
}

function expandCoordinateAbbreviations(variableName) {
  const modelCoordinatesRegex = /^.*MC$/;
  const worldCoordinatesRegex = /^.*WC$/;
  const eyeCoordinatesRegex = /^.*EC$/;

  if (modelCoordinatesRegex.test(variableName)) {
    return `${variableName} (model coordinates)`;
  }

  if (worldCoordinatesRegex.test(variableName)) {
    return `${variableName} (Cartesian world coordinates)`;
  }

  if (eyeCoordinatesRegex.test(variableName)) {
    return `${variableName} (eye coordinates)`;
  }

  return variableName;
}

function validateVariableUsage(
  variableSet,
  incorrectVariable,
  correctVariable,
  vertexOrFragment
) {
  if (variableSet.hasOwnProperty(incorrectVariable)) {
    const message = `${expandCoordinateAbbreviations(
      incorrectVariable
    )} is not available in the ${vertexOrFragment} shader. Did you mean ${expandCoordinateAbbreviations(
      correctVariable
    )} instead?`;
    throw new DeveloperError(message);
  }
}

function validateBuiltinVariables(customShader) {
  const attributesVS = customShader.usedVariablesVertex.attributeSet;

  // names without MC/WC/EC are ambiguous
  validateVariableUsage(attributesVS, "position", "positionMC", "vertex");
  validateVariableUsage(attributesVS, "normal", "normalMC", "vertex");
  validateVariableUsage(attributesVS, "tangent", "tangentMC", "vertex");
  validateVariableUsage(attributesVS, "bitangent", "bitangentMC", "vertex");

  // world and eye coordinate positions are only available in the fragment shader.
  validateVariableUsage(attributesVS, "positionWC", "positionMC", "vertex");
  validateVariableUsage(attributesVS, "positionEC", "positionMC", "vertex");

  // normal, tangent and bitangent are in model coordinates in the vertex shader
  validateVariableUsage(attributesVS, "normalEC", "normalMC", "vertex");
  validateVariableUsage(attributesVS, "tangentEC", "tangentMC", "vertex");
  validateVariableUsage(attributesVS, "bitangentEC", "bitangentMC", "vertex");

  const attributesFS = customShader.usedVariablesFragment.attributeSet;

  // names without MC/WC/EC are ambiguous
  validateVariableUsage(attributesFS, "position", "positionEC", "fragment");
  validateVariableUsage(attributesFS, "normal", "normalEC", "fragment");
  validateVariableUsage(attributesFS, "tangent", "tangentEC", "fragment");
  validateVariableUsage(attributesFS, "bitangent", "bitangentEC", "fragment");

  // normal, tangent, and bitangent are in eye coordinates in the fragment
  // shader.
  validateVariableUsage(attributesFS, "normalMC", "normalEC", "fragment");
  validateVariableUsage(attributesFS, "tangentMC", "tangentEC", "fragment");
  validateVariableUsage(attributesFS, "bitangentMC", "bitangentEC", "fragment");
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
      `Uniform ${uniformName} must be declared in the CustomShader constructor.`
    );
  }
  //>>includeEnd('debug');
  const uniform = this.uniforms[uniformName];
  if (uniform.type === UniformType.SAMPLER_2D) {
    // Textures are loaded asynchronously
    this._textureManager.loadTexture2D(uniformName, value);
  } else if (defined(value.clone)) {
    // clone Cartesian and Matrix types.
    uniform.value = value.clone(uniform.value);
  } else {
    uniform.value = value;
  }
};

CustomShader.prototype.update = function (frameState) {
  this._defaultTexture = frameState.context.defaultTexture;
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
