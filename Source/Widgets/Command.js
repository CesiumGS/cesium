/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../ThirdParty/knockout'
        ], function(
         DeveloperError,
         defaultValue,
         knockout) {
    "use strict";

    /**
     * Encapsulate a function so that it can be exposed by ViewModels.
     * @alias Command
     * @constructor
     *
     * @param {Function} execute The function this command represents.
     * @param {Observable} [canExecute=true] An observable indicating if the function can currently be executed.
     */
    var Command = function(execute, canExecute) {
        /**
         * Executes this command.
         * @type Function
         */
        this.execute = execute;

        /**
         * Indicates if this command can currently be executed.
         * @type Observable
         */
        this.canExecute = defaultValue(canExecute, knockout.observable(true));
    };

    return Command;
});