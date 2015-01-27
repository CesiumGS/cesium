/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/DeveloperError',
        './BoundingSphereState'
    ], function(
        BoundingSphere,
        defined,
        DeveloperError,
        BoundingSphereState) {
    "use strict";

    /**
     * @private
     */
    var dynamicGeometryGetBoundingSphere = function(entity, primitive, outlinePrimitive, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var attributes;

        //Outline and Fill geometries have the same bounding sphere, so just use whichever one is defined and ready
        if (defined(primitive) && primitive.show && primitive.ready) {
            attributes = primitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                BoundingSphere.transform(attributes.boundingSphere, primitive.modelMatrix, result);
                return BoundingSphereState.DONE;
            }
        }

        if (defined(outlinePrimitive) && outlinePrimitive.show && outlinePrimitive.ready) {
            attributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                BoundingSphere.transform(attributes.boundingSphere, outlinePrimitive.modelMatrix, result);
                return BoundingSphereState.DONE;
            }
        }

        if ((defined(primitive) && !primitive.ready) || (defined(outlinePrimitive) && !outlinePrimitive.ready)) {
            return BoundingSphereState.PENDING;
        }

        return BoundingSphereState.FAILED;
    };

    return dynamicGeometryGetBoundingSphere;
});