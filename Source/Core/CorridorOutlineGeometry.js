/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './CorridorGeometryLibrary',
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
        CorridorGeometryLibrary,
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

    function combine(positions, corners, endPositions, ellipsoid) {
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
        var front = 0;
        var back = size - 1;
        var indices = [];
        var UL, LL, UR, LR;
        var rightPos, leftPos;
        var halfLength = endPositionLength/2;
        indices.push(front/3, (back-2)/3);
        if (addEndPositions) { // add rounded end
            leftPos = cartesian3;
            rightPos = cartesian4;
            var firstEndPositions = endPositions[0].rightPositions;
            for (i = 0; i < halfLength; i++) {
                leftPos = Cartesian3.fromArray(firstEndPositions, (halfLength - 1 - i) * 3, leftPos);
                rightPos = Cartesian3.fromArray(firstEndPositions, (halfLength + i) * 3, rightPos);
                finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);
                finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, leftPos, undefined, back);

                LL = front/3;
                LR = LL + 1;
                UL = (back-2)/3;
                UR = UL - 1;
                indices.push(UL, UR, LL, LR);
                front += 3;
                back -= 3;
            }
        }

        var posIndex = 0;
        var rightEdge = positions[posIndex++];  //add first two edges
        var leftEdge = positions[posIndex++];
        finalPositions.set(rightEdge, front);
        finalPositions.set(leftEdge, back - leftEdge.length + 1);

        var length = leftEdge.length - 3;
        for(i = 0; i < length; i+=3) {
            LL = front/3;
            LR = LL + 1;
            UL = (back-2)/3;
            UR = UL - 1;
            indices.push(UL, UR, LL, LR);
            front += 3;
            back -= 3;
        }

        for (i = 0; i < corners.length; i++) {
            var j;
            corner = corners[i];
            var l = corner.leftPositions;
            var r = corner.rightPositions;
            var start;
            var outsidePoint = cartesian6;
            if (defined(l)) {
                back -= 3;
                start = UR;
                for (j = 0; j < l.length/3; j++) {
                    outsidePoint = Cartesian3.fromArray(l, j*3, outsidePoint);
                    indices.push(start - j - 1, start - j);
                    finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, outsidePoint, undefined, back);
                    back -= 3;
                }
                front += 3;
            } else {
                front += 3;
                start = LR;
                for (j = 0; j < r.length/3; j++) {
                    outsidePoint = Cartesian3.fromArray(r, j*3, outsidePoint);
                    indices.push(start + j, start + j + 1);
                    finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, outsidePoint, front);
                    front += 3;
                }
                back -= 3;
            }
            rightEdge = positions[posIndex++];
            leftEdge = positions[posIndex++];
            rightEdge.splice(0, 3); //remove duplicate points added by corner
            leftEdge.splice(leftEdge.length - 3, 3);
            finalPositions.set(rightEdge, front);
            finalPositions.set(leftEdge, back - leftEdge.length + 1);
            length = leftEdge.length - 3;

            for(j = 0; j < leftEdge.length; j+=3) {
                LR = front/3;
                LL = LR - 1;
                UR = (back-2)/3;
                UL = UR + 1;
                indices.push(UL, UR, LL, LR);
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
                finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, leftPos, undefined, back);
                finalPositions = CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);

                LR = front/3;
                LL = LR - 1;
                UR = (back-2)/3;
                UL = UR + 1;
                indices.push(UL, UR, LL, LR);
                front += 3;
                back -= 3;
            }
        }
        indices.push(front/3, (back-2)/3);

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : finalPositions
        });

        return {
            attributes: attributes,
            indices: indices,
            boundingSphere: BoundingSphere.fromVertices(finalPositions),
            rightCount: rightCount
        };
    }

    function computePositions(params) {
        var granularity = params.granularity;
        var positions = params.positions;
        var width = params.width/2;
        var ellipsoid = params.ellipsoid;
        var cornerType = params.cornerType;
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
        var position = positions[0]; //add first point
        var nextPosition = positions[1];

        forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        left = normal.cross(forward, left).normalize(left);
        previousLeftPos = Cartesian3.add(position, left.multiplyByScalar(width, previousLeftPos), previousLeftPos);
        previousRightPos = Cartesian3.add(position, left.multiplyByScalar(width, previousRightPos).negate(previousRightPos), previousRightPos);
        position = nextPosition;
        backward = forward.negate(backward);

        var corners = [];
        var i;
        var length = positions.length;
        for (i = 1; i < length-1; i++) { // add middle points and corners
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            nextPosition = positions[i+1];
            forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
            cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
            var doCorner = !Cartesian3.equalsEpsilon(cornerDirection.negate(scratch1), normal, CesiumMath.EPSILON2);
            if (doCorner) {
                cornerDirection = cornerDirection.cross(normal, cornerDirection);
                cornerDirection = normal.cross(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, (Cartesian3.cross(cornerDirection, backward, scratch1).magnitude()));
                var leftIsOutside = CorridorGeometryLibrary.angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
                if (leftIsOutside) {
                    rightPos = Cartesian3.add(position, cornerDirection, rightPos);
                    leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));
                    startPoint = leftPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    leftPos = rightPos.add(left.multiplyByScalar(width*2, leftPos), leftPos);
                    if (cornerType.value === CornerType.ROUNDED.value  || cornerType.value === CornerType.BEVELED.value) {
                        corners.push(CorridorGeometryLibrary.computeRoundCorner(rightPos, startPoint, leftPos, cornerType, leftIsOutside, ellipsoid));
                    } else {
                        corners.push(CorridorGeometryLibrary.computeMiteredCorner(position, startPoint, cornerDirection.negate(cornerDirection), leftPos, leftIsOutside, granularity, ellipsoid));
                    }
                    previousRightPos = rightPos.clone(previousRightPos);
                    previousLeftPos = leftPos.clone(previousLeftPos);
                } else {
                    leftPos = Cartesian3.add(position, cornerDirection, leftPos);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
                    calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));
                    startPoint = rightPos.clone(startPoint);
                    left = normal.cross(forward, left).normalize(left);
                    rightPos = leftPos.add(left.multiplyByScalar(width*2, rightPos).negate(rightPos), rightPos);
                    if (cornerType.value === CornerType.ROUNDED.value  || cornerType.value === CornerType.BEVELED.value) {
                        corners.push(CorridorGeometryLibrary.computeRoundCorner(leftPos, startPoint, rightPos, cornerType, leftIsOutside, ellipsoid));
                    } else {
                        corners.push(CorridorGeometryLibrary.computeMiteredCorner(position, startPoint, cornerDirection, rightPos, leftIsOutside, granularity, ellipsoid));
                    }
                    previousRightPos = rightPos.clone(previousRightPos);
                    previousLeftPos = leftPos.clone(previousLeftPos);
                }
                backward = forward.negate(backward);
            }
            position = nextPosition;
        }

        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
        leftPos = Cartesian3.add(position, left.multiplyByScalar(width, leftPos), leftPos); // add last position
        rightPos = Cartesian3.add(position, left.multiplyByScalar(width, rightPos).negate(rightPos), rightPos);
        calculatedPositions.push(PolylinePipeline.scaleToSurface([previousRightPos, rightPos], granularity));
        calculatedPositions.push(PolylinePipeline.scaleToSurface([leftPos, previousLeftPos], granularity));

        var endPositions;
        if (cornerType.value === CornerType.ROUNDED.value) {
            endPositions = CorridorGeometryLibrary.addEndCaps(calculatedPositions, width, ellipsoid);
        }

        return combine(calculatedPositions, corners, endPositions, ellipsoid);
    }

    function computePositionsExtruded(params) {
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

        positions = PolylinePipeline.scaleToGeodeticHeight(positions, height, ellipsoid);
        extrudedPositions = PolylinePipeline.scaleToGeodeticHeight(extrudedPositions, extrudedHeight, ellipsoid);
        positions = positions.concat(extrudedPositions);
        boundingSphere = BoundingSphere.fromVertices(positions, undefined, 3, boundingSphere);
        attributes.position.values = new Float64Array(positions);

        var i;
        var iLength = indices.length;
        for (i = 0; i < iLength; i+=2) { // bottom indices
            var v0 = indices[i];
            var v1 = indices[i + 1];
            indices.push(v0 + length, v1 + length);
        }

        var UL, LL;
        for (i = 0; i < length; i++) { //wall indices
            UL = i;
            LL = UL + length;
            indices.push(UL, LL);
        }

        return {
            attributes: attributes,
            indices: indices,
            boundingSphere: boundingSphere
        };
    }

    /**
     * A description of a corridor.
     *
     * @alias CorridorOutlineGeometry
     * @constructor
     *
     * @param {Array} options.positions An array of {Cartesain3} positions that define the center of the corridor.
     * @param {Number} options.width The distance between the edges of the corridor.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance between the ellipsoid surface and the extrusion.
     * @param {Boolean} [options.cornerType = CornerType.ROUNDED] Determines the style of the corners.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     *
     * @see CorridorOutlineGeometry#createGeometry
     *
     * @example
     * var corridor = new CorridorOutlineGeometry({
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *   width : 100000
     * });
     */
    var CorridorOutlineGeometry = function(options) {
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
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createCorridorOutlineGeometry';
    };

    /**
     * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
     * @memberof CorridorOutlineGeometry
     *
     * @param {CorridorOutlineGeometry} corridorOutlineGeometry A description of the corridor.
     *
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Count of unique positions must be greater than 1.
     */
    CorridorOutlineGeometry.createGeometry = function(corridorOutlineGeometry) {
        var positions = corridorOutlineGeometry._positions;
        var height = corridorOutlineGeometry._height;
        var extrudedHeight = corridorOutlineGeometry._extrudedHeight;
        var extrude = (height !== extrudedHeight);
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('Count of unique positions must be greater than 1.');
        }
        var ellipsoid = corridorOutlineGeometry._ellipsoid;
        var params = {
                ellipsoid: ellipsoid,
                positions: cleanPositions,
                width: corridorOutlineGeometry._width,
                cornerType: corridorOutlineGeometry._cornerType,
                granularity: corridorOutlineGeometry._granularity
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
            attr.attributes.position.values = new Float64Array(PolylinePipeline.scaleToGeodeticHeight(attr.attributes.position.values, height, ellipsoid));
        }
        var attributes = attr.attributes;

        return new Geometry({
            attributes : attributes,
            indices : IndexDatatype.createTypedArray(attributes.position.values.length/3, attr.indices),
            primitiveType : PrimitiveType.LINES,
            boundingSphere : attr.boundingSphere
        });
    };

    return CorridorOutlineGeometry;
});