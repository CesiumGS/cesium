define([
        '../Core/defaultValue',
        '../Core/defined',
        './CallbackProperty',
        './GeometryUpdater',
        './TerrainOffsetProperty'
    ], function(
        defaultValue,
        defined,
        CallbackProperty,
        GeometryUpdater,
        TerrainOffsetProperty) {
    'use strict';

    function heightReferenceOnEntityPropertyChanged(entity, propertyName, newValue, oldValue) {
        GeometryUpdater.prototype._onEntityPropertyChanged.call(this, entity, propertyName, newValue, oldValue);
        if (this._observedPropertyNames.indexOf(propertyName) === -1) {
            return;
        }

        var geometry = this._entity[this._geometryPropertyName];
        if (!defined(geometry)) {
            return;
        }

        if (defined(this._terrainOffsetProperty)) {
            this._terrainOffsetProperty.destroy();
            this._terrainOffsetProperty = undefined;
        }

        var heightReferenceProperty = geometry.heightReference;

        if (defined(heightReferenceProperty)) {
            var centerPosition = new CallbackProperty(this._computeCenter.bind(this), !this._dynamic);
            this._terrainOffsetProperty = new TerrainOffsetProperty(this._scene, centerPosition, heightReferenceProperty);
        }
    }

    return heightReferenceOnEntityPropertyChanged;
});
