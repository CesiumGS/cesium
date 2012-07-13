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
     * @alias DeveloperError
     *
     * @param {String} [message=undefined] The error message for this exception.
     *
     * @see RuntimeError
     * @constructor
     */
    var DeveloperError = function(message) {
        /**
         * 'DeveloperError' indicating that this exception was thrown due to a developer error.
         * @type String
         * @constant
         */
        this.name = 'DeveloperError';

        /**
         * The explanation for why this exception was thrown.
         * @type String
         * @constant
         */
        this.message = message;

        /**
         * The Error object containing the stack trace.
         * @type Error
         * @constant
         *
         * @see <a href='https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error'>Error object on Mozilla Developer Network</a>.
         */
        this.error = new Error();
    };

    DeveloperError.prototype.toString = function () {
        var str = this.name + ': ' + this.message;
        if (typeof this.error !== 'undefined') {
            if (typeof this.error.stack !== 'undefined') {
                str += '\n' + this.error.stack.toString();
            } else {
                str += '\n' + this.error.toString();
            }
        }
        return str;
    };

    return DeveloperError;
});
