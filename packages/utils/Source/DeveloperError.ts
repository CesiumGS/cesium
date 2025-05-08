import defined from "./defined";

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
 * @class DeveloperError
 * @extends Error
 *
 * @param {string} [message] The error message for this exception.
 *
 * @see RuntimeError
 */
class DeveloperError extends Error {
  /**
   * 'DeveloperError' indicating that this exception was thrown due to a developer error.
   * @member {string} name
   * @memberof DeveloperError.prototype
   * @readonly
   * @override
   */
  override readonly name: string = "DeveloperError";

  /**
   * The explanation for why this exception was thrown.
   * @member {string} message
   * @memberof DeveloperError.prototype
   * @readonly
   */
  override readonly message: string;

  /**
   * The stack trace of this exception, if available.
   * @member {string} stack
   * @memberof DeveloperError.prototype
   * @readonly
   */
  override readonly stack?: string;

  constructor(message?: string) {
    super(message);

    this.message = message ?? "";

    // Ensure the prototype chain is correctly set (especially for older environments)
    Object.setPrototypeOf(this, DeveloperError.prototype);

    // Capture stack trace if not automatically populated
    if (!this.stack) {
      //Browsers such as IE don't have a stack property until you actually throw the error.
      try {
        throw new Error();
      } catch (e) {
        if (e instanceof Error && e.stack) {
          this.stack = e.stack;
        }
      }
    }
  }

  override toString(): string {
    let str = `${this.name}: ${this.message}`;
    if (defined(this.stack)) {
      str += `\n${this.stack.toString()}`;
    }
    return str;
  }

  /**
   * @private
   */
  static throwInstantiationError(): never {
    throw new DeveloperError(
      "This function defines an interface and should not be called directly.",
    );
  }
}

export default DeveloperError;
