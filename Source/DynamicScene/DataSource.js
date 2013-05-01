/*global define*/
define(['../Core/DeveloperError'
        ], function(
                DeveloperError) {
    "use strict";

    var DataSource = function() {
        this.changed = undefined;
    };

    DataSource.prototype.getClock = function() {
    };

    DataSource.prototype.getDynamicObjectCollection = function() {
    };

    DataSource.prototype.getIsTemporal = function() {
    };

    DataSource.prototype.getIsReady = function() {
    };

    return DataSource;
});