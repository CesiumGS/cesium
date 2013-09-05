/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './CornerType',
        './ComponentDatatype',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './Matrix4',
        './PolygonPipeline',
        './PolylinePipeline',
        './PolylineVolumeGeometryLibrary',
        './PrimitiveType',
        './Quaternion',
        './Transforms',
        './defaultValue',
        './BoundingSphere',
        './BoundingRectangle',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defined,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CornerType,
        ComponentDatatype,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        Matrix4,
        PolygonPipeline,
        PolylinePipeline,
        PolylineVolumeGeometryLibrary,
        PrimitiveType,
        Quaternion,
        Transforms,
        defaultValue,
        BoundingSphere,
        BoundingRectangle,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat,
        WindingOrder) {
    "use strict";

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

    var negativeX = Cartesian4.UNIT_X.negate();
    var transform = new Matrix4();
    var translation = new Matrix4();
    var rotationMatrix = new Matrix3();
    var scaleMatrix = Matrix3.IDENTITY.clone();
    var westScratch = new Cartesian3();
    var finalPosScratch = new Cartesian3();
    var heightCartesian = new Cartesian3();
    function addPosition(center, left, shape, finalPositions, ellipsoid, height, xScalar) {
        var west = westScratch;
        var finalPosition = finalPosScratch;

        transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, transform);
        west = Matrix4.multiplyByVector(transform, negativeX, west);
        west = Cartesian3.fromCartesian4(west, west);
        west = Cartesian3.normalize(west, west);
        var angle = PolylineVolumeGeometryLibrary.computeRotationAngle(west, left, center, ellipsoid);
        var rotation = Matrix3.fromRotationZ(angle, rotationMatrix);
        heightCartesian.z = height;
        transform = Matrix4.multiply(transform, Matrix4.fromRotationTranslation(rotation, heightCartesian, translation), transform);
        var scale = scaleMatrix;
        scale[0] = xScalar;

        for ( var i = 0; i < shape.length; i += 3) {
            finalPosition = Cartesian3.fromArray(shape, i, finalPosition);
            finalPosition = Matrix3.multiplyByVector(scale, finalPosition, finalPosition);
            finalPosition = Matrix4.multiplyByPoint(transform, finalPosition, finalPosition);
            finalPositions.push(finalPosition.x, finalPosition.y, finalPosition.z);
        }

        return finalPositions;
    }

    var centerScratch = new Cartesian3();
    function addPositions(centers, left, shape, finalPositions, ellipsoid, height, xScalar) {
        for ( var i = 0; i < centers.length; i += 3) {
            var center = Cartesian3.fromArray(centers, i, centerScratch);
            finalPositions = addPosition(center, left, shape, finalPositions, ellipsoid, height, xScalar);
        }
        return finalPositions;
    }

    function convertShapeTo3DSides(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0), duplicate points
        var length = shape2D.length;
        var shape = new Array(length * 6);
        var index = 0;
        var xOffset = boundingRectangle.x + boundingRectangle.width / 2;
        var yOffset = boundingRectangle.y + boundingRectangle.height / 2;

        var point = shape2D[0];
        shape[index++] = point.x - xOffset;
        shape[index++] = 0;
        shape[index++] = point.y - yOffset;
        for ( var i = 1; i < length; i++) {
            point = shape2D[i];
            var x = point.x - xOffset;
            var z = point.y - yOffset;
            shape[index++] = x;
            shape[index++] = 0;
            shape[index++] = z;

            shape[index++] = x;
            shape[index++] = 0;
            shape[index++] = z;
        }
        point = shape2D[0];
        shape[index++] = point.x - xOffset;
        shape[index++] = 0;
        shape[index++] = point.y - yOffset;

        return shape;
    }

    function convertShapeTo3DFirstLast(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0)
        var length = shape2D.length;
        var shape = new Array(length * 3);
        var index = 0;
        var xOffset = boundingRectangle.x + boundingRectangle.width / 2;
        var yOffset = boundingRectangle.y + boundingRectangle.height / 2;

        for ( var i = 0; i < length; i++) {
            shape[index++] = shape2D[i].x - xOffset;
            shape[index++] = 0;
            shape[index++] = shape2D[i].y - yOffset;
        }

        return shape;
    }

    var quaterion = new Quaternion();
    var startPointScratch = new Cartesian3();
    var rotMatrix = new Matrix3();
    function computeRoundCorner(pivot, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid, finalPositions, shape, height) {
        var angle = Cartesian3.angleBetween(Cartesian3.subtract(startPoint, pivot, scratch1), Cartesian3.subtract(endPoint, pivot, scratch2));
        var granularity = (cornerType.value === CornerType.BEVELED.value) ? 0 : Math.ceil(angle / CesiumMath.toRadians(5));

        var m;
        if (leftIsOutside) {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(pivot, angle / (granularity + 1), quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(Cartesian3.negate(pivot, scratch1), angle / (granularity + 1), quaterion), rotMatrix);
        }

        startPoint = Cartesian3.clone(startPoint, startPointScratch);
        for ( var i = 0; i < granularity; i++) {
            startPoint = Matrix3.multiplyByVector(m, startPoint, startPoint);
            var left = Cartesian3.subtract(startPoint, pivot, scratch1);
            left = Cartesian3.normalize(left, left);
            if (!leftIsOutside) {
                left = Cartesian3.negate(left, left);
            }

            var surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
            finalPositions = addPosition(surfacePoint, left, shape, finalPositions, ellipsoid, height, 1);
        }

        return finalPositions;
    }

    function computeAttributes(positions, ends, shape, boundingRectangle, vertexFormat, ellipsoid) {
        var attributes = new GeometryAttributes();
        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(positions.concat(ends))
            });
        }

        var shapeLength = shape.length;
        var indices = [];
        var length = positions.length / (shapeLength * 6);
        var i, j;
        var LL, UL, UR, LR;
        var offset = shapeLength * 2;
        for (i = 0; i < length - 1; i++) {
            for (j = 0; j < shapeLength - 1; j++) {
                LL = j * 2 + i * shapeLength * 2;
                UL = LL + 1;
                UR = UL + offset;
                LR = LL + offset;

                indices.push(UL, LL, UR, UR, LL, LR);
            }
            LL = shapeLength * 2 - 2 + i * shapeLength * 2;
            UL = LL + 1;
            UR = UL + offset;
            LR = LL + offset;

            indices.push(UL, LL, UR, UR, LL, LR);
        }

        if (vertexFormat.st) {
            var st = [];
            var lengthSt = 1 / (length - 1);
            var heightSt = 1 / (boundingRectangle.height);

            var heightOffset = boundingRectangle.height / 2;

            var s, t;
            for (i = 0; i < length; i++) {
                t = i * lengthSt;
                s = heightSt * (shape[0].y + heightOffset);
                st.push(s, t);
                for (j = 1; j < shapeLength; j++) {
                    s = heightSt * (shape[j].y + heightOffset);
                    st.push(s, t);
                    st.push(s, t);
                }
                s = heightSt * (shape[0].y + heightOffset);
                st.push(s, t);
            }
            for (j = 0; j < shapeLength; j++) {
                t = 0;
                s = heightSt * (shape[j].y + heightOffset);
                st.push(s, t);
            }
            for (j = 0; j < shapeLength; j++) {
                t = (length - 1) * lengthSt;
                s = heightSt * (shape[j].y + heightOffset);
                st.push(s, t);
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : new Float32Array(st)
            });
        }

        var endOffset = positions.length / 3;
        var firstEndIndices = PolygonPipeline.triangulate(shape);
        for (i = 0; i < firstEndIndices.length; i += 3) {
            var v0 = firstEndIndices[i];
            var v1 = firstEndIndices[i + 1];
            var v2 = firstEndIndices[i + 2];

            indices.push(v0 + endOffset, v1 + endOffset, v2 + endOffset, v2 + endOffset + shapeLength, v1 + endOffset + shapeLength, v0 + endOffset + shapeLength);
        }

        var geometry = new Geometry({
            attributes : attributes,
            indices : IndexDatatype.createTypedArray(positions.length / 3, indices),
            boundingSphere : BoundingSphere.fromVertices(positions),
            primitiveType : PrimitiveType.TRIANGLES
        });

        if (vertexFormat.normal) {
            geometry = GeometryPipeline.computeNormal(geometry);
        }

        if (vertexFormat.tangent || vertexFormat.binormal) {
            geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
        }

        return geometry;
    }

    var brScratch = new BoundingRectangle();
    function computePositions(positions, geometry) {
        var granularity = geometry._granularity;
        var cornerType = geometry._cornerType;
        var ellipsoid = geometry._ellipsoid;
        var shape2D = geometry._shape;
        if (PolygonPipeline.computeWindingOrder2D(shape2D).value === WindingOrder.CLOCKWISE.value) {
            shape2D.reverse();
        }

        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);
        var shapeForSides = convertShapeTo3DSides(shape2D, boundingRectangle);
        var shapeForEnds = convertShapeTo3DFirstLast(shape2D, boundingRectangle);
        var height = geometry._height + boundingRectangle.height / 2;
        var width = boundingRectangle.width / 2;
        var length = positions.length;
        var finalPositions = [];
        var ends = [];

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
        ends = addPosition(position, left, shapeForEnds, ends, ellipsoid, height, 1);
        previousPosition = Cartesian3.clone(position, previousPosition);
        position = nextPosition;
        backward = Cartesian3.negate(forward, backward);

        var surfacePositions;
        for ( var i = 1; i < length - 1; i++) {
            nextPosition = positions[i + 1];
            forward = Cartesian3.subtract(nextPosition, position, forward);
            forward = Cartesian3.normalize(forward, forward);
            cornerDirection = Cartesian3.add(forward, backward, cornerDirection);
            cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
            surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
            var doCorner = !Cartesian3.equalsEpsilon(Cartesian3.negate(cornerDirection, scratch1), surfaceNormal, CesiumMath.EPSILON2);
            if (doCorner) {
                cornerDirection = Cartesian3.cross(cornerDirection, surfaceNormal, cornerDirection);
                cornerDirection = Cartesian3.cross(surfaceNormal, cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, (Cartesian3.magnitude(Cartesian3.cross(cornerDirection, backward, scratch1))));
                var leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = Cartesian3.multiplyByScalar(cornerDirection, scalar, cornerDirection);
                var ratio = scalar / width;
                if (leftIsOutside) {
                    pivot = Cartesian3.add(position, cornerDirection, pivot);
                    start = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, width, start), start);
                    scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
                    scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
                    surfacePositions = PolylinePipeline.scaleToSurface(scratch2Array);
                    finalPositions = addPositions(surfacePositions, left, shapeForSides, finalPositions, ellipsoid, height, 1);
                    left = Cartesian3.cross(surfaceNormal, forward, left);
                    left = Cartesian3.normalize(left, left);
                    end = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, width, end), end);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, height);
                    } else {
                        cornerDirection = Cartesian3.negate(cornerDirection, cornerDirection);
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, height, ratio);
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, height, ratio);
                    }
                    previousPosition = Cartesian3.clone(end, previousPosition);
                } else {
                    pivot = Cartesian3.add(position, cornerDirection, pivot);
                    start = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, -width, start), start);
                    scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
                    scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
                    surfacePositions = PolylinePipeline.scaleToSurface(scratch2Array, granularity, ellipsoid);
                    finalPositions = addPositions(surfacePositions, left, shapeForSides, finalPositions, ellipsoid, height, 1);
                    left = Cartesian3.cross(surfaceNormal, forward, left);
                    left = Cartesian3.normalize(left, left);
                    end = Cartesian3.add(pivot, Cartesian3.multiplyByScalar(left, -width, end), end);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, height);
                    } else {
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, height, ratio);
                        finalPositions = addPosition(position, cornerDirection, shapeForSides, finalPositions, ellipsoid, height, ratio);
                    }
                    previousPosition = Cartesian3.clone(end, previousPosition);
                }
                backward = Cartesian3.negate(forward, backward);
            }
            position = nextPosition;
        }
        scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3.clone(position, scratch2Array[1]);
        surfacePositions = PolylinePipeline.scaleToSurface(scratch2Array, granularity, ellipsoid);
        finalPositions = addPositions(surfacePositions, left, shapeForSides, finalPositions, ellipsoid, height, 1);
        ends = addPosition(position, left, shapeForEnds, ends, ellipsoid, height, 1);

        return computeAttributes(finalPositions, ends, shape2D, boundingRectangle, geometry._vertexFormat, ellipsoid);
    }

    /**
     * A description of a polyline with a volume (a 2D shape extruded along a polyline).
     *
     * @alias PolylineVolumeGeometry
     * @constructor
     *
     * @param {Array} options.polylinePositions An array of {Cartesain3} positions that define the center of the polyline volume.
     * @param {Number} options.shapePositions An array of {Cartesian2} positions that define the shape to be extruded along the polyline
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Boolean} [options.cornerType = CornerType.ROUNDED] Determines the style of the corners.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     *
     * @see PolylineVolumeGeometry#createGeometry
     *
     * @example
     * function computeCirclePositions(radius) {
     *     var positions = [];
     *     var theta = CesiumMath.toRadians(1);
     *     var posCount = Math.PI*2/theta;
     *     for (var i = 0; i < posCount; i++) {
     *         positions.push(new Cartesian2(radius * Math.cos(theta * i), radius * Math.sin(theta * i)));
     *     }
     *     return positions;
     * }
     *
     * var tube = new PolylineVolumeGeometry({
     *     vertexFormat : VertexFormat.POSITION_ONLY,
     *     polylinePositions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *     shapePositions : circlePositions(10000)
     * });
     */
    var PolylineVolumeGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.polylinePositions;
        if (!defined(positions)) {
            throw new DeveloperError('options.polylinePositions is required.');
        }
        var shape = options.shapePositions;
        if (!defined(shape)) {
            throw new DeveloperError('options.shapePositions is required.');
        }

        this._positions = positions;
        this._shape = shape;
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._height = defaultValue(options.height, 0);
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createPolylineVolumeGeometry';
    };

    /**
     * Computes the geometric representation of a polyline with a volume, including its vertices, indices, and a bounding sphere.
     * @memberof PolylineVolumeGeometry
     *
     * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polyline volume.
     *
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Count of unique positions must be greater than 1.
     */
    PolylineVolumeGeometry.createGeometry = function(polylineVolumeGeometry) {
        var positions = polylineVolumeGeometry._positions;
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('Count of unique positions must be greater than 1.');
        }

        return computePositions(cleanPositions, polylineVolumeGeometry);
    };

    return PolylineVolumeGeometry;
});