/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive'
    ], function(
        AssociativeArray,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        ShowGeometryInstanceAttribute,
        Primitive) {
    "use strict";

    var colorScratch = new Color();

    var Batch = function(primitives, translucent, appearanceType, closed) {
        this.translucent = translucent;
        this.appearanceType = appearanceType;
        this.closed = closed;
        this.primitives = primitives;
        this.createPrimitive = false;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.updaters = new AssociativeArray();
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.itemsToRemove = [];
    };

    Batch.prototype.add = function(updater, instance) {
        var id = updater.entity.id;
        this.createPrimitive = true;
        this.geometry.set(id, instance);
        this.updaters.set(id, updater);
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant) {
            this.updatersWithAttributes.set(id, updater);
        }
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
        this.updaters.remove(id);
        this.updatersWithAttributes.remove(id);
    };

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
                    appearance : new this.appearanceType({
                        translucent : this.translucent,
                        closed : this.closed
                    })
                });
                primitive.show = show;
                primitives.add(primitive);
                isUpdated = false;
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

                if (!updater.fillMaterialProperty.isConstant) {
                    var colorProperty = updater.fillMaterialProperty.color;
                    colorProperty.getValue(time, colorScratch);
                    if (!Color.equals(attributes._lastColor, colorScratch)) {
                        attributes._lastColor = Color.clone(colorScratch, attributes._lastColor);
                        attributes.color = ColorGeometryInstanceAttribute.toValue(colorScratch, attributes.color);
                        if ((this.translucent && attributes.color[3] === 255) || (!this.translucent && attributes.color[3] !== 255)) {
                            this.itemsToRemove[removedCount++] = updater;
                        }
                    }
                }

                if (!updater.hasConstantFill) {
                    show = updater.isFilled(time);
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
    var StaticGeometryColorBatch = function(primitives, appearanceType, closed) {
        this._solidBatch = new Batch(primitives, false, appearanceType, closed);
        this._translucentBatch = new Batch(primitives, true, appearanceType, closed);
    };

    StaticGeometryColorBatch.prototype.add = function(time, updater) {
        var instance = updater.createFillGeometryInstance(time);
        if (instance.attributes.color.value[3] === 255) {
            this._solidBatch.add(updater, instance);
        } else {
            this._translucentBatch.add(updater, instance);
        }
    };

    StaticGeometryColorBatch.prototype.remove = function(updater) {
        if (!this._solidBatch.remove(updater)) {
            this._translucentBatch.remove(updater);
        }
    };

    StaticGeometryColorBatch.prototype.update = function(time) {
        var i;
        var updater;

        //Perform initial update
        var isUpdated = this._solidBatch.update(time);
        isUpdated = this._translucentBatch.update(time) && isUpdated;

        //If any items swapped between solid/translucent, we need to
        //move them between batches
        var itemsToRemove = this._solidBatch.itemsToRemove;
        var solidsToMoveLength = itemsToRemove.length;
        if (solidsToMoveLength > 0) {
            for (i = 0; i < solidsToMoveLength; i++) {
                updater = itemsToRemove[i];
                this._solidBatch.remove(updater);
                this._translucentBatch.add(updater, updater.createFillGeometryInstance(time));
            }
        }

        itemsToRemove = this._translucentBatch.itemsToRemove;
        var translucentToMoveLength = itemsToRemove.length;
        if (translucentToMoveLength > 0) {
            for (i = 0; i < translucentToMoveLength; i++) {
                updater = itemsToRemove[i];
                this._translucentBatch.remove(updater);
                this._solidBatch.add(updater, updater.createFillGeometryInstance(time));
            }
        }

        //If we moved anything around, we need to re-build the primitive
        if (solidsToMoveLength > 0 || translucentToMoveLength > 0) {
            isUpdated = this._solidBatch.update(time) && isUpdated;
            isUpdated = this._translucentBatch.update(time) && isUpdated;
        }

        return isUpdated;
    };

    StaticGeometryColorBatch.prototype.removeAllPrimitives = function() {
        this._solidBatch.removeAllPrimitives();
        this._translucentBatch.removeAllPrimitives();
    };

    return StaticGeometryColorBatch;
});
