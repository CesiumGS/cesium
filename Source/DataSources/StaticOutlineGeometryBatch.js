/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive'
    ], function(
        AssociativeArray,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        ShowGeometryInstanceAttribute,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    var Batch = function(primitives, translucent, width) {
        this.translucent = translucent;
        this.primitives = primitives;
        this.createPrimitive = false;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.updaters = new AssociativeArray();
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.itemsToRemove = [];
        this.width = width;
    };

    Batch.prototype.add = function(updater, instance) {
        var id = updater.entity.id;
        this.createPrimitive = true;
        this.geometry.set(id, instance);
        this.updaters.set(id, updater);
        if (!updater.hasConstantOutline || !updater.outlineColorProperty.isConstant) {
            this.updatersWithAttributes.set(id, updater);
        }
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
        this.updaters.remove(id);
        this.updatersWithAttributes.remove(id);
    };

    var colorScratch = new Color();
    Batch.prototype.update = function(time) {
        var show = true;
        var isUpdated = true;
        var removedCount = 0;
        var primitive = this.primitive;
        var primitives = this.primitives;
        if (this.createPrimitive) {
            this.attributes.removeAll();
            if (defined(primitive)) {
                if (primitive.ready) {
                    this.oldPrimitive = primitive;
                } else {
                    primitives.remove(primitive);
                }
                show = false;
            }
            var geometry = this.geometry.values;
            if (geometry.length > 0) {
                primitive = new Primitive({
                    asynchronous : true,
                    geometryInstances : geometry,
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
                primitive.show = show;
            }
            this.primitive = primitive;
            this.createPrimitive = false;
        } else if (defined(primitive) && primitive.ready) {
            if (defined(this.oldPrimitive)) {
                primitives.remove(this.oldPrimitive);
                this.oldPrimitive = undefined;
                primitive.show = true;
            }

            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            for (var i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var instance = this.geometry.get(updater.entity.id);

                var attributes = this.attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this.attributes.set(instance.id.id, attributes);
                }

                if (!updater.outlineColorProperty.isConstant) {
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

                if (!updater.hasConstantOutline) {
                    show = updater.isOutlineVisible(time);
                    if (show !== attributes._lastShow) {
                        attributes._lastShow = show;
                        attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                    }
                }
            }
        } else if (defined(primitive) && !primitive.ready) {
            isUpdated = false;
        }

        this.itemsToRemove.length = removedCount;
        return isUpdated;
    };

    Batch.prototype.removeAllPrimitives = function() {
        var primitive = this.primitive;
        if (defined(primitive)) {
            this.primitives.remove(primitive);
            this.primitive = undefined;
            this.geometry.removeAll();
            this.updaters.removeAll();
        }
    };

    /**
     * @private
     */
    var StaticOutlineGeometryBatch = function(primitives, scene) {
        this._primitives = primitives;
        this._scene = scene;
        this._solidBatches = new AssociativeArray();
        this._translucentBatches = new AssociativeArray();
    };

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
            if (translucentBatches.remove(updater)) {
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
