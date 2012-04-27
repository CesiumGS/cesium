define(['Core/binarySearch'], function(binarySearch) {
    "use strict";

    function sampleComparison(a, b) {
        if (a < b) {
            return -1;
        }

        if (a > b) {
            return 1;
        }

        return 0;
    }

    return function(x, xTable, yTable, degree, yStride, inputOrder, outputOrder, interpolator) {
        var index = binarySearch(xTable, x, sampleComparison);
        if (index < 0) {
            index = ~index;
            if (index >= xTable.length) {
                index = xTable.length - 1;
            }
        } else if (outputOrder <= inputOrder) {
            // The value requested is in the table, so return it.
            var result = new Array((outputOrder + 1) * yStride);
            var sourceIndex = yStride * (inputOrder + 1) * index;
            for ( var i = 0; i <= outputOrder; ++i) {
                for ( var j = 0; j < yStride; ++j) {
                    var offset = i * yStride + j;
                    result[offset] = yTable[sourceIndex + offset];
                }
            }
            return result;
        }

        var firstIndex = 0;
        var lastIndex = xTable.length - 1;

        var numberOfPoints = interpolator.getRequiredDataPoints(degree, inputOrder);

        degree = numberOfPoints - 1;
        var pointsInCollection = lastIndex - firstIndex + 1;

        if (pointsInCollection < degree + 1) {
            // Use the entire range.
        } else {
            var computedFirstIndex = index - ((degree / 2) | 0) - 1;

            if (computedFirstIndex < firstIndex) {
                computedFirstIndex = firstIndex;
            }

            var computedLastIndex = computedFirstIndex + degree;
            if (computedLastIndex > lastIndex) {
                computedLastIndex = lastIndex;
                computedFirstIndex = computedLastIndex - degree;
                if (computedFirstIndex < firstIndex) {
                    computedFirstIndex = firstIndex;
                }
            }

            firstIndex = computedFirstIndex;
            lastIndex = computedLastIndex;
        }

        var length = lastIndex - firstIndex + 1;

        return interpolator.interpolate(x, xTable, yTable, yStride, inputOrder, outputOrder, firstIndex, length);
    };
});