define([
    'Core/defaultValue',
    'ThirdParty/when'
], function(
    defaultValue,
    when) {
    'use strict';

    function runLater(functionToRunLater, milliseconds) {
        milliseconds = defaultValue(milliseconds, 0);

        var deferred = when.defer();
        setTimeout(function() {
            try {
                deferred.resolve(functionToRunLater());
            } catch (e) {
                deferred.reject(e);
            }
        }, milliseconds);
        return deferred.promise;
    }

     return runLater;
 });
