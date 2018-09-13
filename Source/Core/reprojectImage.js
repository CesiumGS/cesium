define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Color',
        './Rectangle'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        Color,
        Rectangle
    ) {
    'use strict';

    var cartographicScratch = new Cartographic();
    var cartesianScratch = new Cartesian3();
    var colorScratch = new Color();
    var sourceTexcoordScratch = new Cartesian2();
    var targetPixcoordScratch = new Cartesian2();

    /**
     *
     * @param {Bitmap} target
     * @param {Bitmap} source
     * @param {Rectangle} rectangle
     * @param {Rectangle} projectedRectangle
     * @param {MapProjection} projection
     */
    function reprojectImage(target, source, rectangle, projectedRectangle, projection) {
        target.clear();

        var targetWidth = target.width;
        var targetHeight = target.height;

        var cartographicWidth = Rectangle.width(rectangle);
        var cartographicHeight = Rectangle.height(rectangle);
        var longitudeStep = cartographicWidth / targetWidth;
        var latitudeStep = cartographicHeight / targetHeight;
        var west = rectangle.west;
        var south = rectangle.south;

        var inverseProjectedWidth = 1.0 / Rectangle.width(projectedRectangle);
        var inverseProjectedHeight = 1.0 / Rectangle.height(projectedRectangle);
        var projectedWidthOrigin = projectedRectangle.west;
        var projectedHeightOrigin = projectedRectangle.south;

        var cartographic = cartographicScratch;
        var color = colorScratch;
        var sourceTexcoord = sourceTexcoordScratch;
        var targetPixcoord = targetPixcoordScratch;

        for (var y = 0; y < targetHeight; y++) {
            for (var x = 0; x < targetWidth; x++) {
                cartographic.longitude = x * longitudeStep + west;
                cartographic.latitudeStep = y * latitudeStep + south;

                targetPixcoord.x = x;
                targetPixcoord.y = y;

                var projected = projection.project(cartographic, cartesianScratch);

                cartographic.longitude = projected.x;
                cartographic.latitude = projected.y;
                if (!Rectangle.contains(projectedRectangle, cartographic)) {
                    continue;
                }

                sourceTexcoord.x = (projected.x - projectedWidthOrigin) * inverseProjectedWidth;
                sourceTexcoord.y = (projected.y - projectedHeightOrigin) * inverseProjectedHeight;

                source.texture2D(sourceTexcoord, color);
                target.writePixel(targetPixcoord, color);
            }
        }
        return target;
    }

    return reprojectImage;
});
