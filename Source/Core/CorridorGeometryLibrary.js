/*global define*/
define([
        './Cartesian3',
        './CornerType',
        './defined',
        './isArray',
        './Math',
        './Matrix3',
        './PolylinePipeline',
        './PolylineVolumeGeometryLibrary',
        './Quaternion'
    ], function(
        Cartesian3,
        CornerType,
        defined,
        isArray,
        CesiumMath,
        Matrix3,
        PolylinePipeline,
        PolylineVolumeGeometryLibrary,
        Quaternion) {
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

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(cornerPoint, startPoint, endPoint, cornerType, leftIsOutside) {
        var angle = Cartesian3.angleBetween(Cartesian3.subtract(startPoint, cornerPoint, scratch1), Cartesian3.subtract(endPoint, cornerPoint, scratch2));
        var granularity = (cornerType === CornerType.BEVELED) ? 1 : Math.ceil(angle / CesiumMath.toRadians(5)) + 1;

        var size = granularity * 3;
        var array = new Array(size);

        array[size - 3] = endPoint.x;
        array[size - 2] = endPoint.y;
        array[size - 1] = endPoint.z;

        var m;
        if (leftIsOutside) {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(Cartesian3.negate(cornerPoint, scratch1), angle / granularity, quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint, angle / granularity, quaterion), rotMatrix);
        }

        var index = 0;
        startPoint = Cartesian3.clone(startPoint, scratch1);
        for (var i = 0; i < granularity; i++) {
            startPoint = Matrix3.multiplyByVector(m, startPoint, startPoint);
            array[index++] = startPoint.x;
            array[index++] = startPoint.y;
            array[index++] = startPoint.z;
        }

        return array;
    }

    function addEndCaps(calculatedPositions) {
        var cornerPoint = cartesian1;
        var startPoint = cartesian2;
        var endPoint = cartesian3;

        var leftEdge = calculatedPositions[1];
        startPoint = Cartesian3.fromArray(calculatedPositions[1], leftEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
        cornerPoint = Cartesian3.multiplyByScalar(Cartesian3.add(startPoint, endPoint, cornerPoint), 0.5, cornerPoint);
        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = Cartesian3.multiplyByScalar(Cartesian3.add(startPoint, endPoint, cornerPoint), 0.5, cornerPoint);
        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
        var cornerPoint = scratch1;
        if (leftIsOutside) {
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        } else {
            leftCornerDirection = Cartesian3.negate(leftCornerDirection, leftCornerDirection);
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        }
        return [cornerPoint.x, cornerPoint.y, cornerPoint.z, lastPoint.x, lastPoint.y, lastPoint.z];
    }

    function addShiftedPositions(positions, left, scalar, calculatedPositions) {
        var rightPositions = new Array(positions.length);
        var leftPositions = new Array(positions.length);
        var scaledLeft = Cartesian3.multiplyByScalar(left, scalar, scratch1);
        var scaledRight = Cartesian3.negate(scaledLeft, scratch2);
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
    CorridorGeometryLibrary.addAttribute = function(attribute, value, front, back) {
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

    function scaleToSurface(positions, ellipsoid) {
        for (var i = 0; i < positions.length; i++) {
            positions[i] = ellipsoid.scaleToGeodeticSurface(positions[i], positions[i]);
        }
        return positions;
    }

    var scratchForwardProjection = new Cartesian3();
    var scratchBackwardProjection = new Cartesian3();

    /**
     * @private
     */
    CorridorGeometryLibrary.computePositions = function(params) {
        var granularity = params.granularity;
        var positions = params.positions;
        var ellipsoid = params.ellipsoid;
        positions = scaleToSurface(positions, ellipsoid);
        var width = params.width / 2;
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
        backward = Cartesian3.negate(forward, backward);

        var subdividedPositions;
        var corners = [];
        var i;
        var length = positions.length;
        for (i = 1; i < length - 1; i++) { // add middle points and corners
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            nextPosition = positions[i + 1];
            forward = Cartesian3.normalize(Cartesian3.subtract(nextPosition, position, forward), forward);
            cornerDirection = Cartesian3.normalize(Cartesian3.add(forward, backward, cornerDirection), cornerDirection);

            var forwardProjection = Cartesian3.multiplyByScalar(normal, Cartesian3.dot(forward, normal), scratchForwardProjection);
            Cartesian3.subtract(forward, forwardProjection, forwardProjection);
            Cartesian3.normalize(forwardProjection, forwardProjection);

            var backwardProjection = Cartesian3.multiplyByScalar(normal, Cartesian3.dot(backward, normal), scratchBackwardProjection);
            Cartesian3.subtract(backward, backwardProjection, backwardProjection);
            Cartesian3.normalize(backwardProjection, backwardProjection);

            var doCorner = !CesiumMath.equalsEpsilon(Math.abs(Cartesian3.dot(forwardProjection, backwardProjection)), 1.0, CesiumMath.EPSILON7);

            if (doCorner) {
                cornerDirection = Cartesian3.cross(cornerDirection, normal, cornerDirection);
                cornerDirection = Cartesian3.cross(normal, cornerDirection, cornerDirection);
                cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, Cartesian3.magnitude(Cartesian3.cross(cornerDirection, backward, scratch1)));
                var leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = Cartesian3.multiplyByScalar(cornerDirection, scalar, cornerDirection);
                if (leftIsOutside) {
                    rightPos = Cartesian3.add(position, cornerDirection, rightPos);
                    center = Cartesian3.add(rightPos, Cartesian3.multiplyByScalar(left, width, center), center);
                    leftPos = Cartesian3.add(rightPos, Cartesian3.multiplyByScalar(left, width * 2, leftPos), leftPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.generateArc({
                        positions: scaleArray2,
                        granularity: granularity,
                        ellipsoid: ellipsoid
                    });
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    if (saveAttributes) {
                        calculatedLefts.push(left.x, left.y, left.z);
                        calculatedNormals.push(normal.x, normal.y, normal.z);
                    }
                    startPoint = Cartesian3.clone(leftPos, startPoint);
                    left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
                    leftPos = Cartesian3.add(rightPos, Cartesian3.multiplyByScalar(left, width * 2, leftPos), leftPos);
                    previousPos = Cartesian3.add(rightPos, Cartesian3.multiplyByScalar(left, width, previousPos), previousPos);
                    if (cornerType === CornerType.ROUNDED || cornerType === CornerType.BEVELED) {
                        corners.push({
                            leftPositions : computeRoundCorner(rightPos, startPoint, leftPos, cornerType, leftIsOutside)
                        });
                    } else {
                        corners.push({
                            leftPositions : computeMiteredCorner(position, Cartesian3.negate(cornerDirection, cornerDirection), leftPos, leftIsOutside)
                        });
                    }
                } else {
                    leftPos = Cartesian3.add(position, cornerDirection, leftPos);
                    center = Cartesian3.add(leftPos, Cartesian3.negate(Cartesian3.multiplyByScalar(left, width, center), center), center);
                    rightPos = Cartesian3.add(leftPos, Cartesian3.negate(Cartesian3.multiplyByScalar(left, width * 2, rightPos), rightPos), rightPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.generateArc({
                        positions: scaleArray2,
                        granularity: granularity,
                        ellipsoid: ellipsoid
                    });
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    if (saveAttributes) {
                        calculatedLefts.push(left.x, left.y, left.z);
                        calculatedNormals.push(normal.x, normal.y, normal.z);
                    }
                    startPoint = Cartesian3.clone(rightPos, startPoint);
                    left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
                    rightPos = Cartesian3.add(leftPos, Cartesian3.negate(Cartesian3.multiplyByScalar(left, width * 2, rightPos), rightPos), rightPos);
                    previousPos = Cartesian3.add(leftPos, Cartesian3.negate(Cartesian3.multiplyByScalar(left, width, previousPos), previousPos), previousPos);
                    if (cornerType === CornerType.ROUNDED || cornerType === CornerType.BEVELED) {
                        corners.push({
                            rightPositions : computeRoundCorner(leftPos, startPoint, rightPos, cornerType, leftIsOutside)
                        });
                    } else {
                        corners.push({
                            rightPositions : computeMiteredCorner(position, cornerDirection, rightPos, leftIsOutside)
                        });
                    }
                }
                backward = Cartesian3.negate(forward, backward);
            }
            position = nextPosition;
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3.clone(position, scaleArray2[1]);
        subdividedPositions = PolylinePipeline.generateArc({
            positions: scaleArray2,
            granularity: granularity,
            ellipsoid: ellipsoid
        });
        calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
        if (saveAttributes) {
            calculatedLefts.push(left.x, left.y, left.z);
            calculatedNormals.push(normal.x, normal.y, normal.z);
        }

        var endPositions;
        if (cornerType === CornerType.ROUNDED) {
            endPositions = addEndCaps(calculatedPositions);
        }

        return {
            positions : calculatedPositions,
            corners : corners,
            lefts : calculatedLefts,
            normals : calculatedNormals,
            endPositions : endPositions
        };
    };

    var scaleN = new Cartesian3();
    var scaleP = new Cartesian3();
    CorridorGeometryLibrary.scaleToGeodeticHeight = function(positions, height, ellipsoid, result) {
        var length = positions.length;
        var newPositions = isArray(result) ? result : new Array(positions.length);
        newPositions.length = positions.length;

        var h = height;
        for (var i = 0; i < length; i += 3) {
            var p = ellipsoid.scaleToGeodeticSurface(Cartesian3.fromArray(positions, i, scaleP), scaleP);
            var n = scaleN;
            if (height !== 0.0) {
                n = ellipsoid.geodeticSurfaceNormal(p, n);
                n = Cartesian3.multiplyByScalar(n, h, n);
                p = Cartesian3.add(p, n, p);
            }

            newPositions[i] = p.x;
            newPositions[i + 1] = p.y;
            newPositions[i + 2] = p.z;
        }

        return newPositions;
    };

    return CorridorGeometryLibrary;
});