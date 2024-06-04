import defined from "./defined.js";

/**
 * Constructs an exception object that is thrown due to a developer error, e.g., invalid argument,
 * argument out of range, etc.  This exception should only be thrown during development;
 * it usually indicates a bug in the calling code.  This exception should never be
 * caught; instead the calling code should strive not to generate it.
 * <br /><br />
 * On the other hand, a {@link RuntimeError} indicates an exception that may
 * be thrown at runtime, e.g., out of memory, that the calling code should be prepared
 * to catch.
 *
 * @alias DeveloperError
 * @constructor
 * @extends Error
 *
 * @param {string} [message] The error message for this exception.
 *
 * @see RuntimeError
 */
function DeveloperError(message) {
  /**
   * 'DeveloperError' indicating that this exception was thrown due to a developer error.
   * @type {string}
   * @readonly
   */
  this.name = "DeveloperError";

  /**
   * The explanation for why this exception was thrown.
   * @type {string}
   * @readonly
   */
  this.message = message;

  //Browsers such as IE don't have a stack property until you actually throw the error.
  let stack;
  try {
    throw new Error();
  } catch (e) {
    stack = e.stack;
  }

  /**
   * The stack trace of this exception, if available.
   * @type {string}
   * @readonly
   */
  this.stack = stack;
}

if (defined(Object.create)) {
  DeveloperError.prototype = Object.create(Error.prototype);
  DeveloperError.prototype.constructor = DeveloperError;
}

DeveloperError.prototype.toString = function () {
  let str = `${this.name}: ${this.message}`;

  if (defined(this.stack)) {
    str += `\n${this.stack.toString()}`;
  }

  return str;
};

/**
 * @private
 */
DeveloperError.throwInstantiationError = function () {
  throw new DeveloperError(
    "This function defines an interface and should not be called directly."
  );
};
export default DeveloperError;
