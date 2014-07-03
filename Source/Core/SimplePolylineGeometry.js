/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './Math',
        './Color',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './PrimitiveType',
        './PolylinePipeline'
    ], function(
        BoundingSphere,
        Cartesian3,
        CesiumMath,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        PrimitiveType,
        PolylinePipeline) {
    "use strict";

    function interpolateColors(p0, p1, color0, color1, granularity) {
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var numPoints = Math.ceil(angleBetween / granularity);
        var colors = new Array((numPoints+1)*4);
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
            for (i = 0; i < numPoints+1; i++) {
                colors[i] = r0;
                colors[i+1] = g0;
                colors[i+2] = b0;
                colors[i+3] = a0;
            }
            return colors;
        }

        var redPerVertex = (r1 - r0) / numPoints;
        var greenPerVertex = (g1 - g0) / numPoints;
        var bluePerVertex = (b1 - b0) / numPoints;
        var alphaPerVertex = (a1 - a0) / numPoints;

        for (i = 1; i < numPoints; i++) {
            colors[i] = r0 + i * redPerVertex;
            colors[i + 1] = g0 + i * greenPerVertex;
            colors[i + 2] = b0 + i * bluePerVertex;
            colors[i + 3] = a0 + i * alphaPerVertex;
        }

        colors[0] = r0;
        colors[1] = g0;
        colors[2] = b0;
        colors[3] = a0;

        colors[numPoints] = r1;
        colors[numPoints + 1] = g1;
        colors[numPoints + 2] = b1;
        colors[numPoints + 3] = a1;

        return colors;
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
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
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
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
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
        var granularity = simplePolylineGeometry._granularity;

        var perSegmentColors = defined(colors) && !perVertex;

        var i;

        var length = positions.length;
        var numberOfPositions = perSegmentColors ? positions.length * 2 - 2 : positions.length;

        var positionValues = [];
        var colorValues = [];//defined(colors) ? new Uint8Array(numberOfPositions * 4) : undefined;
        var p0, p1, c0, c1;

        if (perSegmentColors) {
            for (i = 0; i < length-1; ++i) {
                p0 = positions[i];
                p1 = positions[i+1];

                var pos = PolylinePipeline.generateArc({
                    positions : [p0, p1],
                    granularity : granularity

                });

                if (defined(colors)) {
                    var segLen = pos.length/3;
                    var color = colors[i];
                    for(var k = 0; k < segLen; k++) {
                        colorValues.push(color.red, color.green, color.blue, color.alpha);
                    }
                }

                positionValues = positionValues.concat(pos);
            }
        } else {
            positionValues = PolylinePipeline.generateArc({
                positions: positions,
                granularity: granularity
            });

            if (defined(colors)) {
                for (i = 0; i < length-1; i++) {
                    p0 = positions[i];
                    p1 = positions[i+1];
                    c0 = colors[i];
                    c1 = colors[i+1];
                    colorValues = colorValues.concat(interpolateColors(p0, p1, c0, c1, granularity));
                }
            }
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : new Float64Array(positionValues)
        });

        if (defined(colors)) {
            attributes.color = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                values : new Uint8Array(colorValues),
                normalize : true
            });
        }


        numberOfPositions = positionValues.length / 3;
        var numberOfIndices = (numberOfPositions - 1) * 2;
        var indices = IndexDatatype.createTypedArray(numberOfPositions, numberOfIndices);
        var indicesIncrement = perSegmentColors ? 2 : 1;

        var j = 0;
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