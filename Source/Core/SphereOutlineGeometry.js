/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './EllipsoidOutlineGeometry'
    ], function(
        Cartesian3,
        defaultValue,
        EllipsoidOutlineGeometry) {
    "use strict";

    /**
     * A description of the outline of a sphere.
     *
     * @alias SphereOutlineGeometry
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.radius=1.0] The radius of the sphere.
     * @param {Number} [options.stackPartitions=10] The count of stacks for the sphere (1 greater than the number of parallel lines).
     * @param {Number} [options.slicePartitions=8] The count of slices for the sphere (Equal to the number of radial lines).
     * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Sphere%20Outline.html|Cesium Sandcastle Sphere Outline Demo}
     *
     * @example
     * var sphere = new Cesium.SphereOutlineGeometry({
     *   radius : 100.0,
     *   stackPartitions : 6,
     *   slicePartitions: 5
     * });
     * var geometry = Cesium.SphereOutlineGeometry.createGeometry(sphere);
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

        this._ellipsoidGeometry = new EllipsoidOutlineGeometry(ellipsoidOptions);
        this._workerName = 'createSphereOutlineGeometry';
    };

    /**
     * Computes the geometric representation of an outline of a sphere, including its vertices, indices, and a bounding sphere.
     *
     * @param {SphereOutlineGeometry} sphereGeometry A description of the sphere outline.
     * @returns {Geometry} The computed vertices and indices.
     */
    SphereOutlineGeometry.createGeometry = function(sphereGeometry) {
        return EllipsoidOutlineGeometry.createGeometry(sphereGeometry._ellipsoidGeometry);
    };

    return SphereOutlineGeometry;
});