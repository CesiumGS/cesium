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
         *
         * @constant
         * @type String
         */
        this.name = 'RuntimeError';

        /**
         * The explanation for why this exception was thrown.
         *
         * @type String
         */
        this.message = message;

        try {
            var err = new Error();

            /**
             * Error object, containing a stack trace if provided by the JavaScript engine.
             * <br/><br/>
             * See also: {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error}
             *
             * @constant
             * @type Error
             */
            this.error = err;
        } catch (ex) {}
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
