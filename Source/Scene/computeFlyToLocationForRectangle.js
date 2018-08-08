define([
    '../Core/defined',
    '../Core/Rectangle',
    '../Core/sampleTerrainMostDetailed',
    './SceneMode',
    '../ThirdParty/when'
], function(
    defined,
    Rectangle,
    sampleTerrainMostDetailed,
    SceneMode,
    when) {
'use strict';

    /**
     * Computes the final camera location to view a rectangle adjusted for terrain.
     *
     * @param {Rectangle} rectangle The rectangle being zoomed to.
     * @param {Scene} scene The scene being used.
     *
     * @returns {Cartographic|Rectangle} The location to place the camera or the original rectangle if terrain does not have availability.
     *
     * @private
     */
    function computeFlyToLocationForRectangle(rectangle, scene) {
        var terrainProvider = scene.terrainProvider;
        var availability = defined(terrainProvider) ? terrainProvider.availability : undefined;

        if (!defined(availability) || scene.mode === SceneMode.SCENE2D) {
            return when.resolve(rectangle);
        }

        var cartographics = [
            Rectangle.center(rectangle),
            Rectangle.southeast(rectangle),
            Rectangle.southwest(rectangle),
            Rectangle.northeast(rectangle),
            Rectangle.northwest(rectangle)
        ];

        return computeFlyToLocationForRectangle._sampleTerrainMostDetailed(terrainProvider, cartographics)
            .then(function(positionsOnTerrain) {
                var maxHeight = positionsOnTerrain.reduce(function(currentMax, item) {
                    return Math.max(item.height, currentMax);
                }, -Number.MAX_VALUE);

                var finalPosition;

                var camera = scene.camera;
                var mapProjection = scene.mapProjection;
                var ellipsoid = mapProjection.ellipsoid;
                var tmp = camera.getRectangleCameraCoordinates(rectangle);
                if (scene.mode === SceneMode.SCENE3D) {
                    finalPosition = ellipsoid.cartesianToCartographic(tmp);
                } else {
                    finalPosition = mapProjection.unproject(tmp);
                }

                finalPosition.height += maxHeight;
                return finalPosition;
            });
    }

    //Exposed for testing.
    computeFlyToLocationForRectangle._sampleTerrainMostDetailed = sampleTerrainMostDetailed;

    return computeFlyToLocationForRectangle;
});
