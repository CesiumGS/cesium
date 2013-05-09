/*global define*/
define(['../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Event',
        '../ThirdParty/knockout'
        ], function(
                defaultValue,
                DeveloperError,
                Event,
                knockout) {
    "use strict";

    /**
     * Create a Command from a given function, for use with ViewModels.
     *
     * A Command is a function with an extra <code>canExecute</code> observable property to determine
     * whether the command can be executed.  When executed, a Command function will check the
     * value of <code>canExecute</code> and throw if false.  It also provides events for when
     * a command has been or is about to be executed.
     *
     * @exports createCommand
     *
     * @param {Function} func The function to execute.
     * @param {Observable} [canExecute=true] An observable indicating if the function can currently be executed.
     *
     * @exception {DeveloperError} func is required.
     */
    var createCommand = function(func, canExecute) {
        if (typeof func === 'undefined') {
            throw new DeveloperError('func is required.');
        }

        canExecute = defaultValue(canExecute, knockout.observable(true));

        var beforeExecute = new Event();
        var afterExecute = new Event();

        function command() {
            if (!canExecute()) {
                throw new DeveloperError('Cannot execute command, canExecute is false.');
            }

            var commandInfo = {
                args : arguments,
                cancel : false
            };

            var result;
            beforeExecute.raiseEvent(commandInfo);
            if (!commandInfo.cancel) {
                result = func.apply(null, arguments);
                afterExecute.raiseEvent(result);
            }
            return result;
        }

        command.canExecute = canExecute;
        command.beforeExecute = beforeExecute;
        command.afterExecute = afterExecute;

        return command;
    };

    return createCommand;
});