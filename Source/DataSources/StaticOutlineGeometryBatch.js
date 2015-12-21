/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        './BoundingSphereState'
    ], function(
        AssociativeArray,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        ShowGeometryInstanceAttribute,
        PerInstanceColorAppearance,
        Primitive,
        BoundingSphereState) {
    "use strict";

    function Batch(primitives, translucent, width) {
        this.translucent = translucent;
        this.primitives = primitives;
        this.createPrimitive = false;
        this.waitingOnCreate = false;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.updaters = new AssociativeArray();
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.itemsToRemove = [];
        this.width = width;
        this.subscriptions = new AssociativeArray();
        this.showsUpdated = new AssociativeArray();
    }
    Batch.prototype.add = function(updater, instance) {
        var id = updater.entity.id;
        this.createPrimitive = true;
        this.geometry.set(id, instance);
        this.updaters.set(id, updater);
        if (!updater.hasConstantOutline || !updater.outlineColorProperty.isConstant) {
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

    var colorScratch = new Color();
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

                primitive = new Primitive({
                    asynchronous : true,
                    geometryInstances : geometries,
                    appearance : new PerInstanceColorAppearance({
                        flat : true,
                        translucent : this.translucent,
                        renderState : {
                            lineWidth : this.width
                        }
                    })
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

                if (!updater.outlineColorProperty.isConstant || waitingOnCreate) {
                    var outlineColorProperty = updater.outlineColorProperty;
                    outlineColorProperty.getValue(time, colorScratch);
                    if (!Color.equals(attributes._lastColor, colorScratch)) {
                        attributes._lastColor = Color.clone(colorScratch, attributes._lastColor);
                        attributes.color = ColorGeometryInstanceAttribute.toValue(colorScratch, attributes.color);
                        if ((this.translucent && attributes.color[3] === 255) || (!this.translucent && attributes.color[3] !== 255)) {
                            this.itemsToRemove[removedCount++] = updater;
                        }
                    }
                }

                var show = updater.entity.isShowing && (updater.hasConstantOutline || updater.isOutlineVisible(time));
                var currentShow = attributes.show[0] === 1;
                if (show !== currentShow) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
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
        var attributes = primitive.getGeometryInstanceAttributes(entity);
        if (!defined(attributes) || !defined(attributes.boundingSphere) ||//
            (defined(attributes.show) && attributes.show[0] === 0)) {
            return BoundingSphereState.FAILED;
        }
        attributes.boundingSphere.clone(result);
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
    function StaticOutlineGeometryBatch(primitives, scene) {
        this._primitives = primitives;
        this._scene = scene;
        this._solidBatches = new AssociativeArray();
        this._translucentBatches = new AssociativeArray();
    }
    StaticOutlineGeometryBatch.prototype.add = function(time, updater) {
        var instance = updater.createOutlineGeometryInstance(time);
        var width = this._scene.clampLineWidth(updater.outlineWidth);
        var batches;
        var batch;
        if (instance.attributes.color.value[3] === 255) {
            batches = this._solidBatches;
            batch = batches.get(width);
            if (!defined(batch)) {
                batch = new Batch(this._primitives, false, width);
                batches.set(width, batch);
            }
            batch.add(updater, instance);
        } else {
            batches = this._translucentBatches;
            batch = batches.get(width);
            if (!defined(batch)) {
                batch = new Batch(this._primitives, true, width);
                batches.set(width, batch);
            }
            batch.add(updater, instance);
        }
    };

    StaticOutlineGeometryBatch.prototype.remove = function(updater) {
        var i;

        var solidBatches = this._solidBatches.values;
        var solidBatchesLength = solidBatches.length;
        for (i = 0; i < solidBatchesLength; i++) {
            if (solidBatches[i].remove(updater)) {
                return;
            }
        }

        var translucentBatches = this._translucentBatches.values;
        var translucentBatchesLength = translucentBatches.length;
        for (i = 0; i < translucentBatchesLength; i++) {
            if (translucentBatches[i].remove(updater)) {
                return;
            }
        }
    };

    StaticOutlineGeometryBatch.prototype.update = function(time) {
        var i;
        var x;
        var updater;
        var batch;
        var solidBatches = this._solidBatches.values;
        var solidBatchesLength = solidBatches.length;
        var translucentBatches = this._translucentBatches.values;
        var translucentBatchesLength = translucentBatches.length;
        var itemsToRemove;
        var isUpdated = true;
        var needUpdate = false;

        do {
            needUpdate = false;
            for (x = 0; x < solidBatchesLength; x++) {
                batch = solidBatches[x];
                //Perform initial update
                isUpdated = batch.update(time);

                //If any items swapped between solid/translucent, we need to
                //move them between batches
                itemsToRemove = batch.itemsToRemove;
                var solidsToMoveLength = itemsToRemove.length;
                if (solidsToMoveLength > 0) {
                    needUpdate = true;
                    for (i = 0; i < solidsToMoveLength; i++) {
                        updater = itemsToRemove[i];
                        batch.remove(updater);
                        this.add(time, updater);
                    }
                }
            }
            for (x = 0; x < translucentBatchesLength; x++) {
                batch = translucentBatches[x];
                //Perform initial update
                isUpdated = batch.update(time);

                //If any items swapped between solid/translucent, we need to
                //move them between batches
                itemsToRemove = batch.itemsToRemove;
                var translucentToMoveLength = itemsToRemove.length;
                if (translucentToMoveLength > 0) {
                    needUpdate = true;
                    for (i = 0; i < translucentToMoveLength; i++) {
                        updater = itemsToRemove[i];
                        batch.remove(updater);
                        this.add(time, updater);
                    }
                }
            }
        } while (needUpdate);

        return isUpdated;
    };

    StaticOutlineGeometryBatch.prototype.getBoundingSphere = function(entity, result) {
        var i;

        var solidBatches = this._solidBatches.values;
        var solidBatchesLength = solidBatches.length;
        for (i = 0; i < solidBatchesLength; i++) {
            var solidBatch = solidBatches[i];
            if(solidBatch.contains(entity)){
                return solidBatch.getBoundingSphere(entity, result);
            }
        }

        var translucentBatches = this._translucentBatches.values;
        var translucentBatchesLength = translucentBatches.length;
        for (i = 0; i < translucentBatchesLength; i++) {
            var translucentBatch = translucentBatches[i];
            if(translucentBatch.contains(entity)){
                return translucentBatch.getBoundingSphere(entity, result);
            }
        }

        return BoundingSphereState.FAILED;
    };

    StaticOutlineGeometryBatch.prototype.removeAllPrimitives = function() {
        var i;

        var solidBatches = this._solidBatches.values;
        var solidBatchesLength = solidBatches.length;
        for (i = 0; i < solidBatchesLength; i++) {
            solidBatches[i].removeAllPrimitives();
        }

        var translucentBatches = this._translucentBatches.values;
        var translucentBatchesLength = translucentBatches.length;
        for (i = 0; i < translucentBatchesLength; i++) {
            translucentBatches[i].removeAllPrimitives();
        }
    };

    return StaticOutlineGeometryBatch;
});
