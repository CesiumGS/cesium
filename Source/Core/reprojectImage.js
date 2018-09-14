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

        var cartographicWidth = Rectangle.computeWidth(rectangle);
        var cartographicHeight = Rectangle.computeHeight(rectangle);
        var longitudeStep = cartographicWidth / targetWidth;
        var latitudeStep = cartographicHeight / targetHeight;
        var west = rectangle.west;
        var north = rectangle.north;

        var inverseProjectedWidth = 1.0 / Rectangle.computeWidth(projectedRectangle);
        var inverseProjectedHeight = 1.0 / Rectangle.computeHeight(projectedRectangle);
        var projectedWidthOrigin = projectedRectangle.west;
        var projectedHeightOrigin = projectedRectangle.south;

        var cartographic = cartographicScratch;
        var color = colorScratch;
        var sourceTexcoord = sourceTexcoordScratch;
        var targetPixcoord = targetPixcoordScratch;

        for (var y = 0; y < targetHeight; y++) {
            for (var x = 0; x < targetWidth; x++) {
                cartographic.longitude = (x + 0.5) * longitudeStep + west;
                cartographic.latitude = north - (y + 0.5) * latitudeStep;

                targetPixcoord.x = x;
                targetPixcoord.y = y;

                var projected = projection.project(cartographic, cartesianScratch);

                cartographic.longitude = projected.x;
                cartographic.latitude = projected.y;
                if (!Rectangle.contains(projectedRectangle, cartographic)) {
                    continue;
                }

                sourceTexcoord.x = (projected.x - projectedWidthOrigin) * inverseProjectedWidth;
                sourceTexcoord.y = 1.0 - (projected.y - projectedHeightOrigin) * inverseProjectedHeight;

                source.texture2D(sourceTexcoord, color);
                target.writePixel(targetPixcoord, color);
            }
        }
        return target;
    }

    return reprojectImage;
});
