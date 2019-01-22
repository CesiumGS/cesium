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
     * Create an unprojected version of the source imagery that covers the given rectangle.
     *
     * @param {Bitmap} target Target bitmap for unprojection.
     * @param {Rectangle} targetRectangle Rectangle that the target bitmap should cover in geographic coordinates
     * @param {Bitmap} source Source bitmap in some MapProjection
     * @param {Rectangle} sourceRectangle Rectangle that the source bitmap covers in geographic coordinates
     * @param {Rectangle} sourceProjectedRectangle Rectangle that the source bitmap covers in its own coordinate system
     * @param {MapProjection} projection Projection for the source image's coordinate system
     * @param {Boolean} flipY Whether or not the image's Y coordinates should be flipped.
     */
    function reprojectImage(target, targetRectangle, source, sourceRectangle, sourceProjectedRectangle, projection, flipY) {
        var targetWidth = target.width;
        var targetHeight = target.height;

        var cartographicWidth = Rectangle.computeWidth(targetRectangle);
        var cartographicHeight = Rectangle.computeHeight(targetRectangle);
        var longitudeStep = cartographicWidth / targetWidth;
        var latitudeStep = cartographicHeight / targetHeight;
        var west = targetRectangle.west;
        var north = targetRectangle.north;

        var inverseProjectedWidth = 1.0 / Rectangle.computeWidth(sourceProjectedRectangle);
        var inverseProjectedHeight = 1.0 / Rectangle.computeHeight(sourceProjectedRectangle);
        var projectedWidthOrigin = sourceProjectedRectangle.west;
        var projectedHeightOrigin = sourceProjectedRectangle.south;

        var cartographic = cartographicScratch;
        var color = colorScratch;
        var sourceTexcoord = sourceTexcoordScratch;
        var targetPixcoord = targetPixcoordScratch;

        // Trim reprojection area to intersection of targetRectangle and source image's coverage in geographic.
        var startX = 0;
        var startY = 0;
        var endX = targetHeight;
        var endY = targetWidth;

        if (sourceRectangle.west > targetRectangle.west) {
            startX = Math.floor((sourceRectangle.west - targetRectangle.west) / longitudeStep);
        }
        if (sourceRectangle.east < targetRectangle.east) {
            endX = Math.floor((sourceRectangle.east - targetRectangle.west) / longitudeStep);
        }
        if (sourceRectangle.north < targetRectangle.north) {
            startY = Math.floor((targetRectangle.north - sourceRectangle.north) / latitudeStep);
        }
        if (sourceRectangle.south > targetRectangle.south) {
            endY = Math.floor((targetRectangle.north - sourceRectangle.south) / latitudeStep);
        }

        var computeTexcoord = flipY ? computeTexcoordFlip : computeTexcoordNoFlip;

        for (var y = startY; y < endY; y++) {
            for (var x = startX; x < endX; x++) {
                cartographic.longitude = (x + 0.5) * longitudeStep + west;
                cartographic.latitude = north - (y + 0.5) * latitudeStep;

                targetPixcoord.x = x;
                targetPixcoord.y = y;

                var projected = projection.project(cartographic, cartesianScratch);

                cartographic.longitude = projected.x;
                cartographic.latitude = projected.y;
                if (!Rectangle.contains(sourceProjectedRectangle, cartographic)) {
                    continue;
                }

                computeTexcoord(sourceTexcoord, projected, projectedWidthOrigin, projectedHeightOrigin, inverseProjectedWidth, inverseProjectedHeight);

                source.texture2D(sourceTexcoord, color);
                target.writePixel(targetPixcoord, color);
            }
        }
        return target;
    }

    function computeTexcoordFlip(result, projected, projectedWidthOrigin, projectedHeightOrigin, inverseProjectedWidth, inverseProjectedHeight) {
        result.x = (projected.x - projectedWidthOrigin) * inverseProjectedWidth;
        result.y = 1.0 - (projected.y - projectedHeightOrigin) * inverseProjectedHeight;
    }

    function computeTexcoordNoFlip(result, projected, projectedWidthOrigin, projectedHeightOrigin, inverseProjectedWidth, inverseProjectedHeight) {
        result.x = (projected.x - projectedWidthOrigin) * inverseProjectedWidth;
        result.y = (projected.y - projectedHeightOrigin) * inverseProjectedHeight;
    }

    return reprojectImage;
});
