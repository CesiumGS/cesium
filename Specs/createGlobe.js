/*global define*/
define([
        'Core/defaultValue',
        'Core/defineProperties',
        'Core/Ellipsoid',
        'Core/Event'
    ], function(
        defaultValue,
        defineProperties,
        Ellipsoid,
        Event) {
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

        globe.terrainProviderChanged = new Event();
        defineProperties(globe, {
            terrainProvider : {
                set : function(value) {
                    this.terrainProviderChanged.raiseEvent(value);
                }
            }
        });

        return globe;
    }

    return createGlobe;
});
