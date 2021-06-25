import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import ShaderDestination from "./ShaderDestination.js";
import ShaderProgram from "./ShaderProgram.js";
import ShaderSource from "./ShaderSource.js";

/**
 * An object that makes it easier to build the text of a {@link ShaderProgram}. This tracks GLSL code for both the vertex shader and the fragment shader.
 * <p>
 * For vertex shaders, the shader builder tracks a list of <code>#defines</code>,
 * a list of attributes, a list of uniforms, and a list of shader lines. It also
 * tracks the location of each attribute so the caller can easily build the {@link VertexArray}
 * </p>
 * <p>
 * For fragment shaders, the shader builder tracks a list of <code>#defines</code>,
 * a list of attributes, a list of uniforms, and a list of shader lines.
 * </p>
 *
 * @alias ShaderBuilder
 * @constructor
 *
 * @example
 * var shaderBuilder = new ShaderBuilder();
 * shaderBuilder.addDefine("SOLID_COLOR", undefined, ShaderDestination.FRAGMENT);
 * shaderBuilder.addUniform("vec3", "u_color", ShaderDestination.FRAGMENT);
 * // These locations can be used when creating the VertexArray
 * var positionLocation = shaderBuilder.addPositionAttribute("vec3", "a_position");
 * var colorLocation = shaderBuilder.addAttribute("vec3", "a_color");
 * shaderBuilder.addVertexLines([
 *  "varying vec3 v_color;",
 *  "void main()",
 *  "{",
 *  "    v_color = a_color;",
 *  "    gl_Position = vec4(a_position, 1.0);",
 *  "}"
 * ]);
 * shaderBuilder.addFragmentLines([
 *  "varying vec3 v_color;",
 *  "void main()",
 *  "{",
 *  "    #ifdef SOLID_COLOR",
 *  "    gl_FragColor = vec4(u_color, 1.0);",
 *  "    #else",
 *  "    gl_FragColor = vec4(v_color, 1.0);",
 *  "    #endif",
 *  "}"
 * ]);
 * var shaderProgram = shaderBuilder.build();
 *
 * @private
 */
export default function ShaderBuilder() {
  // Some WebGL implementations require attribute 0 to always
  // be active, so the position attribute is tracked separately
  this._positionAttributeLine = undefined;
  this._nextAttributeLocation = 1;
  this._attributeLocations = {};
  this._attributeLines = [];

  this._vertex = {
    defineLines: [],
    uniformLines: [],
    shaderLines: [],
  };
  this._fragment = {
    defineLines: [],
    uniformLines: [],
    shaderLines: [],
  };
}

/**
 * Add a <code>#define</code> macro to one or both of the shaders. These lines
 * will appear at the top of the final shader source.
 *
 * @param {String} identifier An identifier for the macro. Identifiers must use uppercase letters with underscores to be consistent with Cesium's style guide.
 * @param {String} [value] The value of the macro. If undefined, the define will not include a value. The value will be converted to GLSL code via <code>toString()</code>
 * @param {ShaderDestination} [destination=ShaderDestination.BOTH] Whether the define appears in the vertex shader, the fragment shader, or both.
 *
 * @example
 * // creates the line "#define ENABLE_LIGHTING" in both shaders
 * shaderBuilder.addDefine("ENABLE_LIGHTING");
 * // creates the line "#define PI 3.141592" in the fragment shader
 * shaderBuilder.addDefine("PI", 3.141593, ShaderDestination.FRAGMENT);
 */
ShaderBuilder.prototype.addDefine = function (identifier, value, destination) {
  destination = defaultValue(destination, ShaderDestination.BOTH);

  // The ShaderSource created in build() will add the #define part
  var line = identifier;
  if (defined(value)) {
    line += " " + value.toString();
  }

  if (ShaderDestination.includesVertexShader(destination)) {
    this._vertex.defineLines.push(line);
  }

  if (ShaderDestination.incluesFragmentShader(destination)) {
    this._fragment.defineLines.push(line);
  }
};

/**
 * Add a uniform declaration to one or both of the shaders. These lines
 * will appear grouped near the top of the final shader source.
 *
 * @param {String} type the GLSL type of the uniform.
 * @param {String} identifier An identifier for the uniform. Identifiers must begin with <code>u_</code> to be consistent with Cesium's style guide.
 * @param {ShaderDestination} [destination=ShaderDestination.BOTH] Whether the uniform appears in the vertex shader, the fragment shader, or both.
 *
 * @example
 * // creates the line "uniform vec3 u_resolution;"
 * shaderBuilder.addUniform("vec3", "u_resolution", ShaderDestination.FRAGMENT);
 * // creates the line "uniform float u_time;" in both shaders
 * shaderBuilder.addDefine("float", "u_time", ShaderDestination.BOTH);
 */
