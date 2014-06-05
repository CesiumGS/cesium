/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './Color',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './PolylinePipeline',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        PolylinePipeline,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    /**
     * A description of a polyline modeled as a line strip; the first two positions define a line segment,
     * and each additional position defines a line segment from the previous position. The polyline is capable of
     * displaying with a material.
     *
     * @alias PolylineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
     * @param {Number} [options.width=1.0] The width in pixels.
     * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
     * @param {Boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
     *
     * @exception {DeveloperError} At least two positions are required.
     * @exception {DeveloperError} width must be greater than or equal to one.
     * @exception {DeveloperError} colors has an invalid length.
     *
     * @see PolylineGeometry#createGeometry
     *
     * @example
     * // A polyline with two connected line segments
     * var polyline = new Cesium.PolylineGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     0.0, 0.0,
     *     5.0, 0.0,
     *     5.0, 5.0
     *   ]),
     *   width : 10.0
     * });
     * var geometry = Cesium.PolylineGeometry.createGeometry(polyline);
     */
    var PolylineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        var colors = options.colors;
        var width = defaultValue(options.width, 1.0);
        var perVertex = defaultValue(options.colorsPerVertex, false);

        //>>includeStart('debug', pragmas.debug);
        if ((!defined(positions)) || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }
        if (width < 1.0) {
            throw new DeveloperError('width must be greater than or equal to one.');
        }
        if (defined(colors) && ((perVertex && colors.length < positions.length) || (!perVertex && colors.length < positions.length - 1))) {
            throw new DeveloperError('colors has an invalid length.');
        }
        //>>includeEnd('debug');

        this._positions = positions;
        this._colors = colors;
        this._width = width;
        this._perVertex = perVertex;
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._workerName = 'createPolylineGeometry';
    };

    var scratchCartesian3 = new Cartesian3();
    var scratchPosition = new Cartesian3();
    var scratchPrevPosition = new Cartesian3();
    var scratchNextPosition = new Cartesian3();
    /**
     * Computes the geometric representation of a polyline, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolylineGeometry} polylineGeometry A description of the polyline.
     * @returns {Geometry} The computed vertices and indices.
     */
    PolylineGeometry.createGeometry = function(polylineGeometry) {
        var width = polylineGeometry._width;
        var vertexFormat = polylineGeometry._vertexFormat;
        var colors = polylineGeometry._colors;
        var perVertex = polylineGeometry._perVertex;

        var segments = PolylinePipeline.wrapLongitude(polylineGeometry._positions);
        var positions = segments.positions;
        var lengths = segments.lengths;

        var i;
        var j;
        var k;

        var size = 0;
        var length = lengths.length;
        for (i = 0; i < length; ++i) {
            size += lengths[i] * 4.0 - 4.0;
        }

        var finalPositions = new Float64Array(size * 3);
        var prevPositions = new Float64Array(size * 3);
        var nextPositions = new Float64Array(size * 3);
        var expandAndWidth = new Float32Array(size * 2);
        var st = vertexFormat.st ? new Float32Array(size * 2) : undefined;
        var finalColors = defined(colors) ? new Uint8Array(size * 4) : undefined;

        var positionIndex = 0;
        var expandAndWidthIndex = 0;
        var stIndex = 0;
        var colorIndex = 0;

        var segmentLength;
        var segmentIndex = 0;
        var count = 0;
        var position;

        var positionsLength = positions.length;
        for (j = 0; j < positionsLength; ++j) {
            if (j === 0) {
                position = scratchCartesian3;
                Cartesian3.subtract(positions[0], positions[1], position);
                Cartesian3.add(positions[0], position, position);
            } else {
                position = positions[j - 1];
            }

            Cartesian3.clone(position, scratchPrevPosition);
            Cartesian3.clone(positions[j], scratchPosition);

            if (j === positionsLength - 1) {
                position = scratchCartesian3;
                Cartesian3.subtract(positions[positionsLength - 1], positions[positionsLength - 2], position);
                Cartesian3.add(positions[positionsLength - 1], position, position);
            } else {
                position = positions[j + 1];
            }

            Cartesian3.clone(position, scratchNextPosition);

            segmentLength = lengths[segmentIndex];
            if (j === count + segmentLength) {
                count += segmentLength;
                ++segmentIndex;
            }

            var segmentStart = j - count === 0;
            var segmentEnd = j === count + lengths[segmentIndex] - 1;

            var startK = segmentStart ? 2 : 0;
            var endK = segmentEnd ? 2 : 4;

            var color0, color1;
            if (defined(finalColors)) {
                var colorSegmentIndex = j - segmentIndex;
                if (!segmentStart && !perVertex) {
                    color0 = colors[colorSegmentIndex - 1];
                } else {
                    color0 = colors[colorSegmentIndex];
                }

                if (!segmentEnd) {
                    color1 = colors[colorSegmentIndex];
                }
            }

            for (k = startK; k < endK; ++k) {
                Cartesian3.pack(scratchPosition, finalPositions, positionIndex);
                Cartesian3.pack(scratchPrevPosition, prevPositions, positionIndex);
                Cartesian3.pack(scratchNextPosition, nextPositions, positionIndex);
                positionIndex += 3;

                var direction = (k - 2 < 0) ? -1.0 : 1.0;
                expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;       // expand direction
                expandAndWidth[expandAndWidthIndex++] = direction * width;

                if (vertexFormat.st) {
                    st[stIndex++] = j / (positionsLength - 1);
                    st[stIndex++] = Math.max(expandAndWidth[expandAndWidthIndex - 2], 0.0);
                }

                if (defined(finalColors)) {
                    var color = (k < 2) ? color0 : color1;

                    finalColors[colorIndex++] = Color.floatToByte(color.red);
                    finalColors[colorIndex++] = Color.floatToByte(color.green);
                    finalColors[colorIndex++] = Color.floatToByte(color.blue);
                    finalColors[colorIndex++] = Color.floatToByte(color.alpha);
                }
            }
        }

        var attributes = new GeometryAttributes();

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : finalPositions
        });

        attributes.prevPosition = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : prevPositions
        });

        attributes.nextPosition = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : nextPositions
        });

        attributes.expandAndWidth = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : expandAndWidth
        });

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : st
            });
        }

        if (defined(finalColors)) {
            attributes.color = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                values : finalColors,
                normalize : true
            });
        }

        length = lengths.length;
        var indices = IndexDatatype.createTypedArray(size, positions.length * 6 - length * 6);
        var index = 0;
        var indicesIndex = 0;
        for (i = 0; i < length; ++i) {
            segmentLength = lengths[i] - 1.0;
            for (j = 0; j < segmentLength; ++j) {
                indices[indicesIndex++] = index;
                indices[indicesIndex++] = index + 2;
                indices[indicesIndex++] = index + 1;

                indices[indicesIndex++] = index + 1;
                indices[indicesIndex++] = index + 2;
                indices[indicesIndex++] = index + 3;

                index += 4;
            }
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromPoints(positions)
        });
    };

    return PolylineGeometry;
});