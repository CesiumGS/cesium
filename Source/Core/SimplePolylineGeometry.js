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
        './PrimitiveType'
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
        PrimitiveType) {
    "use strict";

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
     *
     * @exception {DeveloperError} At least two positions are required.
     * @exception {DeveloperError} colors has an invalid length.
     *
     * @see SimplePolylineGeometry#createGeometry
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
        this._workerName = 'createSimplePolylineGeometry';
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

        var perSegmentColors = defined(colors) && !perVertex;

        var i;
        var j = 0;
        var k = 0;

        var length = positions.length;
        var numberOfPositions = !perSegmentColors ? positions.length : positions.length * 2 - 2;

        var positionValues = new Float64Array(numberOfPositions * 3);
        var colorValues = defined(colors) ? new Uint8Array(numberOfPositions * 4) : undefined;

        for (i = 0; i < length; ++i) {
            var p = positions[i];

            var color;
            if (perSegmentColors && i > 0) {
                Cartesian3.pack(p, positionValues, j);
                j += 3;

                color = colors[i - 1];
                colorValues[k++] = Color.floatToByte(color.red);
                colorValues[k++] = Color.floatToByte(color.green);
                colorValues[k++] = Color.floatToByte(color.blue);
                colorValues[k++] = Color.floatToByte(color.alpha);
            }

            if (perSegmentColors && i === length - 1) {
                break;
            }

            Cartesian3.pack(p, positionValues, j);
            j += 3;

            if (defined(colors)) {
                color = colors[i];
                colorValues[k++] = Color.floatToByte(color.red);
                colorValues[k++] = Color.floatToByte(color.green);
                colorValues[k++] = Color.floatToByte(color.blue);
                colorValues[k++] = Color.floatToByte(color.alpha);
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

        var numberOfIndices = !perSegmentColors ? 2 * (numberOfPositions - 1) : numberOfPositions;
        var indices = IndexDatatype.createTypedArray(numberOfPositions, numberOfIndices);
        var indicesIncrement = perSegmentColors ? 2 : 1;

        j = 0;
        for (i = 0; i < numberOfPositions - 1; i += indicesIncrement) {
            indices[j++] = i;
            indices[j++] = i + 1;
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