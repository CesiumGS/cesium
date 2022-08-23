import DeveloperError from "../Core/DeveloperError.js";

/**
 * A utility for dynamically-generating a GLSL function
 *
 * @alias ShaderFunction
 * @constructor
 *
 * @see {@link ShaderBuilder}
 * @param {String} signature The full signature of the function as it will appear in the shader. Do not include the curly braces.
 * @example
 * // generate the following function
 * //
 * // void assignVaryings(vec3 position)
 * // {
 * //    v_positionEC = (czm_modelView * vec4(a_position, 1.0)).xyz;
 * //    v_texCoord = a_texCoord;
 * // }
 * const signature = "void assignVaryings(vec3 position)";
 * const func = new ShaderFunction(signature);
 * func.addLine("v_positionEC = (czm_modelView * vec4(a_position, 1.0)).xyz;");
 * func.addLine("v_texCoord = a_texCoord;");
 * const generatedLines = func.generateGlslLines();
 *
 * @private
 */
function ShaderFunction(signature) {
  this.signature = signature;
  this.body = [];
}

/**
 * Add an array of lines to the body of the function
 * @param {String|String[]} lines One or more lines of GLSL code to add to the function body. Do not include any preceding or ending whitespace, but do include the semicolon for each line.
 */
ShaderFunction.prototype.addLines = function (lines) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof lines !== "string" && !Array.isArray(lines)) {
    throw new DeveloperError(
      `Expected lines to be a string or an array of strings, actual value was ${lines}`
    );
  }
  //>>includeEnd('debug');
  const body = this.body;

  if (Array.isArray(lines)) {
    const paddedLines = lines.map(function (line) {
      return `    ${line}`;
    });
    body.push.apply(body, paddedLines);
  } else {
    // Single string case
    body.push(`    ${lines}`);
  }
};

/**
 * Generate lines of GLSL code for use with {@link ShaderBuilder}
 * @return {String[]}
 */
ShaderFunction.prototype.generateGlslLines = function () {
  return [].concat(this.signature, "{", this.body, "}");
};

export default ShaderFunction;
