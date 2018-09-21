define([
        './arrayFill',
        './arrayRemoveDuplicates',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './Math',
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PolylineGeometry',
        './WindingOrder'
    ], function(
        arrayFill,
        arrayRemoveDuplicates,
        Cartesian3,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        GeometryAttribute,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        CesiumMath,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PolylineGeometry,
        WindingOrder) {
    'use strict';

    var createGeometryFromPositionsPositions = [];
    var createGeometryFromPositionsSubdivided = [];
    var scratchSurfacNormal = new Cartesian3();

    function scalePosition(position, ellipsoid, perPositionHeight, height) {
        var n = scratchSurfacNormal;
        var scaleToSurface = !perPositionHeight;
        var p = position;

        if (scaleToSurface) {
            p = ellipsoid.scaleToGeodeticSurface(p, p);
        }

        if (height !== 0) {
            n = ellipsoid.geodeticSurfaceNormal(p, n);

            Cartesian3.multiplyByScalar(n, height, n);
            Cartesian3.add(p, n, p);
        }
    }

    function createGeometryFromPositions(ellipsoid, positions, width, minDistance, perPositionHeight, height) {
        var tangentPlane = EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(positions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            positions = positions.slice().reverse();
        }

        var subdividedPositions;
        var i;

        var length = positions.length;
        var index = 0;

        if (!perPositionHeight) {
            var numVertices = 0;
            for (i = 0; i < length; i++) {
                numVertices += PolygonGeometryLibrary.subdivideLineCount(positions[i], positions[(i + 1) % length], minDistance);
            }
            subdividedPositions = new Array(numVertices);
            for (i = 0; i < length; i++) {
                var tempPositions = PolygonGeometryLibrary.subdivideLine(positions[i], positions[(i + 1) % length], minDistance, createGeometryFromPositionsSubdivided);
                var tempPositionsLength = tempPositions.length;
                for (var j = 0; j < tempPositionsLength; j += 3) {
                    subdividedPositions[index++] = Cartesian3.fromArray(tempPositions, j);
                }
            }
        } else {
            subdividedPositions = positions;
        }

        subdividedPositions.push(subdividedPositions[0]);

        length = subdividedPositions.length;
        for (i = 0; i < length; ++i) {
            scalePosition(subdividedPositions[i], ellipsoid, perPositionHeight, height);
        }

        return new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : subdividedPositions,
                width : width,
                followSurface : false
            }))
        });
    }

    var cornerPositionsScratch = [new Cartesian3(), new Cartesian3()];

    function createExtrudedCornerLine(ellipsoid, position, width, perPositionHeight, height, extrudedHeight) {
        var cornerPositions = cornerPositionsScratch;
        Cartesian3.clone(position, cornerPositions[0]);
        Cartesian3.clone(position, cornerPositions[1]);

        scalePosition(cornerPositions[0], ellipsoid, perPositionHeight, height);
        scalePosition(cornerPositions[1], ellipsoid, perPositionHeight, extrudedHeight);

        var geometry = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : cornerPositions,
            width : width,
            followSurface : false
        }));
        if (!defined(geometry)) {
            return undefined;
        }
        return new GeometryInstance({
            geometry : geometry
        });
    }

    function addOffset(polygonGeometry, instance, value) {
        if (!defined(polygonGeometry._offsetAttribute)) {
            return;
        }

        var size = instance.geometry.attributes.position.values.length / 3;
        var offsetAttribute = new Uint8Array(size);
        offsetAttribute = arrayFill(offsetAttribute, value);
        instance.geometry.attributes.applyOffset = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 1,
            values : offsetAttribute
        });
    }

    function addCornerOffset(polygonGeometry, instance, topValue, bottomValue) {
        if (!defined(polygonGeometry._offsetAttribute)) {
            return;
        }

        var size = instance.geometry.attributes.position.values.length / 3;
        var offsetAttribute = new Uint8Array(size);
        offsetAttribute = arrayFill(offsetAttribute, topValue, 0, size / 2);
        offsetAttribute = arrayFill(offsetAttribute, bottomValue, size / 2);
        instance.geometry.attributes.applyOffset = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 1,
            values : offsetAttribute
        });
    }

    /**
     * A description of the outline of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy.
     *
     * @alias PolygonOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The distance in meters between the polygon and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the polygon's extruded face and the ellipsoid surface.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     *
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
     *
     * @see PolygonOutlineGeometry#createGeometry
     * @see PolygonOutlineGeometry#fromPositions
     *
     * @example
     * // 1. create a polygon outline from points
     * var polygon = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   )
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
     *
     * // 2. create a nested polygon with holes outline
     * var polygonWithHole = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -109.0, 30.0,
     *       -95.0, 30.0,
     *       -95.0, 40.0,
     *       -109.0, 40.0
     *     ]),
     *     [new Cesium.PolygonHierarchy(
     *       Cesium.Cartesian3.fromDegreesArray([
     *         -107.0, 31.0,
     *         -107.0, 39.0,
     *         -97.0, 39.0,
     *         -97.0, 31.0
     *       ]),
     *       [new Cesium.PolygonHierarchy(
     *         Cesium.Cartesian3.fromDegreesArray([
     *           -105.0, 33.0,
     *           -99.0, 33.0,
     *           -99.0, 37.0,
     *           -105.0, 37.0
     *         ]),
     *         [new Cesium.PolygonHierarchy(
     *           Cesium.Cartesian3.fromDegreesArray([
     *             -103.0, 34.0,
     *             -101.0, 34.0,
     *             -101.0, 36.0,
     *             -103.0, 36.0
     *           ])
     *         )]
     *       )]
     *     )]
     *   )
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygonWithHole);
     *
     * // 3. create extruded polygon outline
     * var extrudedPolygon = new Cesium.PolygonOutlineGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   ),
     *   extrudedHeight: 300000
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(extrudedPolygon);
     */
    function PolygonOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var polygonHierarchy = options.polygonHierarchy;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var perPositionHeight = defaultValue(options.perPositionHeight, false);
        var perPositionHeightExtrude = perPositionHeight && defined(options.extrudedHeight);
        var width = defaultValue(options.width, 2.0);
        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.polygonHierarchy', polygonHierarchy);
        Check.typeOf.number.greaterThanOrEquals('options.width', width, 1.0);

        if (options.perPositionHeight && defined(options.height)) {
            throw new DeveloperError('Cannot use both options.perPositionHeight and options.height');
        }
        //>>includeEnd('debug');

        if (!perPositionHeightExtrude) {
            var h = Math.max(height, extrudedHeight);
            extrudedHeight = Math.min(height, extrudedHeight);
            height = h;
        }

        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._granularity = granularity;
        this._height = height;
        this._extrudedHeight = extrudedHeight;
        this._polygonHierarchy = polygonHierarchy;
        this._perPositionHeight = perPositionHeight;
        this._perPositionHeightExtrude = perPositionHeightExtrude;
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createPolygonOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + Ellipsoid.packedLength + 8;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PolygonOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    PolygonOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._perPositionHeightExtrude ? 1.0 : 0.0;
        array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex++] = value._width;
        array[startingIndex] = value.packedLength;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var dummyOptions = {
        polygonHierarchy : {}
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolygonOutlineGeometry} [result] The object into which to store the result.
     * @returns {PolygonOutlineGeometry} The modified result parameter or a new PolygonOutlineGeometry instance if one was not provided.
     */
    PolygonOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
        startingIndex = polygonHierarchy.startingIndex;
        delete polygonHierarchy.startingIndex;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var granularity = array[startingIndex++];
        var perPositionHeightExtrude = array[startingIndex++] === 1.0;
        var perPositionHeight = array[startingIndex++] === 1.0;
        var offsetAttribute = array[startingIndex++];
        var width = array[startingIndex++];
        var packedLength = array[startingIndex];

        if (!defined(result)) {
            result = new PolygonOutlineGeometry(dummyOptions);
        }

        result._polygonHierarchy = polygonHierarchy;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._height = height;
        result._extrudedHeight = extrudedHeight;
        result._granularity = granularity;
        result._perPositionHeight = perPositionHeight;
        result._perPositionHeightExtrude = perPositionHeightExtrude;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;
        result.packedLength = packedLength;

        return result;
    };

    /**
     * A description of a polygon outline from an array of positions.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     * @returns {PolygonOutlineGeometry}
     *
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
     *
     * @example
     * // create a polygon from points
     * var polygon = Cesium.PolygonOutlineGeometry.fromPositions({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0,
     *     -75.0, 30.0,
     *     -70.0, 30.0,
     *     -68.0, 40.0
     *   ])
     * });
     * var geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
     *
     * @see PolygonOutlineGeometry#createGeometry
     */
    PolygonOutlineGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.positions', options.positions);
        //>>includeEnd('debug');

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            ellipsoid : options.ellipsoid,
            granularity : options.granularity,
            perPositionHeight : options.perPositionHeight,
            offsetAttribute : options.offsetAttribute,
            width : options.width
        };
        return new PolygonOutlineGeometry(newOptions);
    };

    /**
     * Computes the geometric representation of a polygon outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolygonOutlineGeometry} polygonGeometry A description of the polygon outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PolygonOutlineGeometry.createGeometry = function(polygonGeometry) {
        var ellipsoid = polygonGeometry._ellipsoid;
        var granularity = polygonGeometry._granularity;
        var polygonHierarchy = polygonGeometry._polygonHierarchy;
        var perPositionHeight = polygonGeometry._perPositionHeight;
        var width = polygonGeometry._width;

        var polygons = PolygonGeometryLibrary.polygonOutlinesFromHierarchy(polygonHierarchy, !perPositionHeight, ellipsoid);

        if (polygons.length === 0) {
            return undefined;
        }

        var instances = [];
        var minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);

        var height = polygonGeometry._height;
        var extrudedHeight = polygonGeometry._extrudedHeight;
        var extrude = polygonGeometry._perPositionHeightExtrude || !CesiumMath.equalsEpsilon(height, extrudedHeight, 0, CesiumMath.EPSILON2);

        var instance;
        var i;

        if (extrude) {
            var bottomValue;
            var topValue;
            if (polygonGeometry._offsetAttribute === GeometryOffsetAttribute.TOP) {
                topValue = 1;
                bottomValue = 0;
            } else {
                bottomValue = polygonGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                topValue = bottomValue;
            }

            for (i = 0; i < polygons.length; i++) {
                var polygon = polygons[i];

                instance = createGeometryFromPositions(ellipsoid, polygon, width, minDistance, perPositionHeight, height);
                addOffset(polygonGeometry, instance, topValue);
                instances.push(instance);

                instance = createGeometryFromPositions(ellipsoid, polygon, width, minDistance, perPositionHeight, extrudedHeight);
                addOffset(polygonGeometry, instance, bottomValue);
                instances.push(instance);

                var polygonLength = polygon.length;
                for (var j = 0; j < polygonLength; ++j) {
                    instance = createExtrudedCornerLine(ellipsoid, polygon[j], width, perPositionHeight, height, extrudedHeight);
                    if (defined(instance)) {
                        addCornerOffset(polygonGeometry, instance, topValue, bottomValue);
                        instances.push(instance);
                    }
                }
            }
        } else {
            var offsetValue = polygonGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            for (i = 0; i < polygons.length; i++) {
                instance = createGeometryFromPositions(ellipsoid, polygons[i], width, minDistance, perPositionHeight, height);
                addOffset(polygonGeometry, instance, offsetValue);
                instances.push(instance);
            }
        }

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return PolygonOutlineGeometry;
});
