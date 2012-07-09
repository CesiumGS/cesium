/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './TileState',
        './WebMercatorTilingScheme'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        TileState,
        WebMercatorTilingScheme) {
    "use strict";

    var TileImagery = function() {
        this.state = TileState.UNLOADED;
        this.imagery = undefined;
        this.transformedImagery = undefined;
        this.texture = undefined;
    };

    return TileImagery;
});