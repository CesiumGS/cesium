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

        this.ellipsoidGeometry = new EllipsoidGeometry(ellipsoidOptions);
        this.workerName = 'createSphereGeometry';
    };

    SphereGeometry.createGeometry = function(sphereGeometry) {
        return EllipsoidGeometry.createGeometry(sphereGeometry.ellipsoidGeometry);
    };

    return SphereGeometry;
});