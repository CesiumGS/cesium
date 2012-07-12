/*global define*/
define(function() {
    "use strict";

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
     *
     * @param {String} [message=undefined] The error message for this exception.
     *
     * @see DeveloperError
     * @constructor
     */
    var RuntimeError = function(message) {
        /**
         * 'RuntimeError' indicating that this exception was thrown due to a runtime error.
         * @type String
         * @constant
         */
        this.name = 'RuntimeError';

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

    RuntimeError.prototype.toString = function () {
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

    return RuntimeError;
});
