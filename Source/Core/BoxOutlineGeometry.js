/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
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
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        PrimitiveType) {
    "use strict";

    var diffScratch = new Cartesian3();

    /**
     * A description of the outline of a cube centered at the origin.
     *
     * @alias BoxOutlineGeometry
     * @constructor
     *
     * @param {Cartesian3} options.minimumCorner The minimum x, y, and z coordinates of the box.
     * @param {Cartesian3} options.maximumCorner The maximum x, y, and z coordinates of the box.
     *
     * @see BoxOutlineGeometry.fromDimensions
     * @see BoxOutlineGeometry.createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Box%20Outline.html|Cesium Sandcastle Box Outline Demo}
     *
     * @example
     * var box = new Cesium.BoxOutlineGeometry({
     *   maximumCorner : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
     *   minimumCorner : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
     * });
     * var geometry = Cesium.BoxOutlineGeometry.createGeometry(box);
     */
    var BoxOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var min = options.minimumCorner;
        var max = options.maximumCorner;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(min)) {
            throw new DeveloperError('options.minimumCorner is required.');
        }
        if (!defined(max)) {
            throw new DeveloperError('options.maximumCorner is required');
        }
        //>>includeEnd('debug');

        this._min = Cartesian3.clone(min);
        this._max = Cartesian3.clone(max);
        this._workerName = 'createBoxOutlineGeometry';
    };

    /**
     * Creates an outline of a cube centered at the origin given its dimensions.
     *
     * @param {Cartesian3} options.dimensions The width, depth, and height of the box stored in the x, y, and z coordinates of the <code>Cartesian3</code>, respectively.
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     *
     * @see BoxOutlineGeometry.createGeometry
     *
     * @example
     * var box = Cesium.BoxOutlineGeometry.fromDimensions({
     *   dimensions : new Cesium.Cartesian3(500000.0, 500000.0, 500000.0)
     * });
     * var geometry = Cesium.BoxOutlineGeometry.createGeometry(box);
     */
    BoxOutlineGeometry.fromDimensions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var dimensions = options.dimensions;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(dimensions)) {
            throw new DeveloperError('options.dimensions is required.');
        }
        if (dimensions.x < 0 || dimensions.y < 0 || dimensions.z < 0) {
            throw new DeveloperError('All dimensions components must be greater than or equal to zero.');
        }
        //>>includeEnd('debug');

        var corner = Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3());
        var min = Cartesian3.negate(corner, new Cartesian3());
        var max = corner;

        var newOptions = {
            minimumCorner : min,
            maximumCorner : max
        };
        return new BoxOutlineGeometry(newOptions);
    };

    /**
     * Computes the geometric representation of an outline of a box, including its vertices, indices, and a bounding sphere.
     *
     * @param {BoxOutlineGeometry} boxGeometry A description of the box outline.
     * @returns {Geometry} The computed vertices and indices.
     */
    BoxOutlineGeometry.createGeometry = function(boxGeometry) {
        var min = boxGeometry._min;
        var max = boxGeometry._max;

        var attributes = new GeometryAttributes();
        var indices = new Uint16Array(12 * 2);
        var positions = new Float64Array(8 * 3);

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

        positions[12] = min.x;
        positions[13] = min.y;
        positions[14] = max.z;
        positions[15] = max.x;
        positions[16] = min.y;
        positions[17] = max.z;
        positions[18] = max.x;
        positions[19] = max.y;
        positions[20] = max.z;
        positions[21] = min.x;
        positions[22] = max.y;
        positions[23] = max.z;

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        // top
        indices[0] = 4;
        indices[1] = 5;
        indices[2] = 5;
        indices[3] = 6;
        indices[4] = 6;
        indices[5] = 7;
        indices[6] = 7;
        indices[7] = 4;

        // bottom
        indices[8] = 0;
        indices[9] = 1;
        indices[10] = 1;
        indices[11] = 2;
        indices[12] = 2;
        indices[13] = 3;
        indices[14] = 3;
        indices[15] = 0;

        // left
        indices[16] = 0;
        indices[17] = 4;
        indices[18] = 1;
        indices[19] = 5;

        //right
        indices[20] = 2;
        indices[21] = 6;
        indices[22] = 3;
        indices[23] = 7;

        var diff = Cartesian3.subtract(max, min, diffScratch);
        var radius = Cartesian3.magnitude(diff) * 0.5;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });
    };

    return BoxOutlineGeometry;
});
