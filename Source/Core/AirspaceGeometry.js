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

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCartesian7 = new Cartesian3();
    var scratchCartesian8 = new Cartesian3();
    var scratchCartesian = new Cartesian3();
    var scratchCartesian20 = new Cartesian3();

    function angleIsGreaterThanPi (first, second) {
        scratchCartesian = first.cross(second, scratchCartesian);
        return scratchCartesian.z < 0;
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
/*
    function computeAttributes(calculatedNormals, calculatedLefts, attr, attributes, extrude, threeVertex, vertexFormat, vertexCount) {
        var i;
        var normals = attributes.normals;
        var binormals = attributes.binormals;
        var tangents = attributes.tangents;
        var computeNormals = defined(normals);
        var computeBinormals= defined(binormals);
        var computeTangents = defined(tangents);

        if (!computeNormals && !computeBinormals && !computeTangents) {
            return attributes;
        }

        var posSize = (extrude) ? threeVertex/4 : threeVertex;
        var front = 0;
        var back = posSize - 1;

        var bottomOffset = posSize;
        var topWallOffset = posSize + posSize;
        var bottomWallOffset = topWallOffset + posSize;
        var length = calculatedNormals.length/3;

        var normal = Cartesian3.fromArray(calculatedNormals, 0, scratchCartesian1);
        var left = Cartesian3.fromArray(calculatedLefts, 0, scratchCartesian2);
        var forward = left.cross(normal, scratchCartesian3).normalize(scratchCartesian3);

        if (computeNormals) {
            normals = addAttribute(normals, normal, front, back);
        }
        if (computeTangents) {
            tangents = addAttribute(tangents, left, front, back);
        }
        if (computeBinormals) {
            binormals = addAttribute(binormals, forward, front, back);
        }

        var b, n;
        if (extrude) {
            var backwards = forward.negate(scratchCartesian4);
            if (computeNormals || computeBinormals) {
                n = left.add(backwards, scratchCartesian5).normalize(scratchCartesian5);
                if (computeNormals) {
                    normals = addAttribute(normals, normal.negate(scratchCartesian6), front + bottomOffset, back + bottomOffset);
                    normals = addAttribute(normals, n, front + topWallOffset);
                    normals = addAttribute(normals, n, front + bottomWallOffset);
                }
                if (computeBinormals) {
                    b = normal.cross(n, scratchCartesian5).normalize(scratchCartesian5);
                    binormals = addAttribute(binormals, forward, front + bottomOffset, back + bottomOffset);
                    binormals = addAttribute(binormals, b, front + topWallOffset);
                    binormals = addAttribute(binormals, b, front + bottomWallOffset);
                }

                n = left.negate(scratchCartesian5).add(backwards, scratchCartesian5).normalize(scratchCartesian5);
                if (computeNormals) {
                    normals = addAttribute(normals, n, undefined, back + topWallOffset);
                    normals = addAttribute(normals, n, undefined, back + bottomWallOffset);
                }
                if (computeBinormals) {
                    b = normal.cross(n, scratchCartesian5).normalize(scratchCartesian5);
                    binormals = addAttribute(binormals, b, undefined, back + topWallOffset);
                    binormals = addAttribute(binormals, b, undefined, back + bottomWallOffset);
                }
            }
            if (computeTangents) {
                tangents = addAttribute(tangents, left, front + bottomOffset, back + bottomOffset);
                tangents = addAttribute(tangents, normal, front + topWallOffset, back + topWallOffset);
                tangents = addAttribute(tangents, normal, front + bottomWallOffset, back + bottomWallOffset);
            }
        }

        front += 3;
        back -= 3;

        for (i = 1; i < length-1; i++) {
            normal = Cartesian3.fromArray(calculatedNormals, i*3, scratchCartesian1);
            left = Cartesian3.fromArray(calculatedLefts, i*3, scratchCartesian2);
            if (computeNormals) {
                normals = addAttribute(normals, normal, front, back);

                if (extrude) {
                    normals = addAttribute(normals, normal.negate(scratchCartesian5), front + bottomOffset, back + bottomOffset);
                    normals = addAttribute(normals, left, front + topWallOffset);
                    normals = addAttribute(normals, left, front + bottomWallOffset);
                    normals = addAttribute(normals, left.negate(scratchCartesian5), undefined, back + topWallOffset);
                    normals = addAttribute(normals, left.negate(scratchCartesian5), undefined, back + bottomWallOffset);
                }
            }

            if (computeTangents) {
                tangents = addAttribute(tangents, left, front, back);

                if (extrude) {
                    tangents = addAttribute(tangents, normal, front + bottomOffset, back + bottomOffset);
                    tangents = addAttribute(tangents, normal, front + topWallOffset, back + topWallOffset);
                    tangents = addAttribute(tangents, normal, front + bottomWallOffset, back + bottomWallOffset);
                }
            }

            if (computeBinormals) {
                forward = left.cross(normal, scratchCartesian3).normalize(scratchCartesian3);
                binormals = addAttribute(binormals, forward, front, back);

                if (extrude) {
                    binormals = addAttribute(binormals, forward, front + bottomOffset, back + bottomOffset);
                    binormals = addAttribute(binormals, forward, front + topWallOffset, back + topWallOffset);
                    binormals = addAttribute(binormals, forward, front + bottomWallOffset, back + bottomWallOffset);
                }
            }
            front += 3;
            back -= 3;
        }

        if (extrude) {
            if (computeNormals || computeBinormals) {
                n = left.add(forward, scratchCartesian4).normalize(scratchCartesian4);
                if (computeNormals) {
                    normals = addAttribute(normals, normal.negate(scratchCartesian6), front + bottomOffset, back + bottomOffset);
                    normals = addAttribute(normals, n, front + topWallOffset);
                    normals = addAttribute(normals, n, front + bottomWallOffset);
                }
                if (computeBinormals) {
                    binormals = addAttribute(binormals, forward, front + bottomOffset, back + bottomOffset);
                    b = normal.cross(n, scratchCartesian5).normalize(scratchCartesian5);
                    binormals = addAttribute(binormals, b, front + topWallOffset);
                    binormals = addAttribute(binormals, b, front + bottomWallOffset);
                }
                n = left.negate(scratchCartesian5).add(forward, scratchCartesian4).normalize(scratchCartesian4);
                if (computeNormals) {
                    normals = addAttribute(normals, n, undefined, back + topWallOffset);
                    normals = addAttribute(normals, n, undefined, back + bottomWallOffset);
                }
                if (computeBinormals) {
                    b = normal.cross(n, scratchCartesian5).normalize(scratchCartesian5);
                    binormals = addAttribute(binormals, b, undefined, back + topWallOffset);
                    binormals = addAttribute(binormals, b, undefined, back + bottomWallOffset);
                }
            }
            if (computeTangents) {
                tangents = addAttribute(tangents, left, front + bottomOffset, back + bottomOffset);
                tangents = addAttribute(tangents, normal, front + topWallOffset, back + topWallOffset);
                tangents = addAttribute(tangents, normal, front + bottomWallOffset, back + bottomWallOffset);
            }
        }

        return attributes;
    }
*/
    function addNormals(attr, normal, left, front, back, vertexFormat) {
        var normals = attr.normals;
        var tangents = attr.tangents;
        var binormals = attr.binormals;

        var forward = left.cross(normal, scratchCartesian3).normalize(scratchCartesian3);
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
        var angle = Cartesian3.angleBetween(startPoint.subtract(cornerPoint, scratchCartesian), endPoint.subtract(cornerPoint, scratchCartesian20));
        var granularity = (beveled) ? 1 : Math.floor(angle/CesiumMath.toRadians(5));
        var size = (granularity+1)*3;
        var array = new Array(size);
        array[size-3] = endPoint.x;
        array[size-2] = endPoint.y;
        array[size-1] = endPoint.z;

        var q;
        if (leftIsOutside) {
            q = Quaternion.fromAxisAngle(cornerPoint, angle/(granularity+1), quaterion);
        } else {
            q = Quaternion.fromAxisAngle(cornerPoint.negate(cornerPoint), angle/(granularity+1), quaterion);
        }

        var m = Matrix3.fromQuaternion(q, rotMatrix);
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
        var cornerPoint = scratchCartesian1;
        var startPoint = scratchCartesian2;
        var endPoint = scratchCartesian3;

        cornerPoint = originalPositions[0];
        startPoint = Cartesian3.fromArray(calculatedPositions, 0, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions, 3, endPoint);

        var firstEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, false);

        var length = calculatedPositions.length;
        cornerPoint = originalPositions[originalPositions.length-1];
        startPoint = Cartesian3.fromArray(calculatedPositions, length - 6, startPoint);
        endPoint = Cartesian3.fromArray(calculatedPositions, length - 3, endPoint);

        var lastEndCap = computeRoundCorner(cornerPoint, startPoint, endPoint, false, true);

        return [firstEndCap, lastEndCap];
    }

    function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
        var leftArray;
        var rightArray;
        if (leftIsOutside) {
            var leftPos = position.add(leftCornerDirection, scratchCartesian);
            leftArray = [leftPos.x, leftPos.y, leftPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            var rightPos = position.add(leftCornerDirection, scratchCartesian);
            rightArray = [rightPos.x, rightPos.y, rightPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        }
        return {
            leftPositions: leftArray,
            rightPositions: rightArray
        };
    }

    function combine(positions, corners, computedLefts, computedNormals, vertexFormat, endPositions, firstPos, lastPos) {
        var attributes = new GeometryAttributes();
        var leftCount = positions.length/2;
        var rightCount = leftCount;
        var i;
        var length = corners.length;
        for (i = 0; i < length; i++) {
            var leftSide = corners[i].leftPositions;
            if (defined(leftSide)) {
                leftCount += leftSide.length;
            } else {
                rightCount += corners[i].rightPositions.length;
            }
        }
        var addEndPositions = defined(endPositions);
        if (addEndPositions) {
            length = endPositions[0].rightPositions.length - 3;
            leftCount += length;
            rightCount += length;
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

        var normal = scratchCartesian1;
        var left = scratchCartesian2;

        var rightPos, leftPos;
        var halfLength;
        if (addEndPositions) {
            leftPos = scratchCartesian3;
            rightPos = scratchCartesian4;

            var firstEndPositions = endPositions[0].rightPositions;
            length = (firstEndPositions.length/3) - 1;
            halfLength = length/2;
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(firstEndPositions, (halfLength - 1 - i) * 3, leftPos);
                rightPos = Cartesian3.fromArray(firstEndPositions, (halfLength + i) * 3, rightPos);

                finalPositions = addAttribute(finalPositions, leftPos, front);
                finalPositions = addAttribute(finalPositions, rightPos, undefined, back);

                normal = Cartesian3.fromArray(computedNormals, 0, normal);
                left = leftPos.subtract(firstPos, left).normalize(left);
                attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                left = rightPos.subtract(firstPos, left).normalize(left);
                attr = addNormals(attr, normal, left, undefined, back, vertexFormat);

                LR = front/3;
                LL = LR + 1;
                UR = (back-2)/3;
                UL = UR - 1;
                indices.push(UL, LL, UR, UR, LL, LR);

                front += 3;
                back -= 3;
            }
        }


        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), front); //add first two positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), undefined, back);
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
            UR = front/3;
            UL = UR - 1;
            LR = (back-2)/3;
            LL = LR + 1;
            indices.push(UL, LL, UR, UR, LL, LR);

            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), front);
            positionIndex += 3;
            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), undefined, back);
            positionIndex += 3;
            normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
            left = Cartesian3.fromArray(computedLefts, compIndex, left);

            var corner = corners[i];
            var l = corner.leftPositions;
            var r = corner.rightPositions;
            var p;
            var start;
            var pos;
            var before = scratchCartesian3;
            var after = scratchCartesian4;
            if (defined(l)) {
                attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                front+=3;
                compIndex += 3;
                p = LR;
                start = UR;
                for (j = 0; j < l.length/3; j++) {
                    pos = Cartesian3.fromArray(l, j*3, scratchCartesian6);
                    indices.push(p, start + j + 1, start + j);
                    finalPositions = addAttribute(finalPositions, pos, front);
                    before = Cartesian3.fromArray(finalPositions, (start + j + 1)*3, before);
                    after = Cartesian3.fromArray(finalPositions, p*3, after);
                    left = before.subtract(after, left).normalize(left);
                    attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                    front+=3;
                }

                pos = Cartesian3.fromArray(finalPositions, p*3, scratchCartesian6);
                before = Cartesian3.fromArray(finalPositions, (start)*3, before).subtract(pos);
                after = Cartesian3.fromArray(finalPositions, (start + j)*3, after).subtract(pos);
                left = before.add(after, left).normalize(left);
                attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                back -= 3;
            } else {
                attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                back -= 3;
                compIndex += 3;
                p = UR;
                start = LR;
                for (j = 0; j < r.length/3; j++) {
                    pos = Cartesian3.fromArray(r, j*3, scratchCartesian6);
                    indices.push(p, start - j, start - j - 1);
                    finalPositions = addAttribute(finalPositions, pos, undefined, back);
                    before = Cartesian3.fromArray(finalPositions, p*3, before);
                    after = Cartesian3.fromArray(finalPositions, (start - j - 1)*3, after);
                    left = before.subtract(after, left).normalize(left);
                    attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                    back -= 3;
                }
                pos = Cartesian3.fromArray(finalPositions, p*3, scratchCartesian6);
                before = Cartesian3.fromArray(finalPositions, (start - j)*3, before).subtract(pos);
                after = Cartesian3.fromArray(finalPositions, start*3, after).subtract(pos);
                left = after.add(before, left).negate(left).normalize(left);
                attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                front+=3;
            }
        }

        UR = front/3;
        UL = UR - 1;
        LR = (back-2)/3;
        LL = LR + 1;
        indices.push(UL, LL, UR, UR, LL, LR);

        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), front); //add last positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratchCartesian), undefined, back);
        positionIndex += 3;

        normal = Cartesian3.fromArray(computedNormals, compIndex, normal);
        left = Cartesian3.fromArray(computedLefts, compIndex, left);
        attr = addNormals(attr, normal, left, front, back, vertexFormat);


        if (addEndPositions) {
            leftPos = scratchCartesian3;
            rightPos = scratchCartesian4;

            var lastEndPositions = endPositions[1].leftPositions;
            length = (lastEndPositions.length/3) - 1;
            halfLength = length/2;
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(lastEndPositions, i * 3, leftPos);
                rightPos = Cartesian3.fromArray(lastEndPositions, (length - i - 1) * 3, rightPos);

                finalPositions = addAttribute(finalPositions, leftPos, front);
                finalPositions = addAttribute(finalPositions, rightPos, undefined, back);

                left = leftPos.subtract(lastPos, left).normalize(left);
                attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                left = rightPos.subtract(lastPos, left).normalize(left);
                attr = addNormals(attr, normal, left, undefined, back, vertexFormat);

                LR = front/3;
                LL = LR + 1;
                UR = (back-2)/3;
                UL = UR - 1;
                indices.push(UL, LL, UR, UR, LL, LR);

                front += 3;
                back -= 3;
            }
        }

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.st) {
            leftCount /= 3;
            rightCount /= 3;
            var st = new Float32Array(size/3*2);
            var leftSt = 1 / (leftCount-1);
            var rightSt = 1 / (rightCount-1);

            var stIndex = 0;

            for (i = 0; i < leftCount; i++) {
                st[stIndex++] = i*leftSt;
                st[stIndex++] = 1;
            }
            for (i = rightCount; i > 0; i--) {
                st[stIndex++] = (i-1)*rightSt;
                st[stIndex++] = 0;
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

        var normal = scratchCartesian1;
        var forward = scratchCartesian2;
        var backward = scratchCartesian3;
        var left = scratchCartesian4;
        var rightPos = scratchCartesian5;
        var leftPos = scratchCartesian6;
        var cornerDirection = scratchCartesian7;
        var startPoint = scratchCartesian8;

        var calculatedNormals = [];
        var calculatedLefts = [];

        var position = positions[0]; //add first point
        var nextPosition = positions[1];
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);

        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos);
        calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        position = nextPosition;
        backward = forward.negate(backward);
        var corners = [];
        var i;
        var length = positions.length;
        for (i = 1; i < length-1; i++) {
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);

            nextPosition = positions[i+1];
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            if ( angle !== Math.PI && angle !== 0) {
                cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
            }
            var scalar = width / (Cartesian3.cross(cornerDirection, backward, scratchCartesian5).magnitude());
            var leftIsOutside = angleIsGreaterThanPi(forward, backward);
            cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);

            if (leftIsOutside) {
                rightPos = position.add(cornerDirection, rightPos);
                leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
                calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);
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

            position = nextPosition;
            backward = forward.negate(backward);
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos); // add last position
        calculatedPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(rightPos.x, rightPos.y, rightPos.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        var endPositions;
        if (roundCorners) {
            endPositions = addEndCaps(positions, calculatedPositions, width);
        }

        var attr = combine(calculatedPositions, corners, calculatedLefts, calculatedNormals, params.vertexFormat, endPositions, positions[0], positions[length-1]);

        return attr;
    }

    function computePositionsExtruded(params) {
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
        positions = PolylinePipeline.scaleFromSurfaceToGeodeticHeight(positions, height, ellipsoid);

        extrudedPositions = PolylinePipeline.scaleFromSurfaceToGeodeticHeight(extrudedPositions, extrudedHeight, ellipsoid);
        positions = positions.concat(extrudedPositions);
        boundingSphere = BoundingSphere.fromVertices(positions, boundingSphere);
        positions = positions.concat(positions);

        var i;
        for (i = 0; i < length; i++) {
            //clone bottom indices
        }

        for (i = 0; i < length; i++) {
            //add wall indices
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
     * @alias AirspaceGeometry
     * @constructor
     *
     * @param {Array} options.positions An array of {Cartesain3} positions that define the center of the airspace.
     * @param {Number} options.width The distance from the positions to the walls of the airspace.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance between the ellipsoid surface and the extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Boolean} [options.roundCorners = true] If true, the corners and end caps of the airspace are rounded.
     * @param {Booleen} [options.beveledCorners = true] Determines whether to bevel or miter the airspace corners.  Only applicable if options.roundCorners is false.

     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     * @exception {DeveloperError} options.normals.length must equal options.positions.length.
     *
     * @example
     * var airspace = new AirspaceGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *   width : 100000
     * });
     */
    var AirspaceGeometry = function(options) {
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
        var params = {
                ellipsoid: ellipsoid,
                vertexFormat: vertexFormat,
                positions: cleanPositions,
                width: width,
                roundCorners: defaultValue(options.roundCorners, true),
                beveledCorners: defaultValue(options.beveledCorners, true)
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
            var values = attr.attributes.position.values;
            if (vertexFormat.position && height !== 0) {
                values = PolylinePipeline.scaleFromSurfaceToGeodeticHeight(values, height, ellipsoid);
            }
            attr.attributes.position.values = new Float64Array(values);
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

    return AirspaceGeometry;
});