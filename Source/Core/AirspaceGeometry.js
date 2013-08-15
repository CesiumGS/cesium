/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './Ellipsoid',
        './GeometryInstance',
        './Geometry',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PolylinePipeline',
        './PolygonPipeline',
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
        GeometryInstance,
        Geometry,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        Quaternion,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat) {
    "use strict";

    var scratchNormal = new Cartesian3();

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCartesian7 = new Cartesian3();
    var scratchCartesian8 = new Cartesian3();
    var scratchCartesian9 = new Cartesian3();
    var scratchCartesian10 = new Cartesian3();
    var scratchCartesian11 = new Cartesian3();
    var scratch = new Cartesian3();

    var cross = new Cartesian3();
    function angleIsGreaterThanPi (first, second) {
        cross = first.cross(second, cross);
        return cross.z < 0;
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

    function scalePositionToHeight(position, height, ellipsoid) {
        var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
        position = ellipsoid.scaleToGeodeticSurface(position, position);
        position = position.add(normal.multiplyByScalar(height, normal), position);
        return position;
    }

    function scalePositionsToHeight(positions, height, ellipsoid) {
        for(var i = 0; i < positions.length; i++) {
            positions[i] = scalePositionToHeight(positions[i], height, ellipsoid);
        }
        return positions;
    }

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(cornerPoint, startPoint, endPoint, granularity, leftIsOutside) {
        var size = (granularity+1)*3;
        var array = new Array(size);
        array[size-3] = endPoint.x;
        array[size-2] = endPoint.y;
        array[size-1] = endPoint.z;

        var pos = startPoint.clone(scratch);
        var angle = Cartesian3.angleBetween(startPoint.subtract(cornerPoint, startPoint), endPoint.subtract(cornerPoint, endPoint))/(granularity+1);
        var q;
        if (leftIsOutside) {
            q = Quaternion.fromAxisAngle(cornerPoint, angle, quaterion);
        } else {
            q = Quaternion.fromAxisAngle(cornerPoint.negate(cornerPoint), angle, quaterion);
        }

        var m = Matrix3.fromQuaternion(q, rotMatrix);
        var index = 0;

        for (var i = 0; i < granularity; i++) {
            pos = m.multiplyByVector(pos, pos);
            array[index++] = pos.x;
            array[index++] = pos.y;
            array[index++] = pos.z;
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

    function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
        var leftArray;
        var rightArray;
        if (leftIsOutside) {
            var leftPos = position.add(leftCornerDirection, scratch);
            leftArray = [leftPos.x, leftPos.y, leftPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        } else {
            leftCornerDirection = leftCornerDirection.negate(leftCornerDirection);
            var rightPos = position.add(leftCornerDirection, scratch);
            rightArray = [rightPos.x, rightPos.y, rightPos.z, lastPoint.x, lastPoint.y, lastPoint.z];
        }
        return {
            leftPositions: leftArray,
            rightPositions: rightArray
        };
    }

    function combine(positions, corners, computedLefts, computedNormals, vertexFormat) {
        var attributes = new GeometryAttributes();
        var leftCount = positions.length/2;
        var rightCount = leftCount;
        var i;
        for (i = 0; i < corners.length; i++) {
            var leftPos = corners[i].leftPositions;
            if (defined(leftPos)) {
                leftCount += leftPos.length;
            } else {
                rightCount += corners[i].rightPositions.length;
            }
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
        var positionIndex = 0;
        var compIndex = 0;


        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), front); //add first two positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), undefined, back);
        positionIndex += 3;

        var normal = Cartesian3.fromArray(computedNormals, compIndex, scratchCartesian1);
        var left = Cartesian3.fromArray(computedLefts, compIndex, scratchCartesian2);
        attr = addNormals(attr, normal, left, front, back, vertexFormat);

        front+=3;
        back -= 3;
        compIndex += 3;

        for (i = 0; i < corners.length; i++) {
            var j;
            UR = front/3;
            UL = UR - 1;
            LR = (back-2)/3;
            LL = LR + 1;
            indices.push(UL, LL, UR, UR, LL, LR);

            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), front);
            positionIndex += 3;
            finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), undefined, back);
            positionIndex += 3;
            normal = Cartesian3.fromArray(computedNormals, compIndex, scratchCartesian1);
            left = Cartesian3.fromArray(computedLefts, compIndex, scratchCartesian2);

            var corner = corners[i];
            var l = corner.leftPositions;
            var r = corner.rightPositions;
            var p;
            var start;
            var pos;
            var before;
            var after;
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
                    left = Cartesian3.fromArray(finalPositions, (start + j + 1)*3, scratchCartesian3).subtract(Cartesian3.fromArray(finalPositions, p*3, scratchCartesian4), scratchCartesian2).normalize(scratchCartesian2);
                    attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                    front+=3;
                }

                pos = Cartesian3.fromArray(finalPositions, p*3, scratchCartesian6);
                before = Cartesian3.fromArray(finalPositions, (start)*3, scratchCartesian3).subtract(pos);
                after = Cartesian3.fromArray(finalPositions, (start + j)*3, scratchCartesian4).subtract(pos);
                left = before.add(after, scratchCartesian2).normalize(scratchCartesian2);
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
                    left = Cartesian3.fromArray(finalPositions, p*3, scratchCartesian3).subtract(Cartesian3.fromArray(finalPositions, (start - j - 1)*3, scratchCartesian4), scratchCartesian2).normalize(scratchCartesian2);
                    attr = addNormals(attr, normal, left, undefined, back, vertexFormat);
                    back -= 3;
                }
                pos = Cartesian3.fromArray(finalPositions, p*3, scratchCartesian6);
                before = Cartesian3.fromArray(finalPositions, (start - j)*3, scratchCartesian3).subtract(pos);
                after = Cartesian3.fromArray(finalPositions, start*3, scratchCartesian4).subtract(pos);
                left = after.add(before, scratchCartesian2).negate(scratchCartesian2).normalize(scratchCartesian2);
                attr = addNormals(attr, normal, left, front, undefined, vertexFormat);
                front+=3;
            }
        }

        UR = front/3;
        UL = UR - 1;
        LR = (back-2)/3;
        LL = LR + 1;
        indices.push(UL, LL, UR, UR, LL, LR);

        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), front); //add last positions
        positionIndex += 3;
        finalPositions = addAttribute(finalPositions, Cartesian3.fromArray(positions, positionIndex, scratch), undefined, back);
        positionIndex += 3;


        normal = Cartesian3.fromArray(computedNormals, compIndex, scratchCartesian1);
        left = Cartesian3.fromArray(computedLefts, compIndex, scratchCartesian2);
        attr = addNormals(attr, normal, left, front, back, vertexFormat);

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
        var roundCornerGranularity = defaultValue(params.roundCornerGranularity, 16);

        var pos = [];

        var normal = scratchCartesian1;
        var forward = scratchCartesian2;
        var backward = scratchCartesian3;
        var left = scratchCartesian4;
        var rightPos = scratchCartesian5;
        var leftPos = scratchCartesian6;
        var cornerDirection = scratchCartesian7;
        var cornerPoint = scratchCartesian8;
        var startPoint = scratchCartesian9;
        var endPoint = scratchCartesian10;

        var calculatedNormals = [];
        var calculatedLefts = [];

        var position = positions[0]; //add first point
        var nextPosition = positions[1];
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);

        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos);
        pos.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        pos.push(rightPos.x, rightPos.y, rightPos.z);
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
                var f = cornerDirection.cross(normal, scratchCartesian11);
                cornerDirection = normal.cross(f, cornerDirection);
            }
            var scalar = width / (Cartesian3.cross(cornerDirection, backward, scratch).magnitude());
            var leftIsOutside = angleIsGreaterThanPi(forward, backward);
            cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
            if (leftIsOutside) {
                rightPos = position.add(cornerDirection, rightPos);
                leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                pos.push(leftPos.x, leftPos.y, leftPos.z);
                pos.push(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);
                cornerPoint = rightPos.clone(cornerPoint);
                startPoint = leftPos.clone(startPoint);

                left = normal.cross(forward, left).normalize(left);
                leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                endPoint = leftPos.clone(endPoint);

                cornerDirection = cornerDirection.negate(cornerDirection);
            } else {
                leftPos = position.add(cornerDirection, leftPos);
                pos.push(leftPos.x, leftPos.y, leftPos.z);
                rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                pos.push(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);
                cornerPoint = leftPos.clone(cornerPoint);
                startPoint = rightPos.clone(startPoint);

                left = normal.cross(forward, left).normalize(left);
                rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                endPoint = rightPos.clone(endPoint);
            }

            if (roundCorners) {
                corners.push(computeRoundCorner(cornerPoint, startPoint, endPoint, roundCornerGranularity, leftIsOutside));
            } else {
                corners.push(computeMiteredCorner(position, cornerDirection, endPoint, leftIsOutside));
            }

            position = nextPosition;
            backward = forward.negate(backward);
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = position.add(left.multiplyByScalar(width, leftPos), leftPos); // add last position
        pos.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        pos.push(rightPos.x, rightPos.y, rightPos.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        var r = combine(pos, corners, calculatedLefts, calculatedNormals, params.vertexFormat);
        if (params.vertexFormat.position) {
            r.attributes.position.values = PolylinePipeline.scaleFromSurfaceToGeodeticHeight(r.attributes.position.values, params.height, ellipsoid);
        }

        return r;
    }

    function computePositionsExtruded(params) {
        var geom = computePositions(params);
        return geom;
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
     * @pararm {Booleen} [options.roundCorners = false] Round corners instead of mitering them.
     * @param {Number} [options.roundCornerGranularity = 16] Number of positions to add for rounded corner.  Set to 0 for beveled corners.
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

        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        var params = {
                ellipsoid: defaultValue(options.ellipsoid, Ellipsoid.WGS84),
                vertexFormat: vertexFormat,
                height: height,
                positions: cleanPositions,
                width: width,
                roundCorners: defaultValue(options.roundCorners, false),
                roundCornerGranularity: options.roundCornerGranularity
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