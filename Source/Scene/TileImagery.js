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

    var TileImagery = function(imageryLayer, x, y, level) {
        this.imageryLayer = imageryLayer;
        this.x = x;
        this.y = y;
        this.level = level;
        this.extent = imageryLayer.imageryProvider.tilingScheme.tileXYToExtent(x, y, level);

        //TODO: pass these in
        this.textureTranslation = new Cartesian2(0, 0);
        this.textureScale = new Cartesian2(1, 1);

        this.state = TileState.UNLOADED;
        this.image = undefined;
        this.transformedImage = undefined;
        this.texture = undefined;
    };

    return TileImagery;
});