/*global define*/
define([
        './defined',
        './DeveloperError',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes'
    ], function(
        defined,
        DeveloperError,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        Geometry,
        GeometryAttribute,
        GeometryAttributes) {
    "use strict";

    /**
     * A description of a polyline modeled as a line strip; the first two positions define a line segment,
     * and each additional position defines a line segment from the previous position.
     *
     * @alias SimplePolylineGeometry
     * @constructor
     *
     * @param {Array} [options.positions] An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
     *
     * @exception {DeveloperError} At least two positions are required.
     *
     * @see SimplePolylineGeometry.createGeometry
     *
     * @example
     * // A polyline with two connected line segments
     * var polyline = new SimplePolylineGeometry({
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *     Cartographic.fromDegrees(0.0, 0.0),
     *     Cartographic.fromDegrees(5.0, 0.0),
     *     Cartographic.fromDegrees(5.0, 5.0)
     *   ])
     * });
     * var geometry = SimplePolylineGeometry.createGeometry(polyline);
     */
    var SimplePolylineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;

        if ((!defined(positions)) || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }

        this._positions = positions;
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

        var i;
        var j = 0;
        var numberOfPositions = positions.length;
        var positionValues = new Float64Array(numberOfPositions * 3);

        for (i = 0; i < numberOfPositions; ++i) {
            var p = positions[i];

            positionValues[j++] = p.x;
            positionValues[j++] = p.y;
            positionValues[j++] = p.z;
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positionValues
        });

        // From line strip to lines
        var numberOfIndices = 2 * (numberOfPositions - 1);
        var indices = IndexDatatype.createTypedArray(numberOfPositions, numberOfIndices);

        j = 0;
        for (i = 0; i < numberOfPositions - 1; ++i) {
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