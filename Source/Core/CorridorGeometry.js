/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './Ellipsoid',
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
        Cartesian3,
        ComponentDatatype,
        Ellipsoid,
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

    var cartesian1 = new Cartesian3();
    var cartesian2 = new Cartesian3();
    var cartesian3 = new Cartesian3();
    var cartesian4 = new Cartesian3();
    var cartesian5 = new Cartesian3();
    var cartesian6 = new Cartesian3();
    var cartesian7 = new Cartesian3();
    var cartesian8 = new Cartesian3();

    var scratch1= new Cartesian3();
    var scratch2 = new Cartesian3();

    var scratchPosition = new Cartesian3();
    var scratchNextPosition = new Cartesian3();

    function angleIsGreaterThanPi (first, second) {
        scratch1 = first.cross(second, scratch1);
        return scratch1.z < 0;
    }
    function addAttribute(attribute, value, front, back) {
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
    }

    function addNormals(attr, normal, left, front, back, vertexFormat) {
        var normals = attr.normals;
        var tangents = attr.tangents;
        var binormals = attr.binormals;

        var forward = left.cross(normal, scratch1).normalize(scratch1);
        if (vertexFormat.normal) {
            normals = addAttribute(normals, normal, front, back);
        }
        if (vertexFormat.tangent) {
            tangents = addAttribute(tangents, left, front, back);
        }

        if (vertexFormat.binormal) {
            binormals = addAttribute(binormals, forward, front, back);
        }

        return attr;
    }

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(cornerPoint, startPoint, endPoint, beveled, leftIsOutside) {
        var angle = Cartesian3.angleBetween(startPoint.subtract(cornerPoint, scratch1), endPoint.subtract(cornerPoint, scratch2));
        var granularity = (beveled) ? 0 : Math.floor(angle/CesiumMath.toRadians(5));
        var size = (granularity+1)*3;
        var array = new Array(size);
        array[size-3] = endPoint.x;
        array[size-2] = endPoint.y;
        array[size-1] = endPoint.z;

        var m;
        if (leftIsOutside) {
            m =  Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint, angle/(granularity+1), quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(cornerPoint.negate(scratch1), angle/(granularity+1), quaterion), rotMatrix);
        }
        var index = 0;
        for (var i = 0; i < granularity; i++) {
            startPoint = m.multiplyByVector(startPoint, startPoint);
            array[index++] = startPoint.x;
            array[index++] = startPoint.y;
            array[index++] = startPoint.z;
        }

        if (leftIsOutside) {
            return {
                leftPositions: array
            };
        }
        return {
            rightPositions: array
        };
    }

    function addEndCaps(originalPositions, calculatedPositions, width) {
        var cornerPoint = cartesian1;
        var startPoint = cartesian2;
        var endPoint = cartesian3;

        cornerPoint = Cartesian3.fromArray(originalPositions, 0, cornerPoint);
        startPoint = Cartesian3.fromArray(calculatedPositions, 0, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions, 3, endPoint);

        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, false);

        var length = calculatedPositions.length - 3;
        cornerPoint = Cartesian3.fromArray(originalPositions, originalPositions.length-3, cornerPoint);
        startPoint = Cartesian3.fromArray(calculatedPositions, length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions, length, endPoint);

        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, true);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
        var leftArray;
        var rightArray;
        if (leftIsOutside) {
            var leftPos = position.add(leftCornerDirection, scratch1);
            leftArray = [leftPos.x, leftPos.y, leftPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            var rightPos = position.add(leftCornerDirection, scratch1);
            rightArray = [rightPos.x, rightPos.y, rightPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        }
        return {
            leftPositions: leftArray,
            rightPositions: rightArray
        };
    }

    function combine(positions, corners, computedLefts, computedNormals, vertexFormat, endPositions) {
        var attributes = new GeometryAttributes();
        var leftCount = positions.length/2;
        var rightCount = leftCount;
        var i;
        var length = corners.length;
        var corner;
        for (i = 0; i < length; i++) {
            corner = corners[i];
            if (defined(corner)) {
                var leftSide = corners[i].leftPositions;
                if (defined(leftSide)) {
                    leftCount += leftSide.length;
                } else {
                    rightCount += corners[i].rightPositions.length;
                }
            }
        }
        var addEndPositions = defined(endPositions);
        var endPositionLength;
        if (addEndPositions) {
            endPositionLength = endPositions[0].rightPositions.length - 3;
            leftCount += endPositionLength;
            rightCount += endPositionLength;
            endPositionLength /= 3;
        }
        var size = leftCount + rightCount;
        var finalPositions = new Array(size);
        var normals = (vertexFormat.normal) ? new Float32Array(size) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size) : undefined;
        var attr = {
                normals: normals,
                tangents: tangents,
                binormals: binormals
        };

        var front = 0;
        var back = size - 1;

        var indices = [];
        var UL, LL, UR, LR;
        var positionIndex = 0;
        var compIndex = 0;

        var normal = cartesian1;
        var left = cartesian2;

        var rightPos, leftPos;
        var halfLength;
        if (addEndPositions) { // add rounded end
            leftPos = cartesian3;
            rightPos = cartesian4;

            var firstEndPositions = endPositions[0].rightPositions;
            length = endPositionLength;
            halfLength = length/2;
            normal = Cartesian3.fromArray(computedNormals, 0, normal);
            left = Cartesian3.fromArray(computedLefts, 0, left);
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(firstEndPositions, (halfLength - 1 - i) * 3, leftPos);
                rightPos = Cartesian3.fromArray(firstEndPositions, (halfLength + i) * 3, rightPos);

                finalPositions = addAttribute(finalPositions, rightPos, front);
                finalPositions = addAttribute(finalPositions, leftPos, undefined, back);

                attr = addNormals(attr, normal, left, front, back, vertexFormat);

                front += 3;
                back -= 3;
                LR = front/3;
                LL = LR - 1;
                UR = (back-2)/3;
                UL = UR + 1;
                indices.push(UL, LL, UR, UR, LL, LR);
            }
        }

        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), undefined, back); //add first two positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), front);
        positionIndex += 3;

        normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
        left = Cartesian3.fromArray(computedLefts, compIndex, left);
        attr = addNormals(attr, normal, left, front, back, vertexFormat);

        front+=3;
        back -= 3;
        compIndex += 3;
        length = corners.length;
        for (i = 0; i < length; i++) {
            var j;
            LR = front/3;
            LL = LR - 1;
            UR = (back-2)/3;
            UL = UR + 1;
            indices.push(UL, LL, UR, UR, LL, LR);

            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), undefined, back);
            positionIndex += 3;
            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), front);
            positionIndex += 3;
            normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
            left = Cartesian3.fromArray(computedLefts, compIndex, left);

            corner = corners[i];
            if (defined(corner)) {
                var l = corner.leftPositions;
                var r = corner.rightPositions;
                var pivot;
                var start;
                var outsidePoint = cartesian6;
                var previousPoint = cartesian3;
                var nextPoint = cartesian4;
                if (defined(l)) {
                    attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                    back -= 3;

                    pivot = LR;
                    start = UR;
                    for (j = 0; j < l.length/3; j++) {
                        outsidePoint = Cartesian3.fromArray(l, j*3, outsidePoint);
                        indices.push(pivot, start - j - 1, start - j);
                        finalPositions = addAttribute(finalPositions, outsidePoint, undefined, back);
                        previousPoint = Cartesian3.fromArray(finalPositions, (start - j - 1)*3, previousPoint);
                        nextPoint = Cartesian3.fromArray(finalPositions, pivot*3, nextPoint);
                        left = previousPoint.subtract(nextPoint, left).normalize(left);
                        attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                        back -= 3;
                    }
                    outsidePoint = Cartesian3.fromArray(finalPositions, pivot*3, outsidePoint);
                    previousPoint = Cartesian3.fromArray(finalPositions, (start)*3, previousPoint).subtract(outsidePoint, previousPoint);
                    nextPoint = Cartesian3.fromArray(finalPositions, (start - j)*3, nextPoint).subtract(outsidePoint, nextPoint);
                    left = previousPoint.add(nextPoint, left).normalize(left);
                    attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                    front += 3;
                } else {
                    attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                    front += 3;
                    pivot = UR;
                    start = LR;
                    for (j = 0; j < r.length/3; j++) {
                        outsidePoint = Cartesian3.fromArray(r, j*3, outsidePoint);
                        indices.push(pivot, start + j + 1, start + j);
                        finalPositions = addAttribute(finalPositions, outsidePoint, front);
                        previousPoint = Cartesian3.fromArray(finalPositions, pivot*3, previousPoint);
                        nextPoint = Cartesian3.fromArray(finalPositions, (start + j)*3, nextPoint);
                        left = previousPoint.subtract(nextPoint, left).normalize(left);
                        attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                        front += 3;
                    }
                    outsidePoint = Cartesian3.fromArray(finalPositions, pivot*3, outsidePoint);
                    previousPoint = Cartesian3.fromArray(finalPositions, (start + j)*3, previousPoint).subtract(outsidePoint, previousPoint);
                    nextPoint = Cartesian3.fromArray(finalPositions, start*3, nextPoint).subtract(outsidePoint, nextPoint);
                    left = nextPoint.add(previousPoint, left).negate(left).normalize(left);
                    attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                    back -= 3;
                }
            } else {
                attr = addNormals(attr, normal, left, front, back, vertexFormat);
                back -= 3;
                front += 3;
            }
            compIndex += 3;
        }

        LR = front/3;
        LL = LR - 1;
        UR = (back-2)/3;
        UL = UR + 1;
        indices.push(UL, LL, UR, UR, LL, LR);

        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), undefined, back); //add last two positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch1), front);
        positionIndex += 3;

        normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
        left = Cartesian3.fromArray(computedLefts, compIndex, left);
        attr = addNormals(attr, normal, left, front, back, vertexFormat);
        front += 3;
        back -= 3;

        if (addEndPositions) {  // add rounded end
            leftPos = cartesian3;
            rightPos = cartesian4;

            var lastEndPositions = endPositions[1].leftPositions;
            length = endPositionLength;
            halfLength = length/2;
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(lastEndPositions, i * 3, leftPos);
                rightPos = Cartesian3.fromArray(lastEndPositions, (length - i - 1) * 3, rightPos);

                finalPositions = addAttribute(finalPositions, leftPos, undefined, back);
                finalPositions = addAttribute(finalPositions, rightPos, front);
                attr = addNormals(attr, normal, left, front, back, vertexFormat);

                LR = front/3;
                LL = LR - 1;
                UR = (back-2)/3;
                UL = UR + 1;
                indices.push(UL, LL, UR, UR, LL, LR);

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
            var st = new Float32Array(size/3*2);
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
                var halfEndPos = endPositionLength/2;
                for (i = halfEndPos + 1; i < endPositionLength + 1; i++) { // lower left rounded end
                    a = CesiumMath.PI_OVER_TWO + theta * i ;
                    st[stIndex++] = rightSt + rightSt * Math.cos(a);
                    st[stIndex++] = 0.5 + 0.5 * Math.sin(a);
                }
                for (i = 1; i < rightCount- endPositionLength + 1; i++) { // bottom edge
                    st[stIndex++] = i*rightSt;
                    st[stIndex++] = 0;
                }
                for (i = endPositionLength; i > halfEndPos; i--) { // lower right rounded end
                    a = CesiumMath.PI_OVER_TWO - i * theta;
                    st[stIndex++] = (1 - rightSt) + rightSt * Math.cos(a);
                    st[stIndex++] = 0.5 + 0.5 * Math.sin(a);
                }
                for (i = halfEndPos; i > 0; i--) { // upper right rounded end
                    a = CesiumMath.PI_OVER_TWO - theta * i;
                    st[stIndex++] = (1 - leftSt) + leftSt * Math.cos(a);
                    st[stIndex++] = 0.5 + 0.5 * Math.sin(a);
                }
                for (i = leftCount - endPositionLength; i > 0; i--) { // top edge
                    st[stIndex++] = i*leftSt;
                    st[stIndex++] = 1;
                }
                for (i = 1; i < halfEndPos + 1; i++) { // upper left rounded end
                    a = CesiumMath.PI_OVER_TWO + theta * i;
                    st[stIndex++] = leftSt + leftSt * Math.cos(a);
                    st[stIndex++] = 0.5 + 0.5 * Math.sin(a);
                }
            } else {
                leftCount /= 3;
                rightCount /= 3;

                leftSt = 1 / (leftCount-1);
                rightSt = 1 / (rightCount-1);

                for (i = 0; i < rightCount; i++) { // bottom edge
                    st[stIndex++] = i*rightSt;
                    st[stIndex++] = 0;
                }
                for (i = leftCount; i > 0; i--) { // top edge
                    st[stIndex++] = (i-1)*leftSt;
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
            attributes: attributes,
            indices: indices,
            boundingSphere: BoundingSphere.fromVertices(finalPositions)
        };
    }

    function computePositions(params) {
        var positions = params.positions;
        var width = params.width;
        var ellipsoid = params.ellipsoid;
        var roundCorners = params.roundCorners;
        var beveledCorners = (!roundCorners && params.beveledCorners);

        var calculatedPositions = [];

        var normal = cartesian1;
        var forward = cartesian2;
        var backward = cartesian3;
        var left = cartesian4;
        var rightPos = cartesian5;
        var leftPos = cartesian6;
        var cornerDirection = cartesian7;
        var startPoint = cartesian8;

        var position = scratchPosition;
        var nextPosition = scratchNextPosition;

        var calculatedLefts = [];
        var calculatedNormals = [];

        position = Cartesian3.fromArray(positions, 0, position); //add first point
        nextPosition = Cartesian3.fromArray(positions, 3, nextPosition);
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);

        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos);
        calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);

        position = nextPosition.clone(position);
        backward = forward.negate(backward);
        var corners = [];
        var i;
        var length = positions.length/3;
        for (i = 1; i < length-1; i++) { // add middle points and corners
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);

            nextPosition = Cartesian3.fromArray(positions, (i+1)*3, nextPosition);
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            var doCorner = !(CesiumMath.equalsEpsilon(angle, Math.PI, 0.02)) && !(CesiumMath.equalsEpsilon(angle, 0, 0.02));

            if (doCorner) {
                cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
                var scalar = width / (Cartesian3.cross(cornerDirection, backward, scratch1).magnitude());
                var leftIsOutside = angleIsGreaterThanPi(forward, backward);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);

                if (leftIsOutside) {
                    rightPos = position.add(cornerDirection, rightPos);
                    leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                    calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
                    calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
                    calculatedLefts.push(left.x, left.y, left.z);
                    calculatedNormals.push(normal.x, normal.y, normal.z);
                    startPoint = leftPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);

                    if (roundCorners || beveledCorners) {
                        corners.push(computeRoundCorner(rightPos, startPoint, leftPos, beveledCorners, leftIsOutside));
                    } else {
                        corners.push(computeMiteredCorner(position, cornerDirection.negate(cornerDirection), leftPos, leftIsOutside));
                    }
                } else {
                    leftPos = position.add(cornerDirection, leftPos);
                    calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                    calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
                    calculatedNormals.push(normal.x, normal.y, normal.z);
                    calculatedLefts.push(left.x, left.y, left.z);
                    startPoint = rightPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);

                    if (roundCorners || beveledCorners) {
                        corners.push(computeRoundCorner(leftPos, startPoint, rightPos, beveledCorners, leftIsOutside));
                    } else {
                        corners.push(computeMiteredCorner(position, cornerDirection, rightPos, leftIsOutside));
                    }
                }
            } else {
                corners.length++;
                leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos); // add last position
                calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
                rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
                calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);
            }


            position = nextPosition.clone(position);
            backward = forward.negate(backward);
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos); // add last position
        calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);

        var endPositions;
        if (roundCorners) {
            endPositions = addEndCaps(positions, calculatedPositions, width);
        }

        return combine(calculatedPositions, corners, calculatedLefts, calculatedNormals, params.vertexFormat, endPositions);
    }

    function extrudedAttributes(attributes, vertexFormat) {
        if (!vertexFormat.normal && !vertexFormat.binormal && !vertexFormat.tangent && !vertexFormat.st) {
            return attributes;
        }
        var positions = attributes.position.values;

        var topNormals;
        var topTangents;
        if (vertexFormat.normal || vertexFormat.tangent) {
            topNormals = attributes.normal.values;
            topTangents = attributes.tangent.values;
        }
        var size;
        if (vertexFormat.normal) {
            size = topNormals.length/3;
        } else if (vertexFormat.st) {
            size = attributes.st.values.length/2;
        } else if (vertexFormat.tangent) {
            size = topTangents.length/3;
        } else {
            size = attributes.binormal.values.length/3;
        }

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

            for (i = 0; i < threeSize; i+=3) {
                var attrIndexOffset = attrIndex + sixSize;
                topPosition = Cartesian3.fromArray(positions, i, topPosition);
                bottomPosition = Cartesian3.fromArray(positions, i + threeSize, bottomPosition);
                previousPosition = Cartesian3.fromArray(positions, (i + 3) % threeSize, previousPosition);

                bottomPosition = bottomPosition.subtract(topPosition, bottomPosition);
                previousPosition = previousPosition.subtract(topPosition, previousPosition);
                normal = bottomPosition.cross(previousPosition, normal).normalize(normal);

                if (vertexFormat.normal) {
                    normals = addAttribute(normals, normal, attrIndexOffset);
                    normals = addAttribute(normals, normal, attrIndexOffset + 3);
                    normals = addAttribute(normals, normal, attrIndex);
                    normals = addAttribute(normals, normal, attrIndex + 3);
                }
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    tangent = Cartesian3.fromArray(topNormals, i, tangent);
                    if (vertexFormat.tangent) {
                        tangents = addAttribute(tangents, tangent, attrIndexOffset);
                        tangents = addAttribute(tangents, tangent, attrIndexOffset + 3);
                        tangents = addAttribute(tangents, tangent, attrIndex);
                        tangents = addAttribute(tangents, tangent, attrIndex + 3);
                    }

                    if (vertexFormat.binormal) {
                        binormal = tangent.cross(normal, binormal).normalize(binormal);
                        binormals = addAttribute(binormals, binormal, attrIndexOffset);
                        binormals = addAttribute(binormals, binormal, attrIndexOffset + 3);
                        binormals = addAttribute(binormals, binormal, attrIndex);
                        binormals = addAttribute(binormals, binormal, attrIndex + 3);
                    }
                }
                attrIndex += 6;
            }

            if (vertexFormat.normal) {
                normals.set(topNormals); //top
                for (i = 0; i < threeSize; i+=3) { //bottom normals
                    normals[i + threeSize] = -topNormals[i];
                    normals[i + threeSize + 1] = -topNormals[i + 1];
                    normals[i + threeSize + 2] = -topNormals[i + 2];
                }

                attributes.normal.values = normals;
            }

            if (vertexFormat.binormal) {
                var topBinormals = attributes.binormal.values;
                binormals.set(topBinormals); //top
                binormals.set(topBinormals, threeSize); //bottom

                attributes.binormal.values = binormals;
            }

            if (vertexFormat.tangent) {
                tangents.set(topTangents); //top
                tangents.set(topTangents, threeSize); //bottom

                attributes.tangent.values = tangents;
            }
        }

        if (vertexFormat.st) {
            var topSt = attributes.st.values;
            var st = (vertexFormat.st) ? new Float32Array(twoSize * 6) : undefined;
            st.set(topSt); //top
            st.set(topSt, twoSize); //bottom
            var index = twoSize * 2;

            for (var j = 0; j < 2; j++) {
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

    function addWallPositions(positions, index, wallPositions){
        var length = positions.length;
        wallPositions[index++] = positions[0];
        wallPositions[index++] = positions[1];
        wallPositions[index++] = positions[2];

        for (var i = 3; i < length; i+=3) {
            var x = positions[i];
            var y = positions[i+1];
            var z = positions[i+2];

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
            position: vertexFormat.positon,
            normal:  (vertexFormat.normal || vertexFormat.tangent),
            tangent: (vertexFormat.normal || vertexFormat.tangent),
            binormal: vertexFormat.binormal,
            st: vertexFormat.st
        });
        var attr = computePositions(params);

        var height = params.height;
        var extrudedHeight = params.extrudedHeight;
        var ellipsoid = params.ellipsoid;

        var attributes = attr.attributes;
        var indices = attr.indices;
        var boundingSphere = attr.boundingSphere;
        var positions = attributes.position.values;
        var extrudedPositions = positions.slice(0);
        var length = positions.length/3;
        var wallPositions = new Array(length * 12);

        positions = PolylinePipeline.scaleToGeodeticHeight(positions, height, ellipsoid);
        wallPositions = addWallPositions(positions, 0, wallPositions);

        extrudedPositions = PolylinePipeline.scaleToGeodeticHeight(extrudedPositions, extrudedHeight, ellipsoid);
        wallPositions = addWallPositions(extrudedPositions, length*6, wallPositions);
        positions = positions.concat(extrudedPositions);
        boundingSphere = BoundingSphere.fromVertices(positions, undefined, 3, boundingSphere);
        positions = positions.concat(wallPositions);
        attributes.position.values = positions;

        var i;
        var iLength = indices.length;
        for (i = 0; i < iLength; i+=3) { // bottom indices
            var v0 = indices[i];
            var v1 = indices[i + 1];
            var v2 = indices[i + 2];

            indices.push(v2 + length, v1 + length, v0 + length);
        }

        attributes = extrudedAttributes(attributes, vertexFormat);

        var UL, LL, UR, LR;
        var twoLength = length + length;
        for (i = 0; i < twoLength; i+=2) { //wall indices
            UR = i + twoLength;
            LR = UR + twoLength;
            UL = UR + 1;
            LL = LR + 1;

            indices.push(UL, LL, UR, UR, LL, LR);
        }

        return {
            attributes: attributes,
            indices: indices,
            boundingSphere: boundingSphere
        };
    }

    /**
     * A {@link Geometry} that represents vertices and indices for a cube centered at the origin.
     *
     * @alias CorridorGeometry
     * @constructor
     *
     * @param {Array} options.positions An array of {Cartesain3} positions that define the center of the airspace.
     * @param {Number} options.width The distance from the positions to the walls of the airspace.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance between the ellipsoid surface and the extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Boolean} [options.roundCorners = true] If true, the corners and end caps of the airspace are rounded.
     * @param {Booleen} [options.beveledCorners = false] Determines whether to bevel or miter the airspace corners.  Only applicable if options.roundCorners is false.

     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     * @exception {DeveloperError} options.normals.length must equal options.positions.length.
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

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        var height = defaultValue(options.height, 0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);
        var extrude = (height !== extrudedHeight);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        cleanPositions = PolylinePipeline.scaleToSurface(cleanPositions);

        var params = {
                ellipsoid: ellipsoid,
                vertexFormat: vertexFormat,
                positions: cleanPositions,
                width: width,
                roundCorners: defaultValue(options.roundCorners, true),
                beveledCorners: defaultValue(options.beveledCorners, false)
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
            attr.attributes.position.values = PolylinePipeline.scaleToGeodeticHeight(attr.attributes.position.values, height, ellipsoid);
        }

        if (vertexFormat.position) {
            attr.attributes.position.values = new Float64Array(attr.attributes.position.values);
        } else {
            attr.attributes.position.values = undefined;
        }

        var attributes = attr.attributes;
        var indices = attr.indices;
        var boundingSphere = attr.boundingSphere;

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = IndexDatatype.createTypedArray(attributes.position.values.length/3, indices);

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return CorridorGeometry;
});