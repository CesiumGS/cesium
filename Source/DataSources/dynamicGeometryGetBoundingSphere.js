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

    var primitiveBSScratch = new BoundingSphere();
    var primitiveBSScratch2 = new BoundingSphere();
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

        var boundingSphere;
        if (defined(primitive) && primitive.show) {
            attributes = primitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                boundingSphere = BoundingSphere.transform(attributes.boundingSphere, primitive.modelMatrix, primitiveBSScratch);
            }
        }

        var boundingSphere2;
        if (defined(outlinePrimitive) && outlinePrimitive.show) {
            attributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
            if (defined(attributes) && defined(attributes.boundingSphere)) {
                boundingSphere2 = BoundingSphere.transform(attributes.boundingSphere, outlinePrimitive.modelMatrix, primitiveBSScratch2);
            }
        }

        if (defined(boundingSphere) && defined(boundingSphere2)) {
            BoundingSphere.union(boundingSphere, boundingSphere2, result);
        } else if (defined(boundingSphere)) {
            BoundingSphere.clone(boundingSphere, result);
        } else if (defined(boundingSphere2)) {
            BoundingSphere.clone(boundingSphere2, result);
        } else {
            return BoundingSphereState.FAILED;
        }

        return BoundingSphereState.DONE;
    };

    return dynamicGeometryGetBoundingSphere;
});