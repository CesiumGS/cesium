define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/DistanceDisplayCondition',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/OffsetGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        './BoundingSphereState',
        './ColorMaterialProperty',
        './MaterialProperty',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        OffsetGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        Primitive,
        BoundingSphereState,
        ColorMaterialProperty,
        MaterialProperty,
        Property) {
    'use strict';

    var distanceDisplayConditionScratch = new DistanceDisplayCondition();
    var defaultDistanceDisplayCondition = new DistanceDisplayCondition();
    var defaultOffset = Cartesian3.ZERO;
    var offsetScratch = new Cartesian3();

    function Batch(primitives, appearanceType, materialProperty, depthFailAppearanceType, depthFailMaterialProperty, closed, shadows) {
        this.primitives = primitives;
        this.appearanceType = appearanceType;
        this.materialProperty = materialProperty;
        this.depthFailAppearanceType = depthFailAppearanceType;
        this.depthFailMaterialProperty = depthFailMaterialProperty;
        this.closed = closed;
        this.shadows = shadows;
        this.updaters = new AssociativeArray();
        this.createPrimitive = true;
        this.primitive = undefined;
        this.oldPrimitive = undefined;
        this.geometry = new AssociativeArray();
        this.material = undefined;
        this.depthFailMaterial = undefined;
        this.updatersWithAttributes = new AssociativeArray();
        this.attributes = new AssociativeArray();
        this.invalidated = false;
        this.removeMaterialSubscription = materialProperty.definitionChanged.addEventListener(Batch.prototype.onMaterialChanged, this);
        this.subscriptions = new AssociativeArray();
        this.showsUpdated = new AssociativeArray();
    }

    Batch.prototype.onMaterialChanged = function() {
        this.invalidated = true;
    };

    Batch.prototype.isMaterial = function(updater) {
        var material = this.materialProperty;
        var updaterMaterial = updater.fillMaterialProperty;
        var depthFailMaterial = this.depthFailMaterialProperty;
        var updaterDepthFailMaterial = updater.depthFailMaterialProperty;

        if (updaterMaterial === material && updaterDepthFailMaterial === depthFailMaterial) {
            return true;
        }
        var equals = defined(material) && material.equals(updaterMaterial);
        equals = ((!defined(depthFailMaterial) && !defined(updaterDepthFailMaterial)) || (defined(depthFailMaterial) && depthFailMaterial.equals(updaterDepthFailMaterial))) && equals;
        return equals;
    };

    Batch.prototype.add = function(time, updater) {
        var id = updater.id;
        this.updaters.set(id, updater);
        this.geometry.set(id, updater.createFillGeometryInstance(time));
        if (!updater.hasConstantFill || !updater.fillMaterialProperty.isConstant || !Property.isConstant(updater.distanceDisplayConditionProperty)  || !Property.isConstant(updater.terrainOffsetProperty)) {
            this.updatersWithAttributes.set(id, updater);
        } else {
            var that = this;
            this.subscriptions.set(id, updater.entity.definitionChanged.addEventListener(function(entity, propertyName, newValue, oldValue) {
                if (propertyName === 'isShowing') {
                    that.showsUpdated.set(updater.id, updater);
                }
            }));
        }
        this.createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.id;
        this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
        if (this.updaters.remove(id)) {
            this.updatersWithAttributes.remove(id);
            var unsubscribe = this.subscriptions.get(id);
            if (defined(unsubscribe)) {
                unsubscribe();
                this.subscriptions.remove(id);
                this.showsUpdated.remove(id);
            }
        }
        return this.createPrimitive;
    };

    var colorScratch = new Color();

    Batch.prototype.update = function(time) {
        var isUpdated = true;
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometries = this.geometry.values;
        var i;

        if (this.createPrimitive) {
            var geometriesLength = geometries.length;
            if (geometriesLength > 0) {
                if (defined(primitive)) {
                    if (!defined(this.oldPrimitive)) {
                        this.oldPrimitive = primitive;
                    } else {
                        primitives.remove(primitive);
                    }
                }

                this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);

                var depthFailAppearance;
                if (defined(this.depthFailMaterialProperty)) {
                    this.depthFailMaterial = MaterialProperty.getValue(time, this.depthFailMaterialProperty, this.depthFailMaterial);
                    depthFailAppearance = new this.depthFailAppearanceType({
                        material : this.depthFailMaterial,
                        translucent : this.depthFailMaterial.isTranslucent(),
                        closed : this.closed
                    });
                }

                primitive = new Primitive({
                    show : false,
                    asynchronous : true,
                    geometryInstances : geometries,
                    appearance : new this.appearanceType({
                        material : this.material,
                        translucent : this.material.isTranslucent(),
                        closed : this.closed
                    }),
                    depthFailAppearance : depthFailAppearance,
                    shadows : this.shadows
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
        } else if (defined(primitive) && primitive.ready) {
            primitive.show = true;
            if (defined(this.oldPrimitive)) {
                primitives.remove(this.oldPrimitive);
                this.oldPrimitive = undefined;
            }

            this.material = MaterialProperty.getValue(time, this.materialProperty, this.material);
            this.primitive.appearance.material = this.material;

            if (defined(this.depthFailAppearanceType) && !(this.depthFailMaterialProperty instanceof ColorMaterialProperty)) {
                this.depthFailMaterial = MaterialProperty.getValue(time, this.depthFailMaterialProperty, this.depthFailMaterial);
                this.primitive.depthFailAppearance.material = this.depthFailMaterial;
            }

            var updatersWithAttributes = this.updatersWithAttributes.values;
            var length = updatersWithAttributes.length;
            for (i = 0; i < length; i++) {
                var updater = updatersWithAttributes[i];
                var entity = updater.entity;
                var instance = this.geometry.get(updater.id);

                var attributes = this.attributes.get(instance.id.id);
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    this.attributes.set(instance.id.id, attributes);
                }

                if (defined(this.depthFailAppearanceType) && this.depthFailMaterialProperty instanceof ColorMaterialProperty && !updater.depthFailMaterialProperty.isConstant) {
                    var depthFailColorProperty = updater.depthFailMaterialProperty.color;
                    var depthFailColor = Property.getValueOrDefault(depthFailColorProperty, time, Color.WHITE, colorScratch);
                    if (!Color.equals(attributes._lastDepthFailColor, depthFailColor)) {
                        attributes._lastDepthFailColor = Color.clone(depthFailColor, attributes._lastDepthFailColor);
                        attributes.depthFailColor = ColorGeometryInstanceAttribute.toValue(depthFailColor, attributes.depthFailColor);
                    }
                }

                var show = entity.isShowing && (updater.hasConstantFill || updater.isFilled(time));
                var currentShow = attributes.show[0] === 1;
                if (show !== currentShow) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                }

                var distanceDisplayConditionProperty = updater.distanceDisplayConditionProperty;
                if (!Property.isConstant(distanceDisplayConditionProperty)) {
                    var distanceDisplayCondition = Property.getValueOrDefault(distanceDisplayConditionProperty, time, defaultDistanceDisplayCondition, distanceDisplayConditionScratch);
                    if (!DistanceDisplayCondition.equals(distanceDisplayCondition, attributes._lastDistanceDisplayCondition)) {
                        attributes._lastDistanceDisplayCondition = DistanceDisplayCondition.clone(distanceDisplayCondition, attributes._lastDistanceDisplayCondition);
                        attributes.distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.toValue(distanceDisplayCondition, attributes.distanceDisplayCondition);
                    }
                }

                var offsetProperty = updater.terrainOffsetProperty;
                if (!Property.isConstant(offsetProperty)) {
                    var offset = Property.getValueOrDefault(offsetProperty, time, defaultOffset, offsetScratch);
                    if (!Cartesian3.equals(offset, attributes._lastOffset)) {
                        attributes._lastOffset = Cartesian3.clone(offset, attributes._lastOffset);
                        attributes.offset = OffsetGeometryInstanceAttribute.toValue(offset, attributes.offset);
                    }
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
            var instance = this.geometry.get(updater.id);

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

    Batch.prototype.contains = function(updater) {
        return this.updaters.contains(updater.id);
    };

    Batch.prototype.getBoundingSphere = function(updater, result) {
        var primitive = this.primitive;
        if (!primitive.ready) {
            return BoundingSphereState.PENDING;
        }
        var attributes = primitive.getGeometryInstanceAttributes(updater.entity);
        if (!defined(attributes) || !defined(attributes.boundingSphere) ||
            (defined(attributes.show) && attributes.show[0] === 0)) {
            return BoundingSphereState.FAILED;
        }
        attributes.boundingSphere.clone(result);
        return BoundingSphereState.DONE;
    };

    Batch.prototype.destroy = function() {
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
    function StaticGeometryPerMaterialBatch(primitives, appearanceType, depthFailAppearanceType, closed, shadows) {
        this._items = [];
        this._primitives = primitives;
        this._appearanceType = appearanceType;
        this._depthFailAppearanceType = depthFailAppearanceType;
        this._closed = closed;
        this._shadows = shadows;
    }

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
        var batch = new Batch(this._primitives, this._appearanceType, updater.fillMaterialProperty, this._depthFailAppearanceType, updater.depthFailMaterialProperty, this._closed, this._shadows);
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
        for (i = 0; i < items.length; i++) {
            isUpdated = items[i].update(time) && isUpdated;
        }
        return isUpdated;
    };

    StaticGeometryPerMaterialBatch.prototype.getBoundingSphere = function(updater, result) {
        var items = this._items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            if (item.contains(updater)){
                return item.getBoundingSphere(updater, result);
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
