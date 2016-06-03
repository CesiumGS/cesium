/*global define*/
define([
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/GeometryPipeline',
        '../Core/Matrix4',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        DeveloperError,
        GeometryInstance,
        GeometryPipeline,
        Matrix4,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    /**
     * Creates a {@link Primitive} to visualize well-known vector vertex attributes:
     * <code>normal</code>, <code>binormal</code>, and <code>tangent</code>.  Normal
     * is red; binormal is green; and tangent is blue.  If an attribute is not
     * present, it is not drawn.
     *
     * @exports createTangentSpaceDebugPrimitive
     *
     * @param {Object} options Object with the following properties:
     * @param {Geometry} options.geometry The <code>Geometry</code> instance with the attribute.
     * @param {Number} [options.length=10000.0] The length of each line segment in meters.  This can be negative to point the vector in the opposite direction.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix that transforms to transform the geometry from model to world coordinates.
     * @returns {Primitive} A new <code>Primitive</code> instance with geometry for the vectors.
     *
     * @example
     * scene.primitives.add(Cesium.createTangentSpaceDebugPrimitive({
     *    geometry : instance.geometry,
     *    length : 100000.0,
     *    modelMatrix : instance.modelMatrix
     * }));
     */
    function createTangentSpaceDebugPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var instances = [];
        var geometry = options.geometry;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('options.geometry is required.');
        }
        //>>includeEnd('debug');

        if (!defined(geometry.attributes) || !defined(geometry.primitiveType)) {
            // to create the debug lines, we need the computed attributes.
            // compute them if they are undefined.
            geometry = geometry.constructor.createGeometry(geometry);
        }

        var attributes = geometry.attributes;
        var modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        var length = defaultValue(options.length, 10000.0);

        if (defined(attributes.normal)) {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'normal', length),
              attributes : {
                  color : new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0)
              },
              modelMatrix : modelMatrix
            }));
        }

        if (defined(attributes.binormal)) {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'binormal', length),
              attributes : {
                  color : new ColorGeometryInstanceAttribute(0.0, 1.0, 0.0, 1.0)
              },
              modelMatrix : modelMatrix
            }));
        }

        if (defined(attributes.tangent)) {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'tangent', length),
              attributes : {
                  color : new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0)
              },
              modelMatrix : modelMatrix
            }));
        }

        if (instances.length > 0) {
            return new Primitive({
                asynchronous : false,
                geometryInstances : instances,
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : false
                })
            });
        }

        return undefined;
    }

    return createTangentSpaceDebugPrimitive;
});
