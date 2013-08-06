/*global define*/
define([
        './defaultValue',
        './Cartesian3',
        './EllipsoidOutlineGeometry'
    ], function(
        defaultValue,
        Cartesian3,
        EllipsoidOutlineGeometry) {
    "use strict";

    /**
     * A {@link Geometry} that represents vertices and indices for the outline of a sphere on the ellipsoid.
     *
     * Creates vertices and indices for an sphere centered at the origin.
     *
     * @alias SphereOutlineGeometry
     * @constructor
     *
     * @param {Number} [options.radius=1.0] The radius of the sphere.
     * @param {Number} [options.stackPartitions=10] The count of stacks for the ellipsoid (1 greater than the number of parallel lines).
     * @param {Number} [options.slicePartitions=8] The count of slices for the ellipsoid (Equal to the number of radial lines).
     * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
     *
     * @example
     * var sphere = new SphereOutlineGeometry({
     *   radius : 100.0,
     *   stackPartitions : 6,
     *   slicePartitions: 5
     * });
     */
    var SphereOutlineGeometry = function(options) {
        var radius = defaultValue(options.radius, 1.0);
        var radii = new Cartesian3(radius, radius, radius);
        var ellipsoidOptions = {
                radii: radii,
                stackPartitions: options.stackPartitions,
                slicePartitions: options.slicePartitions,
                subdivisions: options.subdivisions
        };

        var ellipsoidGeometry = new EllipsoidOutlineGeometry(ellipsoidOptions);

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = ellipsoidGeometry.attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = ellipsoidGeometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = ellipsoidGeometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipsoidGeometry.boundingSphere;
    };

    return SphereOutlineGeometry;
});