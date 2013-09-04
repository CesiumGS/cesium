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
    var scratch3 = new Cartesian3();

    var scratch2Array = [new Cartesian3(), new Cartesian3()];

    var rotation = new Matrix3();
    var translation = new Matrix4();
    var transform = new Matrix4();
    var scale = new Matrix3();
    var scaleCartesian = new Cartesian3(1, 1, 1);
    var negX = Cartesian4.UNIT_X.negate();
    function addPositions(centers, left, shape, finalPositions, ellipsoid, height, scalar) {  //TODO: duplicate corner poitns
        scaleCartesian.x = scalar;
        scale = Matrix3.fromScale(scaleCartesian, scale);
        var position = scratch1;
        var west = scratch2;
        var finalPosition = scratch3;
        var i, j;
        var shapeLength = shape.length;
        for (j = 0; j < centers.length; j+=3) {
            position = Cartesian3.fromArray(centers, j, position);
            transform = Transforms.eastNorthUpToFixedFrame(position, ellipsoid, transform);
            west = Matrix4.multiplyByVector(transform, negX, west);
            west = Cartesian3.fromCartesian4(west).normalize(west);
            var angle = computeRotationAngle(west, left, position, ellipsoid);
            rotation = Matrix3.fromRotationZ(angle, rotation);
            transform = Matrix4.multiply(transform, Matrix4.fromRotationTranslation(rotation, new Cartesian3(0.0, 0.0, height), translation), transform);
            for(i = 0; i < shapeLength; i+=3) {
                finalPosition = Cartesian3.fromArray(shape, i, finalPosition);
                finalPosition = Matrix3.multiplyByVector(scale, finalPosition, finalPosition);
                finalPosition = Matrix4.multiplyByPoint(transform, finalPosition, finalPosition);
                finalPositions.push(finalPosition.x, finalPosition.y, finalPosition.z);
            }
        }
        return finalPositions;
    }

    function convertShapeTo3DSides(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0), duplicate points
        var length = shape2D.length;
        var shape = new Array(length * 3);
        var index = 0;

        shape[index++] = shape2D[0].x - (boundingRectangle.x + (boundingRectangle.width / 2));
        shape[index++] = 0;
        shape[index++] = shape2D[0].y - (boundingRectangle.y + (boundingRectangle.height / 2));
        for (var i = 1; i < length; i++) {
            shape[index++] = shape2D[i].x - (boundingRectangle.x + (boundingRectangle.width / 2));
            shape[index++] = 0;
            shape[index++] = shape2D[i].y - (boundingRectangle.y + (boundingRectangle.height / 2));

            shape[index++] = shape2D[i].x - (boundingRectangle.x + (boundingRectangle.width / 2));
            shape[index++] = 0;
            shape[index++] = shape2D[i].y - (boundingRectangle.y + (boundingRectangle.height / 2));
        }
        shape[index++] = shape2D[0].x - (boundingRectangle.x + (boundingRectangle.width / 2));
        shape[index++] = 0;
        shape[index++] = shape2D[0].y - (boundingRectangle.y + (boundingRectangle.height / 2));

        return shape;
    }


    function convertShapeTo3DFirstLast(shape2D, boundingRectangle) { //orientate 2D shape to XZ plane center at (0, 0, 0)
        var length = shape2D.length;
        var shape = new Array(length * 3);
        var index = 0;

        for (var i = 0; i < length; i++) {
            shape[index++] = shape2D[i].x - (boundingRectangle.x + (boundingRectangle.width / 2));
            shape[index++] = 0;
            shape[index++] = shape2D[i].y - (boundingRectangle.y + (boundingRectangle.height / 2));
        }

        return shape;
    }

    var originScratch = new Cartesian2();
    var nextScratch = new Cartesian2();
    var prevScratch = new Cartesian2();
    function angleIsGreaterThanPi (forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = prev.subtract(origin, prev);
        next = next.subtract(origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    }

    function computeRotationAngle (start, end, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, start, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, end, prevScratch), prevScratch);
        prev = prev.subtract(origin, prev);
        next = next.subtract(origin, next);

        var angle = Cartesian2.angleBetween(next, prev);

        return (((prev.x * next.y) - (prev.y * next.x)) >= 0.0) ? -angle : angle;
    }

    var posScratch = new Cartesian3();
    function scaleToSurface (positions, ellipsoid){
        for (var i = 0; i < positions.length; i += 3) {
            posScratch = Cartesian3.fromArray(positions, i, posScratch);
            posScratch = ellipsoid.scaleToGeodeticSurface(posScratch, posScratch);
            positions[i] = posScratch.x;
            positions[i + 1] = posScratch.y;
            positions[i + 2] = posScratch.z;
        }

        return positions;
    }

    var quaterion = new Quaternion();
    var rotMatrix = new Matrix3();
    var scratch3Array = new Array(3);
    function computeRoundCorner(pivot, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid, finalPositions, shape, height) {
        var angle = Cartesian3.angleBetween(startPoint.subtract(pivot, scratch1), endPoint.subtract(pivot, scratch2));
        var granularity = (cornerType.value === CornerType.BEVELED.value) ? 0 : Math.ceil(angle/CesiumMath.toRadians(5));

        var m;
        if (leftIsOutside) {
            m =  Matrix3.fromQuaternion(Quaternion.fromAxisAngle(pivot, angle/(granularity+1), quaterion), rotMatrix);
        } else {
            m = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(pivot.negate(scratch1), angle/(granularity+1), quaterion), rotMatrix);
        }

        startPoint = startPoint.clone(scratch1);
        for (var i = 0; i < granularity; i++) {
            startPoint = m.multiplyByVector(startPoint, startPoint);
            scratch3Array[0] = startPoint.x;
            scratch3Array[1] = startPoint.y;
            scratch3Array[2] = startPoint.z;

            var left = startPoint.subtract(pivot).normalize();
            if (!leftIsOutside) {
                left = left.negate(left);
            }
            scratch3Array = scaleToSurface(scratch3Array, ellipsoid);
            finalPositions = addPositions(scratch3Array, left, shape, finalPositions, ellipsoid, height, 1);
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
        var length = positions.length/(shapeLength*6);
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

            var s, t;
            for (i = 0; i < length; i++) {
                t = i * lengthSt;
                s = heightSt * (shape[0].y + boundingRectangle.height/2);
                st.push(s, t);
                for(j = 1; j < shapeLength; j++) {
                    s = heightSt * (shape[j].y + boundingRectangle.height/2);
                    st.push(s, t);
                    st.push(s, t);
                }
                s = heightSt * (shape[0].y + boundingRectangle.height/2);
                st.push(s, t);
            }
            for(j = 0; j < shapeLength; j++) {
                t = 0;
                s = heightSt * (shape[j].y + boundingRectangle.height/2);
                st.push(s, t);
            }
            for(j = 0; j < shapeLength; j++) {
                t = (length - 1) * lengthSt;
                s = heightSt * (shape[j].y + boundingRectangle.height/2);
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
            attributes: attributes,
            indices: IndexDatatype.createTypedArray(positions.length/3, indices),
            boundingSphere: BoundingSphere.fromVertices(positions),
            primitiveType: PrimitiveType.TRIANGLES
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
        var windingOrder = PolygonPipeline.computeWindingOrder2D(shape2D);
        if (windingOrder.value === WindingOrder.CLOCKWISE.value) {
            shape2D.reverse();
        }

        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);
        var shapeForSides = convertShapeTo3DSides(shape2D, boundingRectangle);
        var shapeForEnds = convertShapeTo3DFirstLast(shape2D, boundingRectangle);
        var height = geometry._height + boundingRectangle.height/2;
        var width = boundingRectangle.width/2;
        var finalPositions = [];
        var centers = [];
        var ends = [];

        var i;
        var length = positions.length;
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
        forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
        left = surfaceNormal.cross(forward, left).normalize(left);

        ends = addPositions([position.x, position.y, position.z], left, shapeForEnds, ends, ellipsoid, height, 1);
        previousPosition = position.clone(previousPosition);
        position = nextPosition;
        backward = forward.negate(backward);

        var surfacePositions;

        for (i = 1; i < length - 1; i++) {
            nextPosition = positions[i + 1];
            forward = Cartesian3.subtract(nextPosition, position, forward).normalize(forward);
            cornerDirection = forward.add(backward, cornerDirection).normalize(cornerDirection);
            surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
            var doCorner = !Cartesian3.equalsEpsilon(cornerDirection.negate(scratch1), surfaceNormal, CesiumMath.EPSILON2);
            if (doCorner) {
                cornerDirection = cornerDirection.cross(surfaceNormal, cornerDirection);
                cornerDirection = surfaceNormal.cross(cornerDirection, cornerDirection);
                var scalar = width / Math.max(0.25, (Cartesian3.cross(cornerDirection, backward, scratch1).magnitude()));
                var leftIsOutside = angleIsGreaterThanPi(forward, backward, position, ellipsoid);
                cornerDirection = cornerDirection.multiplyByScalar(scalar, cornerDirection, cornerDirection);
                if (leftIsOutside) {
                    pivot = Cartesian3.add(position, cornerDirection, pivot);
                    start = pivot.add(left.multiplyByScalar(width, start), start);
                    scratch2Array[0] = previousPosition.clone(scratch2Array[0]);
                    scratch2Array[1] = start.clone(scratch2Array[1]);
                    surfacePositions = PolylinePipeline.scaleToSurface(scratch2Array);
                    finalPositions = addPositions(surfacePositions, left, shapeForSides, finalPositions, ellipsoid, height, 1);
                    centers = centers.concat(surfacePositions);
                    left = surfaceNormal.cross(forward, left).normalize(left);
                    end = pivot.add(left.multiplyByScalar(width, end), end);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, height);
                    } else {
                        scratch3Array[0] = position.x;
                        scratch3Array[1] = position.y;
                        scratch3Array[2] = position.z;

                        finalPositions = addPositions(scratch3Array, cornerDirection.negate(cornerDirection), shapeForSides, finalPositions, ellipsoid, height, scalar/width);
                    }
                    previousPosition = end.clone(previousPosition);
                } else {
                    pivot = Cartesian3.add(position, cornerDirection, pivot);
                    start = pivot.add(left.multiplyByScalar(-width, start), start);
                    scratch2Array[0] = previousPosition.clone(scratch2Array[0]);
                    scratch2Array[1] = start.clone(scratch2Array[1]);
                    surfacePositions = PolylinePipeline.scaleToSurface(scratch2Array, granularity, ellipsoid);
                    finalPositions = addPositions(surfacePositions, left, shapeForSides, finalPositions, ellipsoid, height, 1);
                    centers = centers.concat(surfacePositions);
                    left  = surfaceNormal.cross(forward, left).normalize(left);
                    end = pivot.add(left.multiplyByScalar(-width, end), end);
                    if (cornerType.value === CornerType.ROUNDED.value || cornerType.value === CornerType.BEVELED.value) {
                        computeRoundCorner(pivot, start, end, cornerType, leftIsOutside, ellipsoid, finalPositions, shapeForSides, height);
                    } else {
                        scratch3Array[0] = position.x;
                        scratch3Array[1] = position.y;
                        scratch3Array[2] = position.z;

                        finalPositions = addPositions(scratch3Array, cornerDirection, shapeForSides, finalPositions, ellipsoid, height, scalar/width);
                    }
                    previousPosition = end.clone(previousPosition);
                }
                backward = forward.negate(backward);
            }
            position = nextPosition;
        }
        scratch2Array[0] = previousPosition.clone(scratch2Array[0]);
        scratch2Array[1] = position.clone(scratch2Array[1]);
        centers = PolylinePipeline.scaleToSurface(scratch2Array, granularity, ellipsoid);
        finalPositions = addPositions(centers, left, shapeForSides, finalPositions, ellipsoid, height, 1);
        ends = addPositions([position.x, position.y, position.z], left, shapeForEnds, ends, ellipsoid, height, 1);

        return computeAttributes(finalPositions, ends, shape2D, boundingRectangle, geometry._vertexFormat, ellipsoid);
    }

    /**
     * A description of a polyline volume.
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
     * var tube = new PolylineVolumeGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *   width : 100000
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
            throw new  DeveloperError('options.shapePositions is required.');
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
     * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
     * @memberof PolylineVolumeGeometry
     *
     * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polylineVolume.
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