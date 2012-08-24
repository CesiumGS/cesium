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

    var TileImagery = function(imagery, textureTranslation, textureScale, minTexCoords, maxTexCoords) {
        this.imagery = imagery;
        this.textureTranslation = textureTranslation;
        this.textureScale = textureScale;
        this.minTexCoords = minTexCoords;
        this.maxTexCoords = maxTexCoords;
    };

    return TileImagery;
});