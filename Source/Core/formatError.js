define([
        './defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Formats an error object into a String.  If available, uses name, message, and stack
     * properties, otherwise, falls back on toString().
     *
     * @exports formatError
     *
     * @param {*} object The item to find in the array.
     * @returns {String} A string containing the formatted error.
     */
    function formatError(object) {
        var result;

        var name = object.name;
        var message = object.message;
        if (defined(name) && defined(message)) {
            result = name + ': ' + message;
        } else {
            result = object.toString();
        }

        var stack = object.stack;
        if (defined(stack)) {
            result += '\n' + stack;
        }

        return result;
    }

    return formatError;
});
