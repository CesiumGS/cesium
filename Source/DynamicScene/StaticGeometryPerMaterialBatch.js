/*global define*/
define(['../Core/defined',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        defined,
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
        this._geometries = new Map();
        this._material = Material.fromType('Color');
        this._appearanceType = appearanceType;
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
        this._updaters.set(updater.id, updater);
        this._geometries.set(updater.id, updater.createGeometryInstance(time));
        this._createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        this._createPrimitive = this._updaters.remove(updater.id);
        this._geometries.remove(updater.id);
        return this._createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var primitive = this._primitive;
        var primitives = this._primitives;
        var geometries = this._geometries.getValues();
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

            var updaters = this._updaters.getValues();
            for (var i = geometries.length - 1; i > -1; i--) {
                var instance = geometries[i];
                var updater = updaters[i];

                var attributes = updater.attributes;
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    updater.attributes = attributes;
                }
                var show = updater.show;
                if (defined(show)) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
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
        var batch = new Batch(this._primitives, this._appearanceType, updater.materialProperty);
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
