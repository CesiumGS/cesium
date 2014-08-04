/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        './MaterialProperty'
    ], function(
        AssociativeArray,
        defined,
        ShowGeometryInstanceAttribute,
        Primitive,
        MaterialProperty) {
    "use strict";

    var Batch = function(primitives, appearanceType, materialProperty, closed) {
        this.primitives = primitives;
        this.appearanceType = appearanceType;
        this.materialProperty = materialProperty;
        this.closed = closed;
        this.updaters = new AssociativeArray();
        this.createPrimitive = true;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.material = undefined;
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.invalidated = false;
        this.removeMaterialSubscription = materialProperty.definitionChanged.addEventListener(Batch.prototype.onMaterialChanged, this);
    };

    Batch.prototype.onMaterialChanged = function() {
        this.invalidated = true;
    };

    Batch.prototype.isMaterial = function(updater) {
        var material = this.materialProperty;
        var updaterMaterial = updater.fillMaterialProperty;
        if (updaterMaterial === material) {
            return true;
        }
        if (defined(material)) {
            return material.equals(updaterMaterial);
        }
        return false;
    };

    Batch.prototype.add = function(time, updater) {
        var id = updater.entity.id;
        this.updaters.set(id, updater);
        this.geometry.set(id, updater.createFillGeometryInstance(time));
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant) {
            this.updatersWithAttributes.set(id, updater);
        }
        this.createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        this.createPrimitive = this.updaters.remove(id);
        this.geometry.remove(id);
        this.updatersWithAttributes.remove(id);
        return this.createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var show = true;
        var isUpdated = true;
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometries = this.geometry.values;
        if (this.createPrimitive) {
            if (defined(primitive)) {
                if (primitive.ready) {
                    this.oldPrimitive = primitive;
                } else {
                    primitives.remove(primitive);
                }
                show = false;
            }
            if (geometries.length > 0) {
                this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);
                primitive = new Primitive({
                    asynchronous : true,
                    geometryInstances : geometries,
                    appearance : new this.appearanceType({
                        material : this.material,
                        translucent : this.material.isTranslucent(),
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

            this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);
            this.primitive.appearance.material = this.material;

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
        return isUpdated;
    };

    Batch.prototype.destroy = function(time) {
        var primitive = this.primitive;
        var primitives = this.primitives;
        if (defined(primitive)) {
            primitives.remove(primitive);
        }
        this.removeMaterialSubscription();
    };

    /**
     * @private
     */
    var StaticGeometryPerMaterialBatch = function(primitives, appearanceType, closed) {
        this._items = [];
        this._primitives = primitives;
        this._appearanceType = appearanceType;
        this._closed = closed;
    };

    StaticGeometryPerMaterialBatch.prototype.add = function(time, updater) {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            if (item.isMaterial(updater)) {
                item.add(time, updater);
                return;
            }
        }
        var batch = new Batch(this._primitives, this._appearanceType, updater.fillMaterialProperty, this._closed);
        batch.add(time, updater);
        items.push(batch);
    };

    StaticGeometryPerMaterialBatch.prototype.remove = function(updater) {
        var items = this._items;
        var length = items.length;
        for (var i = length - 1; i >= 0; i--) {
            var item = items[i];
            if (item.remove(updater)) {
                if (item.updaters.length === 0) {
                    items.splice(i, 1);
                    item.destroy();
                }
                break;
            }
        }
    };

    StaticGeometryPerMaterialBatch.prototype.update = function(time) {
        var i;
        var items = this._items;
        var length = items.length;

        for (i = length - 1; i >= 0; i--) {
            var item = items[i];
            if (item.invalidated) {
                items.splice(i, 1);
                var updaters = item.updaters.values;
                var updatersLength = updaters.length;
                for (var h = 0; h < updatersLength; h++) {
                    this.add(time, updaters[h]);
                }
                item.destroy();
            }
        }

        var isUpdated = true;
        for (i = 0; i < length; i++) {
            isUpdated = items[i].update(time) && isUpdated;
        }
        return isUpdated;
    };

    StaticGeometryPerMaterialBatch.prototype.removeAllPrimitives = function() {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            items[i].destroy();
        }
        this._items.length = 0;
    };

    return StaticGeometryPerMaterialBatch;
});
