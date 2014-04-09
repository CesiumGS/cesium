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
        this.material = Material.fromType('Color');
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
        var id = updater.dynamicObject.id;
        this.updaters.set(id, updater);
        this.geometry.set(id, updater.createFillGeometryInstance(time));
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant) {
            this.updatersWithAttributes.set(id, updater);
        }
        this.createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.dynamicObject.id;
        this.createPrimitive = this.updaters.remove(id);
        this.geometry.remove(id);
        this.updatersWithAttributes.remove(id);
        return this.createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometries = this.geometry.values;
        if (this.createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometries.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometries,
                    appearance : new this.appearanceType({
                        material : MaterialProperty.getValue(time, this.materialProperty, this.material),
                        translucent : this.material.isTranslucent(),
                        closed : this.closed
                    })
                });

                primitives.add(primitive);
            }
            this.primitive = primitive;
            this.createPrimitive = false;
        } else if (defined(primitive) && primitive._state === PrimitiveState.COMPLETE){
            this.primitive.appearance.material = MaterialProperty.getValue(time, this.materialProperty, this.material);

            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            for (var i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var instance = this.geometry.get(updater.dynamicObject.id);

                var attributes = this.attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this.attributes.set(instance.id.id, attributes);
                }

                if (!updater.hasConstantFill) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(updater.isFilled(time), attributes.show);
                }
            }
        }
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
                for (var h = 0; h < updatersLength; i++) {
                    this.add(updaters[h]);
                }
                item.destroy();
            }
        }

        for (i = 0; i < length; i++) {
            items[i].update(time);
        }
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
