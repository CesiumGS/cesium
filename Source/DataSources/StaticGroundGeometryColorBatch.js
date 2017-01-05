/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Color',
        '../Core/defined',
        '../Core/DistanceDisplayCondition',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        './BoundingSphereState',
        './Property'
    ], function(
        AssociativeArray,
        Color,
        defined,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        BoundingSphereState,
        Property) {
    "use strict";

    var colorScratch = new Color();
    var distanceDisplayConditionScratch = new DistanceDisplayCondition();

    function Batch(primitives, color, key) {
        this.primitives = primitives;
        this.color = color;
        this.key = key;
        this.createPrimitive = false;
        this.waitingOnCreate = false;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.updaters = new AssociativeArray();
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.subscriptions = new AssociativeArray();
        this.showsUpdated = new AssociativeArray();
        this.itemsToRemove = [];
        this.isDirty = false;
    }

    Batch.prototype.add = function(updater, instance) {
        var id = updater.entity.id;
        this.createPrimitive = true;
        this.geometry.set(id, instance);
        this.updaters.set(id, updater);
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant || !Property.isConstant(updater.distanceDisplayConditionProperty)) {
            this.updatersWithAttributes.set(id, updater);
        } else {
            var that = this;
            this.subscriptions.set(id, updater.entity.definitionChanged.addEventListener(function(entity, propertyName, newValue, oldValue) {
                if (propertyName === 'isShowing') {
                    that.showsUpdated.set(entity.id, updater);
                }
            }));
        }
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
        if (this.updaters.remove(id)) {
            this.updatersWithAttributes.remove(id);
            var unsubscribe = this.subscriptions.get(id);
            if (defined(unsubscribe)) {
                unsubscribe();
                this.subscriptions.remove(id);
            }
        }
    };

    var scratchArray = new Array(4);

    Batch.prototype.update = function(time) {
        var isUpdated = true;
        var removedCount = 0;
        var primitive = this.primitive;
        var primitives = this.primitives;
        var attributes;
        var i;

        if (this.createPrimitive) {
            var geometries = this.geometry.values;
            var geometriesLength = geometries.length;
            if (geometriesLength > 0) {
                if (defined(primitive)) {
                    if (!defined(this.oldPrimitive)) {
                        this.oldPrimitive = primitive;
                    } else {
                        primitives.remove(primitive);
                    }
                }

                for (i = 0; i < geometriesLength; i++) {
                    var geometryItem = geometries[i];
                    var originalAttributes = geometryItem.attributes;
                    attributes = this.attributes.get(geometryItem.id.id);

                    if (defined(attributes)) {
                        if (defined(originalAttributes.show)) {
                            originalAttributes.show.value = attributes.show;
                        }
                        if (defined(originalAttributes.color)) {
                            originalAttributes.color.value = attributes.color;
                        }
                    }
                }

                primitive = new GroundPrimitive({
                    asynchronous : true,
                    geometryInstances : geometries
                });
                primitives.add(primitive);
                isUpdated = false;
            } else {
                if (defined(primitive)) {
                    primitives.remove(primitive);
                    primitive = undefined;
                }
                var oldPrimitive = this.oldPrimitive;
                if (defined(oldPrimitive)) {
                    primitives.remove(oldPrimitive);
                    this.oldPrimitive = undefined;
                }
            }

            this.attributes.removeAll();
            this.primitive = primitive;
            this.createPrimitive = false;
            this.waitingOnCreate = true;
        } else if (defined(primitive) && primitive.ready) {
            if (defined(this.oldPrimitive)) {
                primitives.remove(this.oldPrimitive);
                this.oldPrimitive = undefined;
            }
            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            var waitingOnCreate = this.waitingOnCreate;
            for (i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var instance = this.geometry.get(updater.entity.id);

                attributes = this.attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this.attributes.set(instance.id.id, attributes);
                }

                if (!updater.fillMaterialProperty.isConstant || waitingOnCreate) {
                    var colorProperty = updater.fillMaterialProperty.color;
                    colorProperty.getValue(time, colorScratch);

                    if (!Color.equals(attributes._lastColor, colorScratch)) {
                        attributes._lastColor = Color.clone(colorScratch, attributes._lastColor);
                        var color = this.color;
                        var newColor = colorScratch.toBytes(scratchArray);
                        if (color[0] !== newColor[0] || color[1] !== newColor[1] ||
                            color[2] !== newColor[2] || color[3] !== newColor[3]) {
                           this.itemsToRemove[removedCount++] = updater;
                        }
                    }
                }

                var show = updater.entity.isShowing && (updater.hasConstantFill || updater.isFilled(time));
                var currentShow = attributes.show[0] === 1;
                if (show !== currentShow) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                }

                var distanceDisplayConditionProperty = updater.distanceDisplayConditionProperty;
                if (!Property.isConstant(distanceDisplayConditionProperty)) {
                    var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time, distanceDisplayConditionScratch);
                    if (!DistanceDisplayCondition.equals(distanceDisplayCondition, attributes._lastDistanceDisplayCondition)) {
                        attributes._lastDistanceDisplayCondition = DistanceDisplayCondition.clone(distanceDisplayCondition, attributes._lastDistanceDisplayCondition);
                        attributes.distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.toValue(distanceDisplayCondition, attributes.distanceDisplayCondition);
                    }
                }
            }

            this.updateShows(primitive);
            this.waitingOnCreate = false;
        } else if (defined(primitive) && !primitive.ready) {
            isUpdated = false;
        }
        this.itemsToRemove.length = removedCount;
        return isUpdated;
    };

    Batch.prototype.updateShows = function(primitive) {
        var showsUpdated = this.showsUpdated.values;
        var length = showsUpdated.length;
        for (var i = 0; i < length; i++) {
            var updater = showsUpdated[i];
            var instance = this.geometry.get(updater.entity.id);

            var attributes = this.attributes.get(instance.id.id);
            if (!defined(attributes)) {
                attributes = primitive.getGeometryInstanceAttributes(instance.id);
                this.attributes.set(instance.id.id, attributes);
            }

            var show = updater.entity.isShowing;
            var currentShow = attributes.show[0] === 1;
            if (show !== currentShow) {
                attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
            }
        }
        this.showsUpdated.removeAll();
    };

    Batch.prototype.contains = function(entity) {
        return this.updaters.contains(entity.id);
    };

    Batch.prototype.getBoundingSphere = function(entity, result) {
        var primitive = this.primitive;
        if (!primitive.ready) {
            return BoundingSphereState.PENDING;
        }
        
        var bs = primitive.getBoundingSphere(entity);
        if (!defined(bs)) {
            return BoundingSphereState.FAILED;
        }

        bs.clone(result);
        return BoundingSphereState.DONE;
    };

    Batch.prototype.removeAllPrimitives = function() {
        var primitives = this.primitives;

        var primitive = this.primitive;
        if (defined(primitive)) {
            primitives.remove(primitive);
            this.primitive = undefined;
            this.geometry.removeAll();
            this.updaters.removeAll();
        }

        var oldPrimitive = this.oldPrimitive;
        if (defined(oldPrimitive)) {
            primitives.remove(oldPrimitive);
            this.oldPrimitive = undefined;
        }
    };

    /**
     * @private
     */
    function StaticGroundGeometryColorBatch(primitives) {
        this._batches = new AssociativeArray();
        this._primitives = primitives;
    }

    StaticGroundGeometryColorBatch.prototype.add = function(time, updater) {
        var instance = updater.createFillGeometryInstance(time);
        var batches = this._batches;
        // instance.attributes.color.value is a Uint8Array, so just read it as a Uint32 and make that the key
        var batchKey = new Uint32Array(instance.attributes.color.value.buffer)[0];
        var batch;
        if (batches.contains(batchKey)) {
            batch = batches.get(batchKey);
        } else {
            batch = new Batch(this._primitives, instance.attributes.color.value, batchKey);
            batches.set(batchKey, batch);
        }
        batch.add(updater, instance);
        return batch;
    };

    StaticGroundGeometryColorBatch.prototype.remove = function(updater) {
        var batchesArray = this._batches.values;
        var count = batchesArray.length;
        for (var i = 0; i < count; ++i) {
            if (batchesArray[i].remove(updater)) {
                return;
            }
        }
    };

    StaticGroundGeometryColorBatch.prototype.update = function(time) {
        var i;
        var updater;

        //Perform initial update
        var isUpdated = true;
        var batches = this._batches;
        var batchesArray = batches.values;
        var batchCount = batchesArray.length;
        for (i = 0; i < batchCount; ++i) {
            isUpdated = batchesArray[i].update(time) && isUpdated;
        }

        //If any items swapped between batches we need to move them
        for (i = 0; i < batchCount; ++i) {
            var oldBatch = batchesArray[i];
            var itemsToRemove = oldBatch.itemsToRemove;
            var itemsToMoveLength = itemsToRemove.length;
            for (var j = 0; j < itemsToMoveLength; j++) {
                updater = itemsToRemove[j];
                oldBatch.remove(updater);
                var newBatch = this.add(time, updater);
                oldBatch.isDirty = true;
                newBatch.isDirty = true;
            }
        }

        //If we moved anything around, we need to re-build the primitive and remove empty batches
        var batchesArrayCopy = batchesArray.slice();
        var batchesCopyCount = batchesArrayCopy.length;
        for (i = 0; i < batchesCopyCount; ++i) {
            var batch = batchesArrayCopy[i];
            if (batch.isDirty) {
                isUpdated = batchesArrayCopy[i].update(time) && isUpdated;
                batch.isDirty = false;
            }
            if (batch.geometry.length === 0) {
                batches.remove(batch.key);
            }
        }

        return isUpdated;
    };

    StaticGroundGeometryColorBatch.prototype.getBoundingSphere = function(entity, result) {
        var batchesArray = this._batches.values;
        var batchCount = batchesArray.length;
        for (var i = 0; i < batchCount; ++i) {
            var batch = batchesArray[i];
            if (batch.contains(entity)) {
                return batch.getBoundingSphere(entity, result);
            }
        }

        return BoundingSphereState.FAILED;
    };

    StaticGroundGeometryColorBatch.prototype.removeAllPrimitives = function() {
        var batchesArray = this._batches.values;
        var batchCount = batchesArray.length;
        for (var i = 0; i < batchCount; ++i) {
            batchesArray[i].removeAllPrimitives();
        }
    };

    return StaticGroundGeometryColorBatch;
});
