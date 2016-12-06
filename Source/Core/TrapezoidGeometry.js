/*global define*/
define([
    './BoundingSphere',
    './Cartesian2',
    './Cartesian3',
    './Cartesian4',
    './Cartographic',
    './ComponentDatatype',
    './defaultValue',
    './defined',
    './defineProperties',
    './DeveloperError',
    './Ellipsoid',
    './EllipsoidTangentPlane',
    './Geometry',
    './GeometryAttribute',
    './GeometryAttributes',
    './GeometryInstance',
    './GeometryPipeline',
    './IndexDatatype',
    './Math',
    './Matrix2',
    './Matrix3',
    './Matrix4',
    './PolygonPipeline',
    './PrimitiveType',
    './Quaternion',
    './Rectangle',
    './solveLinearSystem',
    './VertexFormat',
    './WindingOrder'
], function(
    BoundingSphere,
    Cartesian2,
    Cartesian3,
    Cartesian4,
    Cartographic,
    ComponentDatatype,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    Ellipsoid,
    EllipsoidTangentPlane,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    GeometryInstance,
    GeometryPipeline,
    IndexDatatype,
    CesiumMath,
    Matrix2,
    Matrix3,
    Matrix4,
    PolygonPipeline,
    PrimitiveType,
    Quaternion,
    Rectangle,
    solveLinearSystem,
    VertexFormat,
    WindingOrder) {
    'use strict';

    var rectangleScratch = new Rectangle();
    var positions2DScratch = new Array(4);

    function computeSt(positions, ellipsoid) {
        var tangentPlane = EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(positions, positions2DScratch);

        var windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (windingOrder === WindingOrder.CLOCKWISE) {
            var pos = positions2D[1]; //reverse winding order, but keep first position the same
            positions2D[1] = positions2D[3];
            positions2D[3] = pos;
        }

        var from = [
            new Cartesian2(0.0, 0.0),
            new Cartesian2(1.0, 0.0),
            new Cartesian2(1.0, 1.0),
            new Cartesian2(0.0, 1.0)
        ];

        var minX = Math.min(positions2D[0].x, positions2D[1].x, positions2D[2].x, positions2D[3].x);
        var maxX = Math.max(positions2D[0].x, positions2D[1].x, positions2D[2].x, positions2D[3].x);

        var minY = Math.min(positions2D[0].y, positions2D[1].y, positions2D[2].y, positions2D[3].y);
        var maxY = Math.max(positions2D[0].y, positions2D[1].y, positions2D[2].y, positions2D[3].y);

        var invDeltaX = 1.0 / (maxX - minX);
        var invDeltaY = 1.0 / (maxY - minY);
        var to = [
            new Cartesian2(),
            new Cartesian2(),
            new Cartesian2(),
            new Cartesian2()
        ];
        var i;
        for (i = 0; i < 4; ++i) {
            var uv = to[i];
            uv.x = (positions2D[i].x - minX) * invDeltaX;
            uv.y = (positions2D[i].y - minY) * invDeltaY;
        }

        var matrixA = new Array(8);
        var matrixB = new Array(8);
        for (i = 0; i < 4; i++) {
            matrixA[i+i] = [to[i].x, to[i].y, 1.0, 0.0, 0.0, 0.0, -to[i].x * from[i].x, -to[i].y * from[i].x];
            matrixA[i + i + 1] = [0.0, 0.0, 0.0, to[i].x, to[i].y, 1.0, -to[i].x * from[i].y, -to[i].y * from[i].y];
            matrixB[i+i] = [from[i].x, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
            matrixB[i + i + 1] = [from[i].y, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        }

        var x = new Array(8);
        var returnValue = solveLinearSystem(matrixA, matrixB, 8, solveLinearSystem.LinearSolveMethod.GAUSSIAN_ELIMINATION, x);
        if (!defined(returnValue)) {
            solveLinearSystem(matrixA, matrixB, 8, solveLinearSystem.LinearSolveMethod.QR_DECOMPOSITION, x);
        }
        var projectionMatrix = new Matrix4(x[0], x[1], 0.0, x[2],  //texture coordinate projection matrix
            x[3], x[4], 0.0, x[5], //TODO: move this to an appearance, probably
            0.0,  0.0, 1.0,  0.0,
            x[6], x[7], 0.0,  1.0);

        var textureCoordinates = new Float32Array(8);

        for (i = 0 ; i < to.length; i++) {
            textureCoordinates[i + i] = from[i].x; //this is probably not the right thing to do here
            textureCoordinates[i + i + 1] = from[i].y;
        }

        return new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : textureCoordinates
        });
    }

    function computeNormal(positions, ellipsoid) {
        var normals = new Float32Array(12);
        var n1 = ellipsoid.geodeticSurfaceNormal(positions[0]);
        normals[0] = n1.x;
        normals[1] = n1.y;
        normals[2] = n1.z;

        var n2 = ellipsoid.geodeticSurfaceNormal(positions[1]);
        normals[3] = n2.x;
        normals[4] = n2.y;
        normals[5] = n2.z;

        var n3 = ellipsoid.geodeticSurfaceNormal(positions[2]);
        normals[6] = n3.x;
        normals[7] = n3.y;
        normals[8] = n3.z;

        var n4 = ellipsoid.geodeticSurfaceNormal(positions[3]);
        normals[9] = n4.x;
        normals[10] = n4.y;
        normals[11] = n4.z;

        return new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : normals
        });
    }


    /**
     * A description of a trapezoid on an ellipsoid centered at the origin. TrapezoidGeometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @alias TrapezoidGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of four positions that define the corner points of the trapezoid
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the trapezoid lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The distance in meters between the trapezoid and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the rectangle's extruded face and the ellipsoid surface.
     *
     * @exception {DeveloperError} <code>options.positions</code> positions is required.
     *
     * @see TrapezoidGeometry#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Trapezoid.html|Cesium Sandcastle Trapezoid Demo}
     *
     * @example
     * // 1. create an rectangle
     * var trapezoid = new Cesium.TrapezoidGeometry({
     *   positions : Cesium.Cartesian3.fromDegrees([-100, 30,
     *                                              -100, 40,
     *                                              -110, 40,
     *                                              -110, 30]),
     *   height : 10000.0
     * });
     * var geometry = Cesium.TrapezoidGeometry.createGeometry(rectangle);
     */
    function TrapezoidGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var positions = options.positions;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var surfaceHeight = defaultValue(options.height, 0.0);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var extrudedHeight = options.extrudedHeight;
        var extrude = defined(extrudedHeight);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('positions is required.');
        }
        //>>includeEnd('debug');

        if (!defined(positions) || positions.length < 3) {
            this._rectangle = new Rectangle();
        } else {
            this._rectangle = Rectangle.fromCartesianArray(positions, ellipsoid);
        }

        this._positions = positions;
        this._granularity = granularity;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._surfaceHeight = surfaceHeight;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        // this._extrudedHeight = defaultValue(extrudedHeight, 0.0);
        // this._extrude = extrude;
        this._workerName = 'createTrapezoidGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    TrapezoidGeometry.packedLength = 4 * Cartesian3.packedLength + Ellipsoid.packedLength + VertexFormat.packedLength + Rectangle.packedLength + 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {TrapezoidGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    TrapezoidGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var positions = value._positions;

        for (var i = 0; i < 4; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        Rectangle.pack(value._rectangle, array, startingIndex);
        startingIndex += Rectangle.packedLength;

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._surfaceHeight;
        // array[startingIndex++] = value._extrudedHeight;
        // array[startingIndex++] = value._extrude ? 1.0 : 0.0;

        return array;
    };

    var scratchRectangle = new Rectangle();
    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        positions: undefined,
        rectangle : scratchRectangle,
        ellipsoid : scratchEllipsoid,
        vertexFormat : scratchVertexFormat,
        granularity : undefined,
        height : undefined,
        extrudedHeight : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {TrapezoidGeometry} [result] The object into which to store the result.
     * @returns {TrapezoidGeometry} The modified result parameter or a new TrapezoidGeometry instance if one was not provided.
     */
    TrapezoidGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var positions = new Array(4);

        for (var i = 0; i < 4; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        var rectangle = Rectangle.unpack(array, startingIndex, scratchRectangle);
        startingIndex += Rectangle.packedLength;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var granularity = array[startingIndex++];
        var surfaceHeight = array[startingIndex++];
        // var extrudedHeight = array[startingIndex++];
        // var extrude = array[startingIndex++] === 1.0;

        if (!defined(result)) {
            scratchOptions.positions = positions;
            scratchOptions.granularity = granularity;
            scratchOptions.height = surfaceHeight;
            // scratchOptions.extrudedHeight = extrude ? extrudedHeight : undefined;
            return new TrapezoidGeometry(scratchOptions);
        }

        result._positions = positions;
        result._rectangle = Rectangle.clone(rectangle, result._rectangle);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._granularity = granularity;
        result._surfaceHeight = surfaceHeight;
        // result._extrudedHeight = extrude ? extrudedHeight : undefined;
        // result._extrude = extrude;

        return result;
    };

    /**
     * Computes the geometric representation of a trapezoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {TrapezoidGeometry} trapezoidGeometry A description of the trapezoid.
     * @returns {Geometry|undefined} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    TrapezoidGeometry.createGeometry = function(trapezoidGeometry) {
        var positions = trapezoidGeometry._positions;
        for (var i = 0; i < 4; ++i) {
            for (var j = i + 1; j < 4; ++j) {
                if (Cartesian3.equalsEpsilon(positions[i], positions[j], CesiumMath.EPSILON10)) {
                    return undefined;
                }
            }
        }
        var rectangle = Rectangle.clone(trapezoidGeometry._rectangle, rectangleScratch);
        var ellipsoid = trapezoidGeometry._ellipsoid;
        var surfaceHeight = trapezoidGeometry._surfaceHeight;
//        var extrude = rectangleGeometry._extrude;
//        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var vertexFormat = trapezoidGeometry._vertexFormat;

        var attributes = new GeometryAttributes();
        var flatPositions = new Float64Array(4 * 3);
        flatPositions[0] = positions[0].x;
        flatPositions[1] = positions[0].y;
        flatPositions[2] = positions[0].z;
        flatPositions[3] = positions[1].x;
        flatPositions[4] = positions[1].y;
        flatPositions[5] = positions[1].z;
        flatPositions[6] = positions[2].x;
        flatPositions[7] = positions[2].y;
        flatPositions[8] = positions[2].z;
        flatPositions[9] = positions[3].x;
        flatPositions[10] = positions[3].y;
        flatPositions[11] = positions[3].z;
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : flatPositions
        });
        attributes.st = computeSt(positions, ellipsoid);
        attributes.normal = computeNormal(positions, ellipsoid);

        var indices = IndexDatatype.createTypedArray(12, 6);
        indices[0] = 0;
        indices[1] = 1;
        indices[2] = 2;
        indices[3] = 0;
        indices[4] = 2;
        indices[5] = 3;

        return new Geometry({
            attributes : attributes,
            indices: indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromPoints(positions)
        });
    };

    /**
     * @private
     */
    TrapezoidGeometry.createShadowVolume = function(trapezoidGeometry, minHeightFunc, maxHeightFunc) {
        //TODO: extruded height
        var granularity = trapezoidGeometry._granularity;
        var ellipsoid = trapezoidGeometry._ellipsoid;

        var minHeight = minHeightFunc(granularity, ellipsoid);
        var maxHeight = maxHeightFunc(granularity, ellipsoid);

        return new TrapezoidGeometry({
            rectangle : trapezoidGeometry._rectangle,
            ellipsoid : ellipsoid,
            granularity : granularity,
            extrudedHeight : maxHeight,
            height : minHeight,
            vertexFormat : VertexFormat.POSITION_ONLY
        });
    };

    defineProperties(TrapezoidGeometry.prototype, {
        /**
         * @private
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        }
    });

    return TrapezoidGeometry;
});
