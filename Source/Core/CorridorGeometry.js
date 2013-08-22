/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
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

    var scratch1= new Cartesian3();
    var scratch2 = new Cartesian3();

    var originScratch = new Cartesian2();
    var nextScratch = new Cartesian2();
    var prevScratch = new Cartesian2();
    function angleIsGreaterThanPi (forward, backward, position, ellipsoid) { //if cross product is opposite of the normal, then true
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(position.add(forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(position.add(backward, prevScratch), prevScratch);

        prev = prev.subtract(origin, prev);
        next = next.subtract(origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
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
        var granularity = (beveled) ? 0 : Math.ceil(angle/CesiumMath.toRadians(10));
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

        var leftEdge = calculatedPositions[1];
        startPoint = Cartesian3.fromArray(calculatedPositions[1], leftEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
        cornerPoint = originalPositions[0];
        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, false);

        var length = calculatedPositions.length - 1;
        var rightEdge = calculatedPositions[length - 1];
        leftEdge = calculatedPositions[length];
        startPoint = Cartesian3.fromArray(rightEdge, rightEdge.length - 3, startPoint);
        endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
        cornerPoint = originalPositions[originalPositions.length - 1];
        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, false);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
        if (leftIsOutside) {
            var leftPos = position.add(leftCornerDirection);
            var leftArray = [leftPos.x, leftPos.y, leftPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
            return {
                leftPositions: leftArray
            };
        }

        leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
        var rightPos = position.add(leftCornerDirection);
        var rightArray = [rightPos.x, rightPos.y, rightPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        return {
            rightPositions: rightArray
        };
    }

    function combine(positions, corners, computedLefts, computedNormals, vertexFormat, endPositions, ellipsoid) {
        var attributes = new GeometryAttributes();
        var corner;
        var leftCount = 0;
        var rightCount = 0;
        var i;
        for (i = 0; i < positions.length; i+=2) {
            leftCount += positions[i].length - 3; //subtracting 3 to account for duplicate points at corners
            rightCount += positions[i+1].length - 3;
        }
        leftCount += 3; //add back count for end positions
        rightCount += 3;
        for (i = 0; i < corners.length; i++) {
            corner = corners[i];
            var leftSide = corners[i].leftPositions;
            if (defined(leftSide)) {
                leftCount += leftSide.length;
            } else {
                rightCount += corners[i].rightPositions.length;
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
        var finalPositions = new Float64Array(size);
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
        var normal = cartesian1;
        var left = cartesian2;
        var rightPos, leftPos;
        var halfLength = endPositionLength/2;
        if (addEndPositions) { // add rounded end
            leftPos = cartesian3;
            rightPos = cartesian4;
            var firstEndPositions = endPositions[0].rightPositions;
            normal = Cartesian3.fromArray(computedNormals, 0, normal);
            left = Cartesian3.fromArray(computedLefts, 0, left);
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(firstEndPositions, (halfLength - 1 - i) * 3, leftPos);
                rightPos = Cartesian3.fromArray(firstEndPositions, (halfLength + i) * 3, rightPos);
                finalPositions = addAttribute(finalPositions, rightPos, front);
                finalPositions = addAttribute(finalPositions, leftPos, undefined, back);
                attr = addNormals(attr, normal, left, front, back, vertexFormat);

                LL = front/3;
                LR = LL + 1;
                UL = (back-2)/3;
                UR = UL - 1;
                indices.push(UL, LL, UR, UR, LL, LR);
                front += 3;
                back -= 3;
            }
        }

        var posIndex = 0;
        var compIndex = 0;
        var rightEdge = positions[posIndex++];  //add first two edges
        var leftEdge = positions[posIndex++];
        finalPositions.set(rightEdge, front);
        finalPositions.set(leftEdge, back - leftEdge.length + 1);

        left = Cartesian3.fromArray(computedLefts, compIndex, left);
        var rightNormal;
        var leftNormal;
        var length = leftEdge.length - 3;
        for(i = 0; i < length; i+=3) {
            rightNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(rightEdge, i, scratch1), scratch1);
            leftNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(leftEdge, i, scratch2), scratch2);
            normal = rightNormal.add(leftNormal, normal).normalize(normal);
            attr = addNormals(attr, normal, left, front, back, vertexFormat);

            LL = front/3;
            LR = LL + 1;
            UL = (back-2)/3;
            UR = UL - 1;
            indices.push(UL, LL, UR, UR, LL, LR);
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
            rightEdge = positions[posIndex++];
            leftEdge = positions[posIndex++];
            rightEdge.splice(0, 3); //remove duplicate points added by corner
            leftEdge.splice(leftEdge.length - 3, 3);
            finalPositions.set(rightEdge, front);
            finalPositions.set(leftEdge, back - leftEdge.length + 1);

            compIndex += 3;
            left = Cartesian3.fromArray(computedLefts, compIndex, left);
            for(j = 0; j < leftEdge.length; j+=3) {
                rightNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(rightEdge, j, scratch1), scratch1);
                leftNormal = ellipsoid.geodeticSurfaceNormal(Cartesian3.fromArray(leftEdge, j, scratch2), scratch2);
                normal = rightNormal.add(leftNormal, normal).normalize(normal);
                attr = addNormals(attr, normal, left, front, back, vertexFormat);

                LR = front/3;
                LL = LR - 1;
                UR = (back-2)/3;
                UL = UR + 1;
                indices.push(UL, LL, UR, UR, LL, LR);
                front += 3;
                back -= 3;
            }
            front -= 3;
            back += 3;
        }

        if (addEndPositions) {  // add rounded end
            front += 3;
            back -= 3;
            leftPos = cartesian3;
            rightPos = cartesian4;
            var lastEndPositions = endPositions[1].rightPositions;
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(lastEndPositions, (endPositionLength - i - 1) * 3, leftPos);
                rightPos = Cartesian3.fromArray(lastEndPositions, i * 3, rightPos);
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
                    st[stIndex++] = rightSt * (1 + Math.cos(a));
                    st[stIndex++] = 0.5 * (1 + Math.sin(a));
                }
                for (i = 1; i < rightCount- endPositionLength + 1; i++) { // bottom edge
                    st[stIndex++] = i*rightSt;
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
                    st[stIndex++] = i*leftSt;
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
        var granularity = params.granularity;
        var positions = params.positions;
        var width = params.width;
        var ellipsoid = params.ellipsoid;
        var roundCorners = params.roundCorners;
        var beveledCorners = (!roundCorners && params.beveledCorners);
        var normal = cartesian1;
        var forward = cartesian2;
        var backward = cartesian3;
        var left = cartesian4;
        var cornerDirection = cartesian5;
        var startPoint = cartesian6;
        var previousLeftPos = cartesian7;
        var previousRightPos = cartesian8;
        var rightPos = cartesian9;
        var leftPos = cartesian10;
        var calculatedPositions = [];
        var calculatedLefts = [];
        var calculatedNormals = [];
        var position = positions[0]; //add first point
        var nextPosition = positions[1];

        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);
        previousLeftPos = position.add(left.multiplyByScalar(width, previousLeftPos), previousLeftPos);
        previousRightPos = position.add(left.multiplyByScalar(width, previousRightPos).negate(previousRightPos), previousRightPos);
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        position = nextPosition;
        backward = forward.negate(backward);

        var corners = [];
        var i;
        var length = positions.length;
        for (i = 1; i < length-1; i++) { // add middle points and corners
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            nextPosition = positions[i+1];
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            var doCorner = !(CesiumMath.equalsEpsilon(angle, Math.PI, 0.02)) && !(CesiumMath.equalsEpsilon(angle, 0, 0.02));
            if (doCorner) {
                cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, (Cartesian3.cross(cornerDirection, backward, scratch1).magnitude()));
                var leftIsOutside = angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
                if (leftIsOutside) {
                    rightPos = position.add(cornerDirection, rightPos);
                    leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));
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
                    previousRightPos = rightPos.clone(previousRightPos);
                    previousLeftPos = leftPos.clone(previousLeftPos);
                } else {
                    leftPos = position.add(cornerDirection, leftPos);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));
                    calculatedLefts.push(left.x, left.y, left.z);
                    calculatedNormals.push(normal.x, normal.y, normal.z);
                    startPoint = rightPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                    if (roundCorners || beveledCorners) {
                        corners.push(computeRoundCorner(leftPos, startPoint, rightPos, beveledCorners, leftIsOutside));
                    } else {
                        corners.push(computeMiteredCorner(position, cornerDirection, rightPos, leftIsOutside));
                    }
                    previousRightPos = rightPos.clone(previousRightPos);
                    previousLeftPos = leftPos.clone(previousLeftPos);
                }
                backward = forward.negate(backward);
            }
            position = nextPosition;
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos); // add last position
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
        calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));
        calculatedLefts.push(left.x, left.y, left.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);

        var endPositions;
        if (roundCorners) {
            endPositions = addEndCaps(positions, calculatedPositions, width);
        }

        return combine(calculatedPositions, corners, calculatedLefts, calculatedNormals, params.vertexFormat, endPositions, ellipsoid);
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
        wallPositions[index++] = positions[0];
        wallPositions[index++] = positions[1];
        wallPositions[index++] = positions[2];
        for (var i = 3; i < positions.length; i+=3) {
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
        var positions = Array.apply([], attributes.position.values);
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
        attributes.position.values = new Float64Array(positions);

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
            UL = i + twoLength;
            LL = UL + twoLength;
            UR = UL + 1;
            LR = LL + 1;
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
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
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

        this._positions = positions;
        this._width = width;
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._height = defaultValue(options.height, 0);
        this._extrudedHeight = defaultValue(options.extrudedHeight, this._height);
        this._roundCorners = defaultValue(options.roundCorners, true);
        this._beveledCorners = defaultValue(options.beveledCorners, false);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createCorridorGeometry';
    };

    CorridorGeometry.createGeometry = function(corridorGeometry) {
        var positions = corridorGeometry._positions;
        var height = corridorGeometry._height;
        var extrudedHeight = corridorGeometry._extrudedHeight;
        var extrude = (height !== extrudedHeight);
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('There must be more than two unique positions.');
        }
        var ellipsoid = corridorGeometry._ellipsoid;
        var vertexFormat = corridorGeometry._vertexFormat;
        var params = {
                ellipsoid: ellipsoid,
                vertexFormat: vertexFormat,
                positions: cleanPositions,
                width: corridorGeometry._width,
                roundCorners: corridorGeometry._roundCorners,
                beveledCorners: corridorGeometry._beveledCorners,
                granularity: corridorGeometry._granularity
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
                attr.attributes.position.values = new Float64Array(PolylinePipeline.scaleToGeodeticHeight(attr.attributes.position.values, height, ellipsoid));
            }

        }
        var attributes = attr.attributes;

        return new Geometry({
            attributes : attributes,
            indices : IndexDatatype.createTypedArray(attributes.position.values.length/3, attr.indices),
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : attr.boundingSphere
        });
    };

    return CorridorGeometry;
});