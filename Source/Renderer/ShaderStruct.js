import Check from "../Core/Check.js";

/**
 * A utility for dynamically-generating a GLSL struct.
 *
 * @alias ShaderStruct
 * @constructor
 *
 * @see {@link ShaderBuilder}
 * @param {String} name The name of the struct as it will appear in the shader.
 * @example
 * // Generate the struct:
 * //
 * // struct Attributes
 * // {
 * //     vec3 position;
 * //     vec3 normal;
 * //     vec2 texCoord;
 * // };
 * var struct = new ShaderStruct("Attributes");
 * struct.addField("vec3", "position");
 * struct.addField("vec3", "normal");
 * struct.addField("vec2", "texCoord");
 * var generatedLines = struct.generateGlslLines();
 *
 * @private
 */
export default function ShaderStruct(name) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');
  this.name = name;
  this.fields = [];
}

/**
 * Add a field to the struct
 * @param {String} type The type of the struct field
 * @param {String} identifier The identifier of the struct field
 */
ShaderStruct.prototype.addField = function (type, identifier) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  Check.typeOf.string("identifier", identifier);
  //>>includeEnd('debug');
  var field = "    " + type + " " + identifier + ";";
  this.fields.push(field);
};

/**
 * Generate a list of lines of GLSL code for use with {@link ShaderBuilder}
 * @return {String[]} The generated GLSL code.
 */
ShaderStruct.prototype.generateGlslLines = function () {
  var fields = this.fields;
  if (fields.length === 0) {
    // GLSL requires structs to have at least one field
    fields = ["    float _empty;"];
  }

  return [].concat("struct " + this.name, "{", fields, "};");
};
