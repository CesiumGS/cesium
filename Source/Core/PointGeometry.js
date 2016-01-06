/*global define*/
define([
        './BoundingSphere',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './PrimitiveType'
    ], function(
        BoundingSphere,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        PrimitiveType) {
    "use strict";

    /**
     * Describes a collection of points made up of positions and colors.
     *
     * @alias PointGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {TypedArray} options.positionsTypedArray The position values of the points stored in a typed array. Positions are stored as packed (x, y, z) floats.
     * @param {TypedArray} options.colorsTypedArray The color values of the points stored in a typed array. Colors are stored as packed (r, g, b) unsigned bytes.
     * @param {BoundingSphere} [options.boundingSphere] Optional precomputed bounding sphere to save computation time.
     *
     * @example
     * // Create a PointGeometry with two points
     * var points = new Cesium.PointGeometry({
     *   positionsTypedArray : new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 1.0]),
     *   colorsTypedArray : new Uint8Array([255, 0, 0, 127, 127, 127]),
     *   boundingSphere : boundingSphere
     * });
     * var geometry = Cesium.PointGeometry.createGeometry(points);
     *
     * @private
     */
    function PointGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.positionsTypedArray)) {
            throw new DeveloperError('options.positionsTypedArray is required.');
        }
        if (!defined(options.colorsTypedArray)) {
            throw new DeveloperError('options.colorsTypedArray is required');
        }
        //>>includeEnd('debug');

        this._positionsTypedArray = options.positionsTypedArray;
        this._colorsTypedArray = options.colorsTypedArray;
        this._boundingSphere = BoundingSphere.clone(options.boundingSphere);

        this._workerName = 'createPointGeometry';
    }

    /**
     * Computes the geometric representation a point collection, including its vertices and a bounding sphere.
     *
     * @param {PointGeometry} pointGeometry A description of the points.
     * @returns {Geometry} The computed vertices.
     */
    PointGeometry.createGeometry = function(pointGeometry) {
        var positions = pointGeometry._positionsTypedArray;
        var componentByteLength = positions.byteLength / positions.length;
        var componentDatatype = componentByteLength === 4 ? ComponentDatatype.FLOAT : ComponentDatatype.DOUBLE;

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : componentDatatype,
            componentsPerAttribute : 3,
            values : positions
        });

        attributes.color = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 3,
            values : pointGeometry._colorsTypedArray,
            normalize : true
        });

        // User provided bounding sphere to save computation time.
        var boundingSphere = pointGeometry._boundingSphere;
        if (!defined(boundingSphere)) {
            boundingSphere = BoundingSphere.fromVertices(positions);
        }

        return new Geometry({
            attributes : attributes,
            primitiveType : PrimitiveType.POINTS,
            boundingSphere : boundingSphere
        });
    };

    return PointGeometry;
});
