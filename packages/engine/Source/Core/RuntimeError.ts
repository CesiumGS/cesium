/**
 * Constructs an exception object that is thrown due to an error that can occur at runtime, e.g.,
 * out of memory, could not compile shader, etc. If a function may throw this
 * exception, the calling code should be prepared to catch it.
 *
 * On the other hand, a {@link DeveloperError} indicates an exception due
 * to a developer error, e.g., invalid argument, that usually indicates a bug in the
 * calling code.
 *
 * @see DeveloperError
 */
export class RuntimeError extends Error {
  /**
   * 'RuntimeError' indicating that this exception was thrown due to a runtime error.
   */
  override readonly name = "RuntimeError" as const;

  /**
   * Creates a new RuntimeError instance.
   * @param message - The error message for this exception.
   */
  constructor(message?: string) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuntimeError);
    }

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, RuntimeError.prototype);
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
}

export default RuntimeError;
