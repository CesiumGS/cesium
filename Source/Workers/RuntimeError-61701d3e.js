/* This file is automatically rebuilt by the Cesium build process. */
define(['exports', './when-e6985d2a'], function (exports, when) { 'use strict';

  /**
   * Constructs an exception object that is thrown due to an error that can occur at runtime, e.g.,
   * out of memory, could not compile shader, etc.  If a function may throw this
   * exception, the calling code should be prepared to catch it.
   * <br /><br />
   * On the other hand, a {@link DeveloperError} indicates an exception due
   * to a developer error, e.g., invalid argument, that usually indicates a bug in the
   * calling code.
   *
   * @alias RuntimeError
   * @constructor
   * @extends Error
   *
   * @param {String} [message] The error message for this exception.
   *
   * @see DeveloperError
   */
  function RuntimeError(message) {
    /**
     * 'RuntimeError' indicating that this exception was thrown due to a runtime error.
     * @type {String}
     * @readonly
     */
    this.name = "RuntimeError";

    /**
     * The explanation for why this exception was thrown.
     * @type {String}
     * @readonly
     */
    this.message = message;

    //Browsers such as IE don't have a stack property until you actually throw the error.
    var stack;
    try {
      throw new Error();
    } catch (e) {
      stack = e.stack;
    }

    /**
     * The stack trace of this exception, if available.
     * @type {String}
     * @readonly
     */
    this.stack = stack;
  }

  if (when.defined(Object.create)) {
    RuntimeError.prototype = Object.create(Error.prototype);
    RuntimeError.prototype.constructor = RuntimeError;
  }

  RuntimeError.prototype.toString = function () {
    var str = this.name + ": " + this.message;

    if (when.defined(this.stack)) {
      str += "\n" + this.stack.toString();
    }

    return str;
  };

  exports.RuntimeError = RuntimeError;

});
