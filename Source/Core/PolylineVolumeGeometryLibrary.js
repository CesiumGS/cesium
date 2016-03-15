/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Cartographic',
        './CornerType',
        './EllipsoidTangentPlane',
        './Math',
        './Matrix3',
        './Matrix4',
        './PolylinePipeline',
        './Quaternion',
        './Transforms'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        CornerType,
        EllipsoidTangentPlane,
        CesiumMath,
        Matrix3,
        Matrix4,
        PolylinePipeline,
        Quaternion,
        Transforms) {
    'use strict';

    var scratch2Array = [new Cartesian3(), new Cartesian3()];
    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCartesian7 = new Cartesian3();
    var scratchCartesian8 = new Cartesian3();
    var scratchCartesian9 = new Cartesian3();

    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();

    /**
     * @private
     */
    var PolylineVolumeGeometryLibrary = {};

    var cartographic = new Cartographic();
    function scaleToSurface(positions, ellipsoid) {
        var heights = new Array(positions.length);
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            cartographic = ellipsoid.cartesianToCartographic(pos, cartographic);
            heights[i] = cartographic.height;
            positions[i] = ellipsoid.scaleToGeodeticSurface(pos, pos);
        }
        return heights;
    }

    function subdivideHeights(points, h0, h1, granularity) {
        var p0 = points[0];
        var p1 = points[1];
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var numPoints = Math.ceil(angleBetween / granularity);
        var heights = new Array(numPoints);
        var i;
        if (h0 === h1) {
            for (i = 0; i < numPoints; i++) {
                heights[i] = h0;
            }
            heights.push(h1);
            return heights;
        }

        var dHeight = h1 - h0;
        var heightPerVertex = dHeight / (numPoints);

        for (i = 1; i < numPoints; i++) {
            var h = h0 + i * heightPerVertex;
            heights[i] = h;
        }

        heights[0] = h0;
        heights.push(h1);
        return heights;
    }

    function computeRotationAngle(start, end, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, start, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, end, prevScratch), prevScratch);
        var angle = Cartesian2.angleBetween(next, prev);

        return (prev.x * next.y - prev.y * next.x >= 0.0) ? -angle : angle;
    }

    var negativeX = new Cartesian3(-1, 0, 0);
    var transform = new Matrix4();
    var translation = new Matrix4();
    var rotationZ = new Matrix3();
    var scaleMatrix = Matrix3.IDENTITY.clone();
    var westScratch = new Cartesian3();
    var finalPosScratch = new Cartesian4();
    var heightCartesian = new Cartesian3();
    function addPosition(center, left, shape, finalPositions, ellipsoid, height, xScalar, repeat) {
        var west = westScratch;
        var finalPosition = finalPosScratch;
        transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, transform);

        west = Matrix4.multiplyByPointAsVector(transform, negativeX, west);
        west = Cartesian3.normalize(west, west);
        var angle = computeRotationAngle(west, left, center, ellipsoid);
        rotationZ = Matrix3.fromRotationZ(angle, rotationZ);

        heightCartesian.z = height;
        transform = Matrix4.multiplyTransformation(transform, Matrix4.fromRotationTranslation(rotationZ, heightCartesian, translation), transform);
        var scale = scaleMatrix;
        scale[0] = xScalar;

        for (var j = 0; j < repeat; j++) {
            for (var i = 0; i < shape.length; i += 3) {
                finalPosition = Cartesian3.fromArray(shape, i, finalPosition);
                finalPosition = Matrix3.multiplyByVector(scale, finalPosition, finalPosition);
                finalPosition = Matrix4.multiplyByPoint(transform, finalPosition, finalPosition);
                finalPositions.push(finalPosition.x, finalPosition.y, finalPosition.z);
            }
        }

        return finalPositions;
    }

    var centerScratch = new Cartesian3();
    function addPositions(centers, left, shape, finalPositions, ellipsoid, heights, xScalar) {
        for (var i = 0; i < centers.length; i += 3) {
            var center = Cartesian3.fromArray(centers, i, centerScratch);
            finalPositions = addPosition(center, left, shape, finalPositions, ellipsoid, heights[i / 3], xScalar, 1);
        }
        return finalPositions;
    }

    function convertShapeTo3DDuplicate(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0), duplicate points
        var length = shape2D.length;
        var shape = new Array(length * 6);
        var index = 0;
        var xOffset = boundingRectangle.x + boundingRectangle.width / 2;
        var yOffset = boundingRectangle.y + boundingRectangle.height / 2;

        var point = shape2D[0];
        shape[index++] = point.x - xOffset;
        shape[index++] = 0.0;
        shape[index++] = point.y - yOffset;
        for (var i = 1; i < length; i++) {
            point = shape2D[i];
            var x = point.x - xOffset;
            var z = point.y - yOffset;
            shape[index++] = x;
            shape[index++] = 0.0;
            shape[index++] = z;

            shape[index++] = x;
            shape[index++] = 0.0;
            shape[index++] = z;
        }
        point = shape2D[0];
        shape[index++] = point.x - xOffset;
        shape[index++] = 0.0;
        shape[index++] = point.y - yOffset;

        return shape;
    }

    function convertShapeTo3D(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0)
        var length = shape2D.length;
        var shape = new Array(length * 3);
        var index = 0;
        var xOffset = boundingRectangle.x + boundingRectangle.width / 2;
        var yOffset = boundingRectangle.y + boundingRectangle.height / 2;

        for (var i = 0; i < length; i++) {
            shape[index++] = shape2D[i].x - xOffset;
            shape[index++] = 0;
            shape[index++] = shape2D[i].y - yOffset;
        }

        return shape;
    }

    var quaterion = new Quaternion();
    var startPointScratch = new Cartesian3();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(pivot, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid, finalPositions, shape, height, duplicatePoints) {
        var angle = Cartesian3.angleBetween(Cartesian3.subtract(startPoint, pivot, scratch1), Cartesian3.subtract(endPoint, pivot, scratch2));
        var granularity = (cornerType === CornerType.BEVELED) ? 0 : Math.ceil(angle / CesiumMath.toRadians(5));

        var m;
        if (leftIsOutside) {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(Cartesian3.negate(pivot, scratch1), angle / (granularity + 1), quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(pivot, angle / (granularity + 1), quaterion), rotMatrix);
        }

        var left;
        var surfacePoint;
        startPoint = Cartesian3.clone(startPoint, startPointScratch);
        if (granularity > 0) {
            var repeat = duplicatePoints ? 2 : 1;
            for (var i = 0; i < granularity; i++) {
                startPoint = Matrix3.multiplyByVector(m, startPoint, startPoint);
                left = Cartesian3.subtract(startPoint, pivot, scratch1);
                left = Cartesian3.normalize(left, left);
                if (!leftIsOutside) {
                    left = Cartesian3.negate(left, left);
                }
                surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
                finalPositions = addPosition(surfacePoint, left, shape, finalPositions, ellipsoid, height, 1, repeat);
            }
        } else {
            left = Cartesian3.subtract(startPoint, pivot, scratch1);
            left = Cartesian3.normalize(left, left);
            if (!leftIsOutside) {
                left = Cartesian3.negate(left, left);
            }
            surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
            finalPositions = addPosition(surfacePoint, left, shape, finalPositions, ellipsoid, height, 1, 1);

            endPoint = Cartesian3.clone(endPoint, startPointScratch);
            left = Cartesian3.subtract(endPoint, pivot, scratch1);
            left = Cartesian3.normalize(left, left);
            if (!leftIsOutside) {
                left = Cartesian3.negate(left, left);
            }
            surfacePoint = ellipsoid.scaleToGeodeticSurface(endPoint, scratch2);
            finalPositions = addPosition(surfacePoint, left, shape, finalPositions, ellipsoid, height, 1, 1);
        }

        return finalPositions;
    }

    PolylineVolumeGeometryLibrary.removeDuplicatesFromShape = function(shapePositions) {
        var length = shapePositions.length;
        var cleanedPositions = [];
        for (var i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
            var v0 = shapePositions[i0];
            var v1 = shapePositions[i1];

            if (!Cartesian2.equals(v0, v1)) {
                cleanedPositions.push(v1); // Shallow copy!
            }
        }

        return cleanedPositions;
    };

    var nextScratch = new Cartesian3();
    var prevScratch = new Cartesian3();
    PolylineVolumeGeometryLibrary.angleIsGreaterThanPi = function(forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    };

    var scratchForwardProjection = new Cartesian3();
    var scratchBackwardProjection = new Cartesian3();

    PolylineVolumeGeometryLibrary.computePositions = function(positions, shape2D, boundingRectangle, geometry, duplicatePoints) {
        var ellipsoid = geometry._ellipsoid;
        var heights = scaleToSurface(positions, ellipsoid);
        var granularity = geometry._granularity;
        var cornerType = geometry._cornerType;
        var shapeForSides = duplicatePoints ? convertShapeTo3DDuplicate(shape2D, boundingRectangle) : convertShapeTo3D(shape2D, boundingRectangle);
        var shapeForEnds = duplicatePoints ? convertShapeTo3D(shape2D, boundingRectangle) : undefined;
        var heightOffset = boundingRectangle.height / 2;
        var width = boundingRectangle.width / 2;
        var length = positions.length;
        var finalPositions = [];
        var ends = duplicatePoints ? [] : undefined;

        var forward = scratchCartesian1;
        var backward = scratchCartesian2;
        var cornerDirection = scratchCartesian3;
        var surfaceNormal = scratchCartesian4;
        var pivot = scratchCartesian5;
        var start = scratchCartesian6;
        var end = scratchCartesian7;
        var left = scratchCartesian8;
        var previousPosition = scratchCartesian9;

        var position = positions[0];
        var nextPosition = positions[1];
        surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
        forward = Cartesian3.subtract(nextPosition, position, forward);
        forward = Cartesian3.normalize(forward, forward);
        left = Cartesian3.cross(surfaceNormal, forward, left);
        left = Cartesian3.normalize(left, left);
        var h0 = heights[0];
        var h1 = heights[1];
        if (duplicatePoints) {
            ends = addPosition(position, left, shapeForEnds, ends, ellipsoid, h0 + heightOffset, 1, 1);
        }
        previousPosition = Cartesian3.clone(position, previousPosition);
        position = nextPosition;
        backward = Cartesian3.negate(forward, backward);
        var subdividedHeights;
        var subdividedPositions;
        for (var i = 1; i < length - 1; i++) {
            var repeat = duplicatePoints ? 2 : 1;
            nextPosition = positions[i + 1];
            forward = Cartesian3.subtract(nextPosition, position, forward);
            forward = Cartesian3.normalize(forward, forward);
            cornerDirection = Cartesian3.add(forward, backward, cornerDirection);
            cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
            surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);

            var forwardProjection = Cartesian3.multiplyByScalar(surfaceNormal, Cartesian3.dot(forward, surfaceNormal), scratchForwardProjection);
            Cartesian3.subtract(forward, forwardProjection, forwardProjection);
            Cartesian3.normalize(forwardProjection, forwardProjection);

            var backwardProjection = Cartesian3.multiplyByScalar(surfaceNormal, Cartesian3.dot(backward, surfaceNormal), scratchBackwardProjection);
            Cartesian3.subtract(backward, backwardProjection, backwardProjection);
            Cartesian3.normalize(backwardProjection, backwardProjection);

            var doCorner = !CesiumMath.equalsEpsilon(Math.abs(Cartesian3.dot(forwardProjection, backwardProjection)), 1.0, CesiumMath.EPSILON7);

            if (doCorner) {
                cornerDirection = Cartesian3.cross(cornerDirection, surfaceNormal, cornerDirection);
                cornerDirection = Cartesian3.cross(surfaceNormal, cornerDirection, cornerDirection);
                cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
                var scalar = 1 / Math.max(0.25, (Cartesian3.magnitude(Cartesian3.cross(cornerDirection, backward, scratch1))));
                var leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                if (leftIsOutside) {
                    pivot = Cartesian3.add(position, Cartesian3.multiplyByScalar(cornerDirection, scalar * width, cornerDirection), pivot);
                    start = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, width, start), start);
                    scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
                    scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
                    subdividedHeights = subdivideHeights(scratch2Array, h0 + heightOffset, h1 + heightOffset, granularity);
                    subdividedPositions = PolylinePipeline.generateArc({
                        positions: scratch2Array,
                        granularity: granularity,
                        ellipsoid: ellipsoid
                    });
                    finalPositions = addPositions(subdividedPositions, left, shapeForSides, finalPositions, ellipsoid, subdividedHeights, 1);
                    left = Cartesian3.cross(surfaceNormal, forward, left);
                    left = Cartesian3.normalize(left, left);
                    end = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, width, end), end);
                    if (cornerType === CornerType.ROUNDED || cornerType === CornerType.BEVELED) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, h1 + heightOffset, duplicatePoints);
                    } else {
                        cornerDirection = Cartesian3.negate(cornerDirection, cornerDirection);
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, h1 + heightOffset, scalar, repeat);
                    }
                    previousPosition = Cartesian3.clone(end, previousPosition);
                } else {
                    pivot = Cartesian3.add(position, Cartesian3.multiplyByScalar(cornerDirection, scalar * width, cornerDirection), pivot);
                    start = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, -width, start), start);
                    scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
                    scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
                    subdividedHeights = subdivideHeights(scratch2Array, h0 + heightOffset, h1 + heightOffset, granularity);
                    subdividedPositions = PolylinePipeline.generateArc({
                        positions: scratch2Array,
                        granularity: granularity,
                        ellipsoid: ellipsoid
                    });
                    finalPositions = addPositions(subdividedPositions, left, shapeForSides, finalPositions, ellipsoid, subdividedHeights, 1);
                    left = Cartesian3.cross(surfaceNormal, forward, left);
                    left = Cartesian3.normalize(left, left);
                    end = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, -width, end), end);
                    if (cornerType === CornerType.ROUNDED || cornerType === CornerType.BEVELED) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, h1 + heightOffset, duplicatePoints);
                    } else {
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, h1 + heightOffset, scalar, repeat);
                    }
                    previousPosition = Cartesian3.clone(end, previousPosition);
                }
                backward = Cartesian3.negate(forward, backward);
            } else {
                finalPositions = addPosition(previousPosition, left, shapeForSides, finalPositions, ellipsoid, h0 + heightOffset, 1, 1);
                previousPosition = position;
            }
            h0 = h1;
            h1 = heights[i + 1];
            position = nextPosition;
        }

        scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3.clone(position, scratch2Array[1]);
        subdividedHeights = subdivideHeights(scratch2Array, h0 + heightOffset, h1 + heightOffset, granularity);
        subdividedPositions = PolylinePipeline.generateArc({
            positions: scratch2Array,
            granularity: granularity,
            ellipsoid: ellipsoid
        });
        finalPositions = addPositions(subdividedPositions, left, shapeForSides, finalPositions, ellipsoid, subdividedHeights, 1);
        if (duplicatePoints) {
            ends = addPosition(position, left, shapeForEnds, ends, ellipsoid, h1 + heightOffset, 1, 1);
        }

        length = finalPositions.length;
        var posLength = duplicatePoints ? length + ends.length : length;
        var combinedPositions = new Float64Array(posLength);
        combinedPositions.set(finalPositions);
        if (duplicatePoints) {
            combinedPositions.set(ends, length);
        }

        return combinedPositions;
    };

    return PolylineVolumeGeometryLibrary;
});