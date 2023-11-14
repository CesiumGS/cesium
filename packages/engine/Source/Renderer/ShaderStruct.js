/**
 * A utility for dynamically-generating a GLSL struct.
 *
 * @alias ShaderStruct
 * @constructor
 *
 * @see {@link ShaderBuilder}
 * @param {string} name The name of the struct as it will appear in the shader.
 * @example
 * // Generate the struct:
 * //
 * // struct Attributes
 * // {
 * //     vec3 position;
 * //     vec3 normal;
 * //     vec2 texCoord;
 * // };
 * const struct = new ShaderStruct("Attributes");
 * struct.addField("vec3", "position");
 * struct.addField("vec3", "normal");
 * struct.addField("vec2", "texCoord");
 * const generatedLines = struct.generateGlslLines();
 *
 * @private
 */
function ShaderStruct(name) {
  this.name = name;
  this.fields = [];
}

/**
 * Add a field to the struct
 * @param {string} type The type of the struct field
 * @param {string} identifier The identifier of the struct field
 */
ShaderStruct.prototype.addField = function (type, identifier) {
  const field = `    ${type} ${identifier};`;
  this.fields.push(field);
};

/**
 * Generate a list of lines of GLSL code for use with {@link ShaderBuilder}
 * @return {string[]} The generated GLSL code.
 */
ShaderStruct.prototype.generateGlslLines = function () {
  let fields = this.fields;
  if (fields.length === 0) {
    // GLSL requires structs to have at least one field
    fields = ["    float _empty;"];
  }

  return [].concat(`struct ${this.name}`, "{", fields, "};");
};

export default ShaderStruct;
