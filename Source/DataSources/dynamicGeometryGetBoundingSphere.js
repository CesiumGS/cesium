/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        './BoundingSphereState'
    ], function(
        BoundingSphere,
        defaultValue,
        defined,
        DeveloperError,
        Matrix4,
        BoundingSphereState) {
    'use strict';

    /**
     * @private
     */
    function dynamicGeometryGetBoundingSphere(entity, primitive, outlinePrimitive, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var attributes;
        var modelMatrix;

        //Outline and Fill geometries have the same bounding sphere, so just use whichever one is defined and ready
        if (defined(primitive) && primitive.show && primitive.ready) {
            attributes = primitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                modelMatrix = defaultValue(primitive.modelMatrix, Matrix4.IDENTITY);
                BoundingSphere.transform(attributes.boundingSphere, modelMatrix, result);
                return BoundingSphereState.DONE;
            }
        }

        if (defined(outlinePrimitive) && outlinePrimitive.show && outlinePrimitive.ready) {
            attributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                modelMatrix = defaultValue(outlinePrimitive.modelMatrix, Matrix4.IDENTITY);
                BoundingSphere.transform(attributes.boundingSphere, modelMatrix, result);
                return BoundingSphereState.DONE;
            }
        }

        if ((defined(primitive) && !primitive.ready) || (defined(outlinePrimitive) && !outlinePrimitive.ready)) {
            return BoundingSphereState.PENDING;
        }

        return BoundingSphereState.FAILED;
    }

    return dynamicGeometryGetBoundingSphere;
});
