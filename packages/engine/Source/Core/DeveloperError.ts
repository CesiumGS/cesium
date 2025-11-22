/**
 * Constructs an exception object that is thrown due to a developer error, e.g., invalid argument,
 * argument out of range, etc. This exception should only be thrown during development;
 * it usually indicates a bug in the calling code. This exception should never be
 * caught; instead the calling code should strive not to generate it.
 *
 * On the other hand, a {@link RuntimeError} indicates an exception that may
 * be thrown at runtime, e.g., out of memory, that the calling code should be prepared
 * to catch.
 *
 * @see RuntimeError
 */
export class DeveloperError extends Error {
  /**
   * 'DeveloperError' indicating that this exception was thrown due to a developer error.
   */
  override readonly name = "DeveloperError" as const;

  /**
   * Creates a new DeveloperError instance.
   * @param message - The error message for this exception.
   */
  constructor(message?: string) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DeveloperError);
    }

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, DeveloperError.prototype);
  }

  /**
   * Returns a string representation of this error.
   */
  override toString(): string {
    let str = `${this.name}: ${this.message}`;
    if (this.stack) {
      str += `\n${this.stack}`;
    }
    return str;
  }

  /**
   * Throws an error indicating that a function defines an interface and should not be called directly.
   * @throws {DeveloperError} Always throws.
   */
  static throwInstantiationError(): never {
    throw new DeveloperError(
      "This function defines an interface and should not be called directly."
    );
  }
}

export default DeveloperError;
