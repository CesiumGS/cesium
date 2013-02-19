/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * A Command is a function with an extra <code>canExecute</code> observable property to determine
     * whether the command can be executed.  When executed, a Command function will check the
     * value of <code>canExecute</code> and throw if false.
     *
     * This type describes an interface and is not intended to be instantiated directly.
     * See {@link createCommand} to create a command from a function.
     *
     * @alias Command
     * @constructor
     *
     * @param {Function} execute The function this command represents.
     * @param {Observable} [canExecute=true] An observable indicating if the function can currently be executed.
     */
    var Command = function(execute, canExecute) {
        /**
         * Indicates if this command can currently be executed.
         * @type Observable
         */
        this.canExecute = undefined;

        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return Command;
});