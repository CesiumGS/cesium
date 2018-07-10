define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './Check',
        './IntersectionTests',
        './Math',
        './Matrix3',
        './OrientedBoundingBox'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        Check,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        OrientedBoundingBox
    ) {
    'use strict';

    /**
     * @private
     */
    var PolygonGeometryLibrary = {};

    var scratchIntersectionPoint = new Cartesian3();
    var scratchXAxis = new Cartesian3();
    var scratchYAxis = new Cartesian3();
    var scratchZAxis = new Cartesian3();
    var obbScratch = new OrientedBoundingBox();

    // call after removeDuplicates
    PolygonGeometryLibrary.projectTo2D = function(positions, positionsResult, normalResult, tangentResult, bitangentResult) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('positions', positions);
        Check.defined('positionsResult', positionsResult);
        //>>includeEnd('debug');

        var orientedBoundingBox = OrientedBoundingBox.fromPoints(positions, obbScratch);
        var halfAxes = orientedBoundingBox.halfAxes;
        var xAxis = Matrix3.getColumn(halfAxes, 0, scratchXAxis);
        var yAxis = Matrix3.getColumn(halfAxes, 1, scratchYAxis);
        var zAxis = Matrix3.getColumn(halfAxes, 2, scratchZAxis);

        var xMag = Cartesian3.magnitude(xAxis);
        var yMag = Cartesian3.magnitude(yAxis);
        var zMag = Cartesian3.magnitude(zAxis);
        var min = Math.min(xMag, yMag, zMag);

        // If all the points are on a line return undefined because we can't draw a polygon
        if ((xMag === 0 && (yMag === 0 || zMag === 0)) || (yMag === 0 && zMag === 0)) {
            return;
        }

        var planeAxis1;
        var planeAxis2;

        if (min === yMag || min === zMag) {
            planeAxis1 = xAxis;
        }
        if (min === xMag) {
            planeAxis1 = yAxis;
        } else if (min === zMag) {
            planeAxis2 = yAxis;
        }
        if (min === xMag || min === yMag) {
            planeAxis2 = zAxis;
        }

        planeAxis1 = Cartesian3.normalize(planeAxis1, planeAxis1);
        planeAxis2 = Cartesian3.normalize(planeAxis2, planeAxis2);

        if (defined(normalResult)) {
            normalResult = Cartesian3.cross(planeAxis1, planeAxis2, normalResult);
            normalResult = Cartesian3.normalize(normalResult, normalResult);
        }
        if (defined(tangentResult)) {
            Cartesian3.clone(planeAxis1, tangentResult);
        }
        if (defined(bitangentResult)) {
            Cartesian3.clone(planeAxis2, bitangentResult);
        }

        for (var i = 0; i < positions.length; i++) {
            var position = positions[i];
            var v = Cartesian3.subtract(position, orientedBoundingBox.center, scratchIntersectionPoint);
            var x = Cartesian3.dot(planeAxis1, v);
            var y = Cartesian3.dot(planeAxis2, v);

            positionsResult[i] = Cartesian2.fromElements(x, y, positionsResult[i]);
        }

        positionsResult.length = positions.length;

        return positionsResult;
    };

    return PolygonGeometryLibrary;
});
