define([
    './BoundingSphere',
    './Cartesian3',
    './Check',
    './ComponentDatatype',
    './defaultValue',
    './defined',
    './Geometry',
    './GeometryAttribute',
    './GeometryAttributes',
    './PrimitiveType'
], function(
    BoundingSphere,
    Cartesian3,
    Check,
    ComponentDatatype,
    defaultValue,
    defined,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    PrimitiveType) {
    'use strict';

    /**
     * A description of the outline of a cube centered at the origin.
     *
     * @alias PlaneOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.minimum The minimum x, y, and z coordinates of the box.
     * @param {Cartesian3} options.maximum The maximum x, y, and z coordinates of the box.
     *
     * @see PlaneOutlineGeometry.fromDimensions
     * @see PlaneOutlineGeometry.createGeometry
     * @see Packable
     *
     * @example
     * var box = new Cesium.PlaneOutlineGeometry({
     *   maximum : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
     *   minimum : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
     * });
     * var geometry = Cesium.PlaneOutlineGeometry.createGeometry(box);
     */
    function PlaneOutlineGeometry(options) {
        this._workerName = 'createPlaneOutlineGeometry';
    }
    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    PlaneOutlineGeometry.packedLength = 0;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PlaneOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    PlaneOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        return array;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PlaneOutlineGeometry} [result] The object into which to store the result.
     * @returns {PlaneOutlineGeometry} The modified result parameter or a new PlaneOutlineGeometry instance if one was not provided.
     */
    PlaneOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        if (!defined(result)) {
            return new PlaneOutlineGeometry();
        }

        return result;
    };

    /**
     * Computes the geometric representation of an outline of a box, including its vertices, indices, and a bounding sphere.
     *
     * @param {PlaneOutlineGeometry} boxGeometry A description of the box outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PlaneOutlineGeometry.createGeometry = function(boxGeometry) {
        var min = new Cartesian3(-0.5, -0.5, 0.0);
        var max = new Cartesian3( 0.5,  0.5, 0.0);

        var attributes = new GeometryAttributes();
        var indices = new Uint16Array(4 * 2);
        var positions = new Float64Array(4 * 3);

        positions[0] = min.x;
        positions[1] = min.y;
        positions[2] = min.z;
        positions[3] = max.x;
        positions[4] = min.y;
        positions[5] = min.z;
        positions[6] = max.x;
        positions[7] = max.y;
        positions[8] = min.z;
        positions[9] = min.x;
        positions[10] = max.y;
        positions[11] = min.z;

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        indices[0] = 0;
        indices[1] = 1;
        indices[2] = 1;
        indices[3] = 2;
        indices[4] = 2;
        indices[5] = 3;
        indices[6] = 3;
        indices[7] = 0;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, 0.5)
        });
    };

    return PlaneOutlineGeometry;
});
