/*global require*/
// require in the complete Cesium object and reassign it globally.
// This is meant for use with the Almond loader.
require([
        'Cesium'
    ], function(
        Cesium) {
    "use strict";
    /*global self*/
    var scope = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
    var previousC = scope.C;

    scope.C = Cesium;

    scope.C.noConflict = function() {
        scope.C = previousC;
        return Cesium;
    };

}, undefined, true);
