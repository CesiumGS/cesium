import defined from "./defined.js";

/**
 * Formats an error object into a String.  If available, uses name, message, and stack
 * properties, otherwise, falls back on toString().
 *
 * @function
 *
 * @param {*} object The item to find in the array.
 * @returns {String} A string containing the formatted error.
 */
function formatError(object) {
  let result;

  const name = object.name;
  const message = object.message;
  if (defined(name) && defined(message)) {
    result = `${name}: ${message}`;
  } else {
    result = object.toString();
  }

  const stack = object.stack;
  if (defined(stack)) {
    result += `\n${stack}`;
  }

  return result;
}
export default formatError;
