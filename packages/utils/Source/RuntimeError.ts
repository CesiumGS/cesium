import defined from "./defined";

/**
 *
 * Constructs an exception object that is thrown due to an error that can occur at runtime, e.g.,
 * out of memory, could not compile shader, etc.  If a function may throw this
 * exception, the calling code should be prepared to catch it.
 * <br /><br />
 * On the other hand, a {@link DeveloperError} indicates an exception due
 * to a developer error, e.g., invalid argument, that usually indicates a bug in the
 * calling code.
 *
 * @class RuntimeError
 * @extends Error
 *
 * @param {string} [message] The error message for this exception.
 *
 * @see DeveloperError
 */
class RuntimeError extends Error {
  /**
   * 'RuntimeError' indicating that this exception was thrown due to a runtime error.
   * @member {string} name
   * @memberof RuntimeError.prototype
   * @readonly
   */
  override readonly name: string = "RuntimeError";

  /**
   * The explanation for why this exception was thrown.
   * @member {string} message
   * @memberof RuntimeError.prototype
   * @readonly
   */
  override readonly message: string;

  /**
   * The stack trace of this exception, if available.
   * @member {string} stack
   * @memberof RuntimeError.prototype
   * @readonly
   */
  override readonly stack?: string;

  constructor(message?: string) {
    super(message);

    this.message = message ?? "";

    // Set the prototype explicitly for environments where subclassing Error doesn't work properly
    Object.setPrototypeOf(this, RuntimeError.prototype);

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
}

export default RuntimeError;
