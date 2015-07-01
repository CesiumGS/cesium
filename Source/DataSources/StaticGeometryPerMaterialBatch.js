/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        './BoundingSphereState',
        './MaterialProperty'
    ], function(
        AssociativeArray,
        defined,
        ShowGeometryInstanceAttribute,
        Primitive,
        BoundingSphereState,
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
        this.subscriptions = new AssociativeArray();
        this.showsUpdated = new AssociativeArray();
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
        } else {
            var that = this;
            this.subscriptions.set(id, updater.entity.definitionChanged.addEventListener(function(entity, propertyName, newValue, oldValue) {
                if (propertyName === 'isShowing') {
                    that.showsUpdated.set(entity.id, updater);
                }
            }));
        }
        this.createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        var createPrimitive = this.updaters.remove(id);

        if (createPrimitive) {
            this.geometry.remove(id);
            this.updatersWithAttributes.remove(id);
            var unsubscribe = this.subscriptions.get(id);
            if (defined(unsubscribe)) {
                unsubscribe();
                this.subscriptions.remove(id);
            }
        }
        this.createPrimitive = createPrimitive;
        return createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var isUpdated = true;
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometries = this.geometry.values;
        var attributes;
        var i;

        if (this.createPrimitive) {
            if (defined(primitive)) {
                if (!defined(this.oldPrimitive)) {
                    this.oldPrimitive = primitive;
                } else {
                    primitives.remove(primitive);
                }
            }

            var geometriesLength = geometries.length;
            if (geometriesLength > 0) {
                for (i = 0; i < geometriesLength; i++) {
                    var geometry = geometries[i];
                    var originalAttributes = geometry.attributes;
                    attributes = this.attributes.get(geometry.id.id);

                    if (defined(attributes)) {
                        if (defined(originalAttributes.show)) {
                            originalAttributes.show.value = attributes.show;
                        }
                        if (defined(originalAttributes.color)) {
                            originalAttributes.color.value = attributes.color;
                        }
                    }
                }

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

                primitives.add(primitive);
                isUpdated = false;
            }

            this.attributes.removeAll();
            this.primitive = primitive;
            this.createPrimitive = false;
        } else if (defined(primitive) && primitive.ready) {
            if (defined(this.oldPrimitive)) {
                primitives.remove(this.oldPrimitive);
                this.oldPrimitive = undefined;
            }

            this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);
            this.primitive.appearance.material = this.material;

            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            for (i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var entity = updater.entity;
                var instance = this.geometry.get(entity.id);

                attributes = this.attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this.attributes.set(instance.id.id, attributes);
                }

                var show = entity.isShowing && (updater.hasConstantFill || updater.isFilled(time));
                var currentShow = attributes.show[0] === 1;
                if (show !== currentShow) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                }
            }

            this.updateShows(primitive);
        } else if (defined(primitive) && !primitive.ready) {
            isUpdated = false;
        }
        return isUpdated;
    };

    Batch.prototype.updateShows = function(primitive) {
        var showsUpdated = this.showsUpdated.values;
        var length = showsUpdated.length;
        for (var i = 0; i < length; i++) {
            var updater = showsUpdated[i];
            var entity = updater.entity;
            var instance = this.geometry.get(entity.id);

            var attributes = this.attributes.get(instance.id.id);
            if (!defined(attributes)) {
                attributes = primitive.getGeometryInstanceAttributes(instance.id);
                this.attributes.set(instance.id.id, attributes);
            }

            var show = entity.isShowing;
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

    Batch.prototype.destroy = function(time) {
        var primitive = this.primitive;
        var primitives = this.primitives;
        if (defined(primitive)) {
            primitives.remove(primitive);
        }
        var oldPrimitive = this.oldPrimitive;
        if (defined(oldPrimitive)) {
            primitives.remove(oldPrimitive);
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

    StaticGeometryPerMaterialBatch.prototype.getBoundingSphere = function(entity, result) {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            if(item.contains(entity)){
                return item.getBoundingSphere(entity, result);
            }
        }
        return BoundingSphereState.FAILED;
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
