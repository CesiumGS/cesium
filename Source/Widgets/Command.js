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

        /**
         * An event which is raised before the command executes, the event
         * is raised with an object containing two properties: a <code>cancel</code> property,
         * which if set to false by the listener will prevent the command from being executed, and
         * an <code>args</code> property, which is the array of arguments being passed to the command.
         * @type Event
         */
        this.beforeExecute = undefined;

        /**
         * An event which is raised after the command executes, the event
         * is raised with the return value of the command as its only parameter.
         * @type Event
         */
        this.afterExecute = undefined;

        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return Command;
});