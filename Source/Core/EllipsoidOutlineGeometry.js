/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian3',
        './Math',
        './Ellipsoid',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian3,
        CesiumMath,
        Ellipsoid,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat) {
    "use strict";

    var defaultRadii = new Cartesian3(1.0, 1.0, 1.0);

    /**
     * A {@link Geometry} that represents vertices and indices for an ellipsoid centered at the origin.
     *
     * @alias EllipsoidGeometry
     * @constructor
     *
     * @param {Cartesian3} [options.radii=Cartesian3(1.0, 1.0, 1.0)] The radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.numberOfPartitions=32] The number of times to partition the ellipsoid in a plane formed by two radii in a single quadrant.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} options.numberOfPartitions must be greater than zero.
     *
     * @example
     * var ellipsoid = new EllipsoidGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   radii : new Cartesian3(1000000.0, 500000.0, 500000.0)
     * });
     */
    var EllipsoidGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radii = defaultValue(options.radii, defaultRadii);
        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var stackPartitions = defaultValue(options.stackPartitions, 100);
        var slicePartitions = defaultValue(options.slicePartitions, 100);
        if (stackPartitions < 0 || slicePartitions < 0) {
            throw new DeveloperError('options.stackPartitions and options.slicePartitions must be greater than zero.');
        }
        if (stackPartitions === 0 && slicePartitions === 0) {
            throw new DeveloperError('options.stackPartitions and options.slicePartitions cannot both equal zero.');
        }

        var positions = [];
        var indices = [];

        positions.push(0, 0, radii.z);
        var i;
        var j;
        for (i = 1; i < stackPartitions; i++) {
            var phi = Math.PI * i / stackPartitions;
            var cosPhi = Math.cos(phi);
            var sinPhi = Math.sin(phi);

            for (j = 0; j < slicePartitions; j++) {
                var theta = CesiumMath.TWO_PI * j / slicePartitions;
                var cosTheta = Math.cos(theta);
                var sinTheta = Math.sin(theta);

                positions.push(radii.x * cosTheta * sinPhi,
                        radii.y * sinTheta * sinPhi,
                        radii.z * cosPhi);
            }
        }
        positions.push(0, 0, -radii.z);

        for (j = 1; j < slicePartitions; ++j) {
            indices.push(0, j);
        }
        indices.push(0, slicePartitions);

        for (i = 0; i < stackPartitions - 2; ++i) {
            var topRowOffset = (i * slicePartitions) + 1;
            var bottomRowOffset = ((i + 1) * slicePartitions) + 1;
            for (j = 0; j < slicePartitions - 1; ++j) {
                indices.push(topRowOffset + j, topRowOffset + j + 1);
                indices.push(topRowOffset + j, bottomRowOffset + j);
            }
            indices.push(topRowOffset + slicePartitions - 1, topRowOffset);
            indices.push(bottomRowOffset + slicePartitions - 1, topRowOffset + slicePartitions - 1);
        }

        var lastPosition = positions.length/3 - 1;
        for (j = lastPosition - 1; j > lastPosition - slicePartitions; --j) {
            indices.push(lastPosition, j);
        }
        indices.push(lastPosition, lastPosition - slicePartitions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(positions)
            })
        });

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = IndexDatatype.createTypedArray(length, indices);

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = BoundingSphere.fromEllipsoid(ellipsoid);
    };

    return EllipsoidGeometry;
});