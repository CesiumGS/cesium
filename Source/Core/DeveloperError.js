/*global define*/
define(function() {
    "use strict";

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
     * @name DeveloperError
     *
     * @param {String} [message=undefined] The error message for this exception.
     * @param {String} [parameter=undefined] The name of the function argument that caused the exception.
     *
     * @see RuntimeError
     * @constructor
     */
    function DeveloperError(message, parameter) {
        /**
         * "DeveloperError" indicating that this exception was thrown due to a developer error.
         *
         * @constant
         * @type String
         */
        this.name = "DeveloperError";

        /**
         * The explanation for why this exception was thrown.
         *
         * @type String
         */
        this.message = message;

        /**
         * The name of the function argument that caused this exception.
         *
         * @type String
         */
        this.parameter = parameter;
    }

    return DeveloperError;
});
