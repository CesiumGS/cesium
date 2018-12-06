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
    'use strict';

    function createGlobe(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var globe = {
            callback : undefined,
            removedCallback : false,
            ellipsoid : ellipsoid,
            beginFrame: function() {},
            endFrame: function() {},
            update : function() {},
            render : function() {},
            getHeight : function() {
                return 0.0;
            },
            _surface : {},
            tileLoadedEvent : new Event(),
            imageryLayersUpdatedEvent : new Event(),
            _terrainProvider : undefined,
            terrainProviderChanged : new Event(),
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
                get : function() {
                    return this._terrainProvider;
                },
                set : function(value) {
                    this._terrainProvider = value;
                    this.terrainProviderChanged.raiseEvent(value);
                }
            }
        });

        return globe;
    }

    return createGlobe;
});
