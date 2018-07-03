define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './Check',
        './IntersectionTests',
        './Math',
        './Matrix3',
        './OrientedBoundingBox',
        './Plane',
        './Ray'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        Check,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        OrientedBoundingBox,
        Plane,
        Ray
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
    var scratchOrigin = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchRay = new Ray();
    var scratchPlane = new Plane(Cartesian3.UNIT_X, 0);
    var obbScratch = new OrientedBoundingBox();

    // call after removeDuplicates
    PolygonGeometryLibrary.projectTo2D = function(positions, positionsResult, normalResult, tangentResult, bitangentResult) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('positions', positions);
        Check.defined('positionsResult', positionsResult);
        //>>includeEnd('debug');

        var obb = OrientedBoundingBox.fromPoints(positions, obbScratch);
        var halfAxes = obb.halfAxes;
        var xAxis = Matrix3.getColumn(halfAxes, 0, scratchXAxis);
        var yAxis = Matrix3.getColumn(halfAxes, 1, scratchYAxis);
        var zAxis = Matrix3.getColumn(halfAxes, 2, scratchZAxis);

        var xMag = Cartesian3.magnitude(xAxis);
        var yMag = Cartesian3.magnitude(yAxis);
        var zMag = Cartesian3.magnitude(zAxis);
        var min = Math.min(xMag, yMag, zMag);

        var i;
        // If all the points are on a line, just remove one of the zero dimensions
        if ((xMag === 0 && (yMag === 0 || zMag === 0)) || (yMag === 0 && zMag === 0)) {
            return;
        }
        var center = obb.center;
        var planeXAxis;
        var planeYAxis;
        var origin = Cartesian3.clone(center, scratchOrigin);
        var normal;
        if (min === xMag) {
            if (min !== 0) {
                origin = Cartesian3.add(origin, xAxis, origin);
                normal = Cartesian3.normalize(xAxis, scratchNormal);
            }
            planeXAxis = Cartesian3.normalize(yAxis, yAxis);
            planeYAxis = Cartesian3.normalize(zAxis, zAxis);
        } else if (min === yMag) {
            if (min !== 0) {
                origin = Cartesian3.add(origin, yAxis, origin);
                normal = Cartesian3.normalize(yAxis, scratchNormal);
            }
            planeXAxis = Cartesian3.normalize(xAxis, xAxis);
            planeYAxis = Cartesian3.normalize(zAxis, zAxis);
        } else {
            if (min !== 0) {
                origin = Cartesian3.add(origin, zAxis, origin);
                normal = Cartesian3.normalize(zAxis, scratchNormal);
            }
            planeXAxis = Cartesian3.normalize(xAxis, xAxis);
            planeYAxis = Cartesian3.normalize(yAxis, yAxis);
        }

        if (min === 0) {
            normal = Cartesian3.cross(planeXAxis, planeYAxis, scratchNormal);
            normal = Cartesian3.normalize(normal, normal);
        }

        if (defined(normalResult)) {
            Cartesian3.clone(normal, normalResult);
        }
        if (defined(tangentResult)) {
            Cartesian3.clone(planeXAxis, tangentResult);
        }
        if (defined(bitangentResult)) {
            Cartesian3.clone(planeYAxis, bitangentResult);
        }

        var plane = Plane.fromPointNormal(origin, normal, scratchPlane);
        var ray = scratchRay;
        ray.direction = Cartesian3.clone(normal, ray.direction);

        for (i = 0; i < positions.length; i++) {
            ray.origin = Cartesian3.clone(positions[i], ray.origin);

            var intersectionPoint = IntersectionTests.rayPlane(ray, plane, scratchIntersectionPoint);

            if (!defined(intersectionPoint)) {
                ray.direction = Cartesian3.negate(ray.direction, ray.direction);
                intersectionPoint = IntersectionTests.rayPlane(ray, plane, scratchIntersectionPoint);
            }
            var v = Cartesian3.subtract(intersectionPoint, origin, intersectionPoint);
            var x = Cartesian3.dot(planeXAxis, v);
            var y = Cartesian3.dot(planeYAxis, v);

            positionsResult[i] = Cartesian2.fromElements(x, y, positionsResult[i]);
        }

        return positionsResult;
    };

    return PolygonGeometryLibrary;
});
