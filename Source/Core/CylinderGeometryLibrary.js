/*global define*/
define([
        './Math'
    ], function(
        CesiumMath) {
    'use strict';

    /**
     * @private
     */
    var CylinderGeometryLibrary = {};

    /**
     * @private
     */
    CylinderGeometryLibrary.computePositions = function(length, topRadius, bottomRadius, slices, fill){
        var topZ = length * 0.5;
        var bottomZ = -topZ;

        var twoSlice = slices + slices;
        var size = (fill) ? 2 * twoSlice : twoSlice;
        var positions = new Float64Array(size*3);
        var i;
        var index = 0;
        var tbIndex = 0;
        var bottomOffset = (fill) ? twoSlice*3 : 0;
        var topOffset = (fill) ? (twoSlice + slices)*3 : slices*3;

        for (i = 0; i < slices; i++) {
            var angle = i / slices * CesiumMath.TWO_PI;
            var x = Math.cos(angle);
            var y = Math.sin(angle);
            var bottomX = x * bottomRadius;
            var bottomY = y * bottomRadius;
            var topX = x * topRadius;
            var topY = y * topRadius;

            positions[tbIndex + bottomOffset] = bottomX;
            positions[tbIndex + bottomOffset + 1] = bottomY;
            positions[tbIndex + bottomOffset + 2] = bottomZ;

            positions[tbIndex + topOffset] = topX;
            positions[tbIndex + topOffset + 1] = topY;
            positions[tbIndex + topOffset + 2] = topZ;
            tbIndex += 3;
            if (fill) {
                positions[index++] = bottomX;
                positions[index++] = bottomY;
                positions[index++] = bottomZ;
                positions[index++] = topX;
                positions[index++] = topY;
                positions[index++] = topZ;
            }
        }

        return positions;
    };

    return CylinderGeometryLibrary;
});
