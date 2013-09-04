/*global define*/
define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './EllipsoidTangentPlane',
        './PolylinePipeline',
        './Matrix3',
        './Quaternion',
        './Math'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        CornerType,
        EllipsoidTangentPlane,
        PolylinePipeline,
        Matrix3,
        Quaternion,
        CesiumMath) {
    "use strict";

    /**
     * @private
     */
    var CorridorGeometryLibrary = {};

    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    var scratch3 = new Cartesian3();
    var scratch4 = new Cartesian3();

    var scaleArray2 = [new Cartesian3(), new Cartesian3()];

    var cartesian1 = new Cartesian3();
    var cartesian2 = new Cartesian3();
    var cartesian3 = new Cartesian3();
    var cartesian4 = new Cartesian3();
    var cartesian5 = new Cartesian3();
    var cartesian6 = new Cartesian3();
    var cartesian7 = new Cartesian3();
    var cartesian8 = new Cartesian3();
    var cartesian9 = new Cartesian3();
    var cartesian10 = new Cartesian3();

    var originScratch = new Cartesian3();
    var nextScratch = new Cartesian3();
    var prevScratch = new Cartesian3();
    function angleIsGreaterThanPi (forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = Cartesian2.subtract(prev, origin, prev);
        next = Cartesian2.subtract(next, origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    }

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    function computeRoundCorner (cornerPoint, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid) {
        var angle = Cartesian3.angleBetween(Cartesian3.subtract(startPoint, cornerPoint, scratch1), Cartesian3.subtract(endPoint, cornerPoint, scratch2));
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
    }

    function addEndCaps (calculatedPositions, width, ellipsoid) {
        var cornerPoint = cartesian1;
        var startPoint = cartesian2;
        var endPoint = cartesian3;

        var leftEdge = calculatedPositions[1];
        startPoint = Cartesian3.fromArray(calculatedPositions[1], leftEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
        cornerPoint = Cartesian3.add(startPoint, endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = Cartesian3.add(startPoint, endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner (position, startPoint, leftCornerDirection, lastPoint, leftIsOutside, granularity, ellipsoid) {
        var cornerPoint = scratch1;
        if (leftIsOutside) {
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        }
        return [cornerPoint.x, cornerPoint.y, cornerPoint.z, lastPoint.x, lastPoint.y, lastPoint.z];
    }

    function addShiftedPositions (positions, left, scalar, calculatedPositions) {
        var rightPositions = new Array(positions.length);
        var leftPositions = new Array(positions.length);
        var scaledLeft = left.multiplyByScalar(scalar, scratch1);
        var scaledRight = scaledLeft.negate(scratch2);
        var rightIndex = 0;
        var leftIndex = positions.length - 1;

        for (var i = 0; i < positions.length; i += 3) {
            var pos = Cartesian3.fromArray(positions, i, scratch3);
            var rightPos = Cartesian3.add(pos, scaledRight, scratch4);
            rightPositions[rightIndex++] = rightPos.x;
            rightPositions[rightIndex++] = rightPos.y;
            rightPositions[rightIndex++] = rightPos.z;

            var leftPos = Cartesian3.add(pos, scaledLeft, scratch4);
            leftPositions[leftIndex--] = leftPos.z;
            leftPositions[leftIndex--] = leftPos.y;
            leftPositions[leftIndex--] = leftPos.x;
        }
        calculatedPositions.push(rightPositions, leftPositions);

        return calculatedPositions;
    }

    /**
     * @private
     */
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

    /**
     * @private
     */
    CorridorGeometryLibrary.computePositions = function (params) {
        var granularity = params.granularity;
        var positions = params.positions;
        var width = params.width / 2;
        var ellipsoid = params.ellipsoid;
        var cornerType = params.cornerType;
        var saveAttributes = params.saveAttributes;
        var normal = cartesian1;
        var forward = cartesian2;
        var backward = cartesian3;
        var left = cartesian4;
        var cornerDirection = cartesian5;
        var startPoint = cartesian6;
        var previousPos = cartesian7;
        var rightPos = cartesian8;
        var leftPos = cartesian9;
        var center = cartesian10;
        var calculatedPositions = [];
        var calculatedLefts = (saveAttributes) ? [] : undefined;
        var calculatedNormals = (saveAttributes) ? [] : undefined;
        var position = positions[0]; //add first point
        var nextPosition = positions[1];

        forward = Cartesian3.normalize(Cartesian3.subtract(nextPosition, position, forward), forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
        if (saveAttributes) {
            calculatedLefts.push(left.x, left.y, left.z);
            calculatedNormals.push(normal.x, normal.y, normal.z);
        }
        previousPos = Cartesian3.clone(position, previousPos);
        position = nextPosition;
        backward = forward.negate(backward);

        var subdividedPositions;
        var corners = [];
        var i;
        var length = positions.length;
        for (i = 1; i < length - 1; i++) { // add middle points and corners
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            nextPosition = positions[i + 1];
            forward = Cartesian3.normalize(Cartesian3.subtract(nextPosition, position, forward), forward);
            cornerDirection = Cartesian3.normalize(Cartesian3.add(forward, backward, cornerDirection), cornerDirection);
            var doCorner = !Cartesian3.equalsEpsilon(cornerDirection.negate(scratch1), normal, CesiumMath.EPSILON2);
            if (doCorner) {
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, Cartesian3.magnitude(Cartesian3.cross(cornerDirection, backward, scratch1)));
                var leftIsOutside = angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
                if (leftIsOutside) {
                    rightPos = Cartesian3.add(position, cornerDirection, rightPos);
                    center = Cartesian3.add(rightPos, left.multiplyByScalar(width, center), center);
                    leftPos = Cartesian3.add(rightPos, left.multiplyByScalar(width * 2, leftPos), leftPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.scaleToSurface(scaleArray2, granularity, ellipsoid);
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    if (saveAttributes) {
                        calculatedLefts.push(left.x, left.y, left.z);
                        calculatedNormals.push(normal.x, normal.y, normal.z);
                    }
                    startPoint = leftPos.clone(startPoint);
                    left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
                    leftPos = Cartesian3.add(rightPos, left.multiplyByScalar(width * 2, leftPos), leftPos);
                    previousPos = Cartesian3.add(rightPos, left.multiplyByScalar(width, previousPos), previousPos);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        corners.push({leftPositions : computeRoundCorner(rightPos, startPoint, leftPos, cornerType, leftIsOutside, ellipsoid)});
                    } else {
                        corners.push({leftPositions : computeMiteredCorner(position, startPoint, cornerDirection.negate(cornerDirection), leftPos, leftIsOutside, granularity, ellipsoid)});
                    }
                } else {
                    leftPos = Cartesian3.add(position, cornerDirection, leftPos);
                    center = Cartesian3.add(leftPos, left.multiplyByScalar(width, center).negate(center), center);
                    rightPos = Cartesian3.add(leftPos, left.multiplyByScalar(width * 2, rightPos).negate(rightPos), rightPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.scaleToSurface(scaleArray2, granularity, ellipsoid);
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    if (saveAttributes) {
                        calculatedLefts.push(left.x, left.y, left.z);
                        calculatedNormals.push(normal.x, normal.y, normal.z);
                    }
                    startPoint = rightPos.clone(startPoint);
                    left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
                    rightPos = Cartesian3.add(leftPos, left.multiplyByScalar(width * 2, rightPos).negate(rightPos), rightPos);
                    previousPos = Cartesian3.add(leftPos, left.multiplyByScalar(width, previousPos).negate(previousPos), previousPos);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        corners.push({rightPositions : computeRoundCorner(leftPos, startPoint, rightPos, cornerType, leftIsOutside, ellipsoid)});
                    } else {
                        corners.push({rightPositions : computeMiteredCorner(position, startPoint, cornerDirection, rightPos, leftIsOutside, granularity, ellipsoid)});
                    }
                }
                backward = forward.negate(backward);
            }
            position = nextPosition;
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3.clone(position, scaleArray2[1]);
        subdividedPositions = PolylinePipeline.scaleToSurface(scaleArray2, granularity, ellipsoid);
        calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
        if (saveAttributes) {
            calculatedLefts.push(left.x, left.y, left.z);
            calculatedNormals.push(normal.x, normal.y, normal.z);
        }

        var endPositions;
        if (cornerType.value === CornerType.ROUNDED.value) {
            endPositions = addEndCaps(calculatedPositions, width, ellipsoid);
        }

        return {
            positions: calculatedPositions,
            corners: corners,
            lefts: calculatedLefts,
            normals: calculatedNormals,
            endPositions: endPositions
        };
    };

    return CorridorGeometryLibrary;
});
