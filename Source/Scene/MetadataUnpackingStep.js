import Check from "../Core/Check.js";

/**
 * A namespace that contains several functions for producing GLSL code for
 * unpacking values on the GPU. These functions take a GLSL expression as a
 * string and wrap it with more GLSL code to create a new expression, much like
 * a GLSL macro, but done in JS.
 *
 * @namespace MetadataUnpackingStep
 *
 * @private
 */
const MetadataUnpackingStep = {};

/**
 * Convert the range of a float value from [0, 1] to [-1, 1]
 * @param {String} expression The GLSL float expression
 * @returns A new expression producing a signed value
 */
MetadataUnpackingStep.unsignedToSigned = function (expression) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("expression", expression);
  //>>includeEnd('debug');
  return `2.0 * (${expression}) - 1.0`;
};

/**
 * Convert a floating point value from the range [0, 1] to [0, 255]. This is
 * used when reading unsigned byte values from a texture.
 * @param {String} expression The GLSL float expression
 * @returns A new expression in the range [0, 255]
 */
MetadataUnpackingStep.unnormalizeU8 = function (expression) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("expression", expression);
  //>>includeEnd('debug');
  return `255.0 * (${expression})`;
};

/**
 * Create an unpacking step that casts a GLSL expression to a new type.
 * @param {String} castType The type to cast to
 * @returns An unpacking step function that will perform the type cast.
 * @example
 * const toInt = MetadataUnpackingStep.cast("int");
 * const integerExpression = toInt("1.0"); // produces "int(1.0)"
 */
MetadataUnpackingStep.cast = function (castType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("castType", castType);
  //>>includeEnd('debug');

  return function (expression) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("expression", expression);
    //>>includeEnd('debug');
    return `${castType}(${expression})`;
  };
};

export default MetadataUnpackingStep;
