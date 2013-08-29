/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './ComponentDatatype',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PolylinePipeline',
        './PrimitiveType',
        './Quaternion',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat'
    ], function(
        defined,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        CornerType,
        ComponentDatatype,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PolylinePipeline,
        PrimitiveType,
        Quaternion,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat) {
    "use strict";

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

    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    var scratch3 = new Cartesian3();
    var scratch4 = new Cartesian3();

    var originScratch = new Cartesian3();
    var nextScratch = new Cartesian3();
    var prevScratch = new Cartesian3();
    function angleIsGreaterThanPi(forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = Cartesian2.subtract(prev, origin, prev);
        next = Cartesian2.subtract(next, origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    }

    function addAttribute(attribute, value, front, back) {
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
    }

    function addNormals(attr, normal, left, front, back, vertexFormat) {
        var normals = attr.normals;
        var tangents = attr.tangents;
        var binormals = attr.binormals;
        var forward = Cartesian3.cross(left, normal, scratch1).normalize(scratch1);
        if (vertexFormat.normal) {
            addAttribute(normals, normal, front, back);
        }
        if (vertexFormat.binormal) {
            addAttribute(binormals, left, front, back);
        }
        if (vertexFormat.tangent) {
            addAttribute(tangents, forward, front, back);
        }
    }

    var posScratch = new Cartesian3();
    function scaleToSurface(positions, ellipsoid) {
        for ( var i = 0; i < positions.length; i += 3) {
            posScratch = Cartesian3.fromArray(positions, i, posScratch);
            posScratch = ellipsoid.scaleToGeodeticSurface(posScratch, posScratch);
            positions[i] = posScratch.x;
            positions[i + 1] = posScratch.y;
            positions[i + 2] = posScratch.z;
        }
    }

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(cornerPoint, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid) {
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
    }

    function addEndCaps(calculatedPositions, width, ellipsoid) {
        var cornerPoint = cartesian1;
        var startPoint = cartesian2;
        var endPoint = cartesian3;

        var leftEdge = calculatedPositions[1];
        startPoint = Cartesian3.fromArray(calculatedPositions[1], leftEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
        cornerPoint = startPoint.add(endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = startPoint.add(endPoint, cornerPoint).multiplyByScalar(0.5, cornerPoint);
        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, CornerType.ROUNDED, false, ellipsoid);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner(position, startPoint, leftCornerDirection, lastPoint, leftIsOutside, granularity, ellipsoid) {
        var cornerPoint = scratch1;
        if (leftIsOutside) {
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
        }
        return [cornerPoint.x, cornerPoint.y, cornerPoint.z, lastPoint.x, lastPoint.y, lastPoint.z];
    }

    function combine(positions, corners, computedLefts, computedNormals, vertexFormat, endPositions, ellipsoid) {
        var attributes = new GeometryAttributes();
        var corner;
        var leftCount = 0;
        var rightCount = 0;
        var i;
        var indicesLength = 0;
        var length;
        for (i = 0; i < positions.length; i += 2) {
            length = positions[i].length - 3;
            leftCount += length; //subtracting 3 to account for duplicate points at corners
            indicesLength += length*2;
            rightCount += positions[i + 1].length - 3;
        }
        leftCount += 3; //add back count for end positions
        rightCount += 3;
        for (i = 0; i < corners.length; i++) {
            corner = corners[i];
            var leftSide = corners[i].leftPositions;
            if (defined(leftSide)) {
                length = leftSide.length;
                leftCount += length;
                indicesLength += length;
            } else {
                length = corners[i].rightPositions.length;
                rightCount += length;
                indicesLength += length;
            }
        }

        var addEndPositions = defined(endPositions);
        var endPositionLength;
        if (addEndPositions) {
            endPositionLength = endPositions[0].length - 3;
            leftCount += endPositionLength;
            rightCount += endPositionLength;
            endPositionLength /= 3;
            indicesLength += endPositionLength * 6;
        }
        var size = leftCount + rightCount;
        var finalPositions = new Float64Array(size);
        var normals = (vertexFormat.normal) ? new Float32Array(size) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size) : undefined;
        var attr = {
            normals : normals,
            tangents : tangents,
            binormals : binormals
        };
        var front = 0;
        var back = size - 1;
        var UL, LL, UR, LR;
        var normal = cartesian1;
        var left = cartesian2;
        var rightPos, leftPos;
        var halfLength = endPositionLength / 2;

        var indices = IndexDatatype.createTypedArray(size/3, indicesLength);
        var index = 0;
        if (addEndPositions) { // add rounded end
            leftPos = cartesian3;
            rightPos = cartesian4;
            var firstEndPositions = endPositions[0];
            normal = Cartesian3.fromArray(computedNormals, 0, normal);
            left = Cartesian3.fromArray(computedLefts, 0, left);
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(firstEndPositions, (halfLength - 1 - i) * 3, leftPos);
                rightPos = Cartesian3.fromArray(firstEndPositions, (halfLength + i) * 3, rightPos);
                addAttribute(finalPositions, rightPos, front);
                addAttribute(finalPositions, leftPos, undefined, back);
                addNormals(attr, normal, left, front, back, vertexFormat);

                LL = front / 3;
                LR = LL + 1;
                UL = (back - 2) / 3;
                UR = UL - 1;
                indices[index++] = UL;
                indices[index++] = LL;
                indices[index++] = UR;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = LR;

                front += 3;
                back -= 3;
            }
        }

        var posIndex = 0;
        var compIndex = 0;
        var rightEdge = positions[posIndex++]; //add first two edges
        var leftEdge = positions[posIndex++];
        finalPositions.set(rightEdge, front);
        finalPositions.set(leftEdge, back - leftEdge.length + 1);

        left = Cartesian3.fromArray(computedLefts, compIndex, left);
        var rightNormal;
        var leftNormal;
        length = leftEdge.length - 3;
        for (i = 0; i < length; i += 3) {
            rightNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(rightEdge, i, scratch1), scratch1);
            leftNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(leftEdge, length - i, scratch2), scratch2);
            normal = rightNormal.add(leftNormal, normal).normalize(normal);
            addNormals(attr, normal, left, front, back, vertexFormat);

            LL = front / 3;
            LR = LL + 1;
            UL = (back - 2) / 3;
            UR = UL - 1;
            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;

            front += 3;
            back -= 3;
        }

        rightNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(rightEdge, length, scratch1), scratch1);
        leftNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(leftEdge, length, scratch2), scratch2);
        normal = rightNormal.add(leftNormal, normal).normalize(normal);
        compIndex += 3;
        for (i = 0; i < corners.length; i++) {
            var j;
            corner = corners[i];
            var l = corner.leftPositions;
            var r = corner.rightPositions;
            var pivot;
            var start;
            var outsidePoint = cartesian6;
            var previousPoint = cartesian3;
            var nextPoint = cartesian4;
            normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
            if (defined(l)) {
                addNormals(attr, normal, left, undefined, back, vertexFormat);
                back -= 3;
                pivot = LR;
                start = UR;
                for (j = 0; j < l.length / 3; j++) {
                    outsidePoint = Cartesian3.fromArray(l, j * 3, outsidePoint);
                    indices[index++] = pivot;
                    indices[index++] = start - j - 1;
                    indices[index++] = start - j;
                    addAttribute(finalPositions, outsidePoint, undefined, back);
                    previousPoint = Cartesian3.fromArray(finalPositions, (start - j - 1) * 3, previousPoint);
                    nextPoint = Cartesian3.fromArray(finalPositions, pivot * 3, nextPoint);
                    left = previousPoint.subtract(nextPoint, left).normalize(left);
                    addNormals(attr, normal, left, undefined, back, vertexFormat);
                    back -= 3;
                }
                outsidePoint = Cartesian3.fromArray(finalPositions, pivot * 3, outsidePoint);
                previousPoint = Cartesian3.fromArray(finalPositions, (start) * 3, previousPoint).subtract(outsidePoint, previousPoint);
                nextPoint = Cartesian3.fromArray(finalPositions, (start - j) * 3, nextPoint).subtract(outsidePoint, nextPoint);
                left = previousPoint.add(nextPoint, left).normalize(left);
                addNormals(attr, normal, left, front, undefined, vertexFormat);
                front += 3;
            } else {
                addNormals(attr, normal, left, front, undefined, vertexFormat);
                front += 3;
                pivot = UR;
                start = LR;
                for (j = 0; j < r.length / 3; j++) {
                    outsidePoint = Cartesian3.fromArray(r, j * 3, outsidePoint);
                    indices[index++] = pivot;
                    indices[index++] = start + j;
                    indices[index++] = start + j + 1;
                    addAttribute(finalPositions, outsidePoint, front);
                    previousPoint = Cartesian3.fromArray(finalPositions, pivot * 3, previousPoint);
                    nextPoint = Cartesian3.fromArray(finalPositions, (start + j) * 3, nextPoint);
                    left = previousPoint.subtract(nextPoint, left).normalize(left);
                    addNormals(attr, normal, left, front, undefined, vertexFormat);
                    front += 3;
                }
                outsidePoint = Cartesian3.fromArray(finalPositions, pivot * 3, outsidePoint);
                previousPoint = Cartesian3.fromArray(finalPositions, (start + j) * 3, previousPoint).subtract(outsidePoint, previousPoint);
                nextPoint = Cartesian3.fromArray(finalPositions, start * 3, nextPoint).subtract(outsidePoint, nextPoint);
                left = nextPoint.add(previousPoint, left).negate(left).normalize(left);
                addNormals(attr, normal, left, undefined, back, vertexFormat);
                back -= 3;
            }
            rightEdge = positions[posIndex++];
            leftEdge = positions[posIndex++];
            rightEdge.splice(0, 3); //remove duplicate points added by corner
            leftEdge.splice(leftEdge.length - 3, 3);
            finalPositions.set(rightEdge, front);
            finalPositions.set(leftEdge, back - leftEdge.length + 1);
            length = leftEdge.length - 3;

            compIndex += 3;
            left = Cartesian3.fromArray(computedLefts, compIndex, left);
            for (j = 0; j < leftEdge.length; j += 3) {
                rightNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(rightEdge, j, scratch1), scratch1);
                leftNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(leftEdge, length - j, scratch2), scratch2);
                normal = rightNormal.add(leftNormal, normal).normalize(normal);
                addNormals(attr, normal, left, front, back, vertexFormat);

                LR = front / 3;
                LL = LR - 1;
                UR = (back - 2) / 3;
                UL = UR + 1;
                indices[index++] = UL;
                indices[index++] = LL;
                indices[index++] = UR;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = LR;

                front += 3;
                back -= 3;
            }
            front -= 3;
            back += 3;
        }
        normal = Cartesian3.fromArray(computedNormals, computedNormals.length - 3, normal);
        addNormals(attr, normal, left, front, back, vertexFormat);

        if (addEndPositions) { // add rounded end
            front += 3;
            back -= 3;
            leftPos = cartesian3;
            rightPos = cartesian4;
            var lastEndPositions = endPositions[1];
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(lastEndPositions, (endPositionLength - i - 1) * 3, leftPos);
                rightPos = Cartesian3.fromArray(lastEndPositions, i * 3, rightPos);
                addAttribute(finalPositions, leftPos, undefined, back);
                addAttribute(finalPositions, rightPos, front);
                addNormals(attr, normal, left, front, back, vertexFormat);

                LR = front / 3;
                LL = LR - 1;
                UR = (back - 2) / 3;
                UL = UR + 1;
                indices[index++] = UL;
                indices[index++] = LL;
                indices[index++] = UR;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = LR;

                front += 3;
                back -= 3;
            }
        }

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : finalPositions
        });

        if (vertexFormat.st) {
            var st = new Float32Array(size / 3 * 2);
            var rightSt;
            var leftSt;
            var stIndex = 0;
            if (addEndPositions) {
                leftCount /= 3;
                rightCount /= 3;
                var theta = Math.PI / (endPositionLength + 1);
                leftSt = 1 / (leftCount - endPositionLength + 1);
                rightSt = 1 / (rightCount - endPositionLength + 1);
                var a;
                var halfEndPos = endPositionLength / 2;
                for (i = halfEndPos + 1; i < endPositionLength + 1; i++) { // lower left rounded end
                    a = CesiumMath.PI_OVER_TWO + theta * i;
                    st[stIndex++] = rightSt * (1 + Math.cos(a));
                    st[stIndex++] = 0.5 * (1 + Math.sin(a));
                }
                for (i = 1; i < rightCount - endPositionLength + 1; i++) { // bottom edge
                    st[stIndex++] = i * rightSt;
                    st[stIndex++] = 0;
                }
                for (i = endPositionLength; i > halfEndPos; i--) { // lower right rounded end
                    a = CesiumMath.PI_OVER_TWO - i * theta;
                    st[stIndex++] = 1 - rightSt * (1 + Math.cos(a));
                    st[stIndex++] = 0.5 * (1 + Math.sin(a));
                }
                for (i = halfEndPos; i > 0; i--) { // upper right rounded end
                    a = CesiumMath.PI_OVER_TWO - theta * i;
                    st[stIndex++] = 1 - leftSt * (1 + Math.cos(a));
                    st[stIndex++] = 0.5 * (1 + Math.sin(a));
                }
                for (i = leftCount - endPositionLength; i > 0; i--) { // top edge
                    st[stIndex++] = i * leftSt;
                    st[stIndex++] = 1;
                }
                for (i = 1; i < halfEndPos + 1; i++) { // upper left rounded end
                    a = CesiumMath.PI_OVER_TWO + theta * i;
                    st[stIndex++] = leftSt * (1 + Math.cos(a));
                    st[stIndex++] = 0.5 * (1 + Math.sin(a));
                }
            } else {
                leftCount /= 3;
                rightCount /= 3;
                leftSt = 1 / (leftCount - 1);
                rightSt = 1 / (rightCount - 1);
                for (i = 0; i < rightCount; i++) { // bottom edge
                    st[stIndex++] = i * rightSt;
                    st[stIndex++] = 0;
                }
                for (i = leftCount; i > 0; i--) { // top edge
                    st[stIndex++] = (i - 1) * leftSt;
                    st[stIndex++] = 1;
                }
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : st
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.binormals
            });
        }

        return {
            attributes : attributes,
            indices : indices,
            boundingSphere : BoundingSphere.fromVertices(finalPositions)
        };
    }

    function addShiftedPositions(positions, left, scalar, calculatedPositions) {
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
    }

    function computePositions(params) {
        var granularity = params.granularity;
        var positions = params.positions;
        var width = params.width / 2;
        var ellipsoid = params.ellipsoid;
        var cornerType = params.cornerType;
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
        var calculatedLefts = [];
        var calculatedNormals = [];
        var position = positions[0]; //add first point
        var nextPosition = positions[1];

        forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
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
            forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
            cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
            var doCorner = !Cartesian3.equalsEpsilon(cornerDirection.negate(scratch1), normal, CesiumMath.EPSILON2);
            if (doCorner) {
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, (Cartesian3.cross(cornerDirection, backward, scratch1).magnitude()));
                var leftIsOutside = angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
                if (leftIsOutside) {
                    rightPos = Cartesian3.add(position, cornerDirection, rightPos);
                    center = rightPos.add(left.multiplyByScalar(width, center), center);
                    leftPos = rightPos.add(left.multiplyByScalar(width * 2, leftPos), leftPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.scaleToSurface(scaleArray2, granularity, ellipsoid);
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    calculatedLefts.push(left.x, left.y, left.z);
                    calculatedNormals.push(normal.x, normal.y, normal.z);
                    startPoint = leftPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    leftPos = rightPos.add(left.multiplyByScalar(width * 2, leftPos), leftPos);
                    previousPos = rightPos.add(left.multiplyByScalar(width, previousPos), previousPos);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        corners.push({leftPositions : computeRoundCorner(rightPos, startPoint, leftPos, cornerType, leftIsOutside, ellipsoid)});
                    } else {
                        corners.push({leftPositions : computeMiteredCorner(position, startPoint, cornerDirection.negate(cornerDirection), leftPos, leftIsOutside, granularity, ellipsoid)});
                    }
                } else {
                    leftPos = Cartesian3.add(position, cornerDirection, leftPos);
                    center = leftPos.add(left.multiplyByScalar(width, center).negate(center), center);
                    rightPos = leftPos.add(left.multiplyByScalar(width * 2, rightPos).negate(rightPos), rightPos);
                    scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
                    scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
                    subdividedPositions = PolylinePipeline.scaleToSurface(scaleArray2, granularity, ellipsoid);
                    calculatedPositions = addShiftedPositions(subdividedPositions, left, width, calculatedPositions);
                    calculatedLefts.push(left.x, left.y, left.z);
                    calculatedNormals.push(normal.x, normal.y, normal.z);
                    startPoint = rightPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    rightPos = leftPos.add(left.multiplyByScalar(width * 2, rightPos).negate(rightPos), rightPos);
                    previousPos = leftPos.add(left.multiplyByScalar(width, previousPos).negate(previousPos), previousPos);
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
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);

        var endPositions;
        if (cornerType.value === CornerType.ROUNDED.value) {
            endPositions = addEndCaps(calculatedPositions, width, ellipsoid);
        }

        return combine(calculatedPositions, corners, calculatedLefts, calculatedNormals, params.vertexFormat, endPositions, ellipsoid);
    }

    function extrudedAttributes(attributes, vertexFormat) {
        if (!vertexFormat.normal && !vertexFormat.binormal && !vertexFormat.tangent && !vertexFormat.st) {
            return attributes;
        }
        var positions = attributes.position.values;
        var topNormals;
        var topBinormals;
        if (vertexFormat.normal || vertexFormat.binormal) {
            topNormals = attributes.normal.values;
            topBinormals = attributes.binormal.values;
        }
        var size = attributes.position.values.length / 18;
        var threeSize = size * 3;
        var twoSize = size * 2;
        var sixSize = threeSize * 2;
        var i;
        if (vertexFormat.normal || vertexFormat.binormal || vertexFormat.tangent) {
            var normals = (vertexFormat.normal) ? new Float32Array(threeSize * 6) : undefined;
            var binormals = (vertexFormat.binormal) ? new Float32Array(threeSize * 6) : undefined;
            var tangents = (vertexFormat.tangent) ? new Float32Array(threeSize * 6) : undefined;
            var topPosition = cartesian1;
            var bottomPosition = cartesian2;
            var previousPosition = cartesian3;
            var normal = cartesian4;
            var tangent = cartesian5;
            var binormal = cartesian6;
            var attrIndex = sixSize;
            for (i = 0; i < threeSize; i += 3) {
                var attrIndexOffset = attrIndex + sixSize;
                topPosition = Cartesian3.fromArray(positions, i, topPosition);
                bottomPosition = Cartesian3.fromArray(positions, i + threeSize, bottomPosition);
                previousPosition = Cartesian3.fromArray(positions, (i + 3) % threeSize, previousPosition);
                bottomPosition = bottomPosition.subtract(topPosition, bottomPosition);
                previousPosition = previousPosition.subtract(topPosition, previousPosition);
                normal = bottomPosition.cross(previousPosition, normal).normalize(normal);
                if (vertexFormat.normal) {
                    addAttribute(normals, normal, attrIndexOffset);
                    addAttribute(normals, normal, attrIndexOffset + 3);
                    addAttribute(normals, normal, attrIndex);
                    addAttribute(normals, normal, attrIndex + 3);
                }
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    binormal = Cartesian3.fromArray(topNormals, i, binormal);
                    if (vertexFormat.binormal) {
                        addAttribute(binormals, binormal, attrIndexOffset);
                        addAttribute(binormals, binormal, attrIndexOffset + 3);
                        addAttribute(binormals, binormal, attrIndex);
                        addAttribute(binormals, binormal, attrIndex + 3);
                    }

                    if (vertexFormat.tangent) {
                        tangent = binormal.cross(normal, tangent).normalize(tangent);
                        addAttribute(tangents, tangent, attrIndexOffset);
                        addAttribute(tangents, tangent, attrIndexOffset + 3);
                        addAttribute(tangents, tangent, attrIndex);
                        addAttribute(tangents, tangent, attrIndex + 3);
                    }
                }
                attrIndex += 6;
            }

            if (vertexFormat.normal) {
                normals.set(topNormals); //top
                for (i = 0; i < threeSize; i += 3) { //bottom normals
                    normals[i + threeSize] = -topNormals[i];
                    normals[i + threeSize + 1] = -topNormals[i + 1];
                    normals[i + threeSize + 2] = -topNormals[i + 2];
                }
                attributes.normal.values = normals;
            } else {
                attributes.normal = undefined;
            }

            if (vertexFormat.binormal) {
                binormals.set(topBinormals); //top
                binormals.set(topBinormals, threeSize); //bottom
                attributes.binormal.values = binormals;
            } else {
                attributes.binormal = undefined;
            }

            if (vertexFormat.tangent) {
                var topTangents = attributes.tangent.values;
                tangents.set(topTangents); //top
                tangents.set(topTangents, threeSize); //bottom
                attributes.tangent.values = tangents;
            }
        }
        if (vertexFormat.st) {
            var topSt = attributes.st.values;
            var st = new Float32Array(twoSize * 6);
            st.set(topSt); //top
            st.set(topSt, twoSize); //bottom
            var index = twoSize * 2;

            for ( var j = 0; j < 2; j++) {
                st[index++] = topSt[0];
                st[index++] = topSt[1];
                for (i = 2; i < twoSize; i += 2) {
                    var s = topSt[i];
                    var t = topSt[i + 1];
                    st[index++] = s;
                    st[index++] = t;
                    st[index++] = s;
                    st[index++] = t;
                }
                st[index++] = topSt[0];
                st[index++] = topSt[1];
            }
            attributes.st.values = st;
        }

        return attributes;
    }

    function addWallPositions(positions, index, wallPositions) {
        wallPositions[index++] = positions[0];
        wallPositions[index++] = positions[1];
        wallPositions[index++] = positions[2];
        for ( var i = 3; i < positions.length; i += 3) {
            var x = positions[i];
            var y = positions[i + 1];
            var z = positions[i + 2];
            wallPositions[index++] = x;
            wallPositions[index++] = y;
            wallPositions[index++] = z;
            wallPositions[index++] = x;
            wallPositions[index++] = y;
            wallPositions[index++] = z;
        }
        wallPositions[index++] = positions[0];
        wallPositions[index++] = positions[1];
        wallPositions[index++] = positions[2];

        return wallPositions;
    }

    function computePositionsExtruded(params) {
        var vertexFormat = params.vertexFormat;
        params.vertexFormat = new VertexFormat({
            position : vertexFormat.positon,
            normal : (vertexFormat.normal || vertexFormat.binormal),
            tangent : vertexFormat.tangent,
            binormal : (vertexFormat.normal || vertexFormat.binormal),
            st : vertexFormat.st
        });
        var attr = computePositions(params);
        var height = params.height;
        var extrudedHeight = params.extrudedHeight;
        var ellipsoid = params.ellipsoid;
        var attributes = attr.attributes;
        var indices = attr.indices;
        var boundingSphere = attr.boundingSphere;
        var positions = attributes.position.values;
        var length = positions.length;
        var newPositions = new Float64Array(length * 6);
        var extrudedPositions = new Float64Array(length);
        extrudedPositions.set(positions);
        var wallPositions = new Float64Array(length * 4);

        positions = PolylinePipeline.scaleToGeodeticHeight(positions, height, ellipsoid, positions);
        wallPositions = addWallPositions(positions, 0, wallPositions);
        extrudedPositions = PolylinePipeline.scaleToGeodeticHeight(extrudedPositions, extrudedHeight, ellipsoid, extrudedPositions);
        wallPositions = addWallPositions(extrudedPositions, length * 2, wallPositions);
        newPositions.set(positions);
        newPositions.set(extrudedPositions, length);
        newPositions.set(wallPositions, length * 2);
        boundingSphere = BoundingSphere.fromVertices(positions, undefined, 3, boundingSphere);
        attributes.position.values = newPositions;

        length /= 3;
        var i;
        var iLength = indices.length;
        var twoLength = length + length;
        var newIndices = IndexDatatype.createTypedArray(newPositions.length/3, iLength * 2 + twoLength * 3);
        newIndices.set(indices);
        var index = iLength;
        for (i = 0; i < iLength; i += 3) { // bottom indices
            var v0 = indices[i];
            var v1 = indices[i + 1];
            var v2 = indices[i + 2];
            newIndices[index++] = v2 + length;
            newIndices[index++] = v1 + length;
            newIndices[index++] = v0 + length;
        }

        attributes = extrudedAttributes(attributes, vertexFormat);
        var UL, LL, UR, LR;

        for (i = 0; i < twoLength; i += 2) { //wall indices
            UL = i + twoLength;
            LL = UL + twoLength;
            UR = UL + 1;
            LR = LL + 1;
            newIndices[index++] = UL;
            newIndices[index++] = LL;
            newIndices[index++] = UR;
            newIndices[index++] = UR;
            newIndices[index++] = LL;
            newIndices[index++] = LR;
        }

        return {
            attributes : attributes,
            indices : newIndices,
            boundingSphere : boundingSphere
        };
    }

    /**
     * A description of a corridor.
     *
     * @alias CorridorGeometry
     * @constructor
     *
     * @param {Array} options.positions An array of {Cartesain3} positions that define the center of the corridor.
     * @param {Number} options.width The distance between the edges of the corridor in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance in meters between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance in meters between the ellipsoid surface and the extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Boolean} [options.cornerType = CornerType.ROUNDED] Determines the style of the corners.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     *
     * @see CorridorGeometry#createGeometry
     *
     * @example
     * var corridor = new CorridorGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *   width : 100000
     * });
     */
    var CorridorGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        if (!defined(positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        var width = options.width;
        if (!defined(width)) {
            throw new DeveloperError('options.width is required.');
        }

        this._positions = positions;
        this._width = width;
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._height = defaultValue(options.height, 0);
        this._extrudedHeight = defaultValue(options.extrudedHeight, this._height);
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createCorridorGeometry';
    };

    /**
     * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
     * @memberof CorridorGeometry
     *
     * @param {CorridorGeometry} corridorGeometry A description of the corridor.
     *
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Count of unique positions must be greater than 1.
     */
    CorridorGeometry.createGeometry = function(corridorGeometry) {
        var positions = corridorGeometry._positions;
        var height = corridorGeometry._height;
        var extrudedHeight = corridorGeometry._extrudedHeight;
        var extrude = (height !== extrudedHeight);
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('Count of unique positions must be greater than 1.');
        }
        var ellipsoid = corridorGeometry._ellipsoid;
        var vertexFormat = corridorGeometry._vertexFormat;
        var params = {
            ellipsoid : ellipsoid,
            vertexFormat : vertexFormat,
            positions : cleanPositions,
            width : corridorGeometry._width,
            cornerType : corridorGeometry._cornerType,
            granularity : corridorGeometry._granularity
        };
        var attr;
        if (extrude) {
            var h = Math.max(height, extrudedHeight);
            extrudedHeight = Math.min(height, extrudedHeight);
            height = h;
            params.height = height;
            params.extrudedHeight = extrudedHeight;
            attr = computePositionsExtruded(params);
        } else {
            attr = computePositions(params);
            if (!vertexFormat.position) {
                attr.attributes.position.values = undefined;
            } else {
                attr.attributes.position.values = new Float64Array(PolylinePipeline.scaleToGeodeticHeight(attr.attributes.position.values, height, ellipsoid, attr.attributes.position.values));
            }

        }
        var attributes = attr.attributes;

        return new Geometry({
            attributes : attributes,
            indices : attr.indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : attr.boundingSphere
        });
    };

    return CorridorGeometry;
});