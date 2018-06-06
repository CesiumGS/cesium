define([
        '../Core/AssociativeArray',
        '../Core/defined',
        './BoundingSphereState'
    ], function(
        AssociativeArray,
        defined,
        BoundingSphereState) {
    'use strict';

    /**
     * @private
     */
    function DynamicGeometryBatch(primitives, orderedGroundPrimitives) {
        this._primitives = primitives;
        this._orderedGroundPrimitives = orderedGroundPrimitives;
        this._dynamicUpdaters = new AssociativeArray();
    }

    DynamicGeometryBatch.prototype.add = function(time, updater) {
        this._dynamicUpdaters.set(updater.id, updater.createDynamicUpdater(this._primitives, this._orderedGroundPrimitives));
    };

    DynamicGeometryBatch.prototype.remove = function(updater) {
        var id = updater.id;
        var dynamicUpdater = this._dynamicUpdaters.get(id);
        if (defined(dynamicUpdater)) {
            this._dynamicUpdaters.remove(id);
            dynamicUpdater.destroy();
        }
    };

    DynamicGeometryBatch.prototype.update = function(time) {
        var geometries = this._dynamicUpdaters.values;
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].update(time);
        }
        return true;
    };

    DynamicGeometryBatch.prototype.removeAllPrimitives = function() {
        var geometries = this._dynamicUpdaters.values;
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].destroy();
        }
        this._dynamicUpdaters.removeAll();
    };

    DynamicGeometryBatch.prototype.getBoundingSphere = function(updater, result) {
        updater = this._dynamicUpdaters.get(updater.id);
        if (defined(updater) && defined(updater.getBoundingSphere)) {
            return updater.getBoundingSphere(result);
        }
        return BoundingSphereState.FAILED;
    };

    return DynamicGeometryBatch;
});
