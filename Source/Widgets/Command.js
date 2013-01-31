/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../ThirdParty/knockout-2.2.1'
        ], function(
         DeveloperError,
         defaultValue,
         ko) {
    "use strict";

    var Command = function(execute, canExecute) {
        if (typeof execute === 'undefined') {
            throw new DeveloperError('execute is required.');
        }
        this.canExecute = defaultValue(canExecute, ko.observable(true));
        this.execute = execute;
    };

    return Command;
});