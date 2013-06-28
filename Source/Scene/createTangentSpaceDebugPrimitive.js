/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/GeometryInstance',
        '../Core/GeometryPipeline',
        './Primitive',
        './PerInstanceColorAppearance'
    ], function(
        DeveloperError,
        Color,
        GeometryInstance,
        GeometryPipeline,
        Primitive,
        PerInstanceColorAppearance) {
    "use strict";

    /**
     * Creates a {@link Primitive} to visualize well-known vector vertex attributes:
     * <code>normal</code>, <code>binormal</code>, and <code>tangent</code>.  Normal
     * is red; binormal is green; and tangent is blue.  If an attribute is not
     * present, it is not drawn.
     *
     * @exports createTangentSpaceDebugPrimitive
     *
     * @param {Geometry} geometry The <code>Geometry</code> instance with the attribute.
     * @param {Number} [length=10000.0] The length of each line segment in meters.  This can be negative to point the vector in the opposite direction.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix that transforms to transform the geometry from model to world coordinates.
     *
     * @returns {Primitive} A new <code>Primitive<code> instance with geometry for the vectors.
     *
     * @exception {DeveloperError} options.geometry is required.
     * @exception {DeveloperError} options.geometry.attributes.position is required.
     *
     * @example
     * scene.getPrimitives().add(createTangentSpaceDebugPrimitive({
     *    geometry : instance.geometry,
     *    length : 100000.0,
     *    modelMatrix : instance.modelMatrix
     * }));
     */
    function createTangentSpaceDebugPrimitive(options) {
        var instances = [];

        var geometry = options.geometry;

        if (typeof geometry === 'undefined') {
            throw new DeveloperError('options is required.');
        }

        var attributes = geometry.attributes;
        var modelMatrix = options.modelMatrix;
        var length = options.length;

        if (typeof attributes.normal !== 'undefined') {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'normal', length),
              color : new Color(1.0, 0.0, 0.0, 1.0),
              modelMatrix : modelMatrix
            }));
        }

        if (typeof attributes.binormal !== 'undefined') {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'binormal', length),
              color : new Color(0.0, 1.0, 0.0, 1.0),
              modelMatrix : modelMatrix
            }));
        }

        if (typeof attributes.tangent !== 'undefined') {
            instances.push(new GeometryInstance({
              geometry : GeometryPipeline.createLineSegmentsForVectors(geometry, 'tangent', length),
              color : new Color(0.0, 0.0, 1.0, 1.0),
              modelMatrix : modelMatrix
            }));
        }

        return new Primitive({
            geometryInstances : instances,
            appearance : new PerInstanceColorAppearance({
                flat : true,
                translucent : false
            })
        });
    }

    return createTangentSpaceDebugPrimitive;
});