ShaderBuilder.prototype.addUniform = function (type, identifier, destination) {
  destination = defaultValue(destination, ShaderDestination.BOTH);
  var line = "uniform " + type + " " + identifier + ";";

  if (ShaderDestination.includesVertexShader(destination)) {
    this._vertex.uniformLines.push(line);
  }

  if (ShaderDestination.incluesFragmentShader(destination)) {
    this._fragment.uniformLines.push(line);
  }
};

/**
 * Add a position attribute declaration to the vertex shader. These lines
 * will appear grouped near the top of the final shader source.
 * <code>
 * Some WebGL implementations require attribute 0 to be enabled, so this is
 * reserved for the position attribute. For all other attributes, see
 * {@link ShaderBuilder#addAttribute}
 * </code>
 *
 * @param {String} type the GLSL type of the attribute
 * @param {String} identifier An identifier for the attribute. Identifiers must begin with <code>a_</code> to be consistent with Cesium's style guide.
 * @return {Number} The integer location of the attribute. This location can be used when creating attributes for a {@link VertexArray}. This will always be 0.
 *
 * @example
 * // creates the line "attribute vec3 a_position;"
 * shaderBuilder.setPositionAttribute("vec3", "a_position");
 */
ShaderBuilder.prototype.setPositionAttribute = function (type, identifier) {
  this._positionAttributeLine = "attribute " + type + " " + identifier + ";";

  // Some WebGL implementations require attribute 0 to always be active, so
  // this builder assumes the position will always go in location 0
  this._attributeLocations[identifier] = 0;
  return 0;
};

/**
 * Add an attribute declaration to the vertex shader. These lines
 * will appear grouped near the top of the final shader source.
 * <code>
 * Some WebGL implementations require attribute 0 to be enabled, so this is
 * reserved for the position attribute. See {@link ShaderBuilder#setPositionAttribute}
 * </code>
 *
 * @param {String} type the GLSL type of the attribute
 * @param {String} identifier An identifier for the attribute. Identifiers must begin with <code>a_</code> to be consistent with Cesium's style guide.
 * @return {Number} The integer location of the attribute. This location can be used when creating attributes for a {@link VertexArray}
 *
 * @example
 * // creates the line "attribute vec2 a_texCoord0;"
 * shaderBuilder.addAttribute("vec2", "a_texCoord0");
 */
ShaderBuilder.prototype.addAttribute = function (type, identifier) {
  var line = "attribute " + type + " " + identifier + ";";
  this._attributeLines.push(line);

  var location = this._nextAttributeLocation;
  this._attributeLocations[identifier] = location;
  this._nextAttributeLocation++;
  return location;
};

/**
 * Appends lines of GLSL code to the vertex shader
 *
 * @param {String[]} lines the lines to add to the end of the vertex shader source
 */
ShaderBuilder.prototype.addVertexLines = function (lines) {
  Array.prototype.push.apply(this._vertex.shaderLines, lines);
};

/**
 * Appends lines of GLSL code to the fragment shader
 *
 * @param {String[]} lines the lines to add to the end of the fragment shader source
 */
ShaderBuilder.prototype.addFragmentLines = function (lines) {
  Array.prototype.push.apply(this._fragment.shaderLines, lines);
};

/**
 * Builds the {@link ShaderProgram} from the pieces added by the other methods.
 * Call this once at the end of building.
 *
 * @param {Context} context The context to use for creating the shader.
 * @param {String[]} lines the lines to add to the end of the fragment shader source
 * @return {ShaderProgram} A shader program to use for rendering.
 */
ShaderBuilder.prototype.build = function (context) {
  var vertexLines = [this._positionAttributeLine].concat(
    this._attributeLines,
    this._vertex.uniformLines,
    this._vertex.shaderLines
  );
  var vertexShaderSource = new ShaderSource({
    defines: this._vertex.defineLines,
    sources: vertexLines,
  });

  var fragmentLines = this._fragment.uniformLines.concat(
    this.fragment.shaderLines
  );
  var fragmentShaderSource = new ShaderSource({
    defines: this._fragment.defineLines,
    sources: fragmentLines,
  });

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShaderSource,
    fragmentShaderSource: fragmentShaderSource,
    attributeLocations: this._attributeLocations,
  });
};
