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
        GeometryInstance,
        Geometry,
        GeometryPipeline,
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
    var scratchCartesian8 = new Cartesian3();
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

    function computeAttributes(calculatedNormals, calculatedLefts, attr, attributes, extrude, threeVertex, vertexFormat, vertexCount) {
        var i;
        var st = [];
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

    function computeRoundCorner(params, position, corner) {
        return {
            leftPositions: [],
            rightPositions: []
        };
    }

    function computeMiteredCorner(position, leftCorner, leftPositions, rightPositions, leftIsOutside) {
        var leftArray = leftPositions.slice(0, 3);
        var rightArray = rightPositions.slice(0, 3);
        if (leftIsOutside) {
            var leftPos = position.add(leftCorner, scratch);
            leftArray.push(leftPos.x, leftPos.y, leftPos.z);
            leftArray.push(leftPositions.slice(3, 6));
        } else {
            var rightPos = position.add(leftCorner.negate(leftCorner), scratch);
            rightArray.push(rightPos.x, rightPos.y, rightPos.z);
            rightArray.push(rightPositions.slice(3, 6));
        }
        return {
            leftPositions: leftArray,
            rightPositions: rightArray
        };
    }

    function computePositions(params) {
        var positions = params.positions;
        var width = params.width;
        var ellipsoid = params.ellipsoid;
        var roundCorners = params.roundCorners;

        var leftPositions = [];
        var rightPositions = [];

        var normal = scratchCartesian1;
        var forward = scratchCartesian2;
        var backward = scratchCartesian3;
        var left = scratchCartesian4;
        var scratch = scratchCartesian7;
        var corner = scratchCartesian8;

        var calculatedNormals = [];
        var calculatedLefts = [];

        var position = positions[0]; //add first point
        var nextPosition = positions[1];
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);

        var leftPos;
        var rightPos;

        leftPos = position.add(left.multiplyByScalar(width, scratch), scratch);
        leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        position = nextPosition;
        backward = forward.negate(backward);
        var corners = [];
        var i;
        var leftCorners = new Array(6);
        var rightCorners = new Array(6);
        for (i = 1; i < length-1; i++) {
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);

            nextPosition = positions[i+1];
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            if ( angle !== Math.PI && angle !== 0) {
                corner = forward.add(backward, corner).normalize(corner);
            }
            var scalar = width / (Cartesian3.cross(corner, backward, scratch).magnitude());
            var leftIsOutside = angleIsGreaterThanPi(forward, backward);
            corner = corner.multiplyByScalar(scalar, corner, corner);
            if (leftIsOutside) {
                rightPos = position.add(corner, scratch);
                rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
                rightCorners[0] = rightPos.x;
                rightCorners[1] = rightPos.y;
                rightCorners[2] = rightPos.z;
                leftPos = rightPos.add(left.multiplyByScalar(width*2, scratch), scratch);
                leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
                leftCorners[0] = leftPos.x;
                leftCorners[1] = leftPos.y;
                leftCorners[2] = leftPos.z;
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);

                rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
                left = normal.cross(forward, left).normalize(left);
                leftPos = rightPos.add(left.multiplyByScalar(width*2, scratch), scratch);
                leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
                leftCorners[3] = leftPos.x;
                leftCorners[4] = leftPos.y;
                leftCorners[5] = leftPos.z;
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);

                corner = corner.negate(corner);
            } else {
                leftPos = position.add(corner, scratch);
                leftCorners[0] = leftPos.x;
                leftCorners[1] = leftPos.y;
                leftCorners[2] = leftPos.z;
                leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
                rightPos = leftPos.add(left.multiplyByScalar(width*2, scratch).negate(scratch), scratch);
                rightCorners[0] = rightPos.x;
                rightCorners[1] = rightPos.y;
                rightCorners[2] = rightPos.z;
                rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);

                leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
                left = normal.cross(forward, left).normalize(left);
                rightPos = leftPos.add(left.multiplyByScalar(width*2, scratch).negate(scratch), scratch);
                rightCorners[4] = rightPos.x;
                rightCorners[5] = rightPos.y;
                rightCorners[6] = rightPos.z;
                rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
                calculatedNormals.push(normal.x, normal.y, normal.z);
                calculatedLefts.push(left.x, left.y, left.z);
            }

            if (roundCorners) {
                corners.push(computeRoundCorner(params, corner));
            } else {
                corners.push(computeMiteredCorner(position, corner, leftCorners, rightCorners, leftIsOutside));
            }

            position = nextPosition;
            backward = forward.negate(backward);
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = position.add(left.multiplyByScalar(width, scratch), scratch); // add last position
        leftPositions.push(leftPos.x, leftPos.y, leftPos.z);
        rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        rightPositions.unshift(rightPos.x, rightPos.y, rightPos.z);
        calculatedNormals.push(normal.x, normal.y, normal.z);
        calculatedLefts.push(left.x, left.y, left.z);

        var pos = leftPositions.concat(rightPositions);
        var len = pos.length/6;
        var UL, UR, LL, LR;

        var indices = [];

        for (i = 0; i < len - 1; i+=2) {
            UL = i;
            UR = UL + 1;
            LL = len - 1 - i;
            LR = LL - 1;

            indices.push(UL, LL, UR, UR, LL, LR);
        }
        var blockGeometry = new GeometryInstance({
            geometry: new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array(pos)
                    })
                }),
                indices: indices,
                primitiveType: PrimitiveType.TRIANGLES
            })
        });

        var cornerIndices = [];

        leftPositions = [];
        rightPositions = [];
        var l, r;
        for(i = 0; i < corners.length; i++) {
            l = corners[i].leftPositions;
            r = corners[i].rightPositions;
            leftPositions = leftPositions.concat(l);
            rightPositions = r.concat(rightPositions);
        }
        var cornerPositions = leftPositions.concat(rightPositions);

        var back = cornerPositions.length/3-1;
        var front = 0;
        var j;
        for(i = 0; i < corners.length; i++) {
            l = corners[i].leftPositions;
            r = corners[i].rightPositions;
            var p;
            if (r.length === 1) {
                p = back--;
                for (j = 0; j < l.length-1; j++) {
                    cornerIndices.push(p, front + 1, front);
                    front++;
                }
                front++;
            } else {
                p = front++;
                for (j = 0; j < r.length-1; j++) {
                    cornerIndices.push(p, back, back - 1);
                    back--;
                }
                back--;
            }
        }

        var cornerGeometry = new GeometryInstance({
            geometry: new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array(cornerPositions)
                    })
                }),
                indices: cornerIndices,
                primitiveType: PrimitiveType.TRIANGLES
            })
        });

        return GeometryPipeline.combine(blockGeometry, cornerGeometry);
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

        var cleanPositions = PolylinePipeline.removeDuplicates(cleanPositions);
        var params = {
                ellipsoid: defaultValue(options.ellipsoid, Ellipsoid.WGS84),
                vertexFormat: vertexFormat,
                height: height,
                positions: cleanPositions,
                width: width,
                roundCorners: defaultValue(options.roundCorners, false)
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

        attr = computeAttributes(attr, extrude);
        attr.boundingSphere = BoundingSphere.fromPoints(positions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = attr.attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = attr.indices;

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
        this.boundingSphere = attr.boundingSphere;
    };

    return AirspaceGeometry;
});