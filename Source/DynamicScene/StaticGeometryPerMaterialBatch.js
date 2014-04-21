/*global define*/
define(['../Core/defined',
        '../Core/AssociativeArray',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        '../Scene/Material',
        '../Scene/PrimitiveState',
        './MaterialProperty'
    ], function(
        defined,
        AssociativeArray,
        ShowGeometryInstanceAttribute,
        Primitive,
        Material,
        PrimitiveState,
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
        this.geometry = new AssociativeArray();
        this.material = undefined;
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.subscriptions = new AssociativeArray();
        this.toggledObjects = new AssociativeArray();
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

    Batch.prototype.uiShowChanged = function(dynamicObject, propertyName, value, oldValue) {
        if (propertyName === 'uiShow' && value !== oldValue) {
            this.toggledObjects.set(dynamicObject.id, dynamicObject);
        }
    };

    Batch.prototype.add = function(time, updater) {
        var id = updater.dynamicObject.id;
        this.updaters.set(id, updater);
        this.geometry.set(id, updater.createFillGeometryInstance(time));
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant) {
            this.updatersWithAttributes.set(id, updater);
        }
        this.subscriptions.set(id, updater.dynamicObject.definitionChanged.addEventListener(Batch.prototype.uiShowChanged, this));
        this.createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.dynamicObject.id;
        this.createPrimitive = this.updaters.remove(id);
        this.geometry.remove(id);
        this.updatersWithAttributes.remove(id);
        this.toggledObjects.removeAll();
        var subscription = this.subscriptions.get(id);
        if (defined(subscription)) {
            subscription();
        }
        this.subscriptions.remove(id);
        return this.createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var isUpdated = true;
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometries = this.geometry.values;
        if (this.createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
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

                primitives.add(primitive);
                isUpdated = false;
            }
            this.primitive = primitive;
            this.createPrimitive = false;
        } else if (defined(primitive) && primitive._state === PrimitiveState.COMPLETE) {
            var updater;
            var dynamicObject;
            var id;
            var attributes;
            var i;

            this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);
            this.primitive.appearance.material = this.material;

            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            for (i = 0; i < length; i++) {
                updater = updatersWithAttributes[i];
                dynamicObject = updater.dynamicObject;
                id = dynamicObject.id;
                attributes = this.attributes.get(id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
                    this.attributes.set(id, attributes);
                }

                if (!updater.hasConstantFill) {
                    var show = updater.isFilled(time);
                    if (show !== attributes._lastShow) {
                        attributes._lastShow = show;
                        attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                    }
                }
            }

            var updaters = this.updaters;
            var toggledObjects = this.toggledObjects.values;
            length = toggledObjects.length;
            for (i = 0; i < length; i++) {
                dynamicObject = toggledObjects[i];
                id = dynamicObject.id;
                updater = updaters.get(id);
                attributes = this.attributes.get(id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
                    this.attributes.set(id, attributes);
                }
                attributes.show = ShowGeometryInstanceAttribute.toValue(updater.isFilled(time) && dynamicObject.uiShow, attributes.show);
            }
            this.toggledObjects.removeAll();
        } else if (defined(primitive) && primitive._state !== PrimitiveState.COMPLETE) {
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
        var subscriptions = this.subscriptions.values;
        var len = subscriptions.length;
        for (var i = 0; i < len; i++) {
            subscriptions[i]();
        }
        this.subscriptions.removeAll();
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
                for (var h = 0; h < updatersLength; i++) {
                    this.add(updaters[h]);
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
