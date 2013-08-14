/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './Ellipsoid',
        './IndexDatatype',
        './Math',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
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
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
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

    function computeAttributes(calculatedNormals, calculatedLefts, attributes, extrude, threeVertex) {
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

        for (var i = 1; i < length-1; i++) {
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

        normal = Cartesian3.fromArray(calculatedNormals, (length-1)*3, scratchCartesian1);
        left = Cartesian3.fromArray(calculatedLefts, (length-1)*3, scratchCartesian2);
        forward = left.cross(normal, scratchCartesian3).normalize(scratchCartesian3);
        if (computeNormals) {
            normals = addAttribute(normals, normal, front, back);
        }
        if (computeTangents) {
            tangents = addAttribute(tangents, left, front, back);
        }

        if (computeBinormals) {
            binormals = addAttribute(binormals, forward, front, back);
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

    function removeDuplicates(positions, normals) {
        var length = positions.length;
        if (length < 2) {
            return {
                positions: positions.slice(0),
                normals: normals.slice(0)
            };
        }

        var cleanedPositions = [];
        var cleanedNormals = [];
        cleanedPositions.push(positions[0]);
        cleanedNormals.push(normals[0]);

        for (var i = 1; i < length; ++i) {
            var v0 = positions[i - 1];
            var v1 = positions[i];

            if (!v0.equals(v1)) {
                cleanedPositions.push(v1); // Shallow copy!
                cleanedNormals.push(normals[i-1]);
            }
        }

        return {
            positions: cleanedPositions,
            normals: cleanedNormals
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
     * @param {Array} [options.normals] An array of {Cartesian3} normals to the airspace, one normal for each position.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance between the ellipsoid surface and the extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @pararm {Booleen} [options.roundCorners = false] Round corners instead of mitering them.
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

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        var height = defaultValue(options.height, 0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);
        var extrude = (height !== extrudedHeight);
        if (extrude) {
            var h = Math.max(height, extrudedHeight);
            extrudedHeight = Math.min(height, extrudedHeight);
            height = h;
        }
        var positionNormals = options.normals;
        var position;
        var normal;
        var i;
        var cleanPositions;
        var length;
        if (defined(positionNormals)) {
            if (positionNormals.length !== positions.length) {
                throw new DeveloperError('options.normals.length must equal options.positions.length.');
            }
            var r = removeDuplicates(positions, positionNormals);
            cleanPositions = r.positions;
            positionNormals = r.normals;
            length = cleanPositions.length;
        } else {
            cleanPositions = PolylinePipeline.removeDuplicates(positions);
            length = cleanPositions.length;
            positionNormals = new Array(length);
            for (i = 0; i < length; i++) {
                position = cleanPositions[i];
                normal = ellipsoid.geodeticSurfaceNormal(position);
                positionNormals[i] = normal;
            }
        }

        var vertexCount = length*4 - 2;
        if (extrude) {
            vertexCount *= 4;
        }

        var threeVertex = vertexCount*3;
        cleanPositions = scalePositionsToHeight(cleanPositions, height, ellipsoid);

        var attributes = new GeometryAttributes();
        var st = ((vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined);
        var normals = ((vertexFormat.normal) ? new Float32Array(threeVertex) : undefined);
        var tangents = ((vertexFormat.tangent) ? new Float32Array(threeVertex) : undefined);
        var binormals = ((vertexFormat.binormal) ? new Float32Array(threeVertex) : undefined);

        var attr = {
                st: st,
                normals: normals,
                tangents: tangents,
                binormals: binormals
        };

        var posSize = (extrude) ? threeVertex/4 : threeVertex;
        var front = 0;
        var back = posSize - 1;

        var finalPositions = new Array(posSize);

        var extrudedPosition = scratchCartesian1;
        var forward = scratchCartesian2;
        var backward = scratchCartesian3;
        var left = scratchCartesian4;
        var midpoint = scratchCartesian5;
        var midNormal = scratchCartesian6;
        var scratch = scratchCartesian7;

        var calculatedNormals = [];
        var calculatedLefts = [];

        position = cleanPositions[0]; //add first point
        var nextPosition = cleanPositions[1];
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = positionNormals[0];
        left = normal.cross(forward, left).normalize(left);

        var leftPos;
        var rightPos;
        if (extrude) {
            extrudedPosition = scalePositionToHeight(position.clone(extrudedPosition), extrudedHeight, ellipsoid);
            leftPos = extrudedPosition.add(left.multiplyByScalar(width, scratch), scratch);
            finalPositions[front + posSize] = leftPos.x;
            finalPositions[front + posSize + 1] = leftPos.y;
            finalPositions[front + posSize + 2] = leftPos.z;
            rightPos = extrudedPosition.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
            finalPositions[back + posSize] = rightPos.z;
            finalPositions[back + posSize - 1] = rightPos.y;
            finalPositions[back + posSize - 2] = rightPos.x;
        }

        leftPos = position.add(left.multiplyByScalar(width, scratch), scratch);
        finalPositions[front++] = leftPos.x;
        finalPositions[front++] = leftPos.y;
        finalPositions[front++] = leftPos.z;
        rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        finalPositions[back--] = rightPos.z;
        finalPositions[back--] = rightPos.y;
        finalPositions[back--] = rightPos.x;
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        var previousPosition = position;
        position = nextPosition;
        backward = forward.negate(backward);
        var previousNormal = normal;
        for (i = 1; i < length; i++) {
            normal = positionNormals[i]; //add midpoint
            midpoint = position.add(previousPosition, midpoint).multiplyByScalar(0.5, midpoint);
            midNormal = normal.add(previousNormal, midNormal).normalize(midNormal);
            left = midNormal.cross(forward, left).normalize(left);

            if (extrude) {
                extrudedPosition = scalePositionToHeight(midpoint.clone(extrudedPosition), extrudedHeight, ellipsoid);
                leftPos = extrudedPosition.add(left.multiplyByScalar(width, scratch), scratch);
                finalPositions[front + posSize] = leftPos.x;
                finalPositions[front + posSize + 1] = leftPos.y;
                finalPositions[front + posSize + 2] = leftPos.z;
                rightPos = extrudedPosition.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
                finalPositions[back + posSize] = rightPos.z;
                finalPositions[back + posSize - 1] = rightPos.y;
                finalPositions[back + posSize - 2] = rightPos.x;
            }

            leftPos = midpoint.add(left.multiplyByScalar(width, scratch), scratch);
            finalPositions[front++] = leftPos.x;
            finalPositions[front++] = leftPos.y;
            finalPositions[front++] = leftPos.z;
            rightPos = midpoint.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
            finalPositions[back--] = rightPos.z;
            finalPositions[back--] = rightPos.y;
            finalPositions[back--] = rightPos.x;
            calculatedNormals.push(normal.x, normal.y, normal.z);
            calculatedLefts.push(left.x, left.y, left.z);

            if (i === length-1) {
                break;
            }

            nextPosition = cleanPositions[i+1];
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            if ( angle !== Math.PI && angle !== 0) {
                left = forward.add(backward, left).normalize(left);
            }
            if (angleIsGreaterThanPi(forward, backward) || angle === 0 ) {
                left = left.negate(left);
            }
            var scalar = width / (Cartesian3.cross(left.negate(scratch), backward, scratch).magnitude());

            if (extrude) {
                extrudedPosition = scalePositionToHeight(position.clone(extrudedPosition), extrudedHeight, ellipsoid);
                leftPos = extrudedPosition.add(left.multiplyByScalar(scalar, scratch), scratch);
                finalPositions[front + posSize] = leftPos.x;
                finalPositions[front + posSize + 1] = leftPos.y;
                finalPositions[front + posSize + 2] = leftPos.z;
                rightPos = extrudedPosition.add(left.multiplyByScalar(scalar, scratch).negate(scratch), scratch);
                finalPositions[back + posSize] = rightPos.z;
                finalPositions[back + posSize - 1] = rightPos.y;
                finalPositions[back + posSize - 2] = rightPos.x;
            }

            leftPos = position.add(left.multiplyByScalar(scalar, scratch), scratch);
            finalPositions[front++] = leftPos.x;
            finalPositions[front++] = leftPos.y;
            finalPositions[front++] = leftPos.z;
            rightPos = position.add(left.multiplyByScalar(scalar, scratch).negate(scratch), scratch);
            finalPositions[back--] = rightPos.z;
            finalPositions[back--] = rightPos.y;
            finalPositions[back--] = rightPos.x;
            calculatedNormals.push(normal.x, normal.y, normal.z);
            calculatedLefts.push(left.x, left.y, left.z);

            previousPosition = position.clone(previousPosition);
            position = nextPosition.clone(position);
            backward = forward.negate(backward);
            previousNormal = normal;
        }

        if (extrude) {
            extrudedPosition = scalePositionToHeight(position.clone(extrudedPosition), extrudedHeight, ellipsoid);
            leftPos = extrudedPosition.add(left.multiplyByScalar(width, scratch), scratch);
            finalPositions[front + posSize] = leftPos.x;
            finalPositions[front + posSize + 1] = leftPos.y;
            finalPositions[front + posSize + 2] = leftPos.z;
            rightPos = extrudedPosition.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
            finalPositions[back + posSize] = rightPos.z;
            finalPositions[back + posSize - 1] = rightPos.y;
            finalPositions[back + posSize - 2] = rightPos.x;
        }

        normal = positionNormals[positionNormals.length-1];
//        left = normal.cross(forward, left).normalize(left);
        leftPos = position.add(left.multiplyByScalar(width, scratch), scratch); // add last position
        finalPositions[front++] = leftPos.x;
        finalPositions[front++] = leftPos.y;
        finalPositions[front++] = leftPos.z;
        rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        finalPositions[back--] = rightPos.z;
        finalPositions[back--] = rightPos.y;
        finalPositions[back--] = rightPos.x;
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        if (extrude) {
            finalPositions = finalPositions.concat(finalPositions);
        }

        attr = computeAttributes(calculatedNormals, calculatedLefts, attr, extrude, threeVertex);

        if (vertexFormat.st) {
            var stIndex = 0;
            var repeat;
            var stvar;
            var half = vertexCount / 2;
            if (extrude) {
                half /= 4;
                repeat = 4;
            } else {
                repeat = 1;
            }
            stvar = 1 / (half-1);

            for (var j = 0; j < repeat; j++) {
                for (i = 0; i < half; i++) {
                    st[stIndex++] = i*stvar;
                    st[stIndex++] = 1;
                }
                for (i = half; i > 0; i--) {
                    st[stIndex++] = (i-1)*stvar;
                    st[stIndex++] = 0;
                }
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : st
            });
        }

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(finalPositions)
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
        var indicesCount = (extrude) ? threeVertex - 12 : threeVertex - 6;
        var indices = IndexDatatype.createTypedArray(vertexCount, indicesCount);
        var index = 0;

        posSize = (extrude) ? vertexCount/4 : vertexCount;
        var UL, UR, LL, LR;
        for(i = 0; i < posSize/2 - 1; i++) {
            UL = i;
            UR = UL + 1;
            LL = posSize - 1 - i;
            LR = LL - 1;

            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;

            if (extrude) {
                UL += posSize;
                UR += posSize;
                LL += posSize;
                LR += posSize;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = UL;
                indices[index++] = LR;
                indices[index++] = LL;
                indices[index++] = UR;
            }
        }

        if (extrude) {
            for (i = posSize*2; i < posSize*3 - 1; i++) {
                UL = i + 1;
                UR = UL - 1;
                LL = UL + posSize;
                LR = UR + posSize;

                indices[index++] = UL;
                indices[index++] = LL;
                indices[index++] = UR;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = LR;
            }

            UL = posSize*2;
            LL = UL + posSize;
            UR = posSize*3 - 1;
            LR = UR + posSize;
            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;
        }
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
        this.indices = indices;

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
        this.boundingSphere = BoundingSphere.fromPoints(positions);
    };

    return AirspaceGeometry;
});