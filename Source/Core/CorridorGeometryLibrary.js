/*global define*/
define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './EllipsoidTangentPlane',
        './Matrix3',
        './Quaternion',
        './Math'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        CornerType,
        EllipsoidTangentPlane,
        Matrix3,
        Quaternion,
        CesiumMath) {
    "use strict";

    /**
     * private
     */
    var CorridorGeometryLibrary = {};

    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    var scratch3 = new Cartesian3();
    var scratch4 = new Cartesian3();

    var originScratch = new Cartesian3();
    var nextScratch = new Cartesian3();
    var prevScratch = new Cartesian3();
    CorridorGeometryLibrary.angleIsGreaterThanPi = function(forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = Cartesian2.subtract(prev, origin, prev);
        next = Cartesian2.subtract(next, origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    };

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    CorridorGeometryLibrary.computeRoundCorner = function (cornerPoint, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid) {
        var angle = Cartesian3.angleBetween(startPoint.subtract(cornerPoint, scratch1), endPoint.subtract(cornerPoint, scratch2));
        var granularity = (cornerType.value === CornerType.BEVELED.value) ? 1 : Math.ceil(angle / CesiumMath.toRadians(5)) + 1;

        var size = granularity * 3;
        var array = new Array(size);

        array[size - 3] = endPoint.x;
        array[size - 2] = endPoint.y;
        array[size - 1] = endPoint.z;

        var m;
        if (leftIsOutside) {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint, angle / granularity, quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint.negate(scratch1), angle / granularity, quaterion), rotMatrix);
        }

        var index = 0;
        startPoint = startPoint.clone(scratch1);
        for ( var i = 0; i < granularity; i++) {
            startPoint = m.multiplyByVector(startPoint, startPoint);
            array[index++] = startPoint.x;
            array[index++] = startPoint.y;
            array[index++] = startPoint.z;
        }

        return array;
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
        var firstEndCap = CorridorGeometryLibrary.computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = startPoint.add(endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var lastEndCap = CorridorGeometryLibrary.computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        return [firstEndCap, lastEndCap];
    };

    CorridorGeometryLibrary.computeMiteredCorner = function (position, startPoint, leftCornerDirection, lastPoint, leftIsOutside, granularity, ellipsoid) {
        var cornerPoint = scratch1;
        if (leftIsOutside) {
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        }
        return [cornerPoint.x, cornerPoint.y, cornerPoint.z, lastPoint.x, lastPoint.y, lastPoint.z];
    };

    CorridorGeometryLibrary.addAttribute = function (attribute, value, front, back) {
        var x = value.x;
        var y = value.y;
        var z = value.z;
        if (defined(front)) {
            attribute[front] = x;
            attribute[front + 1] = y;
            attribute[front + 2] = z;
        }
        if (defined(back)) {
            attribute[back] = z;
            attribute[back - 1] = y;
            attribute[back - 2] = x;
        }
    };

    CorridorGeometryLibrary.addShiftedPositions = function(positions, left, scalar, calculatedPositions) {
        var rightPositions = new Array(positions.length);
        var leftPositions = new Array(positions.length);
        var scaledLeft = left.multiplyByScalar(scalar, scratch1);
        var scaledRight = scaledLeft.negate(scratch2);
        var rightIndex = 0;
        var leftIndex = positions.length - 1;

        for (var i = 0; i < positions.length; i += 3) {
            var pos = Cartesian3.fromArray(positions, i, scratch3);
            var rightPos = pos.add(scaledRight, scratch4);
            rightPositions[rightIndex++] = rightPos.x;
            rightPositions[rightIndex++] = rightPos.y;
            rightPositions[rightIndex++] = rightPos.z;

            var leftPos = pos.add(scaledLeft, scratch4);
            leftPositions[leftIndex--] = leftPos.z;
            leftPositions[leftIndex--] = leftPos.y;
            leftPositions[leftIndex--] = leftPos.x;
        }
        calculatedPositions.push(rightPositions, leftPositions);

        return calculatedPositions;
    };

    return CorridorGeometryLibrary;
});