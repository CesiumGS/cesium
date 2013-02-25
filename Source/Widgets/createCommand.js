/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../ThirdParty/knockout'
    ], function(
        defaultValue,
        DeveloperError,
        knockout) {
    "use strict";

    /**
     * Create a Command from a given function, for use with ViewModels.
     *
     * A Command is a function with an extra <code>canExecute</code> observable property to determine
     * whether the command can be executed.  When executed, a Command function will check the
     * value of <code>canExecute</code> and throw if false.
     *
     * @exports createCommand
     *
     * @param {Function} func The function to execute.
     * @param {Observable} [canExecute=true] An observable indicating if the function can currently be executed.
     */
    var createCommand = function(func, canExecute) {
        canExecute = defaultValue(canExecute, knockout.observable(true));

        function command() {
            if (!canExecute()) {
                throw new DeveloperError('Cannot execute command, canExecute is false.');
            }
            return func.apply(null, arguments);
        }

        command.canExecute = canExecute;

        return command;

    };

    return createCommand;
});