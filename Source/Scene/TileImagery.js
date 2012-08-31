/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './TileState'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        TileState) {
    "use strict";

    var TileImagery = function(imagery, textureTranslationAndScale, textureCoordinateExtent) {
        this.imagery = imagery;
        this.textureTranslationAndScale = textureTranslationAndScale;
        this.textureCoordinateExtent = textureCoordinateExtent;
    };

    return TileImagery;
});