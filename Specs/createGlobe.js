/*global define*/
define([
        'Core/defaultValue',
        'Core/Ellipsoid'
    ], function(
        defaultValue,
        Ellipsoid) {
    "use strict";

    function createGlobe(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var globe = {
            callback : undefined,
            removedCallback : false,
            ellipsoid : ellipsoid,
            update : function() {},
            getHeight : function() {
                return 0.0;
            },
            _surface : {},
            destroy : function() {}
        };

        globe._surface.updateHeight = function(position, callback) {
            globe.callback = callback;
            return function() {
                globe.removedCallback = true;
                globe.callback = undefined;
            };
        };

        return globe;
    }

    return createGlobe;
});