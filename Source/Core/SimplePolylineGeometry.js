/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './Color',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './Math',
        './PolylinePipeline',
        './PrimitiveType'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        PolylinePipeline,
        PrimitiveType) {
    "use strict";

    function interpolateColors(p0, p1, color0, color1, minDistance, array, offset) {
        var numPoints = PolylinePipeline.numberOfPoints(p0, p1, minDistance);
        var i;

        var r0 = color0.red;
        var g0 = color0.green;
        var b0 = color0.blue;
        var a0 = color0.alpha;

        var r1 = color1.red;
        var g1 = color1.green;
        var b1 = color1.blue;
        var a1 = color1.alpha;

        if (Color.equals(color0, color1)) {
            for (i = 0; i < numPoints; i++) {
                array[offset++] = Color.floatToByte(r0);
                array[offset++] = Color.floatToByte(g0);
                array[offset++] = Color.floatToByte(b0);
                array[offset++] = Color.floatToByte(a0);
            }
            return offset;
        }

        var redPerVertex = (r1 - r0) / numPoints;
        var greenPerVertex = (g1 - g0) / numPoints;
        var bluePerVertex = (b1 - b0) / numPoints;
        var alphaPerVertex = (a1 - a0) / numPoints;

        var index = offset;
        for (i = 0; i < numPoints; i++) {
            array[index++] = Color.floatToByte(r0 + i * redPerVertex);
            array[index++] = Color.floatToByte(g0 + i * greenPerVertex);
            array[index++] = Color.floatToByte(b0 + i * bluePerVertex);
            array[index++] = Color.floatToByte(a0 + i * alphaPerVertex);
        }

        return index;
    }

    /**
     * A description of a polyline modeled as a line strip; the first two positions define a line segment,
     * and each additional position defines a line segment from the previous position.
     *
     * @alias SimplePolylineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
     * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
     * @param {Boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
     * @param {Boolean} [options.followSurface=true] A boolean that determines whether positions will be adjusted to the surface of the ellipsoid via a great arc.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude if options.followSurface=true. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     *
     * @exception {DeveloperError} At least two positions are required.
     * @exception {DeveloperError} colors has an invalid length.
     *
     * @see SimplePolylineGeometry#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Simple%20Polyline.html|Cesium Sandcastle Simple Polyline Demo}
     *
     * @example
     * // A polyline with two connected line segments
     * var polyline = new Cesium.SimplePolylineGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     0.0, 0.0,
     *     5.0, 0.0,
     *     5.0, 5.0
     *   ])
     * });
     * var geometry = Cesium.SimplePolylineGeometry.createGeometry(polyline);
     */
    var SimplePolylineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        var colors = options.colors;
        var perVertex = defaultValue(options.colorsPerVertex, false);

        //>>includeStart('debug', pragmas.debug);
        if ((!defined(positions)) || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }
        if (defined(colors) && ((perVertex && colors.length < positions.length) || (!perVertex && colors.length < positions.length - 1))) {
            throw new DeveloperError('colors has an invalid length.');
        }
        //>>includeEnd('debug');

        this._positions = positions;
        this._colors = colors;
        this._perVertex = perVertex;
        this._followSurface = defaultValue(options.followSurface, true);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._workerName = 'createSimplePolylineGeometry';

        var numComponents = 1 + positions.length * Cartesian3.packedLength;
        numComponents += defined(colors) ? 1 + colors.length * Color.packedLength : 1;

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = numComponents + Ellipsoid.packedLength + 3;
    };

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    SimplePolylineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        var colors = value._colors;
        length = defined(colors) ? colors.length : 0.0;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Color.packedLength) {
            Color.pack(colors[i], array, startingIndex);
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._perVertex ? 1.0 : 0.0;
        array[startingIndex++] = value._followSurface ? 1.0 : 0.0;
        array[startingIndex]   = value._granularity;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {SimplePolylineGeometry} [result] The object into which to store the result.
     */
    SimplePolylineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        length = array[startingIndex++];
        var colors = length > 0 ? new Array(length) : undefined;

        for (i = 0; i < length; ++i, startingIndex += Color.packedLength) {
            colors[i] = Color.unpack(array, startingIndex);
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        var perVertex = array[startingIndex++] === 1.0;
        var followSurface = array[startingIndex++] === 1.0;
        var granularity = array[startingIndex];

        if (!defined(result)) {
            return new SimplePolylineGeometry({
                positions : positions,
                colors : colors,
                ellipsoid : ellipsoid,
                perVertex : perVertex,
                followSurface : followSurface,
                granularity : granularity
            });
        }

        result._positions = positions;
        result._colors = colors;
        result._ellipsoid = ellipsoid;
        result._perVertex = perVertex;
        result._followSurface = followSurface;
        result._granularity = granularity;

        return result;
    };

    var scratchArray1 = new Array(2);
    var scratchArray2 = new Array(2);
    var generateArcOptionsScratch = {
        positions : scratchArray1,
        height: scratchArray2,
        ellipsoid: undefined,
        minDistance : undefined
    };

    /**
     * Computes the geometric representation of a simple polyline, including its vertices, indices, and a bounding sphere.
     *
     * @param {SimplePolylineGeometry} simplePolylineGeometry A description of the polyline.
     * @returns {Geometry} The computed vertices and indices.
     */
    SimplePolylineGeometry.createGeometry = function(simplePolylineGeometry) {
        var positions = simplePolylineGeometry._positions;
        var colors = simplePolylineGeometry._colors;
        var perVertex = simplePolylineGeometry._perVertex;
        var followSurface = simplePolylineGeometry._followSurface;
        var granularity = simplePolylineGeometry._granularity;
        var ellipsoid = simplePolylineGeometry._ellipsoid;

        var minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);
        var perSegmentColors = defined(colors) && !perVertex;

        var i;
        var length = positions.length;

        var positionValues;
        var numberOfPositions;
        var colorValues;
        var color;
        var offset = 0;

        if (followSurface) {
            var heights = PolylinePipeline.extractHeights(positions, ellipsoid);
            var generateArcOptions = generateArcOptionsScratch;
            generateArcOptions.minDistance = minDistance;
            generateArcOptions.ellipsoid = ellipsoid;

            if (perSegmentColors) {
                var positionCount = 0;
                for (i = 0; i < length - 1; i++) {
                    positionCount += PolylinePipeline.numberOfPoints(positions[i], positions[i+1], minDistance) + 1;
                }

                positionValues = new Float64Array(positionCount * 3);
                colorValues = new Uint8Array(positionCount * 4);

                generateArcOptions.positions = scratchArray1;
                generateArcOptions.height= scratchArray2;

                var ci = 0;
                for (i = 0; i < length - 1; ++i) {
                    scratchArray1[0] = positions[i];
                    scratchArray1[1] = positions[i + 1];

                    scratchArray2[0] = heights[i];
                    scratchArray2[1] = heights[i + 1];

                    var pos = PolylinePipeline.generateArc(generateArcOptions);

                    if (defined(colors)) {
                        var segLen = pos.length / 3;
                        color = colors[i];
                        for(var k = 0; k < segLen; ++k) {
                            colorValues[ci++] = Color.floatToByte(color.red);
                            colorValues[ci++] = Color.floatToByte(color.green);
                            colorValues[ci++] = Color.floatToByte(color.blue);
                            colorValues[ci++] = Color.floatToByte(color.alpha);
                        }
                    }

                    positionValues.set(pos, offset);
                    offset += pos.length;
                }
            } else {
                generateArcOptions.positions = positions;
                generateArcOptions.height= heights;
                positionValues = new Float64Array(PolylinePipeline.generateArc(generateArcOptions));

                if (defined(colors)) {
                    colorValues = new Uint8Array(positionValues.length / 3 * 4);

                    for (i = 0; i < length - 1; ++i) {
                        var p0 = positions[i];
                        var p1 = positions[i + 1];
                        var c0 = colors[i];
                        var c1 = colors[i + 1];
                        offset = interpolateColors(p0, p1, c0, c1, minDistance, colorValues, offset);
                    }

                    var lastColor = colors[length - 1];
                    colorValues[offset++] = Color.floatToByte(lastColor.red);
                    colorValues[offset++] = Color.floatToByte(lastColor.green);
                    colorValues[offset++] = Color.floatToByte(lastColor.blue);
                    colorValues[offset++] = Color.floatToByte(lastColor.alpha);
                }
            }
        } else {
            numberOfPositions = perSegmentColors ? length * 2 - 2 : length;
            positionValues = new Float64Array(numberOfPositions * 3);
            colorValues = defined(colors) ? new Uint8Array(numberOfPositions * 4) : undefined;

            var positionIndex = 0;
            var colorIndex = 0;

            for (i = 0; i < length; ++i) {
                var p = positions[i];

                if (perSegmentColors && i > 0) {
                    Cartesian3.pack(p, positionValues, positionIndex);
                    positionIndex += 3;

                    color = colors[i - 1];
                    colorValues[colorIndex++] = Color.floatToByte(color.red);
                    colorValues[colorIndex++] = Color.floatToByte(color.green);
                    colorValues[colorIndex++] = Color.floatToByte(color.blue);
                    colorValues[colorIndex++] = Color.floatToByte(color.alpha);
                }

                if (perSegmentColors && i === length - 1) {
                    break;
                }

                Cartesian3.pack(p, positionValues, positionIndex);
                positionIndex += 3;

                if (defined(colors)) {
                    color = colors[i];
                    colorValues[colorIndex++] = Color.floatToByte(color.red);
                    colorValues[colorIndex++] = Color.floatToByte(color.green);
                    colorValues[colorIndex++] = Color.floatToByte(color.blue);
                    colorValues[colorIndex++] = Color.floatToByte(color.alpha);
                }
            }
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positionValues
        });

        if (defined(colors)) {
            attributes.color = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                values : colorValues,
                normalize : true
            });
        }

        numberOfPositions = positionValues.length / 3;
        var numberOfIndices = (numberOfPositions - 1) * 2;
        var indices = IndexDatatype.createTypedArray(numberOfPositions, numberOfIndices);

        var index = 0;
        for (i = 0; i < numberOfPositions - 1; ++i) {
            indices[index++] = i;
            indices[index++] = i + 1;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : BoundingSphere.fromPoints(positions)
        });
    };

    return SimplePolylineGeometry;
});
