/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Enumeration'
    ], function(
        DeveloperError,
        Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports Projections
     */
    var Projections = {
        WGS84 : new Enumeration(0, 'WGS84', {
            toWgs84 : function(extent, image) {
                return image;
            }
        }),
        MERCATOR : new Enumeration(1, 'MERCATOR', {
            toWgs84 : function(extent, image) {
                if (typeof extent === 'undefined' || typeof extent.north === 'undefined' || typeof extent.south === 'undefined') {
                    throw new DeveloperError('extent, extent.north and extent.south are required.');
                }

                if (typeof image === 'undefined') {
                    throw new DeveloperError('image is required.');
                }

                var width = parseInt(image.width, 10);
                var height = parseInt(image.height, 10);
                var wRowBytes = width * 4; // Always 4 bytes per pixel.

                // draw image to canvas and get the pixels
                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                var context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                var fromPixels = context.getImageData(0, 0, width, height).data;

                // create array of pixels
                var newImageData = context.createImageData(width, height);
                var toPixels = newImageData.data;

                // WGS84 parameters
                var deltaWLat = (extent.north - extent.south) / height;
                var currentWLat = extent.north - (0.5 * deltaWLat);

                // mercator parameters
                var sinTheta = Math.sin(extent.south);
                var minMLat = 0.5 * Math.log((1 + sinTheta) / (1 - sinTheta));
                sinTheta = Math.sin(extent.north);
                var maxMLat = 0.5 * Math.log((1 + sinTheta) / (1 - sinTheta));
                var invMLatDim = 1.0 / (maxMLat - minMLat);

                // first row
                var heightMinusOne = height - 1;
                var i = 0;
                for (; i < wRowBytes; ++i) {
                    toPixels[i] = fromPixels[i];
                }

                // interior rows
                var end, mLat, mRow;
                var j = 1;
                for (; j < heightMinusOne; ++j, currentWLat -= deltaWLat) {
                    sinTheta = Math.sin(currentWLat);
                    mLat = 0.5 * Math.log((1.0 + sinTheta) / (1.0 - sinTheta));
                    mRow = Math.floor(heightMinusOne - ((heightMinusOne * (mLat - minMLat) * invMLatDim)));
                    end = i + wRowBytes;
                    for ( var k = 0; i < end; ++i, ++k) {
                        toPixels[i] = fromPixels[mRow * wRowBytes + k];
                    }
                }

                // last row
                end = i + wRowBytes;
                for (j = 0; i < end; ++i, ++j) {
                    toPixels[i] = fromPixels[i];
                }

                // paint new image to canvas
                context.putImageData(newImageData, 0, 0);

                return canvas;
            }
        })
    };

    return Projections;
});