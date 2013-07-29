/*global define*/
define([
        './defaultValue',
        './Cartesian3',
        './EllipsoidGeometry'
    ], function(
        defaultValue,
        Cartesian3,
        EllipsoidGeometry) {
    "use strict";

    /**
     * A {@link Geometry} that represents vertices and indices for an ellipse on the ellipsoid.
     *
     * Creates vertices and indices for an sphere centered at the origin.
     *
     * @alias SphereGeometry
     * @constructor
     *
     * @param {Number} [options.radius=1.0] The radius of the sphere.
     * @param {Number} [options.numberOfPartitions=32] The number of times to partition the sphere in a plane formed by two radii in a single quadrant.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} options.numberOfPartitions must be greater than zero.
     *
     * @example
     * var sphere = new SphereGeometry({
     *   radius : 100.0,
     *   vertexFormat : VertexFormat.POSITION_ONLY
     * });
     */
    var SphereGeometry = function(options) {
        var radius = defaultValue(options.radius, 1.0);
        var radii = new Cartesian3(radius, radius, radius);
        var ellipsoidOptions = {
                radii: radii,
                numberOfPartitions: options.numberOfPartitions,
                vertexFormat: options.vertexFormat
        };

        var ellipsoidGeometry = new EllipsoidGeometry(ellipsoidOptions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
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
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
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

    return SphereGeometry;
});