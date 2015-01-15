/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/DeveloperError'
    ], function(
        BoundingSphere,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * @private
     */
    var dynamicGeometryGetBoundingSphere = function(entity, primitive, outlinePrimitive) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        //>>includeEnd('debug');

        var attributes;

        var tmp;
        var boundingSphere;
        if (defined(primitive) && primitive.show) {
            attributes = primitive.getGeometryInstanceAttributes(entity);
            tmp = attributes.boundingSphere;
            if (defined(tmp)) {
                boundingSphere = BoundingSphere.transform(tmp, primitive.modelMatrix);
            }
        }

        if (defined(outlinePrimitive) && outlinePrimitive.show) {
            attributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
            tmp = attributes.boundingSphere;
            if (defined(tmp)) {
                tmp = BoundingSphere.transform(tmp, outlinePrimitive.modelMatrix);
                boundingSphere = defined(boundingSphere) ? BoundingSphere.union(tmp, boundingSphere, boundingSphere) : tmp;
            }
        }

        return boundingSphere;
    };

    return dynamicGeometryGetBoundingSphere;
});