/*global define*/
define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './EllipsoidTangentPlane',
        './Matrix3',
        './Quaternion',
        './PolylinePipeline',
        './Math'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        CornerType,
        EllipsoidTangentPlane,
        Matrix3,
        Quaternion,
        PolylinePipeline,
        CesiumMath) {
    "use strict";

    /**
     * private
     */
    var CorridorGeometryLibrary = {};

    var posScratch = new Cartesian3();
    function scaleToSurface (positions, ellipsoid){
        for (var i = 0; i < positions.length; i += 3) {
            posScratch = Cartesian3.fromArray(positions, i, posScratch);
            posScratch = ellipsoid.scaleToGeodeticSurface(posScratch, posScratch);
            positions[i] = posScratch.x;
            positions[i + 1] = posScratch.y;
            positions[i + 2] = posScratch.z;
        }

        return positions;
    }


    var originScratch = new Cartesian2();
    var nextScratch = new Cartesian2();
    var prevScratch = new Cartesian2();
    CorridorGeometryLibrary.angleIsGreaterThanPi = function (forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = prev.subtract(origin, prev);
        next = next.subtract(origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    };

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    CorridorGeometryLibrary.computeRoundCorner = function (cornerPoint, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid) {
        var angle = Cartesian3.angleBetween(startPoint.subtract(cornerPoint, scratch1), endPoint.subtract(cornerPoint, scratch2));
        var granularity = (cornerType.value === CornerType.BEVELED.value) ? 0 : Math.ceil(angle/CesiumMath.toRadians(5));

        var size = (granularity + 1)*3;
        var array = new Array(size);

        array[size - 3] = endPoint.x;
        array[size - 2] = endPoint.y;
        array[size - 1] = endPoint.z;

        var m;
        if (leftIsOutside) {
            m =  Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint, angle/(granularity+1), quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint.negate(scratch1), angle/(granularity+1), quaterion), rotMatrix);
        }

        var index = 0;
        startPoint = startPoint.clone(scratch1);
        for (var i = 0; i < granularity + 1; i++) {
            startPoint = m.multiplyByVector(startPoint, startPoint);
            array[index++] = startPoint.x;
            array[index++] = startPoint.y;
            array[index++] = startPoint.z;
        }
        array = scaleToSurface(array, ellipsoid);

        if (leftIsOutside) {
            return {
                leftPositions: array
            };
        }
        return {
            rightPositions: array
        };
    };

    var cartesian1 = new Cartesian3();
    var cartesian2 = new Cartesian3();
    var cartesian3 = new Cartesian3();
    CorridorGeometryLibrary.addEndCaps = function (calculatedPositions, width, ellipsoid) {
        var cornerPoint = cartesian1;
        var startPoint = cartesian2;
        var endPoint = cartesian3;

        var leftEdge = calculatedPositions[1];
        startPoint = Cartesian3.fromArray(calculatedPositions[1], leftEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
        cornerPoint = startPoint.add(endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var firstEndCap =  CorridorGeometryLibrary.computeRoundCorner(cornerPoint, startPoint, endPoint, false, false, ellipsoid);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = startPoint.add(endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var lastEndCap =  CorridorGeometryLibrary.computeRoundCorner(cornerPoint, startPoint, endPoint, false, false, ellipsoid);

        return [firstEndCap, lastEndCap];
    };

    CorridorGeometryLibrary.computeMiteredCorner = function (position, startPoint, leftCornerDirection, lastPoint, leftIsOutside, granularity, ellipsoid) {
        if (leftIsOutside) {
            var leftPos = Cartesian3.add(position, leftCornerDirection);
            var leftArray = PolylinePipeline.scaleToSurface([startPoint, leftPos, lastPoint], granularity, ellipsoid);
            leftArray.shift();
            leftArray.shift();
            leftArray.shift();
            return {
                leftPositions: leftArray
            };
        }

        leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
        var rightPos = Cartesian3.add(position, leftCornerDirection);
        var rightArray = PolylinePipeline.scaleToSurface([startPoint, rightPos, lastPoint], granularity, ellipsoid);
        rightArray.shift();
        rightArray.shift();
        rightArray.shift();
        return {
            rightPositions: rightArray
        };
    };

    CorridorGeometryLibrary.addAttribute = function (attribute, value, front, back) {
        var x = value.x;
        var y = value.y;
        var z = value.z;
        if (defined(front)) {
            attribute[front] = x;
            attribute[front+1] = y;
            attribute[front+2] = z;
        }
        if (defined(back)) {
            attribute[back] = z;
            attribute[back-1] = y;
            attribute[back-2] = x;
        }

        return attribute;
    };

    return CorridorGeometryLibrary;
});