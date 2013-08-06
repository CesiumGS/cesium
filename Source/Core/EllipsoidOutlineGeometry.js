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
     * A {@link Geometry} that represents vertices and indices for the outline of an ellipsoid centered at the origin.
     *
     * @alias EllipsoidOutlineGeometry
     * @constructor
     *
     * @param {Cartesian3} [options.radii=Cartesian3(1.0, 1.0, 1.0)] The radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.stackPartitions=10] The count of stacks for the ellipsoid (1 greater than the number of parallel lines).
     * @param {Number} [options.slicePartitions=8] The count of slices for the ellipsoid (Equal to the number of radial lines).
     * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
     *
     * @example
     * var ellipsoid = new EllipsoidOutlineGeometry({
     *   radii : new Cartesian3(1000000.0, 500000.0, 500000.0),
     *   stackPartitions: 6,
     *   slicePartitions: 5
     * });
     */
    var EllipsoidOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radii = defaultValue(options.radii, defaultRadii);
        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var stackPartitions = defaultValue(options.stackPartitions, 10);
        var slicePartitions = defaultValue(options.slicePartitions, 8);
        var subdivisions = defaultValue(options.subdivisions, 200);
        if (stackPartitions < 1) {
            throw new DeveloperError('options.stackPartitions must be greater than or equal to one.');
        }
        if (slicePartitions < 0) {
            throw new DeveloperError('options.slicePartitions must be greater than or equal to zero.');
        }

        if (subdivisions < 0) {
            throw new DeveloperError('options.subdivisions must be greater than or equal to zero.');
        }

        var positions = [];
        var indices = [];

        var i;
        var j;
        var phi;
        var cosPhi;
        var sinPhi;
        var theta;
        var cosTheta;
        var sinTheta;
        for (i = 1; i < stackPartitions; i++) {
            phi = Math.PI * i / stackPartitions;
            cosPhi = Math.cos(phi);
            sinPhi = Math.sin(phi);

            for (j = 0; j < subdivisions; j++) {
                theta = CesiumMath.TWO_PI * j / subdivisions;
                cosTheta = Math.cos(theta);
                sinTheta = Math.sin(theta);

                positions.push(radii.x * cosTheta * sinPhi,
                        radii.y * sinTheta * sinPhi,
                        radii.z * cosPhi);
            }
        }

        positions.push(0, 0, radii.z);
        for (i = 1; i < subdivisions; i++) {
            phi = Math.PI * i / subdivisions;
            cosPhi = Math.cos(phi);
            sinPhi = Math.sin(phi);

            for (j = 0; j < slicePartitions; j++) {
                theta = CesiumMath.TWO_PI * j / slicePartitions;
                cosTheta = Math.cos(theta);
                sinTheta = Math.sin(theta);

                positions.push(radii.x * cosTheta * sinPhi,
                        radii.y * sinTheta * sinPhi,
                        radii.z * cosPhi);
            }
        }
        positions.push(0, 0, -radii.z);

        for (i = 0; i < stackPartitions - 1; ++i) {
            var topRowOffset = (i * subdivisions);
            for (j = 0; j < subdivisions - 1; ++j) {
                indices.push(topRowOffset + j, topRowOffset + j + 1);
            }
            indices.push(topRowOffset + subdivisions - 1, topRowOffset);
        }

        var sliceOffset = subdivisions * (stackPartitions - 1);
        for (j = 1; j < slicePartitions + 1; ++j) {
            indices.push(sliceOffset, sliceOffset + j);
        }

        for (i = 0; i < subdivisions - 2; ++i) {
            var topOffset = (i * slicePartitions) + 1 + sliceOffset;
            var bottomOffset = ((i + 1) * slicePartitions) + 1 + sliceOffset;

            for (j = 0; j < slicePartitions - 1; ++j) {
                indices.push(bottomOffset + j, topOffset + j);
            }
            indices.push(bottomOffset + slicePartitions - 1, topOffset + slicePartitions - 1);
        }

        var lastPosition = positions.length/3 - 1;
        for (j = lastPosition - 1; j > lastPosition - slicePartitions-1; --j) {
            indices.push(lastPosition, j);
        }

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
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
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

    return EllipsoidOutlineGeometry;
});