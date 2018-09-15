define([
        './arrayFill',
        './arrayRemoveDuplicates',
        './BoundingSphere',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './CornerType',
        './CorridorGeometryLibrary',
        './defaultValue',
        './defined',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
        './PolylineGeometry',
        './PrimitiveType'
    ], function(
        arrayFill,
        arrayRemoveDuplicates,
        BoundingSphere,
        Cartesian3,
        Check,
        ComponentDatatype,
        CornerType,
        CorridorGeometryLibrary,
        defaultValue,
        defined,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PolylineGeometry,
        PrimitiveType) {
    'use strict';

    function scaleToSurface(positions, ellipsoid) {
        for (var i = 0; i < positions.length; i++) {
            positions[i] = ellipsoid.scaleToGeodeticSurface(positions[i], positions[i]);
        }
        return positions;
    }

    var scratchNormal = new Cartesian3();

    function scaleToGeodeticHeight(position, height, ellipsoid) {
        var p = position;

        p = ellipsoid.scaleToGeodeticSurface(p, p);

        if (height !== 0) {
            var n = scratchNormal;
            n = ellipsoid.geodeticSurfaceNormal(p, n);

            Cartesian3.multiplyByScalar(n, height, n);
            Cartesian3.add(p, n, p);
        }
    }

    function combine(computedPositions, ellipsoid, height, width) {
        var positions = computedPositions.positions;
        var corners = computedPositions.corners;
        var endPositions = computedPositions.endPositions;

        var instances = [];

        var i;
        var j;
        var p;
        var edge;
        var corner;

        for (i = 0; i < positions.length; ++i) {
            edge = positions[i];
            var edgePos = [];
            for (j = 0; j < edge.length; j +=3) {
                p = Cartesian3.unpack(edge, j);
                scaleToGeodeticHeight(p, height, ellipsoid);
                edgePos.push(p);
            }
            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : edgePos,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        for (i = 0; i < corners.length; ++i) {
            var cornerInfo = corners[i];
            for (corner in cornerInfo) {
                if (cornerInfo.hasOwnProperty(corner)) {
                    edge = cornerInfo[corner];
                    var cornersPos = [];
                    if (corner === 'rightPositions') {
                        p = Cartesian3.unpack(positions[2 * i], positions[2 * i].length - 3);
                        scaleToGeodeticHeight(p, height, ellipsoid);
                        cornersPos.push(p);
                    } else {
                        p = Cartesian3.unpack(positions[2 * i + 1], 0);
                        scaleToGeodeticHeight(p, height, ellipsoid);
                        cornersPos.push(p);
                    }
                    for (j = 0; j < edge.length; j += 3) {
                        p = Cartesian3.unpack(edge, j);
                        scaleToGeodeticHeight(p, height, ellipsoid);
                        cornersPos.push(p);
                    }
                    instances.push(new GeometryInstance({
                        geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                            positions : cornersPos,
                            followSurface : false,
                            width : width
                        }))
                    }));
                }
            }
        }

        var start;
        var end;

        if (defined(endPositions)) {
            for (i = 0; i < endPositions.length; ++i) {
                edge = endPositions[i];
                var endPos = [];
                for (j = 0; j < edge.length; j += 3) {
                    p = Cartesian3.unpack(edge, j);
                    scaleToGeodeticHeight(p, height, ellipsoid);
                    endPos.push(p);
                }
                instances.push(new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : endPos,
                        followSurface : false,
                        width : width
                    }))
                }));
            }

            start = Cartesian3.unpack(positions[1], positions[1].length - 3);
            end = Cartesian3.unpack(endPositions[0], 0);
            scaleToGeodeticHeight(start, height, ellipsoid);
            scaleToGeodeticHeight(end, height, ellipsoid);

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : [start, end],
                    followSurface : false,
                    width : width
                }))
            }));
            if (positions.length > 2) {
                start = Cartesian3.unpack(positions[2], positions[2].length - 3);
                end = Cartesian3.unpack(endPositions[1], 0);
                scaleToGeodeticHeight(start, height, ellipsoid);
                scaleToGeodeticHeight(end, height, ellipsoid);

                instances.push(new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : [start, end],
                        followSurface : false,
                        width : width
                    }))
                }));
            }
        } else {
            start = Cartesian3.unpack(positions[1], positions[1].length - 3);
            end = Cartesian3.unpack(positions[0], 0);
            scaleToGeodeticHeight(start, height, ellipsoid);
            scaleToGeodeticHeight(end, height, ellipsoid);

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : [start, end],
                    followSurface : false,
                    width : width
                }))
            }));
            if (positions.length > 2) {
                start = Cartesian3.unpack(positions[positions.length - 2], positions[positions.length - 2].length - 3);
                end = Cartesian3.unpack(positions[positions.length - 1], 0);
                scaleToGeodeticHeight(start, height, ellipsoid);
                scaleToGeodeticHeight(end, height, ellipsoid);

                instances.push(new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : [start, end],
                        followSurface : false,
                        width : width
                    }))
                }));
            }
        }

        return new GeometryInstance({
            geometry : GeometryPipeline.combineInstances(instances)[0]
        });
    }

    function addVerticalLines(corridorGeometry, computedPositions, ellipsoid, height, extrudedHeight, outlineWidth, topValue, bottomValue) {
        var i;
        var edge;
        var p0;
        var p1;
        var instance;

        var positions = computedPositions.positions;
        var instances = [];
        for (i = 0; i < positions.length; ++i) {
            edge = positions[i];

            var indices = [0, edge.length - 3];
            for (var j = 0; j < indices.length; ++j) {
                p0 = Cartesian3.unpack(edge, indices[j]);
                p1 = Cartesian3.clone(p0);
                scaleToGeodeticHeight(p0, height, ellipsoid);
                scaleToGeodeticHeight(p1, extrudedHeight, ellipsoid);

                instance = new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : [p0, p1],
                        followSurface : false,
                        width : outlineWidth
                    }))
                });
                addCornerOffset(corridorGeometry, instance, topValue, bottomValue);
                instances.push(instance);
            }
        }

        var corners = computedPositions.corners;
        for (i = 0; i < corners.length; ++i) {
            var cornerInfo = corners[i];
            for (var corner in cornerInfo) {
                if (cornerInfo.hasOwnProperty(corner)) {
                    edge = cornerInfo[corner];
                    p0 = Cartesian3.unpack(edge, Math.floor(edge.length / (3 * 2)) * 3);
                    p1 = Cartesian3.clone(p0);
                    scaleToGeodeticHeight(p0, height, ellipsoid);
                    scaleToGeodeticHeight(p1, extrudedHeight, ellipsoid);

                    instance = new GeometryInstance({
                        geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                            positions : [p0, p1],
                            followSurface : false,
                            width : outlineWidth
                        }))
                    });
                    addCornerOffset(corridorGeometry, instance, topValue, bottomValue);
                    instances.push(instance);
                }
            }
        }

        var endPositions = computedPositions.endPositions;
        if (defined(endPositions)) {
            for (i = 0; i < endPositions.length; ++i) {
                edge = endPositions[i];

                p0 = Cartesian3.unpack(edge, Math.floor(edge.length / (3 * 2)) * 3);
                p1 = Cartesian3.clone(p0);
                scaleToGeodeticHeight(p0, height, ellipsoid);
                scaleToGeodeticHeight(p1, extrudedHeight, ellipsoid);

                instance = new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : [p0, p1],
                        followSurface : false,
                        width : outlineWidth
                    }))
                });
                addCornerOffset(corridorGeometry, instance, topValue, bottomValue);
                instances.push(instance);
            }
        }

        return new GeometryInstance({
            geometry : GeometryPipeline.combineInstances(instances)[0]
        });
    }

    function addOffset(corridorGeometry, instance, value) {
        if (!defined(corridorGeometry._offsetAttribute)) {
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

    function addCornerOffset(corridorGeometry, instance, topValue, bottomValue) {
        if (!defined(corridorGeometry._offsetAttribute)) {
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
     * A description of a corridor outline.
     *
     * @alias CorridorOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of positions that define the center of the corridor outline.
     * @param {Number} options.width The distance between the edges of the corridor outline.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance in meters between the positions and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the extruded face and the ellipsoid surface.
     * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
     * @param {Number} [options.outlineWidth=2] The outline width in pixels.
     *
     * @see CorridorOutlineGeometry.createGeometry
     *
     * @example
     * var corridor = new Cesium.CorridorOutlineGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArray([-72.0, 40.0, -70.0, 35.0]),
     *   width : 100000
     * });
     */
    function CorridorOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        var width = options.width;
        var outlineWidth = defaultValue(options.outlineWidth, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.positions', positions);
        Check.typeOf.number('options.width', width);
        //>>includeEnd('debug');

        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);

        this._positions = positions;
        this._ellipsoid = Ellipsoid.clone(defaultValue(options.ellipsoid, Ellipsoid.WGS84));
        this._width = width;
        this._height = Math.max(height, extrudedHeight);
        this._extrudedHeight = Math.min(height, extrudedHeight);
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._offsetAttribute = options.offsetAttribute;
        this._outlineWidth = outlineWidth;
        this._workerName = 'createCorridorOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 1 + positions.length * Cartesian3.packedLength + Ellipsoid.packedLength + 7;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {CorridorOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    CorridorOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.typeOf.object('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (var i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._width;
        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._cornerType;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex] = value._outlineWidth;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchOptions = {
        positions : undefined,
        ellipsoid : scratchEllipsoid,
        width : undefined,
        height : undefined,
        extrudedHeight : undefined,
        cornerType : undefined,
        granularity : undefined,
        offsetAttribute: undefined,
        outlineWidth : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CorridorOutlineGeometry} [result] The object into which to store the result.
     * @returns {CorridorOutlineGeometry} The modified result parameter or a new CorridorOutlineGeometry instance if one was not provided.
     */
    CorridorOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (var i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var width = array[startingIndex++];
        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var cornerType = array[startingIndex++];
        var granularity = array[startingIndex++];
        var offsetAttribute = array[startingIndex++];
        var outlineWidth = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.positions = positions;
            scratchOptions.width = width;
            scratchOptions.height = height;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.cornerType = cornerType;
            scratchOptions.granularity = granularity;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.outlineWidth = outlineWidth;
            return new CorridorOutlineGeometry(scratchOptions);
        }

        result._positions = positions;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._width = width;
        result._height = height;
        result._extrudedHeight = extrudedHeight;
        result._cornerType = cornerType;
        result._granularity = granularity;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._outlineWidth = outlineWidth;

        return result;
    };

    /**
     * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
     *
     * @param {CorridorOutlineGeometry} corridorOutlineGeometry A description of the corridor.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    CorridorOutlineGeometry.createGeometry = function(corridorOutlineGeometry) {
        var positions = corridorOutlineGeometry._positions;
        var width = corridorOutlineGeometry._width;
        var ellipsoid = corridorOutlineGeometry._ellipsoid;

        positions = scaleToSurface(positions, ellipsoid);
        var cleanPositions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon);

        if ((cleanPositions.length < 2) || (width <= 0)) {
            return;
        }

        var height = corridorOutlineGeometry._height;
        var extrudedHeight = corridorOutlineGeometry._extrudedHeight;
        var extrude = !CesiumMath.equalsEpsilon(height, extrudedHeight, 0, CesiumMath.EPSILON2);
        var outlineWidth = corridorOutlineGeometry._outlineWidth;

        var params = {
            ellipsoid : ellipsoid,
            positions : cleanPositions,
            width : width,
            cornerType : corridorOutlineGeometry._cornerType,
            granularity : corridorOutlineGeometry._granularity,
            saveAttributes : false
        };
        var computedPositions = CorridorGeometryLibrary.computePositions(params);
        var instances = [];
        if (extrude) {
            var bottomValue = corridorOutlineGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            var topValue = corridorOutlineGeometry._offsetAttribute === GeometryOffsetAttribute.TOP ? 1 : bottomValue;

            var topInstance = combine(computedPositions, ellipsoid, height, outlineWidth);
            addOffset(corridorOutlineGeometry, topInstance, topValue);
            instances.push(topInstance);

            var bottomInstance = combine(computedPositions, ellipsoid, extrudedHeight, outlineWidth);
            addOffset(corridorOutlineGeometry, bottomInstance, bottomValue);
            instances.push(bottomInstance);

            var verticalLineInstance = addVerticalLines(corridorOutlineGeometry, computedPositions, ellipsoid, height, extrudedHeight, outlineWidth, topValue, bottomValue);
            instances.push(verticalLineInstance);
        } else {
            var offsetValue = corridorOutlineGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            var instance = combine(computedPositions, ellipsoid, height, outlineWidth);
            addOffset(corridorOutlineGeometry, instance, offsetValue);
            instances.push(instance);
        }

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return CorridorOutlineGeometry;
});
