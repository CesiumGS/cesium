/*global define*/
define(['../Core/defined',
        '../Core/Map',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        defined,
        Map,
        ShowGeometryInstanceAttribute,
        Primitive,
        Material,
        MaterialProperty) {
    "use strict";

    var Batch = function(primitives, appearanceType, materialProperty) {
        this._materialProperty = materialProperty;
        this._updaters = new Map();
        this._createPrimitive = true;
        this._primitive = undefined;
        this._primitives = primitives;
        this._geometry = new Map();
        this._material = Material.fromType('Color');
        this._appearanceType = appearanceType;
        this._updatersWithAttributes = new Map();
        this._attributes = new Map();
    };

    Batch.prototype.isMaterial = function(updater) {
        var material = this._materialProperty;
        var updaterMaterial = updater._materialProperty;
        if (updaterMaterial === material) {
            return true;
        }
        if (defined(material)) {
            return material.equals(updaterMaterial);
        }
        return false;
    };

    Batch.prototype.add = function(time, updater) {
        var id = updater.id;
        this._updaters.set(id, updater);
        this._geometry.set(id, updater.createGeometryInstance(time));
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant) {
            this._updatersWithAttributes.set(id, updater);
        }
        this._createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.id;
        this._createPrimitive = this._updaters.remove(id);
        this._geometry.remove(id);
        this._updatersWithAttributes.remove(id);
        return this._createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var primitive = this._primitive;
        var primitives = this._primitives;
        var geometries = this._geometry.getValues();
        if (this._createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometries.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometries,
                    appearance : new this._appearanceType({
                        material : MaterialProperty.getValue(time, this._materialProperty, this._material),
                        faceForward : true,
                        translucent : this._material.isTranslucent(),
                        closed : true
                    })
                });

                primitives.add(primitive);
            }
            this._primitive = primitive;
            this._createPrimitive = false;
        } else {
            this._primitive.appearance.material = MaterialProperty.getValue(time, this._materialProperty, this._material);

            var updatersWithAttributes = this._updatersWithAttributes.getValues();
            var length = updatersWithAttributes.length;
            for (var i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var instance = this._geometry.get(updater.id);

                var attributes = this._attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this._attributes.set(instance.id.id, attributes);
                }

                if (!updater.hasConstantFill) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(updater.isFilled(time), attributes.show);
                }
            }
        }
    };

    Batch.prototype.destroy = function(time) {
        var primitive = this._primitive;
        var primitives = this._primitives;
        if (defined(primitive)) {
            primitives.remove(primitive);
        }
    };

    var StaticGeometryPerMaterialBatch = function(primitives, appearanceType) {
        this._items = [];
        this._primitives = primitives;
        this._appearanceType = appearanceType;
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
        var batch = new Batch(this._primitives, this._appearanceType, updater.fillMaterialProperty);
        batch.add(time, updater);
        items.push(batch);
    };

    StaticGeometryPerMaterialBatch.prototype.remove = function(updater) {
        var items = this._items;
        var length = items.length;
        for (var i = length - 1; i >= 0; i--) {
            var item = items[i];
            if (item.remove(updater)) {
                break;
            }
        }
    };

    StaticGeometryPerMaterialBatch.prototype.update = function(time) {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            items[i].update(time);
        }
    };

    StaticGeometryPerMaterialBatch.prototype.removeAllPrimitives = function() {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            items[i].destroy();
        }
        this._items = [];
    };

    return StaticGeometryPerMaterialBatch;
});
